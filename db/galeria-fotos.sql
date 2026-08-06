-- =============================================================================
-- SILLORNO — Galería: varias fotos por producto
-- -----------------------------------------------------------------------------
-- QUÉ HACE
--   Hasta ahora cada producto tenía UNA foto principal. Con esto se le pueden
--   sumar todas las que quiera: en la ficha aparece una tira de miniaturas
--   abajo de la foto grande y, al tocar una, cambia la de arriba.
--
--   Convive con lo que ya había: la foto por color y la foto por medida siguen
--   funcionando igual. La galería son fotos sueltas del producto (el detalle
--   del puño, la etiqueta, la textura, la toalla colgada, etc.).
--
-- CÓMO USARLO
--   1. Entrá a supabase.com -> tu proyecto Sillorno
--   2. Menú lateral -> "SQL Editor" -> "New query"
--   3. Pegá TODO este archivo y apretá "Run"
--
--   Después, en el panel /admin, cada producto tiene una sección "Más fotos"
--   donde se suben desde el celular o la compu.
--
-- Se puede correr más de una vez sin romper nada.
-- =============================================================================


-- 1. TABLA: las fotos extra de cada producto ---------------------------------
create table if not exists public.producto_fotos (
  id          bigint generated always as identity primary key,
  producto_id text not null references public.productos(id)
                on update cascade on delete cascade,
  img         text not null,
  alt         text,                    -- texto opcional para accesibilidad
  orden       int  not null default 0
);

create index if not exists producto_fotos_producto_idx
  on public.producto_fotos (producto_id);


-- 2. SEGURIDAD: cualquiera lee, sólo el admin escribe ------------------------
alter table public.producto_fotos enable row level security;

drop policy if exists "lectura publica" on public.producto_fotos;
create policy "lectura publica" on public.producto_fotos for select using (true);

drop policy if exists "escritura admin" on public.producto_fotos;
create policy "escritura admin" on public.producto_fotos for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

grant select on public.producto_fotos to anon, authenticated;
grant insert, update, delete on public.producto_fotos to authenticated;


-- 3. EL CATÁLOGO EN UN SOLO PEDIDO -------------------------------------------
--    Misma función de siempre. Mantiene "fotosColor" y la "foto" por medida,
--    y suma "fotos" (la galería) a cada producto.
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
                 'fotos',       coalesce((
                   select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                            'img', f.img, 'alt', f.alt
                          )) order by f.orden, f.id)
                   from public.producto_fotos f where f.producto_id = p.id
                 ), '[]'::jsonb),
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


-- Listo. Recargá la web y entrá al panel: cada producto ahora tiene
-- la sección "Más fotos".
