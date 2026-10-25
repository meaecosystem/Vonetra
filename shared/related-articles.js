/*
  RELATED ARTICLES — card grid otomatis di akhir tiap artikel
  ==============================================
  Murni client-side, sama kayak shared/blog.js. Sumber data tetap
  /data/articles.json -- jadi nambah artikel baru = otomatis ikut jadi
  kandidat "artikel terkait" di artikel lain tanpa perlu ubah apa-apa.

  Cara kerja:
  1. Id artikel saat ini diambil dari nama file di URL (sama persis
     dengan field "id" di articles.json -- lihat scripts/update_reading_time.py
     dan pola existing di data/articles.json).
  2. Kandidat: semua artikel bahasa yang sama, selain artikel ini sendiri.
  3. Skor tiap kandidat: +2 kalau kategori sama, +1 per keyword yang
     overlap (case-insensitive) dengan artikel ini.
  4. Ambil 3 skor tertinggi. Kalau kurang dari 3 yang punya skor > 0,
     sisanya diisi artikel terbaru lain (biar section-nya tetap
     terisi 3 card, bukan kosong/cuma 1).
  5. Kalau sama sekali nggak ada kandidat (misal cuma 1 artikel di
     bahasa itu), section nggak dirender sama sekali.

  Section baru ini DITAMBAHKAN setelah <article class="mea-article-body">
  (lewat JS, bukan hardcode di tiap file HTML) -- jadi gak bentrok sama
  box "Baca juga" manual yang sudah ada di beberapa artikel.
*/

const RELATED_LABELS = {
  id: "Artikel terkait",
  en: "Related articles",
  ja: "関連記事",
  zh: "相关文章",
  ko: "관련 글",
};

/* Ikon ringkas, sengaja duplikat subset dari MEA_ICONS di blog.js
   (bukan import) biar file ini berdiri sendiri -- gak perlu blog.js
   ikut di-load di tiap halaman artikel. */
const RELATED_ICONS = {
  pdf: '<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/><text x="8" y="17" font-size="6" font-family="monospace" fill="currentColor" stroke="none">PDF</text>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 15-5-5-9 9"/>',
  text: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  lock: '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  ai: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m10.5 12.5 8-8M16 5l2 2M13 8l2 2"/>',
  code: '<path d="m8 9-4 3 4 3M16 9l4 3-4 3M13 6l-2 12"/>',
  hash: '<path d="M5 9h14M5 15h14M10 3 7 21M17 3l-3 18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  gift: '<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13"/><path d="M12 8c-1.2 0-3-1-3-2.6A2.4 2.4 0 0 1 11.4 3c1.6 0 2.6 2 .6 5ZM12 8c1.2 0 3-1 3-2.6A2.4 2.4 0 0 0 12.6 3c-1.6 0-2.6 2-.6 5Z"/>',
  gauge: '<circle cx="12" cy="13" r="8"/><path d="M12 13 16 9M9 4.6l.3 1M15 4.6l-.3 1M4.6 9l1 .3M19.4 9l-1 .3"/>',
  default: '<circle cx="12" cy="12" r="9"/>',
};

function relatedIconSvg(key) {
  const paths = RELATED_ICONS[key] || RELATED_ICONS.default;
  return '<svg class="mea-article-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + paths + "</svg>";
}

(function () {
  const articleBody = document.querySelector(".mea-article-body");
  if (!articleBody) return; // bukan halaman artikel

  const currentLang = document.body.getAttribute("data-lang-current") || "id";

  const slug = location.pathname.split("/").filter(Boolean).pop();
  if (!slug || !slug.endsWith(".html")) return;
  const currentId = slug.replace(/\.html$/, "");

  fetch("/data/articles.json")
    .then(function (res) { return res.json(); })
    .then(function (data) {
      const current = data.find(function (a) {
        return a.id === currentId && (a.lang || "id") === currentLang;
      });
      if (!current) return;

      const currentKeywords = (current.keywords || []).map(function (k) { return k.toLowerCase(); });

      const candidates = data.filter(function (a) {
        return (a.lang || "id") === currentLang && a.id !== currentId;
      });

      candidates.forEach(function (a) {
        let score = 0;
        if (a.category === current.category) score += 2;
        (a.keywords || []).forEach(function (k) {
          if (currentKeywords.indexOf(k.toLowerCase()) !== -1) score += 1;
        });
        a._score = score;
      });

      candidates.sort(function (a, b) {
        if (b._score !== a._score) return b._score - a._score;
        return new Date(b.date) - new Date(a.date);
      });

      let picked = candidates.filter(function (a) { return a._score > 0; }).slice(0, 3);
      if (picked.length < 3) {
        const pickedIds = picked.map(function (a) { return a.id; });
        const extra = candidates.filter(function (a) { return pickedIds.indexOf(a.id) === -1; });
        picked = picked.concat(extra.slice(0, 3 - picked.length));
      }
      if (picked.length === 0) return;

      const section = document.createElement("section");
      section.className = "mea-related-articles";
      section.innerHTML =
        "<h2>" + (RELATED_LABELS[currentLang] || RELATED_LABELS.id) + "</h2>" +
        '<div class="mea-article-grid">' +
          picked.map(function (a) {
            return (
              '<a href="' + a.url + '" class="mea-article-card glass">' +
                relatedIconSvg(a.icon) +
                "<h3>" + a.title + "</h3>" +
                "<p>" + a.desc + "</p>" +
                '<span class="mea-article-date">' + a.date + "</span>" +
              "</a>"
            );
          }).join("") +
        "</div>";

      articleBody.insertAdjacentElement("afterend", section);
    })
    .catch(function () {
      // Gagal fetch -- diam aja, gak kasih error ke user, section cuma gak muncul.
    });
})();
