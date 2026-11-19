#!/usr/bin/env python3
"""
Подготовка фото для сайта.

Что делает:
  * берёт картинки из корня репозитория и из photos/
  * HEIC/HEIF -> JPG (нужен pillow-heif: pip install pillow-heif)
  * выправляет поворот по EXIF
  * уменьшает до 1600px по длинной стороне, качество 82
  * нетронутые оригиналы складывает в photos/originals/ (в git не попадают)
  * печатает готовый список для config.js

Запуск:   python tools/prepare_photos.py
"""

import re
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageOps

try:  # необязательно, нужно только для HEIC
    import pillow_heif

    pillow_heif.register_heif_opener()
except Exception:  # pragma: no cover
    pillow_heif = None

ROOT = Path(__file__).resolve().parent.parent
PHOTOS = ROOT / "photos"
ORIGINALS = PHOTOS / "originals"

MAX_SIDE = 1200  # фото на экране ~300px, 1200 хватает с запасом даже для retina
QUALITY = 82
EXTS = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp", ".bmp", ".tif", ".tiff"}
FINAL_STEM = "final"


def sort_key(path: Path):
    """1, 2, 10 — по-человечески; 'final' всегда последним."""
    stem = path.stem.lower()
    if stem == FINAL_STEM:
        return (2, 0, stem)
    m = re.match(r"^(\d+)", stem)
    if m:
        return (0, int(m.group(1)), stem)
    return (1, 0, stem)


def collect():
    found = []
    for folder in (PHOTOS, ROOT):
        if not folder.exists():
            continue
        for p in sorted(folder.iterdir()):
            if p.is_file() and p.suffix.lower() in EXTS and ORIGINALS not in p.parents:
                found.append(p)
    return sorted(found, key=sort_key)


def main():
    PHOTOS.mkdir(exist_ok=True)
    ORIGINALS.mkdir(exist_ok=True)

    files = collect()
    if not files:
        print("не нашёл картинок ни в корне, ни в photos/")
        return 1

    out_names = []
    for src in files:
        if src.suffix.lower() in {".heic", ".heif"} and pillow_heif is None:
            print(f"пропускаю {src.name}: нет pillow-heif (pip install pillow-heif)")
            continue

        stem = src.stem.lower()
        out = PHOTOS / f"{stem}.jpg"

        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im)
            im = im.convert("RGB")
            w, h = im.size
            if max(w, h) > MAX_SIDE:
                scale = MAX_SIDE / max(w, h)
                im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
            tmp = out.with_suffix(".tmp.jpg")
            im.save(tmp, "JPEG", quality=QUALITY, optimize=True, progressive=True)

        original = ORIGINALS / src.name
        if original.exists():
            original = ORIGINALS / f"{src.stem}_orig{src.suffix}"
        shutil.move(str(src), str(original))
        tmp.replace(out)
        out_names.append(out.name)
        print(f"{src.name} -> photos/{out.name}")

    gallery = [n for n in out_names if Path(n).stem != FINAL_STEM]
    print("\n--- вставь в config.js ---")
    print("  photos: [")
    for n in gallery:
        print(f"    'photos/{n}',")
    print("  ],")
    if (PHOTOS / f"{FINAL_STEM}.jpg").exists():
        print(f"  finalPhoto: 'photos/{FINAL_STEM}.jpg',")
    return 0


if __name__ == "__main__":
    sys.exit(main())
