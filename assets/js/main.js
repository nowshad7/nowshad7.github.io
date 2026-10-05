/* ==========================================================================
   Robiul Hasan Nowshad — Portfolio interactions
   ========================================================================== */
(() => {
  'use strict';
  window.__portfolioReady = true;

  const doc = document.documentElement;
  const body = document.body;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- Split headings into masked words ---------- */
  function splitText(el) {
    let i = 0;
    const frag = document.createDocumentFragment();
    const addWords = (text, template) => {
      text.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span');
        w.className = 'w';
        w.setAttribute('aria-hidden', 'true');
        const inner = document.createElement('span');
        inner.style.setProperty('--i', i++);
        if (template) {
          const wrap = template.cloneNode(false);
          wrap.textContent = part;
          inner.appendChild(wrap);
        } else {
          inner.textContent = part;
        }
        w.appendChild(inner);
        frag.appendChild(w);
      });
    };
    Array.from(el.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) addWords(node.textContent, null);
      else if (node.nodeType === Node.ELEMENT_NODE) addWords(node.textContent, node);
    });
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    el.textContent = '';
    el.appendChild(frag);
    el.classList.add('split');
  }
  $$('[data-split]').forEach(splitText);

  // Nav hover: duplicate label in italic for the roll effect
  $$('.header-nav a span').forEach((s) => s.setAttribute('data-text', s.textContent));

  /* ---------- Intro ---------- */
  const heroTitle = $('.hero-title');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    doc.classList.add('is-loaded');
    setTimeout(() => heroTitle && heroTitle.classList.add('in'), reduced ? 0 : 150);
  }));

  /* ---------- Counters ---------- */
  const counters = $$('[data-count]');
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const dur = 1600;
    const t0 = performance.now();
    const frame = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = (target * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ---------- Scroll reveals ---------- */
  const revealTargets = $$('[data-reveal], [data-split], [data-rule]').filter((el) => el !== heroTitle);
  if ('IntersectionObserver' in window && !reduced) {
    counters.forEach((el) => { el.textContent = '0'; });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach((el) => io.observe(el));

    const countIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        countIO.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => countIO.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('in'));
  }

  /* ---------- Accordions (work + experience) ---------- */
  $$('.work-row, .xp-row').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const open = !item.classList.contains('open');
      item.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- Header: scrolled / hide / active ---------- */
  const header = $('#header');
  const navLinks = $$('[data-nav]');
  const parallaxImg = $('[data-parallax]');
  const marquee = $('[data-marquee]');
  let lastY = window.scrollY;
  let velocity = 0;

  function onScroll() {
    const y = window.scrollY;
    const dy = y - lastY;
    velocity = clamp(velocity + dy * 0.08, -14, 14);
    if (header) {
      header.classList.toggle('scrolled', y > 10);
      if (!doc.classList.contains('menu-open') && y > 400 && dy > 4) header.classList.add('hide');
      else if (dy < -4 || y <= 400) header.classList.remove('hide');
    }
    if (parallaxImg && !reduced) {
      const r = parallaxImg.parentElement.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) {
        const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        parallaxImg.style.transform = `translate3d(0, ${p * -40}px, 0)`;
      }
    }
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if ('IntersectionObserver' in window) {
    const sectionIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['top', 'work', 'experience', 'about', 'contact'].forEach((id) => {
      const s = document.getElementById(id);
      if (s) sectionIO.observe(s);
    });
  }

  /* ---------- Marquee (direction + speed follow scroll) ---------- */
  if (marquee && !reduced) {
    let x = 0;
    let dir = -1;
    let visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(marquee);
    }
    const tick = () => {
      if (Math.abs(velocity) > 0.5) dir = velocity > 0 ? -1 : 1;
      velocity *= 0.92;
      if (visible) {
        const half = marquee.scrollWidth / 2;
        x += dir * (0.6 + Math.abs(velocity) * 0.6);
        if (x <= -half) x += half;
        if (x > 0) x -= half;
        marquee.style.transform = `translate3d(${x}px, 0, 0)`;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Work hover preview ---------- */
  const preview = $('.preview');
  if (preview && finePointer) {
    const cards = $$('.preview-card', preview);
    let px = innerWidth / 2, py = innerHeight / 2, tx = px, ty = py, active = false;
    const follow = () => {
      px = lerp(px, tx, 0.14);
      py = lerp(py, ty, 0.14);
      const rot = clamp((tx - px) * 0.08, -8, 8);
      const side = tx > innerWidth - 420 ? -190 : 190;
      preview.style.transform = `translate3d(${px + side}px, ${py}px, 0) rotate(${rot}deg)`;
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
    window.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    $$('[data-preview]').forEach((item) => {
      const row = $('.work-row', item);
      row.addEventListener('pointerenter', () => {
        cards.forEach((c) => c.classList.toggle('active', c.dataset.for === item.dataset.preview));
        if (!active) { px = tx; py = ty; }
        active = true;
        preview.classList.add('show');
      });
      row.addEventListener('pointerleave', () => { active = false; preview.classList.remove('show'); });
    });
    window.addEventListener('scroll', () => { if (!active) preview.classList.remove('show'); }, { passive: true });
  }

  /* ---------- Theme ---------- */
  const themeBtn = $('.theme-btn');
  const metaTheme = $('meta[name="theme-color"]');
  function syncThemeUi() {
    const dark = doc.getAttribute('data-theme') === 'dark';
    if (themeBtn) themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    if (metaTheme) metaTheme.setAttribute('content', dark ? '#11110f' : '#f3f0e8');
  }
  function applyTheme(theme) {
    doc.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
    syncThemeUi();
  }
  syncThemeUi();
  if (themeBtn) {
    themeBtn.addEventListener('click', (e) => {
      const next = doc.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      if (!document.startViewTransition || reduced) { applyTheme(next); return; }
      const r = themeBtn.getBoundingClientRect();
      const x = e.clientX || r.left + r.width / 2;
      const y = e.clientY || r.top + r.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const t = document.startViewTransition(() => applyTheme(next));
      t.ready.then(() => {
        doc.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 800, easing: 'cubic-bezier(.76,0,.24,1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(() => {});
    });
  }

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('.menu-btn');
  const menu = $('#menu');
  let menuTimer;
  function setMenu(open) {
    if (!menu || !menuBtn) return;
    clearTimeout(menuTimer);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => doc.classList.add('menu-open')));
      header && header.classList.remove('hide');
    } else {
      doc.classList.remove('menu-open');
      menuTimer = setTimeout(() => { menu.hidden = true; }, 800);
    }
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    body.style.overflow = open ? 'hidden' : '';
  }
  if (menuBtn) menuBtn.addEventListener('click', () => setMenu(!doc.classList.contains('menu-open')));
  if (menu) $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && doc.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); }
  });
  window.addEventListener('resize', () => {
    if (innerWidth > 900 && doc.classList.contains('menu-open')) setMenu(false);
  });

  /* ---------- Copy email ---------- */
  const toast = $('#toast');
  let toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const value = btn.dataset.copy;
      let ok = false;
      try {
        await navigator.clipboard.writeText(value);
        ok = true;
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        ta.remove();
      }
      showToast(ok ? 'Email copied to clipboard' : value);
      if (ok) {
        btn.textContent = 'Copied';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
      }
    });
  });

  /* ---------- Clock + year ---------- */
  const clocks = $$('[data-clock]');
  if (clocks.length && window.Intl) {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: false });
    const tick = () => { const t = fmt.format(new Date()); clocks.forEach((c) => { c.textContent = t; }); };
    tick();
    setInterval(tick, 15000);
  }
  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  if (reduced) $$('svg').forEach((s) => s.pauseAnimations && s.pauseAnimations());
})();
