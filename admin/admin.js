/* =============================================================================
   SILLORNO — panel de administración
   -----------------------------------------------------------------------------
   Todo lo que se edita acá va a la base de datos y aparece en la web sola,
   sin volver a publicar nada.

   El stock NO se edita: no se compra desde la web, así que todas las medidas
   quedan como "disponible".
   ========================================================================== */

(function () {
  "use strict";

  var CFG    = window.__SUPABASE__ || {};
  var BUCKET = "catalogo";
  var MAX_PX = 1400;                 // lado más largo de las fotos que se suben

  /* ============================================================= HELPERS == */
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Igual que en la web: sin ",00" cuando el precio es redondo.
  var fmtARS = new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  var fmtARS0 = new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
  function money(n) {
    var v = Number(n) || 0;
    return (v % 1 === 0 ? fmtARS0 : fmtARS).format(v);
  }

  function slug(s) {
    return String(s || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  var toastT;
  function toast(msg, esError) {
    var el = $("[data-toast]");
    el.textContent = msg;
    el.classList.toggle("is-err", !!esError);
    el.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.hidden = true; }, esError ? 6000 : 2800);
  }

  // Los errores de Supabase vienen con .message; los de red, no.
  function detalle(err) {
    if (!err) return "Error desconocido.";
    if (err.message) return err.message;
    return String(err);
  }

  function mostrar(sel, on) { var el = $(sel); if (el) el.hidden = !on; }

  /* Las fotos viejas están guardadas como "assets/img/x.webp", relativas a la
     raíz del sitio. El panel vive en /admin/, así que para VERLAS hay que subir
     un nivel. Ojo: esto es sólo para mostrar; lo que se guarda en la base sigue
     siendo la ruta original. */
  function verFoto(url) {
    var u = String(url || "").trim();
    if (!u) return "";
    return /^(https?:|data:|\/\/|\/)/i.test(u) ? u : "../" + u;
  }

  /* ================================================== ¿ESTÁ CONFIGURADO? == */
  var configOK = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(String(CFG.url || "").trim()) &&
                 String(CFG.anonKey || "").trim().length > 30;

  if (!configOK || !window.supabase) {
    mostrar("[data-cargando]", false);
    mostrar("[data-sin-config]", true);
    return;
  }

  var SB = window.supabase.createClient(String(CFG.url).trim().replace(/\/+$/, ""), String(CFG.anonKey).trim());

  /* ================================================================ DATOS = */
  var CATS = [];      // categorias
  var PRODS = [];     // productos con .variantes y .estampados
  var SETS = [];      // combos con .combo_items
  var PALETA = (window.__SILLORNO__ || {}).colores || {};

  function porOrden(a, b) {
    var d = (a.orden || 0) - (b.orden || 0);
    return d !== 0 ? d : String(a.nombre || a.medida || "").localeCompare(String(b.nombre || b.medida || ""), "es");
  }

  function cargarTodo() {
    return Promise.all([
      SB.from("categorias").select("*"),
      SB.from("productos").select("*, variantes(*), estampados(*)"),
      SB.from("combos").select("*, combo_items(*)"),
    ]).then(function (res) {
      res.forEach(function (r) { if (r.error) throw r.error; });
      CATS  = (res[0].data || []).sort(porOrden);
      PRODS = (res[1].data || []).sort(porOrden);
      SETS  = (res[2].data || []).sort(porOrden);
      PRODS.forEach(function (p) {
        p.variantes  = (p.variantes  || []).sort(porOrden);
        p.estampados = (p.estampados || []).sort(porOrden);
      });
      SETS.forEach(function (s) {
        s.combo_items = (s.combo_items || []).sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); });
      });
    });
  }

  function catNombre(id) {
    var c = CATS.filter(function (c) { return c.id === id; })[0];
    return c ? c.nombre : "Sin categoría";
  }
  function prodPorId(id) { return PRODS.filter(function (p) { return p.id === id; })[0]; }

  // Genera un id único a partir del nombre ("Toallón Ícone" -> "toallon-icone")
  function idLibre(nombre, usados) {
    var base = slug(nombre) || "item";
    var id = base, n = 2;
    while (usados.indexOf(id) >= 0) { id = base + "-" + n; n++; }
    return id;
  }

  /* ================================================================ FOTOS = */
  // Achica y convierte a WebP antes de subir: una foto de celular de 4 MB
  // termina pesando unos 100 KB y la web sigue cargando rápido.
  function achicar(file) {
    return new Promise(function (res, rej) {
      if (!/^image\//.test(file.type)) return rej(new Error("El archivo no es una imagen."));
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var k  = Math.min(1, MAX_PX / Math.max(img.width, img.height));
        var cv = document.createElement("canvas");
        cv.width  = Math.max(1, Math.round(img.width  * k));
        cv.height = Math.max(1, Math.round(img.height * k));
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob(function (b) {
          b ? res(b) : rej(new Error("No se pudo procesar la imagen."));
        }, "image/webp", 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("No se pudo leer la imagen.")); };
      img.src = url;
    });
  }

  function subirFoto(file, carpeta) {
    return achicar(file).then(function (blob) {
      var nombre = carpeta + "/" + Date.now().toString(36) +
                   Math.random().toString(36).slice(2, 7) + ".webp";
      return SB.storage.from(BUCKET).upload(nombre, blob, {
        contentType: "image/webp", cacheControl: "2592000",
      }).then(function (r) {
        if (r.error) throw r.error;
        return SB.storage.from(BUCKET).getPublicUrl(nombre).data.publicUrl;
      });
    });
  }

  // Bloque reutilizable: miniatura + botón "Cambiar foto"
  function fotoHTML(url, campo, mini) {
    return '<div class="foto' + (mini ? " foto-mini" : "") + '" data-foto="' + esc(campo) + '">' +
      '<img src="' + esc(verFoto(url)) + '" alt="" data-foto-prev' +
        (url ? "" : ' style="visibility:hidden"') + '>' +
      '<div class="foto-acc">' +
        '<button type="button" class="btn btn-sm" data-foto-btn>' +
          (url ? "Cambiar foto" : "Subir foto") + "</button>" +
        '<span class="foto-nota" data-foto-nota>' +
          (url ? "" : "JPG, PNG o WebP") + "</span>" +
      "</div>" +
      '<input type="file" accept="image/*" data-foto-file>' +
      '<input type="hidden" data-campo="' + esc(campo) + '" value="' + esc(url || "") + '">' +
    "</div>";
  }

  // Un solo listener para todas las fotos del editor
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-foto-btn]");
    if (!btn) return;
    $("[data-foto-file]", btn.closest("[data-foto]")).click();
  });

  document.addEventListener("change", function (e) {
    var input = e.target.closest("[data-foto-file]");
    if (!input || !input.files || !input.files[0]) return;
    var caja = input.closest("[data-foto]");
    var nota = $("[data-foto-nota]", caja);
    nota.textContent = "Subiendo…";
    subirFoto(input.files[0], "catalogo").then(function (url) {
      $("[data-campo]", caja).value = url;
      var img = $("[data-foto-prev]", caja);
      img.src = url;
      img.style.visibility = "visible";
      nota.textContent = "Listo";
    }).catch(function (err) {
      nota.textContent = "";
      toast("No se pudo subir la foto: " + detalle(err), true);
    });
    input.value = "";
  });

  /* =============================================================== EDITOR = */
  var dlg = $("[data-editor]");
  var alGuardar = null;

  $("[data-editor-form]").addEventListener("submit", function (e) { e.preventDefault(); });
  $$("[data-editor-cerrar]").forEach(function (b) {
    b.addEventListener("click", function () { dlg.close(); });
  });

  function abrirEditor(titulo, cuerpo, onGuardar) {
    $("[data-editor-titulo]").textContent = titulo;
    $("[data-editor-body]").innerHTML = cuerpo;
    $("[data-editor-error]").hidden = true;
    alGuardar = onGuardar;
    dlg.showModal();
  }

  function errorEditor(msg) {
    var el = $("[data-editor-error]");
    if (!msg) { el.hidden = true; return; }
    el.textContent = msg;
    el.hidden = false;
  }

  $("[data-editor-guardar]").addEventListener("click", function () {
    if (!alGuardar) return;
    var btn = this;
    btn.disabled = true;
    btn.textContent = "Guardando…";
    errorEditor("");
    Promise.resolve()
      .then(alGuardar)
      .then(function () {
        dlg.close();
        return cargarTodo();
      })
      .then(function () {
        montar();
        toast("Guardado");
      })
      .catch(function (err) { errorEditor(detalle(err)); })
      .then(function () { btn.disabled = false; btn.textContent = "Guardar"; });
  });

  // Lee un campo del editor por su data-campo
  function val(campo) {
    var el = $('[data-campo="' + campo + '"]', $("[data-editor-body]"));
    if (!el) return "";
    if (el.type === "checkbox") return el.checked;
    return el.value;
  }
  function num(campo) { var n = Number(val(campo)); return isNaN(n) ? 0 : n; }
  function txt(campo) { var v = String(val(campo) || "").trim(); return v || null; }

  /* --------------------------------------------------- filas repetibles -- */
  // Alta y baja de filas (medidas, estampados, items de un set)
  document.addEventListener("click", function (e) {
    var del = e.target.closest("[data-rep-del]");
    if (del) { del.closest(".rep-fila").remove(); return; }

    var add = e.target.closest("[data-rep-add]");
    if (!add) return;
    var lista = $('[data-rep="' + add.getAttribute("data-rep-add") + '"]');
    if (!lista) return;
    var tipo = add.getAttribute("data-rep-add");
    if (tipo === "variantes")  lista.insertAdjacentHTML("beforeend", filaVarianteHTML({}));
    if (tipo === "estampados") lista.insertAdjacentHTML("beforeend", filaEstampadoHTML({}));
    if (tipo === "items")      lista.insertAdjacentHTML("beforeend", filaItemHTML({}));
  });

  // Al cambiar el producto de un item de set, se recargan sus medidas
  document.addEventListener("change", function (e) {
    var sel = e.target.closest("[data-item-prod]");
    if (!sel) return;
    var fila = sel.closest(".rep-fila");
    $("[data-item-med]", fila).innerHTML = opcionesMedida(sel.value, "");
  });

  function filaVarianteHTML(v) {
    return '<div class="rep-fila" data-fila>' +
      '<input type="text" data-v-medida placeholder="85 × 150 cm" value="' + esc(v.medida || "") + '">' +
      '<input type="text" data-v-detalle placeholder="Toallón XL" value="' + esc(v.detalle || "") + '">' +
      '<input type="number" step="0.01" min="0" data-v-precio placeholder="0.00" value="' +
        esc(v.precio != null ? v.precio : "") + '">' +
      '<button type="button" class="rep-del" data-rep-del aria-label="Quitar">×</button>' +
    "</div>";
  }

  function filaEstampadoHTML(es) {
    return '<div class="rep-fila rep-3" data-fila>' +
      '<input type="text" data-e-nombre placeholder="Nombre del estampado" value="' + esc(es.nombre || "") + '">' +
      fotoHTML(es.img, "e-img", true) +
      '<button type="button" class="rep-del" data-rep-del aria-label="Quitar">×</button>' +
    "</div>";
  }

  function opcionesProducto(sel) {
    return PRODS.map(function (p) {
      return '<option value="' + esc(p.id) + '"' + (p.id === sel ? " selected" : "") + ">" +
             esc(p.nombre) + "</option>";
    }).join("");
  }

  function opcionesMedida(prodId, sel) {
    var p = prodPorId(prodId);
    if (!p) return '<option value="">—</option>';
    return (p.variantes || []).map(function (v) {
      return '<option value="' + esc(v.medida) + '"' + (v.medida === sel ? " selected" : "") + ">" +
             esc(v.medida) + "</option>";
    }).join("");
  }

  function filaItemHTML(it) {
    var pid = it.producto_id || (PRODS[0] && PRODS[0].id) || "";
    return '<div class="rep-fila rep-set" data-fila>' +
      '<select data-item-prod>' + opcionesProducto(pid) + "</select>" +
      '<select data-item-med>' + opcionesMedida(pid, it.medida || "") + "</select>" +
      '<input type="number" min="1" step="1" data-item-cant value="' + esc(it.cantidad || 1) + '">' +
      '<button type="button" class="rep-del" data-rep-del aria-label="Quitar">×</button>' +
    "</div>";
  }

  /* ============================================================== PRECIOS = */
  var sucios = {};   // { idVariante: precio }

  function vistaPrecios() {
    if (!PRODS.length) {
      $("[data-lista-precios]").innerHTML =
        '<p class="vacio">Todavía no hay productos en la base.<br><br>' +
        '<button type="button" class="btn btn-primary" data-importar>' +
        "Importar el catálogo actual de la web</button></p>";
      return;
    }
    var q = String($("[data-buscar-precios]").value || "").trim().toLowerCase();
    var lista = PRODS.filter(function (p) {
      if (!q) return true;
      return (p.nombre + " " + catNombre(p.categoria_id)).toLowerCase().indexOf(q) >= 0;
    });

    if (!lista.length) {
      $("[data-lista-precios]").innerHTML = '<p class="vacio">No hay productos que coincidan.</p>';
      return;
    }

    $("[data-lista-precios]").innerHTML = lista.map(function (p) {
      var filas = (p.variantes || []).map(function (v) {
        return '<div class="pfila">' +
          '<span class="pfila-med">' + esc(v.medida) + "</span>" +
          '<span class="pfila-det">' + esc(v.detalle || "") + "</span>" +
          '<input type="number" step="0.01" min="0" data-precio-id="' + v.id + '" ' +
            'value="' + esc(v.precio) + '" aria-label="Precio de ' + esc(v.medida) + '">' +
        "</div>";
      }).join("");
      if (!filas) filas = '<div class="pfila"><span class="pfila-det">Sin medidas cargadas.</span></div>';

      return '<div class="pgrupo">' +
        '<div class="pgrupo-top">' +
          '<img src="' + esc(verFoto(p.img)) + '" alt="" loading="lazy">' +
          "<div><div class=\"pgrupo-nom\">" + esc(p.nombre) + "</div>" +
          '<div class="pgrupo-cat">' + esc(catNombre(p.categoria_id)) + "</div></div>" +
        "</div>" + filas +
      "</div>";
    }).join("");
  }

  document.addEventListener("input", function (e) {
    var inp = e.target.closest("[data-precio-id]");
    if (!inp) return;
    var id = Number(inp.getAttribute("data-precio-id"));
    var v  = null;
    PRODS.forEach(function (p) {
      (p.variantes || []).forEach(function (x) { if (x.id === id) v = x; });
    });
    var nuevo = Number(inp.value);
    var cambio = v && !isNaN(nuevo) && nuevo !== Number(v.precio);
    inp.classList.toggle("is-dirty", !!cambio);
    if (cambio) sucios[id] = nuevo; else delete sucios[id];
    $("[data-guardar-precios]").disabled = !Object.keys(sucios).length;
  });

  $("[data-guardar-precios]").addEventListener("click", function () {
    var ids = Object.keys(sucios);
    if (!ids.length) return;
    var btn = this;
    btn.disabled = true;
    btn.textContent = "Guardando…";

    Promise.all(ids.map(function (id) {
      return SB.from("variantes").update({ precio: sucios[id] }).eq("id", Number(id))
        .then(function (r) { if (r.error) throw r.error; });
    })).then(function () {
      sucios = {};
      return cargarTodo();
    }).then(function () {
      montar();
      toast(ids.length === 1 ? "Precio actualizado" : ids.length + " precios actualizados");
    }).catch(function (err) {
      toast("No se pudo guardar: " + detalle(err), true);
    }).then(function () {
      btn.textContent = "Guardar cambios";
      btn.disabled = !Object.keys(sucios).length;
    });
  });

  $("[data-buscar-precios]").addEventListener("input", vistaPrecios);

  /* ============================================================ PRODUCTOS = */
  function vistaProductos() {
    var q = String($("[data-buscar-productos]").value || "").trim().toLowerCase();
    var lista = PRODS.filter(function (p) {
      if (!q) return true;
      return (p.nombre + " " + catNombre(p.categoria_id)).toLowerCase().indexOf(q) >= 0;
    });

    if (!PRODS.length) {
      $("[data-lista-productos]").innerHTML =
        '<p class="vacio">Todavía no hay productos en la base.<br><br>' +
        '<button type="button" class="btn btn-primary" data-importar>' +
        "Importar el catálogo actual de la web</button></p>";
      return;
    }
    if (!lista.length) {
      $("[data-lista-productos]").innerHTML = '<p class="vacio">No hay productos que coincidan.</p>';
      return;
    }

    $("[data-lista-productos]").innerHTML = '<div class="tarjetas">' + lista.map(function (p) {
      var precios = (p.variantes || []).map(function (v) { return Number(v.precio) || 0; });
      var rango = !precios.length ? "Sin medidas"
        : (Math.min.apply(null, precios) === Math.max.apply(null, precios)
            ? money(precios[0])
            : money(Math.min.apply(null, precios)) + " – " + money(Math.max.apply(null, precios)));

      return '<article class="tarjeta">' +
        '<img src="' + esc(verFoto(p.img)) + '" alt="" loading="lazy">' +
        '<div class="tarjeta-txt">' +
          '<div class="tarjeta-nom">' + esc(p.nombre) +
            (p.destacado ? '<span class="pill pill-oro">Destacado</span>' : "") +
            (p.activo ? "" : '<span class="pill pill-off">Oculto</span>') +
          "</div>" +
          '<div class="tarjeta-meta">' + esc(catNombre(p.categoria_id)) + " · " + rango +
            " · " + (p.variantes || []).length + " medida" +
            ((p.variantes || []).length === 1 ? "" : "s") +
          "</div>" +
        "</div>" +
        '<div class="tarjeta-acc">' +
          '<button type="button" class="btn btn-sm" data-editar-producto="' + esc(p.id) + '">Editar</button>' +
          '<button type="button" class="btn btn-sm btn-danger" data-borrar-producto="' + esc(p.id) + '">Borrar</button>' +
        "</div>" +
      "</article>";
    }).join("") + "</div>";
  }

  $("[data-buscar-productos]").addEventListener("input", vistaProductos);

  function editorProducto(p) {
    var nuevo = !p;
    p = p || { specs: [], colores: [], variantes: [], estampados: [], activo: true };

    var paleta = Object.keys(PALETA);
    (p.colores || []).forEach(function (c) { if (paleta.indexOf(c) < 0) paleta.push(c); });

    var cuerpo =
      '<div class="campos">' +
        '<label class="ancho">Nombre' +
          '<input type="text" data-campo="nombre" value="' + esc(p.nombre || "") + '" required></label>' +

        "<label>Categoría<select data-campo=\"categoria\">" +
          CATS.map(function (c) {
            return '<option value="' + esc(c.id) + '"' +
                   (c.id === p.categoria_id ? " selected" : "") + ">" + esc(c.nombre) + "</option>";
          }).join("") + "</select></label>" +

        '<label>Orden en el catálogo' +
          '<input type="number" step="1" data-campo="orden" value="' + esc(p.orden || 0) + '"></label>' +

        '<label>Material' +
          '<input type="text" data-campo="material" placeholder="100% algodón" value="' +
          esc(p.material || "") + '"></label>' +

        '<label>Gramaje' +
          '<input type="text" data-campo="gramaje" placeholder="500 g/m²" value="' +
          esc(p.gramaje || "") + '"></label>' +

        '<label class="ancho">Descripción' +
          '<textarea data-campo="descripcion">' + esc(p.descripcion || "") + "</textarea></label>" +

        '<label class="ancho">Características <span class="hint">(una por línea)</span>' +
          '<textarea data-campo="specs" placeholder="100% algodón&#10;Hilo peinado&#10;500 g/m²">' +
          esc((p.specs || []).join("\n")) + "</textarea></label>" +

        '<div class="ancho">' +
          '<label class="check"><input type="checkbox" data-campo="destacado"' +
            (p.destacado ? " checked" : "") + "> Mostrarlo primero (destacado)</label>" +
          '<label class="check"><input type="checkbox" data-campo="activo"' +
            (p.activo !== false ? " checked" : "") + "> Visible en la web</label>" +
        "</div>" +
      "</div>" +

      "<fieldset><legend>Foto principal</legend>" + fotoHTML(p.img, "img") + "</fieldset>" +

      "<fieldset><legend>Colores</legend><div class=\"colores\">" +
        paleta.map(function (c) {
          var on = (p.colores || []).indexOf(c) >= 0;
          return '<label class="color-chip' + (on ? " is-on" : "") + '">' +
            '<input type="checkbox" data-color value="' + esc(c) + '"' + (on ? " checked" : "") + ">" +
            '<span class="punto" style="background:' + esc(PALETA[c] || "#777") + '"></span>' +
            esc(c) + "</label>";
        }).join("") +
      "</div></fieldset>" +

      "<fieldset><legend>Medidas y precios</legend>" +
        '<div class="rep" data-rep="variantes">' +
          (p.variantes || []).map(filaVarianteHTML).join("") +
        "</div>" +
        '<button type="button" class="btn btn-sm" data-rep-add="variantes">+ Agregar medida</button>' +
        '<p class="hint">El precio se escribe sin puntos de miles: 24402.84</p>' +
      "</fieldset>" +

      "<fieldset><legend>Estampados <span class=\"hint\">(opcional)</span></legend>" +
        '<div class="rep" data-rep="estampados">' +
          (p.estampados || []).map(filaEstampadoHTML).join("") +
        "</div>" +
        '<button type="button" class="btn btn-sm" data-rep-add="estampados">+ Agregar estampado</button>' +
      "</fieldset>";

    abrirEditor(nuevo ? "Nuevo producto" : p.nombre, cuerpo, function () {
      var body = $("[data-editor-body]");
      var nombre = String(val("nombre") || "").trim();
      if (!nombre) throw new Error("Poné un nombre para el producto.");

      var variantes = $$('[data-rep="variantes"] .rep-fila', body).map(function (f, i) {
        return {
          medida:  String($("[data-v-medida]", f).value || "").trim(),
          detalle: String($("[data-v-detalle]", f).value || "").trim() || null,
          precio:  Number($("[data-v-precio]", f).value) || 0,
          orden:   i,
        };
      }).filter(function (v) { return v.medida; });

      if (!variantes.length) throw new Error("Cargá al menos una medida con su precio.");

      var repes = variantes.map(function (v) { return v.medida; })
        .filter(function (m, i, a) { return a.indexOf(m) !== i; });
      if (repes.length) throw new Error("La medida «" + repes[0] + "» está cargada dos veces.");

      var estampados = $$('[data-rep="estampados"] .rep-fila', body).map(function (f, i) {
        var nom = String($("[data-e-nombre]", f).value || "").trim();
        return {
          nombre: nom,
          slug:   slug(nom),
          img:    String($('[data-campo="e-img"]', f).value || "") || null,
          orden:  i,
        };
      }).filter(function (e) { return e.nombre && e.slug; });

      var vistos = [];
      estampados = estampados.filter(function (e) {
        if (vistos.indexOf(e.slug) >= 0) return false;
        vistos.push(e.slug);
        return true;
      });

      var colores = $$("[data-color]", body).filter(function (c) { return c.checked; })
        .map(function (c) { return c.value; });

      var id = nuevo
        ? idLibre(nombre, PRODS.map(function (x) { return x.id; }))
        : p.id;

      var fila = {
        id: id,
        nombre: nombre,
        categoria_id: val("categoria") || null,
        img: txt("img"),
        material: txt("material"),
        gramaje: txt("gramaje"),
        destacado: !!val("destacado"),
        activo: !!val("activo"),
        descripcion: txt("descripcion"),
        specs: String(val("specs") || "").split("\n")
          .map(function (s) { return s.trim(); }).filter(Boolean),
        colores: colores,
        orden: num("orden"),
        actualizado: new Date().toISOString(),
      };

      // Producto -> medidas -> estampados. Las dos últimas se reemplazan enteras.
      return SB.from("productos").upsert(fila).then(function (r) {
        if (r.error) throw r.error;
        return SB.from("variantes").delete().eq("producto_id", id);
      }).then(function (r) {
        if (r.error) throw r.error;
        return SB.from("variantes").insert(variantes.map(function (v) {
          v.producto_id = id;
          v.stock = "disponible";     // no se compra desde la web
          return v;
        }));
      }).then(function (r) {
        if (r.error) throw r.error;
        return SB.from("estampados").delete().eq("producto_id", id);
      }).then(function (r) {
        if (r.error) throw r.error;
        if (!estampados.length) return { error: null };
        return SB.from("estampados").insert(estampados.map(function (e) {
          e.producto_id = id;
          return e;
        }));
      }).then(function (r) {
        if (r.error) throw r.error;
      });
    });
  }

  function borrarProducto(id) {
    var p = prodPorId(id);
    if (!p) return;

    var enSets = SETS.filter(function (s) {
      return (s.combo_items || []).some(function (i) { return i.producto_id === id; });
    });

    var msg = "¿Borrar «" + p.nombre + "» del catálogo?";
    if (enSets.length) {
      msg += "\n\nOJO: está usado en " + enSets.length + " set (" +
             enSets.map(function (s) { return s.nombre; }).join(", ") +
             "). Se va a sacar también de ahí.";
    }
    msg += "\n\nSi sólo querés esconderlo un tiempo, mejor editalo y destildá «Visible en la web».";
    if (!confirm(msg)) return;

    SB.from("productos").delete().eq("id", id).then(function (r) {
      if (r.error) throw r.error;
      return cargarTodo();
    }).then(function () {
      montar();
      toast("Producto borrado");
    }).catch(function (err) { toast("No se pudo borrar: " + detalle(err), true); });
  }

  /* =========================================================== CATEGORÍAS = */
  function vistaCategorias() {
    if (!CATS.length) {
      $("[data-lista-categorias]").innerHTML = '<p class="vacio">Todavía no hay categorías.</p>';
      return;
    }
    $("[data-lista-categorias]").innerHTML = '<div class="tarjetas">' + CATS.map(function (c) {
      var n = PRODS.filter(function (p) { return p.categoria_id === c.id; }).length;
      return '<article class="tarjeta">' +
        '<img src="' + esc(verFoto(c.img)) + '" alt="" loading="lazy">' +
        '<div class="tarjeta-txt">' +
          '<div class="tarjeta-nom">' + esc(c.nombre) +
            (c.activo ? "" : '<span class="pill pill-off">Oculta</span>') + "</div>" +
          '<div class="tarjeta-meta">' + esc(c.corto || "") +
            (c.sub ? " · " + esc(c.sub) : "") + " · " + n +
            " producto" + (n === 1 ? "" : "s") + "</div>" +
        "</div>" +
        '<div class="tarjeta-acc">' +
          '<button type="button" class="btn btn-sm" data-editar-categoria="' + esc(c.id) + '">Editar</button>' +
          '<button type="button" class="btn btn-sm btn-danger" data-borrar-categoria="' + esc(c.id) + '">Borrar</button>' +
        "</div>" +
      "</article>";
    }).join("") + "</div>";
  }

  function editorCategoria(c) {
    var nuevo = !c;
    c = c || { activo: true };

    var cuerpo =
      '<div class="campos">' +
        '<label class="ancho">Nombre completo <span class="hint">(el que se usa en los filtros)</span>' +
          '<input type="text" data-campo="nombre" placeholder="Toallas y toallones" value="' +
          esc(c.nombre || "") + '"></label>' +
        '<label>Nombre corto <span class="hint">(el del banner)</span>' +
          '<input type="text" data-campo="corto" placeholder="Toallas" value="' + esc(c.corto || "") + '"></label>' +
        '<label>Bajada' +
          '<input type="text" data-campo="sub" placeholder="Para después de la ducha" value="' +
          esc(c.sub || "") + '"></label>' +
        '<label>Orden' +
          '<input type="number" step="1" data-campo="orden" value="' + esc(c.orden || 0) + '"></label>' +
        '<div>' +
          '<label class="check"><input type="checkbox" data-campo="activo"' +
            (c.activo !== false ? " checked" : "") + "> Visible en la web</label>" +
        "</div>" +
      "</div>" +
      "<fieldset><legend>Foto del banner</legend>" + fotoHTML(c.img, "img") + "</fieldset>";

    abrirEditor(nuevo ? "Nueva categoría" : c.nombre, cuerpo, function () {
      var nombre = String(val("nombre") || "").trim();
      if (!nombre) throw new Error("Poné un nombre para la categoría.");
      var fila = {
        id: nuevo ? idLibre(nombre, CATS.map(function (x) { return x.id; })) : c.id,
        nombre: nombre,
        corto: txt("corto") || nombre,
        sub: txt("sub"),
        img: txt("img"),
        orden: num("orden"),
        activo: !!val("activo"),
      };
      return SB.from("categorias").upsert(fila).then(function (r) { if (r.error) throw r.error; });
    });
  }

  function borrarCategoria(id) {
    var c = CATS.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    var usados = PRODS.filter(function (p) { return p.categoria_id === id; });
    if (usados.length) {
      alert("No se puede borrar «" + c.nombre + "»: tiene " + usados.length +
            " producto(s) adentro.\n\nMovelos a otra categoría primero, o destildá " +
            "«Visible en la web» para esconderla sin borrar nada.");
      return;
    }
    if (!confirm("¿Borrar la categoría «" + c.nombre + "»?")) return;
    SB.from("categorias").delete().eq("id", id).then(function (r) {
      if (r.error) throw r.error;
      return cargarTodo();
    }).then(function () { montar(); toast("Categoría borrada"); })
      .catch(function (err) { toast("No se pudo borrar: " + detalle(err), true); });
  }

  /* ================================================================= SETS = */
  function precioSet(s) {
    var full = 0, completo = true;
    (s.combo_items || []).forEach(function (it) {
      var p = prodPorId(it.producto_id);
      var v = p && (p.variantes || []).filter(function (x) { return x.medida === it.medida; })[0];
      if (!v) { completo = false; return; }
      full += Number(v.precio) * it.cantidad;
    });
    return { full: full, final: full * (1 - Number(s.descuento || 0)), completo: completo };
  }

  function vistaSets() {
    if (!SETS.length) {
      $("[data-lista-sets]").innerHTML = '<p class="vacio">Todavía no hay sets armados.</p>';
      return;
    }
    $("[data-lista-sets]").innerHTML = '<div class="tarjetas">' + SETS.map(function (s) {
      var pr = precioSet(s);
      return '<article class="tarjeta">' +
        '<img src="' + esc(verFoto(s.img)) + '" alt="" loading="lazy">' +
        '<div class="tarjeta-txt">' +
          '<div class="tarjeta-nom">' + esc(s.nombre) +
            (s.activo ? "" : '<span class="pill pill-off">Oculto</span>') +
            (pr.completo ? "" : '<span class="pill pill-off">Falta un producto</span>') + "</div>" +
          '<div class="tarjeta-meta">' + (s.combo_items || []).length + " productos · " +
            money(pr.final) +
            (s.descuento > 0 ? " (" + Math.round(s.descuento * 100) + "% off)" : " (sin descuento)") +
          "</div>" +
        "</div>" +
        '<div class="tarjeta-acc">' +
          '<button type="button" class="btn btn-sm" data-editar-set="' + esc(s.id) + '">Editar</button>' +
          '<button type="button" class="btn btn-sm btn-danger" data-borrar-set="' + esc(s.id) + '">Borrar</button>' +
        "</div>" +
      "</article>";
    }).join("") + "</div>";
  }

  function editorSet(s) {
    var nuevo = !s;
    s = s || { activo: true, descuento: 0, combo_items: [] };

    if (!PRODS.length) {
      alert("Cargá productos antes de armar un set.");
      return;
    }

    var cuerpo =
      '<div class="campos">' +
        '<label class="ancho">Nombre' +
          '<input type="text" data-campo="nombre" placeholder="Set de baño" value="' +
          esc(s.nombre || "") + '"></label>' +
        '<label class="ancho">Descripción' +
          '<textarea data-campo="descripcion">' + esc(s.descripcion || "") + "</textarea></label>" +
        '<label>Descuento <span class="hint">(en %)</span>' +
          '<input type="number" min="0" max="90" step="1" data-campo="descuento" value="' +
          esc(Math.round((s.descuento || 0) * 100)) + '"></label>' +
        '<label>Orden' +
          '<input type="number" step="1" data-campo="orden" value="' + esc(s.orden || 0) + '"></label>' +
        '<div class="ancho">' +
          '<label class="check"><input type="checkbox" data-campo="activo"' +
            (s.activo !== false ? " checked" : "") + "> Visible en la web</label>" +
        "</div>" +
      "</div>" +
      "<fieldset><legend>Foto</legend>" + fotoHTML(s.img, "img") + "</fieldset>" +
      "<fieldset><legend>Qué trae <span class=\"hint\">(producto · medida · cantidad)</span></legend>" +
        '<div class="rep" data-rep="items">' +
          (s.combo_items || []).map(filaItemHTML).join("") +
        "</div>" +
        '<button type="button" class="btn btn-sm" data-rep-add="items">+ Agregar producto</button>' +
      "</fieldset>";

    abrirEditor(nuevo ? "Nuevo set" : s.nombre, cuerpo, function () {
      var body = $("[data-editor-body]");
      var nombre = String(val("nombre") || "").trim();
      if (!nombre) throw new Error("Poné un nombre para el set.");

      var items = $$('[data-rep="items"] .rep-fila', body).map(function (f, i) {
        return {
          producto_id: $("[data-item-prod]", f).value,
          medida:      $("[data-item-med]", f).value,
          cantidad:    Math.max(1, Number($("[data-item-cant]", f).value) || 1),
          orden:       i,
        };
      }).filter(function (it) { return it.producto_id && it.medida; });

      if (!items.length) throw new Error("El set tiene que traer al menos un producto.");

      var desc = Math.min(90, Math.max(0, num("descuento"))) / 100;
      var id = nuevo ? idLibre(nombre, SETS.map(function (x) { return x.id; })) : s.id;

      var fila = {
        id: id,
        nombre: nombre,
        descripcion: txt("descripcion"),
        img: txt("img"),
        descuento: desc,
        orden: num("orden"),
        activo: !!val("activo"),
      };

      return SB.from("combos").upsert(fila).then(function (r) {
        if (r.error) throw r.error;
        return SB.from("combo_items").delete().eq("combo_id", id);
      }).then(function (r) {
        if (r.error) throw r.error;
        return SB.from("combo_items").insert(items.map(function (it) {
          it.combo_id = id;
          return it;
        }));
      }).then(function (r) { if (r.error) throw r.error; });
    });
  }

  function borrarSet(id) {
    var s = SETS.filter(function (x) { return x.id === id; })[0];
    if (!s || !confirm("¿Borrar el set «" + s.nombre + "»?")) return;
    SB.from("combos").delete().eq("id", id).then(function (r) {
      if (r.error) throw r.error;
      return cargarTodo();
    }).then(function () { montar(); toast("Set borrado"); })
      .catch(function (err) { toast("No se pudo borrar: " + detalle(err), true); });
  }

  /* =========================================================== IMPORTACIÓN = */
  // Carga en la base el catálogo que hoy está en lib/manifest.js.
  // Sólo se ofrece cuando la base está vacía.
  function importarManifest() {
    var M = window.__SILLORNO__ || {};
    if (!M.productos || !M.productos.length) {
      toast("No encontré el catálogo de manifest.js", true);
      return;
    }
    if (!confirm("Voy a cargar en la base los " + M.productos.length +
                 " productos que hoy tiene la web. ¿Sigo?")) return;

    toast("Importando…");

    var cats = (M.categorias || []).map(function (c, i) {
      return { id: c.id, nombre: c.nombre, corto: c.corto, sub: c.sub, img: c.img, orden: i, activo: true };
    });

    var prods = M.productos.map(function (p, i) {
      return {
        id: p.id, nombre: p.nombre, categoria_id: p.categoria, img: p.img,
        material: p.material || null, gramaje: p.gramaje || null,
        destacado: !!p.destacado, descripcion: p.descripcion || null,
        specs: p.specs || [], colores: p.colores || [], orden: i, activo: true,
      };
    });

    var vars = [], ests = [];
    M.productos.forEach(function (p) {
      (p.variantes || []).forEach(function (v, i) {
        vars.push({
          producto_id: p.id, medida: v.medida, detalle: v.detalle || null,
          precio: v.precio, stock: v.stock || "disponible", orden: i,
        });
      });
      (p.estampados || []).forEach(function (e, i) {
        ests.push({ producto_id: p.id, slug: e.slug, nombre: e.nombre, img: e.img || null, orden: i });
      });
    });

    var combos = (M.combos || []).map(function (c, i) {
      return {
        id: c.id, nombre: c.nombre, descripcion: c.descripcion || null,
        img: c.img || null, descuento: c.descuento || 0, orden: i, activo: true,
      };
    });

    var items = [];
    (M.combos || []).forEach(function (c) {
      (c.items || []).forEach(function (it, i) {
        items.push({
          combo_id: c.id, producto_id: it.producto, medida: it.medida,
          cantidad: it.cantidad || 1, orden: i,
        });
      });
    });

    function paso(res) { if (res && res.error) throw res.error; }

    SB.from("categorias").upsert(cats).then(function (r) {
      paso(r);
      return SB.from("productos").upsert(prods);
    }).then(function (r) {
      paso(r);
      return SB.from("variantes").upsert(vars, { onConflict: "producto_id,medida" });
    }).then(function (r) {
      paso(r);
      return ests.length ? SB.from("estampados").upsert(ests, { onConflict: "producto_id,slug" }) : null;
    }).then(function (r) {
      paso(r);
      return combos.length ? SB.from("combos").upsert(combos) : null;
    }).then(function (r) {
      paso(r);
      return items.length ? SB.from("combo_items").insert(items) : null;
    }).then(function (r) {
      paso(r);
      return cargarTodo();
    }).then(function () {
      montar();
      toast("Catálogo importado");
    }).catch(function (err) {
      toast("No se pudo importar: " + detalle(err), true);
    });
  }

  /* ============================================================== PANTALLA = */
  var vistaActual = "precios";

  function montar() {
    vistaPrecios();
    vistaProductos();
    vistaCategorias();
    vistaSets();
    $("[data-guardar-precios]").disabled = !Object.keys(sucios).length;
  }

  $("[data-tabs]").addEventListener("click", function (e) {
    var b = e.target.closest("[data-tab]");
    if (!b) return;
    vistaActual = b.getAttribute("data-tab");
    $$("[data-tab]").forEach(function (t) { t.classList.toggle("is-on", t === b); });
    $$("[data-vista]").forEach(function (v) {
      v.hidden = v.getAttribute("data-vista") !== vistaActual;
    });
  });

  // Botones de las listas (delegado: el HTML se regenera todo el tiempo)
  document.addEventListener("click", function (e) {
    var el;
    if ((el = e.target.closest("[data-editar-producto]")))
      return editorProducto(prodPorId(el.getAttribute("data-editar-producto")));
    if ((el = e.target.closest("[data-borrar-producto]")))
      return borrarProducto(el.getAttribute("data-borrar-producto"));
    if ((el = e.target.closest("[data-editar-categoria]")))
      return editorCategoria(CATS.filter(function (c) { return c.id === el.getAttribute("data-editar-categoria"); })[0]);
    if ((el = e.target.closest("[data-borrar-categoria]")))
      return borrarCategoria(el.getAttribute("data-borrar-categoria"));
    if ((el = e.target.closest("[data-editar-set]")))
      return editorSet(SETS.filter(function (s) { return s.id === el.getAttribute("data-editar-set"); })[0]);
    if ((el = e.target.closest("[data-borrar-set]")))
      return borrarSet(el.getAttribute("data-borrar-set"));
    if (e.target.closest("[data-nuevo-producto]"))  return editorProducto(null);
    if (e.target.closest("[data-nueva-categoria]")) return editorCategoria(null);
    if (e.target.closest("[data-nuevo-set]"))       return editorSet(null);
    if (e.target.closest("[data-importar]"))        return importarManifest();
  });

  // Chips de color: marcar / desmarcar
  document.addEventListener("change", function (e) {
    var c = e.target.closest("[data-color]");
    if (c) c.closest(".color-chip").classList.toggle("is-on", c.checked);
  });

  /* ================================================================ LOGIN = */
  function pantalla(cual) {
    mostrar("[data-cargando]", cual === "cargando");
    mostrar("[data-login]",    cual === "login");
    mostrar("[data-app]",      cual === "app");
  }

  $("[data-login-form]").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = $("[data-login-btn]");
    var err = $("[data-login-error]");
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = "Entrando…";

    SB.auth.signInWithPassword({
      email: this.email.value.trim(),
      password: this.password.value,
    }).then(function (r) {
      if (r.error) throw r.error;
      return entrar();
    }).catch(function (e2) {
      err.textContent = /invalid login/i.test(detalle(e2))
        ? "Mail o contraseña incorrectos."
        : detalle(e2);
      err.hidden = false;
    }).then(function () {
      btn.disabled = false;
      btn.textContent = "Ingresar";
    });
  });

  $("[data-salir]").addEventListener("click", function () {
    SB.auth.signOut().then(function () { location.reload(); });
  });

  function entrar() {
    return SB.rpc("es_admin").then(function (r) {
      if (r.error) throw r.error;
      if (!r.data) {
        return SB.auth.signOut().then(function () {
          throw new Error("Ese usuario no tiene permiso de administrador. " +
                          "Hay que agregarlo a la tabla admins (ver db/schema.sql).");
        });
      }
      return cargarTodo();
    }).then(function () {
      montar();
      pantalla("app");
    });
  }

  /* ============================================================== ARRANQUE = */
  SB.auth.getSession().then(function (r) {
    if (r.data && r.data.session) {
      return entrar().catch(function (err) {
        pantalla("login");
        var el = $("[data-login-error]");
        el.textContent = detalle(err);
        el.hidden = false;
      });
    }
    pantalla("login");
  }).catch(function () { pantalla("login"); });
})();
