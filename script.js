/* ============================================================
   TO MY BEST FRIEND
   script.js — Complete Production JavaScript
   ============================================================ */

'use strict';

/* ── 1. UTILITIES ────────────────────────────────────────── */

/**
 * Clamp a value between min and max
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Linear interpolation
 * @param {number} a
 * @param {number} b
 * @param {number} t  0..1
 * @returns {number}
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Format seconds as M:SS
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Random float between min and max
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randBetween(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Debounce a function
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/* ── 2. CUSTOM CURSOR ────────────────────────────────────── */

const CursorManager = (() => {
  let glowEl = null;
  let dotEl  = null;

  // Target positions (raw mouse)
  let mouseX = window.innerWidth  / 2;
  let mouseY = window.innerHeight / 2;

  // Smoothed glow position
  let glowX = mouseX;
  let glowY = mouseY;

  let rafId  = null;
  let active = false;

  function init() {
    // Create glow element
    glowEl = document.createElement('div');
    glowEl.className = 'cursor-glow';
    glowEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glowEl);

    // Create dot element
    dotEl = document.createElement('div');
    dotEl.className = 'cursor-dot';
    dotEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dotEl);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseenter', () => {
      if (glowEl) glowEl.style.opacity = '1';
      if (dotEl)  dotEl.style.opacity  = '1';
    });
    document.addEventListener('mouseleave', () => {
      if (glowEl) glowEl.style.opacity = '0';
      if (dotEl)  dotEl.style.opacity  = '0';
    });

    // Expand on hoverable elements
    const hoverTargets = 'a, button, [role="button"], input, .ctrl-btn, .player-progress-bar, .nav-link, .card-lift';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverTargets)) {
        if (glowEl) {
          glowEl.style.width  = '56px';
          glowEl.style.height = '56px';
        }
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverTargets)) {
        if (glowEl) {
          glowEl.style.width  = '36px';
          glowEl.style.height = '36px';
        }
      }
    });

    active = true;
    loop();
  }

  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;

    // Dot follows instantly
    if (dotEl) {
      dotEl.style.transform = `translate(calc(${mouseX}px - 50%), calc(${mouseY}px - 50%))`;
    }
  }

  function loop() {
    if (!active) return;

    // Smooth glow trailing effect
    glowX = lerp(glowX, mouseX, 0.12);
    glowY = lerp(glowY, mouseY, 0.12);

    if (glowEl) {
      glowEl.style.transform = `translate(calc(${glowX}px - 50%), calc(${glowY}px - 50%))`;
    }

    rafId = requestAnimationFrame(loop);
  }

  function destroy() {
    active = false;
    cancelAnimationFrame(rafId);
    document.removeEventListener('mousemove', onMouseMove);
    if (glowEl) glowEl.remove();
    if (dotEl)  dotEl.remove();
  }

  return { init, destroy };
})();


/* ── 3. STARFIELD CANVAS ─────────────────────────────────── */

const StarField = (() => {
  let canvas  = null;
  let ctx     = null;
  let stars   = [];
  let rafId   = null;
  let W = 0, H = 0;

  const STAR_COUNT        = 260;
  const CONSTELLATION_LINES = [
    // Pairs of star indices that form "constellation" lines
    // Generated dynamically after stars are placed
  ];

  class Star {
    constructor() {
      this.reset();
    }

    reset() {
      this.x    = Math.random() * W;
      this.y    = Math.random() * H;
      this.r    = randBetween(0.4, 1.8);
      this.base = randBetween(0.15, 0.85);
      this.alpha = this.base;
      this.twinkleSpeed = randBetween(0.006, 0.022);
      this.twinkleDir   = Math.random() > 0.5 ? 1 : -1;
      this.color = Math.random() > 0.8 ? '#D8B8FF' : '#FFFFFF';
    }

    update() {
      this.alpha += this.twinkleSpeed * this.twinkleDir;
      if (this.alpha >= 1)    { this.alpha = 1;    this.twinkleDir = -1; }
      if (this.alpha <= 0.08) { this.alpha = 0.08; this.twinkleDir =  1; }
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.shadowBlur  = this.r > 1.2 ? 6 : 2;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Floating dust particles
  class DustParticle {
    constructor() {
      this.reset(true);
    }

    reset(init = false) {
      this.x     = Math.random() * W;
      this.y     = init ? Math.random() * H : H + 10;
      this.r     = randBetween(0.5, 1.5);
      this.alpha = randBetween(0.04, 0.18);
      this.vx    = randBetween(-0.12, 0.12);
      this.vy    = randBetween(-0.3, -0.08);
      this.life  = 1;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.y < -10) this.reset();
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = '#B57CFF';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  let dustParticles = [];
  const DUST_COUNT  = 40;

  // Pre-computed constellation segments
  let constellationPairs = [];

  function buildConstellations() {
    constellationPairs = [];
    // Pick a subset of brighter stars and connect nearby ones
    const bright = stars.filter(s => s.r > 1.1).slice(0, 18);
    for (let i = 0; i < bright.length; i++) {
      for (let j = i + 1; j < bright.length; j++) {
        const dx = bright[i].x - bright[j].x;
        const dy = bright[i].y - bright[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140 && dist > 50 && constellationPairs.length < 14) {
          constellationPairs.push([bright[i], bright[j]]);
        }
      }
    }
  }

  function drawConstellations() {
    constellationPairs.forEach(([a, b]) => {
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.strokeStyle = '#B57CFF';
      ctx.lineWidth   = 0.6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    });
  }

  // Moon
  function drawMoon() {
    const mx = W * 0.72;
    const my = H * 0.08;
    const t  = Date.now() / 1000;
    const glowAlpha = 0.12 + Math.sin(t * 0.6) * 0.06;

    // Outer glow
    const grd = ctx.createRadialGradient(mx, my, 8, mx, my, 48);
    grd.addColorStop(0, `rgba(216, 184, 255, ${glowAlpha})`);
    grd.addColorStop(1, 'rgba(216, 184, 255, 0)');
    ctx.save();
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(mx, my, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Moon body
    ctx.save();
    ctx.globalAlpha = 0.88;
    const bodyGrd = ctx.createRadialGradient(mx - 4, my - 4, 2, mx, my, 18);
    bodyGrd.addColorStop(0, '#EAD5FF');
    bodyGrd.addColorStop(1, '#B57CFF');
    ctx.fillStyle = bodyGrd;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#D8B8FF';
    ctx.beginPath();
    ctx.arc(mx, my, 17, 0, Math.PI * 2);
    ctx.fill();

    // Crescent shadow
    ctx.fillStyle = 'rgba(7, 8, 20, 0.55)';
    ctx.beginPath();
    ctx.arc(mx + 6, my, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Subtle gradient overlay at bottom (deep space feel)
  function drawGradientVeil() {
    const grd = ctx.createLinearGradient(0, H * 0.6, 0, H);
    grd.addColorStop(0, 'rgba(7, 8, 20, 0)');
    grd.addColorStop(1, 'rgba(7, 8, 20, 0.6)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, H * 0.6, W, H * 0.4);
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;

    // Rebuild after resize
    stars = Array.from({ length: STAR_COUNT }, () => new Star());
    buildConstellations();
    dustParticles = Array.from({ length: DUST_COUNT }, () => new DustParticle());
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);

    // Deep background gradient
    const bgGrd = ctx.createLinearGradient(0, 0, W * 0.5, H);
    bgGrd.addColorStop(0,   '#070814');
    bgGrd.addColorStop(0.4, '#080a18');
    bgGrd.addColorStop(1,   '#07081a');
    ctx.fillStyle = bgGrd;
    ctx.fillRect(0, 0, W, H);

    // Very subtle moving radial gradient
    const t = Date.now() / 8000;
    const rx = W * (0.5 + Math.sin(t) * 0.15);
    const ry = H * (0.4 + Math.cos(t * 0.7) * 0.1);
    const radGrd = ctx.createRadialGradient(rx, ry, 0, rx, ry, W * 0.6);
    radGrd.addColorStop(0,   'rgba(20, 12, 45, 0.45)');
    radGrd.addColorStop(0.5, 'rgba(12, 8, 30, 0.2)');
    radGrd.addColorStop(1,   'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radGrd;
    ctx.fillRect(0, 0, W, H);

    // Constellation lines (behind stars)
    drawConstellations();

    // Dust
    dustParticles.forEach(p => { p.update(); p.draw(ctx); });

    // Stars
    stars.forEach(s => { s.update(); s.draw(ctx); });

    // Moon
    drawMoon();

    // Bottom veil
    drawGradientVeil();

    rafId = requestAnimationFrame(frame);
  }

  function init() {
    canvas = document.getElementById('star-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'star-canvas';
      canvas.className = 'star-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.prepend(canvas);
    }
    ctx = canvas.getContext('2d');

    resize();
    window.addEventListener('resize', debounce(resize, 250));

    frame();
  }

  function destroy() {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
  }

  return { init, destroy };
})();


/* ── 4. FLOATING PARTICLES (DOM-based) ───────────────────── */

const ParticleSystem = (() => {
  let container = null;
  const POOL = [];
  const COUNT = 22;

  function createParticle() {
    const el = document.createElement('span');
    el.className = 'particle';
    el.setAttribute('aria-hidden', 'true');
    return el;
  }

  function spawn(el) {
    const size    = randBetween(2, 5);
    const left    = randBetween(0, 100);
    const duration = randBetween(12, 28);
    const delay   = randBetween(0, 14);

    el.style.cssText = `
      width:  ${size}px;
      height: ${size}px;
      left:   ${left}%;
      bottom: -10px;
      animation-duration:  ${duration}s;
      animation-delay:    -${delay}s;
      opacity: ${randBetween(0.06, 0.22)};
      background: rgba(181, 124, 255, ${randBetween(0.2, 0.55)});
    `;
  }

  function init() {
    container = document.querySelector('.particles-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'particles-container';
      container.setAttribute('aria-hidden', 'true');
      document.body.appendChild(container);
    }

    for (let i = 0; i < COUNT; i++) {
      const el = createParticle();
      spawn(el);
      container.appendChild(el);
      POOL.push(el);
    }
  }

  return { init };
})();


/* ── 5. NAVBAR ───────────────────────────────────────────── */

const NavbarManager = (() => {
  let navbar    = null;
  let hamburger = null;
  let mobileMenu = null;
  let navLinks  = [];
  let sections  = [];

  function setActive(link) {
    navLinks.forEach(l => l.classList.remove('active'));
    if (link) link.classList.add('active');
  }

  function detectActive() {
    const scrollY = window.scrollY + 80;
    let current   = null;

    sections.forEach(sec => {
      if (!sec) return;
      const top    = sec.offsetTop;
      const bottom = top + sec.offsetHeight;
      if (scrollY >= top && scrollY < bottom) {
        const id   = sec.getAttribute('id');
        const link = document.querySelector(`.nav-link[href="#${id}"]`);
        if (link) current = link;
      }
    });

    setActive(current);
  }

  function onScroll() {
    if (!navbar) return;
    if (window.scrollY > 10) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    detectActive();
  }

  function toggleMobile() {
    if (!hamburger || !mobileMenu) return;
    const isOpen = hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open', isOpen);
    mobileMenu.style.display = isOpen ? 'flex' : '';
    hamburger.setAttribute('aria-expanded', String(isOpen));
  }

  function closeMobile() {
    if (!hamburger || !mobileMenu) return;
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }

  function init() {
    navbar     = document.getElementById('navbar');
    hamburger  = document.getElementById('hamburger');
    mobileMenu = document.getElementById('mobile-menu');

    navLinks = Array.from(document.querySelectorAll('.nav-link'));
    sections = navLinks
      .map(l => {
        const href = l.getAttribute('href');
        if (href && href.startsWith('#')) {
          return document.querySelector(href);
        }
        return null;
      })
      .filter(Boolean);

    // Smooth-scroll nav links
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) {
            const top = target.getBoundingClientRect().top + window.scrollY - 70;
            window.scrollTo({ top, behavior: 'smooth' });
          }
          closeMobile();
          setActive(link);
        }
      });
    });

    if (hamburger) {
      hamburger.addEventListener('click', toggleMobile);
    }

    // Close mobile on outside click
    document.addEventListener('click', (e) => {
      if (navbar && !navbar.contains(e.target)) {
        closeMobile();
      }
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // Run once on load
  }

  return { init };
})();


/* ── 6. INTERSECTION OBSERVER ANIMATIONS ─────────────────── */

const RevealManager = (() => {
  let observer = null;

  function init() {
    const els = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');
    if (!els.length) return;

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            // Optionally unobserve after reveal
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    els.forEach(el => observer.observe(el));
  }

  function destroy() {
    if (observer) observer.disconnect();
  }

  return { init, destroy };
})();


/* ── 7. MUSIC PLAYER ─────────────────────────────────────── */

const MusicPlayer = (() => {
  // State
  let isPlaying  = false;
  let isLiked    = false;
  let isShuffled = false;
  let isRepeated = false;
  let isMuted    = false;

  let currentTime = 0;
  let duration    = 215; // 3:35 default demo
  let volume      = 0.75;
  let rafId       = null;
  let lastTick    = null;
  let trackIndex  = 0;

  // Demo track list
  const TRACKS = [
    {
      artist: 'Starlight Dreams',
      album:  'Purple Skies',
      cover:  null,        // Placeholder — replace with real path
      file:   null,        // Replace with real audio path
      duration: 215,
    },
    {
      artist: 'Luna & Co.',
      album:  'Notebook Pages',
      cover:  null,
      file:   null,
      duration: 188,
    },
    {
      artist: 'Violet Haze',
      album:  'Dreamspace',
      cover:  null,
      file:   null,
      duration: 202,
    },
  ];

  // DOM references (set in init)
  let els = {};
  let audio = null;

  function getEls() {
    return {
      playBtn:       document.getElementById('play-btn'),
      prevBtn:       document.getElementById('prev-btn'),
      nextBtn:       document.getElementById('next-btn'),
      likeBtn:       document.getElementById('like-btn'),
      shuffleBtn:    document.getElementById('shuffle-btn'),
      repeatBtn:     document.getElementById('repeat-btn'),
      muteBtn:       document.getElementById('mute-btn'),
      volumeSlider:  document.getElementById('volume-slider'),
      progressBar:   document.getElementById('progress-bar'),
      progressFill:  document.getElementById('progress-fill'),
      progressThumb: document.getElementById('progress-thumb'),
      currentTimeEl: document.getElementById('current-time'),
      totalTimeEl:   document.getElementById('total-time'),
      trackNameEl:   document.getElementById('track-name'),
      artistEl:      document.getElementById('track-artist'),
      albumArt:      document.getElementById('album-art'),
      waveBars:      document.getElementById('wave-bars'),
      playIconWrap:  document.getElementById('play-icon-wrap'),
      floatHeart1:   document.getElementById('fh1'),
      floatHeart2:   document.getElementById('fh2'),
      floatHeart3:   document.getElementById('fh3'),
    };
  }

  /* Load track */
  function loadTrack(index) {
    const track = TRACKS[index];
    if (!track) return;

    duration    = track.duration;
    currentTime = 0;

    if (els.trackNameEl) els.trackNameEl.textContent = track.title;
    if (els.artistEl)    els.artistEl.textContent    = track.artist;
    if (els.totalTimeEl) els.totalTimeEl.textContent = formatTime(duration);
    if (els.currentTimeEl) els.currentTimeEl.textContent = '0:00';

    updateProgress(0);

    if (audio && track.file) {
      audio.src = track.file;
      if (isPlaying) audio.play().catch(() => {});
    }
  }

  /* Update progress bar UI */
  function updateProgress(pct) {
    pct = clamp(pct, 0, 100);
    if (els.progressFill)  els.progressFill.style.width  = pct + '%';
    if (els.progressThumb) els.progressThumb.style.left  = pct + '%';
    if (els.currentTimeEl) {
      els.currentTimeEl.textContent = formatTime(currentTime);
    }
  }

  /* Animation tick — simulates progress when no audio file is loaded */
  function tick(ts) {
    if (!isPlaying) return;

    if (lastTick !== null) {
      const delta = (ts - lastTick) / 1000;
      if (audio && !audio.paused && !isNaN(audio.duration)) {
        currentTime = audio.currentTime;
        duration    = audio.duration;
      } else {
        // Demo simulation
        currentTime = clamp(currentTime + delta, 0, duration);
      }
    }

    lastTick = ts;

    const pct = (currentTime / duration) * 100;
    updateProgress(pct);

    if (currentTime >= duration) {
      onTrackEnd();
      return;
    }

    rafId = requestAnimationFrame(tick);
  }

  function onTrackEnd() {
    if (isRepeated) {
      currentTime = 0;
      lastTick    = null;
      if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
      rafId = requestAnimationFrame(tick);
    } else {
      nextTrack();
    }
  }



  /* Like */
  function toggleLike() {
    isLiked = !isLiked;
    if (!els.likeBtn) return;
    els.likeBtn.classList.toggle('liked', isLiked);
    els.likeBtn.setAttribute('aria-pressed', String(isLiked));
    els.likeBtn.setAttribute('aria-label', isLiked ? 'Unlike' : 'Like');

    // Pop animation
    els.likeBtn.style.animation = 'none';
    requestAnimationFrame(() => {
      els.likeBtn.style.animation = 'like-pop 0.4s cubic-bezier(0.34,1.56,0.64,1)';
    });

    // Update heart fill
    const path = els.likeBtn.querySelector('.like-path');
    if (path) {
      path.setAttribute('fill', isLiked ? '#B57CFF' : 'none');
      path.setAttribute('stroke', isLiked ? '#B57CFF' : 'currentColor');
    }
  }

  /* Shuffle */
  function toggleShuffle() {
    isShuffled = !isShuffled;
    if (!els.shuffleBtn) return;
    els.shuffleBtn.classList.toggle('active', isShuffled);
    els.shuffleBtn.querySelector('svg').style.opacity = isShuffled ? '1' : '0.45';
    els.shuffleBtn.setAttribute('aria-pressed', String(isShuffled));
  }

  /* Repeat */
  function toggleRepeat() {
    isRepeated = !isRepeated;
    if (!els.repeatBtn) return;
    els.repeatBtn.classList.toggle('active', isRepeated);
    els.repeatBtn.querySelector('svg').style.opacity = isRepeated ? '1' : '0.45';
    els.repeatBtn.setAttribute('aria-pressed', String(isRepeated));
  }



  function updateMuteIcon() {
    if (!els.muteBtn) return;
    const muted = isMuted || volume === 0;
    els.muteBtn.innerHTML = muted
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
           <path d="M11 5L6 9H2v6h4l5 4V5z"/>
           <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
         </svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
           <path d="M11 5L6 9H2v6h4l5 4V5z"/>
           <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
           <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
         </svg>`;
    els.muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
  }

  /* Progress bar seek */
  function setupProgressBar() {
    if (!els.progressBar) return;

    let isDragging = false;

    function seek(e) {
      const rect = els.progressBar.getBoundingClientRect();
      const x    = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const pct  = clamp(x / rect.width, 0, 1);
      currentTime = pct * duration;
      lastTick    = null;
      if (audio) audio.currentTime = currentTime;
      updateProgress(pct * 100);
    }

    els.progressBar.addEventListener('mousedown', (e) => {
      isDragging = true;
      seek(e);
    });

    els.progressBar.addEventListener('touchstart', (e) => {
      isDragging = true;
      seek(e);
    }, { passive: true });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) seek(e);
    });

    document.addEventListener('touchmove', (e) => {
      if (isDragging) seek(e);
    }, { passive: true });

    document.addEventListener('mouseup',  () => { isDragging = false; });
    document.addEventListener('touchend', () => { isDragging = false; });

    // Click (non-drag)
    els.progressBar.addEventListener('click', seek);
  }

  function init() {
    els = getEls();

    // Create audio element
    audio = new Audio();
    audio.volume = volume;
    audio.preload = 'metadata';

    audio.addEventListener('timeupdate', () => {
      if (!isNaN(audio.duration)) {
        currentTime = audio.currentTime;
        duration    = audio.duration;
        updateProgress((currentTime / duration) * 100);
      }
    });

    audio.addEventListener('ended', onTrackEnd);

    // Load first track
    loadTrack(trackIndex);

    // Bind controls
    if (els.playBtn)    els.playBtn.addEventListener('click', togglePlay);
    if (els.prevBtn)    els.prevBtn.addEventListener('click', prevTrack);
    if (els.nextBtn)    els.nextBtn.addEventListener('click', nextTrack);
    if (els.likeBtn)    els.likeBtn.addEventListener('click', toggleLike);
    if (els.shuffleBtn) els.shuffleBtn.addEventListener('click', toggleShuffle);
    if (els.repeatBtn)  els.repeatBtn.addEventListener('click', toggleRepeat);
    if (els.muteBtn)    els.muteBtn.addEventListener('click', toggleMute);

    if (els.volumeSlider) {
      els.volumeSlider.value = String(Math.round(volume * 100));
      els.volumeSlider.addEventListener('input', (e) => {
        setVolume(parseInt(e.target.value, 10) / 100);
      });
    }

    setupProgressBar();
    updatePlayIcon(false);
    updateMuteIcon();
  }

  return { init };
})();


/* ── 8. PARALLAX (Mouse + Scroll) ────────────────────────── */

const ParallaxManager = (() => {
  let mouseX = 0, mouseY = 0;
  let lerpX  = 0, lerpY  = 0;
  let rafId  = null;
  let enabled = true;

  const LAYERS = [
    { sel: '.doodle-star1',    depth: 0.018 },
    { sel: '.doodle-star2',    depth: 0.022 },
    { sel: '.doodle-star3',    depth: 0.014 },
    { sel: '.doodle-moon',     depth: 0.010 },
    { sel: '.doodle-sparkle1', depth: 0.030 },
    { sel: '.doodle-sparkle2', depth: 0.025 },
    { sel: '.doodle-plus1',    depth: 0.016 },
    { sel: '.doodle-plus2',    depth: 0.020 },
    { sel: '.hero-blob-1',     depth: 0.008 },
    { sel: '.hero-blob-2',     depth: 0.012 },
    { sel: '.license-card',    depth: 0.006 },
    { sel: '.player-card',     depth: 0.007 },
  ];

  let layerEls = [];

  function onMouseMove(e) {
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    mouseX = (e.clientX - cx) / cx;
    mouseY = (e.clientY - cy) / cy;
  }

  function loop() {
    lerpX = lerp(lerpX, mouseX, 0.07);
    lerpY = lerp(lerpY, mouseY, 0.07);

    layerEls.forEach(({ el, depth }) => {
      if (!el) return;
      const tx = lerpX * window.innerWidth  * depth;
      const ty = lerpY * window.innerHeight * depth;
      el.style.setProperty('--px', `${tx}px`);
      el.style.setProperty('--py', `${ty}px`);
      // We apply transform via CSS var, but set directly here
      el.style.transform = `translate(var(--base-tx, 0), var(--base-ty, 0)) translate(${tx}px, ${ty}px)`;
    });

    rafId = requestAnimationFrame(loop);
  }

  function init() {
    // Disable on touch/small screens
    if (window.innerWidth < 768) return;

    layerEls = LAYERS.map(({ sel, depth }) => ({
      el: document.querySelector(sel),
      depth,
    })).filter(item => item.el);

    document.addEventListener('mousemove', onMouseMove, { passive: true });
    loop();
  }

  function destroy() {
    enabled = false;
    cancelAnimationFrame(rafId);
    document.removeEventListener('mousemove', onMouseMove);
  }

  return { init, destroy };
})();


/* ── 9. CARD TILT ────────────────────────────────────────── */

const CardTilt = (() => {
  const CARDS = [
    { sel: '.player-card', max: 6 },
    { sel: '.license-card', max: 8 },
    { sel: '.stat-card', max: 7 },
    { sel: '.note-card', max: 8 },
    { sel: '.friend-card', max: 7 },
  ];

  function applyTilt(el, max) {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (e.clientX - cx) / (rect.width  / 2);
      const dy   = (e.clientY - cy) / (rect.height / 2);
      const rx   = clamp(-dy * max, -max, max);
      const ry   = clamp( dx * max, -max, max);

      el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px) scale(1.02)`;
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
      el.style.transition = 'transform 0.4s cubic-bezier(0.4,0,0.2,1)';
      setTimeout(() => { el.style.transition = ''; }, 400);
    });
  }

  function init() {
    if (window.innerWidth < 768) return;

    CARDS.forEach(({ sel, max }) => {
      document.querySelectorAll(sel).forEach(el => applyTilt(el, max));
    });
  }

  return { init };
})();


/* ── 10. SCROLL ANIMATIONS ───────────────────────────────── */

const ScrollAnimations = (() => {
  let rafId   = null;
  let scrollY = 0;
  let lerpScroll = 0;

  // Scroll-based parallax for hero section
  function heroParallax() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const heroH  = hero.offsetHeight;
    const factor = scrollY / heroH;
    const clampF = clamp(factor, 0, 1);

    const heroInner = hero.querySelector('.hero-inner');
    if (heroInner) {
      heroInner.style.transform = `translateY(${clampF * 40}px)`;
      heroInner.style.opacity   = `${1 - clampF * 0.3}`;
    }
  }

  function frame() {
    scrollY = window.scrollY;
    lerpScroll = lerp(lerpScroll, scrollY, 0.1);
    heroParallax();
    rafId = requestAnimationFrame(frame);
  }

  function init() {
    frame();
  }

  function destroy() {
    cancelAnimationFrame(rafId);
  }

  return { init, destroy };
})();


/* ── 11. TYPING ANIMATION (Hero title) ───────────────────── */

const TypingAnimation = (() => {
  function init() {
    const el = document.querySelector('.hero-title');
    if (!el) return;

    const original = el.textContent.trim();
    el.textContent = '';
    el.style.borderRight = '2px solid rgba(181,124,255,0.7)';

    let i = 0;
    let typing = true;

    function step() {
      if (typing) {
        if (i < original.length) {
          el.textContent += original[i++];
          setTimeout(step, 70 + Math.random() * 50);
        } else {
          // Stop cursor blinking after complete
          setTimeout(() => {
            el.style.borderRight = 'none';
          }, 1400);
        }
      }
    }

    // Start after a brief delay
    setTimeout(step, 700);
  }

  return { init };
})();


/* ── 12. COUNTER ANIMATION ───────────────────────────────── */

const CounterAnimation = (() => {
  function animateCount(el, target, duration = 1600) {
    let start    = null;
    const suffix = el.dataset.suffix || '';

    function step(ts) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // Ease-out-cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const val  = Math.floor(ease * target);
      el.textContent = val.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function init() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el     = entry.target;
            const target = parseInt(el.dataset.count, 10);
            animateCount(el, target);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach(el => observer.observe(el));
  }

  return { init };
})();


/* ── 13. STICKER HOVER ───────────────────────────────────── */

const StickerEffects = (() => {
  function init() {
    const stickers = document.querySelectorAll('.sticker, .doodle-float');

    stickers.forEach(el => {
      el.addEventListener('mouseenter', () => {
        el.style.transform   = `rotate(${randBetween(-8, 8)}deg) scale(1.15)`;
        el.style.transition  = 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)';
        el.style.zIndex      = '10';
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform  = '';
        el.style.transition = 'transform 0.4s ease';
        el.style.zIndex     = '';
      });
    });

    // Paper card shake on hover
    const paperCards = document.querySelectorAll('.note-card, .paper-card');
    paperCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.animation = 'sticky-shake 0.3s ease';
      });

      card.addEventListener('animationend', () => {
        card.style.animation = '';
      });
    });
  }

  return { init };
})();


const audio = document.getElementById("audio");
const playBtn = document.getElementById("playBtn");
const iconPlay = document.getElementById("iconPlay");
const iconPause = document.getElementById("iconPause");

playBtn.addEventListener("click", () => {
    if (audio.paused) {
        audio.play();
        iconPlay.style.display = "none";
        iconPause.style.display = "block";
    } else {
        audio.pause();
        iconPlay.style.display = "block";
        iconPause.style.display = "none";
    }
});

const progressFill = document.getElementById("progressFill");
const currentTime = document.getElementById("currentTime");
const totalTime = document.getElementById("totalTime");

audio.addEventListener("loadedmetadata", () => {
    totalTime.textContent =
        Math.floor(audio.duration / 60) + ":" +
        String(Math.floor(audio.duration % 60)).padStart(2, "0");
});

audio.addEventListener("timeupdate", () => {
    const percent = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = percent + "%";

    currentTime.textContent =
        Math.floor(audio.currentTime / 60) + ":" +
        String(Math.floor(audio.currentTime % 60)).padStart(2, "0");
});

/* ── 14. RIPPLE EFFECT (Buttons) ─────────────────────────── */

const RippleEffect = (() => {
  function addRipple(e) {
    const btn    = e.currentTarget;
    const rect   = btn.getBoundingClientRect();
    const size   = Math.max(rect.width, rect.height);
    const x      = e.clientX - rect.left - size / 2;
    const y      = e.clientY - rect.top  - size / 2;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      width:  ${size}px;
      height: ${size}px;
      left:   ${x}px;
      top:    ${y}px;
      background: rgba(181,124,255,0.25);
      transform: scale(0);
      animation: ripple 0.6s linear;
      pointer-events: none;
    `;

    // Ensure relative positioning on button
    if (getComputedStyle(btn).position === 'static') {
      btn.style.position = 'relative';
    }
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);

    ripple.addEventListener('animationend', () => ripple.remove());
  }

  function init() {
    const btns = document.querySelectorAll('.ctrl-btn, .btn-primary, .btn-ghost, .ctrl-play');
    btns.forEach(btn => btn.addEventListener('click', addRipple));
  }

  return { init };
})();


/* ── 15. SMOOTH SCROLL (Global) ──────────────────────────── */

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}


/* ── 16. SCROLL-TO-TOP BUTTON ────────────────────────────── */

const ScrollToTop = (() => {
  let btn = null;

  function init() {
    btn = document.createElement('button');
    btn.id = 'scroll-top-btn';
    btn.setAttribute('aria-label', 'Scroll to top');
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" aria-hidden="true">
        <polyline points="18 15 12 9 6 15"/>
      </svg>`;

    btn.style.cssText = `
      position: fixed;
      bottom: 28px;
      right: 28px;
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: rgba(181,124,255,0.18);
      border: 1px solid rgba(181,124,255,0.3);
      color: #D8B8FF;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
      opacity: 0;
      transform: translateY(12px);
      transition: opacity 0.3s ease, transform 0.3s ease, background 0.2s;
      backdrop-filter: blur(8px);
      cursor: pointer;
    `;

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(181,124,255,0.3)';
      btn.style.transform  = 'translateY(0) scale(1.08)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(181,124,255,0.18)';
      btn.style.transform  = window.scrollY > 300 ? 'translateY(0)' : 'translateY(12px)';
    });

    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
      const show = window.scrollY > 300;
      btn.style.opacity   = show ? '1' : '0';
      btn.style.transform = show ? 'translateY(0)' : 'translateY(12px)';
      btn.style.pointerEvents = show ? 'all' : 'none';
    }, { passive: true });
  }

  return { init };
})();


/* ── 17. PERFORMANCE: PAGE VISIBILITY ────────────────────── */

function initVisibilityOptimization() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // The RAF loops inside each module handle their own pausing
      // naturally because requestAnimationFrame pauses on hidden tabs
    }
  });
}


/* ── 18. KEYBOARD NAVIGATION ─────────────────────────────── */

function initKeyboardNav() {
  // Space / Enter on custom interactive elements
  document.querySelectorAll('[role="button"]').forEach(el => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.click();
      }
    });
  });

  // Arrow keys for volume slider
  const volumeSlider = document.getElementById('volume-slider');
  if (volumeSlider) {
    volumeSlider.setAttribute('tabindex', '0');
  }
}


/* ── 19. LAZY LOADING ────────────────────────────────────── */

function initLazyLoading() {
  const images = document.querySelectorAll('img[data-src]');
  if (!images.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    },
    { rootMargin: '200px 0px' }
  );

  images.forEach(img => observer.observe(img));
}


/* ── 20. DOODLE SVG INJECTION ────────────────────────────── */

const DoodleInjector = (() => {
  // All SVG doodles as inline strings
  const DOODLES = {
    star: `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"
              fill="#B57CFF" opacity="0.85"/>
      </svg>`,

    sparkle: `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83
                 M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
              stroke="#D8B8FF" stroke-width="2" stroke-linecap="round"/>
      </svg>`,

    heart: `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              fill="#B57CFF" opacity="0.9"/>
      </svg>`,

    plus: `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19" stroke="#B57CFF" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>
        <line x1="5" y1="12" x2="19" y2="12" stroke="#B57CFF" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>
      </svg>`,

    paperclip: `
      <svg width="22" height="44" viewBox="0 0 22 44" fill="none" aria-hidden="true">
        <path d="M11 40 C4 40 2 34 2 28 L2 12 C2 6 6 2 11 2 C16 2 20 6 20 12 L20 30 C20 35 16 38 11 38 C6 38 4 35 4 30 L4 14 C4 9 8 7 11 7 C14 7 17 9 17 14 L17 30"
              stroke="#B57CFF" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.55"/>
      </svg>`,

    cloud: `
      <svg width="48" height="32" viewBox="0 0 48 32" fill="none" aria-hidden="true">
        <path d="M10 28 C4 28 1 23 4 18 C2 16 2 12 6 10 C6 5 11 2 17 4 C19 1 24 0 28 3 C32 1 38 4 38 10 C42 11 44 16 41 20 C44 24 41 28 37 28Z"
              fill="rgba(181,124,255,0.08)" stroke="rgba(181,124,255,0.2)" stroke-width="1"/>
      </svg>`,

    dots: `
      <svg width="32" height="16" viewBox="0 0 32 16" fill="none" aria-hidden="true">
        <circle cx="4"  cy="8" r="2.5" fill="#B57CFF" opacity="0.35"/>
        <circle cx="16" cy="8" r="2.5" fill="#B57CFF" opacity="0.35"/>
        <circle cx="28" cy="8" r="2.5" fill="#B57CFF" opacity="0.35"/>
      </svg>`,

    arrow: `
      <svg width="50" height="30" viewBox="0 0 50 30" fill="none" aria-hidden="true">
        <path d="M2 20 C10 8 30 4 42 14" stroke="#B57CFF" stroke-width="1.5"
              stroke-linecap="round" stroke-dasharray="4 3" opacity="0.5"/>
        <path d="M38 10 L44 15 L36 18" stroke="#B57CFF" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>
      </svg>`,

    coffee: `
      <svg width="32" height="36" viewBox="0 0 32 36" fill="none" aria-hidden="true">
        <rect x="4" y="10" width="20" height="18" rx="3"
              fill="rgba(181,124,255,0.12)" stroke="rgba(181,124,255,0.35)" stroke-width="1.2"/>
        <path d="M24 15 C28 15 30 18 28 21 C27 23 24 23 24 23" 
              stroke="rgba(181,124,255,0.35)" stroke-width="1.2" stroke-linecap="round" fill="none"/>
        <rect x="7" y="28" width="14" height="2" rx="1"
              fill="rgba(181,124,255,0.25)"/>
        <path d="M10 8 C10 4 14 2 14 6" stroke="rgba(181,124,255,0.4)"
              stroke-width="1.2" stroke-linecap="round" fill="none"/>
        <path d="M16 7 C16 3 20 1 20 5" stroke="rgba(181,124,255,0.4)"
              stroke-width="1.2" stroke-linecap="round" fill="none"/>
      </svg>`,

    speech: `
      <svg width="60" height="44" viewBox="0 0 60 44" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="56" height="34" rx="12"
              fill="rgba(16,16,27,0.92)" stroke="rgba(181,124,255,0.3)" stroke-width="1.2"/>
        <path d="M10 36 L6 44 L22 36" fill="rgba(16,16,27,0.92)"
              stroke="rgba(181,124,255,0.3)" stroke-width="1.2" stroke-linejoin="round"/>
        <line x1="14" y1="16" x2="46" y2="16" stroke="rgba(181,124,255,0.35)" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="14" y1="22" x2="38" y2="22" stroke="rgba(181,124,255,0.25)" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,

    mask: `
      <svg width="44" height="32" viewBox="0 0 44 32" fill="none" aria-hidden="true">
        <ellipse cx="22" cy="16" rx="20" ry="14"
                 fill="rgba(181,124,255,0.1)" stroke="rgba(181,124,255,0.3)" stroke-width="1.2"/>
        <path d="M8 18 C12 22 32 22 36 18" stroke="rgba(181,124,255,0.5)"
              stroke-width="1.5" stroke-linecap="round" fill="none"/>
        <circle cx="14" cy="13" r="3" fill="rgba(181,124,255,0.2)"/>
        <circle cx="30" cy="13" r="3" fill="rgba(181,124,255,0.2)"/>
      </svg>`,
  };

  function inject(containerId, type) {
    const container = document.getElementById(containerId);
    if (!container || !DOODLES[type]) return;
    container.innerHTML = DOODLES[type];
  }

  function injectAll() {
    // Inject into doodle placeholders by data attribute
    document.querySelectorAll('[data-doodle]').forEach(el => {
      const type = el.dataset.doodle;
      if (DOODLES[type]) el.innerHTML = DOODLES[type];
    });
  }

  // Expose SVGs for external use
  function get(type) {
    return DOODLES[type] || '';
  }

  return { inject, injectAll, get };
})();


/* ── 21. ALBUM ART PLACEHOLDER ───────────────────────────── */

function generateAlbumArtPlaceholder() {
  const canvas  = document.createElement('canvas');
  canvas.width  = 160;
  canvas.height = 160;
  const ctx     = canvas.getContext('2d');

  // Background gradient
  const grd = ctx.createLinearGradient(0, 0, 160, 160);
  grd.addColorStop(0, '#1a0a2e');
  grd.addColorStop(0.5, '#2d1060');
  grd.addColorStop(1, '#0a0a1a');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 160, 160);

  // Stars
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 160;
    const y = Math.random() * 160;
    const r = Math.random() * 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.8 + 0.2})`;
    ctx.fill();
  }

  // Center heart
  ctx.save();
  ctx.translate(80, 80);
  ctx.fillStyle = 'rgba(181,124,255,0.7)';
  ctx.shadowBlur = 20;
  ctx.shadowColor = '#B57CFF';
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.bezierCurveTo(20, -38, 40, -18, 0, 10);
  ctx.bezierCurveTo(-40, -18, -20, -38, 0, -22);
  ctx.fill();
  ctx.restore();

  // Note text
  ctx.font = 'bold 11px Poppins, sans-serif';
  ctx.fillStyle = 'rgba(216,184,255,0.55)';
  ctx.textAlign  = 'center';
  ctx.fillText('Best Friends', 80, 124);

  return canvas.toDataURL();
}


/* ── 22. INIT ALL ─────────────────────────────────────────── */

function initAll() {
  // Inject SVG doodles first
  DoodleInjector.injectAll();

  // Core visual systems
  StarField.init();
  ParticleSystem.init();
  CursorManager.init();

  // UI Systems
  NavbarManager.init();
  RevealManager.init();
  MusicPlayer.init();

  // Interactive effects
  ParallaxManager.init();
  CardTilt.init();
  ScrollAnimations.init();
  StickerEffects.init();
  RippleEffect.init();
  CounterAnimation.init();

  // Utilities
  ScrollToTop.init();
  initSmoothScroll();
  initKeyboardNav();
  initLazyLoading();
  initVisibilityOptimization();

  // Generate album art placeholder if no image set
  const albumArt = document.getElementById('album-art');
  if (albumArt && (!albumArt.src || albumArt.src === window.location.href)) {
    albumArt.src = generateAlbumArtPlaceholder();
    albumArt.alt = 'Album artwork — Best Friends';
  }

  // Typing animation last (after DOM is ready)
  setTimeout(() => TypingAnimation.init(), 100);

  // Announce page loaded for screen readers
  const announce = document.getElementById('a11y-announce');
  if (announce) {
    setTimeout(() => {
      announce.textContent = 'Page loaded. Welcome to the Best Friends website.';
    }, 1200);
  }
}


// ================= MUSIC PLAYER =================

const audio = document.getElementById("audio");

const playBtn = document.getElementById("playBtn");
const playIcon = document.getElementById("iconPlay");
const pauseIcon = document.getElementById("iconPause");

const progressFill = document.getElementById("progressFill");
const progressBar = document.getElementById("progressBar");

const currentTime = document.getElementById("currentTime");
const totalTime = document.getElementById("totalTime");

const volumeSlider = document.getElementById("volumeSlider");

// Play / Pause
playBtn.addEventListener("click", () => {

    if (audio.paused) {

        audio.play();

        playIcon.style.display = "none";
        pauseIcon.style.display = "block";

    } else {

        audio.pause();

        playIcon.style.display = "block";
        pauseIcon.style.display = "none";
    }

});

// Song Loaded
audio.addEventListener("loadedmetadata", () => {

    totalTime.textContent =
        formatTime(audio.duration);

});

// Progress
audio.addEventListener("timeupdate", () => {

    currentTime.textContent =
        formatTime(audio.currentTime);

    const percent =
        (audio.currentTime / audio.duration) * 100;

    progressFill.style.width = percent + "%";

});

// Click Progress Bar
progressBar.addEventListener("click", (e) => {

    const rect = progressBar.getBoundingClientRect();

    const x = e.clientX - rect.left;

    const percent = x / rect.width;

    audio.currentTime = percent * audio.duration;

});

// Volume
volumeSlider.addEventListener("input", () => {

    audio.volume = volumeSlider.value / 100;

});

// When song ends
audio.addEventListener("ended", () => {

    playIcon.style.display = "block";
    pauseIcon.style.display = "none";

});

// Time format
function formatTime(seconds){

    if(isNaN(seconds)) return "0:00";

    const min = Math.floor(seconds / 60);

    const sec = Math.floor(seconds % 60);

    return min + ":" + String(sec).padStart(2,"0");

}
/* ── 23. DOM READY ────────────────────────────────────────── */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}
