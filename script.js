/* =========================================================
   Ignite Interior Decors — Interactions (shared across pages)
   Progressive enhancement. Data comes from projects-data.js.
   ========================================================= */
(function () {
  "use strict";

  const root = document.documentElement;
  root.classList.remove("no-js");
  root.classList.add("js");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const PROJECTS = window.IGNITE_PROJECTS || [];

  /* ---------- rAF-throttled scroll bus ---------- */
  const scrollFns = [];
  let ticking = false;
  const onScroll = (fn) => scrollFns.push(fn);
  const runScroll = () => { scrollFns.forEach((fn) => fn()); ticking = false; };
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(runScroll); }
  }, { passive: true });

  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  /* =======================================================
     DYNAMIC CONTENT — render first so .reveal/.count get picked up
     ======================================================= */

  // Featured project cards (homepage)
  function buildFeatured() {
    const grid = $("#featuredGrid");
    if (!grid || !PROJECTS.length) return;
    grid.innerHTML = PROJECTS.slice(0, 4).map((p) => `
      <a class="project-card reveal" href="project.html?p=${encodeURIComponent(p.slug)}" aria-label="${esc(p.title)} — view project">
        <div class="project-media">
          <img src="${esc(p.cover)}" alt="${esc(p.title)} interior" loading="lazy" />
          <span class="project-year">${esc(p.year)}</span>
          <span class="project-open" aria-hidden="true">↗</span>
        </div>
        <div class="project-body">
          <div>
            <h3>${esc(p.title)}</h3>
            <div class="project-cat">${esc(p.category)}</div>
          </div>
          <span class="project-view">View Project →</span>
        </div>
      </a>`).join("");
  }

  // Projects listing rows + cursor-follow preview (projects.html)
  function buildListing() {
    const list = $("#projectList");
    if (!list || !PROJECTS.length) return;
    list.innerHTML = PROJECTS.map((p, i) => `
      <a class="project-row reveal" href="project.html?p=${encodeURIComponent(p.slug)}" data-cover="${esc(p.cover)}">
        <span class="row-index">${String(i + 1).padStart(2, "0")}</span>
        <span class="row-title">${esc(p.title)}</span>
        <span class="row-meta">${esc(p.category)} · ${esc(p.year)}</span>
        <span class="row-arrow" aria-hidden="true">→</span>
      </a>`).join("");

    const preview = $("#hoverPreview");
    if (!preview || reduceMotion || !window.matchMedia("(pointer:fine)").matches) return;
    const img = preview.querySelector("img");
    let raf = null, tx = 0, ty = 0, cx = 0, cy = 0;
    const loop = () => {
      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
      preview.style.left = cx + "px";
      preview.style.top = cy + "px";
      raf = requestAnimationFrame(loop);
    };
    $$(".project-row", list).forEach((row) => {
      row.addEventListener("mouseenter", () => {
        img.src = row.dataset.cover;
        preview.classList.add("show");
        if (!raf) loop();
      });
      row.addEventListener("mouseleave", () => {
        preview.classList.remove("show");
      });
    });
    list.addEventListener("mousemove", (e) => { tx = e.clientX; ty = e.clientY; });
    list.addEventListener("mouseleave", () => {
      preview.classList.remove("show");
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    });
  }

  // Project detail page (project.html?p=slug)
  function buildDetail() {
    const rootEl = $("#projectRoot");
    if (!rootEl || rootEl.dataset.page !== "project-detail" || !PROJECTS.length) return;

    const params = new URLSearchParams(window.location.search);
    const slug = params.get("p");
    let idx = PROJECTS.findIndex((p) => p.slug === slug);
    if (idx === -1) idx = 0;
    const p = PROJECTS[idx];
    const next = PROJECTS[(idx + 1) % PROJECTS.length];

    document.title = p.title + " — Ignite Interior Decors";
    $("#crumbTitle").textContent = p.title;
    $("#pTitle").textContent = p.title;
    $("#pTagline").textContent = p.tagline || "";
    const cover = $("#pCover");
    cover.src = p.cover; cover.alt = p.title + " — cover";
    $("#pIntro").textContent = p.intro || "";
    $("#pBody").innerHTML = (p.body || []).map((t) => `<p>${esc(t)}</p>`).join("");

    $("#pMeta").innerHTML = [
      ["Year", p.year],
      ["Category", p.category],
      ["Location", p.location],
      ["Area", p.area],
      ["Services", p.services]
    ].map(([k, v]) => `<div class="meta-row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");

    $("#pGallery").innerHTML = (p.gallery || []).map((src, i) =>
      `<img src="${esc(src)}" alt="${esc(p.title)} detail ${i + 1}" loading="lazy" />`).join("");

    const nextLink = $("#pNext");
    nextLink.href = "project.html?p=" + encodeURIComponent(next.slug);
    $("#pNextTitle").textContent = next.title;

    window.scrollTo(0, 0);
  }

  buildFeatured();
  buildListing();
  buildDetail();

  /* =======================================================
     Preloader
     ======================================================= */
  (function preloader() {
    const pre = $(".preloader");
    if (!pre) return;
    const hide = () => {
      root.classList.add("loaded");
      pre.addEventListener("transitionend", () => pre.remove(), { once: true });
      setTimeout(() => pre.remove(), 900);
    };
    window.addEventListener("load", hide);
    setTimeout(hide, 900);
  })();

  /* =======================================================
     Staggered scroll reveal
     ======================================================= */
  (function reveals() {
    let items = $$(".reveal");
    if (!items.length) return;
    if (reduceMotion) { items.forEach((el) => el.classList.add("is-visible")); return; }

    items.forEach((el) => {
      const sibs = Array.from(el.parentElement.children).filter((c) => c.classList.contains("reveal"));
      el.style.transitionDelay = Math.min(sibs.indexOf(el), 6) * 80 + "ms";
    });

    const check = () => {
      const trigger = window.innerHeight * 0.88;
      items = items.filter((el) => {
        if (el.getBoundingClientRect().top < trigger) { el.classList.add("is-visible"); return false; }
        return true;
      });
    };
    onScroll(check);
    check();
  })();

  /* =======================================================
     Count-up stats
     ======================================================= */
  (function counters() {
    let nums = $$(".count");
    if (!nums.length) return;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const animate = (el) => {
      const target = parseFloat(el.dataset.count) || 0;
      if (el.dataset.plain === "1" || reduceMotion) { el.textContent = target; return; }
      const dur = 1600;
      let start = null;
      const step = (ts) => {
        if (start === null) start = ts;
        const prog = Math.min((ts - start) / dur, 1);
        el.textContent = Math.round(easeOut(prog) * target);
        if (prog < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const check = () => {
      const trigger = window.innerHeight * 0.9;
      nums = nums.filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < trigger && r.bottom > 0) { animate(el); return false; }
        return true;
      });
    };
    onScroll(check);
    check();
  })();

  /* =======================================================
     Header state + progress + back-to-top
     ======================================================= */
  (function scrollUI() {
    const header = $(".site-header");
    const progress = $(".scroll-progress");
    const toTop = $(".to-top");
    const update = () => {
      const y = window.scrollY || window.pageYOffset;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = docH > 0 ? y / docH : 0;
      if (header) header.classList.toggle("scrolled", y > 40);
      if (progress) progress.style.setProperty("--progress", ratio.toFixed(4));
      if (toTop) toTop.classList.toggle("show", y > 700);
    };
    onScroll(update);
    update();
    if (toTop) toTop.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));
  })();

  /* =======================================================
     Scroll-spy active nav (homepage in-page links)
     ======================================================= */
  (function scrollSpy() {
    // Only run on the homepage (has the hero section). On other pages the
    // active nav item is set in the markup, and the header's #top id must
    // not falsely light up "Home".
    if (!$("#hero")) return;
    const links = $$('.main-nav a[href*="#"]').filter((a) => {
      const href = a.getAttribute("href");
      return href.includes("index.html#") && $(href.replace("index.html", ""));
    });
    if (!links.length) return;
    const map = links.map((a) => ({
      link: a, section: $(a.getAttribute("href").replace("index.html", ""))
    })).filter((o) => o.section);
    const update = () => {
      const pos = window.scrollY + 150;
      let cur = null;
      map.forEach((o) => { if (o.section.offsetTop <= pos) cur = o; });
      links.forEach((l) => l.classList.remove("active"));
      if (cur) cur.link.classList.add("active");
    };
    onScroll(update);
    update();
  })();

  /* =======================================================
     Hero carousel (homepage)
     ======================================================= */
  (function heroCarousel() {
    const wrap = $("#heroCarousel");
    if (!wrap) return;
    const slides = $$(".hero-slide", wrap);
    const dots = $$("#heroThumbs button");
    const hero = $(".hero");
    if (slides.length < 2) return;
    let i = 0, timer = null;
    const go = (n) => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle("active", k === i));
      dots.forEach((d, k) => d.classList.toggle("active", k === i));
    };
    const play = () => { if (!reduceMotion) timer = setInterval(() => go(i + 1), 5000); };
    const stop = () => { clearInterval(timer); timer = null; };
    dots.forEach((d, k) => d.addEventListener("click", () => { stop(); go(k); play(); }));
    if (hero) { hero.addEventListener("mouseenter", stop); hero.addEventListener("mouseleave", play); }
    play();
  })();

  /* =======================================================
     Testimonial carousel
     ======================================================= */
  (function testimonials() {
    const track = $(".testimonial-track");
    const prev = $(".carousel-btn.prev");
    const next = $(".carousel-btn.next");
    if (!track) return;
    const step = () => {
      const card = track.querySelector(".testimonial");
      if (!card) return track.clientWidth;
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 24;
      return card.offsetWidth + gap;
    };
    const atEnd = () => track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    const behavior = reduceMotion ? "auto" : "smooth";
    const goNext = () => atEnd() ? track.scrollTo({ left: 0, behavior }) : track.scrollBy({ left: step(), behavior });
    const goPrev = () => track.scrollBy({ left: -step(), behavior });
    if (next) next.addEventListener("click", goNext);
    if (prev) prev.addEventListener("click", goPrev);
    if (!reduceMotion) {
      let t = null;
      const play = () => { t = setInterval(goNext, 5000); };
      const stop = () => { clearInterval(t); t = null; };
      play();
      ["mouseenter", "focusin", "touchstart", "pointerdown"].forEach((ev) =>
        track.addEventListener(ev, stop, { passive: true }));
      ["mouseleave", "focusout"].forEach((ev) => track.addEventListener(ev, play));
      document.addEventListener("visibilitychange", () => document.hidden ? stop() : (stop(), play()));
    }
  })();

  /* =======================================================
     Mobile menu
     ======================================================= */
  (function mobileMenu() {
    const toggle = $("#nav-toggle");
    if (!toggle) return;
    const lock = () => { document.body.style.overflow = toggle.checked ? "hidden" : ""; };
    toggle.addEventListener("change", lock);
    $$(".main-nav a").forEach((a) => a.addEventListener("click", () => {
      if (toggle.checked) { toggle.checked = false; lock(); }
    }));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && toggle.checked) { toggle.checked = false; lock(); }
    });
  })();

  /* =======================================================
     Contact form confirmation
     ======================================================= */
  (function contactForm() {
    const form = $(".contact-form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const btn = form.querySelector('button[type="submit"]');
      const original = btn.textContent;
      btn.textContent = "Thank you — we'll be in touch ✓";
      btn.classList.add("is-sent");
      btn.disabled = true;
      form.reset();
      setTimeout(() => { btn.textContent = original; btn.classList.remove("is-sent"); btn.disabled = false; }, 3200);
    });
  })();
})();
