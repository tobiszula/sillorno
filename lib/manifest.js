/* =============================================================================
   SILLORNO — datos de la tienda
   -----------------------------------------------------------------------------
   ESTE ES EL ÚNICO ARCHIVO QUE HAY QUE TOCAR PARA ACTUALIZAR LA TIENDA.
   Acá viven los productos, los precios, las medidas y el stock.

   Cómo editar (todo en este archivo):
   · PRECIO      -> buscá el producto y cambiá el número en "precio".
                    Se escribe sin puntos ni comas: 24400
   · STOCK       -> en cada medida, "stock" acepta:
                      "disponible"  (verde, se puede comprar)
                      "ultimas"     (amarillo, "últimas unidades")
                      "agotado"     (gris, no se puede agregar al carrito)
   · SACAR ALGO  -> borrá el bloque completo del producto o de la medida.
   · DESTACADO   -> "destacado: true" lo muestra primero en el catálogo.

   Los precios son finales al público, en pesos argentinos.
   ========================================================================== */

(function () {
  "use strict";

  window.__SILLORNO__ = {

    /* --------------------------------------------------------------------
       Datos de la marca y contacto
       -------------------------------------------------------------------- */
    marca: {
      nombre: "Sillorno",
      claim: "Blanquería para la casa que habitás",
      descripcion:
        "Toallas, sábanas, almohadas y frazadas elegidas una por una. " +
        "Algodón de gramaje alto, terminaciones prolijas y una paleta que " +
        "envejece bien.",
    },

    contacto: {
      // Sin el signo +, sin espacios ni guiones: así lo necesita WhatsApp.
      whatsapp: "5492213589605",
      whatsappVisible: "+54 9 221 358-9605",
      email: "sillornob@gmail.com",
      instagram: "sillorno",
      instagramUrl: "https://instagram.com/sillorno",
      zona: "Envíos a todo el país",
    },

    /* --------------------------------------------------------------------
       Envíos y compra — texto que ve el cliente
       -------------------------------------------------------------------- */
    info: [
      {
        titulo: "Envíos a todo el país",
        texto: "Coordinamos el envío por WhatsApp según tu localidad. " +
               "En La Plata y alrededores, entrega en el día.",
      },
      {
        titulo: "El pedido se cierra por WhatsApp",
        texto: "Armás el carrito acá y te llevamos a WhatsApp con el " +
               "detalle listo. Ahí definimos envío y forma de pago.",
      },
      {
        titulo: "Precios finales",
        texto: "Lo que ves es lo que pagás. Sin sorpresas ni recargos " +
               "escondidos al momento de cerrar.",
      },
    ],

    /* --------------------------------------------------------------------
       Categorías — el orden de acá es el orden que se ve en la web
       -------------------------------------------------------------------- */
    // "corto" es el nombre que va en los cuadraditos de arriba (entra mejor
    // en pantalla chica); "nombre" es el que se usa en filtros y fichas.
    categorias: [
      { id: "toallas",     nombre: "Toallas y toallones", corto: "Toallas",     sub: "Para después de la ducha",      img: "assets/img/lifestyle-bano.webp" },
      { id: "sabanas",     nombre: "Juegos de sábanas",   corto: "Sábanas",     sub: "Para la cama de todos los días", img: "assets/img/lifestyle-cama.webp" },
      { id: "almohadas",   nombre: "Almohadas",           corto: "Almohadas",   sub: "Para dormir mejor",             img: "assets/img/almohada-neo.webp" },
      { id: "frazadas",    nombre: "Frazadas y mantas",   corto: "Frazadas",    sub: "Para las noches largas",        img: "assets/img/hero-invierno.webp" },
      { id: "repasadores", nombre: "Repasadores",         corto: "Repasadores", sub: "Para la mesa y la cocina",      img: "assets/img/lifestyle-mesa.webp" },
    ],

    /* --------------------------------------------------------------------
       Paleta de colores — para dibujar los puntitos de color en la ficha.
       Si agregás un color nuevo a un producto, sumalo también acá.
       -------------------------------------------------------------------- */
    colores: {
      "blanco": "#F4F1EA", "beige": "#D9CBB6", "rosa": "#E8C4C8",
      "rosa claro": "#F0D6D8", "rosa oscuro": "#C98A94", "vino": "#6E1F2E",
      "azul marino": "#26314B", "azul": "#5B7FA6", "azul claro": "#A9C6DA",
      "azul real": "#2F4A9E", "piscina": "#7FB6C4", "turquesa": "#6FBBB0",
      "verde": "#8A9E86", "verde oscuro": "#5A6E5C", "gris": "#9A9A9A",
      "gris claro": "#C4C4C4", "limestone": "#C9C2B6", "plomo": "#6E7276",
      "marrón": "#7A5B49", "concreto": "#A8A29A", "berenjena": "#4A2C40",
      "coral": "#E08B6F", "rojo": "#A83A32", "pink": "#E0709A",
    },

    /* ====================================================================
       PRODUCTOS
       ==================================================================== */
    productos: [

      /* ---------------------- TOALLAS Y TOALLONES ---------------------- */
      {
        id: "toallon-icone",
        nombre: "Toallón Ícone",
        categoria: "toallas",
        img: "assets/img/toallon-icone.webp",
        material: "100% algodón",
        gramaje: "500 g/m²",
        destacado: true,
        descripcion:
          "El más denso de la línea. Algodón peinado con tecnología nanosoft: " +
          "absorbe rápido y mantiene el cuerpo lavado tras lavado.",
        specs: ["100% algodón", "Tecnología nanosoft", "Hilo peinado", "500 g/m²"],
        colores: ["rosa", "azul", "beige", "gris", "piscina", "blanco"],
        variantes: [
          { medida: "85 × 150 cm", detalle: "Toallón", precio: 24400,    stock: "disponible" },
          { medida: "70 × 140 cm", detalle: "Toalla",    precio: 18500,    stock: "disponible" },
          { medida: "45 × 80 cm",  detalle: "Toalla de mano",     precio: 8000,     stock: "disponible" },
        ],
      },
      {
        id: "toallon-velour",
        nombre: "Toallón Velour",
        categoria: "toallas",
        img: "assets/img/toallon-velour.webp",
        material: "100% algodón",
        gramaje: "500 g/m²",
        destacado: true,
        descripcion:
          "Mismo gramaje que el Ícone, con terminación velour de un lado. " +
          "Es el que se siente más suave apenas lo tocás.",
        specs: ["100% algodón", "Tecnología nanosoft", "Hilo peinado", "500 g/m²"],
        colores: ["rosa", "beige", "vino", "azul marino", "limestone", "marrón"],
        fotosColor: {
          "beige": "assets/img/toallon-velour-beige.webp",
          "gris":  "assets/img/toallon-velour-gris.webp",
          "vino":  "assets/img/toallon-velour-vino.webp",
        },
        variantes: [
          { medida: "85 × 150 cm", detalle: "Toallón", precio: 23900,    stock: "disponible" },
          { medida: "70 × 140 cm", detalle: "Toalla",    precio: 18700,    stock: "disponible" },
          { medida: "45 × 80 cm",  detalle: "Toalla de mano",     precio: 7600,     stock: "disponible" },
        ],
      },
      {
        id: "toallon-dominus",
        nombre: "Toallón Dominus",
        categoria: "toallas",
        img: "assets/img/toallon-dominus.webp",
        material: "99% algodón · 1% viscosa",
        gramaje: "450 g/m²",
        descripcion:
          "La viscosa le da caída y un brillo suave. Buen punto medio entre " +
          "el gramaje alto y el uso diario.",
        specs: ["99% algodón · 1% viscosa", "450 g/m²"],
        colores: ["blanco", "beige", "rosa", "verde", "azul", "gris"],
        fotosColor: {
          "beige":  "assets/img/toallon-dominus-beige.webp",
          "blanco": "assets/img/toallon-dominus-blanco.webp",
          "gris":   "assets/img/toallon-dominus-gris.webp",
          "rosa":   "assets/img/toallon-dominus-rosa.webp",
          "verde":  "assets/img/toallon-dominus-verde.webp",
        },
        variantes: [
          { medida: "75 × 150 cm", detalle: "Toallón", precio: 14700,    stock: "disponible" },
          { medida: "70 × 140 cm", detalle: "Toalla",    precio: 12900,    stock: "disponible" },
          { medida: "45 × 80 cm",  detalle: "Toalla de mano",     precio: 5500,     stock: "disponible" },
        ],
      },
      {
        id: "toallon-galaxy",
        nombre: "Toallón Galaxy",
        categoria: "toallas",
        img: "assets/img/toallon-galaxy.webp",
        material: "100% algodón",
        gramaje: "400 g/m²",
        descripcion:
          "Algodón puro en gramaje liviano: seca rápido y ocupa poco en el " +
          "placard. Ideal para renovar todo el juego de baño.",
        specs: ["100% algodón", "400 g/m²"],
        colores: ["rosa", "azul", "beige", "gris", "verde", "blanco"],
        fotosColor: {
          "azul":   "assets/img/toallon-galaxy-azul.webp",
          "beige":  "assets/img/toallon-galaxy-beige.webp",
          "blanco": "assets/img/toallon-galaxy-blanco.webp",
          "gris":   "assets/img/toallon-galaxy-gris.webp",
          "rosa":   "assets/img/toallon-galaxy-rosa.webp",
        },
        variantes: [
          { medida: "75 × 150 cm", detalle: "Toallón", precio: 13300,    stock: "disponible" },
          { medida: "70 × 140 cm", detalle: "Toalla",    precio: 11400,    stock: "disponible" },
          { medida: "45 × 80 cm",  detalle: "Toalla de mano",     precio: 5100,     stock: "disponible" },
        ],
      },
      {
        id: "toallon-loft",
        nombre: "Toallón Loft",
        categoria: "toallas",
        img: "assets/img/toallon-loft.webp",
        material: "100% algodón",
        gramaje: "400 g/m²",
        descripcion:
          "Cenefa tejida y bordes reforzados. El clásico de todos los días, " +
          "en medidas un poco más compactas.",
        specs: ["100% algodón", "Tecnología nanosoft", "400 g/m²"],
        colores: ["beige", "plomo", "blanco", "rosa", "azul marino", "limestone"],
        variantes: [
          { medida: "70 × 130 cm", detalle: "Toalla", precio: 11600,    stock: "disponible" },
          { medida: "45 × 70 cm",  detalle: "Toalla de mano",  precio: 4900,     stock: "disponible" },
        ],
      },
      {
        id: "toallon-remix",
        nombre: "Toallón Remix",
        categoria: "toallas",
        img: "assets/img/toallon-remix.webp",
        material: "99% algodón · 1% poliéster",
        gramaje: "400 g/m²",
        descripcion:
          "Rayas tejidas en el borde y colores que combinan entre sí. " +
          "Pensado para armar juego sin que todo sea del mismo tono.",
        specs: ["99% algodón · 1% poliéster", "Tecnología nanosoft", "400 g/m²"],
        colores: ["beige", "rosa", "marrón", "piscina", "azul marino"],
        variantes: [
          { medida: "70 × 140 cm", detalle: "Toalla", precio: 12900,    stock: "disponible" },
          { medida: "45 × 80 cm",  detalle: "Toalla de mano",  precio: 5500,     stock: "disponible" },
        ],
      },
      {
        id: "toallon-eletra",
        nombre: "Toallón Eletra",
        categoria: "toallas",
        img: "assets/img/toallon-eletra.webp",
        material: "99% algodón · 1% viscosa",
        gramaje: "340 g/m²",
        descripcion:
          "Liviano y de secado rápido. El más práctico para gimnasio, " +
          "pileta o para tener de repuesto.",
        specs: ["99% algodón · 1% viscosa", "340 g/m²"],
        colores: ["azul marino", "azul", "rosa claro", "rosa oscuro", "plomo", "gris claro"],
        fotosColor: {
          "rosa claro": "assets/img/toallon-eletra-rosa-claro.webp",
        },
        variantes: [
          { medida: "70 × 140 cm", detalle: "Toalla", precio: 10200,    stock: "disponible" },
          { medida: "45 × 80 cm",  detalle: "Toalla de mano",  precio: 4000,     stock: "disponible" },
        ],
      },
      {
        id: "toallon-vegas",
        nombre: "Toallón Vegas",
        categoria: "toallas",
        img: "assets/img/toallon-vegas.webp",
        material: "98% algodón · 2% poliéster",
        gramaje: "340 g/m²",
        descripcion:
          "Rayas anchas de color sobre fondo claro. El más económico de la " +
          "línea sin resignar algodón.",
        specs: ["98% algodón · 2% poliéster", "340 g/m²"],
        colores: ["azul claro", "azul", "rosa claro", "rosa", "plomo", "verde oscuro", "verde"],
        variantes: [
          { medida: "62 × 130 cm", detalle: "Toalla", precio: 9000,    stock: "disponible" },
          { medida: "45 × 70 cm",  detalle: "Toalla de mano",  precio: 4000,    stock: "disponible" },
        ],
      },
      {
        id: "piso-supreme",
        nombre: "Alfombra de piso Supreme",
        categoria: "toallas",
        img: "assets/img/piso-supreme.webp",
        material: "100% algodón",
        gramaje: "600 g/m²",
        descripcion:
          "600 g/m² de algodón puro: la más pesada del catálogo. " +
          "Absorbe de verdad y no se corre del lugar.",
        specs: ["100% algodón", "600 g/m²", "Alta absorción"],
        colores: ["piscina", "azul marino", "azul", "rosa", "vino", "concreto",
                  "gris", "marrón", "blanco"],
        variantes: [
          { medida: "50 × 70 cm", detalle: "Piso", precio: 7400,    stock: "disponible" },
        ],
      },

      /* -------------------------- SÁBANAS ------------------------------ */
      {
        id: "sabana-supercotton",
        nombre: "Juego de sábanas Super Cotton",
        categoria: "sabanas",
        img: "assets/img/sabana-supercotton.webp",
        material: "100% algodón",
        gramaje: "120 hilos",
        destacado: true,
        descripcion:
          "Algodón puro de 120 hilos. Es el juego más noble del catálogo: " +
          "fresco en verano, y con cada lavado se pone más suave.",
        specs: ["100% algodón", "120 hilos", "Grandes dimensiones", "Incluye funda"],
        incluye: "Sábana plana + sábana ajustable + funda de almohada",
        estampados: [
          { slug: "amarylis", nombre: "Amarylis", img: "assets/img/estampado-supercotton-amarylis.webp" },
          { slug: "isola",    nombre: "Isola",    img: "assets/img/estampado-supercotton-isola.webp" },
          { slug: "cybele",   nombre: "Cybele",   img: "assets/img/estampado-supercotton-cybele.webp" },
          { slug: "thayla",   nombre: "Thayla",   img: "assets/img/estampado-supercotton-thayla.webp" },
          { slug: "apollo",   nombre: "Apollo",   img: "assets/img/estampado-supercotton-apollo.webp" },
          { slug: "elio",     nombre: "Elio",     img: "assets/img/estampado-supercotton-elio.webp" },
          { slug: "astro",    nombre: "Astro",    img: "assets/img/estampado-supercotton-astro.webp" },
          { slug: "zephyr",   nombre: "Zephyr",   img: "assets/img/estampado-supercotton-zephyr.webp" },
        ],
        variantes: [
          { medida: "1 plaza",  detalle: "Plana 150×240 · Ajustable 88×188×30 · Funda 70×50",
            precio: 36500,    stock: "disponible" },
          { medida: "2 plazas", detalle: "Plana 220×240 · Ajustable 138×188×30 · Funda 70×50",
            precio: 49000,    stock: "disponible" },
          { medida: "Queen",    detalle: "Plana 240×260 · Ajustable 158×198×35 · Funda 70×50",
            precio: 56500,    stock: "disponible" },
        ],
      },
      {
        id: "sabana-microcotton",
        nombre: "Juego de sábanas Micro Cotton",
        categoria: "sabanas",
        img: "assets/img/sabana-microcotton.webp",
        material: "100% poliéster",
        gramaje: "150 hilos",
        descripcion:
          "Tacto de algodón con la practicidad del poliéster: no necesita " +
          "plancha y el estampado no se apaga con los lavados.",
        specs: ["Toque de algodón", "150 hilos", "100% poliéster", "No requiere plancha"],
        incluye: "Sábana plana + sábana ajustable + funda de almohada",
        estampados: [
          { slug: "amia",     nombre: "Amia",     img: "assets/img/estampado-microcotton-amia.webp" },
          { slug: "romantic", nombre: "Romantic", img: "assets/img/estampado-microcotton-romantic.webp" },
          { slug: "contour",  nombre: "Contour",  img: "assets/img/estampado-microcotton-contour.webp" },
          { slug: "bomber",   nombre: "Bomber",   img: "assets/img/estampado-microcotton-bomber.webp" },
          { slug: "chalk",    nombre: "Chalk",    img: "assets/img/estampado-microcotton-chalk.webp" },
          { slug: "square",   nombre: "Square",   img: "assets/img/estampado-microcotton-square.webp" },
        ],
        variantes: [
          { medida: "1 plaza",  detalle: "Plana 160×240 · Ajustable 88×188×30 · Funda 70×50",
            precio: 22200,    stock: "disponible" },
          { medida: "2 plazas", detalle: "Plana 220×240 · Ajustable 138×188×30 · Funda 70×50",
            precio: 28500,    stock: "disponible" },
          { medida: "Queen",    detalle: "Plana 240×260 · Ajustable 158×198×35 · Funda 70×50",
            precio: 30400,    stock: "disponible" },
        ],
      },
      {
        id: "sabana-microfibra",
        nombre: "Juego de sábanas Microfibra",
        categoria: "sabanas",
        img: "assets/img/sabana-microfibra.webp",
        material: "100% poliéster",
        gramaje: "150 hilos · 65 g/m²",
        descripcion:
          "La mejor relación precio-calidad del catálogo, y la mayor " +
          "variedad de estampados: dieciséis diseños para elegir.",
        specs: ["150 hilos", "65 g/m²", "100% poliéster", "16 estampados"],
        incluye: "Sábana plana + sábana ajustable + funda de almohada",
        estampados: [
          { slug: "maya",     nombre: "Maya",     img: "assets/img/estampado-microfibra-maya.webp" },
          { slug: "eloa",     nombre: "Eloá",     img: "assets/img/estampado-microfibra-eloa.webp" },
          { slug: "savage",   nombre: "Savage",   img: "assets/img/estampado-microfibra-savage.webp" },
          { slug: "maite",    nombre: "Maitê",    img: "assets/img/estampado-microfibra-maite.webp" },
          { slug: "manu",     nombre: "Manu",     img: "assets/img/estampado-microfibra-manu.webp" },
          { slug: "belle",    nombre: "Belle",    img: "assets/img/estampado-microfibra-belle.webp" },
          { slug: "riga",     nombre: "Riga",     img: "assets/img/estampado-microfibra-riga.webp" },
          { slug: "raya",     nombre: "Raya",     img: "assets/img/estampado-microfibra-raya.webp" },
          { slug: "mada",     nombre: "Mada",     img: "assets/img/estampado-microfibra-mada.webp" },
          { slug: "labarus",  nombre: "Labarus",  img: "assets/img/estampado-microfibra-labarus.webp" },
          { slug: "buzan",    nombre: "Buzan",    img: "assets/img/estampado-microfibra-buzan.webp" },
          { slug: "liga",     nombre: "Liga",     img: "assets/img/estampado-microfibra-liga.webp" },
          { slug: "mare",     nombre: "Mare",     img: "assets/img/estampado-microfibra-mare.webp" },
          { slug: "sotilli",  nombre: "Sotilli",  img: "assets/img/estampado-microfibra-sotilli.webp" },
          { slug: "rope",     nombre: "Rope",     img: "assets/img/estampado-microfibra-rope.webp" },
          { slug: "sencilla", nombre: "Sencilla", img: "assets/img/estampado-microfibra-sencilla.webp" },
        ],
        variantes: [
          { medida: "1 plaza",  detalle: "Plana 140×220 · Ajustable 88×188×20 · Funda 70×50",
            precio: 14800,    stock: "disponible" },
          { medida: "2 plazas", detalle: "Plana 200×220 · Ajustable 138×188×20 · Funda 70×50",
            precio: 18500,    stock: "disponible" },
          { medida: "Queen",    detalle: "Plana 220×240 · Ajustable 158×198×30 · Funda 70×50",
            precio: 21400,    stock: "disponible" },
        ],
      },

      /* ------------------------- ALMOHADAS ----------------------------- */
      {
        id: "almohada-neo",
        nombre: "Almohada Neo Prime",
        categoria: "almohadas",
        img: "assets/img/almohada-neo.webp",
        material: "Funda 100% algodón · 233 hilos",
        gramaje: "1000 g",
        destacado: true,
        descripcion:
          "Relleno Ecopluma® siliconada: el tacto del plumón de ganso, " +
          "pero lavable. Funda de algodón satinado de 233 hilos y manija " +
          "para acomodarla sin despeinarla.",
        specs: ["Relleno Ecopluma® siliconada", "Funda 100% algodón 233 hilos",
                "Lavable", "Soporte medio", "Con manija"],
        variantes: [
          { medida: "50 × 70 cm", detalle: "Soporte medio", precio: 29900,    stock: "disponible" },
          { medida: "50 × 90 cm", detalle: "Soporte medio", precio: 38700,    stock: "disponible" },
        ],
      },
      {
        id: "almohada-ergosoft",
        nombre: "Almohada Ergosoft",
        categoria: "almohadas",
        img: "assets/img/almohada-ergosoft.webp",
        material: "Funda 90% poliéster · 10% poliamida",
        gramaje: "650 g",
        descripcion:
          "Fuelle de 5 cm que le da altura y sostiene el cuello. " +
          "Antiácaro e hipoalergénica, con vivo azul marino de terminación.",
        specs: ["Fuelle de 5 cm", "Antiácaro e hipoalergénica",
                "Tejido polinylon", "650 g de fibra"],
        variantes: [
          { medida: "50 × 70 cm", detalle: "Con fuelle de 5 cm", precio: 16500,    stock: "disponible" },
        ],
      },
      {
        id: "almohada-microcotton",
        nombre: "Almohada Micro Cotton",
        categoria: "almohadas",
        img: "assets/img/almohada-microcotton.webp",
        material: "100% poliéster",
        gramaje: "600 g",
        descripcion:
          "Fibra siliconada de soporte firme, para quien duerme de costado " +
          "y necesita que la almohada no se hunda.",
        specs: ["Fibra siliconada", "Toque de algodón", "Soporte firme",
                "Envasada al vacío"],
        variantes: [
          { medida: "50 × 70 cm", detalle: "Soporte firme", precio: 12300,    stock: "disponible" },
        ],
      },

      /* --------------------- FRAZADAS Y MANTAS ------------------------- */
      {
        id: "frazada-velour",
        nombre: "Frazada Neo Velour",
        categoria: "frazadas",
        img: "assets/img/frazada-velour.webp",
        material: "100% poliéster",
        gramaje: "300 g/m²",
        destacado: true,
        descripcion:
          "Tacto aterciopelado y 300 g/m² de peso real. La más abrigada, " +
          "en una paleta de tonos fríos que no cansa.",
        specs: ["Tacto aterciopelado", "100% poliéster", "300 g/m²",
                "Hipoalergénica", "Alta durabilidad"],
        colores: ["beige", "verde", "rosa", "gris", "azul marino"],
        variantes: [
          { medida: "150 × 220 cm", detalle: "1 plaza",  precio: 25400,    stock: "disponible" },
          { medida: "180 × 220 cm", detalle: "2 plazas", precio: 29200,    stock: "disponible" },
          { medida: "220 × 240 cm", detalle: "Queen",    precio: 36700,    stock: "disponible" },
          { medida: "240 × 260 cm", detalle: "King",     precio: 42300,    stock: "disponible" },
        ],
      },
      {
        id: "frazada-microfibra",
        nombre: "Frazada Microfibra",
        categoria: "frazadas",
        img: "assets/img/frazada-microfibra.webp",
        material: "100% poliéster",
        gramaje: "180 g/m²",
        descripcion:
          "Liviana, suave y en diez colores. La frazada de entrecasa: " +
          "para el sillón, para el auto, para tener siempre a mano.",
        specs: ["Microfibra 100% poliéster", "180 g/m²", "Hipoalergénica"],
        colores: ["azul claro", "azul marino", "verde", "plomo", "rosa", "rojo",
                  "berenjena", "pink", "azul real", "beige"],
        variantes: [
          { medida: "150 × 220 cm", detalle: "1 plaza",  precio: 15100,    stock: "disponible" },
          { medida: "180 × 220 cm", detalle: "2 plazas", precio: 17300,    stock: "disponible" },
          { medida: "220 × 240 cm", detalle: "Queen",    precio: 21500,    stock: "disponible" },
        ],
      },
      {
        id: "manta-outlet",
        nombre: "Manta Outlet",
        categoria: "frazadas",
        img: "assets/img/manta-outlet-lisa.webp",
        material: "100% poliéster",
        gramaje: "170 g/m²",
        descripcion:
          "La mejor relación costo-beneficio. Viene en tres líneas: lisa, " +
          "a cuadros o floral. Elegís el diseño al hacer el pedido.",
        specs: ["Microfibra 100% poliéster", "170 g/m²", "Hipoalergénica"],
        colores: ["azul marino", "rosa", "turquesa", "berenjena", "marrón",
                  "coral", "gris", "rojo", "beige", "azul real"],
        estampados: [
          { slug: "lisa",    nombre: "Lisa",    img: "assets/img/manta-outlet-lisa.webp" },
          { slug: "cuadros", nombre: "Cuadros", img: "assets/img/manta-outlet-cuadros.webp" },
          { slug: "floral",  nombre: "Floral",  img: "assets/img/manta-outlet-floral.webp" },
        ],
        variantes: [
          { medida: "150 × 200 cm", detalle: "Medida única", precio: 13100,    stock: "disponible" },
        ],
      },

      /* ------------------------ REPASADORES ---------------------------- */
      {
        id: "repasador-bompano",
        nombre: "Repasador Bompano",
        categoria: "repasadores",
        img: "assets/img/repasador-bompano.webp",
        material: "90% algodón · 10% poliéster",
        gramaje: "170 g/m²",
        descripcion:
          "Doce estampados ilustrados, en algodón absorbente de verdad. " +
          "El regalo chico que siempre cae bien.",
        specs: ["90% algodón · 10% poliéster", "170 g/m²", "12 estampados"],
        estampados: [
          { slug: "ceramica",       nombre: "Cerámica",          img: "assets/img/repasador-ceramica.webp" },
          { slug: "taza-de-flores", nombre: "Taza de flores",    img: "assets/img/repasador-taza-de-flores.webp" },
          { slug: "gallina",        nombre: "Gallina",           img: "assets/img/repasador-gallina.webp" },
          { slug: "sandia",         nombre: "Sandía",            img: "assets/img/repasador-sandia.webp" },
          { slug: "frutas",         nombre: "Frutas",            img: "assets/img/repasador-frutas.webp" },
          { slug: "gatos",          nombre: "Gatos",             img: "assets/img/repasador-gatos.webp" },
          { slug: "ice-cream",      nombre: "Ice cream",         img: "assets/img/repasador-ice-cream.webp" },
          { slug: "pine",           nombre: "Pine",              img: "assets/img/repasador-pine.webp" },
          { slug: "fresaflor",      nombre: "Fresaflor",         img: "assets/img/repasador-fresaflor.webp" },
          { slug: "cubiertos",      nombre: "Cubiertos antiguos", img: "assets/img/repasador-cubiertos.webp" },
          { slug: "hot",            nombre: "Hot",               img: "assets/img/repasador-hot.webp" },
          { slug: "frutas-color",   nombre: "Frutas color",      img: "assets/img/repasador-frutas-color.webp" },
        ],
        variantes: [
          { medida: "42 × 60 cm", detalle: "Medida única", precio: 1600,    stock: "disponible" },
        ],
      },
    ],

    /* ====================================================================
       COMBOS / SETS ARMADOS

       ⚠️ OJO: el descuento de abajo lo puse yo como ejemplo (10%).
       Cambiá "descuento" por el número que quieras (0.10 = 10%, 0 = sin
       descuento) o borrá el combo entero si no querés ofrecerlo.
       El precio del set se calcula solo a partir de los productos.
       ==================================================================== */
    combos: [
      {
        id: "combo-bano",
        nombre: "Set de baño Ícone",
        descripcion: "Toallón, toalla y toalla de mano en el mismo color.",
        img: "assets/img/toallon-icone.webp",
        descuento: 0.10,
        items: [
          { producto: "toallon-icone", medida: "85 × 150 cm", cantidad: 1 },
          { producto: "toallon-icone", medida: "70 × 140 cm", cantidad: 1 },
          { producto: "toallon-icone", medida: "45 × 80 cm",  cantidad: 2 },
        ],
      },
      {
        id: "combo-cama",
        nombre: "Set cama completa",
        descripcion: "Juego de sábanas 2 plazas, frazada y dos almohadas.",
        img: "assets/img/lifestyle-cama.webp",
        descuento: 0.10,
        items: [
          { producto: "sabana-supercotton", medida: "2 plazas",     cantidad: 1 },
          { producto: "frazada-velour",     medida: "180 × 220 cm", cantidad: 1 },
          { producto: "almohada-neo",       medida: "50 × 70 cm",   cantidad: 2 },
        ],
      },
      {
        id: "combo-regalo",
        nombre: "Set para regalar",
        descripcion: "Toalla, toalla de mano y dos repasadores. Listo para entregar.",
        img: "assets/img/lifestyle-mesa.webp",
        descuento: 0.10,
        items: [
          { producto: "toallon-velour",     medida: "70 × 140 cm", cantidad: 1 },
          { producto: "toallon-velour",     medida: "45 × 80 cm",  cantidad: 1 },
          { producto: "repasador-bompano",  medida: "42 × 60 cm",  cantidad: 2 },
        ],
      },
    ],
  };
})();
