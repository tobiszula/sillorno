-- =============================================================================
-- SILLORNO — base de datos del catálogo (Supabase / PostgreSQL)
-- -----------------------------------------------------------------------------
-- CÓMO USARLO
--   1. Entrá a tu proyecto en supabase.com
--   2. Menú lateral -> "SQL Editor" -> "New query"
--   3. Pegá TODO este archivo y apretá "Run"
--   4. Al final del archivo están los dos pasos manuales (crear el usuario
--      del dueño y darle permiso de administrador).
--
-- Se puede correr más de una vez sin romper nada.
-- =============================================================================


-- =============================================================================
-- 1. TABLAS
-- =============================================================================

-- Categorías del catálogo (toallas, sábanas, ...) --------------------------
create table if not exists public.categorias (
  id      text primary key,              -- "toallas" (se usa en la URL y en los filtros)
  nombre  text not null,                 -- "Toallas y toallones"
  corto   text,                          -- "Toallas" (para los banners)
  sub     text,                          -- "Para después de la ducha"
  img     text,                          -- foto del banner
  orden   int  not null default 0,       -- orden en que se muestran
  activo  boolean not null default true
);

-- Productos ----------------------------------------------------------------
create table if not exists public.productos (
  id           text primary key,         -- "toallon-icone"
  nombre       text not null,
  categoria_id text references public.categorias(id) on update cascade on delete set null,
  img          text,
  material     text,
  gramaje      text,
  destacado    boolean not null default false,
  descripcion  text,
  specs        text[] not null default '{}',   -- ["100% algodón", "500 g/m²"]
  colores      text[] not null default '{}',   -- ["rosa", "azul"]
  orden        int  not null default 0,
  activo       boolean not null default true,
  actualizado  timestamptz not null default now()
);

create index if not exists productos_categoria_idx on public.productos (categoria_id);

-- Medidas y precios de cada producto ---------------------------------------
create table if not exists public.variantes (
  id          bigint generated always as identity primary key,
  producto_id text not null references public.productos(id) on update cascade on delete cascade,
  medida      text not null,                       -- "85 × 150 cm"
  detalle     text,                                -- "Toallón XL"
  precio      numeric(12,2) not null default 0,
  -- El panel no toca el stock (no se compra desde la web): queda "disponible".
  stock       text not null default 'disponible'
              check (stock in ('disponible', 'ultimas', 'agotado')),
  foto        text,                                -- foto propia de esta medida (opcional)
  orden       int not null default 0,
  unique (producto_id, medida)
);

create index if not exists variantes_producto_idx on public.variantes (producto_id);

-- Estampados / variantes de dibujo -----------------------------------------
create table if not exists public.estampados (
  id          bigint generated always as identity primary key,
  producto_id text not null references public.productos(id) on update cascade on delete cascade,
  slug        text not null,
  nombre      text not null,
  img         text,
  orden       int not null default 0,
  unique (producto_id, slug)
);

create index if not exists estampados_producto_idx on public.estampados (producto_id);

-- Fotos por color ----------------------------------------------------------
-- Una foto por color de un producto. Al tocar el color en la web, cambia la
-- imagen de la ficha. (Ver también db/fotos-por-color.sql)
create table if not exists public.color_fotos (
  id          bigint generated always as identity primary key,
  producto_id text not null references public.productos(id) on update cascade on delete cascade,
  color       text not null,
  img         text not null,
  orden       int not null default 0,
  unique (producto_id, color)
);

create index if not exists color_fotos_producto_idx on public.color_fotos (producto_id);

-- Sets / combos ------------------------------------------------------------
create table if not exists public.combos (
  id          text primary key,
  nombre      text not null,
  descripcion text,
  img         text,
  descuento   numeric(4,3) not null default 0    -- 0.10 = 10% de descuento
              check (descuento >= 0 and descuento < 1),
  orden       int not null default 0,
  activo      boolean not null default true
);

create table if not exists public.combo_items (
  id          bigint generated always as identity primary key,
  combo_id    text not null references public.combos(id)    on update cascade on delete cascade,
  producto_id text not null references public.productos(id) on update cascade on delete cascade,
  medida      text not null,
  cantidad    int  not null default 1 check (cantidad > 0),
  orden       int  not null default 0
);

create index if not exists combo_items_combo_idx on public.combo_items (combo_id);

-- Quién puede editar -------------------------------------------------------
-- Sólo los usuarios que estén en esta tabla pueden escribir. Que alguien se
-- cree una cuenta no alcanza: hay que agregarlo acá a mano.
create table if not exists public.admins (
  id    uuid primary key references auth.users(id) on delete cascade,
  email text,
  creado timestamptz not null default now()
);


-- =============================================================================
-- 2. SEGURIDAD
--    Cualquiera puede LEER el catálogo (lo necesita la web).
--    Sólo los administradores pueden ESCRIBIR.
-- =============================================================================

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.id = auth.uid());
$$;

grant execute on function public.es_admin() to anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['categorias','productos','variantes','estampados','color_fotos','combos','combo_items']
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "lectura publica" on public.%I', t);
    execute format('create policy "lectura publica" on public.%I for select using (true)', t);

    execute format('drop policy if exists "escritura admin" on public.%I', t);
    execute format(
      'create policy "escritura admin" on public.%I for all to authenticated '
      'using (public.es_admin()) with check (public.es_admin())', t);

    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- La tabla de administradores no se expone por la API: RLS activo y sin
-- políticas = nadie la lee ni la escribe desde afuera. Se edita desde acá.
alter table public.admins enable row level security;


-- =============================================================================
-- 3. FOTOS (Storage)
--    Bucket público de lectura; sólo el admin sube y borra.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('catalogo', 'catalogo', true)
on conflict (id) do update set public = true;

drop policy if exists "fotos lectura publica" on storage.objects;
create policy "fotos lectura publica" on storage.objects
  for select using (bucket_id = 'catalogo');

drop policy if exists "fotos alta admin" on storage.objects;
create policy "fotos alta admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'catalogo' and public.es_admin());

drop policy if exists "fotos cambio admin" on storage.objects;
create policy "fotos cambio admin" on storage.objects
  for update to authenticated
  using (bucket_id = 'catalogo' and public.es_admin());

drop policy if exists "fotos baja admin" on storage.objects;
create policy "fotos baja admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'catalogo' and public.es_admin());


-- =============================================================================
-- 4. EL CATÁLOGO EN UN SOLO PEDIDO
--    La web llama a esta función y recibe exactamente la forma que espera
--    main.js. Un solo viaje al servidor.
-- =============================================================================

create or replace function public.catalogo()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(

    'categorias', coalesce((
      select jsonb_agg(
               jsonb_strip_nulls(jsonb_build_object(
                 'id', c.id, 'nombre', c.nombre, 'corto', c.corto,
                 'sub', c.sub, 'img', c.img
               )) order by c.orden, c.nombre)
      from public.categorias c
      where c.activo
    ), '[]'::jsonb),

    'productos', coalesce((
      select jsonb_agg(x.j order by x.orden, x.nombre)
      from (
        select p.orden, p.nombre,
               jsonb_strip_nulls(jsonb_build_object(
                 'id',          p.id,
                 'nombre',      p.nombre,
                 'categoria',   p.categoria_id,
                 'img',         p.img,
                 'material',    p.material,
                 'gramaje',     p.gramaje,
                 'destacado',   p.destacado,
                 'descripcion', p.descripcion,
                 'specs',       to_jsonb(p.specs),
                 'colores',     to_jsonb(p.colores),
                 'fotosColor',  (
                   select coalesce(jsonb_object_agg(cf.color, cf.img), '{}'::jsonb)
                   from public.color_fotos cf where cf.producto_id = p.id
                 ),
                 'estampados',  coalesce((
                   select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                            'slug', e.slug, 'nombre', e.nombre, 'img', e.img
                          )) order by e.orden, e.nombre)
                   from public.estampados e where e.producto_id = p.id
                 ), '[]'::jsonb),
                 'variantes',   coalesce((
                   select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                            'medida', v.medida, 'detalle', v.detalle,
                            'precio', v.precio, 'stock', v.stock, 'foto', v.foto
                          )) order by v.orden, v.precio desc)
                   from public.variantes v where v.producto_id = p.id
                 ), '[]'::jsonb)
               )) as j
        from public.productos p
        where p.activo
      ) x
    ), '[]'::jsonb),

    'combos', coalesce((
      select jsonb_agg(y.j order by y.orden, y.nombre)
      from (
        select k.orden, k.nombre,
               jsonb_strip_nulls(jsonb_build_object(
                 'id',          k.id,
                 'nombre',      k.nombre,
                 'descripcion', k.descripcion,
                 'img',         k.img,
                 'descuento',   k.descuento,
                 'items',       coalesce((
                   select jsonb_agg(jsonb_build_object(
                            'producto', i.producto_id, 'medida', i.medida,
                            'cantidad', i.cantidad
                          ) order by i.orden)
                   from public.combo_items i where i.combo_id = k.id
                 ), '[]'::jsonb)
               )) as j
        from public.combos k
        where k.activo
      ) y
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.catalogo() to anon, authenticated;


-- =============================================================================
-- 5. LOS DOS PASOS QUE FALTAN (a mano, una sola vez)
-- =============================================================================
--
-- (a) CREAR EL USUARIO DEL DUEÑO
--     Supabase -> Authentication -> Users -> "Add user" -> "Create new user".
--     Poné el mail y una contraseña, y tildá "Auto Confirm User".
--
-- (b) DARLE PERMISO DE ADMINISTRADOR
--     Volvé al SQL Editor, cambiá el mail de abajo por el que acabás de crear
--     y corré estas dos líneas:
--
--     insert into public.admins (id, email)
--     select id, email from auth.users where email = 'PONE_ACA_EL_MAIL'
--     on conflict (id) do nothing;
--
-- (c) CERRAR EL REGISTRO ABIERTO (importante)
--     Authentication -> Sign In / Providers -> Email -> desactivá "Allow new
--     users to sign up". Igual, sin estar en la tabla admins nadie puede
--     editar nada, pero mejor cerrado.
-- =============================================================================
