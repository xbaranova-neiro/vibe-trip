/**
 * Vibe Trip — эффекты
 * — Confetti (легковесный)
 * — CountUp для цен
 * — Ripple для кнопок
 * — Mouse-follow glow для карточек
 */
(function () {
  'use strict';

  const day = document.body.getAttribute('data-vibe-day') || '1';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ════════════════ 1. BLUR TEXT — h1 из размытия ════════════════ */
  function initBlurText() {
    document.querySelectorAll('header h1').forEach((h1) => {
      h1.classList.add('vfx-blur-in');
    });
  }

  /* ════════════════ 2. DECRYPTED TEXT — день 2 ════════════════ */
  const GLYPHS = '01$¥€£₿▓▒░█▄▀╬╫╪';

  function decryptText(el) {
    const original = el.textContent;
    const len = original.length;
    let frame = 0;
    const totalFrames = 28;

    function tick() {
      let out = '';
      for (let i = 0; i < len; i++) {
        if (original[i] === ' ') {
          out += ' ';
        } else if (i < (frame / totalFrames) * len) {
          out += original[i];
        } else {
          out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
      }
      el.textContent = out;
      frame++;
      if (frame <= totalFrames) requestAnimationFrame(tick);
    }

    setTimeout(tick, 600);
  }

  function initDecryptedText() {
    if (day !== '2') return;
    const h1 = document.querySelector('header h1');
    if (h1) decryptText(h1);
  }

  /* ════════════════ 3. COUNT UP — порт React Bits CountUp (JS+CSS, без React)
   *    Логика как в motion/react useSpring: damping = 20 + 40*(1/duration),
   *    stiffness = 100*(1/duration). Формат числа — как в компоненте (Intl en-US + separator).
   ════════════════ */
  const countUpRunning = new WeakMap();

  function getDecimalPlaces(num) {
    const str = String(num);
    if (str.includes('.')) {
      const decimals = str.split('.')[1];
      if (parseInt(decimals, 10) !== 0) return decimals.length;
    }
    return 0;
  }

  function formatCountValue(latest, maxDecimals, separator) {
    const hasDecimals = maxDecimals > 0;
    const useGrouping = !!separator;
    const options = {
      useGrouping: useGrouping,
      minimumFractionDigits: hasDecimals ? maxDecimals : 0,
      maximumFractionDigits: hasDecimals ? maxDecimals : 0,
    };
    const formattedNumber = Intl.NumberFormat('en-US', options).format(latest);
    return separator ? formattedNumber.replace(/,/g, separator) : formattedNumber;
  }

  function normalizeCountUpOptions(second, third) {
    if (second !== null && typeof second === 'object' && !Array.isArray(second)) {
      return Object.assign(
        {
          from: 0,
          to: 0,
          direction: 'up',
          delay: 0,
          duration: 2,
          className: '',
          startWhen: true,
          separator: '',
          prefix: '',
          suffix: '',
          onStart: null,
          onEnd: null,
        },
        second
      );
    }
    const to = Number(second);
    return {
      from: 0,
      to: to,
      direction: 'up',
      delay: 0,
      duration: 2,
      className: '',
      startWhen: true,
      separator: ' ',
      prefix: '~',
      suffix: third || '',
      onStart: null,
      onEnd: null,
    };
  }

  function runSpringCount(fromVal, toVal, duration, direction, onFrame) {
    const startPos = direction === 'down' ? toVal : fromVal;
    const endPos = direction === 'down' ? fromVal : toVal;
    const damping = 20 + 40 * (1 / duration);
    const stiffness = 100 * (1 / duration);
    let x = startPos;
    let v = 0;
    let lastT = performance.now();
    let rafId = 0;

    function tick(now) {
      const dt = Math.min((now - lastT) / 1000, 0.064);
      lastT = now;
      const displacement = x - endPos;
      const acceleration = -stiffness * displacement - damping * v;
      v += acceleration * dt;
      x += v * dt;
      if (Math.abs(endPos - x) < 1e-5 && Math.abs(v) < 0.08) {
        x = endPos;
        onFrame(x);
        return;
      }
      onFrame(x);
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return function cancel() {
      cancelAnimationFrame(rafId);
    };
  }

  function mountCountUp(el, rawOpts) {
    const opts = rawOpts;
    const from = Number(opts.from) || 0;
    const to = Number(opts.to);
    const direction = opts.direction === 'down' ? 'down' : 'up';
    const delaySec = Number(opts.delay) || 0;
    const duration = Number(opts.duration);
    const dur = duration > 0 ? duration : 2;
    const separator = opts.separator !== undefined ? opts.separator : '';
    const prefix = opts.prefix !== undefined ? opts.prefix : '';
    const suffix = opts.suffix !== undefined ? opts.suffix : '';
    const className = opts.className || '';
    const startWhen = opts.startWhen !== false;
    const onStart = typeof opts.onStart === 'function' ? opts.onStart : null;
    const onEnd = typeof opts.onEnd === 'function' ? opts.onEnd : null;

    const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

    const prevCancel = countUpRunning.get(el);
    if (typeof prevCancel === 'function') prevCancel();

    if (reducedMotion || !Number.isFinite(to)) {
      const fin = maxDecimals > 0 ? to : Math.round(to);
      el.textContent = prefix + formatCountValue(fin, maxDecimals, separator) + suffix;
      if (className) el.classList.add(...className.trim().split(/\s+/).filter(Boolean));
      return function () {};
    }

    if (className) el.classList.add(...className.trim().split(/\s+/).filter(Boolean));

    const initialDisplay = direction === 'down' ? to : from;
    const initVal = maxDecimals > 0 ? initialDisplay : Math.round(initialDisplay);
    el.textContent =
      prefix + formatCountValue(initVal, maxDecimals, separator) + suffix;

    let springCancel = null;
    let delayTimer = null;
    let endTimer = null;
    let io = null;

    function formatLatest(latest) {
      const v = maxDecimals > 0 ? latest : Math.round(latest);
      return prefix + formatCountValue(v, maxDecimals, separator) + suffix;
    }

    /** Как в React Bits: onStart сразу, затем delay, затем spring; onEnd через delay+duration от старта цикла. */
    function startCycle() {
      if (onStart) onStart();

      endTimer = setTimeout(() => {
        if (onEnd) onEnd();
      }, delaySec * 1000 + dur * 1000);

      delayTimer = setTimeout(() => {
        springCancel = runSpringCount(from, to, dur, direction, (latest) => {
          el.textContent = formatLatest(latest);
        });
      }, delaySec * 1000);

      countUpRunning.set(el, cancelAll);
    }

    function cancelAll() {
      if (delayTimer) clearTimeout(delayTimer);
      if (endTimer) clearTimeout(endTimer);
      if (springCancel) springCancel();
      if (io) io.disconnect();
      countUpRunning.delete(el);
    }

    if (!startWhen) {
      startCycle();
      return cancelAll;
    }

    let started = false;

    function tryStart() {
      if (started) return;
      started = true;
      if (io) {
        io.disconnect();
        io = null;
      }
      startCycle();
    }

    io = new IntersectionObserver(
      (entries) => {
        const ent = entries[0];
        if (ent && ent.isIntersecting) tryStart();
      },
      { root: null, rootMargin: '0px', threshold: 0 }
    );
    io.observe(el);

    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const visible =
        r.width > 0 &&
        r.height > 0 &&
        r.bottom > 0 &&
        r.top < vh;
      if (visible) tryStart();
    });

    countUpRunning.set(el, cancelAll);
    return cancelAll;
  }

  /** Совместимость: vibeCountUp(el, to, suffix) | vibeCountUp(el, { ...props }) */
  window.vibeCountUp = function (el, second, third) {
    if (!el) return;
    const opts = normalizeCountUpOptions(second, third);
    return mountCountUp(el, opts);
  };

  /** Явный API как у React Bits CountUp (ванильный порт) */
  window.CountUp = {
    animate: function (el, props) {
      return mountCountUp(el, props || {});
    },
  };

  /* ════════════════ 4. SHINY TEXT — блик по тексту ════════════════ */
  function initShinyText() {
    document.querySelectorAll('header h1').forEach((h1) => {
      if (day === '2') return;
      h1.classList.add('vfx-shiny');
    });
  }

  /* ════════════════ 5. SPOTLIGHT CARD — подсветка за курсором ════════════════ */
  function initSpotlight() {
    if (reducedMotion) return;

    const cards = document.querySelectorAll('.card, .card-opt, .gate-inner');
    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--spot-x', x + 'px');
        card.style.setProperty('--spot-y', y + 'px');
        card.style.setProperty('--mouse-x', (x / rect.width) * 100 + '%');
        card.style.setProperty('--mouse-y', (y / rect.height) * 100 + '%');
        card.classList.add('vfx-spotlight');
      });
      card.addEventListener('mouseleave', () => {
        card.classList.remove('vfx-spotlight');
      });
    });
  }

  /* ════════════════ 5.1 BUTTON RIPPLE — эффект волны на кнопках ════════════════ */
  function initButtonRipple() {
    if (reducedMotion) return;

    const buttons = document.querySelectorAll('.btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', function (e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const ripple = document.createElement('span');
        ripple.className = 'vfx-ripple';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        this.appendChild(ripple);

        ripple.addEventListener('animationend', () => ripple.remove());
      });
    });
  }

  /* ════════════════ 6. CLICK SPARK — искры день 3 ════════════════ */
  function createSpark(x, y, container) {
    if (reducedMotion) return;
    const count = 8;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('div');
      spark.className = 'vfx-spark';
      const angle = (i / count) * 360;
      const dist = 18 + Math.random() * 22;
      spark.style.cssText = `
        left:${x}px;top:${y}px;
        --sx:${Math.cos((angle * Math.PI) / 180) * dist}px;
        --sy:${Math.sin((angle * Math.PI) / 180) * dist}px;
        --hue:${40 + Math.random() * 280};
      `;
      container.appendChild(spark);
      spark.addEventListener('animationend', () => spark.remove());
    }
  }

  window.vibeClickSpark = createSpark;

  /* ════════════════ 7. STAR BORDER — мерцающие точки ════════════════ */
  function initStarBorder() {
    if (reducedMotion) return;
    document.querySelectorAll('.price-box, .code-box').forEach((box) => {
      box.classList.add('vfx-star-border');
    });
  }

  /* ════════════════ СТИЛИ ════════════════ */
  function injectStyles() {
    const colors = {
      '1': { spot: '251,146,60', shiny: '#ec4899' },
      '2': { spot: '34,211,238', shiny: '#22d3ee' },
      '3': { spot: '217,70,239', shiny: '#a855f7' },
    };
    const c = colors[day] || colors['1'];

    const css = document.createElement('style');
    css.textContent = `
      /* --- React Bits CountUp (ванильный порт): табличные цифры --- */
      .count-up-text {
        font-variant-numeric: tabular-nums;
      }

      /* --- Blur Text --- */
      .vfx-blur-in {
        animation: vfx-blur-resolve 0.9s cubic-bezier(0.22,1,0.36,1) 0.15s both;
      }
      @keyframes vfx-blur-resolve {
        from { filter: blur(12px); opacity: 0; transform: translateY(8px) scale(0.97); }
        to   { filter: blur(0);    opacity: 1; transform: translateY(0) scale(1); }
      }

      /* --- Shiny Text sweep --- */
      .vfx-shiny {
        position: relative;
        overflow: hidden;
      }
      .vfx-shiny::after {
        content: "";
        position: absolute;
        top: 0; left: -80%; width: 50%; height: 100%;
        background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%);
        transform: skewX(-20deg);
        pointer-events: none;
        animation: vfx-shiny-sweep 4s ease-in-out 1.5s infinite;
      }
      @keyframes vfx-shiny-sweep {
        0%   { left: -80%; }
        40%  { left: 130%; }
        100% { left: 130%; }
      }

      /* --- Spotlight Card --- */
      .vfx-spotlight::after {
        content: "" !important;
        position: absolute !important;
        inset: 0 !important;
        border-radius: inherit !important;
        background: radial-gradient(
          280px circle at var(--spot-x) var(--spot-y),
          rgba(${c.spot}, 0.12),
          transparent 70%
        ) !important;
        pointer-events: none !important;
        z-index: 2 !important;
        transition: opacity 0.25s ease !important;
        width: auto !important; height: auto !important;
        top: 0 !important; left: 0 !important;
        transform: none !important;
      }

      /* --- Button Ripple --- */
      .vfx-ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        transform: scale(0);
        animation: vfx-ripple-expand 0.6s ease-out;
        pointer-events: none;
      }
      @keyframes vfx-ripple-expand {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }

      /* --- Click Spark --- */
      .vfx-spark {
        position: absolute;
        width: 6px; height: 6px;
        border-radius: 50%;
        background: hsl(var(--hue), 90%, 60%);
        pointer-events: none;
        z-index: 50;
        animation: vfx-spark-fly 0.55s cubic-bezier(0.22,1,0.36,1) forwards;
      }
      @keyframes vfx-spark-fly {
        0%   { transform: translate(0,0) scale(1); opacity: 1; }
        100% { transform: translate(var(--sx), var(--sy)) scale(0); opacity: 0; }
      }

      /* --- Star Border (orbiting dots) --- */
      .vfx-star-border {
        overflow: visible !important;
      }
      .vfx-star-border::after {
        content: "" !important;
        position: absolute !important;
        inset: -3px !important;
        border-radius: inherit !important;
        background: none !important;
        width: auto !important; height: auto !important; top: auto !important; left: auto !important;
        transform: none !important;
        border: none !important;
        pointer-events: none !important;
        z-index: 3 !important;
        mask-image: none !important;
        /* animated dots via box-shadow */
        animation: vfx-stars-orbit 6s linear infinite !important;
        box-shadow:
          12px -3px 0 1.5px rgba(${c.spot},0.5),
          calc(100% - 8px) 12px 0 1.5px rgba(${c.spot},0.35),
          calc(50%) calc(100% + 2px) 0 1.5px rgba(${c.spot},0.45),
          -2px calc(50%) 0 1.5px rgba(${c.spot},0.3);
      }
      @keyframes vfx-stars-orbit {
        0%   { filter: brightness(1); }
        25%  { filter: brightness(1.6); }
        50%  { filter: brightness(0.8); }
        75%  { filter: brightness(1.4); }
        100% { filter: brightness(1); }
      }

      /* --- Particles --- */
      .vfx-particle {
        position: fixed;
        pointer-events: none;
        z-index: 0;
        opacity: 0;
        user-select: none;
        animation: vfx-particle-rise linear forwards;
      }
      @keyframes vfx-particle-rise {
        0%   { opacity: 0;    transform: translateY(0)       rotate(0deg);   }
        8%   { opacity: 0.4; }
        88%  { opacity: 0.25; }
        100% { opacity: 0;    transform: translateY(-115vh)  rotate(400deg); }
      }

      /* --- Mascot --- */
      .vfx-mascot {
        position: fixed;
        bottom: 20px;
        right: 18px;
        font-size: 2.2rem;
        z-index: 10;
        pointer-events: none;
        user-select: none;
        animation: vfx-mascot-float 3.4s ease-in-out infinite;
        filter: drop-shadow(0 6px 12px rgba(0,0,0,0.13));
      }
      @keyframes vfx-mascot-float {
        0%, 100% { transform: translateY(0)     rotate(-6deg); }
        50%       { transform: translateY(-13px) rotate( 6deg); }
      }

      /* --- Confetti --- */
      .vfx-confetti {
        position: fixed;
        top: -14px;
        pointer-events: none;
        z-index: 9998;
        border-radius: 2px;
        animation: vfx-confetti-fall linear forwards;
      }
      .vfx-confetti.round { border-radius: 50%; }
      @keyframes vfx-confetti-fall {
        0%   { transform: translateY(0)      rotate(0deg);   opacity: 1; }
        100% { transform: translateY(112vh)  rotate(720deg); opacity: 0; }
      }

      @media (prefers-reduced-motion: reduce) {
        .vfx-blur-in { animation: none !important; filter: none !important; opacity: 1 !important; }
        .vfx-shiny::after { animation: none !important; display: none !important; }
        .vfx-star-border::after { animation: none !important; }
        .vfx-ripple { animation: none !important; display: none !important; }
        .vfx-particle, .vfx-mascot { display: none !important; }
      }
    `;
    document.head.appendChild(css);
  }

  /* ════════════════ 8. PARTICLES — плавающие эмодзи ════════════════ */
  function initParticles() {
    if (reducedMotion) return;
    const sets = {
      '1': ['✈️', '🌴', '🌊', '🏖️', '🌅', '🐠', '⛱️'],
      '2': ['💸', '💰', '💳', '📈', '🤑', '💵', '✨'],
      '3': ['⭐', '🎯', '💫', '🔥', '🏆', '💥', '🌟'],
    };
    const emojis = sets[day] || sets['1'];

    function spawn() {
      const el = document.createElement('div');
      el.className = 'vfx-particle';
      el.textContent = emojis[(Math.random() * emojis.length) | 0];
      el.style.left = (3 + Math.random() * 94) + 'vw';
      el.style.bottom = '-6vh';
      el.style.fontSize = (0.85 + Math.random() * 1.1) + 'rem';
      el.style.animationDuration = (11 + Math.random() * 14) + 's';
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    }

    for (let i = 0; i < 5; i++) setTimeout(spawn, i * 900 + Math.random() * 300);
    setInterval(spawn, 2800);
  }

  /* ════════════════ 9. CONFETTI ════════════════ */
  window.vibeConfetti = function () {
    if (reducedMotion) return;
    const colors = ['#ff6b9d', '#7c4dff', '#ff8a65', '#00bcd4', '#ffeb3b', '#4caf50', '#e91e63', '#2196f3'];
    for (let i = 0; i < 90; i++) {
      const el = document.createElement('div');
      el.className = 'vfx-confetti' + (Math.random() > 0.55 ? ' round' : '');
      el.style.left = (3 + Math.random() * 94) + 'vw';
      el.style.width = (5 + Math.random() * 9) + 'px';
      el.style.height = (5 + Math.random() * 12) + 'px';
      el.style.background = colors[(Math.random() * colors.length) | 0];
      el.style.animationDuration = (1.6 + Math.random() * 2.8) + 's';
      el.style.animationDelay = (Math.random() * 1.4) + 's';
      el.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    }
  };

  /* ════════════════ 10. MASCOT ════════════════ */
  function initMascot() {
    if (reducedMotion) return;
    const chars = { '1': '✈️', '2': '💰', '3': '🕹️' };
    const el = document.createElement('div');
    el.className = 'vfx-mascot';
    el.setAttribute('aria-hidden', 'true');
    el.textContent = chars[day] || '✈️';
    document.body.appendChild(el);
  }

  /* ════════════════ INIT ════════════════ */
  function init() {
    injectStyles();
    initBlurText();
    initShinyText();
    initDecryptedText();
    initSpotlight();
    initButtonRipple();
    initStarBorder();
    initParticles();
    initMascot();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
