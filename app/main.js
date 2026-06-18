// main.js — Canvas 框架:縮放、場景管理、按鈕、粒子、語音
(function () {
  const W = 1194, H = 834;
  const TAU = Math.PI * 2;

  const PLS = {
    W: W, H: H,
    screens: {},
    current: null,
    buttons: [],
    particles: [],
    canvas: null, ctx: null,
    scale: 1, offX: 0, offY: 0,
    t: 0,
    activePet: null,           // 目前所在寵物(供積分 HUD 顯示;首頁為 null)
    currentName: null          // 目前畫面名稱(供積分 HUD 判斷右上角是否要讓位)
  };

  // ── 場景切換 ──────────────────────────────────────────
  PLS.register = function (name, screen) { PLS.screens[name] = screen; };
  PLS.go = function (name, params) {
    PLS.buttons = [];
    PLS.particles = [];
    params = params || {};
    // 記住目前寵物(首頁清空),讓全域積分 HUD 知道要顯示誰的分數
    if (name === 'home') PLS.activePet = null;
    else if (params.pet) PLS.activePet = params.pet;
    if (window.PLS_POINTS && window.PLS_POINTS.mark) window.PLS_POINTS.mark();
    PLS.currentName = name;
    PLS.current = PLS.screens[name];
    if (PLS.current && PLS.current.enter) PLS.current.enter(params);
  };

  // ── 按鈕 ──────────────────────────────────────────────
  // b = {x,y,w,h, draw(ctx,t,pressScale), onTap, disabled()}
  PLS.addButton = function (b) { PLS.buttons.push(b); return b; };
  PLS.drawButtons = function (ctx, t) {
    PLS.buttons.forEach(function (b) {
      if (b.hidden && b.hidden()) return;
      const p = b._press || 0;
      const s = 1 - 0.06 * p;
      ctx.save();
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
      ctx.scale(s, s);
      ctx.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
      b.draw(ctx, t, p);
      ctx.restore();
      if (b._press > 0 && !b._down) b._press = Math.max(0, b._press - 0.15);
    });
  };

  function hit(b, x, y) {
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  // ── 粒子(愛心、星星、碎屑)────────────────────────────
  PLS.spawn = function (n, fn) {
    for (let i = 0; i < n; i++) PLS.particles.push(fn(i));
  };
  PLS.burst = function (x, y, kind) {
    const A = window.PLS_ART;
    PLS.spawn(kind === 'feast' ? 18 : 8, function () {
      const a = Math.random() * TAU, sp = 60 + Math.random() * 160;
      return {
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120,
        life: 0.9 + Math.random() * 0.5, age: 0,
        r: 6 + Math.random() * 8,
        heart: Math.random() < (kind === 'feast' ? 0.5 : 0.35),
        col: ['#F6C95E', '#F8B8C4', '#A8D8C0', '#F2A88C'][Math.floor(Math.random() * 4)],
        draw: function (ctx) {
          const k = 1 - this.age / this.life;
          if (this.heart) A.heart(ctx, this.x, this.y, this.r * k, this.col, k);
          else A.sparkle(ctx, this.x, this.y, this.r * k * 1.4, this.col, k);
        }
      };
    });
  };

  // ── 語音(SpeechSynthesis)────────────────────────────
  let voiceZh = null;
  function pickVoices() {
    const vs = speechSynthesis.getVoices();
    voiceZh = vs.find(function (v) { return v.lang === 'zh-TW'; }) ||
              vs.find(function (v) { return v.lang && v.lang.indexOf('zh') === 0; }) || null;
  }
  if (window.speechSynthesis) {
    pickVoices();
    speechSynthesis.onvoiceschanged = pickVoices;
  }
  PLS.say = function (text, lang) {
    if (!window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || 'zh-TW';
      if (!lang && voiceZh) u.voice = voiceZh;
      u.rate = 0.88;
      speechSynthesis.speak(u);
    } catch (e) {}
  };

  // ── 音效(極輕的 WebAudio 提示音)─────────────────────
  let ac = null;
  function tone(freq, dur, vol, when, type) {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } }
    if (ac.state === 'suspended') ac.resume();
    const t0 = ac.currentTime + (when || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol || 0.08, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  PLS.sfx = {
    tap: function () { tone(660, 0.08, 0.04); },
    correct: function () { tone(740, 0.12, 0.06); tone(988, 0.16, 0.06, 0.09); },
    wrong: function () { tone(330, 0.18, 0.035); },          // 低、短、中性
    bite: function () { tone(520, 0.06, 0.05, 0, 'triangle'); },
    feast: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.22, 0.06, i * 0.12); }); }
  };

  // ── 主迴圈與輸入 ──────────────────────────────────────
  PLS.init = function (canvas) {
    PLS.canvas = canvas;
    PLS.ctx = canvas.getContext('2d');

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const vw = window.innerWidth, vh = window.innerHeight;
      canvas.width = vw * dpr; canvas.height = vh * dpr;
      canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px';
      PLS.scale = Math.min(vw / W, vh / H) * dpr;
      PLS.offX = (vw * dpr - W * PLS.scale) / 2;
      PLS.offY = (vh * dpr - H * PLS.scale) / 2;
    }
    resize();
    window.addEventListener('resize', resize);

    function toLocal(e) {
      const r = canvas.getBoundingClientRect();
      const dpr = canvas.width / r.width;
      const px = (e.clientX - r.left) * dpr, py = (e.clientY - r.top) * dpr;
      return { x: (px - PLS.offX) / PLS.scale, y: (py - PLS.offY) / PLS.scale };
    }

    let downBtn = null, hudDown = false;
    canvas.addEventListener('pointerdown', function (e) {
      const p = toLocal(e);
      // 全域積分 HUD 在最上層,優先吃點擊(點金幣 → 進獎品商店)
      hudDown = false;
      if (window.PLS_POINTS && window.PLS_POINTS.hitTest && window.PLS_POINTS.hitTest(p.x, p.y)) {
        hudDown = true; window.PLS_POINTS._down = true; return;
      }
      downBtn = null;
      for (let i = PLS.buttons.length - 1; i >= 0; i--) {
        const b = PLS.buttons[i];
        if ((b.hidden && b.hidden()) || (b.disabled && b.disabled())) continue;
        if (hit(b, p.x, p.y)) { downBtn = b; b._down = true; b._press = 1; break; }
      }
      if (PLS.current && PLS.current.pointer) PLS.current.pointer('down', p.x, p.y);
    });
    canvas.addEventListener('pointerup', function (e) {
      const p = toLocal(e);
      if (hudDown) {
        hudDown = false; if (window.PLS_POINTS) window.PLS_POINTS._down = false;
        if (window.PLS_POINTS && window.PLS_POINTS.hitTest(p.x, p.y)) { PLS.sfx.tap(); window.PLS_POINTS.tap(); }
        return;
      }
      if (downBtn) {
        downBtn._down = false;
        if (hit(downBtn, p.x, p.y) && downBtn.onTap) { PLS.sfx.tap(); downBtn.onTap(); }
        downBtn = null;
      }
      if (PLS.current && PLS.current.pointer) PLS.current.pointer('up', p.x, p.y);
    });
    canvas.addEventListener('pointercancel', function () {
      if (downBtn) { downBtn._down = false; downBtn = null; }
      hudDown = false; if (window.PLS_POINTS) window.PLS_POINTS._down = false;
    });

    canvas.addEventListener('pointermove', function (e) {
      const p = toLocal(e);
      if (PLS.current && PLS.current.pointer) PLS.current.pointer('move', p.x, p.y);
    });

    // 滑鼠滾輪 / 觸控板 → 轉給目前場景捲動
    canvas.addEventListener('wheel', function (e) {
      if (PLS.current && PLS.current.onWheel) {
        PLS.current.onWheel(e.deltaY);
        e.preventDefault();
      }
    }, { passive: false });

    let last = performance.now();
    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      PLS.t += dt;
      const ctx = PLS.ctx;
      // letterbox 底色
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#E8D9C8';
      ctx.fillRect(0, 0, PLS.canvas.width, PLS.canvas.height);
      ctx.setTransform(PLS.scale, 0, 0, PLS.scale, PLS.offX, PLS.offY);
      // 場景
      if (PLS.current && PLS.current.draw) PLS.current.draw(ctx, PLS.t, dt);
      PLS.drawButtons(ctx, PLS.t);
      if (PLS.current && PLS.current.drawTop) PLS.current.drawTop(ctx, PLS.t);
      // 粒子
      PLS.particles = PLS.particles.filter(function (p) {
        p.age += dt;
        if (p.age >= p.life) return false;
        if (p.update) p.update(dt); else {
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt;
        }
        p.draw(ctx);
        return true;
      });
      // 全域積分 HUD(每個畫面都畫在最上層;首頁/隱藏時自動不顯示)
      if (window.PLS_POINTS && window.PLS_POINTS.draw) window.PLS_POINTS.draw(ctx, PLS.t, dt);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  };

  window.PLS = PLS;
})();
