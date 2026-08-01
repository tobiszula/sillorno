-- =============================================================================
-- SILLORNO — precios redondeados PARA ABAJO al múltiplo de 100
-- -----------------------------------------------------------------------------
-- Los valores de acá salen de la lista original del proveedor, no de lo que
-- haya ahora en la base. Por eso se puede correr aunque ya se hayan redondeado
-- los precios antes: pisa con el valor final correcto.
--
-- CÓMO USARLO
--   Supabase -> SQL Editor -> New query -> pegar todo -> Run.
--   Se puede correr más de una vez sin problema.
-- =============================================================================

-- 1) MIRAR ANTES DE TOCAR (no cambia nada)
select p.nombre, v.medida, v.precio as ahora, d.precio as quedaria
from public.variantes v
join public.productos p on p.id = v.producto_id
join (values
  ('toallon-icone', '85 × 150 cm', 24400),
  ('toallon-icone', '70 × 140 cm', 18500),
  ('toallon-icone', '45 × 80 cm', 8000),
  ('toallon-velour', '85 × 150 cm', 23900),
  ('toallon-velour', '70 × 140 cm', 18700),
  ('toallon-velour', '45 × 80 cm', 7600),
  ('toallon-dominus', '75 × 150 cm', 14700),
  ('toallon-dominus', '70 × 140 cm', 12900),
  ('toallon-dominus', '45 × 80 cm', 5500),
  ('toallon-galaxy', '75 × 150 cm', 13300),
  ('toallon-galaxy', '70 × 140 cm', 11400),
  ('toallon-galaxy', '45 × 80 cm', 5100),
  ('toallon-loft', '70 × 130 cm', 11600),
  ('toallon-loft', '45 × 70 cm', 4900),
  ('toallon-remix', '70 × 140 cm', 12900),
  ('toallon-remix', '45 × 80 cm', 5500),
  ('toallon-eletra', '70 × 140 cm', 10200),
  ('toallon-eletra', '45 × 80 cm', 4000),
  ('toallon-vegas', '62 × 130 cm', 9000),
  ('toallon-vegas', '45 × 70 cm', 4000),
  ('piso-supreme', '50 × 70 cm', 7400),
  ('sabana-supercotton', '1 plaza', 36500),
  ('sabana-supercotton', '2 plazas', 49000),
  ('sabana-supercotton', 'Queen', 56500),
  ('sabana-microcotton', '1 plaza', 22200),
  ('sabana-microcotton', '2 plazas', 28500),
  ('sabana-microcotton', 'Queen', 30400),
  ('sabana-microfibra', '1 plaza', 14800),
  ('sabana-microfibra', '2 plazas', 18500),
  ('sabana-microfibra', 'Queen', 21400),
  ('almohada-neo', '50 × 70 cm', 29900),
  ('almohada-neo', '50 × 90 cm', 38700),
  ('almohada-ergosoft', '50 × 70 cm', 16500),
  ('almohada-microcotton', '50 × 70 cm', 12300),
  ('frazada-velour', '150 × 220 cm', 25400),
  ('frazada-velour', '180 × 220 cm', 29200),
  ('frazada-velour', '220 × 240 cm', 36700),
  ('frazada-velour', '240 × 260 cm', 42300),
  ('frazada-microfibra', '150 × 220 cm', 15100),
  ('frazada-microfibra', '180 × 220 cm', 17300),
  ('frazada-microfibra', '220 × 240 cm', 21500),
  ('manta-outlet', '150 × 200 cm', 13100),
  ('repasador-bompano', '42 × 60 cm', 1600)
) as d(producto_id, medida, precio)
  on d.producto_id = v.producto_id and d.medida = v.medida
where v.precio is distinct from d.precio
order by p.nombre, v.precio desc;


-- 2) APLICARLO
update public.variantes v
set precio = d.precio
from (values
  ('toallon-icone', '85 × 150 cm', 24400),
  ('toallon-icone', '70 × 140 cm', 18500),
  ('toallon-icone', '45 × 80 cm', 8000),
  ('toallon-velour', '85 × 150 cm', 23900),
  ('toallon-velour', '70 × 140 cm', 18700),
  ('toallon-velour', '45 × 80 cm', 7600),
  ('toallon-dominus', '75 × 150 cm', 14700),
  ('toallon-dominus', '70 × 140 cm', 12900),
  ('toallon-dominus', '45 × 80 cm', 5500),
  ('toallon-galaxy', '75 × 150 cm', 13300),
  ('toallon-galaxy', '70 × 140 cm', 11400),
  ('toallon-galaxy', '45 × 80 cm', 5100),
  ('toallon-loft', '70 × 130 cm', 11600),
  ('toallon-loft', '45 × 70 cm', 4900),
  ('toallon-remix', '70 × 140 cm', 12900),
  ('toallon-remix', '45 × 80 cm', 5500),
  ('toallon-eletra', '70 × 140 cm', 10200),
  ('toallon-eletra', '45 × 80 cm', 4000),
  ('toallon-vegas', '62 × 130 cm', 9000),
  ('toallon-vegas', '45 × 70 cm', 4000),
  ('piso-supreme', '50 × 70 cm', 7400),
  ('sabana-supercotton', '1 plaza', 36500),
  ('sabana-supercotton', '2 plazas', 49000),
  ('sabana-supercotton', 'Queen', 56500),
  ('sabana-microcotton', '1 plaza', 22200),
  ('sabana-microcotton', '2 plazas', 28500),
  ('sabana-microcotton', 'Queen', 30400),
  ('sabana-microfibra', '1 plaza', 14800),
  ('sabana-microfibra', '2 plazas', 18500),
  ('sabana-microfibra', 'Queen', 21400),
  ('almohada-neo', '50 × 70 cm', 29900),
  ('almohada-neo', '50 × 90 cm', 38700),
  ('almohada-ergosoft', '50 × 70 cm', 16500),
  ('almohada-microcotton', '50 × 70 cm', 12300),
  ('frazada-velour', '150 × 220 cm', 25400),
  ('frazada-velour', '180 × 220 cm', 29200),
  ('frazada-velour', '220 × 240 cm', 36700),
  ('frazada-velour', '240 × 260 cm', 42300),
  ('frazada-microfibra', '150 × 220 cm', 15100),
  ('frazada-microfibra', '180 × 220 cm', 17300),
  ('frazada-microfibra', '220 × 240 cm', 21500),
  ('manta-outlet', '150 × 200 cm', 13100),
  ('repasador-bompano', '42 × 60 cm', 1600)
) as d(producto_id, medida, precio)
where v.producto_id = d.producto_id
  and v.medida = d.medida;


-- 3) CONTROL: esto tiene que devolver CERO filas.
--    Si devuelve alguna, es una medida renombrada desde el panel y hay que
--    corregirle el precio a mano.
select p.nombre, v.medida, v.precio
from public.variantes v
join public.productos p on p.id = v.producto_id
where v.precio <> floor(v.precio / 100) * 100;
