/*
  Lang switcher — dropdown pilih bahasa di pojok kanan header.

  Cara pakai di tiap halaman:
  1. Taruh <div id="lang-switcher"></div> di dalam .site-header .container,
     setelah brand-lockup.
  2. Di <body>, kasih atribut:
       data-lang-current="id"
       data-lang-links='{"id":"/id/slug.html","ja":"/ja/slug.html"}'
     Kalau versi bahasa tertentu belum ada, jangan dimasukin ke object itu
     — switcher otomatis arahin ke homepage bahasa itu sebagai fallback,
     ditandai "Segera" di menunya.
  3. Include <script src="/shared/lang-switcher.js" defer></script>.

  Kenapa dibikin generic begini (bukan hardcode per halaman): supaya nambah
  bahasa baru nanti cuma nambah 1 baris di LANGS, bukan edit ulang semua
  file artikel satu-satu.
*/

(function () {
  const LANGS = [
    { code: "id", label: "Bahasa Indonesia" },
    { code: "en", label: "English" },
    { code: "ja", label: "日本語" },
    { code: "ko", label: "한국어" },
    { code: "zh", label: "中文" },
  ];

  function init() {
    const mount = document.getElementById("lang-switcher");
    if (!mount) return;

    const current = document.body.getAttribute("data-lang-current") || "id";
    let links = {};
    try {
      links = JSON.parse(document.body.getAttribute("data-lang-links") || "{}");
    } catch (e) {
      links = {};
    }

    const currentMeta = LANGS.find((l) => l.code === current) || LANGS[0];

    const wrap = document.createElement("div");
    wrap.className = "lang-switcher";

    const btn = document.createElement("button");
    btn.className = "lang-switcher-btn";
    btn.type = "button";
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML =
      '<span>' + currentMeta.code.toUpperCase() + "</span>" +
      '<svg class="lang-switcher-caret" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    const menu = document.createElement("div");
    menu.className = "lang-switcher-menu";
    menu.setAttribute("role", "menu");

    LANGS.forEach(function (lang) {
      const item = document.createElement("a");
      item.className = "lang-switcher-item" + (lang.code === current ? " active" : "");
      item.setAttribute("role", "menuitem");

      const available = !!links[lang.code];
      item.href = available ? links[lang.code] : "/" + lang.code + "/";

      item.innerHTML =
        "<span>" + lang.label + "</span>" +
        (available ? "" : '<span class="lang-switcher-note">Segera</span>');

      // Simpan pilihan manual ke cookie yang sama dipakai functions/[[path]].js
      // buat auto-detect bahasa, supaya auto-detect nggak nimpa pilihan ini lagi.
      item.addEventListener("click", function () {
        try {
          document.cookie = "mea_lang=" + lang.code + "; Path=/; Max-Age=31536000; SameSite=Lax";
        } catch (e) {}
      });

      menu.appendChild(item);
    });

    wrap.appendChild(btn);
    wrap.appendChild(menu);
    mount.appendChild(wrap);

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const isOpen = menu.classList.toggle("open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) {
        menu.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        menu.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
