# Sillorno — tienda web

Tienda de blanquería con catálogo, filtros, buscador, carrito y pedido por
WhatsApp. HTML + CSS + JavaScript puro: no necesita npm, ni build, ni servidor.
Se sube la carpeta tal cual y funciona.

---

## Cómo actualizar la tienda

**Todo se edita en un solo archivo: `lib/manifest.js`.**
Se abre con cualquier editor de texto (hasta el Bloc de notas).

### Cambiar un precio

Buscá el producto y cambiá el número de `precio`. Se escribe **sin puntos y con
punto para los centavos**:

```js
{ medida: "85 × 150 cm", detalle: "Toallón XL", precio: 24402.84, stock: "disponible" },
```

### Marcar que algo no hay

En la medida que corresponda, cambiá `stock`:

| Valor | Qué muestra la web |
|---|---|
| `"disponible"` | Punto verde, se puede comprar |
| `"ultimas"` | Punto amarillo, "Últimas unidades" |
| `"agotado"` | Gris, no se puede agregar al carrito |

### Sacar o agregar productos

- Para **sacar** un producto: borrá su bloque completo, desde `{` hasta `},`.
- Para **agregar** uno: copiá un bloque parecido, pegalo y cambiale los datos.
  El `id` no se puede repetir.

### Cambiar el WhatsApp o el mail

Está arriba de todo, en `contacto`.

### Después de editar

Si ya está publicada, abrí `index.html` y subí el número de versión (aparece
tres veces, al final del archivo y en el `<link>` del CSS):

```html
styles.css?v=20260730b   ->   styles.css?v=20260801
```

Eso obliga al navegador a bajar la versión nueva en vez de mostrar la vieja.

---

## Cómo probarla en la computadora

Doble clic en `index.html` alcanza para verla. Para que funcione igual que
publicada, desde esta carpeta:

```bash
python -m http.server 8765
```

y abrir <http://localhost:8765>.

---

## Cómo publicarla

Sirve cualquier hosting estático. Se arrastra la carpeta entera y listo.

- **Vercel / Netlify**: arrastrar la carpeta. `vercel.json` ya deja
  configurado que el catálogo se actualice enseguida y las fotos se cacheen.
- **Hostinger u otro Apache**: subir por FTP. `.htaccess` hace lo mismo.

---

## Qué falta definir con el cliente

1. **Estampados reales de sábanas.** Están cargados los 30 del catálogo del
   proveedor (8 Super Cotton, 6 Micro Cotton, 16 Microfibra). Seguro no
   stockea todos: hay que borrar de `estampados` los que no tenga.
2. **Descuento de los sets.** Los tres combos tienen `descuento: 0.10` (10%)
   puesto por mí como ejemplo. Hay que confirmarlo o cambiarlo. Con `0`
   se muestra el precio sin descuento.
3. **Toallones de playa.** Los marcó en el formulario, pero no vinieron en la
   lista de precios. Cuando los pase, se agregan como categoría nueva.
4. **Dos medidas para chequear contra el proveedor:**
   - Toalla Eletra: la lista dice 45×80, el catálogo dice 45×70.
   - Manta Outlet: la lista dice 150×200, el catálogo dice 180×200.
   Quedó cargada la medida de **la lista de precios**.
5. **Centavos en los precios.** Están tal cual los pasó ($24.402,84). Si
   prefiere redondear, se cambian en `manifest.js`.
6. **Logo.** Por ahora la marca es tipográfica (Cormorant Garamond en
   versalitas). Si más adelante hay logo, reemplaza el texto del header.

---

## Cómo está armado

```
sillorno-web/
├── index.html          Estructura de la página
├── styles.css          Todo el diseño
├── main.js             Catálogo, filtros, carrito, WhatsApp
├── lib/
│   ├── manifest.js     ← LOS PRODUCTOS Y PRECIOS (esto es lo que se edita)
│   └── anime.min.js    Librería de animaciones
├── assets/
│   ├── img/            67 fotos en WebP (5 MB en total)
│   └── favicon.svg
├── tools/
│   └── extract_photos.py   Sacó las fotos del PDF del proveedor.
│                           No se sube al hosting, es sólo para regenerarlas.
├── .htaccess           Caché para hostings Apache
└── vercel.json         Caché para Vercel
```

Las fotos salieron del catálogo del proveedor recortando **sólo los productos
que Sillorno vende**, y evitando a propósito los envases con marca ajena.
Si mañana cambia el catálogo, se corre `python tools/extract_photos.py` con el
PDF nuevo al lado de la carpeta.
