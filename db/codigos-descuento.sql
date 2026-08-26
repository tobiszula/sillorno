-- =============================================================================
-- SILLORNO — Códigos de descuento
-- -----------------------------------------------------------------------------
-- QUÉ HACE
--   Deja crear códigos ("VERANO10", "85490294") desde el panel, en la solapa
--   "Configuración". El que compra lo escribe en el carrito, la web le aplica
--   el descuento y el mensaje de WhatsApp sale con el código y el total nuevo.
--
-- CÓMO USARLO
--   1. Entrá a supabase.com -> tu proyecto Sillorno
--   2. Menú lateral -> "SQL Editor" -> "New query"
--   3. Pegá TODO este archivo y apretá "Run"
--
-- Se puede correr más de una vez sin romper nada.
-- =============================================================================


-- 1. TABLA ---------------------------------------------------------------
create table if not exists public.codigos_descuento (
  codigo      text primary key,            -- se guarda SIEMPRE en mayúsculas
  tipo        text not null default 'porcentaje'
              check (tipo in ('porcentaje', 'monto')),
  valor       numeric(12,2) not null check (valor > 0),
  -- "porcentaje": 10 = 10% off. "monto": 5000 = cinco mil pesos menos.
  descripcion text,
  activo      boolean not null default true,
  vence       date,                        -- opcional: hasta cuándo sirve
  usos        int not null default 0,      -- cuántas veces se usó
  max_usos    int,                         -- opcional: tope de usos
  creado      timestamptz not null default now()
);


-- 2. SEGURIDAD -----------------------------------------------------------
-- OJO: acá NO va "lectura publica" como en el resto de las tablas. Si la
-- lista fuera legible, cualquiera podría pedirle a la API todos los códigos
-- y usarlos. Sólo el admin la ve; el visitante valida de a uno con la
-- función de abajo, que no permite listar nada.
alter table public.codigos_descuento enable row level security;

drop policy if exists "lectura publica" on public.codigos_descuento;

drop policy if exists "escritura admin" on public.codigos_descuento;
create policy "escritura admin" on public.codigos_descuento for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

grant select, insert, update, delete on public.codigos_descuento to authenticated;


-- 3. VALIDAR UN CÓDIGO ---------------------------------------------------
-- Devuelve el descuento si el código sirve, o null si no existe, está
-- desactivado, venció o se quedó sin usos. Nunca revela la lista.
create or replace function public.validar_codigo(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
           'codigo', c.codigo,
           'tipo',   c.tipo,
           'valor',  c.valor,
           'descripcion', c.descripcion
         )
  from public.codigos_descuento c
  where c.codigo = upper(btrim(p_codigo))
    and c.activo
    and (c.vence    is null or c.vence >= current_date)
    and (c.max_usos is null or c.usos < c.max_usos)
  limit 1;
$$;

grant execute on function public.validar_codigo(text) to anon, authenticated;


-- 4. CONTAR UN USO -------------------------------------------------------
-- La web la llama cuando el pedido sale por WhatsApp. Es sólo para que el
-- dueño vea cuánto se usó cada código: el descuento real lo termina
-- aplicando él al cobrar.
create or replace function public.usar_codigo(p_codigo text)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.codigos_descuento
  set usos = usos + 1
  where codigo = upper(btrim(p_codigo)) and activo;
$$;

grant execute on function public.usar_codigo(text) to anon, authenticated;


-- Listo. En el panel aparece la solapa "Configuración" para crear códigos.
