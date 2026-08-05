/* =============================================================================
   SILLORNO — sube las fotos de assets/img/ a Cloudinary
   -----------------------------------------------------------------------------
   Se corre UNA vez, desde tu computadora. No lo usa el sitio ni el deploy.

   CÓMO USARLO
     1. En Cloudinary: Dashboard -> "API Environment variable". Copiá la línea
        entera, que tiene la forma  cloudinary://<key>:<secret>@<cloud_name>
     2. En tu terminal, parado en la carpeta del proyecto:

          export CLOUDINARY_URL="cloudinary://..."
          node tools/subir-cloudinary.js

     3. Para ver qué haría sin subir nada:

          node tools/subir-cloudinary.js --simular

   El secreto sale de tu terminal y no queda escrito en ningún archivo.

   Cada foto se sube con un nombre predecible:
     assets/img/toallon-icone.webp  ->  sillorno/toallon-icone
   Por eso el sitio puede armar la URL solo, sin tener que migrar la base.

   Se puede correr más de una vez: las que ya están se sobreescriben.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const https = require("https");
const crypto = require("crypto");

const SIMULAR = process.argv.includes("--simular");
const CARPETA = process.env.CLOUDINARY_CARPETA || "sillorno";
const DIR = path.join(__dirname, "..", "assets", "img");

/* ------------------------------------------------------------ credenciales */
const cru = String(process.env.CLOUDINARY_URL || "").trim();
const m = cru.match(/^cloudinary:\/\/([^:]+):([^@]+)@([a-z0-9_-]+)$/i);

if (!m) {
  console.error("");
  console.error("  ✖  Falta CLOUDINARY_URL (o está mal escrita).");
  console.error("     Sacala de: Cloudinary -> Dashboard -> API Environment variable");
  console.error("     y exportala así (con las comillas):");
  console.error("");
  console.error('       export CLOUDINARY_URL="cloudinary://<key>:<secret>@<cloud_name>"');
  console.error("");
  process.exit(1);
}
const API_KEY = m[1], API_SECRET = m[2], CLOUD = m[3];

/* ------------------------------------------------------------------ fotos */
if (!fs.existsSync(DIR)) {
  console.error("  ✖  No encuentro la carpeta assets/img/");
  process.exit(1);
}

const archivos = fs.readdirSync(DIR)
  .filter((f) => /\.(webp|jpe?g|png|avif)$/i.test(f))
  .sort();

if (!archivos.length) {
  console.error("  ✖  No hay imágenes en assets/img/");
  process.exit(1);
}

console.log("");
console.log("  Cloud:   " + CLOUD);
console.log("  Carpeta: " + CARPETA);
console.log("  Fotos:   " + archivos.length);
if (SIMULAR) console.log("  MODO SIMULACIÓN: no se sube nada.");
console.log("");

/* --------------------------------------------------------------- subida -- */
// Cloudinary firma los parámetros ordenados alfabéticamente + el secreto.
function firmar(params) {
  const base = Object.keys(params).sort()
    .map((k) => k + "=" + params[k]).join("&");
  return crypto.createHash("sha1").update(base + API_SECRET).digest("hex");
}

function subir(archivo) {
  return new Promise((resolve, reject) => {
    const publicId = path.basename(archivo).replace(/\.[^.]+$/, "");
    const timestamp = Math.floor(Date.now() / 1000);
    const params = {
      folder: CARPETA,
      overwrite: "true",
      public_id: publicId,
      timestamp: String(timestamp),
    };

    if (SIMULAR) return resolve({ publicId, simulado: true });

    const cuerpo = [];
    const limite = "----sillorno" + crypto.randomBytes(12).toString("hex");
    const push = (s) => cuerpo.push(Buffer.from(s, "utf8"));

    Object.keys(params).forEach((k) => {
      push("--" + limite + "\r\n");
      push('Content-Disposition: form-data; name="' + k + '"\r\n\r\n');
      push(params[k] + "\r\n");
    });
    push("--" + limite + "\r\n");
    push('Content-Disposition: form-data; name="api_key"\r\n\r\n' + API_KEY + "\r\n");
    push("--" + limite + "\r\n");
    push('Content-Disposition: form-data; name="signature"\r\n\r\n' + firmar(params) + "\r\n");
    push("--" + limite + "\r\n");
    push('Content-Disposition: form-data; name="file"; filename="' + archivo + '"\r\n');
    push("Content-Type: application/octet-stream\r\n\r\n");
    cuerpo.push(fs.readFileSync(path.join(DIR, archivo)));
    push("\r\n--" + limite + "--\r\n");

    const datos = Buffer.concat(cuerpo);
    const req = https.request({
      method: "POST",
      hostname: "api.cloudinary.com",
      path: "/v1_1/" + CLOUD + "/image/upload",
      headers: {
        "Content-Type": "multipart/form-data; boundary=" + limite,
        "Content-Length": datos.length,
      },
    }, (res) => {
      let txt = "";
      res.on("data", (d) => { txt += d; });
      res.on("end", () => {
        let j = null;
        try { j = JSON.parse(txt); } catch (e) { /* ignoramos */ }
        if (res.statusCode >= 300) {
          return reject(new Error((j && j.error && j.error.message) || ("HTTP " + res.statusCode)));
        }
        resolve({ publicId, url: j && j.secure_url });
      });
    });
    req.on("error", reject);
    req.end(datos);
  });
}

/* De a 4 por vez: rápido pero sin que Cloudinary corte por exceso. */
(async () => {
  let ok = 0;
  const errores = [];

  for (let i = 0; i < archivos.length; i += 4) {
    const tanda = archivos.slice(i, i + 4);
    const res = await Promise.all(tanda.map((a) =>
      subir(a).then((r) => ({ a, r })).catch((e) => ({ a, e }))
    ));
    res.forEach(({ a, r, e }) => {
      if (e) { errores.push(a + ": " + e.message); console.log("  ✖ " + a + " — " + e.message); }
      else { ok++; console.log("  ✓ " + a + " → " + CARPETA + "/" + r.publicId); }
    });
  }

  console.log("");
  console.log("  Subidas: " + ok + " de " + archivos.length);
  if (errores.length) {
    console.log("  Fallaron " + errores.length + ":");
    errores.forEach((x) => console.log("    · " + x));
    process.exit(1);
  }
  console.log("");
  console.log("  Listo. Ahora cargá en Vercel la variable:");
  console.log("    CLOUDINARY_CLOUD_NAME = " + CLOUD);
  console.log("  y volvé a deployar. No hay que tocar nada en Supabase.");
  console.log("");
})();
