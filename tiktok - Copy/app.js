// Load products data from JSON and initialize the app
let products = [];

fetch('products.json')
  .then(res => res.json())
  .then(data => {
    products = data;
    initApp();
  })
  .catch(err => {
    console.error('Error loading products.json', err);
  });

function initApp() {
  // 1) State + Elements
  const categories = ["ทั้งหมด", ...Array.from(new Set(products.map(p => p.category)))];
  let activeCategory = "ทั้งหมด";

  const views = {
    home: document.getElementById("view-home"),
    categories: document.getElementById("view-categories"),
    favs: document.getElementById("view-favs"),
    profile: document.getElementById("view-profile"),
  };

  const chipRow = document.getElementById("chipRow");
  const grid = document.getElementById("grid");
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");
  const yearEl = document.getElementById("year");

  yearEl.textContent = new Date().getFullYear();

  // Favorites (localStorage)
  const LS_FAVS = "bp_favs_v1";
  const favGrid = document.getElementById("favGrid");
  const favEmpty = document.getElementById("favEmpty");
  const favCount = document.getElementById("favCount");
  const catCount = document.getElementById("catCount");

  function loadFavs() {
    try { return JSON.parse(localStorage.getItem(LS_FAVS) || "[]"); }
    catch { return []; }
  }
  function saveFavs(list) { localStorage.setItem(LS_FAVS, JSON.stringify(list)); }
  function isFav(id) { return loadFavs().includes(id); }
  function toggleFav(id) {
    const list = loadFavs();
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else list.push(id);
    saveFavs(list);
    refreshCounters();
  }

  function refreshCounters(){
    const favs = loadFavs().length;
    if (favCount) favCount.textContent = favs;
    if (catCount) catCount.textContent = String(categories.length - 1);
  }

  // =========================
  // 3) Chips
  // =========================
  function chipClass(isActive){
    return isActive
      ? "px-4 py-2 rounded-2xl bg-slate-900 text-white font-extrabold shadow-soft"
      : "px-4 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition font-semibold text-slate-700";
  }

  function renderChips(){
    chipRow.innerHTML = categories.map(cat => `
      <button class="${chipClass(cat === activeCategory)}" data-cat="${cat}">
        ${cat}
      </button>
    `).join("");

    chipRow.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        activeCategory = btn.dataset.cat;
        renderChips();
        renderGrid();
      });
    });
  }

  // =========================
  // 4) Product Cards
  // =========================
  function badgePill(text){
    // Map common badge styles. Unknown keys default to neutral style.
    const map = {
      "คัดแล้ว": "bg-teal-50 text-teal-700 border-teal-100",
      "ตรงปก": "bg-emerald-50 text-emerald-700 border-emerald-100",
      "คุ้มค่า": "bg-blue-50 text-blue-700 border-blue-100",
      "รีวิวเยอะ": "bg-slate-100 text-slate-700 border-slate-200",
      "ไวรัล": "bg-indigo-50 text-indigo-700 border-indigo-100",
      // derived badges
      "ฟรี": "bg-pink-50 text-pink-700 border-pink-100",
      "ลด": "bg-yellow-50 text-yellow-700 border-yellow-100",
      "หมดสต็อก": "bg-red-50 text-red-700 border-red-100",
      "ปิดสินค้า": "bg-gray-100 text-gray-700 border-gray-200"
    };
    // If text includes "ลด " we treat as generic discount
    let cls = map[text];
    if (!cls) {
      if (text.startsWith("ลด")) cls = map["ลด"];
      else cls = "bg-slate-100 text-slate-700 border-slate-200";
    }
    return `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold border ${cls}">${text}</span>`;
  }

  function money(n){
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function scoreLabel(score) {
  if (score >= 95) return { t: "A+", cls: "bg-emerald-500 text-white" };
  if (score >= 90) return { t: "A",  cls: "bg-teal-500 text-white" };
  if (score >= 85) return { t: "B+", cls: "bg-sky-500 text-white" };
  if (score >= 80) return { t: "B",  cls: "bg-indigo-500 text-white" };
  if (score >= 75) return { t: "C+", cls: "bg-yellow-500 text-black" };
  return              { t: "C",  cls: "bg-slate-500 text-white" };
}


  function heartBtnHTML(pId){
    const active = isFav(pId);
    return `
      <button data-fav="${pId}"
        class="h-12 w-12 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition grid place-items-center"
        title="ถูกใจ">
        <svg class="h-6 w-6 ${active ? "text-rose-500" : "text-slate-500"}"
          viewBox="0 0 24 24" fill="${active ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2">
          <path d="M20.8 8.6c0 6.2-8.8 11.4-8.8 11.4S3.2 14.8 3.2 8.6A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.4z"/>
        </svg>
      </button>
    `;
  }

  function renderGrid(){
    const q = (searchInput.value || "").trim().toLowerCase();

    let list = products
      .filter(p => activeCategory === "ทั้งหมด" ? true : p.category === activeCategory)
      .filter(p => q ? (p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) : true);

    const sort = sortSelect.value;
    if (sort === "score_desc") list.sort((a,b) => b.score - a.score);
    if (sort === "price_asc")  list.sort((a,b) => {
      // Use effective price with discount
      const pa = a.isFree ? 0 : Math.max(0, a.price * (1 - (a.discount||0)/100));
      const pb = b.isFree ? 0 : Math.max(0, b.price * (1 - (b.discount||0)/100));
      return pa - pb;
    });
    if (sort === "price_desc") list.sort((a,b) => {
      const pa = a.isFree ? 0 : Math.max(0, a.price * (1 - (a.discount||0)/100));
      const pb = b.isFree ? 0 : Math.max(0, b.price * (1 - (b.discount||0)/100));
      return pb - pa;
    });

    grid.innerHTML = list.map(p => {
      const s = scoreLabel(p.score);

      // Build derived badges based on status, isFree, discount
      const derivedBadges = [];
      if (p.isFree || p.price === 0) derivedBadges.push("ฟรี");
      if (p.discount && p.discount > 0) derivedBadges.push(`ลด ${p.discount}%`);
      if (p.status === "outOfStock") derivedBadges.push("หมดสต็อก");
      if (p.status === "discontinued") derivedBadges.push("ปิดสินค้า");

      // Determine effective price
      const effectivePrice = p.isFree || p.price === 0 ? 0 : Math.max(0, p.price * (1 - (p.discount||0)/100));

      // Price HTML: show original and discounted if applicable
      let priceHTML = "";
      if (p.isFree || effectivePrice === 0) {
        priceHTML = `<span class="font-extrabold text-lg text-emerald-600">ฟรี</span>`;
      } else if (p.discount && p.discount > 0) {
        priceHTML = `
          <div class="flex flex-col items-end">
            <span class="text-xs text-slate-400 line-through">${p.currency}${money(p.price)}</span>
            <span class="font-extrabold text-lg">${p.currency}${money(Math.round(effectivePrice))}</span>
          </div>
        `;
      } else {
        priceHTML = `<span class="font-extrabold text-lg">${p.currency}${money(p.price)}</span>`;
      }

      // Determine if buy button should be disabled
      const disabled = p.status === "outOfStock" || p.status === "discontinued";
      const buyBtnClasses = disabled
        ? "flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-200 text-gray-500 font-extrabold shadow-card cursor-not-allowed"
        : "flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-green-600 from-teal-600 to-blue-600 text-white font-extrabold shadow-card hover:opacity-95 transition";
      const buyBtnLabel = disabled ? (p.status === "outOfStock" ? "หมดสต็อก" : "ปิดสินค้า") : "สั่งซื้อผ่าน TikTok";

      return `
        <article class="group rounded-app border border-slate-200 bg-white shadow-soft hover:shadow-card transition overflow-hidden cursor-pointer" data-id="${p.id}">
          <div class="relative">
            <img src="${p.image}" alt="${p.name}"
                 class="h-52 w-full object-cover group-hover:scale-[1.02] transition duration-500">
            <div class="absolute top-4 left-4 flex flex-wrap gap-2">
              ${p.badges.map(b => badgePill(b)).join("")}
              ${derivedBadges.map(b => badgePill(b)).join("")}
            </div>
            <div class="absolute top-4 right-4 flex items-center gap-2">
              <span class="inline-flex items-center justify-center h-10 w-10 rounded-2xl ${s.cls} font-extrabold shadow-soft">
                ${s.t}
              </span>
            </div>
          </div>

          <div class="p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="font-extrabold text-lg leading-snug">${p.name}</h3>
                <p class="text-sm text-slate-500 mt-1">${p.category}</p>
              </div>
              <div class="text-right">
                <div class="text-xs text-slate-500">ราคาโดยประมาณ</div>
                ${priceHTML}
              </div>
            </div>

            <ul class="mt-4 grid gap-2 text-sm text-slate-700">
              ${p.highlights.slice(0,3).map(h => `
                <li class="flex items-start gap-2">
                  <span class="mt-1 h-2 w-2 rounded-full bg-teal-500"></span>
                  <span>${h}</span>
                </li>
              `).join("")}
            </ul>

            <div class="mt-5 flex gap-3">
              <a href="${disabled ? '#' : p.buyUrl}" target="_blank" rel="noopener"
                 class="${buyBtnClasses}">
                ${buyBtnLabel}
                ${disabled ? '' : '<span aria-hidden="true">↗</span>'}
              </a>

              ${heartBtnHTML(p.id)}

              <button data-copy="${p.buyUrl}"
                      class="h-12 w-12 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition grid place-items-center"
                      title="คัดลอกลิงก์">
                ⧉
              </button>
            </div>

            <p class="mt-3 text-xs text-slate-500">
              *กดแล้วไปยัง TikTok Shop/ผู้ขายโดยตรง เว็บไซต์นี้เป็นตัวกลางในการคัดเลือกสินค้า
            </p>
          </div>
        </article>
      `;
    }).join("");

    // copy link
    grid.querySelectorAll("button[data-copy]").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(btn.dataset.copy);
          btn.textContent = "✓";
          setTimeout(() => (btn.textContent = "⧉"), 900);
        } catch {
          alert("คัดลอกไม่สำเร็จ (เบราว์เซอร์ไม่อนุญาต)");
        }
      });
    });

    // fav toggle
    grid.querySelectorAll("button[data-fav]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFav(btn.dataset.fav);
        renderGrid();      // ให้หัวใจรีเฟรชสีทันที
        renderFavsGrid();  // ถ้าอยู่หน้า favs จะตามทัน
      });
    });

    // card click to open product details
    grid.querySelectorAll("article[data-id]").forEach(card => {
      card.addEventListener("click", (e) => {
        // ignore click if clicked inside anchor or button
        if (e.target.closest("button") || e.target.closest("a")) return;
        openProductDetail(card.dataset.id);
      });
    });
  }

  // =========================
  // 5) Categories Page Cards
  // =========================
  function renderCategoryCards(){
    const wrap = document.getElementById("catCards");
    const cats = categories.filter(c => c !== "ทั้งหมด");
    wrap.innerHTML = [
      // รวมทั้งหมด
      `
      <button class="p-5 rounded-app border border-slate-200 bg-white hover:bg-slate-50 transition text-left"
        data-catpick="ทั้งหมด">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xs text-slate-500">ดูทั้งหมด</div>
            <div class="text-lg font-extrabold mt-1">ทั้งหมด</div>
          </div>
          <div class="h-10 w-10 rounded-2xl bg-slate-900 text-white grid place-items-center font-extrabold">∞</div>
        </div>
        <div class="text-sm text-slate-600 mt-3">แสดงสินค้าทุกหมวด</div>
      </button>
      `,
      ...cats.map((c, idx) => {
        const count = products.filter(p => p.category === c).length;
        const badge = count >= 3 ? "Hot" : "New";
        return `
          <button class="p-5 rounded-app border border-slate-200 bg-white hover:bg-slate-50 transition text-left"
            data-catpick="${c}">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs text-slate-500">หมวด</div>
                <div class="text-lg font-extrabold mt-1">${c}</div>
              </div>
              <div class="px-3 py-1.5 rounded-full text-xs font-extrabold border
                ${badge === "Hot" ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-teal-50 text-teal-700 border-teal-100"}">
                ${badge}
              </div>
            </div>
            <div class="text-sm text-slate-600 mt-3">มีสินค้า ${count} รายการ</div>
          </button>
        `;
      })
    ].join("");

    wrap.querySelectorAll("button[data-catpick]").forEach(btn => {
      btn.addEventListener("click", () => {
        activeCategory = btn.dataset.catpick;
        renderChips();
        renderGrid();
        switchView("home");
        // พาไปจุดสินค้า
        setTimeout(() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
      });
    });
  }

  // =========================
  // 6) Favorites Page
  // =========================
  function renderFavsGrid(){
    const favIds = loadFavs();
    const list = products.filter(p => favIds.includes(p.id));

    favEmpty.classList.toggle("hidden", list.length !== 0);
    favGrid.innerHTML = list.map(p => {
      const s = scoreLabel(p.score);
      // derived badges
      const derivedBadges = [];
      if (p.isFree || p.price === 0) derivedBadges.push("ฟรี");
      if (p.discount && p.discount > 0) derivedBadges.push(`ลด ${p.discount}%`);
      if (p.status === "outOfStock") derivedBadges.push("หมดสต็อก");
      if (p.status === "discontinued") derivedBadges.push("ปิดสินค้า");
      // Determine effective price
      const effectivePrice = p.isFree || p.price === 0 ? 0 : Math.max(0, p.price * (1 - (p.discount||0)/100));
      let priceHTML = "";
      if (p.isFree || effectivePrice === 0) {
        priceHTML = `<span class="font-extrabold text-lg text-emerald-600">ฟรี</span>`;
      } else if (p.discount && p.discount > 0) {
        priceHTML = `
          <div class="flex flex-col items-end">
            <span class="text-xs text-slate-400 line-through">${p.currency}${money(p.price)}</span>
            <span class="font-extrabold text-lg">${p.currency}${money(Math.round(effectivePrice))}</span>
          </div>
        `;
      } else {
        priceHTML = `<span class="font-extrabold text-lg">${p.currency}${money(p.price)}</span>`;
      }

      const disabled = p.status === "outOfStock" || p.status === "discontinued";
      const buyBtnClasses = disabled
        ? "flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-200 text-gray-500 font-extrabold shadow-card cursor-not-allowed"
        : "flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-green-600 from-teal-600 to-blue-600 text-white font-extrabold shadow-card hover:opacity-95 transition";
      const buyBtnLabel = disabled ? (p.status === "outOfStock" ? "หมดสต็อก" : "ปิดสินค้า") : "สั่งซื้อผ่าน TikTok";

      return `
        <article class="group rounded-app border border-slate-200 bg-white shadow-soft hover:shadow-card transition overflow-hidden cursor-pointer" data-id="${p.id}">
          <div class="relative">
            <img src="${p.image}" alt="${p.name}"
                 class="h-52 w-full object-cover group-hover:scale-[1.02] transition duration-500">
            <div class="absolute top-4 left-4 flex flex-wrap gap-2">
              ${p.badges.map(b => badgePill(b)).join("")}
              ${derivedBadges.map(b => badgePill(b)).join("")}
            </div>
            <div class="absolute top-4 right-4 flex items-center gap-2">
              <span class="inline-flex items-center justify-center h-10 w-10 rounded-2xl ${s.cls} font-extrabold shadow-soft">
                ${s.t}
              </span>
            </div>
          </div>

          <div class="p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="font-extrabold text-lg leading-snug">${p.name}</h3>
                <p class="text-sm text-slate-500 mt-1">${p.category}</p>
              </div>
              <div class="text-right">
                <div class="text-xs text-slate-500">ราคาโดยประมาณ</div>
                ${priceHTML}
              </div>
            </div>

            <div class="mt-5 flex gap-3">
              <a href="${disabled ? '#' : p.buyUrl}" target="_blank" rel="noopener"
                 class="${buyBtnClasses}">
                ${buyBtnLabel}
                ${disabled ? '' : '<span aria-hidden="true">↗</span>'}
              </a>

              <button data-unfav="${p.id}"
                class="h-12 w-12 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition grid place-items-center"
                title="เอาออกจากถูกใจ">
                <svg class="h-6 w-6 text-rose-500" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                  <path d="M20.8 8.6c0 6.2-8.8 11.4-8.8 11.4S3.2 14.8 3.2 8.6A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.4z"/>
                </svg>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    favGrid.querySelectorAll("button[data-unfav]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFav(btn.dataset.unfav);
        renderGrid();
        renderFavsGrid();
      });
    });

    // Click on card in favourites to open details
    favGrid.querySelectorAll("article[data-id]").forEach(card => {
      card.addEventListener("click", (e) => {
        if (e.target.closest("button") || e.target.closest("a")) return;
        openProductDetail(card.dataset.id);
      });
    });

    refreshCounters();
  }

  // =========================
  // 7) Modal / Detail controls
  // =========================
  const modal = document.getElementById("modal");
  const btnOpenHow = document.getElementById("btnOpenHow");
  const btnOpenHowTop = document.getElementById("btnOpenHowTop");
  const btnOpenHowProfile = document.getElementById("btnOpenHowProfile");
  const btnCloseModal = document.getElementById("btnCloseModal");
  const btnCloseModal2 = document.getElementById("btnCloseModal2");

  function openModal(){ modal.classList.remove("hidden"); }
  function closeModal(){ modal.classList.add("hidden"); }

  btnOpenHow?.addEventListener("click", openModal);
  btnOpenHowTop?.addEventListener("click", openModal);
  btnOpenHowProfile?.addEventListener("click", openModal);
  btnCloseModal?.addEventListener("click", closeModal);
  btnCloseModal2?.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("bg-slate-900/55")) closeModal();
  });

  const btnGoHomeFromModal = document.getElementById("btnGoHomeFromModal");
  btnGoHomeFromModal.addEventListener("click", () => {
    closeModal();
    switchView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Product detail modal
  const productModal = document.getElementById("productModal");
  const btnCloseProductModal = document.getElementById("btnCloseProductModal");
  const detailTitle = document.getElementById("detailTitle");
  const detailCategory = document.getElementById("detailCategory");
  const detailImage = document.getElementById("detailImage");
  const detailBadges = document.getElementById("detailBadges");
  const detailHighlights = document.getElementById("detailHighlights");
  const detailPrice = document.getElementById("detailPrice");
  const detailStatus = document.getElementById("detailStatus");
  const detailBuyLink = document.getElementById("detailBuyLink");

  function openProductDetail(id) {
    const p = products.find(item => item.id === id);
    if (!p) return;
    detailTitle.textContent = p.name;
    detailCategory.textContent = p.category;
    detailImage.src = p.image;
    // badges: base + derived
    const derivedBadges = [];
    if (p.isFree || p.price === 0) derivedBadges.push("ฟรี");
    if (p.discount && p.discount > 0) derivedBadges.push(`ลด ${p.discount}%`);
    if (p.status === "outOfStock") derivedBadges.push("หมดสต็อก");
    if (p.status === "discontinued") derivedBadges.push("ปิดสินค้า");
    detailBadges.innerHTML = p.badges.map(b => badgePill(b)).join("") + derivedBadges.map(b => badgePill(b)).join("");

    // highlights full list
    detailHighlights.innerHTML = p.highlights.map(h => `
      <div class="flex items-start gap-2 text-sm text-slate-700">
        <span class="mt-1 h-2 w-2 rounded-full bg-teal-500"></span>
        <span>${h}</span>
      </div>
    `).join("");

    // price display
    const effectivePrice = p.isFree || p.price === 0 ? 0 : Math.max(0, p.price * (1 - (p.discount||0)/100));
    if (p.isFree || effectivePrice === 0) {
      detailPrice.innerHTML = `<span class="font-extrabold text-2xl text-emerald-600">ฟรี</span>`;
    } else if (p.discount && p.discount > 0) {
      detailPrice.innerHTML = `
        <span class="text-lg text-slate-400 line-through mr-2">${p.currency}${money(p.price)}</span>
        <span class="font-extrabold text-2xl">${p.currency}${money(Math.round(effectivePrice))}</span>
      `;
    } else {
      detailPrice.innerHTML = `<span class="font-extrabold text-2xl">${p.currency}${money(p.price)}</span>`;
    }

    // status and buy link
    if (p.status === "outOfStock") {
      detailStatus.textContent = "สถานะ: หมดสต็อก";
      detailStatus.className = "text-sm font-bold text-red-600";
      detailBuyLink.href = "#";
      detailBuyLink.className = "flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-200 text-gray-500 font-extrabold shadow-card cursor-not-allowed";
      detailBuyLink.innerHTML = "หมดสต็อก";
    } else if (p.status === "discontinued") {
      detailStatus.textContent = "สถานะ: ปิดสินค้า";
      detailStatus.className = "text-sm font-bold text-gray-600";
      detailBuyLink.href = "#";
      detailBuyLink.className = "flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-200 text-gray-500 font-extrabold shadow-card cursor-not-allowed";
      detailBuyLink.innerHTML = "ปิดสินค้า";
    } else {
      detailStatus.textContent = "";
      detailStatus.className = "text-sm font-bold";
      detailBuyLink.href = p.buyUrl;
      detailBuyLink.className = "flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-green-600 from-teal-600 to-blue-600 text-white font-extrabold shadow-card hover:opacity-95 transition";
      detailBuyLink.innerHTML = "ซื้อสินค้า <span aria-hidden=\"true\">↗</span>";
    }

    productModal.classList.remove("hidden");
  }

  function closeProductModal() {
    productModal.classList.add("hidden");
  }

  btnCloseProductModal.addEventListener("click", closeProductModal);
  productModal.addEventListener("click", (e) => {
    if (e.target === productModal || e.target.classList.contains("bg-slate-900/55")) {
      closeProductModal();
    }
  });

  // =========================
  // 8) Tab Navigation (App-like)
  // =========================
  const tabBtns = document.querySelectorAll(".tabBtn");

  function switchView(name){
    Object.keys(views).forEach(k => {
      views[k].classList.toggle("hidden", k !== name);
    });
    tabBtns.forEach(b => b.classList.toggle("tabActive", b.dataset.view === name));

    // ถ้าเข้า fav/profile ให้รีเฟรช
    if (name === "favs") renderFavsGrid();
    if (name === "profile") refreshCounters();

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  tabBtns.forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.view)));

  // ปุ่มลัด
  document.getElementById("btnGoCategories")?.addEventListener("click", () => switchView("categories"));
  document.getElementById("btnBackToHome1")?.addEventListener("click", () => switchView("home"));
  document.getElementById("btnGoHomeFromFavEmpty")?.addEventListener("click", () => switchView("home"));

  document.getElementById("btnClearFavs")?.addEventListener("click", () => {
    saveFavs([]);
    renderFavsGrid();
    renderGrid();
  });

  // Focus search
  document.getElementById("btnFocusSearch")?.addEventListener("click", () => {
    switchView("home");
    setTimeout(() => searchInput.focus(), 120);
  });

  // =========================
  // 9) Events: Search + Sort + Keyboard
  // =========================
  searchInput.addEventListener("input", renderGrid);
  sortSelect.addEventListener("change", renderGrid);

  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      switchView("home");
      searchInput.focus();
    }
    if (e.key === "Escape") {
      closeModal();
      closeProductModal();
    }
  });

  // =========================
  // init
  // =========================
  renderChips();
  renderGrid();
  renderCategoryCards();
  refreshCounters();

  // default view
  switchView("home");
}