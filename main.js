/* =============================================================================
   SILLORNO — lógica de la tienda
   Catálogo, filtros, buscador, ficha de producto, carrito y pedido por WhatsApp.
   Patrón IIFE: sin imports, funciona en cualquier hosting y hasta con file://
   ========================================================================== */

(function () {
  "use strict";

  var DATA = window.__SILLORNO__ || {};
  var PRODUCTOS = DATA.productos || [];
  var CATEGORIAS = DATA.categorias || [];
  var COMBOS = DATA.combos || [];
  var COLORES = DATA.colores || {};
  var CART_KEY = "sillorno.cart.v1";

  /* ----------------------------------------------------------- helpers -- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  // Los precios son redondos, así que no mostramos ",00" al pedo. Si alguna
  // vez alguien carga un precio con centavos, ahí sí aparecen los dos decimales.
  var fmtARS = new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS",
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  var fmtARS0 = new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS",
    minimumFractionDigits: 0, maximumFractionDigits: 0
  });
  function money(n) {
    var v = Number(n) || 0;
    return (v % 1 === 0 ? fmtARS0 : fmtARS).format(v);
  }

  // Minúsculas y sin acentos, para que "sabana" encuentre "sábana"
  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD")
      .split("").filter(function (ch) {
        var c = ch.charCodeAt(0);
        return c < 0x300 || c > 0x36f;   // saco los acentos combinantes
      }).join("");
  }

  /* ------------------------------------------------- datos normalizados -- */
  // Etiqueta de medida útil para filtrar (no la dimensión cruda cuando hay
  // un nombre comercial más claro, como "Toallón XL" o "2 plazas").
  var MEDIDA_WORDS = ["Toallón XL", "Toallón", "Toalla", "Piso",
                      "1 plaza", "2 plazas", "Queen", "King"];

  function medidaLabel(v) {
    for (var i = 0; i < MEDIDA_WORDS.length; i++) {
      if (v.detalle === MEDIDA_WORDS[i]) return MEDIDA_WORDS[i];
    }
    return v.medida;
  }

  function materialTag(p) {
    var m = norm(p.material);
    if (m.indexOf("100% algodon") >= 0) return "Algodón puro";
    if (m.indexOf("algodon") >= 0) return "Mezcla de algodón";
    return "Microfibra / poliéster";
  }

  var PRECIO_MAX = 0;

  /* Lee window.__SILLORNO__ (venga de manifest.js o de la base de datos) y
     deja los productos listos para filtrar, ordenar y buscar. Se puede volver
     a llamar si el catálogo cambia sin recargar la página. */
  function preparar() {
    DATA       = window.__SILLORNO__ || DATA || {};
    PRODUCTOS  = DATA.productos  || [];
    CATEGORIAS = DATA.categorias || [];
    COMBOS     = DATA.combos     || [];
    COLORES    = DATA.colores    || {};

    PRODUCTOS.forEach(function (p) {
      p._material = materialTag(p);
      p._medidas = (p.variantes || []).map(medidaLabel);
      p._precios = (p.variantes || []).map(function (v) { return Number(v.precio) || 0; });
      p._min = p._precios.length ? Math.min.apply(null, p._precios) : 0;
      p._max = p._precios.length ? Math.max.apply(null, p._precios) : 0;
      p._hayStock = (p.variantes || []).some(function (v) { return v.stock !== "agotado"; });
      p._cat = (CATEGORIAS.filter(function (c) { return c.id === p.categoria; })[0] || {}).nombre || "";
      p._busca = norm([p.nombre, p._cat, p.material, p.gramaje, p.descripcion,
                       p._medidas.join(" "), (p.variantes || []).map(function (v) { return v.medida; }).join(" "),
                       (p.estampados || []).map(function (e) { return e.nombre; }).join(" "),
                       (p.colores || []).join(" ")].join(" "));
    });

    var tope = PRODUCTOS.length
      ? Math.max.apply(null, PRODUCTOS.map(function (p) { return p._max; })) : 0;
    PRECIO_MAX = Math.max(3000, Math.ceil(tope / 1000) * 1000);
  }

  preparar();

  function byId(id) {
    return PRODUCTOS.filter(function (p) { return p.id === id; })[0];
  }
  function variante(p, medida) {
    return (p.variantes || []).filter(function (v) { return v.medida === medida; })[0];
  }
  function comboById(id) {
    return COMBOS.filter(function (c) { return c.id === id; })[0];
  }

  /* ------------------------------------------------------------ estado -- */
  var state = {
    cats: [], medidas: [], materiales: [],
    precioMax: PRECIO_MAX, soloStock: false,
    q: "", orden: "destacados"
  };
  var cart = [];

  /* ============================================================  CARRITO  */
  function cartLoad() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      cart = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(cart)) cart = [];
      // Descarto lo que ya no exista en el catálogo
      cart = cart.filter(function (it) {
        if (it.tipo === "combo") return !!comboById(it.cid);
        it.tipo = "producto";
        var p = byId(it.pid);
        return p && variante(p, it.medida);
      });
    } catch (e) { cart = []; }
  }
  function cartSave() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
  }

  // Los sets viajan como una sola línea: así el precio del carrito es el mismo
  // que el anunciado en la web, con su descuento incluido.
  function cartKey(it) {
    return it.tipo === "combo"
      ? "combo|" + it.cid
      : "p|" + it.pid + "|" + it.medida + "|" + (it.estampado || "");
  }

  function cartPush(item) {
    var k = cartKey(item);
    var found = cart.filter(function (x) { return cartKey(x) === k; })[0];
    if (found) found.qty += item.qty;
    else cart.push(item);
    cartSave(); renderCart();
  }
  function cartAdd(pid, medida, estampado, qty) {
    cartPush({ tipo: "producto", pid: pid, medida: medida,
               estampado: estampado || null, qty: qty || 1 });
  }
  function cartAddCombo(cid, qty) {
    cartPush({ tipo: "combo", cid: cid, qty: qty || 1 });
  }

  function cartSet(k, qty) {
    for (var i = 0; i < cart.length; i++) {
      if (cartKey(cart[i]) === k) {
        if (qty <= 0) cart.splice(i, 1); else cart[i].qty = qty;
        break;
      }
    }
    cartSave(); renderCart();
  }

  function precioItem(it) {
    if (it.tipo === "combo") {
      var c = comboById(it.cid);
      return c ? comboPrecios(c).final : 0;
    }
    var p = byId(it.pid); if (!p) return 0;
    var v = variante(p, it.medida);
    return v ? v.precio : 0;
  }
  function cartTotal() {
    return cart.reduce(function (sum, it) { return sum + precioItem(it) * it.qty; }, 0);
  }
  function cartCount() {
    return cart.reduce(function (n, it) { return n + it.qty; }, 0);
  }

  /* ==========================================================  RENDERIZAR */
  function mountCats() {
    var box = $("[data-cats]"); if (!box) return;
    var tiles = CATEGORIAS.map(function (c) {
      return '<button class="cat-banner" type="button" data-cat-tile="' + esc(c.id) + '" ' +
             'aria-label="Ver ' + esc(c.nombre) + '">' +
             '<img src="' + esc(c.img) + '" alt="" loading="lazy" decoding="async">' +
             '<span class="cat-banner-txt">' +
               '<span class="cat-banner-name">' + esc(c.corto || c.nombre) + '</span>' +
               (c.sub ? '<span class="cat-banner-sub">' + esc(c.sub) + '</span>' : '') +
             '</span></button>';
    });
    // "Ver todo": solo visible en la grilla de desktop (oculto en mobile por CSS)
    tiles.push('<button class="cat-banner cat-all" type="button" data-cat-all aria-label="Ver todo">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>' +
      '<rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>' +
      '</svg><span class="cat-banner-txt"><span class="cat-banner-name">Ver todo</span></span></button>');
    box.innerHTML = tiles.join("");
  }

  function mountInfo() {
    var box = $("[data-info]"); if (!box) return;
    box.innerHTML = (DATA.info || []).map(function (i) {
      return '<article class="info-item reveal"><h3>' + esc(i.titulo) + '</h3>' +
             '<p>' + esc(i.texto) + '</p></article>';
    }).join("");
  }

  function cardHTML(p) {
    var flags = "";
    if (p.destacado) flags += '<span class="flag is-wine">Destacado</span>';
    if (p.estampados && p.estampados.length > 3) {
      flags += '<span class="flag">' + p.estampados.length + " estampados</span>";
    }
    if (!p._hayStock) flags += '<span class="flag">Sin stock</span>';

    var multi = (p.variantes || []).length > 1 || (p.estampados || []).length > 0;
    var spec = [p.material, p.gramaje].filter(Boolean).join(" · ");

    return '<article class="card" data-card="' + esc(p.id) + '">' +
      '<button class="card-media" type="button" data-open-product="' + esc(p.id) + '" ' +
        'aria-label="Ver ' + esc(p.nombre) + '">' +
        '<img src="' + esc(p.img) + '" alt="' + esc(p.nombre) + '" loading="lazy" decoding="async">' +
        (flags ? '<span class="card-flags">' + flags + "</span>" : "") +
      "</button>" +
      '<div class="card-body">' +
        '<p class="card-cat">' + esc(p._cat) + "</p>" +
        '<h3 class="card-name">' +
          '<button type="button" data-open-product="' + esc(p.id) + '">' + esc(p.nombre) + "</button>" +
        "</h3>" +
        '<p class="card-spec">' + esc(spec) + "</p>" +
        '<div class="card-foot">' +
          '<span class="card-price">' +
            (p.variantes.length > 1 ? "<small>desde</small>" : "") +
            "<strong>" + money(p._min) + "</strong>" +
          "</span>" +
          '<button class="card-add" type="button" data-quick="' + esc(p.id) + '" ' +
            'aria-label="' + (multi ? "Elegir opciones de " : "Agregar ") + esc(p.nombre) + '">' +
            (multi
              ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>'
              : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>') +
          "</button>" +
        "</div>" +
      "</div></article>";
  }

  function mountGrid() {
    var grid = $("[data-grid]"); if (!grid || grid.children.length) return;
    grid.innerHTML = PRODUCTOS.map(cardHTML).join("");
  }

  /* -------------------------------------------------------- combos ------ */
  function comboPrecios(combo) {
    var full = (combo.items || []).reduce(function (sum, it) {
      var p = byId(it.producto); if (!p) return sum;
      var v = variante(p, it.medida); if (!v) return sum;
      return sum + v.precio * it.cantidad;
    }, 0);
    var desc = combo.descuento || 0;
    return { full: full, final: full * (1 - desc), ahorro: full * desc };
  }

  function mountCombos() {
    var box = $("[data-combos]"); if (!box) return;
    box.innerHTML = COMBOS.map(function (c) {
      var pr = comboPrecios(c);
      if (!pr.full) return "";
      var lista = (c.items || []).map(function (it) {
        var p = byId(it.producto);
        return p ? "<li>" + esc(p.nombre) + " · " + esc(it.medida) +
               (it.cantidad > 1 ? " ×" + it.cantidad : "") + "</li>" : "";
      }).join("");
      return '<article class="combo reveal">' +
        '<div class="combo-media"><img src="' + esc(c.img) + '" alt="' + esc(c.nombre) +
          '" loading="lazy" decoding="async"></div>' +
        '<div class="combo-body">' +
          '<h3 class="combo-name">' + esc(c.nombre) + "</h3>" +
          '<p class="combo-desc">' + esc(c.descripcion) + "</p>" +
          '<ul class="combo-list">' + lista + "</ul>" +
          '<div class="combo-foot">' +
            '<span class="combo-price">' +
              (pr.ahorro > 0 ? "<s>" + money(pr.full) + "</s>" : "") +
              "<strong>" + money(pr.final) + "</strong>" +
              (pr.ahorro > 0 ? '<span class="combo-save">Ahorrás ' + money(pr.ahorro) + "</span>" : "") +
            "</span>" +
            '<button class="btn btn-line" type="button" data-add-combo="' + esc(c.id) + '">Agregar</button>' +
          "</div>" +
        "</div></article>";
    }).join("");
  }

  /* ==========================================================  FILTROS   */
  function countBy(getter) {
    var map = {};
    PRODUCTOS.forEach(function (p) {
      var vals = getter(p);
      (Array.isArray(vals) ? vals : [vals]).forEach(function (v) {
        if (!v) return;
        map[v] = (map[v] || 0) + 1;
      });
    });
    return map;
  }

  function groupHTML(titulo, key, opciones, activos) {
    var opts = opciones.map(function (o) {
      var on = activos.indexOf(o.value) >= 0;
      return '<label class="fopt">' +
        '<input type="checkbox" data-f="' + key + '" value="' + esc(o.value) + '"' +
          (on ? " checked" : "") + ">" +
        '<span class="box"></span><span>' + esc(o.label) + "</span>" +
        '<span class="n">' + o.n + "</span></label>";
    }).join("");
    return '<div class="fgroup"><h4>' + esc(titulo) + '</h4><div class="fopts">' + opts + "</div></div>";
  }

  // Cuenta Medida/Material sólo entre los productos de las categorías activas,
  // así esos filtros no ofrecen valores que no existen ahí (ej. "Queen" en Toallas).
  function countByEnCategoria(getter) {
    var universo = state.cats.length
      ? PRODUCTOS.filter(function (p) { return state.cats.indexOf(p.categoria) >= 0; })
      : PRODUCTOS;
    var map = {};
    universo.forEach(function (p) {
      var vals = getter(p);
      (Array.isArray(vals) ? vals : [vals]).forEach(function (v) {
        if (!v) return;
        map[v] = (map[v] || 0) + 1;
      });
    });
    return map;
  }

  function mountFiltros() {
    var box = $("[data-filtros-body]"); if (!box) return;

    var catCount = countBy(function (p) { return p._cat; });
    var cats = CATEGORIAS
      .filter(function (c) { return catCount[c.nombre]; })
      .map(function (c) { return { value: c.id, label: c.nombre, n: catCount[c.nombre] }; });

    var medCount = countByEnCategoria(function (p) {
      return p._medidas.filter(function (v, i, a) { return a.indexOf(v) === i; });
    });
    var medOrder = MEDIDA_WORDS.slice();
    var medidas = Object.keys(medCount).sort(function (a, b) {
      var ia = medOrder.indexOf(a), ib = medOrder.indexOf(b);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return a.localeCompare(b, "es");
    }).map(function (m) { return { value: m, label: m, n: medCount[m] }; });

    var matCount = countByEnCategoria(function (p) { return p._material; });
    var materiales = Object.keys(matCount).sort().map(function (m) {
      return { value: m, label: m, n: matCount[m] };
    });

    // Si al cambiar de categoría una medida/material seleccionado dejó de
    // existir en ese universo, lo destildamos solo (no tiene sentido dejarlo marcado).
    state.medidas = state.medidas.filter(function (m) { return medCount[m]; });
    state.materiales = state.materiales.filter(function (m) { return matCount[m]; });

    box.innerHTML =
      groupHTML("Categoría", "cats", cats, state.cats) +
      groupHTML("Medida", "medidas", medidas, state.medidas) +
      groupHTML("Material", "materiales", materiales, state.materiales) +
      '<div class="fgroup"><h4>Precio</h4><div class="frange">' +
        '<div class="frange-val"><span>Hasta</span><span data-precio-val>' +
          money(state.precioMax) + "</span></div>" +
        '<input type="range" min="1500" max="' + PRECIO_MAX + '" step="500" ' +
          'value="' + state.precioMax + '" data-precio aria-label="Precio máximo">' +
      "</div></div>" +
      '<div class="fgroup"><div class="fopts">' +
        '<label class="fopt"><input type="checkbox" data-f="stock" value="1"' +
          (state.soloStock ? " checked" : "") + '><span class="box"></span>' +
        "<span>Sólo disponibles</span></label></div></div>";
  }

  function pasa(p) {
    if (state.cats.length && state.cats.indexOf(p.categoria) < 0) return false;
    if (state.materiales.length && state.materiales.indexOf(p._material) < 0) return false;
    if (state.medidas.length && !p._medidas.some(function (m) { return state.medidas.indexOf(m) >= 0; })) return false;
    if (p._min > state.precioMax) return false;
    if (state.soloStock && !p._hayStock) return false;
    if (state.q && p._busca.indexOf(norm(state.q)) < 0) return false;
    return true;
  }

  function ordenar(lista) {
    var l = lista.slice();
    if (state.orden === "precio-asc") l.sort(function (a, b) { return a._min - b._min; });
    else if (state.orden === "precio-desc") l.sort(function (a, b) { return b._min - a._min; });
    else if (state.orden === "nombre") l.sort(function (a, b) { return a.nombre.localeCompare(b.nombre, "es"); });
    else l.sort(function (a, b) { return (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0); });
    return l;
  }

  function aplicar(animar) {
    var grid = $("[data-grid]"); if (!grid) return;
    var visibles = ordenar(PRODUCTOS.filter(pasa));
    var ids = visibles.map(function (p) { return p.id; });

    // Reordeno y muestro/oculto sin volver a construir el HTML
    visibles.forEach(function (p) {
      var el = grid.querySelector('[data-card="' + p.id + '"]');
      if (el) grid.appendChild(el);
    });
    $$("[data-card]", grid).forEach(function (el) {
      el.classList.toggle("is-hidden", ids.indexOf(el.getAttribute("data-card")) < 0);
    });

    var count = $("[data-count]");
    if (count) {
      count.textContent = visibles.length === 0 ? "Sin resultados"
        : visibles.length + (visibles.length === 1 ? " producto" : " productos");
    }
    var vacio = $("[data-vacio]");
    if (vacio) vacio.hidden = visibles.length > 0;

    renderChips();
    updateFilterCount();
    syncCatTiles();

    if (animar && window.anime && visibles.length) {
      var cards = $$('[data-card]:not(.is-hidden)', grid).slice(0, 24);
      window.anime.remove(cards);
      window.anime({
        targets: cards, opacity: [0, 1], translateY: [14, 0],
        delay: window.anime.stagger(26), duration: 480, easing: "easeOutExpo"
      });
    }
  }

  function renderChips() {
    var box = $("[data-chips]"); if (!box) return;
    var chips = [];
    state.cats.forEach(function (id) {
      var c = CATEGORIAS.filter(function (x) { return x.id === id; })[0];
      if (c) chips.push({ k: "cats", v: id, t: c.nombre });
    });
    state.medidas.forEach(function (m) { chips.push({ k: "medidas", v: m, t: m }); });
    state.materiales.forEach(function (m) { chips.push({ k: "materiales", v: m, t: m }); });
    if (state.precioMax < PRECIO_MAX) chips.push({ k: "precio", v: "", t: "Hasta " + money(state.precioMax) });
    if (state.soloStock) chips.push({ k: "stock", v: "1", t: "Sólo disponibles" });
    if (state.q) chips.push({ k: "q", v: "", t: '"' + state.q + '"' });

    box.innerHTML = chips.map(function (c) {
      return '<button class="chip" type="button" data-chip-k="' + c.k + '" data-chip-v="' + esc(c.v) + '">' +
             esc(c.t) + "<span>&times;</span></button>";
    }).join("");
  }

  function updateFilterCount() {
    var n = state.cats.length + state.medidas.length + state.materiales.length +
            (state.soloStock ? 1 : 0) + (state.precioMax < PRECIO_MAX ? 1 : 0);
    var pill = $("[data-filter-count]");
    if (pill) { pill.textContent = n; pill.hidden = n === 0; }
  }

  function syncCatTiles() {
    $$("[data-cat-tile]").forEach(function (t) {
      t.classList.toggle("is-active", state.cats.indexOf(t.getAttribute("data-cat-tile")) >= 0);
    });
  }

  function limpiarFiltros() {
    state.cats = []; state.medidas = []; state.materiales = [];
    state.precioMax = PRECIO_MAX; state.soloStock = false; state.q = "";
    var s = $("[data-search]"); if (s) s.value = "";
    var sc = $("[data-search-clear]"); if (sc) sc.hidden = true;
    mountFiltros(); aplicar(true);
  }

  function setCategoria(id) {
    state.cats = state.cats.length === 1 && state.cats[0] === id ? [] : [id];
    mountFiltros(); aplicar(true);
    var cat = $("#catalogo");
    if (cat) {
      var top = cat.getBoundingClientRect().top + window.scrollY - 8;
      window.scrollTo({ top: top, behavior: "smooth" });
    }
  }

  /* ===================================================  FICHA DE PRODUCTO */
  var pdState = { pid: null, medida: null, estampado: null, qty: 1 };

  // Qué foto mostrar según lo elegido. Prioridad: medida con foto propia >
  // color elegido > estampado > foto principal.
  function currentPdImage(p) {
    var v = variante(p, pdState.medida) || p.variantes[0];
    var fc = p.fotosColor || {};
    var est = (p.estampados || []).filter(function (e) { return e.slug === pdState.estampado; })[0];
    if (v && v.foto) return v.foto;
    if (pdState.color && fc[pdState.color]) return fc[pdState.color];
    if (est) return est.img;
    return p.img;
  }

  // Cambia sólo la foto de arriba (sin redibujar toda la ficha), con un fundido.
  function updatePdImage() {
    var p = byId(pdState.pid); if (!p) return;
    var el = $("[data-pd-img]"); if (!el) return;
    var src = currentPdImage(p);
    if (el.getAttribute("src") === src) return;
    el.style.opacity = "0";
    var pre = new Image();
    pre.onload = pre.onerror = function () { el.src = src; el.style.opacity = "1"; };
    pre.src = src;
  }

  function productHTML(p) {
    var v = variante(p, pdState.medida) || p.variantes[0];
    var est = (p.estampados || []).filter(function (e) { return e.slug === pdState.estampado; })[0];
    var fotosColor = p.fotosColor || {};
    var img = currentPdImage(p);
    var agotado = v.stock === "agotado";

    var opciones = (p.variantes || []).map(function (x) {
      var dis = x.stock === "agotado";
      return '<button class="opt' + (x.medida === v.medida ? " is-active" : "") + '" type="button" ' +
        'data-pick-medida="' + esc(x.medida) + '"' + (dis ? " disabled" : "") + ">" +
        esc(x.medida) + "<small>" + esc(x.detalle) + " · " + money(x.precio) + "</small></button>";
    }).join("");

    var patterns = "";
    if (p.estampados && p.estampados.length) {
      patterns = '<div class="pd-block"><h4>' +
        (p.id === "manta-outlet" ? "Diseño" : "Estampado") +
        " · " + esc(est ? est.nombre : "elegí uno") + "</h4>" +
        '<div class="pattern-grid">' + p.estampados.map(function (e) {
          return '<button class="pattern' + (e.slug === pdState.estampado ? " is-active" : "") +
            '" type="button" data-pick-est="' + esc(e.slug) + '" aria-label="' + esc(e.nombre) + '">' +
            '<img src="' + esc(e.img) + '" alt="' + esc(e.nombre) + '" loading="lazy">' +
            "<span>" + esc(e.nombre) + "</span></button>";
        }).join("") + "</div></div>";
    }

    // Lista de colores = los del producto + cualquiera que tenga foto propia.
    var colorList = (p.colores || []).slice();
    Object.keys(fotosColor).forEach(function (c) { if (colorList.indexOf(c) < 0) colorList.push(c); });
    var hayFotosColor = Object.keys(fotosColor).length > 0;

    var colores = "";
    if (colorList.length) {
      if (hayFotosColor) {
        // Swatches clickeables: al tocar uno con foto, cambia la imagen de arriba.
        colores = '<div class="pd-block"><h4>Color' +
          (pdState.color ? " · " + esc(pdState.color) : " · tocá para ver") + "</h4>" +
          '<div class="swatches">' + colorList.map(function (c) {
            return '<button type="button" class="swatch' +
              (pdState.color === c ? " is-active" : "") + (fotosColor[c] ? " has-foto" : "") + '" ' +
              'data-pick-color="' + esc(c) + '" title="' + esc(c) + '" aria-label="' + esc(c) + '" ' +
              'style="--sw:' + (COLORES[c] || "#888") + '"></button>';
          }).join("") + "</div></div>";
      } else {
        colores = '<div class="pd-block"><h4>Colores disponibles</h4><div class="dots">' +
          colorList.map(function (c) {
            return '<i style="background:' + (COLORES[c] || "#888") + '" title="' + esc(c) + '"></i>';
          }).join("") + "</div>" +
          '<p class="card-spec" style="margin-top:.5rem">' + esc(colorList.join(" · ")) +
          ". Nos decís cuál querés al cerrar el pedido por WhatsApp.</p></div>";
      }
    }

    var stockClass = v.stock === "ultimas" ? " is-ultimas" : (agotado ? " is-agotado" : "");
    var stockText = v.stock === "ultimas" ? "Últimas unidades"
                  : (agotado ? "Sin stock por ahora" : "Disponible");

    return '<div class="pd">' +
      '<button class="icon-btn pd-close" type="button" data-close-product aria-label="Cerrar">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<div class="pd-media"><img src="' + esc(img) + '" alt="' + esc(p.nombre) + '" data-pd-img></div>' +
      '<div class="pd-body">' +
        '<div><p class="pd-cat">' + esc(p._cat) + '</p>' +
        '<h2 class="pd-name">' + esc(p.nombre) + "</h2></div>" +
        '<p class="pd-desc">' + esc(p.descripcion) + "</p>" +
        '<div class="pd-price"><strong data-pd-price>' + money(v.precio) + "</strong>" +
          '<small class="stock' + stockClass + '">' + stockText + "</small></div>" +
        (p.incluye ? '<p class="card-spec">Incluye: ' + esc(p.incluye) + "</p>" : "") +
        '<div class="pd-block"><h4>Medida</h4><div class="opts">' + opciones + "</div></div>" +
        patterns + colores +
        '<div class="pd-block"><h4>Ficha técnica</h4><div class="specs">' +
          (p.specs || []).map(function (s) { return '<span class="tag">' + esc(s) + "</span>"; }).join("") +
        "</div></div>" +
        '<div class="pd-actions">' +
          '<div class="qty">' +
            '<button type="button" data-qty="-1" aria-label="Quitar uno">&minus;</button>' +
            '<output data-qty-val aria-live="polite">' + pdState.qty + "</output>" +
            '<button type="button" data-qty="1" aria-label="Sumar uno">+</button>' +
          "</div>" +
          '<button class="btn btn-primary" type="button" data-add-cart' + (agotado ? " disabled" : "") + ">" +
            (agotado ? "Sin stock" : "Agregar al pedido") + "</button>" +
        "</div>" +
      "</div></div>";
  }

  function renderProduct() {
    var p = byId(pdState.pid); if (!p) return;
    var panel = $("[data-product-panel]");
    panel.innerHTML = productHTML(p);
    panel.scrollTop = 0;
  }

  function openProduct(pid) {
    var p = byId(pid); if (!p) return;
    var primera = (p.variantes || []).filter(function (v) { return v.stock !== "agotado"; })[0] || p.variantes[0];
    pdState = {
      pid: pid,
      medida: primera.medida,
      estampado: p.estampados && p.estampados.length ? p.estampados[0].slug : null,
      color: null,   // arranca en la foto principal; al tocar un color, cambia
      qty: 1
    };
    renderProduct();
    openDialog($("[data-product-dialog]"));
  }

  /* ==========================================================  DIÁLOGOS  */
  var lastFocus = null;

  function openDialog(dlg) {
    if (!dlg || dlg.open) return;
    lastFocus = document.activeElement;
    dlg.showModal();
    document.body.classList.add("is-locked");
    requestAnimationFrame(function () { dlg.classList.add("is-open"); });
  }

  function closeDialog(dlg) {
    if (!dlg || !dlg.open) return;
    dlg.classList.remove("is-open");
    setTimeout(function () {
      if (dlg.open) dlg.close();
      if (!$$("dialog[open]").length) document.body.classList.remove("is-locked");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }, 260);
  }

  /* ==========================================================  CARRITO UI */
  function renderCart() {
    var body = $("[data-cart-body]");
    var foot = $("[data-cart-foot]");
    var n = cartCount(), total = cartTotal();

    if (body) {
      if (!cart.length) {
        body.innerHTML = '<div class="cart-empty"><p>Tu pedido está vacío</p>' +
          "<p>Agregá productos del catálogo y los vemos acá.</p></div>";
      } else {
        body.innerHTML = cart.map(function (it) {
          var img, nombre, detalle;
          if (it.tipo === "combo") {
            var c = comboById(it.cid); if (!c) return "";
            img = c.img; nombre = c.nombre;
            detalle = "Set · " + c.items.reduce(function (n, x) { return n + x.cantidad; }, 0) + " productos";
          } else {
            var p = byId(it.pid); if (!p) return "";
            var v = variante(p, it.medida); if (!v) return "";
            var est = (p.estampados || []).filter(function (e) { return e.slug === it.estampado; })[0];
            img = est ? est.img : p.img;
            nombre = p.nombre;
            detalle = it.medida + (est ? " · " + est.nombre : "");
          }
          var k = cartKey(it);
          return '<div class="citem">' +
            '<div class="citem-media"><img src="' + esc(img) + '" alt="" loading="lazy"></div>' +
            "<div><p class=\"citem-name\">" + esc(nombre) + "</p>" +
            '<p class="citem-var">' + esc(detalle) + "</p>" +
            '<div class="citem-foot">' +
              '<div class="qty">' +
                '<button type="button" data-cq="' + esc(k) + '" data-d="-1" aria-label="Quitar uno">&minus;</button>' +
                "<output>" + it.qty + "</output>" +
                '<button type="button" data-cq="' + esc(k) + '" data-d="1" aria-label="Sumar uno">+</button>' +
              "</div>" +
              '<span class="citem-price">' + money(precioItem(it) * it.qty) + "</span>" +
            "</div>" +
            '<button class="citem-del" type="button" data-cdel="' + esc(k) + '">Quitar</button>' +
            "</div></div>";
        }).join("");
      }
    }

    if (foot) foot.hidden = !cart.length;
    var t = $("[data-cart-total]"); if (t) t.textContent = money(total);

    var badge = $("[data-cart-count]");
    if (badge) {
      badge.textContent = n;
      badge.hidden = n === 0;
      if (n > 0 && window.anime) {
        window.anime.remove(badge);
        window.anime({ targets: badge, scale: [1.5, 1], duration: 420, easing: "easeOutBack" });
      }
    }

  }

  function toast(msg) {
    var el = $("[data-toast]"); if (!el) return;
    el.hidden = false;
    el.textContent = msg;
    requestAnimationFrame(function () { el.classList.add("is-in"); });
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.classList.remove("is-in");
      setTimeout(function () { el.hidden = true; }, 320);
    }, 2400);
  }

  /* =========================================================  WHATSAPP   */
  function waLink(texto) {
    var tel = (DATA.contacto && DATA.contacto.whatsapp) || "";
    return "https://wa.me/" + tel + "?text=" + encodeURIComponent(texto);
  }

  function checkout() {
    if (!cart.length) return;
    var lineas = cart.map(function (it) {
      if (it.tipo === "combo") {
        var c = comboById(it.cid); if (!c) return "";
        var detalle = c.items.map(function (x) {
          var pp = byId(x.producto);
          return pp ? "   – " + pp.nombre + " · " + x.medida +
                      (x.cantidad > 1 ? " ×" + x.cantidad : "") : "";
        }).filter(Boolean).join("\n");
        return "• " + c.nombre + " ×" + it.qty + " — " + money(precioItem(it) * it.qty) +
               "\n" + detalle;
      }
      var p = byId(it.pid); if (!p) return "";
      var v = variante(p, it.medida); if (!v) return "";
      var est = (p.estampados || []).filter(function (e) { return e.slug === it.estampado; })[0];
      return "• " + p.nombre + " — " + it.medida +
             (est ? " · " + est.nombre : "") +
             " ×" + it.qty + " — " + money(v.precio * it.qty);
    }).filter(Boolean).join("\n");

    var texto = "¡Hola Sillorno! Quiero hacer este pedido:\n\n" + lineas +
      "\n\nTotal: " + money(cartTotal()) +
      "\n\n————————\nMi nombre: \nLocalidad / zona de envío: ";

    window.open(waLink(texto), "_blank", "noopener");
  }

  /* ============================================================  EVENTOS */
  function initHeader() {
    var header = $("[data-header]");
    var onScroll = function () {
      if (header) header.classList.toggle("is-stuck", window.scrollY > 12);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var burger = $("[data-open-nav]");
    var sheet = $("[data-navsheet]");
    if (burger && sheet) {
      burger.addEventListener("click", function () {
        var open = sheet.classList.toggle("is-open");
        sheet.hidden = false;
        burger.setAttribute("aria-expanded", open ? "true" : "false");
      });
      sheet.addEventListener("click", function (e) {
        if (e.target.closest("a")) {
          sheet.classList.remove("is-open");
          burger.setAttribute("aria-expanded", "false");
        }
      });
    }
  }

  function initFiltrosUI() {
    var panel = $("[data-filtros]");
    var backdrop = document.createElement("div");
    backdrop.className = "fbackdrop";
    backdrop.style.cssText = "position:fixed;inset:0;z-index:120;background:rgba(6,4,5,.7);" +
      "opacity:0;pointer-events:none;transition:opacity .35s var(--ease-out)";
    document.body.appendChild(backdrop);

    function abrir(open) {
      if (!panel) return;
      panel.classList.toggle("is-open", open);
      backdrop.style.opacity = open ? "1" : "0";
      backdrop.style.pointerEvents = open ? "auto" : "none";
      document.body.classList.toggle("is-locked", open);
      var btn = $("[data-open-filters]");
      if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
    }

    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-open-filters]")) abrir(true);
      if (e.target.closest("[data-close-filters]") || e.target.closest("[data-apply-filters]")) abrir(false);
    });
    backdrop.addEventListener("click", function () { abrir(false); });
    window.__cerrarFiltros = function () { abrir(false); };
  }

  function initCatalogo() {
    var buscar = $("[data-search]");
    var clear = $("[data-search-clear]");
    if (buscar) {
      var t;
      buscar.addEventListener("input", function () {
        state.q = buscar.value.trim();
        if (clear) clear.hidden = !state.q;
        clearTimeout(t);
        t = setTimeout(function () { aplicar(true); }, 180);
      });
    }
    if (clear) {
      clear.addEventListener("click", function () {
        buscar.value = ""; state.q = ""; clear.hidden = true; buscar.focus(); aplicar(true);
      });
    }

    var sort = $("[data-sort]");
    if (sort) sort.addEventListener("change", function () { state.orden = sort.value; aplicar(true); });

    // Cambios en los filtros (delegado: el HTML se regenera)
    document.addEventListener("change", function (e) {
      var input = e.target.closest("[data-f]");
      if (input) {
        var key = input.getAttribute("data-f");
        if (key === "stock") state.soloStock = input.checked;
        else {
          var arr = state[key];
          var v = input.value;
          var i = arr.indexOf(v);
          if (input.checked && i < 0) arr.push(v);
          if (!input.checked && i >= 0) arr.splice(i, 1);
        }
        aplicar(true);
        return;
      }
      var rango = e.target.closest("[data-precio]");
      if (rango) {
        state.precioMax = Number(rango.value);
        var out = $("[data-precio-val]");
        if (out) out.textContent = money(state.precioMax);
        aplicar(false);
      }
    });

    document.addEventListener("input", function (e) {
      var rango = e.target.closest("[data-precio]");
      if (!rango) return;
      state.precioMax = Number(rango.value);
      var out = $("[data-precio-val]");
      if (out) out.textContent = money(state.precioMax);
      aplicar(false);
    });
  }

  function initClicks() {
    document.addEventListener("click", function (e) {
      var el;

      // Categorías (tiles, header, footer)
      if ((el = e.target.closest("[data-cat-tile]"))) {
        setCategoria(el.getAttribute("data-cat-tile")); return;
      }
      if (e.target.closest("[data-cat-all]")) {
        limpiarFiltros();
        var cat0 = $("#catalogo");
        if (cat0) window.scrollTo({ top: cat0.getBoundingClientRect().top + window.scrollY - 8, behavior: "smooth" });
        return;
      }
      if ((el = e.target.closest("[data-cat-link]"))) {
        e.preventDefault(); setCategoria(el.getAttribute("data-cat-link")); return;
      }

      // Chips y limpieza
      if ((el = e.target.closest("[data-chip-k]"))) {
        var k = el.getAttribute("data-chip-k"), v = el.getAttribute("data-chip-v");
        if (k === "precio") state.precioMax = PRECIO_MAX;
        else if (k === "stock") state.soloStock = false;
        else if (k === "q") { state.q = ""; var s = $("[data-search]"); if (s) s.value = ""; var sc = $("[data-search-clear]"); if (sc) sc.hidden = true; }
        else { var i = state[k].indexOf(v); if (i >= 0) state[k].splice(i, 1); }
        mountFiltros(); aplicar(true); return;
      }
      if (e.target.closest("[data-clear-filters]")) { limpiarFiltros(); return; }

      // Ficha de producto
      if ((el = e.target.closest("[data-open-product]"))) {
        openProduct(el.getAttribute("data-open-product")); return;
      }
      if ((el = e.target.closest("[data-quick]"))) {
        var p = byId(el.getAttribute("data-quick"));
        if (!p) return;
        var unica = p.variantes.length === 1 && !(p.estampados && p.estampados.length);
        if (unica && p.variantes[0].stock !== "agotado") {
          cartAdd(p.id, p.variantes[0].medida, null, 1);
          toast(p.nombre + " agregado al pedido");
        } else {
          openProduct(p.id);
        }
        return;
      }
      if (e.target.closest("[data-close-product]")) { closeDialog($("[data-product-dialog]")); return; }

      if ((el = e.target.closest("[data-pick-medida]"))) {
        pdState.medida = el.getAttribute("data-pick-medida"); renderProduct(); return;
      }
      if ((el = e.target.closest("[data-pick-est]"))) {
        pdState.estampado = el.getAttribute("data-pick-est"); renderProduct(); return;
      }
      if ((el = e.target.closest("[data-pick-color]"))) {
        var pickC = el.getAttribute("data-pick-color");
        // Volver a tocar el color activo vuelve a la foto principal.
        pdState.color = (pdState.color === pickC) ? null : pickC;
        updatePdImage();
        $$("[data-pick-color]").forEach(function (b) {
          b.classList.toggle("is-active", b.getAttribute("data-pick-color") === pdState.color);
        });
        var blk = el.closest(".pd-block"); var h4 = blk && blk.querySelector("h4");
        if (h4) h4.textContent = "Color" + (pdState.color ? " · " + pickC : " · tocá para ver");
        return;
      }
      if ((el = e.target.closest("[data-qty]"))) {
        pdState.qty = Math.max(1, Math.min(99, pdState.qty + Number(el.getAttribute("data-qty"))));
        var out = $("[data-qty-val]"); if (out) out.textContent = pdState.qty;
        return;
      }
      if (e.target.closest("[data-add-cart]")) {
        var prod = byId(pdState.pid); if (!prod) return;
        cartAdd(pdState.pid, pdState.medida, pdState.estampado, pdState.qty);
        closeDialog($("[data-product-dialog]"));
        toast(prod.nombre + " agregado al pedido");
        return;
      }

      // Combos
      if ((el = e.target.closest("[data-add-combo]"))) {
        var combo = comboById(el.getAttribute("data-add-combo"));
        if (!combo) return;
        cartAddCombo(combo.id, 1);
        toast(combo.nombre + " agregado al pedido");
        return;
      }

      // Carrito
      if (e.target.closest("[data-open-cart]")) { openDialog($("[data-cart-dialog]")); return; }
      if (e.target.closest("[data-close-cart]")) { closeDialog($("[data-cart-dialog]")); return; }
      if ((el = e.target.closest("[data-cq]"))) {
        var key = el.getAttribute("data-cq"), d = Number(el.getAttribute("data-d"));
        var item = cart.filter(function (x) { return cartKey(x) === key; })[0];
        if (item) cartSet(key, item.qty + d);
        return;
      }
      if ((el = e.target.closest("[data-cdel]"))) { cartSet(el.getAttribute("data-cdel"), 0); return; }
      if (e.target.closest("[data-checkout]")) { checkout(); return; }

      // Buscador desde el header
      if (e.target.closest("[data-focus-search]")) {
        e.preventDefault();
        var input = $("[data-search]");
        var cat = $("#catalogo");
        if (cat) window.scrollTo({ top: cat.getBoundingClientRect().top + window.scrollY - 8, behavior: "smooth" });
        if (input) setTimeout(function () { input.focus(); }, 380);
        return;
      }

      // WhatsApp general
      if ((el = e.target.closest("[data-wa-general]"))) {
        e.preventDefault();
        window.open(waLink("¡Hola Sillorno! Quería consultarles por la blanquería."), "_blank", "noopener");
        return;
      }
    });

    // Cerrar diálogos con Escape o clic en el fondo
    $$("dialog").forEach(function (dlg) {
      dlg.addEventListener("cancel", function (e) { e.preventDefault(); closeDialog(dlg); });
      dlg.addEventListener("click", function (e) {
        if (e.target === dlg) closeDialog(dlg);
      });
    });
  }

  function initContacto() {
    var c = DATA.contacto || {};
    var vis = $("[data-wa-visible]"); if (vis) vis.textContent = c.whatsappVisible || "";
    var mail = $("[data-mail]");
    if (mail) { mail.textContent = c.email || ""; mail.href = "mailto:" + (c.email || ""); }
    var ig = $("[data-ig]"); if (ig) ig.href = c.instagramUrl || "#";
    var y = $("[data-year]"); if (y) y.textContent = new Date().getFullYear();
  }

  function initReveals() {
    var els = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -3% 0px" });
    els.forEach(function (el) { io.observe(el); });

    // Red de seguridad: a los 6s se muestra cualquier cosa que siga oculta
    setTimeout(function () {
      $$(".reveal:not(.is-in)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight * 1.5) el.classList.add("is-in");
      });
    }, 6000);
  }

  /* =============================================================  ARRANQUE */

  /* Relee el catálogo y ajusta el filtro de precio al techo nuevo. */
  function recargarDatos() {
    var topeAnterior = PRECIO_MAX;
    preparar();
    if (state.precioMax >= topeAnterior || state.precioMax > PRECIO_MAX) {
      state.precioMax = PRECIO_MAX;
    }
  }

  /* Vuelve a dibujar el catálogo cuando la base trae cambios (lo llama
     lib/data.js). Los clics y los filtros están delegados en document,
     así que regenerar el HTML no rompe nada. */
  function remontar() {
    safe(recargarDatos, "recargarDatos");
    var grid = $("[data-grid]"); if (grid) grid.innerHTML = "";
    safe(mountCats, "mountCats");
    safe(mountGrid, "mountGrid");
    safe(mountCombos, "mountCombos");
    safe(mountFiltros, "mountFiltros");
    safe(function () { aplicar(false); }, "aplicar");
    safe(initReveals, "initReveals");
  }

  function boot() {
    safe(recargarDatos, "recargarDatos");
    safe(cartLoad, "cartLoad");
    safe(mountCats, "mountCats");
    safe(mountInfo, "mountInfo");
    safe(mountGrid, "mountGrid");
    safe(mountCombos, "mountCombos");
    safe(mountFiltros, "mountFiltros");

    safe(initHeader, "initHeader");
    safe(initFiltrosUI, "initFiltrosUI");
    safe(initCatalogo, "initCatalogo");
    safe(initClicks, "initClicks");
    safe(initContacto, "initContacto");

    safe(function () { aplicar(false); }, "aplicar");
    safe(renderCart, "renderCart");
    safe(initReveals, "initReveals");

    window.__SILLORNO_REMOUNT__ = remontar;
    document.documentElement.classList.add("is-ready");
  }

  /* Si hay base de datos, esperamos a que conteste (lib/data.js le pone un
     techo de 5 segundos y nunca falla: si no hay red, sigue con manifest.js). */
  function arrancar() {
    var listo = window.__SILLORNO_READY__;
    if (listo && typeof listo.then === "function") listo.then(boot, boot);
    else boot();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar);
  else arrancar();
})();
