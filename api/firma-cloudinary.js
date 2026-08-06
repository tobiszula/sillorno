/* =============================================================================
   SILLORNO — firma de subidas a Cloudinary
   -----------------------------------------------------------------------------
   Función serverless de Vercel. El panel la llama antes de subir una foto.

   POR QUÉ EXISTE
     Cloudinary permite subir "sin firma", pero para eso hay que dejar el nombre
     del preset en el JavaScript del panel, que es público: cualquiera que mire
     el código fuente podría subir archivos a la cuenta.

     Con esto, el secreto vive sólo acá (en las variables de entorno de Vercel,
     del lado del servidor) y antes de firmar se comprueba que quien pide sea
     un administrador de verdad, logueado en Supabase y presente en la tabla
     "admins". Sin eso, no hay firma y no hay subida.

   VARIABLES QUE NECESITA (Vercel -> Settings -> Environment Variables)
     CLOUDINARY_URL        cloudinary://<key>:<secret>@<cloud>
       (o bien CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET + CLOUDINARY_CLOUD_NAME)
     SUPABASE_URL          para verificar quién es el que pide
     SUPABASE_ANON_KEY

   Si falta alguna, devuelve 503 y el panel sigue subiendo a Supabase Storage.
   ========================================================================== */

const crypto = require("crypto");

/* --------------------------------------------------------- configuración */
function credenciales() {
  const cru = String(process.env.CLOUDINARY_URL || "").trim();
  const m = cru.match(/^cloudinary:\/\/([^:]+):([^@]+)@([a-z0-9_-]+)$/i);
  if (m) return { key: m[1], secret: m[2], cloud: m[3] };
  return {
    key:    String(process.env.CLOUDINARY_API_KEY || "").trim(),
    secret: String(process.env.CLOUDINARY_API_SECRET || "").trim(),
    cloud:  String(process.env.CLOUDINARY_CLOUD_NAME || "").trim(),
  };
}

function primera(nombres) {
  for (const n of nombres) {
    const v = String(process.env[n] || "").trim();
    if (v) return v;
  }
  return "";
}

const SUPA_URL = primera(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL"])
  .replace(/\/+$/, "");
const SUPA_KEY = primera([
  "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
]);

/* ------------------------------------------------------------ ¿es admin? */
// Le preguntamos a Supabase con el token del que pide. Si el token es falso o
// vencido, Supabase responde error; si es válido pero no está en "admins",
// es_admin() devuelve false. En los dos casos no firmamos.
async function esAdmin(token) {
  if (!SUPA_URL || !SUPA_KEY || !token) return false;
  try {
    const r = await fetch(SUPA_URL + "/rest/v1/rpc/es_admin", {
      method: "POST",
      headers: {
        "apikey": SUPA_KEY,
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!r.ok) return false;
    return (await r.json()) === true;
  } catch (e) {
    return false;
  }
}

/* ------------------------------------------------------------------ firma */
// Cloudinary firma los parámetros ordenados alfabéticamente + el secreto.
function firmar(params, secret) {
  const base = Object.keys(params).sort()
    .map((k) => k + "=" + params[k]).join("&");
  return crypto.createHash("sha1").update(base + secret).digest("hex");
}

/* ---------------------------------------------------------------- handler */
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Usá POST." });
    return;
  }

  const { key, secret, cloud } = credenciales();
  if (!key || !secret || !cloud) {
    res.status(503).json({ error: "Cloudinary no está configurado en el servidor." });
    return;
  }
  if (!SUPA_URL || !SUPA_KEY) {
    res.status(503).json({ error: "Supabase no está configurado en el servidor." });
    return;
  }

  const auth = String(req.headers.authorization || "");
  const token = auth.replace(/^Bearer\s+/i, "").trim();

  if (!(await esAdmin(token))) {
    res.status(401).json({ error: "Necesitás iniciar sesión como administrador." });
    return;
  }

  // Sin public_id: Cloudinary le pone uno único y nunca pisa las fotos viejas.
  const carpeta = String(process.env.CLOUDINARY_CARPETA || "sillorno").trim();
  const params = {
    folder: carpeta,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };

  res.status(200).json({
    cloud: cloud,
    apiKey: key,
    folder: carpeta,
    timestamp: params.timestamp,
    signature: firmar(params, secret),
  });
};
