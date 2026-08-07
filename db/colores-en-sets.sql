-- =============================================================================
-- SILLORNO — Colores en los sets
-- -----------------------------------------------------------------------------
-- QUÉ HACE
--   Deja elegir, para cada producto dentro de un set, qué colores puede pedir
--   el cliente (en vez de que el set quede genérico sin color). Si no se tilda
--   ningún color para un ítem, sigue funcionando exactamente igual que hoy: sin
--   selector de color para ese ítem.
--
-- CÓMO USARLO
--   1. Entrá a supabase.com -> tu proyecto Sillorno
--   2. Menú lateral -> "SQL Editor" -> "New query"
--   3. Pegá TODO este archivo y apretá "Run"
--
-- Se puede correr más de una vez sin romper nada.
-- =============================================================================


-- 1. COLUMNA: colores permitidos por ítem de set ------------------------------
alter table public.combo_items add column if not exists colores text[] not null default '{}';


-- 2. EL CATÁLOGO EN UN SOLO PEDIDO (misma función, ahora con los colores) -----
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
                            'cantidad', i.cantidad, 'colores', to_jsonb(i.colores)
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


-- Listo. Recargá sillorno-topaz.vercel.app y probá: editá un set desde el
-- panel, tildá algún color en un ítem y guardá.
