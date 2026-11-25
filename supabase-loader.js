// Karama storefront: load products from Supabase (added 2026-11-25)
// Keeps the built-in catalog as fallback if the fetch fails.
(function () {
  var cfg = window.KARAMA_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;

  var COLORS = [
    "from-amber-100 to-orange-50",
    "from-rose-100 to-pink-50",
    "from-emerald-100 to-teal-50",
    "from-sky-100 to-indigo-50",
    "from-violet-100 to-purple-50",
    "from-lime-100 to-green-50"
  ];

  function iconFor(cat, name) {
    var s = (cat + " " + name).toLowerCase();
    if (s.indexOf("perfume") > -1 || s.indexOf("fragrance") > -1 || s.indexOf("spray") > -1 || s.indexOf("splash") > -1) return "perfume";
    if (s.indexOf("serum") > -1 || s.indexOf("oil") > -1) return "serum";
    if (s.indexOf("makeup") > -1 || s.indexOf("lip") > -1 || s.indexOf("nail") > -1 || s.indexOf("lash") > -1 || s.indexOf("mascara") > -1 || s.indexOf("foundation") > -1) return "makeup";
    if (s.indexOf("bundle") > -1 || s.indexOf("kit") > -1 || s.indexOf("trio") > -1 || s.indexOf("routine") > -1) return "bundle";
    return "cream";
  }

  function mapRow(r, i) {
    var cat = r.category || "الكل";
    var name = r.name || "";
    return {
      id: String(r.sku),
      name: name,
      category: cat,
      isBundle: !!r.is_bundle || /bundle|kit|trio|routine|gift set/i.test(name),
      oldPrice: Number(r.old_price) || 0,
      newPrice: Number(r.new_price) || 0,
      badge: r.badge || "",
      tags: Array.isArray(r.tags) ? r.tags : [],
      shortDesc: r.short_desc || "",
      icon: iconFor(cat, name),
      color: COLORS[i % COLORS.length],
      details: (r.details && typeof r.details === "object") ? r.details : {},
      imageUrl: r.image_url || ""
    };
  }

  // Product card: same markup as the original, with a real photo when available
  window.productCardHTML = function (p) {
    var saving = p.oldPrice > p.newPrice ? Math.round(((p.oldPrice - p.newPrice) / p.oldPrice) * 100) : 0;
    var visual = p.imageUrl
      ? '<img src="' + p.imageUrl + '" alt="" loading="lazy" class="absolute inset-0 h-full w-full object-cover" onerror="this.style.display=\'none\'">'
      : getProductIllustration(p.icon);
    return '<article class="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col">'
      + '<div onclick="openProductModal(\'' + p.id + '\')" class="cursor-pointer relative h-44 bg-gradient-to-br ' + p.color + ' flex items-center justify-center border-b border-stone-100">'
      + (p.badge ? '<span class="absolute top-3 right-3 z-10 bg-brand-ink/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">' + p.badge + '</span>' : '')
      + (saving > 0 ? '<span class="absolute top-3 left-3 z-10 bg-white/90 text-rose-700 text-[11px] font-extrabold px-2 py-1 rounded-full border border-rose-100">خصم ' + saving + '%</span>' : '')
      + visual
      + '</div>'
      + '<div class="p-4 flex-1 flex flex-col">'
      + '<span class="text-[11px] font-bold text-brand-gold mb-1">' + p.category + '</span>'
      + '<h4 onclick="openProductModal(\'' + p.id + '\')" class="cursor-pointer font-extrabold text-sm sm:text-base leading-snug mb-1.5 hover:text-brand-gold transition">' + p.name + '</h4>'
      + '<p class="text-xs text-brand-muted leading-relaxed mb-3 flex-1">' + p.shortDesc + '</p>'
      + '<div class="flex items-center justify-between gap-2 pt-3 border-t border-stone-100">'
      + '<div><span class="font-extrabold text-base text-brand-ink">' + formatEGP(p.newPrice) + '</span>'
      + (p.oldPrice > p.newPrice ? '<span class="block text-[11px] text-stone-400 line-through">' + formatEGP(p.oldPrice) + '</span>' : '')
      + '</div>'
      + '<div class="flex gap-1.5">'
      + '<button onclick="openProductModal(\'' + p.id + '\')" class="px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold hover:bg-stone-50 transition">التفاصيل</button>'
      + '<button onclick="addToCart(\'' + p.id + '\')" class="px-3.5 py-2 rounded-xl bg-brand-ink hover:bg-brand-gold text-white text-xs font-bold transition">أضف للسلة</button>'
      + '</div></div></div></article>';
  };

  // Product modal: swap the illustration for the real photo after it opens
  var _openProductModal = window.openProductModal;
  window.openProductModal = function (id) {
    _openProductModal(id);
    var p = PRODUCTS.find(function (x) { return x.id === id; });
    if (!p || !p.imageUrl) return;
    var body = document.getElementById("product-modal-body");
    if (!body) return;
    var svg = body.querySelector("svg");
    if (!svg) return;
    var img = document.createElement("img");
    img.src = p.imageUrl;
    img.alt = "";
    img.style.cssText = "width:100%;max-height:240px;object-fit:cover;border-radius:12px;";
    svg.replaceWith(img);
  };

  function fetchPage(offset) {
    var url = cfg.SUPABASE_URL + "/rest/v1/products?select=sku,name,category,old_price,new_price,stock,badge,short_desc,image_url,is_bundle,tags,details&stock=gt.0&order=name.asc&limit=1000&offset=" + offset;
    return fetch(url, { headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY } })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
  }

  function loadAll(offset, acc) {
    return fetchPage(offset).then(function (rows) {
      acc = acc.concat(rows);
      if (rows.length === 1000) return loadAll(offset + 1000, acc);
      return acc;
    });
  }

  // Keep the original sample product: the cart upsell references it by id
  var sampleProduct = PRODUCTS.find(function (p) { return p.id === "sample-10ml"; });

  loadAll(0, []).then(function (rows) {
    if (!rows.length) return;
    var mapped = rows.map(mapRow);
    if (sampleProduct && !mapped.some(function (p) { return p.id === "sample-10ml"; })) mapped.push(sampleProduct);
    PRODUCTS.length = 0;
    Array.prototype.push.apply(PRODUCTS, mapped);
    var cats = [];
    mapped.forEach(function (p) { if (cats.indexOf(p.category) === -1) cats.push(p.category); });
    cats.sort();
    CATEGORIES.length = 0;
    CATEGORIES.push("الكل");
    Array.prototype.push.apply(CATEGORIES, cats);
    cart = cart.filter(function (i) { return PRODUCTS.some(function (p) { return p.id === i.id; }); });
    saveCart();
    renderCategoryTabs();
    renderBundles();
    renderProducts();
    renderCart();
  }).catch(function (e) { console.warn("Supabase products load failed, keeping built-in catalog.", e); });
})();
