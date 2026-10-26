/*
  MEA BLOG — listing, search, sort, category filter
  ==============================================
  Semua statis, murni client-side. Sumber data: /data/articles.json
  Tambah artikel baru = tambah 1 object ke articles.json (termasuk field
  "icon" untuk ikon konkret di card), tidak perlu ubah index.html atau
  file ini — kecuali menambah ikon baru ke MEA_ICONS.
*/

/* Label kategori/sort/placeholder per bahasa. Struktur kategori (id &
   urutan) sama di semua bahasa — cuma labelnya yang diterjemahkan. */
const BLOG_I18N = {
  id: {
    categories: { all: "Semua", convert: "Konversi", image: "Gambar", text: "Teks", privasi: "Privasi & Keamanan", riset: "Riset & AI", utilitas: "Utilitas", tentang: "Tentang" },
    sorts: { newest: "Terbaru", oldest: "Terlama", az: "A–Z" },
    searchPlaceholder: "Cari artikel… misal 'pdf ke gambar'",
    emptyState: "Belum ada artikel yang cocok. Coba kata kunci lain.",
    loadMore: "Muat lebih banyak",
    showingCount: function (shown, total) { return "Menampilkan " + shown + " dari " + total + " artikel"; },
  },
  en: {
    categories: { all: "All", convert: "Convert", image: "Image", text: "Text", privasi: "Privacy & Security", riset: "Research & AI", utilitas: "Utilities", tentang: "About" },
    sorts: { newest: "Newest", oldest: "Oldest", az: "A–Z" },
    searchPlaceholder: "Search articles… e.g. 'pdf to image'",
    emptyState: "No matching articles yet. Try another keyword.",
    loadMore: "Load more",
    showingCount: function (shown, total) { return "Showing " + shown + " of " + total + " articles"; },
  },
  ja: {
    categories: { all: "すべて", convert: "変換", image: "画像", text: "テキスト", privasi: "プライバシー＆セキュリティ", riset: "リサーチ＆AI", utilitas: "ユーティリティ", tentang: "について" },
    sorts: { newest: "新着順", oldest: "古い順", az: "A–Z" },
    searchPlaceholder: "記事を検索…例：「pdf 画像変換」",
    emptyState: "該当する記事がまだありません。別のキーワードを試してください。",
    loadMore: "もっと見る",
    showingCount: function (shown, total) { return total + "件中" + shown + "件を表示"; },
  },
  zh: {
    categories: { all: "全部", convert: "转换", image: "图片", text: "文本", privasi: "隐私与安全", riset: "研究与AI", utilitas: "实用工具", tentang: "关于" },
    sorts: { newest: "最新", oldest: "最早", az: "A–Z" },
    searchPlaceholder: "搜索文章…例如「pdf 转图片」",
    emptyState: "暂无匹配的文章，试试其他关键词。",
    loadMore: "加载更多",
    showingCount: function (shown, total) { return "显示 " + shown + " / " + total + " 篇文章"; },
  },
  ko: {
    categories: { all: "전체", convert: "변환", image: "이미지", text: "텍스트", privasi: "개인정보 & 보안", riset: "연구 & AI", utilitas: "유틸리티", tentang: "소개" },
    sorts: { newest: "최신순", oldest: "오래된순", az: "A–Z" },
    searchPlaceholder: "글 검색… 예: 'pdf 이미지 변환'",
    emptyState: "일치하는 글이 아직 없습니다. 다른 키워드를 시도해 보세요.",
    loadMore: "더 보기",
    showingCount: function (shown, total) { return "전체 " + total + "개 중 " + shown + "개 표시"; },
  },
};

/* Jumlah kartu yang ditampilkan per "batch". Di-render pakai tombol
   "Muat lebih banyak", bukan numbered pagination -- biar nggak perlu
   reload/scroll-to-top dan state filter/search tetap jalan normal. */
const BLOG_PAGE_SIZE = 24;

const BLOG_CATEGORY_ORDER = ["all", "convert", "image", "text", "privasi", "riset", "utilitas", "tentang"];
const BLOG_SORT_ORDER = ["newest", "oldest", "az"];

/* Ikon konkret per objek/topik (bukan ikon generik kategori).
   "pdf to image" -> ikon dokumen PDF, "image to pdf" -> ikon gambar, dst.
   Tambahkan entri baru di sini kalau ada topik/objek baru. */
const MEA_ICONS = {
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

function meaIconSvg(key) {
  const paths = MEA_ICONS[key] || MEA_ICONS.default;
  return '<svg class="mea-article-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + paths + "</svg>";
}

(function () {
  const gridEl = document.getElementById("mea-article-grid");
  const catEl = document.getElementById("mea-categories");
  const searchEl = document.getElementById("mea-search");
  const sortEl = document.getElementById("mea-sort");

  if (!gridEl) return; // halaman ini bukan homepage

  // Bahasa listing ini ditentukan dari data-lang-current di <body>
  // (lihat index.html per-bahasa: /en/index.html, /ja/index.html, dst).
  // Fallback ke "id" kalau atributnya nggak ada atau nggak dikenal.
  var currentLang = document.body.getAttribute("data-lang-current") || "id";
  var i18n = BLOG_I18N[currentLang] || BLOG_I18N.id;

  if (searchEl) searchEl.placeholder = i18n.searchPlaceholder;

  let articles = [];
  let activeCategory = "all";
  let activeSort = "newest";
  let query = "";
  let visibleCount = BLOG_PAGE_SIZE;

  // Wrapper buat tombol "Muat lebih banyak" + info "Menampilkan X dari Y",
  // dibikin sekali sebagai sibling dari grid (bukan hardcode di index.html).
  const loadMoreWrap = document.createElement("div");
  loadMoreWrap.className = "mea-load-more-wrap";
  gridEl.insertAdjacentElement("afterend", loadMoreWrap);

  function renderCategories() {
    catEl.innerHTML = BLOG_CATEGORY_ORDER.map(function (catId) {
      const active = catId === activeCategory ? " active" : "";
      const label = i18n.categories[catId] || catId;
      return '<button type="button" class="mea-category-btn' + active + '" data-cat="' + catId + '">' + label + "</button>";
    }).join("");

    catEl.querySelectorAll(".mea-category-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeCategory = btn.getAttribute("data-cat");
        renderCategories();
        resetPagingAndRender();
      });
    });
  }

  function renderSortOptions() {
    if (!sortEl) return;
    sortEl.innerHTML = BLOG_SORT_ORDER.map(function (sortId) {
      return '<option value="' + sortId + '">' + (i18n.sorts[sortId] || sortId) + "</option>";
    }).join("");
    sortEl.value = activeSort;
  }

  function resetPagingAndRender() {
    visibleCount = BLOG_PAGE_SIZE;
    renderGrid();
  }

  function matchesQuery(article, q) {
    if (!q) return true;
    const haystack = (
      article.title + " " + article.desc + " " + (article.keywords || []).join(" ")
    ).toLowerCase();
    return haystack.includes(q.toLowerCase());
  }

  function sortArticles(list) {
    const copy = list.slice();
    if (activeSort === "newest") {
      copy.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    } else if (activeSort === "oldest") {
      copy.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    } else if (activeSort === "az") {
      copy.sort(function (a, b) { return a.title.localeCompare(b.title); });
    }
    return copy;
  }

  function renderGrid() {
    const filtered = sortArticles(
      articles.filter(function (a) {
        const catOk = activeCategory === "all" || a.category === activeCategory;
        return catOk && matchesQuery(a, query);
      })
    );

    if (filtered.length === 0) {
      gridEl.innerHTML = '<div class="mea-empty-state">' + i18n.emptyState + '</div>';
      loadMoreWrap.innerHTML = "";
      return;
    }

    const visible = filtered.slice(0, visibleCount);

    gridEl.innerHTML = visible.map(function (a) {
      const catLabel = i18n.categories[a.category] || a.category;
      return (
        '<a href="' + a.url + '" class="mea-article-card glass">' +
          meaIconSvg(a.icon) +
          '<span class="mea-category-tag">' + catLabel + "</span>" +
          "<h3>" + a.title + "</h3>" +
          "<p>" + a.desc + "</p>" +
          '<span class="mea-article-date">' + a.date + "</span>" +
        "</a>"
      );
    }).join("");

    renderLoadMore(visible.length, filtered.length);
  }

  function renderLoadMore(shown, total) {
    if (shown >= total) {
      loadMoreWrap.innerHTML = "";
      return;
    }
    loadMoreWrap.innerHTML =
      '<span class="mea-load-more-count">' + i18n.showingCount(shown, total) + "</span>" +
      '<button type="button" class="mea-load-more-btn">' + i18n.loadMore + "</button>";
    const btn = loadMoreWrap.querySelector(".mea-load-more-btn");
    btn.addEventListener("click", function () {
      visibleCount += BLOG_PAGE_SIZE;
      renderGrid();
    });
  }

  fetch("/data/articles.json")
    .then(function (res) { return res.json(); })
    .then(function (data) {
      // Entry lama (belum sempat dikasih field "lang") dianggap "id"
      // lewat fallback di bawah.
      articles = data.filter(function (a) { return (a.lang || "id") === currentLang; });
      renderCategories();
      renderSortOptions();
      renderGrid();
    })
    .catch(function () {
      gridEl.innerHTML = '<div class="mea-empty-state">Gagal memuat daftar artikel.</div>';
    });

  if (searchEl) {
    searchEl.addEventListener("input", function () {
      query = searchEl.value;
      resetPagingAndRender();
    });
  }

  if (sortEl) {
    sortEl.addEventListener("change", function () {
      activeSort = sortEl.value;
      resetPagingAndRender();
    });
  }
})();
