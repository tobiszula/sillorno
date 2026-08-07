/* =============================================================================
   SILLORNO — migra a Cloudinary las fotos que quedaron en Supabase Storage
   -----------------------------------------------------------------------------
   Antes de tener Cloudinary bien conectado, algunas fotos subidas desde el
   panel (sobre todo fotos por color) cayeron al respaldo de Supabase Storage.
   Esas nunca se optimizan: se sirven siempre al tamaño completo, sea donde
   sea que aparezcan en la web. Este script las baja, las sube a Cloudinary
   (como cualquier foto nueva del panel) y actualiza la base para que
   apunten ahí.

   Se corre UNA vez, desde tu computadora. No lo usa el sitio ni el deploy.

   CÓMO USARLO
     export CLOUDINARY_URL="cloudinary://<key>:<secret>@<cloud_name>"
     export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
     node tools/migrar-fotos-viejas.js

     Para ver qué haría sin subir ni tocar la base:
     node tools/migrar-fotos-viejas.js --simular

   La clave service_role sale de Supabase -> Settings -> API. Es secreta
   (a diferencia de la anon): hace falta acá porque este script escribe en
   la base directamente, sin pasar por el login del panel. No queda escrita
   en ningún archivo del proyecto.
   ========================================================================== */

const https = require("https");
const crypto = require("crypto");
const { URL } = require("url");

const SIMULAR = process.argv.includes("--simular");
const CARPETA = process.env.CLOUDINARY_CARPETA || "sillorno";
const SUPABASE_URL = (process.env.SUPABASE_URL || "https://qetcweptmjsvykizyiri.supabase.co").replace(/\/+$/, "");

/* ------------------------------------------------------------ credenciales */
const cru = String(process.env.CLOUDINARY_URL || "").trim();
const m = cru.match(/^cloudinary:\/\/([^:]+):([^@]+)@([a-z0-9_-]+)$/i);
if (!m) {
  console.error("\n  ✖  Falta CLOUDINARY_URL (o está mal escrita).\n");
  process.exit(1);
}
const API_KEY = m[1], API_SECRET = m[2], CLOUD = m[3];

const SERVICE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
if (!SERVICE_KEY) {
  console.error("\n  ✖  Falta SUPABASE_SERVICE_ROLE_KEY.\n");
  process.exit(1);
}

/* ------------------------------------------------------------- supabase -- */
function sbFetch(pathAndQuery, opciones) {
  opciones = opciones || {};
  return new Promise((resolve, reject) => {
    const u = new URL(SUPABASE_URL + pathAndQuery);
    const cuerpo = opciones.body ? Buffer.from(JSON.stringify(opciones.body)) : null;
    const req = https.request({
      method: opciones.method || "GET",
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: Object.assign({
        apikey: SERVICE_KEY,
        Authorization: "Bearer " + SERVICE_KEY,
        "Content-Type": "application/json",
      }, cuerpo ? { "Content-Length": cuerpo.length, Prefer: "return=minimal" } : {}),
    }, (res) => {
      let txt = "";
      res.on("data", (d) => { txt += d; });
      res.on("end", () => {
        if (res.statusCode >= 300) return reject(new Error("HTTP " + res.statusCode + " " + txt));
        resolve(txt ? JSON.parse(txt) : null);
      });
    });
    req.on("error", reject);
    if (cuerpo) req.write(cuerpo);
    req.end();
  });
}

function esExterna(u) {
  return /^https?:\/\//i.test(String(u || "")) && String(u).indexOf("cloudinary.com") < 0;
}

/* ------------------------------------------------------------- cloudinary */
function firmar(params) {
  const base = Object.keys(params).sort().map((k) => k + "=" + params[k]).join("&");
  return crypto.createHash("sha1").update(base + API_SECRET).digest("hex");
}

function descargar(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300) return reject(new Error("descarga HTTP " + res.statusCode));
      const partes = [];
      res.on("data", (d) => partes.push(d));
      res.on("end", () => resolve(Buffer.concat(partes)));
    }).on("error", reject);
  });
}

function subirBuffer(buf, publicId) {
  return new Promise((resolve, reject) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const params = { folder: CARPETA, overwrite: "true", public_id: publicId, timestamp: String(timestamp) };

    const cuerpo = [];
    const limite = "----sillorno" + crypto.randomBytes(12).toString("hex");
    const push = (s) => cuerpo.push(Buffer.from(s, "utf8"));
    Object.keys(params).forEach((k) => {
      push("--" + limite + "\r\n" + 'Content-Disposition: form-data; name="' + k + '"\r\n\r\n' + params[k] + "\r\n");
    });
    push("--" + limite + "\r\n" + 'Content-Disposition: form-data; name="api_key"\r\n\r\n' + API_KEY + "\r\n");
    push("--" + limite + "\r\n" + 'Content-Disposition: form-data; name="signature"\r\n\r\n' + firmar(params) + "\r\n");
    push("--" + limite + "\r\n" + 'Content-Disposition: form-data; name="file"; filename="foto.webp"\r\n' +
         "Content-Type: application/octet-stream\r\n\r\n");
    cuerpo.push(buf);
    push("\r\n--" + limite + "--\r\n");

    const datos = Buffer.concat(cuerpo);
    const req = https.request({
      method: "POST", hostname: "api.cloudinary.com", path: "/v1_1/" + CLOUD + "/image/upload",
      headers: { "Content-Type": "multipart/form-data; boundary=" + limite, "Content-Length": datos.length },
    }, (res) => {
      let txt = "";
      res.on("data", (d) => { txt += d; });
      res.on("end", () => {
        let j = null;
        try { j = JSON.parse(txt); } catch (e) { /* ignoramos */ }
        if (res.statusCode >= 300) return reject(new Error((j && j.error && j.error.message) || ("HTTP " + res.statusCode)));
        resolve(j.secure_url);
      });
    });
    req.on("error", reject);
    req.end(datos);
  });
}

function slug(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/* ------------------------------------------------------------------ main */
(async () => {
  console.log("\n  Cloud:   " + CLOUD + "\n  Carpeta: " + CARPETA);
  if (SIMULAR) console.log("  MODO SIMULACIÓN: no se sube ni se toca la base.");
  console.log("");

  const [productos, colorFotos, productoFotos] = await Promise.all([
    sbFetch("/rest/v1/productos?select=id,img"),
    sbFetch("/rest/v1/color_fotos?select=id,producto_id,color,img"),
    sbFetch("/rest/v1/producto_fotos?select=id,producto_id,img"),
  ]);

  const trabajo = [];
  productos.filter((p) => esExterna(p.img)).forEach((p) => {
    trabajo.push({ tipo: "producto", id: p.id, img: p.img, publicId: p.id, etiqueta: p.id + " (principal)" });
  });
  colorFotos.filter((c) => esExterna(c.img)).forEach((c) => {
    trabajo.push({ tipo: "color_foto", id: c.id, img: c.img,
      publicId: c.producto_id + "-color-" + slug(c.color), etiqueta: c.producto_id + " · " + c.color });
  });
  productoFotos.filter((f) => esExterna(f.img)).forEach((f) => {
    trabajo.push({ tipo: "producto_foto", id: f.id, img: f.img,
      publicId: f.producto_id + "-galeria-" + f.id, etiqueta: f.producto_id + " (galería)" });
  });

  if (!trabajo.length) {
    console.log("  No hay fotos externas para migrar. Ya está todo en Cloudinary.\n");
    return;
  }

  console.log("  Fotos a migrar: " + trabajo.length + "\n");

  let ok = 0;
  const errores = [];

  for (const item of trabajo) {
    try {
      if (SIMULAR) {
        console.log("  · " + item.etiqueta + " → " + CARPETA + "/" + item.publicId + " (simulado)");
        ok++;
        continue;
      }
      const buf = await descargar(item.img);
      const url = await subirBuffer(buf, item.publicId);

      const tabla = item.tipo === "producto" ? "productos" : item.tipo === "color_foto" ? "color_fotos" : "producto_fotos";
      await sbFetch("/rest/v1/" + tabla + "?id=eq." + encodeURIComponent(item.id), {
        method: "PATCH", body: { img: url },
      });

      console.log("  ✓ " + item.etiqueta + " → " + url);
      ok++;
    } catch (e) {
      errores.push(item.etiqueta + ": " + e.message);
      console.log("  ✖ " + item.etiqueta + " — " + e.message);
    }
  }

  console.log("\n  Migradas: " + ok + " de " + trabajo.length);
  if (errores.length) {
    console.log("  Fallaron " + errores.length + ":");
    errores.forEach((x) => console.log("    · " + x));
    process.exit(1);
  }
  console.log("\n  Listo. Recargá el panel y la web: esas fotos ya salen de Cloudinary.\n");
})().catch((e) => { console.error("\n  ✖  " + e.message + "\n"); process.exit(1); });
