# Sillorno — tienda web

Landing de blanquería con catálogo, filtros, buscador y consulta por WhatsApp.
**No se compra desde la web**: el pedido se cierra por WhatsApp.

HTML + CSS + JavaScript puro: no necesita npm ni build. Los productos y los
precios viven en una base de datos (Supabase) y se editan desde un **panel de
administración**, sin tocar código ni volver a publicar el sitio.

---

## Panel de administración

Se entra en **`tudominio.com/admin/`** con el mail y la contraseña del dueño.

Tiene cuatro solapas:

| Solapa | Para qué |
|---|---|
| **Precios** | Cambiar precios en lote. Es lo que más se usa: se editan los números y se aprieta *Guardar cambios*. |
| **Productos** | Agregar, editar y borrar productos: nombre, categoría, descripción, material, colores, foto, medidas y estampados. |
| **Categorías** | Editar las categorías, su foto de banner y el orden en que aparecen. |
| **Sets** | Armar o sacar los combos y definir su descuento. El precio del set se calcula solo. |

Todo lo que se guarda se ve en la web **enseguida**, sin publicar nada de nuevo.

### Cosas para tener en cuenta

- **Los precios se escriben sin puntos de miles**: `24400`, no `24.400`.
  Están todos redondeados a los 100; si cargás centavos, la web los muestra.
- **Las fotos se suben desde el panel.** Se achican y se convierten a WebP
  solas, así que se puede subir una foto sacada con el celular sin problema.
- **No hay control de stock.** Como no se compra desde la web, todas las
  medidas quedan como disponibles.
- **Para esconder algo sin borrarlo**, destildá *Visible en la web* en vez de
  borrarlo. Borrar es para siempre.
- **No se puede borrar una categoría que tenga productos adentro.** Primero hay
  que moverlos a otra.
- **Si borrás un producto que está en un set**, el panel te avisa: también se
  saca del set.

---

## Puesta en marcha (una sola vez)

Si el panel muestra *«Falta conectar la base de datos»*, faltan estos pasos.

### 1. Crear el proyecto de Supabase

Entrar a [supabase.com](https://supabase.com), crear una cuenta gratis y un
proyecto nuevo. Conviene elegir la región **South America (São Paulo)**.

### 2. Crear las tablas

En el proyecto: menú lateral → **SQL Editor** → **New query**. Pegar todo el
contenido de `db/schema.sql` y apretar **Run**.

### 3. Crear el usuario del dueño

**Authentication → Users → Add user → Create new user.** Poner el mail y una
contraseña, y tildar **Auto Confirm User**.

Después, volver al **SQL Editor** y correr esto, cambiando el mail:

```sql
insert into public.admins (id, email)
select id, email from auth.users where email = 'PONE_ACA_EL_MAIL'
on conflict (id) do nothing;
```

Sin este paso el usuario entra pero no puede editar nada.

### 4. Cerrar el registro abierto

**Authentication → Sign In / Providers → Email** → desactivar *«Allow new users
to sign up»*. Así nadie más se puede crear una cuenta.

### 5. Conectar la web con la base

**Lo más rápido: la integración oficial.** En Vercel → *Integrations* → buscar
**Supabase** → conectarla con el proyecto. Carga sola las variables que hacen
falta, entre otra decena que este sitio no usa.

**A mano**, si preferís: Supabase → *Settings → API*, y en Vercel →
*Settings → Environment Variables*:

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | el **Project URL** (`https://xxxxxxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | la clave **anon public** (empieza con `eyJ…`) |

Marcalas para *Production*, *Preview* y *Development*. En cada deploy, Vercel
corre `tools/build-config.js` (está puesto como `buildCommand` en
`vercel.json`) y ese script genera `lib/supabase-config.js` con esos valores.

El script acepta varios nombres, así que sirve tanto lo que pone la integración
como lo cargado a mano. Para la URL busca `SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_URL` o `VITE_SUPABASE_URL`; para la clave,
`SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` o
`SUPABASE_PUBLISHABLE_KEY`. En el log del build queda escrito cuál encontró.

> ⚠️ El script **nunca** lee `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`
> ni `POSTGRES_URL` (esta última lleva la contraseña de la base adentro). Por
> eso los nombres se buscan exactos, uno por uno, en vez de por parecido. Y si
> alguna vez una clave secreta llegara a la variable equivocada, **corta el
> build** en lugar de publicarla.

> **Si cambiás una variable, hay que volver a deployar.** El archivo se genera
> durante el build; tocar la variable sola no alcanza.

Si el hosting no tiene variables de entorno (Hostinger por FTP, por ejemplo),
se edita `lib/supabase-config.js` a mano antes de subir y listo.

> La clave `anon` es pública a propósito: viaja al navegador de cualquier
> visitante, esté en una variable de entorno o no. Lo que protege la base es el
> RLS de `schema.sql`: con esa clave sola sólo se puede **leer** el catálogo.
> Para escribir hay que iniciar sesión con un usuario que esté en `admins`.
> **Nunca** uses ahí la clave `service_role`, que sí es secreta.

### 5b. Para probarlo en tu computadora

```bash
SUPABASE_URL="https://xxxxxxxx.supabase.co" \
SUPABASE_ANON_KEY="eyJhbGciOi..." \
node tools/build-config.js
```

Eso genera el archivo local. Ojo: queda modificado en git, no lo commitees con
las claves adentro (no es grave si pasa, pero ensucia).

### 6. Cargar el catálogo inicial

Entrar a `/admin/`. Como la base está vacía, aparece el botón **«Importar el
catálogo actual de la web»**. Un clic y quedan cargados los productos, las
medidas, los precios, los estampados, las categorías y los sets que hoy están
en `lib/manifest.js`.

Listo: de acá en adelante todo se edita desde el panel.

---

## Cómo está armado

```
sillorno-web/
├── index.html          Estructura de la página
├── styles.css          Todo el diseño
├── main.js             Catálogo, filtros, ficha, carrito y WhatsApp
├── lib/
│   ├── manifest.js     Marca, contacto, textos, paleta + catálogo de respaldo
│   ├── supabase-config.js  Claves de la base — LO GENERA EL BUILD, no editar
│   ├── data.js         Trae el catálogo de la base (con caché y respaldo)
│   └── anime.min.js    Librería de animaciones
├── admin/              ← EL PANEL (index.html, admin.css, admin.js)
├── db/
│   └── schema.sql      Las tablas y los permisos de la base
├── assets/
│   ├── img/            Fotos en WebP
│   └── favicon.svg
├── tools/
│   ├── build-config.js     Genera supabase-config.js desde las variables
│   │                       de entorno. Lo corre Vercel en cada deploy.
│   └── extract_photos.py   Sacó las fotos del PDF del proveedor.
│                           No se sube al hosting, es sólo para regenerarlas.
├── .htaccess           Caché para hostings Apache
└── vercel.json         Caché para Vercel
```

### Cómo llega el catálogo a la web

1. La página se dibuja al toque con lo último que el visitante tenía guardado
   (o con `manifest.js`, si es su primera visita).
2. En paralelo le pide el catálogo a la base. Si algo cambió, se actualiza sola.
3. **Si la base no contesta, la web sigue funcionando igual** con el catálogo de
   `manifest.js`. Nunca queda en blanco por un problema del servidor.

Por eso `manifest.js` no se borra: es la red de seguridad. Eso sí, una vez que
la base está andando, **editar `manifest.js` ya no cambia lo que se ve** (salvo
que la base se caiga). Los cambios van por el panel.

### Qué sigue en `manifest.js`

El panel **no** edita estas cosas; se cambian a mano en `lib/manifest.js`:

- El WhatsApp, el mail y el Instagram (arriba de todo, en `contacto`).
- Los textos de la marca y los tres bloques de envíos (`marca` e `info`).
- La paleta de colores (`colores`), que es de donde el panel saca los puntitos.

Después de editarlo, subí el número de versión en `index.html` (aparece en el
`<link>` del CSS y en los `<script>`) para que el navegador baje la versión
nueva:

```html
styles.css?v=20260801a   ->   styles.css?v=20260802a
```

---

## Cómo probarla en la computadora

Desde esta carpeta:

```bash
python3 -m http.server 8765
```

y abrir <http://localhost:8765>. El panel queda en
<http://localhost:8765/admin/>.

> Con doble clic en `index.html` la web se ve, pero el panel **no** funciona:
> necesita estar servida por HTTP.

---

## Cómo publicarla

Sirve cualquier hosting estático. Se sube la carpeta entera.

- **Vercel / Netlify**: arrastrar la carpeta. `vercel.json` ya deja configurado
  que el catálogo se actualice enseguida y las fotos se cacheen.
- **Hostinger u otro Apache**: subir por FTP. `.htaccess` hace lo mismo.

---

## Qué falta definir con el cliente

1. **Estampados reales de sábanas.** Están cargados los 30 del catálogo del
   proveedor (8 Super Cotton, 6 Micro Cotton, 16 Microfibra). Seguro no
   stockea todos: hay que borrar los que no tenga (ahora se hace desde el
   panel, editando el producto).
2. **Descuento de los sets.** Los tres combos tienen 10% puesto como ejemplo.
   Hay que confirmarlo o cambiarlo desde la solapa *Sets*.
3. **Toallones de playa.** Los marcó en el formulario, pero no vinieron en la
   lista de precios. Cuando los pase, se agregan como categoría nueva.
4. **Dos medidas para chequear contra el proveedor:**
   - Toalla Eletra: la lista dice 45×80, el catálogo dice 45×70.
   - Manta Outlet: la lista dice 150×200, el catálogo dice 180×200.
   Quedó cargada la medida de **la lista de precios**.
5. **Centavos en los precios.** Están tal cual los pasó ($24.402,84). Si
   prefiere redondear, se cambian desde la solapa *Precios*.
6. **Logo.** Ya está el logo en el header.

---

Las fotos salieron del catálogo del proveedor recortando **sólo los productos
que Sillorno vende**, y evitando a propósito los envases con marca ajena.
Si mañana cambia el catálogo, se corre `python tools/extract_photos.py` con el
PDF nuevo al lado de la carpeta.
