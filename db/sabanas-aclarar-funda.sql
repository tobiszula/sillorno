-- Aclara en el detalle de cada medida cuántas fundas de almohada trae el
-- juego: 1 plaza viene con 1 funda; 2 plazas y Queen vienen con 2 fundas.
update public.variantes set detalle = 'Plana 150×240 · Ajustable 88×188×30 · Funda 70×50 ×1'
  where producto_id = 'sabana-supercotton' and medida = '1 plaza';
update public.variantes set detalle = 'Plana 220×240 · Ajustable 138×188×30 · Funda 70×50 ×2'
  where producto_id = 'sabana-supercotton' and medida = '2 plazas';
update public.variantes set detalle = 'Plana 240×260 · Ajustable 158×198×35 · Funda 70×50 ×2'
  where producto_id = 'sabana-supercotton' and medida = 'Queen';

update public.variantes set detalle = 'Plana 160×240 · Ajustable 88×188×30 · Funda 70×50 ×1'
  where producto_id = 'sabana-microcotton' and medida = '1 plaza';
update public.variantes set detalle = 'Plana 220×240 · Ajustable 138×188×30 · Funda 70×50 ×2'
  where producto_id = 'sabana-microcotton' and medida = '2 plazas';
update public.variantes set detalle = 'Plana 240×260 · Ajustable 158×198×35 · Funda 70×50 ×2'
  where producto_id = 'sabana-microcotton' and medida = 'Queen';

update public.variantes set detalle = 'Plana 140×220 · Ajustable 88×188×20 · Funda 70×50 ×1'
  where producto_id = 'sabana-microfibra' and medida = '1 plaza';
update public.variantes set detalle = 'Plana 200×220 · Ajustable 138×188×20 · Funda 70×50 ×2'
  where producto_id = 'sabana-microfibra' and medida = '2 plazas';
update public.variantes set detalle = 'Plana 220×240 · Ajustable 158×198×30 · Funda 70×50 ×2'
  where producto_id = 'sabana-microfibra' and medida = 'Queen';
