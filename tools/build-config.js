/* =============================================================================
   SILLORNO — genera lib/supabase-config.js desde las variables de entorno
   -----------------------------------------------------------------------------
   Lo corre Vercel en cada deploy (está puesto en vercel.json como buildCommand).

   Variables que lee:
     SUPABASE_URL       -> Project URL     (https://xxxxxxxx.supabase.co)
     SUPABASE_ANON_KEY  -> clave "anon public"

   Si faltan, NO rompe el deploy: deja el archivo vacío y la web sale igual con
   el catálogo de lib/manifest.js. Mejor un catálogo viejo que un sitio caído.

   Para probar en la computadora:
     SUPABASE_URL=... SUPABASE_ANON_KEY=... node tools/build-config.js
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const key = String(process.env.SUPABASE_ANON_KEY || "").trim();

const destino = path.join(__dirname, "..", "lib", "supabase-config.js");

const urlOK = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url);
const keyOK = key.length > 30;

if (!urlOK || !keyOK) {
  console.warn("");
  console.warn("  ⚠  SILLORNO: faltan las variables de la base de datos.");
  if (!urlOK) console.warn("     SUPABASE_URL " + (url ? "es inválida: " + url : "no está definida"));
  if (!keyOK) console.warn("     SUPABASE_ANON_KEY " + (key ? "es demasiado corta" : "no está definida"));
  console.warn("     Se publica igual, con el catálogo de lib/manifest.js.");
  console.warn("     El panel /admin/ NO va a funcionar hasta que estén cargadas.");
  console.warn("     Se cargan en: Vercel -> Settings -> Environment Variables.");
  console.warn("");
}

// Sólo escapamos comillas y barras: son valores de configuración, no texto libre.
const comillas = (s) => JSON.stringify(String(s));

const contenido = `/* =============================================================================
   SILLORNO — conexión con la base de datos

   ⚠️ ARCHIVO GENERADO AUTOMÁTICAMENTE. No lo edites a mano en producción:
   lo reescribe tools/build-config.js en cada deploy, a partir de las variables
   de entorno SUPABASE_URL y SUPABASE_ANON_KEY.

   La clave "anon" es pública a propósito: viaja al navegador y no da permiso
   para editar nada. Quien edita es el usuario que inicia sesión en el panel.
   NUNCA uses acá la clave "service_role".
   ========================================================================== */

window.__SUPABASE__ = {
  url: ${comillas(urlOK && keyOK ? url : "")},
  anonKey: ${comillas(urlOK && keyOK ? key : "")},
};
`;

fs.writeFileSync(destino, contenido, "utf8");

console.log(
  urlOK && keyOK
    ? "  ✓ SILLORNO: lib/supabase-config.js generado (" + url + ")"
    : "  · SILLORNO: lib/supabase-config.js generado vacío (modo respaldo)"
);
