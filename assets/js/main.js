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

  /* ---------- Split text into masked words ---------- */
  function splitText(el) {
    let i = 0;
    const frag = document.createDocumentFragment();
    const addWords = (text, wrapperTemplate) => {
      text.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span');
        w.className = 'w';
        const inner = document.createElement('span');
        inner.style.setProperty('--i', i++);
        if (wrapperTemplate) {
          const wrap = wrapperTemplate.cloneNode(false);
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
    Array.from(el.children).forEach((c) => c.setAttribute('aria-hidden', 'true'));
    el.classList.add('split');
  }
  $$('[data-split]').forEach(splitText);

  /* ---------- Loader ---------- */
  const loader = $('#loader');
  const heroTitle = $('.hero-title');
  let loaded = false;

  function finishLoading() {
    if (loaded) return;
    loaded = true;
    doc.classList.add('is-loaded');
    if (loader) {
      loader.classList.add('done');
      setTimeout(() => loader.remove(), 1200);
    }
    setTimeout(() => heroTitle && heroTitle.classList.add('in'), reduced ? 0 : 280);
    setTimeout(startTyping, reduced ? 0 : 2600);
  }

  if (!loader || reduced) {
    finishLoading();
  } else {
    const num = $('#loader-num');
    const bar = $('.loader-bar span');
    const minDuration = 900;
    const t0 = performance.now();
    let pageReady = document.readyState === 'complete';
    window.addEventListener('load', () => { pageReady = true; }, { once: true });
    setTimeout(() => { pageReady = true; }, 2500); // never block on slow assets
    const tick = (now) => {
      const p = clamp((now - t0) / minDuration, 0, 1);
      const shown = pageReady ? p : Math.min(p, 0.9);
      const eased = 1 - Math.pow(1 - shown, 3);
      num.textContent = Math.round(eased * 100);
      bar.style.setProperty('--p', eased);
      if (p >= 1 && pageReady) setTimeout(finishLoading, 120);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Typed roles ---------- */
  function startTyping() {
    const el = $('#typed');
    if (!el || reduced) return;
    let words;
    try { words = JSON.parse(el.dataset.words); } catch (e) { return; }
    if (!words || words.length < 2) return;
    let w = 0;
    let text = words[0];
    let deleting = true;
    const step = () => {
      if (deleting) {
        text = text.slice(0, -1);
        el.textContent = text;
        if (!text) { deleting = false; w = (w + 1) % words.length; return setTimeout(step, 260); }
        return setTimeout(step, 28);
      }
      const next = words[w];
      text = next.slice(0, text.length + 1);
      el.textContent = text;
      if (text === next) { deleting = true; return setTimeout(step, 2200); }
      return setTimeout(step, 55 + Math.random() * 40);
    };
    step();
  }

  /* ---------- Code window: highlight + type ---------- */
  const codeEl = $('#code-typing');
  let codeChars = [];
  let caret = null;
  if (codeEl) {
    const src = codeEl.textContent;
    const re = /("(?:[^"\\]|\\.)*")|(\b(?:const|let|true|false|null)\b)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(?=\s*:)|([{}[\](),;:=.])|(\s+)|([A-Za-z_$][\w$]*)|(.)/g;
    const classes = ['tok-str', 'tok-kw', 'tok-num', 'tok-key', 'tok-punc', null, null, null];
    const frag = document.createDocumentFragment();
    let m;
    while ((m = re.exec(src))) {
      const idx = m.slice(1).findIndex((g) => g !== undefined);
      const cls = classes[idx];
      const tokenText = m[0];
      const holder = cls ? document.createElement('span') : document.createDocumentFragment();
      if (cls) holder.className = cls;
      if (reduced) {
        holder.appendChild(document.createTextNode(tokenText));
      } else {
        for (const ch of tokenText) {
          if (ch === '\n') { holder.appendChild(document.createTextNode('\n')); continue; }
          const s = document.createElement('span');
          s.className = 'ch';
          s.textContent = ch;
          holder.appendChild(s);
          codeChars.push(s);
        }
      }
      frag.appendChild(holder);
    }
    codeEl.textContent = '';
    codeEl.appendChild(frag);
    if (!reduced) {
      caret = document.createElement('span');
      caret.className = 'code-caret';
      caret.setAttribute('aria-hidden', 'true');
      codeEl.prepend(caret);
    }
  }

  function typeCode() {
    if (!codeChars.length) return;
    const cps = 110; // characters per second
    const t0 = performance.now();
    let shown = 0;
    const frame = (now) => {
      const target = Math.min(codeChars.length, Math.floor(((now - t0) / 1000) * cps));
      while (shown < target) {
        const c = codeChars[shown++];
        c.classList.add('on');
        // whitespace is revealed for free so indentation doesn't slow the rhythm
        while (shown < codeChars.length && /^\s$/.test(codeChars[shown].textContent)) codeChars[shown++].classList.add('on');
      }
      if (shown > 0) codeChars[shown - 1].after(caret);
      if (shown < codeChars.length) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ---------- Counters ---------- */
  const counters = $$('[data-count]');
  if (!reduced) counters.forEach((el) => { el.textContent = '0'; });
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    if (reduced) { el.textContent = target.toFixed(dec); return; }
    const dur = 1800;
    const t0 = performance.now();
    const frame = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = (target * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ---------- Reveal on scroll ---------- */
  const revealTargets = $$('[data-reveal], [data-split]').filter((el) => el !== heroTitle);
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('in');
        io.unobserve(el);
        if (el.classList.contains('code-window')) setTimeout(typeCode, 450);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
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
    counters.forEach(countUp);
    codeChars.forEach((c) => c.classList.add('on'));
  }

  /* ---------- Hero network canvas ---------- */
  const canvas = $('#hero-canvas');
  const hero = $('.hero');
  let refreshCanvasColors = () => {};
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    let nodes = [];
    let packets = [];
    let running = false;
    let heroVisible = true;
    let lastSpawn = 0;
    const mouse = { x: -9999, y: -9999 };
    let col = {};

    const hexToRgb = (hex) => {
      const h = hex.replace('#', '').trim();
      const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
    };
    refreshCanvasColors = () => {
      const cs = getComputedStyle(doc);
      const light = doc.getAttribute('data-theme') === 'light';
      col = {
        a1: hexToRgb(cs.getPropertyValue('--a1')),
        a2: hexToRgb(cs.getPropertyValue('--a2')),
        line: light ? '20,24,48' : '200,210,255',
        lineAlpha: light ? 0.09 : 0.14,
        node: light ? '30,34,60' : '220,226,255',
        nodeAlpha: light ? 0.35 : 0.55,
      };
      if (!running) draw(0);
    };

    const linkDist = () => (W < 640 ? 110 : 150);

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp((W * H) / 15000, 26, 95));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
        r: Math.random() < 0.12 ? 2.6 : 1 + Math.random() * 1.2,
        hub: Math.random() < 0.12,
      }));
      packets = [];
    }

    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      const D = linkDist();
      const D2 = D * D;
      const edges = [];

      for (const n of nodes) {
        if (running) {
          const dx = n.x - mouse.x, dy = n.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 140 * 140 && d2 > 1) {
            const f = (1 - Math.sqrt(d2) / 140) * 0.6;
            n.x += (dx / Math.sqrt(d2)) * f;
            n.y += (dy / Math.sqrt(d2)) * f;
          }
          n.x += n.vx; n.y += n.vy;
          if (n.x < -20) n.x = W + 20; else if (n.x > W + 20) n.x = -20;
          if (n.y < -20) n.y = H + 20; else if (n.y > H + 20) n.y = -20;
        }
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < D2) {
            const alpha = (1 - Math.sqrt(d2) / D) * col.lineAlpha * 2;
            ctx.strokeStyle = `rgba(${col.line},${alpha.toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            edges.push([a, b]);
          }
        }
        // cursor links
        const mx = a.x - mouse.x, my = a.y - mouse.y;
        const md = Math.sqrt(mx * mx + my * my);
        if (md < 200) {
          ctx.strokeStyle = `rgba(${col.a2},${((1 - md / 200) * 0.45).toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }

      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.hub ? `rgba(${col.a1},0.95)` : `rgba(${col.node},${col.nodeAlpha})`;
        ctx.fill();
        if (n.hub) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${col.a1},0.12)`;
          ctx.fill();
        }
      }

      if (!running) return;

      // data packets travelling along live edges
      if (edges.length && now - lastSpawn > 220 && packets.length < 22) {
        const [a, b] = edges[(Math.random() * edges.length) | 0];
        packets.push({ a, b, t: 0, s: 0.008 + Math.random() * 0.012 });
        lastSpawn = now;
      }
      packets = packets.filter((p) => {
        p.t += p.s;
        const dx = p.a.x - p.b.x, dy = p.a.y - p.b.y;
        if (p.t >= 1 || dx * dx + dy * dy > D2 * 1.3) return false;
        const x = lerp(p.a.x, p.b.x, p.t), y = lerp(p.a.y, p.b.y, p.t);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
        g.addColorStop(0, `rgba(${col.a2},0.9)`);
        g.addColorStop(1, `rgba(${col.a2},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(${col.a2},1)`;
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
        return true;
      });
    }

    function loop(now) {
      if (!running) return;
      draw(now);
      requestAnimationFrame(loop);
    }
    function start() {
      if (running || reduced || !heroVisible || document.hidden) return;
      running = true;
      requestAnimationFrame(loop);
    }
    function stop() { running = false; }

    resize();
    refreshCanvasColors();
    start();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { resize(); if (!running) draw(0); }, 150);
    });
    window.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    }, { passive: true });
    doc.addEventListener('mouseleave', () => { mouse.x = mouse.y = -9999; });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        heroVisible ? start() : stop();
      }).observe(hero);
    }
  }

  /* ---------- Theme toggle (circular reveal) ---------- */
  const themeBtn = $('.theme-toggle');
  const metaTheme = $('meta[name="theme-color"]');
  function applyTheme(theme) {
    doc.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
    if (metaTheme) metaTheme.setAttribute('content', theme === 'light' ? '#f6f7fb' : '#07080d');
    refreshCanvasColors();
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', (e) => {
      const next = doc.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      if (!document.startViewTransition || reduced) { applyTheme(next); return; }
      const r = themeBtn.getBoundingClientRect();
      const x = e.clientX || r.left + r.width / 2;
      const y = e.clientY || r.top + r.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const t = document.startViewTransition(() => applyTheme(next));
      t.ready.then(() => {
        doc.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 700, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(() => {});
    });
  }

  /* ---------- Nav: scrolled / hide / progress / active ---------- */
  const nav = $('#nav');
  const progress = $('.scroll-progress span');
  const navLinks = $$('[data-nav]');
  const indicator = $('.nav-indicator');
  const heroInner = $('.hero-inner');
  const timeline = $('#timeline');
  const tlFill = $('.timeline-fill');
  const tlItems = $$('.tl-item');
  let lastY = window.scrollY;
  let ticking = false;

  function moveIndicator(link) {
    if (!indicator) return;
    if (!link) { indicator.style.opacity = '0'; return; }
    indicator.style.opacity = '1';
    indicator.style.width = `${link.offsetWidth}px`;
    indicator.style.transform = `translateX(${link.offsetLeft}px)`;
  }

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    if (nav) {
      nav.classList.toggle('scrolled', y > 20);
      const menuOpen = doc.classList.contains('menu-open');
      if (!menuOpen && y > 480 && y > lastY + 4) nav.classList.add('hide');
      else if (y < lastY - 4 || y <= 480) nav.classList.remove('hide');
    }
    if (heroInner && !reduced && y < innerHeight * 1.2) {
      heroInner.style.transform = `translate3d(0, ${y * 0.18}px, 0)`;
      heroInner.style.opacity = String(clamp(1 - y / (innerHeight * 0.9), 0, 1));
    }
    if (timeline && tlFill) {
      const r = timeline.getBoundingClientRect();
      const trigger = innerHeight * 0.62;
      const p = clamp((trigger - r.top) / r.height, 0, 1);
      tlFill.style.transform = `scaleY(${p})`;
      tlItems.forEach((it) => {
        const dot = it.querySelector('.tl-dot');
        if (dot) it.classList.toggle('active', dot.getBoundingClientRect().top < trigger);
      });
    }
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  if ('IntersectionObserver' in window) {
    const sectionMap = { credentials: 'skills' };
    const sectionIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = sectionMap[entry.target.id] || entry.target.id;
        let active = null;
        navLinks.forEach((a) => {
          const on = a.getAttribute('href') === `#${id}`;
          a.classList.toggle('active', on);
          if (on) active = a;
        });
        moveIndicator(active);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['top', 'about', 'experience', 'projects', 'skills', 'credentials', 'contact'].forEach((id) => {
      const s = document.getElementById(id);
      if (s) sectionIO.observe(s);
    });
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => moveIndicator($('[data-nav].active')));
  }

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('.menu-toggle');
  const menu = $('#mobile-menu');
  let menuTimer;
  function setMenu(open) {
    if (!menu || !menuBtn) return;
    clearTimeout(menuTimer);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => doc.classList.add('menu-open')));
      nav && nav.classList.remove('hide');
    } else {
      doc.classList.remove('menu-open');
      menuTimer = setTimeout(() => { menu.hidden = true; }, 700);
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
    if (innerWidth > 960 && doc.classList.contains('menu-open')) setMenu(false);
  });

  /* ---------- Pointer effects (desktop) ---------- */
  if (finePointer && !reduced) {
    // Cursor ring
    const ring = $('.cursor-ring');
    if (ring) {
      body.classList.add('has-cursor');
      let rx = -100, ry = -100, tx = -100, ty = -100;
      window.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; ring.classList.remove('hidden'); }, { passive: true });
      doc.addEventListener('mouseleave', () => ring.classList.add('hidden'));
      const follow = () => {
        rx = lerp(rx, tx, 0.2); ry = lerp(ry, ty, 0.2);
        ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
        requestAnimationFrame(follow);
      };
      requestAnimationFrame(follow);
      const hoverSel = 'a, button, [data-cursor], [data-tilt], .chips li';
      document.addEventListener('pointerover', (e) => { if (e.target.closest(hoverSel)) ring.classList.add('hover'); });
      document.addEventListener('pointerout', (e) => {
        if (e.target.closest(hoverSel) && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(hoverSel))) ring.classList.remove('hover');
      });
    }

    // Magnetic elements
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * 0.22}px, ${y * 0.32}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    // Tilt + spotlight cards
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${px * 100}%`);
        card.style.setProperty('--my', `${py * 100}%`);
        card.style.transition = 'transform .15s ease-out, border-color .4s, box-shadow .5s';
        card.style.transform = `perspective(1100px) rotateX(${(0.5 - py) * 5}deg) rotateY(${(px - 0.5) * 6}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => {
        card.style.transition = '';
        card.style.transform = '';
      });
    });

    // Hero portrait parallax
    const portrait = $('[data-parallax]');
    if (portrait && hero) {
      hero.addEventListener('pointermove', (e) => {
        const x = e.clientX / innerWidth - 0.5;
        const y = e.clientY / innerHeight - 0.5;
        portrait.style.transform = `translate3d(${x * -18}px, ${y * -14}px, 0) rotateY(${x * 6}deg) rotateX(${y * -6}deg)`;
      });
      hero.addEventListener('pointerleave', () => { portrait.style.transform = ''; });
    }
  } else {
    // Touch: spotlight follows taps on cards
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointerdown', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* ---------- SVG (SMIL) motion respects reduced motion ---------- */
  if (reduced) $$('svg').forEach((s) => s.pauseAnimations && s.pauseAnimations());

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
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 2000);
      }
    });
  });

  /* ---------- Local time (Dhaka) + year ---------- */
  const timeEl = $('#local-time');
  if (timeEl && window.Intl) {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const tickTime = () => { timeEl.textContent = fmt.format(new Date()); };
    tickTime();
    setInterval(tickTime, 1000);
  }
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
