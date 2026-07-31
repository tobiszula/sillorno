/* =============================================================================
   SILLORNO — carga del catálogo desde la base de datos
   -----------------------------------------------------------------------------
   Se ejecuta entre manifest.js y main.js. Qué hace:

     1. Si no hay conexión configurada, no hace nada: queda el catálogo de
        manifest.js y la web funciona igual que siempre.
     2. Si hay una copia guardada de la última visita, la usa al toque para
        que la página pinte sin esperar a la red.
     3. En paralelo le pide a la base el catálogo actualizado. Si cambió algo,
        vuelve a dibujar el catálogo solo.
     4. Si la base no contesta o viene vacía, se queda con lo que tenía.
        La web nunca queda en blanco por un problema del servidor.

   No hay que tocar nada de este archivo.
   ========================================================================== */

(function () {
  "use strict";

  var CFG       = window.__SUPABASE__ || {};
  var CACHE_KEY = "sillorno.catalogo.v1";
  var TIMEOUT   = 5000;   // techo para que la base conteste
  var ESPERA    = 1200;   // lo máximo que la web espera antes de dibujarse igual

  function hayConexion() {
    return /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(String(CFG.url || "").trim()) &&
           String(CFG.anonKey || "").trim().length > 30;
  }

  /* Sin configurar: la web sigue con manifest.js. */
  if (!hayConexion()) {
    window.__SILLORNO_READY__ = Promise.resolve(false);
    return;
  }

  /* ------------------------------------------------------------- caché -- */
  function cacheLeer() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function cacheGuardar(json) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), json: json })); }
    catch (e) { /* modo incógnito o disco lleno: no importa */ }
  }

  /* ------------------------------------------------------------- volcar -- */
  // Reemplaza sólo el catálogo. La marca, el contacto, los textos de envíos
  // y la paleta de colores siguen viniendo de manifest.js.
  function volcar(cat) {
    if (!cat || !Array.isArray(cat.productos) || !cat.productos.length) return false;
    var D = window.__SILLORNO__ || (window.__SILLORNO__ = {});
    if (Array.isArray(cat.categorias) && cat.categorias.length) D.categorias = cat.categorias;
    D.productos = cat.productos;
    D.combos    = Array.isArray(cat.combos) ? cat.combos : [];
    return true;
  }

  /* -------------------------------------------------------------- red --- */
  function pedir() {
    var url  = String(CFG.url).trim().replace(/\/+$/, "") + "/rest/v1/rpc/catalogo";
    var ctrl = (typeof AbortController === "function") ? new AbortController() : null;
    var reloj = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT);

    // Las claves viejas son JWT y van también como Bearer. Las nuevas
    // (sb_publishable_...) no lo son: mandarlas ahí devuelve 401.
    var cabeceras = { "apikey": CFG.anonKey, "Content-Type": "application/json" };
    if (String(CFG.anonKey).split(".").length === 3) {
      cabeceras.Authorization = "Bearer " + CFG.anonKey;
    }

    return fetch(url, {
      method: "POST",
      headers: cabeceras,
      body: "{}",
      signal: ctrl ? ctrl.signal : undefined,
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    }).then(function (txt) {
      clearTimeout(reloj);
      return txt;
    }, function (err) {
      clearTimeout(reloj);
      throw err;
    });
  }

  /* --------------------------------------------------------- remontaje -- */
  // main.js publica __SILLORNO_REMOUNT__ recién al final de su arranque. Si los
  // datos llegan justo en el medio, reintentamos un ratito.
  function remontar(intento) {
    if (typeof window.__SILLORNO_REMOUNT__ === "function") { window.__SILLORNO_REMOUNT__(); return; }
    if ((intento || 0) > 12) return;
    setTimeout(function () { remontar((intento || 0) + 1); }, 120);
  }

  /* ------------------------------------------------------------ arranque -- */
  var guardado = cacheLeer();
  var texto0   = guardado && guardado.json;
  var listo;

  if (texto0) {
    // Hay copia de la visita anterior: pintamos con eso, sin esperar nada,
    // y revalidamos por atrás.
    var ok = false;
    try { ok = volcar(JSON.parse(texto0)); } catch (e) { ok = false; }
    listo = Promise.resolve(ok);

    pedir().then(function (txt) {
      if (txt === texto0) return;                      // no cambió nada
      var cat;
      try { cat = JSON.parse(txt); } catch (e) { return; }
      if (!volcar(cat)) return;                        // vino vacío: lo ignoramos
      cacheGuardar(txt);
      remontar(0);
    }).catch(function () { /* sin red: seguimos con lo que hay */ });

  } else {
    // Primera visita. Le damos a la base un ratito para contestar, pero si
    // tarda más que ESPERA dibujamos igual con manifest.js y actualizamos
    // cuando llegue: nunca dejamos la portada en blanco esperando la red.
    listo = new Promise(function (resolver) {
      var resuelto = false;
      function listoYa(v) { if (!resuelto) { resuelto = true; resolver(v); } }

      setTimeout(function () { listoYa(false); }, ESPERA);

      pedir().then(function (txt) {
        var cat = JSON.parse(txt);
        var ok  = volcar(cat);
        if (ok) cacheGuardar(txt);
        if (resuelto && ok) remontar(0);               // ya se había dibujado
        listoYa(ok);
      }).catch(function () { listoYa(false); });
    });
  }

  window.__SILLORNO_READY__ = listo;
})();
