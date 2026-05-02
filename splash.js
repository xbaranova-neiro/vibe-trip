/**
 * Vibe Trip — тематические splash-экраны при загрузке каждого дня.
 * День 1: закат + волна + самолёт
 * День 2: неоновая сетка + глитч + сканлайн
 * День 3: аркадный обратный отсчёт 3-2-1-GO
 * Автоскрытие через ~2 с, затем контент плавно появляется.
 */
(function () {
  const day = document.body.getAttribute('data-vibe-day');
  if (!day) return;

  const overlay = document.createElement('div');
  overlay.id = 'vibeSplash';
  overlay.setAttribute('aria-hidden', 'true');

  const base = `
    position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
    flex-direction:column;margin:0;padding:1rem;text-align:center;
    font-family:"Syne","Plus Jakarta Sans",system-ui,sans-serif;
    transition:opacity 0.45s ease,transform 0.45s ease;
  `;

  if (day === '1') {
    overlay.style.cssText = base + `
      background:linear-gradient(175deg,#fff7ed 0%,#fed7aa 30%,#fca5a5 58%,#7dd3fc 82%,#0ea5e9 100%);
      color:#7c2d12;overflow:hidden;
    `;
    overlay.innerHTML = `
      <div style="position:absolute;bottom:0;left:0;right:0;height:35%;overflow:hidden;">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" style="width:200%;height:100%;position:absolute;bottom:0;left:-25%;animation:splashWave 3s ease-in-out infinite;">
          <path d="M0,64 C300,10 400,110 600,60 C800,10 900,100 1200,50 L1200,120 L0,120 Z" fill="rgba(6,182,212,0.35)"/>
        </svg>
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" style="width:200%;height:100%;position:absolute;bottom:-6px;left:-15%;animation:splashWave 3.6s ease-in-out 0.3s infinite;">
          <path d="M0,80 C200,30 450,100 650,55 C850,10 1000,90 1200,70 L1200,120 L0,120 Z" fill="rgba(14,165,233,0.25)"/>
        </svg>
      </div>
      <div style="font-size:3.5rem;animation:splashSunrise 1.2s ease both;">🌅</div>
      <div style="font-size:clamp(1.3rem,5vw,1.8rem);font-weight:800;letter-spacing:-0.04em;margin-top:0.5rem;animation:splashFadeUp 0.7s ease 0.3s both;">Сколько стоит твоя мечта?</div>
      <div style="font-size:0.95rem;font-weight:600;opacity:0.7;margin-top:0.3rem;animation:splashFadeUp 0.6s ease 0.55s both;">5 вопросов — и узнаешь 🌴</div>
      <div style="font-size:1.6rem;position:absolute;top:18%;right:12%;animation:splashPlane 2s ease-in-out both;">✈️</div>
    `;
  } else if (day === '2') {
    overlay.style.cssText = base + `
      background:#0c1222;color:#e2e8f0;overflow:hidden;
    `;
    overlay.innerHTML = `
      <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(34,211,238,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.08) 1px,transparent 1px);background-size:32px 32px;animation:splashGridPulse 2s ease-in-out infinite;"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 48%,rgba(34,211,238,0.06) 50%,transparent 52%);background-size:100% 8px;animation:splashScanline 4s linear infinite;pointer-events:none;"></div>
      <div style="position:absolute;width:280px;height:280px;border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(168,85,247,0.3),transparent 65%);animation:splashNeonGlow 2s ease-in-out infinite;"></div>
      <div style="font-size:3rem;position:relative;animation:splashGlitch 0.8s ease 0.2s both;">💸</div>
      <div style="font-size:clamp(1.3rem,5vw,1.8rem);font-weight:800;letter-spacing:-0.04em;margin-top:0.5rem;position:relative;animation:splashFadeUp 0.6s ease 0.4s both;">
        <span style="background:linear-gradient(90deg,#22d3ee,#a855f7);-webkit-background-clip:text;background-clip:text;color:transparent;">А хватит ли денег?</span>
      </div>
      <div style="font-size:0.95rem;font-weight:600;color:#94a3b8;margin-top:0.3rem;position:relative;animation:splashFadeUp 0.6s ease 0.6s both;">День 2 · Финансовый допрос</div>
    `;
  } else if (day === '3') {
    overlay.style.cssText = base + `
      background:linear-gradient(165deg,#fef9c3 0%,#fce7f3 40%,#e0e7ff 100%);
      color:#1e1b4b;overflow:hidden;
    `;
    overlay.innerHTML = `
      <div style="position:absolute;inset:0;background-image:radial-gradient(rgba(124,58,237,0.12) 2px,transparent 2px);background-size:16px 16px;"></div>
      <div id="splashCountdown" style="font-size:clamp(4rem,14vw,7rem);font-weight:800;letter-spacing:-0.06em;position:relative;line-height:1;
        text-shadow:4px 6px 0 rgba(30,27,75,0.15);
        background:linear-gradient(135deg,#a855f7,#ec4899,#0ea5e9);-webkit-background-clip:text;background-clip:text;color:transparent;
        animation:splashBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) both;">3</div>
      <div style="font-size:clamp(1rem,4vw,1.3rem);font-weight:700;position:relative;margin-top:0.5rem;animation:splashFadeUp 0.5s ease 0.2s both;">Приготовься ловить заказы!</div>
    `;
  }

  document.body.prepend(overlay);

  const css = document.createElement('style');
  css.textContent = `
    @keyframes splashWave{0%,100%{transform:translateX(0)}50%{transform:translateX(-8%)}}
    @keyframes splashSunrise{from{opacity:0;transform:translateY(30px) scale(0.6)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes splashFadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes splashPlane{0%{opacity:0;transform:translate(-60px,20px) rotate(-8deg)}40%{opacity:1}100%{opacity:1;transform:translate(10px,-10px) rotate(-3deg)}}
    @keyframes splashGridPulse{0%,100%{opacity:0.7}50%{opacity:1}}
    @keyframes splashScanline{0%{background-position:0 0}100%{background-position:0 100vh}}
    @keyframes splashNeonGlow{0%,100%{opacity:0.5;transform:translate(-50%,-50%) scale(1)}50%{opacity:0.85;transform:translate(-50%,-50%) scale(1.15)}}
    @keyframes splashGlitch{0%{opacity:0;transform:translate(0,10px)}15%{transform:translate(-3px,8px)}30%{transform:translate(3px,4px)}50%{opacity:1;transform:translate(-1px,0)}100%{transform:translate(0,0)}}
    @keyframes splashBounce{from{opacity:0;transform:scale(0.3)}to{opacity:1;transform:scale(1)}}
    #vibeSplash.splash-out{opacity:0;transform:scale(1.04);}
    @media(prefers-reduced-motion:reduce){
      #vibeSplash,#vibeSplash *{animation-duration:0.01s!important;transition-duration:0.01s!important;}
    }
  `;
  document.head.appendChild(css);

  if (day === '3') {
    const cd = document.getElementById('splashCountdown');
    if (cd) {
      let n = 3;
      const tick = setInterval(() => {
        n--;
        if (n > 0) {
          cd.textContent = String(n);
          cd.style.animation = 'none';
          void cd.offsetWidth;
          cd.style.animation = 'splashBounce 0.45s cubic-bezier(0.34,1.56,0.64,1) both';
        } else {
          cd.textContent = 'GO!';
          cd.style.animation = 'none';
          void cd.offsetWidth;
          cd.style.animation = 'splashBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) both';
          clearInterval(tick);
        }
      }, 550);
    }
  }

  const duration = day === '3' ? 2200 : 1800;

  setTimeout(() => {
    overlay.classList.add('splash-out');
    setTimeout(() => {
      overlay.remove();
    }, 500);
  }, duration);
})();
