-- =============================================================================
-- SILLORNO — hace editable el banner de "Sets" desde el panel
-- -----------------------------------------------------------------------------
-- El banner de "Sets" (la franja que lleva a los combos armados) tenía el
-- nombre, la foto y la bajada fijos en el código. Esto agrega una fila
-- especial en "categorias" con id "sets" para poder editarlos desde el
-- panel, en Categorías, como cualquier otra. No es una categoría real: no
-- se puede asignar a un producto, y no cuenta como categoría en los filtros
-- del catálogo (eso lo resuelve el código, no hace falta nada más acá).
--
-- Si la borrás por error o todavía no corriste esto, la web sigue mostrando
-- el banner con el nombre y la foto de siempre (no se rompe nada).
--
-- CÓMO USARLO
--   Supabase -> SQL Editor -> New query -> pegar todo -> Run.
--   Se puede correr más de una vez sin problema.
-- =============================================================================

insert into public.categorias (id, nombre, corto, sub, img, orden, activo)
values (
  'sets',
  'Sets armados',
  'Sets',
  'Combos con descuento',
  'assets/img/lifestyle-cama.webp',
  99,
  true
)
on conflict (id) do nothing;
