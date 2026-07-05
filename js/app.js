/* ==========================================================================
   APP.JS — shared across all pages
   Track database, navigation, particle background, cursor, toasts,
   scroll reveals, loading screen, ripple clicks, back-to-top.
   ========================================================================== */

/* ---------------------------------------------------------------------- */
/*  DEMO TRACK DATABASE — audio is synthesized locally (see audio.js)      */
/* ---------------------------------------------------------------------- */
window.TRACKS = [
  { id: 't1', title: 'Chromatic Drift',   artist: 'Vela Nightline',  genre: 'Synthwave', duration: 26, root: 220, wave: 'sawtooth', tempo: 2.0, pad: 174 },
  { id: 't2', title: 'Afterglow Static',  artist: 'Kilo Haze',       genre: 'Synthwave', duration: 24, root: 196, wave: 'sawtooth', tempo: 1.8, pad: 146 },
  { id: 't3', title: 'Slow Rain Loop',    artist: 'Paper Orbit',     genre: 'Lo-fi',     duration: 28, root: 174, wave: 'sine',     tempo: 1.2, pad: 196 },
  { id: 't4', title: 'Dust on the Reel',  artist: 'Paper Orbit',     genre: 'Lo-fi',     duration: 24, root: 164, wave: 'triangle', tempo: 1.1, pad: 220 },
  { id: 't5', title: 'Voltage Bloom',     artist: 'Reactor Youth',   genre: 'EDM',       duration: 26, root: 261, wave: 'sawtooth', tempo: 3.2, pad: 130 },
  { id: 't6', title: 'Overdrive Skyline', artist: 'Reactor Youth',   genre: 'EDM',       duration: 24, root: 293, wave: 'square',   tempo: 3.0, pad: 116 },
  { id: 't7', title: 'Zero Gravity Room', artist: 'Ionosphere',      genre: 'Ambient',   duration: 30, root: 130, wave: 'sine',     tempo: 0.7, pad: 261 },
  { id: 't8', title: 'Slow Aurora',       artist: 'Ionosphere',      genre: 'Ambient',   duration: 28, root: 146, wave: 'sine',     tempo: 0.6, pad: 233 },
  { id: 't9', title: 'Chrome Rain',       artist: 'Nightcode 77',    genre: 'Cyberpunk', duration: 26, root: 233, wave: 'square',   tempo: 2.4, pad: 110 },
  { id: 't10', title: 'Neon Alley',       artist: 'Nightcode 77',    genre: 'Cyberpunk', duration: 24, root: 207, wave: 'sawtooth', tempo: 2.2, pad: 156 },
];

/* ---------------------------------------------------------------------- */
/*  TOASTS                                                                 */
/* ---------------------------------------------------------------------- */
window.showToast = function (message) {
  const stack = document.getElementById('toast-stack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  }, 2600);
};

/* ---------------------------------------------------------------------- */
/*  LOADER                                                                 */
/* ---------------------------------------------------------------------- */
(function loaderSequence() {
  const loader = document.getElementById('loader');
  const pctEl = document.getElementById('loader-pct');
  if (!loader) return;
  let pct = 0;
  const iv = setInterval(() => {
    pct += Math.random() * 22 + 8;
    if (pct >= 100) { pct = 100; clearInterval(iv); }
    if (pctEl) pctEl.textContent = `Loading ${Math.floor(pct)}%`;
    if (pct === 100) setTimeout(() => loader.classList.add('hidden'), 260);
  }, 130);
  window.addEventListener('load', () => {
    setTimeout(() => loader.classList.add('hidden'), 900);
  });
})();

/* ---------------------------------------------------------------------- */
/*  NAVIGATION — hamburger / mobile menu / active link                    */
/* ---------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const scrim = document.getElementById('menu-scrim');

  function closeMenu() {
    hamburger?.classList.remove('open');
    mobileMenu?.classList.remove('open');
    scrim?.classList.remove('open');
  }
  hamburger?.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    mobileMenu?.classList.toggle('open', open);
    scrim?.classList.toggle('open', open);
  });
  scrim?.addEventListener('click', closeMenu);
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

  /* -- Back to top ------------------------------------------------------ */
  const backBtn = document.getElementById('back-to-top');
  if (backBtn) {
    window.addEventListener('scroll', () => {
      backBtn.classList.toggle('show', window.scrollY > 500);
    });
    backBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* -- Ripple click effect on buttons ------------------------------------ */
  document.querySelectorAll('.btn, .icon-btn, .transport button, .theme-dot, .mode-chip, .tab-btn').forEach(btn => {
    btn.style.position = btn.style.position || 'relative';
    btn.style.overflow = 'hidden';
    btn.addEventListener('click', function (e) {
      const rect = this.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 620);
    });
  });

  /* -- Custom cursor (desktop only) --------------------------------------- */
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (dot && ring && matchMedia('(hover:hover)').matches) {
    let rx = 0, ry = 0, mx = 0, my = 0;
    window.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    });
    (function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll('a, button, input, .glass-card, .song-card, .track-card').forEach(el => {
      el.addEventListener('mouseenter', () => { ring.style.width = '52px'; ring.style.height = '52px'; ring.style.opacity = '.9'; });
      el.addEventListener('mouseleave', () => { ring.style.width = '32px'; ring.style.height = '32px'; ring.style.opacity = '.5'; });
    });
  }

  /* -- Scroll reveal (IntersectionObserver, GSAP-powered) ------------------ */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          if (window.gsap) {
            gsap.fromTo(entry.target, { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' });
          }
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => io.observe(el));
  }

  /* -- Hero entrance + counters (GSAP) -------------------------------------- */
  if (window.gsap) {
    gsap.set('.hero-title .line', { yPercent: 110 });
    gsap.timeline({ delay: 0.3 })
      .to('.hero-title .line', { yPercent: 0, duration: 1, stagger: 0.12, ease: 'power4.out' })
      .from('.hero-sub', { opacity: 0, y: 16, duration: 0.7, ease: 'power2.out' }, '-=0.5')
      .from('.hero-actions .btn', { opacity: 0, y: 16, stagger: 0.1, duration: 0.6 }, '-=0.4')
      .from('.hero-stats .stat', { opacity: 0, y: 16, stagger: 0.1, duration: 0.6 }, '-=0.4')
      .from('.logo', { opacity: 0, duration: 0.6 }, 0)
      .from('.nav-links a, .nav-actions > *', { opacity: 0, y: -10, stagger: 0.05, duration: 0.5 }, 0);

    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseInt(el.dataset.count, 10);
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target, duration: 1.6, delay: 0.9, ease: 'power2.out',
        onUpdate: () => el.textContent = Math.floor(obj.val),
      });
    });
  }
});

/* ---------------------------------------------------------------------- */
/*  BACKGROUND PARTICLE FIELD (canvas)                                     */
/* ---------------------------------------------------------------------- */
(function particleField() {
  const canvas = document.getElementById('bg-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, particles = [];

  function accentColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#2de2ff';
  }

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight * 2.4;
  }
  resize();
  window.addEventListener('resize', resize);

  const COUNT = window.innerWidth < 700 ? 34 : 70;
  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.8 + 0.6,
      vy: Math.random() * 0.25 + 0.05,
      vx: (Math.random() - 0.5) * 0.15,
      a: Math.random() * 0.5 + 0.15,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const color = accentColor();
    particles.forEach(p => {
      p.y -= p.vy; p.x += p.vx;
      if (p.y < -10) p.y = h + 10;
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = p.a;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
})();
