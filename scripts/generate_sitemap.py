#!/usr/bin/env python3
"""
Generate sitemap.xml otomatis dari data/articles.json, supaya nggak
perlu lagi di-update manual tiap ada artikel baru (sitemap lama cuma
punya 77 URL padahal artikelnya udah 300+).

Isi sitemap:
  - 5 halaman beranda (root "/" buat id, "/en/", "/ja/", "/zh/", "/ko/")
  - semua artikel di data/articles.json
  - tiap entri dikasih <xhtml:link rel="alternate" hreflang="..."> ke
    versi bahasa lain dari artikel/halaman yang sama (termasuk
    x-default -> versi id), sama kayak <link rel="alternate" hreflang>
    yang sudah ada di <head> tiap halaman.
  - <lastmod> artikel diambil dari field "date" di articles.json;
    halaman beranda pakai tanggal artikel terbaru di bahasa itu.
"""
import json
import sys
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
ORIGIN = "https://vonetra.meaecosystem.com"
LANGS = ["id", "en", "ja", "zh", "ko"]
ARTICLES_JSON = ROOT / "data" / "articles.json"
SITEMAP_PATH = ROOT / "sitemap.xml"

HOME_PATH = {
    "id": "/",
    "en": "/en/",
    "ja": "/ja/",
    "zh": "/zh/",
    "ko": "/ko/",
}


def main():
    dry_run = "--dry-run" in sys.argv

    with open(ARTICLES_JSON, "r", encoding="utf-8") as f:
        articles = json.load(f)

    # Kelompokkan per id artikel supaya gampang bikin hreflang alternate.
    by_article_id = {}
    for a in articles:
        by_article_id.setdefault(a["id"], {})[a.get("lang", "id")] = a

    latest_date_per_lang = {}
    for a in articles:
        lang = a.get("lang", "id")
        d = a.get("date", "")
        if d > latest_date_per_lang.get(lang, ""):
            latest_date_per_lang[lang] = d

    entries = []

    # --- Halaman beranda per bahasa ---
    for lang in LANGS:
        alt_links = "".join(
            f'    <xhtml:link rel="alternate" hreflang="{l}" href="{ORIGIN}{HOME_PATH[l]}" />\n'
            for l in LANGS
        )
        alt_links += f'    <xhtml:link rel="alternate" hreflang="x-default" href="{ORIGIN}{HOME_PATH["id"]}" />\n'
        lastmod = latest_date_per_lang.get(lang, "")
        entries.append(
            "  <url>\n"
            f"    <loc>{ORIGIN}{HOME_PATH[lang]}</loc>\n"
            + (f"    <lastmod>{lastmod}</lastmod>\n" if lastmod else "")
            + "    <changefreq>weekly</changefreq>\n"
            "    <priority>1.0</priority>\n"
            + alt_links
            + "  </url>"
        )

    # --- Semua artikel ---
    for a in articles:
        lang = a.get("lang", "id")
        siblings = by_article_id[a["id"]]
        alt_links = "".join(
            f'    <xhtml:link rel="alternate" hreflang="{l}" href="{ORIGIN}{siblings[l]["url"]}" />\n'
            for l in LANGS
            if l in siblings
        )
        if "id" in siblings:
            alt_links += (
                f'    <xhtml:link rel="alternate" hreflang="x-default" '
                f'href="{ORIGIN}{siblings["id"]["url"]}" />\n'
            )
        lastmod = a.get("date", "")
        entries.append(
            "  <url>\n"
            f"    <loc>{escape(ORIGIN + a['url'])}</loc>\n"
            + (f"    <lastmod>{lastmod}</lastmod>\n" if lastmod else "")
            + "    <changefreq>monthly</changefreq>\n"
            "    <priority>0.8</priority>\n"
            + alt_links
            + "  </url>"
        )

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )

    if dry_run:
        print(f"Would write {len(entries)} <url> entries to {SITEMAP_PATH}")
        return

    old = SITEMAP_PATH.read_text(encoding="utf-8") if SITEMAP_PATH.exists() else None
    if old == xml:
        print("Sitemap sudah sinkron, tidak ada perubahan.")
        return

    SITEMAP_PATH.write_text(xml, encoding="utf-8")
    print(f"Sitemap diperbarui: {len(entries)} <url> entries.")


if __name__ == "__main__":
    main()
