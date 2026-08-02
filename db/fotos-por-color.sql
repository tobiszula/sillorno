-- =============================================================================
-- SILLORNO — Fotos por color (y por medida)
-- -----------------------------------------------------------------------------
-- QUÉ HACE
--   Deja que cada COLOR de un producto tenga su propia foto: al tocar el color
--   en la web, la foto de arriba cambia. También prepara "foto por medida"
--   (opcional, por si más adelante querés que el tamaño cambie la imagen).
--
-- CÓMO USARLO
--   1. Entrá a supabase.com -> tu proyecto Sillorno
--   2. Menú lateral -> "SQL Editor" -> "New query"
--   3. Pegá TODO este archivo y apretá "Run"
--
-- Se puede correr más de una vez sin romper nada.
-- Las fotos ya están subidas con la web (en /assets/img/), así que no tenés
-- que subir nada: este archivo solo conecta cada color con su foto.
-- =============================================================================


-- 1. TABLA: una foto por color de cada producto ------------------------------
create table if not exists public.color_fotos (
  id          bigint generated always as identity primary key,
  producto_id text not null references public.productos(id)
                on update cascade on delete cascade,
  color       text not null,          -- "beige", "rosa", ... (el nombre del color)
  img         text not null,          -- ruta de la foto
  orden       int  not null default 0,
  unique (producto_id, color)
);

create index if not exists color_fotos_producto_idx on public.color_fotos (producto_id);


-- 2. FOTO PROPIA POR MEDIDA (opcional) ---------------------------------------
alter table public.variantes add column if not exists foto text;


-- 3. SEGURIDAD: cualquiera lee, sólo el admin escribe ------------------------
alter table public.color_fotos enable row level security;

drop policy if exists "lectura publica" on public.color_fotos;
create policy "lectura publica" on public.color_fotos for select using (true);

drop policy if exists "escritura admin" on public.color_fotos;
create policy "escritura admin" on public.color_fotos for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

grant select on public.color_fotos to anon, authenticated;
grant insert, update, delete on public.color_fotos to authenticated;


-- 4. EL CATÁLOGO EN UN SOLO PEDIDO (misma función, ahora con las fotos) -------
--    Se agrega "fotosColor" a cada producto y "foto" a cada medida.
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


-- 5. LAS FOTOS POR COLOR (toallones) -----------------------------------------
--    Si el mismo color ya estaba cargado, se actualiza la foto.
insert into public.color_fotos (producto_id, color, img, orden) values
  ('toallon-dominus', 'beige',      'assets/img/toallon-dominus-beige.webp',   1),
  ('toallon-dominus', 'blanco',     'assets/img/toallon-dominus-blanco.webp',  2),
  ('toallon-dominus', 'gris',       'assets/img/toallon-dominus-gris.webp',    3),
  ('toallon-dominus', 'rosa',       'assets/img/toallon-dominus-rosa.webp',    4),
  ('toallon-dominus', 'verde',      'assets/img/toallon-dominus-verde.webp',   5),

  ('toallon-galaxy',  'azul',       'assets/img/toallon-galaxy-azul.webp',     1),
  ('toallon-galaxy',  'beige',      'assets/img/toallon-galaxy-beige.webp',    2),
  ('toallon-galaxy',  'blanco',     'assets/img/toallon-galaxy-blanco.webp',   3),
  ('toallon-galaxy',  'gris',       'assets/img/toallon-galaxy-gris.webp',     4),
  ('toallon-galaxy',  'rosa',       'assets/img/toallon-galaxy-rosa.webp',     5),

  ('toallon-velour',  'beige',      'assets/img/toallon-velour-beige.webp',    1),
  ('toallon-velour',  'gris',       'assets/img/toallon-velour-gris.webp',     2),
  ('toallon-velour',  'vino',       'assets/img/toallon-velour-vino.webp',     3),

  ('toallon-eletra',  'rosa claro', 'assets/img/toallon-eletra-rosa-claro.webp', 1)
on conflict (producto_id, color) do update
  set img = excluded.img, orden = excluded.orden;


-- Listo. Recargá sillorno.vercel.app (o sillorno-topaz.vercel.app) y probá:
-- entrá a un toallón (Dominus, Galaxy, Velour o Eletra) y tocá un color.
