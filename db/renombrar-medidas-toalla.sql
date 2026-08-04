-- =============================================================================
-- SILLORNO — Renombrar medidas de toalla
-- -----------------------------------------------------------------------------
-- QUÉ HACE
--   Los productos que ya cargaste en la base todavía tienen los nombres
--   viejos de medida: "Toallón XL", "Toallón", "Toalla". La web y el admin
--   ya usan los nuevos: "Toallón", "Toalla", "Toalla de mano". Este script
--   actualiza los productos existentes para que coincidan.
--
-- CÓMO USARLO
--   1. Entrá a supabase.com -> tu proyecto Sillorno
--   2. Menú lateral -> "SQL Editor" -> "New query"
--   3. Pegá TODO este archivo y apretá "Run"
--
-- Se puede correr más de una vez sin romper nada (si ya lo corriste, la
-- segunda vez no encuentra nada para cambiar).
-- =============================================================================

update public.variantes
set detalle = case detalle
  when 'Toallón XL' then 'Toallón'
  when 'Toallón'    then 'Toalla'
  when 'Toalla'     then 'Toalla de mano'
end
where detalle in ('Toallón XL', 'Toallón', 'Toalla');

-- Las descripciones de los sets que mencionaban las medidas viejas
update public.combos
set descripcion = 'Toallón, toalla y toalla de mano en el mismo color.'
where id = 'combo-bano' and descripcion = 'Toallón XL, toallón y toalla de mano en el mismo color.';

update public.combos
set descripcion = 'Toalla, toalla de mano y dos repasadores. Listo para entregar.'
where id = 'combo-regalo' and descripcion = 'Toallón, toalla y dos repasadores. Listo para entregar.';
