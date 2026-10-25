#!/usr/bin/env python3
"""
Generate gambar OG (Open Graph) 1200x630 per artikel, otomatis dari
data/articles.json + eyebrow (kategori) yang sudah ada di tiap file
HTML, lalu pasang meta tag og:image/twitter:card ke HTML artikel
terkait.

Hasil gambar disimpan di og/<lang>/<id>.png (dipakai juga sebagai
og:image untuk link preview di WhatsApp/Twitter/dll).

Dependencies: Pillow, cairosvg (lihat requirements di workflow CI).
Font di-vendor di scripts/assets/fonts/ (Inter) supaya hasilnya
konsisten di mana pun script ini jalan. Font Noto Sans CJK untuk
ja/zh/ko diambil dari sistem (di-install lewat apt di CI; terlalu
besar untuk di-vendor ke repo).
"""
import glob
import html
import json
import re
import sys
from pathlib import Path

try:
    import cairosvg
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Butuh Pillow + cairosvg: pip install --break-system-packages pillow cairosvg")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
ASSETS = Path(__file__).resolve().parent / "assets"
SITE_ORIGIN = "https://vonetra.meaecosystem.com"

W, H = 1200, 630
BG = (1, 6, 21)
TEXT = (250, 250, 250)
SECONDARY = (161, 161, 161)
ACCENT_TEXT = (129, 212, 250)
BORDER = (42, 42, 42)

INTER_EXTRABOLD = str(ASSETS / "fonts" / "Inter-ExtraBold.otf")
INTER_SEMIBOLD = str(ASSETS / "fonts" / "Inter-SemiBold.otf")
INTER_MEDIUM = str(ASSETS / "fonts" / "Inter-Medium.otf")

# Noto Sans CJK, satu file .ttc multi-bahasa (JP=0, KR=1, SC/zh=2).
NOTO_CJK_BOLD = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
NOTO_CJK_MEDIUM = "/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc"
CJK_FACE_INDEX = {"ja": 0, "ko": 1, "zh": 2}

ARTICLES_JSON = ROOT / "data" / "articles.json"
LOGO_SVG = ASSETS / "vonetra-mark.svg"
LOGO_PNG_CACHE = ASSETS / "_vonetra-mark-cache.png"

EYEBROW_RE = re.compile(
    r'<header class="mea-article-header">\s*<span class="eyebrow">(.*?)</span>', re.DOTALL
)
DESC_RE = re.compile(r'<meta name="description" content="([^"]*)" />')


def bold_font(lang, size):
    if lang in CJK_FACE_INDEX:
        return ImageFont.truetype(NOTO_CJK_BOLD, size, index=CJK_FACE_INDEX[lang])
    return ImageFont.truetype(INTER_EXTRABOLD, size)


def medium_font(lang, size):
    if lang in CJK_FACE_INDEX:
        return ImageFont.truetype(NOTO_CJK_MEDIUM, size, index=CJK_FACE_INDEX[lang])
    return ImageFont.truetype(INTER_SEMIBOLD, size)


def get_logo():
    if LOGO_PNG_CACHE.exists():
        return Image.open(LOGO_PNG_CACHE).convert("RGBA")
    cairosvg.svg2png(url=str(LOGO_SVG), write_to=str(LOGO_PNG_CACHE), output_width=400, output_height=400)
    return Image.open(LOGO_PNG_CACHE).convert("RGBA")


def wrap_text(draw, text, font, max_w):
    # Untuk CJK (nggak ada spasi antar kata), wrap per-karakter.
    units = list(text) if not re.search(r"[a-zA-Z0-9]", text[:1] or "") and any(
        "　" <= c <= "鿿" or "가" <= c <= "힣" for c in text
    ) else text.split(" ")
    sep = "" if units and len(units[0]) <= 1 and any(
        "　" <= c <= "鿿" or "가" <= c <= "힣" for c in text
    ) else " "
    lines, cur = [], ""
    for u in units:
        test = (cur + sep + u) if cur else u
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = u
    if cur:
        lines.append(cur)
    return lines


def make_og(lang, title, eyebrow, out_path, logo):
    img = Image.new("RGB", (W, H), BG)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    for r, alpha in [(520, 10), (380, 14), (260, 18)]:
        gdraw.ellipse([W - 200 - r, -r + 160, W - 200 + r, -r + 160 + r * 2], fill=(59, 130, 246, alpha))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGBA")

    logo_h = 44
    logo_w = int(logo.width * (logo_h / logo.height))
    logo_r = logo.resize((logo_w, logo_h), Image.LANCZOS)
    logo_y = 50
    img.alpha_composite(logo_r, (64, logo_y))

    draw = ImageDraw.Draw(img)
    brand_font = ImageFont.truetype(INTER_EXTRABOLD, 34)
    draw.text((64 + logo_w + 14, logo_y + 2), "Vonetra", font=brand_font, fill=TEXT)

    eyebrow_font = medium_font(lang, 26)
    draw.text((64, 220), eyebrow.upper(), font=eyebrow_font, fill=ACCENT_TEXT)

    title_font_size = 64
    max_width = W - 64 - 64
    title_font = bold_font(lang, title_font_size)
    lines = wrap_text(draw, title, title_font, max_width)
    while len(lines) > 4 and title_font_size > 36:
        title_font_size -= 4
        title_font = bold_font(lang, title_font_size)
        lines = wrap_text(draw, title, title_font, max_width)
    lines = lines[:4]

    y = 270
    line_height = int(title_font_size * 1.22)
    for line in lines:
        draw.text((64, y), line, font=title_font, fill=TEXT)
        y += line_height

    bottom_font = ImageFont.truetype(INTER_MEDIUM, 24)
    draw.line([(64, H - 90), (W - 64, H - 90)], fill=BORDER, width=1)
    draw.text((64, H - 66), "vonetra.meaecosystem.com", font=bottom_font, fill=SECONDARY)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out_path, "PNG", optimize=True)


def inject_meta_tags(path, lang, article_id, og_title, og_desc, canonical_url):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if "og:image" in content:
        return False  # sudah ada, jangan dobel

    image_url = f"{SITE_ORIGIN}/og/{lang}/{article_id}.png"
    og_title_esc = html.escape(og_title, quote=True)
    og_desc_esc = html.escape(og_desc, quote=True)

    block = (
        f'<meta property="og:type" content="article" />\n'
        f'<meta property="og:site_name" content="Vonetra" />\n'
        f'<meta property="og:url" content="{canonical_url}" />\n'
        f'<meta property="og:title" content="{og_title_esc}" />\n'
        f'<meta property="og:description" content="{og_desc_esc}" />\n'
        f'<meta property="og:image" content="{image_url}" />\n'
        f'<meta property="og:image:width" content="1200" />\n'
        f'<meta property="og:image:height" content="630" />\n'
        f'<meta name="twitter:card" content="summary_large_image" />\n'
        f'<meta name="twitter:title" content="{og_title_esc}" />\n'
        f'<meta name="twitter:description" content="{og_desc_esc}" />\n'
        f'<meta name="twitter:image" content="{image_url}" />\n'
    )

    needle = re.search(r'<link rel="canonical"[^>]*/>\n', content)
    if not needle:
        return False
    insert_at = needle.end()
    new_content = content[:insert_at] + block + content[insert_at:]
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)
    return True


def main():
    dry_run = "--dry-run" in sys.argv
    only_lang = None
    for arg in sys.argv[1:]:
        if arg.startswith("--lang="):
            only_lang = arg.split("=", 1)[1]

    with open(ARTICLES_JSON, "r", encoding="utf-8") as f:
        articles = json.load(f)

    logo = get_logo()

    generated = 0
    meta_added = 0
    skipped = []

    for a in articles:
        lang = a.get("lang", "id")
        if only_lang and lang != only_lang:
            continue
        article_id = a["id"]
        url = a["url"]  # e.g. /id/cara-kompres-pdf.html
        path = ROOT / url.lstrip("/")
        if not path.exists():
            skipped.append(str(path))
            continue

        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        eyebrow_match = EYEBROW_RE.search(content)
        eyebrow = html.unescape(eyebrow_match.group(1)) if eyebrow_match else a.get("category", "")

        desc_match = DESC_RE.search(content)
        description = html.unescape(desc_match.group(1)) if desc_match else a.get("desc", "")

        title = a["title"]
        out_path = ROOT / "og" / lang / f"{article_id}.png"

        if not dry_run:
            make_og(lang, title, eyebrow, out_path, logo)
        generated += 1

        canonical_url = f"{SITE_ORIGIN}{url}"
        if not dry_run:
            if inject_meta_tags(path, lang, article_id, title, description, canonical_url):
                meta_added += 1
        else:
            meta_added += 1

    print(f"OG images generated: {generated}")
    print(f"Meta tags injected: {meta_added}")
    if skipped:
        print(f"Skipped (file not found): {len(skipped)}")
        print(skipped[:10])


if __name__ == "__main__":
    main()
