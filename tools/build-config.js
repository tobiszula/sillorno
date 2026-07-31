/* =============================================================================
   SILLORNO — genera lib/supabase-config.js desde las variables de entorno
   -----------------------------------------------------------------------------
   Lo corre Vercel en cada deploy (está puesto en vercel.json como buildCommand).

   Variables que lee (la primera que encuentre de cada lista). Si usás la
   integración oficial de Supabase en Vercel, ya quedan puestas solas:
     URL   -> SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, VITE_SUPABASE_URL
     CLAVE -> SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY,
              SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_ANON_KEY

   NUNCA lee la service_role ni POSTGRES_URL (que lleva la contraseña de la
   base adentro): este archivo termina en el navegador de cualquier visitante.
   Los nombres se buscan exactos, uno por uno, justamente por eso. Si igual
   aparece una clave secreta, el script la rechaza y corta el build.

   Si las variables faltan, NO rompe el deploy: deja el archivo vacío y la web
   sale igual con el catálogo de lib/manifest.js. Mejor un catálogo viejo que
   un sitio caído.

   Para probar en la computadora:
     SUPABASE_URL=... SUPABASE_ANON_KEY=... node tools/build-config.js
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const NOMBRES_URL = [
  "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL", "PUBLIC_SUPABASE_URL",
];
const NOMBRES_KEY = [
  "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_ANON_KEY", "PUBLIC_SUPABASE_ANON_KEY",
];

function primera(nombres) {
  for (const n of nombres) {
    const v = String(process.env[n] || "").trim();
    if (v) return { nombre: n, valor: v };
  }
  return { nombre: null, valor: "" };
}

/* ¿Es una clave secreta? Las claves de Supabase viejas son JWT: el payload
   dice "role":"anon" o "role":"service_role". Las nuevas se distinguen por el
   prefijo (sb_publishable_ / sb_secret_). */
function esSecreta(k) {
  if (/^sb_secret_/i.test(k)) return true;
  const partes = k.split(".");
  if (partes.length !== 3) return false;
  try {
    const payload = JSON.parse(Buffer.from(partes[1], "base64").toString("utf8"));
    return payload && payload.role && payload.role !== "anon";
  } catch (e) {
    return false;
  }
}

const elURL = primera(NOMBRES_URL);
const laKEY = primera(NOMBRES_KEY);

const url = elURL.valor.replace(/\/+$/, "");
const key = laKEY.valor;

const destino = path.join(__dirname, "..", "lib", "supabase-config.js");

// Cortamos el build: publicar la service_role sería exponer la base entera.
if (key && esSecreta(key)) {
  console.error("");
  console.error("  ✖  SILLORNO: la variable " + laKEY.nombre + " tiene una clave SECRETA.");
  console.error("     Esa clave da permiso total sobre la base y este archivo lo lee");
  console.error("     cualquier visitante. Poné la clave 'anon public' en su lugar.");
  console.error("");
  process.exit(1);
}

const urlOK = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url);
const keyOK = key.length > 30;

if (!urlOK || !keyOK) {
  console.warn("");
  console.warn("  ⚠  SILLORNO: faltan las variables de la base de datos.");
  if (!urlOK) {
    console.warn(url
      ? "     La URL (" + elURL.nombre + ") es inválida: " + url
      : "     No encontré la URL. Busqué: " + NOMBRES_URL.join(", "));
  }
  if (!keyOK) {
    console.warn(key
      ? "     La clave (" + laKEY.nombre + ") es demasiado corta"
      : "     No encontré la clave. Busqué: " + NOMBRES_KEY.join(", "));
  }
  console.warn("     Se publica igual, con el catálogo de lib/manifest.js.");
  console.warn("     El panel /admin NO va a funcionar hasta que estén cargadas.");
  console.warn("     Se cargan en: Vercel -> Settings -> Environment Variables,");
  console.warn("     o solas con la integración oficial de Supabase.");
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
