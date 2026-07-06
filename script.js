/* =========================================================
   Ignite Interior Decors — Interactions
   Progressive enhancement. The site works without this file;
   JS adds smoother motion and richer interactivity.
   ========================================================= */
(function () {
  "use strict";

  const root = document.documentElement;
  root.classList.remove("no-js");
  root.classList.add("js");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- rAF-throttled scroll bus ---------- */
  const scrollFns = [];
  let ticking = false;
  function onScroll(fn) { scrollFns.push(fn); }
  function runScroll() {
    for (const fn of scrollFns) fn();
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(runScroll); }
  }, { passive: true });

  /* =======================================================
     1) Preloader
     ======================================================= */
  (function preloader() {
    const pre = $(".preloader");
    if (!pre) return;
    const hide = () => {
      root.classList.add("loaded");
      pre.addEventListener("transitionend", () => pre.remove(), { once: true });
      // Safety removal if transitionend never fires
      setTimeout(() => pre.remove(), 900);
    };
    // Reveal quickly — don't wait on slow remote images
    window.addEventListener("load", hide);
    setTimeout(hide, 900);
  })();

  /* =======================================================
     2) Staggered scroll reveal
     ======================================================= */
  (function reveals() {
    let items = $$(".reveal");
    if (!items.length) return;

    if (reduceMotion) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    // Give siblings a gentle stagger
    items.forEach((el) => {
      const siblings = Array.from(el.parentElement.children).filter((c) =>
        c.classList.contains("reveal")
      );
      const i = siblings.indexOf(el);
      el.style.transitionDelay = Math.min(i, 6) * 80 + "ms";
    });

    const check = () => {
      const trigger = window.innerHeight * 0.88;
      items = items.filter((el) => {
        if (el.getBoundingClientRect().top < trigger) {
          el.classList.add("is-visible");
          return false; // reveal once, then drop from the list
        }
        return true;
      });
    };
    onScroll(check);
    check();
  })();

  /* =======================================================
     3) Count-up stats
     ======================================================= */
  (function counters() {
    let nums = $$(".count");
    if (!nums.length) return;

    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const animate = (el) => {
      const target = parseFloat(el.dataset.count) || 0;
      if (reduceMotion) { el.textContent = target; return; }
      const dur = 1600;
      let start = null;
      const step = (ts) => {
        if (start === null) start = ts;
        const p = Math.min((ts - start) / dur, 1);
        el.textContent = Math.round(easeOut(p) * target);
        if (p < 1) requestAnimationFrame(step);
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
     4) Header state + scroll progress + back-to-top
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

    if (toTop) {
      toTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      });
    }
  })();

  /* =======================================================
     5) Scroll-spy active nav
     ======================================================= */
  (function scrollSpy() {
    const links = $$('.main-nav a[href^="#"]').filter((a) => a.getAttribute("href").length > 1);
    if (!links.length) return;
    const map = links
      .map((a) => ({ link: a, section: $(a.getAttribute("href")) }))
      .filter((o) => o.section);

    const update = () => {
      const pos = window.scrollY + 140;
      let current = null;
      for (const o of map) {
        if (o.section.offsetTop <= pos) current = o;
      }
      links.forEach((l) => l.classList.remove("active"));
      if (current) current.link.classList.add("active");
    };
    onScroll(update);
    update();
  })();

  /* =======================================================
     6) Hero parallax (scroll + subtle mouse)
     ======================================================= */
  (function heroParallax() {
    if (reduceMotion) return;
    const media = $(".hero-media");
    const content = $(".hero-content");
    const hero = $(".hero");
    if (!hero) return;

    if (media) {
      onScroll(() => {
        const y = window.scrollY;
        if (y < window.innerHeight) media.style.backgroundPositionY = 50 + y * 0.02 + "%";
      });
    }

    if (content && window.matchMedia("(pointer:fine)").matches) {
      hero.addEventListener("mousemove", (e) => {
        const cx = (e.clientX / window.innerWidth - 0.5) * 2;
        const cy = (e.clientY / window.innerHeight - 0.5) * 2;
        content.style.transform = `translate(${cx * 8}px, ${cy * 6}px)`;
      });
      hero.addEventListener("mouseleave", () => {
        content.style.transform = "";
      });
    }
  })();

  /* =======================================================
     7) 3D tilt on portfolio cards
     ======================================================= */
  (function tilt() {
    if (reduceMotion || !window.matchMedia("(pointer:fine)").matches) return;
    const cards = $$(".gallery-item");
    const MAX = 6; // degrees

    cards.forEach((card) => {
      card.addEventListener("mouseenter", () => card.classList.add("tilting"));
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          `perspective(900px) rotateX(${(-py * MAX).toFixed(2)}deg) rotateY(${(px * MAX).toFixed(2)}deg) translateY(-4px)`;
      });
      card.addEventListener("mouseleave", () => {
        card.classList.remove("tilting");
        card.style.transform = "";
      });
    });
  })();

  /* =======================================================
     8) Testimonial carousel (buttons + autoplay)
     ======================================================= */
  (function carousel() {
    const track = $(".testimonial-track");
    const prev = $(".carousel-btn.prev");
    const next = $(".carousel-btn.next");
    if (!track) return;

    const step = () => {
      const card = track.querySelector(".testimonial");
      if (!card) return track.clientWidth;
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 22;
      return card.offsetWidth + gap;
    };

    const atEnd = () => track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    const behavior = reduceMotion ? "auto" : "smooth";

    const goNext = () => {
      if (atEnd()) track.scrollTo({ left: 0, behavior });
      else track.scrollBy({ left: step(), behavior });
    };
    const goPrev = () => track.scrollBy({ left: -step(), behavior });

    if (next) next.addEventListener("click", goNext);
    if (prev) prev.addEventListener("click", goPrev);

    // Autoplay
    if (!reduceMotion) {
      let timer = null;
      const play = () => { timer = setInterval(goNext, 5000); };
      const stop = () => { clearInterval(timer); timer = null; };
      play();
      ["mouseenter", "focusin", "touchstart", "pointerdown"].forEach((ev) =>
        track.addEventListener(ev, stop, { passive: true })
      );
      ["mouseleave", "focusout"].forEach((ev) => track.addEventListener(ev, play));
      document.addEventListener("visibilitychange", () =>
        document.hidden ? stop() : (stop(), play())
      );
    }
  })();

  /* =======================================================
     9) Portfolio filter — smooth fade on change
     ======================================================= */
  (function filterFade() {
    const inputs = $$(".filter-input");
    const items = $$(".gallery-item");
    if (!inputs.length) return;
    inputs.forEach((input) =>
      input.addEventListener("change", () => {
        items.forEach((el) => {
          if (getComputedStyle(el).display !== "none") {
            el.classList.remove("pop");
            // reflow to restart the animation
            void el.offsetWidth;
            el.classList.add("pop");
          }
        });
      })
    );
  })();

  /* =======================================================
     10) Mobile menu — scroll lock, close on link/Escape
     ======================================================= */
  (function mobileMenu() {
    const toggle = $("#nav-toggle");
    if (!toggle) return;

    const setLock = () => {
      document.body.style.overflow = toggle.checked ? "hidden" : "";
    };
    toggle.addEventListener("change", setLock);

    $$(".main-nav a").forEach((a) =>
      a.addEventListener("click", () => {
        if (toggle.checked) { toggle.checked = false; setLock(); }
      })
    );

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && toggle.checked) { toggle.checked = false; setLock(); }
    });
  })();

  /* =======================================================
     11) Contact form — friendly inline confirmation
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
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove("is-sent");
        btn.disabled = false;
      }, 3200);
    });
  })();
})();
