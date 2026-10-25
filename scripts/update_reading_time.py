#!/usr/bin/env python3
"""
Hitung ulang reading time tiap artikel secara otomatis berdasarkan jumlah
kata/karakter di body artikel, lalu update teks "X menit baca" (dan versi
bahasa lainnya) di <div class="mea-article-meta">.

Kecepatan baca per bahasa:
  - id, en  : hitung kata (pisah spasi), 200 kata/menit
  - ja      : hitung karakter non-spasi, 400 karakter/menit
  - zh, ko  : hitung karakter non-spasi, 300 karakter/menit

Dipakai sekali jalan untuk backfill semua artikel lama, dan bisa dipakai
lagi kapan saja kalau mau re-sync reading time (misal abis edit artikel).
"""
import glob
import html
import re
import sys

PATTERNS = {
    "id": (r"(\d+) menit baca", lambda n: f"{n} menit baca"),
    "en": (r"(\d+) min read", lambda n: f"{n} min read"),
    "ja": (r"読了時間 (\d+)分", lambda n: f"読了時間 {n}分"),
    "zh": (r"(\d+)分钟阅读", lambda n: f"{n}分钟阅读"),
    "ko": (r"읽는 시간 (\d+)분", lambda n: f"읽는 시간 {n}분"),
}

WORD_BASED_LANGS = {"id", "en"}
CHAR_SPEED = {"ja": 400, "zh": 300, "ko": 300}
WORD_SPEED = 200

ARTICLE_BODY_RE = re.compile(
    r'<article class="mea-article-body">(.*?)</article>', re.DOTALL
)
TAG_RE = re.compile(r"<[^>]+>")
SCRIPT_STYLE_RE = re.compile(r"<(script|style)\b[^>]*>.*?</\1>", re.DOTALL | re.IGNORECASE)


def extract_text(html_content):
    m = ARTICLE_BODY_RE.search(html_content)
    if not m:
        return None
    body = m.group(1)
    body = SCRIPT_STYLE_RE.sub(" ", body)
    body = TAG_RE.sub(" ", body)
    return html.unescape(body)


def compute_reading_time(lang, text):
    if lang in WORD_BASED_LANGS:
        words = re.findall(r"\w+", text, re.UNICODE)
        count = len(words)
        minutes = round(count / WORD_SPEED)
    else:
        chars = len(re.sub(r"\s+", "", text))
        minutes = round(chars / CHAR_SPEED[lang])
    return max(1, minutes)


def process_file(path, lang, dry_run):
    with open(path, encoding="utf-8") as f:
        content = f.read()

    text = extract_text(content)
    if text is None:
        return None, None, None  # no article body found, skip

    new_minutes = compute_reading_time(lang, text)

    pattern, fmt = PATTERNS[lang]
    match = re.search(pattern, content)
    if not match:
        return None, None, None  # no reading-time span found, skip

    old_minutes = int(match.group(1))
    if old_minutes == new_minutes:
        return old_minutes, new_minutes, False  # no change needed

    new_content = re.sub(pattern, fmt(new_minutes), content, count=1)
    if not dry_run:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)
    return old_minutes, new_minutes, True


def main():
    dry_run = "--dry-run" in sys.argv
    changed = 0
    unchanged = 0
    skipped = 0

    for lang in ["id", "en", "ja", "zh", "ko"]:
        for path in sorted(glob.glob(f"{lang}/*.html")):
            if path.endswith("/index.html"):
                continue
            old, new, did_change = process_file(path, lang, dry_run)
            if old is None:
                skipped += 1
                continue
            if did_change:
                changed += 1
                print(f"[{lang}] {path}: {old} -> {new} menit/min")
            else:
                unchanged += 1

    print(f"\nTotal: {changed} diubah, {unchanged} sudah pas, {skipped} dilewati.")
    if dry_run:
        print("(dry run -- belum ada file yang ditulis)")


if __name__ == "__main__":
    main()
