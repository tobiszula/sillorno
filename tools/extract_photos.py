# -*- coding: utf-8 -*-
"""
Extrae del catalogo CAMESA solo las fotos de los productos que vende Sillorno.

Toma las imagenes EMBEBIDAS del PDF (no el render de pagina): asi vienen limpias,
sin los titulos del catalogo, que son una capa de texto aparte. Los recortes
estan elegidos para dejar afuera el packaging con marca del proveedor.

Uso:  python tools/extract_photos.py
"""
import glob
import io
import os
import sys

import fitz
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
_pdfs = glob.glob(os.path.join(ROOT, "..", "*.pdf"))
PDF = _pdfs[0] if _pdfs else ""
OUT = os.path.join(ROOT, "assets", "img")

CARD = (4, 5)    # ficha de producto: retrato editorial
WIDE = (16, 9)   # lifestyle / hero
SQUARE = (1, 1)  # swatches

# nombre, pagina(1-based), selector, recorte fraccional (x0,y0,x1,y1), aspecto, ancho
JOBS = [
    # --- toallas y toallones: la foto embebida ya viene limpia y en retrato ---
    ("toallon-velour",   25, "left",  None, CARD, 1000),
    ("toallon-icone",    25, "right", None, CARD, 1000),
    ("toallon-dominus",  26, "left",  None, CARD, 1000),
    ("toallon-galaxy",   26, "right", None, CARD, 1000),
    ("toallon-loft",     27, "left",  None, CARD, 1000),
    ("toallon-remix",    27, "right", None, CARD, 1000),
    ("toallon-eletra",   28, "left",  None, CARD, 1000),
    ("toallon-vegas",    28, "right", None, CARD, 1000),
    ("piso-supreme",     29, "main", (0.52, 0.02, 0.94, 1.0), CARD, 1000),

    # --- almohadas: esquivo las cajas con marca del proveedor ---
    ("almohada-neo",         3, "main", (0.45, 0.0, 0.83, 1.0), CARD, 1000),
    ("almohada-ergosoft",    4, "main", (0.56, 0.0, 0.94, 1.0), CARD, 1000),
    ("almohada-microcotton", 5, "aux",  None, CARD, 1000),

    # --- juegos de sabana: foto de linea ---
    ("sabana-supercotton",  7, "main", (0.06, 0.0, 0.45, 1.0), CARD, 1000),
    ("sabana-microcotton", 10, "main", (0.24, 0.10, 0.70, 0.70), CARD, 1000),
    ("sabana-microfibra",  13, "main", (0.27, 0.0, 0.66, 1.0), CARD, 1000),

    # --- frazadas y mantas ---
    ("frazada-velour",       19, "main", (0.09, 0.0, 0.51, 1.0),   CARD, 1000),
    ("frazada-microfibra",   20, "main", (0.34, 0.24, 0.81, 0.82), CARD, 1000),
    ("manta-outlet-lisa",    21, "main", (0.24, 0.0, 0.69, 1.0),   CARD, 1000),
    ("manta-outlet-cuadros", 22, "main", (0.24, 0.32, 0.76, 0.96), CARD, 1000),
    ("manta-outlet-floral",  23, "main", (0.24, 0.0, 0.70, 1.0),   CARD, 1000),

    # --- repasadores ---
    ("repasador-bompano", 34, "main", None, CARD, 1000),

    # --- lifestyle / editorial ---
    ("hero-invierno",   18, "main", None, WIDE, 1800),
    ("lifestyle-cama",   6, "main", None, WIDE, 1600),
    ("lifestyle-bano",  24, "main", None, WIDE, 1600),
    ("lifestyle-mesa",  33, "main", None, WIDE, 1600),
]

# Estampados de sabanas: cada uno es su propia imagen embebida, identificada por
# el origen de su bbox en la pagina (mucho mas fiable que deducir el cuadrante).
ESTAMPADOS = [
    ("supercotton", 8,  {"amarylis": (-1, 54), "isola": (613, 54),
                         "cybele": (-1, 424), "thayla": (612, 424)}),
    ("supercotton", 9,  {"apollo": (-1, 54), "elio": (613, 54),
                         "astro": (-1, 424), "zephyr": (612, 424)}),
    ("microcotton", 11, {"amia": (-1, 51), "romantic": (612, 54), "contour": (-1, 420)}),
    ("microcotton", 12, {"bomber": (-1, 54), "chalk": (613, 50), "square": (613, 420)}),
    ("microfibra", 14, {"maya": (-1, 54), "eloa": (613, 54),
                        "savage": (-1, 424), "maite": (613, 424)}),
    ("microfibra", 15, {"manu": (-1, 54), "belle": (613, 54),
                        "riga": (-1, 424), "raya": (613, 424)}),
    ("microfibra", 16, {"mada": (-1, 54), "labarus": (613, 54),
                        "buzan": (-1, 424), "liga": (613, 424)}),
    ("microfibra", 17, {"mare": (-1, 54), "sotilli": (613, 54),
                        "rope": (-1, 424), "sencilla": (613, 424)}),
]

# Swatches de repasadores en pagina 34, identificados por su bbox en la pagina
REPASADORES = {
    "ceramica": (635, 111), "taza-de-flores": (767, 110), "gallina": (899, 109),
    "sandia": (1030, 111), "frutas": (635, 326), "gatos": (767, 326),
    "ice-cream": (899, 326), "pine": (1030, 326), "fresaflor": (635, 543),
    "cubiertos": (767, 543), "hot": (899, 543), "frutas-color": (1030, 543),
}


def page_images(doc, page_no):
    """Imagenes embebidas de una pagina, ordenadas por posicion (x, y)."""
    infos = doc[page_no - 1].get_image_info(xrefs=True)
    out = []
    for info in infos:
        base = doc.extract_image(info["xref"])
        img = Image.open(io.BytesIO(base["image"])).convert("RGB")
        out.append({"img": img, "bbox": info["bbox"], "area": img.width * img.height})
    return out


def select(items, how):
    if how == "main":
        return max(items, key=lambda d: d["area"])["img"]
    if how == "aux":
        return sorted(items, key=lambda d: -d["area"])[1]["img"]
    ordered = sorted(items, key=lambda d: d["bbox"][0])
    return (ordered[0] if how == "left" else ordered[-1])["img"]


def at(items, x, y):
    """La imagen embebida cuyo bbox arranca mas cerca de (x, y)."""
    return min(items, key=lambda d: abs(d["bbox"][0] - x) + abs(d["bbox"][1] - y))["img"]


def frac_crop(img, box):
    if not box:
        return img
    w, h = img.size
    return img.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)))


def to_ratio(img, ratio):
    """Recorta al aspecto pedido sin deformar, desde el centro."""
    target = ratio[0] / ratio[1]
    w, h = img.size
    if abs(w / h - target) < 0.005:
        return img
    if w / h > target:
        nw = int(round(h * target))
        left = (w - nw) // 2
        return img.crop((left, 0, left + nw, h))
    nh = int(round(w / target))
    top = (h - nh) // 2
    return img.crop((0, top, w, top + nh))


def save(img, name, max_w, quality=82):
    if img.width > max_w:
        img = img.resize((max_w, round(img.height * max_w / img.width)), Image.LANCZOS)
    path = os.path.join(OUT, name + ".webp")
    img.save(path, "WEBP", quality=quality, method=6)
    return os.path.getsize(path)


def main():
    if not os.path.exists(PDF):
        sys.exit("No encuentro el PDF del catalogo junto a la carpeta del sitio.")
    os.makedirs(OUT, exist_ok=True)
    doc = fitz.open(PDF)
    total = n = 0

    for name, page_no, how, box, ratio, width in JOBS:
        img = to_ratio(frac_crop(select(page_images(doc, page_no), how), box), ratio)
        size = save(img, name, width)
        total += size; n += 1
        print("  %-26s %5d KB" % (name, size // 1024))

    for linea, page_no, items in ESTAMPADOS:
        imgs = page_images(doc, page_no)
        for slug, (bx, by) in items.items():
            img = to_ratio(at(imgs, bx, by), (4, 3))
            size = save(img, "estampado-%s-%s" % (linea, slug), 700)
            total += size; n += 1

    imgs34 = page_images(doc, 34)
    for slug, (bx, by) in REPASADORES.items():
        size = save(to_ratio(at(imgs34, bx, by), SQUARE), "repasador-%s" % slug, 440)
        total += size; n += 1

    print("\n%d imagenes  ·  %.1f MB  ->  %s" % (n, total / 1024 / 1024, OUT))


if __name__ == "__main__":
    main()
