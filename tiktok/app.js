// Orbi Shopping — app.js (final)
// Load products data from JSON and initialize the app

let products = [];

fetch("products.json")
  .then((res) => res.json())
  .then((data) => {
    products = Array.isArray(data) ? data : [];
    initApp();
  })
  .catch((err) => {
    console.error("Error loading products.json", err);
  });

function initApp() {
  // =========================
  // 1) State + Elements
  // =========================
  const categories = ["ทั้งหมด", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
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
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Favorites (localStorage)
  const LS_FAVS = "bp_favs_v1";
  const favGrid = document.getElementById("favGrid");
  const favEmpty = document.getElementById("favEmpty");
  const favCount = document.getElementById("favCount");
  const catCount = document.getElementById("catCount");

  function loadFavs() {
    try {
      const raw = localStorage.getItem(LS_FAVS);
      const list = JSON.parse(raw || "[]");
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }
  function saveFavs(list) {
    localStorage.setItem(LS_FAVS, JSON.stringify(list));
  }
  function isFav(id) {
    return loadFavs().includes(id);
  }
  function toggleFav(id) {
    const list = loadFavs();
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else list.push(id);
    saveFavs(list);
    refreshCounters();
  }

  function refreshCounters() {
    const favs = loadFavs().length;
    if (favCount) favCount.textContent = String(favs);
    if (catCount) catCount.textContent = String(Math.max(0, categories.length - 1));
  }

  // =========================
  // 2) Utilities
  // =========================
  function chipClass(isActive) {
    return isActive
      ? "px-4 py-2 rounded-2xl bg-white/90 text-black font-extrabold shadow-soft"
      : "px-4 py-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition font-semibold text-white/85";
  }

  function badgePill(text) {
    const map = {
      "คัดแล้ว": "bg-[#25F4EE]/15 text-[#25F4EE] border-[#25F4EE]/25",
      "ตรงปก": "bg-emerald-400/15 text-emerald-200 border-emerald-400/25",
      "คุ้มค่า": "bg-sky-400/15 text-sky-200 border-sky-400/25",
      "รีวิวเยอะ": "bg-white/10 text-white/80 border-white/10",
      "ไวรัล": "bg-fuchsia-400/15 text-fuchsia-200 border-fuchsia-400/25",
      // derived
      "ฟรี": "bg-pink-400/15 text-pink-200 border-pink-400/25",
      "ลด": "bg-yellow-300/15 text-yellow-200 border-yellow-300/25",
      "หมดสต็อก": "bg-red-400/15 text-red-200 border-red-400/25",
      "ปิดสินค้า": "bg-white/10 text-white/75 border-white/10",
    };

    let cls = map[text];
    if (!cls) {
      if (typeof text === "string" && text.startsWith("ลด")) cls = map["ลด"];
      else cls = "bg-white/10 text-white/80 border-white/10";
    }

    return `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${cls} backdrop-blur">${text}</span>`;
  }

  function money(n) {
    const num = Number(n) || 0;
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  // ✅ Grade mapping: A+ ... C (ต่ำสุด C)
  // ปรับ threshold ได้ตามใจ
  function scoreLabel(score) {
    const s = Number(score) || 0;
    if (s >= 95) return { t: "A+", cls: "bg-[#25F4EE] text-black" };
    if (s >= 90) return { t: "A", cls: "bg-[#FE2C55] text-white" };
    if (s >= 85) return { t: "B+", cls: "bg-sky-500 text-white" };
    if (s >= 80) return { t: "B", cls: "bg-indigo-500 text-white" };
    if (s >= 75) return { t: "C+", cls: "bg-yellow-400 text-black" };
    return { t: "C", cls: "bg-white/20 text-white" };
  }

  function heartBtnHTML(pId) {
    const active = isFav(pId);
    return `
      <button data-fav="${pId}"
        class="h-12 w-12 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition grid place-items-center"
        title="ถูกใจ">
        <svg class="h-6 w-6 ${active ? "text-[#FE2C55]" : "text-white/70"}"
          viewBox="0 0 24 24" fill="${active ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2">
          <path d="M20.8 8.6c0 6.2-8.8 11.4-8.8 11.4S3.2 14.8 3.2 8.6A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.4z"/>
        </svg>
      </button>
    `;
  }

  function safeText(x) {
    return (x ?? "").toString();
  }

  // =========================
  // 3) Chips
  // =========================
  function renderChips() {
    if (!chipRow) return;

    chipRow.innerHTML = categories
      .map(
        (cat) => `
      <button class="${chipClass(cat === activeCategory)}" data-cat="${cat}">
        ${cat}
      </button>
    `
      )
      .join("");

    chipRow.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeCategory = btn.dataset.cat || "ทั้งหมด";
        renderChips();
        renderGrid();
      });
    });
  }

  // =========================
  // 4) Product Cards (TikTok Shop-ish on mobile)
  // =========================
  function buildDerivedBadges(p) {
    const derivedBadges = [];
    if (p.isFree || Number(p.price) === 0) derivedBadges.push("ฟรี");
    if (p.discount && Number(p.discount) > 0) derivedBadges.push(`ลด ${p.discount}%`);
    if (p.status === "outOfStock") derivedBadges.push("หมดสต็อก");
    if (p.status === "discontinued") derivedBadges.push("ปิดสินค้า");
    return derivedBadges;
  }

  function getEffectivePrice(p) {
    const price = Number(p.price) || 0;
    const disc = Number(p.discount) || 0;
    if (p.isFree || price === 0) return 0;
    return Math.max(0, price * (1 - disc / 100));
  }

  function priceHTML(p) {
    const cur = safeText(p.currency) || "฿";
    const effective = getEffectivePrice(p);

    if (p.isFree || effective === 0) {
      return `<span class="font-extrabold text-lg text-emerald-300">ฟรี</span>`;
    }
    if (p.discount && Number(p.discount) > 0) {
      return `
        <div class="flex flex-col items-end">
          <span class="text-[11px] text-white/40 line-through">${cur}${money(p.price)}</span>
          <span class="font-extrabold text-lg">${cur}${money(Math.round(effective))}</span>
        </div>
      `;
    }
    return `<span class="font-extrabold text-lg">${cur}${money(p.price)}</span>`;
  }

  function renderGrid() {
    if (!grid) return;

    const q = (searchInput?.value || "").trim().toLowerCase();

    let list = products
      .filter((p) => (activeCategory === "ทั้งหมด" ? true : p.category === activeCategory))
      .filter((p) => {
        if (!q) return true;
        const name = safeText(p.name).toLowerCase();
        const cat = safeText(p.category).toLowerCase();
        return name.includes(q) || cat.includes(q);
      });

    const sort = sortSelect?.value || "featured";
    if (sort === "score_desc") list.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    if (sort === "price_asc") list.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    if (sort === "price_desc") list.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));

    grid.innerHTML = list
      .map((p) => {
        const s = scoreLabel(p.score);
        const derivedBadges = buildDerivedBadges(p);

        const disabled = p.status === "outOfStock" || p.status === "discontinued";
        const buyBtnClasses = disabled
          ? "flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/10 text-white/40 font-extrabold shadow-card cursor-not-allowed"
          : "flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl btnPrimary font-extrabold shadow-card hover:opacity-95 transition";

        const buyBtnLabel = disabled ? (p.status === "outOfStock" ? "หมดสต็อก" : "ปิดสินค้า") : "สั่งซื้อ";

        const badges = Array.isArray(p.badges) ? p.badges : [];

        return `
        <article class="group rounded-app border border-white/10 bg-white/5 hover:bg-white/10 transition overflow-hidden cursor-pointer"
                 data-id="${safeText(p.id)}">
          <!-- image -->
          <div class="relative">
            <img src="${safeText(p.image)}" alt="${safeText(p.name)}"
                 class="h-52 w-full object-cover group-hover:scale-[1.02] transition duration-500">

            <div class="absolute top-3 left-3 flex flex-wrap gap-2">
              ${badges.map((b) => badgePill(b)).join("")}
              ${derivedBadges.map((b) => badgePill(b)).join("")}
            </div>

            <!-- score bubble -->
            <div class="absolute top-3 right-3">
              <span class="inline-flex items-center justify-center h-10 w-10 rounded-2xl ${s.cls} font-extrabold shadow-soft">
                ${s.t}
              </span>
            </div>
          </div>

          <!-- body -->
          <div class="p-5">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="font-extrabold text-lg leading-snug text-white">${safeText(p.name)}</h3>
                <p class="text-sm text-white/55 mt-1">${safeText(p.category)}</p>
              </div>

              <div class="text-right shrink-0">
                <div class="text-xs text-white/50">ราคา</div>
                ${priceHTML(p)}
              </div>
            </div>

            <!-- highlights (เดสก์ท็อปค่อยโชว์ / มือถือถูกซ่อนด้วย CSS ใน index.html) -->
            <ul class="mt-4 grid gap-2 text-sm text-white/80">
              ${(Array.isArray(p.highlights) ? p.highlights : []).slice(0, 3).map((h) => `
                <li class="flex items-start gap-2">
                  <span class="mt-1 h-2 w-2 rounded-full" style="background: var(--cyan)"></span>
                  <span>${safeText(h)}</span>
                </li>
              `).join("")}
            </ul>

            <div class="mt-5 flex gap-3">
              <a href="${disabled ? "#" : safeText(p.buyUrl)}" target="_blank" rel="noopener"
                 class="${buyBtnClasses}">
                ${buyBtnLabel}
                ${disabled ? "" : '<span aria-hidden="true">↗</span>'}
              </a>

              ${heartBtnHTML(p.id)}

              <button data-copy="${safeText(p.buyUrl)}"
                      class="h-12 w-12 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition grid place-items-center"
                      title="คัดลอกลิงก์">
                ⧉
              </button>
            </div>

            <p class="mt-3 text-xs text-white/50">
              *กดแล้วไปยัง TikTok Shop/ผู้ขายโดยตรง
            </p>
          </div>
        </article>
      `;
      })
      .join("");

    // copy link
    grid.querySelectorAll("button[data-copy]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(btn.dataset.copy || "");
          btn.textContent = "✓";
          setTimeout(() => (btn.textContent = "⧉"), 900);
        } catch {
          alert("คัดลอกไม่สำเร็จ (เบราว์เซอร์ไม่อนุญาต)");
        }
      });
    });

    // fav toggle
    grid.querySelectorAll("button[data-fav]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFav(btn.dataset.fav);
        renderGrid();
        renderFavsGrid();
      });
    });

    // card click to open product details
    grid.querySelectorAll("article[data-id]").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest("button") || e.target.closest("a")) return;
        openProductDetail(card.dataset.id);
      });
    });
  }

  // =========================
  // 5) Categories Page Cards
  // =========================
  function renderCategoryCards() {
    const wrap = document.getElementById("catCards");
    if (!wrap) return;

    const cats = categories.filter((c) => c !== "ทั้งหมด");
    wrap.innerHTML = [
      `
      <button class="p-5 rounded-app border border-white/10 bg-white/5 hover:bg-white/10 transition text-left"
        data-catpick="ทั้งหมด">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xs text-white/55">ดูทั้งหมด</div>
            <div class="text-lg font-extrabold mt-1 text-white">ทั้งหมด</div>
          </div>
          <div class="h-10 w-10 rounded-2xl bg-white/10 text-white grid place-items-center font-extrabold">∞</div>
        </div>
        <div class="text-sm text-white/70 mt-3">แสดงสินค้าทุกหมวด</div>
      </button>
      `,
      ...cats.map((c) => {
        const count = products.filter((p) => p.category === c).length;
        const badge = count >= 3 ? "Hot" : "New";
        return `
          <button class="p-5 rounded-app border border-white/10 bg-white/5 hover:bg-white/10 transition text-left"
            data-catpick="${safeText(c)}">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs text-white/55">หมวด</div>
                <div class="text-lg font-extrabold mt-1 text-white">${safeText(c)}</div>
              </div>
              <div class="px-3 py-1.5 rounded-full text-xs font-extrabold border
                ${badge === "Hot"
                  ? "bg-[#FE2C55]/15 text-[#FE2C55] border-[#FE2C55]/25"
                  : "bg-[#25F4EE]/15 text-[#25F4EE] border-[#25F4EE]/25"}">
                ${badge}
              </div>
            </div>
            <div class="text-sm text-white/70 mt-3">มีสินค้า ${count} รายการ</div>
          </button>
        `;
      }),
    ].join("");

    wrap.querySelectorAll("button[data-catpick]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeCategory = btn.dataset.catpick || "ทั้งหมด";
        renderChips();
        renderGrid();
        switchView("home");
        setTimeout(() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
      });
    });
  }

  // =========================
  // 6) Favorites Page
  // =========================
  function renderFavsGrid() {
    if (!favGrid || !favEmpty) return;

    const favIds = loadFavs();
    const list = products.filter((p) => favIds.includes(p.id));

    favEmpty.classList.toggle("hidden", list.length !== 0);

    favGrid.innerHTML = list
      .map((p) => {
        const s = scoreLabel(p.score);
        const derivedBadges = buildDerivedBadges(p);
        const badges = Array.isArray(p.badges) ? p.badges : [];

        const disabled = p.status === "outOfStock" || p.status === "discontinued";
        const buyBtnClasses = disabled
          ? "flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/10 text-white/40 font-extrabold shadow-card cursor-not-allowed"
          : "flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl btnPrimary font-extrabold shadow-card hover:opacity-95 transition";

        const buyBtnLabel = disabled ? (p.status === "outOfStock" ? "หมดสต็อก" : "ปิดสินค้า") : "สั่งซื้อ";

        return `
        <article class="group rounded-app border border-white/10 bg-white/5 hover:bg-white/10 transition overflow-hidden cursor-pointer"
                 data-id="${safeText(p.id)}">
          <div class="relative">
            <img src="${safeText(p.image)}" alt="${safeText(p.name)}"
                 class="h-52 w-full object-cover group-hover:scale-[1.02] transition duration-500">
            <div class="absolute top-3 left-3 flex flex-wrap gap-2">
              ${badges.map((b) => badgePill(b)).join("")}
              ${derivedBadges.map((b) => badgePill(b)).join("")}
            </div>
            <div class="absolute top-3 right-3">
              <span class="inline-flex items-center justify-center h-10 w-10 rounded-2xl ${s.cls} font-extrabold shadow-soft">
                ${s.t}
              </span>
            </div>
          </div>

          <div class="p-5">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="font-extrabold text-lg leading-snug text-white">${safeText(p.name)}</h3>
                <p class="text-sm text-white/55 mt-1">${safeText(p.category)}</p>
              </div>
              <div class="text-right shrink-0">
                <div class="text-xs text-white/50">ราคา</div>
                ${priceHTML(p)}
              </div>
            </div>

            <div class="mt-5 flex gap-3">
              <a href="${disabled ? "#" : safeText(p.buyUrl)}" target="_blank" rel="noopener"
                 class="${buyBtnClasses}">
                ${buyBtnLabel}
                ${disabled ? "" : '<span aria-hidden="true">↗</span>'}
              </a>

              <button data-unfav="${safeText(p.id)}"
                class="h-12 w-12 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition grid place-items-center"
                title="เอาออกจากถูกใจ">
                <svg class="h-6 w-6 text-[#FE2C55]" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                  <path d="M20.8 8.6c0 6.2-8.8 11.4-8.8 11.4S3.2 14.8 3.2 8.6A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.4z"/>
                </svg>
              </button>
            </div>
          </div>
        </article>
      `;
      })
      .join("");

    favGrid.querySelectorAll("button[data-unfav]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFav(btn.dataset.unfav);
        renderGrid();
        renderFavsGrid();
      });
    });

    favGrid.querySelectorAll("article[data-id]").forEach((card) => {
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

  function openModal() {
    if (!modal) return;
    modal.classList.remove("hidden");
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.add("hidden");
  }

  btnOpenHow?.addEventListener("click", openModal);
  btnOpenHowTop?.addEventListener("click", openModal);
  btnOpenHowProfile?.addEventListener("click", openModal);
  btnCloseModal?.addEventListener("click", closeModal);
  btnCloseModal2?.addEventListener("click", closeModal);

  modal?.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("bg-black/70")) closeModal();
  });

  document.getElementById("btnGoHomeFromModal")?.addEventListener("click", () => {
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
    const p = products.find((item) => item.id === id);
    if (!p) return;

    if (detailTitle) detailTitle.textContent = safeText(p.name);
    if (detailCategory) detailCategory.textContent = safeText(p.category);
    if (detailImage) detailImage.src = safeText(p.image);

    const badges = Array.isArray(p.badges) ? p.badges : [];
    const derivedBadges = buildDerivedBadges(p);
    if (detailBadges) detailBadges.innerHTML = badges.map(badgePill).join("") + derivedBadges.map(badgePill).join("");

    const hl = Array.isArray(p.highlights) ? p.highlights : [];
    if (detailHighlights) {
      detailHighlights.innerHTML = hl
        .map(
          (h) => `
        <div class="flex items-start gap-2 text-sm text-white/85">
          <span class="mt-1 h-2 w-2 rounded-full" style="background: var(--cyan)"></span>
          <span>${safeText(h)}</span>
        </div>
      `
        )
        .join("");
    }

    // price
    const cur = safeText(p.currency) || "฿";
    const effective = getEffectivePrice(p);
    if (detailPrice) {
      if (p.isFree || effective === 0) {
        detailPrice.innerHTML = `<span class="font-extrabold text-2xl text-emerald-300">ฟรี</span>`;
      } else if (p.discount && Number(p.discount) > 0) {
        detailPrice.innerHTML = `
          <span class="text-lg text-white/40 line-through mr-2">${cur}${money(p.price)}</span>
          <span class="font-extrabold text-2xl text-white">${cur}${money(Math.round(effective))}</span>
        `;
      } else {
        detailPrice.innerHTML = `<span class="font-extrabold text-2xl text-white">${cur}${money(p.price)}</span>`;
      }
    }

    // status & buy link
    const disabled = p.status === "outOfStock" || p.status === "discontinued";
    if (detailBuyLink) {
      if (disabled) {
        const label = p.status === "outOfStock" ? "หมดสต็อก" : "ปิดสินค้า";
        if (detailStatus) {
          detailStatus.textContent = `สถานะ: ${label}`;
          detailStatus.className = "text-sm font-bold text-white/60";
        }
        detailBuyLink.href = "#";
        detailBuyLink.className =
          "flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/10 text-white/40 font-extrabold shadow-card cursor-not-allowed";
        detailBuyLink.innerHTML = label;
      } else {
        if (detailStatus) {
          detailStatus.textContent = "";
          detailStatus.className = "text-sm font-bold text-white/70";
        }
        detailBuyLink.href = safeText(p.buyUrl);
        detailBuyLink.className =
          "flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl btnPrimary font-extrabold shadow-card hover:opacity-95 transition";
        detailBuyLink.innerHTML = `ซื้อสินค้า <span aria-hidden="true">↗</span>`;
      }
    }

    productModal?.classList.remove("hidden");
  }

  function closeProductModal() {
    productModal?.classList.add("hidden");
  }

  btnCloseProductModal?.addEventListener("click", closeProductModal);
  productModal?.addEventListener("click", (e) => {
    if (e.target === productModal || e.target.classList.contains("bg-black/70")) closeProductModal();
  });

  // =========================
  // 8) Tab Navigation (App-like)
  // =========================
  const tabBtns = document.querySelectorAll(".tabBtn");

  function switchView(name) {
    Object.keys(views).forEach((k) => {
      if (!views[k]) return;
      views[k].classList.toggle("hidden", k !== name);
    });

    tabBtns.forEach((b) => b.classList.toggle("tabActive", b.dataset.view === name));

    if (name === "favs") renderFavsGrid();
    if (name === "profile") refreshCounters();

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  tabBtns.forEach((btn) => btn.addEventListener("click", () => switchView(btn.dataset.view)));

  document.getElementById("btnGoCategories")?.addEventListener("click", () => switchView("categories"));
  document.getElementById("btnBackToHome1")?.addEventListener("click", () => switchView("home"));
  document.getElementById("btnGoHomeFromFavEmpty")?.addEventListener("click", () => switchView("home"));

  document.getElementById("btnClearFavs")?.addEventListener("click", () => {
    saveFavs([]);
    renderFavsGrid();
    renderGrid();
  });

  document.getElementById("btnFocusSearch")?.addEventListener("click", () => {
    switchView("home");
    setTimeout(() => searchInput?.focus(), 120);
  });

  // =========================
  // 9) Cookie Consent (optional)
  // =========================
  const cookieWrap = document.getElementById("cookieConsent");
  const btnAcceptCookie = document.getElementById("btnAcceptCookie");
  const btnDeclineCookie = document.getElementById("btnDeclineCookie");
  const LS_COOKIE = "orbi_cookie_consent_v1";

  function showCookie() {
    cookieWrap?.classList.remove("hidden");
  }
  function hideCookie() {
    cookieWrap?.classList.add("hidden");
  }
  function getCookieConsent() {
    try {
      return localStorage.getItem(LS_COOKIE);
    } catch {
      return null;
    }
  }
  function setCookieConsent(value) {
    try {
      localStorage.setItem(LS_COOKIE, value);
    } catch {}
  }

  if (cookieWrap) {
    const consent = getCookieConsent();
    if (!consent) showCookie();

    btnAcceptCookie?.addEventListener("click", () => {
      setCookieConsent("accepted");
      hideCookie();
    });
    btnDeclineCookie?.addEventListener("click", () => {
      setCookieConsent("declined");
      hideCookie();
    });
  }

  // =========================
  // 10) Events: Search + Sort + Keyboard
  // =========================
  searchInput?.addEventListener("input", renderGrid);
  sortSelect?.addEventListener("change", renderGrid);

  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      switchView("home");
      searchInput?.focus();
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
  switchView("home");
}



// ==============================
// Cookie Consent
// ==============================
const cookieConsent = document.getElementById("cookieConsent");
const btnAcceptCookie = document.getElementById("btnAcceptCookie");
const btnDeclineCookie = document.getElementById("btnDeclineCookie");

const COOKIE_KEY = "orbi_cookie_consent"; // accepted | declined

function showCookieConsent() {
  const consent = localStorage.getItem(COOKIE_KEY);
  if (!consent) {
    cookieConsent.classList.remove("hidden");
  }
}

function hideCookieConsent() {
  cookieConsent.classList.add("hidden");
}

btnAcceptCookie?.addEventListener("click", () => {
  localStorage.setItem(COOKIE_KEY, "accepted");
  hideCookieConsent();

  // 🔥 ถ้ามี Analytics / Pixel ค่อยเริ่มโหลดตรงนี้
  // initAnalytics();
});

btnDeclineCookie?.addEventListener("click", () => {
  localStorage.setItem(COOKIE_KEY, "declined");
  hideCookieConsent();
});

// เรียกตอนโหลดหน้า
document.addEventListener("DOMContentLoaded", showCookieConsent);
