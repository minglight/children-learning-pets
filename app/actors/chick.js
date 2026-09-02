// actors/chick.js — 小雞(新制 actor,v13)
//
// 存在的意義是「證明抽象真的鬆開了」:這隻跟 actors/husky.js **一行造型程式都沒共用**。
// 體型比例、步頻、身體搖擺方式、眼型、嘴型、開心時的表現全部自己一套:
//   - 哈士奇是四足桶身、走路身體前傾(lean)、尾巴甩;
//   - 小雞是兩腳直立、走路左右滾(roll)、沒有尾巴改甩翅膀、步頻快一倍。
// 兩隻要是共用同一個 motion(),就會又變回「換配色的同一隻動物」。
//
// 座標:原點 = 腳底中心,y 向上為負。
(function () {
  const TAU = Math.PI * 2;
  const A = window.PLS_ACTOR;

  const C = {
    body: '#FFE174', body2: '#F6C63E', beak: '#F0912E', beak2: '#E0791E',
    eye: '#2E2119', blush: 'rgba(247,150,120,0.5)', shell: '#FFF6E2', shell2: '#EAD9B8'
  };

  // 幼幼還沒完全脫殼(頂著半顆蛋殼),大寶羽毛長齊、身體變壯
  const STAGES = {
    baby:  { s: 0.72, body: 0.92, leg: 0.62, head: 1.10, shell: true },
    kid:   { s: 1.00, body: 1.00, leg: 1.00, head: 1.00 },
    grown: { s: 1.12, body: 1.08, leg: 1.12, head: 0.96, deco: true }
  };

  function el(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.01, Math.abs(rx)), Math.max(0.01, Math.abs(ry)), rot || 0, 0, TAU);
  }
  function blink(t) {
    const period = 3.0, ph = (t + 1.6) % period;
    return ph < 0.12 ? 1 - Math.sin((ph / 0.12) * Math.PI) : 1;
  }
  function zzz(ctx, x, y, t) {
    for (let i = 0; i < 3; i++) {
      const ph = ((t * 0.55) + i * 0.33) % 1;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8;
      ctx.fillStyle = '#B9A87E';
      ctx.font = (9 + i * 3) + 'px "Andika","Huninn","Baloo 2",sans-serif';
      ctx.fillText('z', x + i * 6, y - ph * 30);
    }
    ctx.globalAlpha = 1;
  }

  // 大寶配件 5 款(掛在身體座標系,頭頂約 -58)
  function deco(ctx, idx) {
    ctx.save();
    if (idx === 0) {            // 小草帽
      ctx.fillStyle = '#D8A24E'; el(ctx, 0, -58, 34, 8); ctx.fill();
      ctx.fillStyle = '#E8B57A';
      ctx.beginPath(); ctx.moveTo(-18, -58); ctx.quadraticCurveTo(0, -84, 18, -58); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8FC9A8'; ctx.fillRect(-18, -62, 36, 5);
    } else if (idx === 1) {     // 蝴蝶結
      ctx.translate(18, -50);
      ctx.fillStyle = '#F4728A';
      [-1, 1].forEach(function (k) {
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(k * 14, -11, k * 18, -3);
        ctx.quadraticCurveTo(k * 17, 7, 0, 0);
        ctx.closePath(); ctx.fill();
      });
      ctx.fillStyle = '#C2455E'; el(ctx, 0, 0, 4.5, 4.5); ctx.fill();
    } else if (idx === 2) {     // 小圍兜
      ctx.fillStyle = '#8FC9A8';
      ctx.beginPath(); ctx.moveTo(-16, -12); ctx.quadraticCurveTo(0, 24, 16, -12);
      ctx.quadraticCurveTo(0, -4, -16, -12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5FA98A'; el(ctx, 0, 6, 5, 5); ctx.fill();
    } else if (idx === 3) {     // 花圈
      ctx.fillStyle = '#F4A0B8';
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * TAU;
        el(ctx, Math.cos(a) * 20, -56 + Math.sin(a) * 7, 5.5, 5.5); ctx.fill();
      }
      ctx.fillStyle = '#F6D06A'; el(ctx, 20, -56, 4, 4); ctx.fill();
    } else {                    // 領結鈴鐺
      ctx.fillStyle = '#C2A15E'; el(ctx, 0, -8, 22, 6); ctx.fill();
      ctx.fillStyle = '#F4C64E'; el(ctx, 0, -1, 7, 7); ctx.fill();
    }
    ctx.restore();
  }

  function draw(ctx, t, st) {
    const S = STAGES[st.stage] || STAGES.kid;
    const act = st.action;
    const walk = st.legAmp;
    const legPh = st.legPhase;
    const e = st.elapsed;

    const settle = (act === 'rest' || act === 'sleep') ? st.settle : 0;
    const sink = act === 'sleep' ? 10 * settle : act === 'rest' ? 6 * settle : 0;
    const bow = act === 'stretch' ? Math.sin(Math.min(e, 1.6) / 1.6 * Math.PI) : 0;
    const droop = act === 'sad' ? Math.min(1, e / 0.5) : 0;

    ctx.save();
    ctx.scale(S.s, S.s);

    ctx.fillStyle = 'rgba(90,70,50,0.16)';
    el(ctx, 0, 4, 38 * S.body, 8); ctx.fill();

    ctx.save(); ctx.translate(0, sink);
    // 小雞走路是整顆身體左右滾,不是前傾 —— 跟哈士奇的 lean 完全不同的節奏
    const roll = Math.sin(legPh) * 0.16 * walk + (act === 'sleep' ? 0.1 * settle : 0) + droop * 0.08;
    ctx.save(); ctx.rotate(roll);

    // ── 細腿三爪:步頻快、抬得高 ──
    ctx.strokeStyle = C.beak; ctx.lineWidth = 4; ctx.lineCap = 'round';
    [-1, 1].forEach(function (s) {
      const ph = legPh + (s < 0 ? 0 : Math.PI);
      const lift = Math.max(0, Math.sin(ph)) * 10 * walk;
      const sway = Math.sin(ph) * 7 * walk;
      const hipY = -14 * S.leg, footY = (0 - lift) * S.leg;
      ctx.beginPath();
      ctx.moveTo(s * 9, hipY);
      ctx.lineTo(s * 9 + sway, footY);
      ctx.stroke();
      ctx.lineWidth = 3;
      [-6, 0, 6].forEach(function (dx) {
        ctx.beginPath();
        ctx.moveTo(s * 9 + sway, footY);
        ctx.lineTo(s * 9 + sway + dx, footY + 5);
        ctx.stroke();
      });
      ctx.lineWidth = 4;
    });

    // ── 圓身 ──
    ctx.fillStyle = C.body;
    ctx.save(); ctx.scale(S.body, S.body);
    ctx.beginPath();
    ctx.moveTo(0, -58);
    ctx.bezierCurveTo(32, -58, 40, -10, 34, 16);
    ctx.bezierCurveTo(28, 32, -28, 32, -34, 16);
    ctx.bezierCurveTo(-40, -10, -32, -58, 0, -58);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,244,200,0.5)'; el(ctx, 0, 10, 22, 18); ctx.fill();
    ctx.restore();

    // ── 翅膀:小雞沒有尾巴,情緒全靠翅膀 ──
    const flap = act === 'happy' || act === 'greet' ? Math.abs(Math.sin(t * 10)) * 0.9
      : act === 'stretch' ? 0.95 * bow
        : act === 'sad' ? -0.35 * droop
          : Math.sin(legPh) * 0.15 * walk;
    [-1, 1].forEach(function (s) {
      ctx.save(); ctx.translate(s * 28 * S.body, -2); ctx.rotate(s * (0.5 + flap * s));
      ctx.fillStyle = C.body2; el(ctx, 0, 4, 10, 16); ctx.fill();
      ctx.restore();
    });

    // 頭頂呆毛
    ctx.strokeStyle = C.beak2; ctx.lineWidth = 4; ctx.lineCap = 'round';
    [-8, 0, 8].forEach(function (a) {
      ctx.beginPath();
      ctx.moveTo(a * 0.5, -52 * S.body);
      ctx.quadraticCurveTo(a, -70 * S.body, a * 1.4, -76 * S.body);
      ctx.stroke();
    });

    // ── 臉 ──
    const eatDip = act === 'eat' ? Math.max(0, Math.sin(t * 10)) * 16 : 0;
    ctx.save(); ctx.translate(0, eatDip + droop * 5); ctx.scale(S.head, S.head);
    // 走路時五官往行進方向偏一點(跟哈士奇同樣的視差手法,幅度更小)
    const fx = (act === 'walk' || st.moving) ? st.facing * 5 : 0;
    ctx.translate(fx, 0);

    if (act === 'sleep') {
      ctx.strokeStyle = C.eye; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      [-1, 1].forEach(function (s) {
        ctx.beginPath(); ctx.moveTo(s * 9 - 4, -30); ctx.quadraticCurveTo(s * 9, -27, s * 9 + 4, -30); ctx.stroke();
      });
    } else if (act === 'rest') {
      [-1, 1].forEach(function (s) { ctx.fillStyle = C.eye; el(ctx, s * 9, -29, 4.6, 2); ctx.fill(); });
    } else if (act === 'sad') {
      ctx.strokeStyle = C.eye; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      [-1, 1].forEach(function (s) {
        ctx.beginPath(); ctx.arc(s * 9, -26, 5, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
      });
    } else {
      const open = blink(t);
      [-1, 1].forEach(function (s) {
        ctx.fillStyle = C.eye; el(ctx, s * 9, -30, 4.6, 4.8 * open); ctx.fill();
        ctx.fillStyle = '#fff'; el(ctx, s * 9 - 1.4, -32, 1.6, 1.6 * open); ctx.fill();
      });
    }
    ctx.fillStyle = C.blush; el(ctx, -20, -22, 7, 4.4); ctx.fill(); el(ctx, 20, -22, 7, 4.4); ctx.fill();

    const beakOpen = act === 'eat' ? (0.5 + 0.5 * Math.sin(t * 13))
      : act === 'happy' || act === 'greet' ? 0.7
        : act === 'stretch' ? 0.5 * bow
          : act === 'sleep' ? 0.04
            : act === 'sad' ? 0.06 : 0.15;
    ctx.fillStyle = C.beak;
    ctx.beginPath(); ctx.moveTo(-7, -16); ctx.lineTo(7, -16); ctx.lineTo(0, -8 - beakOpen * 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.beak2;
    ctx.beginPath(); ctx.moveTo(-5, -12); ctx.lineTo(5, -12); ctx.lineTo(0, -8 - beakOpen * 6); ctx.closePath(); ctx.fill();
    ctx.restore(); // 臉

    if (S.shell) {   // 幼幼:還頂著半顆蛋殼
      ctx.fillStyle = C.shell;
      ctx.beginPath();
      ctx.moveTo(-30, -50);
      ctx.quadraticCurveTo(-26, -80, 0, -84);
      ctx.quadraticCurveTo(26, -80, 30, -50);
      ctx.lineTo(22, -54); ctx.lineTo(12, -46); ctx.lineTo(2, -56);
      ctx.lineTo(-8, -46); ctx.lineTo(-18, -54);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.shell2; el(ctx, -12, -68, 5, 4); ctx.fill(); el(ctx, 10, -72, 4, 3); ctx.fill();
    }
    if (S.deco) deco(ctx, st.deco | 0);

    ctx.restore(); // roll
    ctx.restore(); // sink

    if (act === 'happy' || act === 'greet') {   // 開心時頭上冒音符
      const bob = Math.abs(Math.sin(t * 10)) * 6;
      ctx.save(); ctx.translate(30, -70 - bob); ctx.rotate(0.3);
      ctx.fillStyle = '#F4C64E';
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
      ctx.fillRect(3, -16, 2, 16);
      ctx.restore();
    }
    if (act === 'sleep') zzz(ctx, 22, -76, t);
    if (act === 'eat') {
      ctx.fillStyle = '#D8A24E';
      [[-6, 26], [4, 29], [10, 25]].forEach(function (p) { el(ctx, p[0], p[1], 2.6, 2); ctx.fill(); });
    }
    if (act === 'play') {
      ctx.save(); ctx.translate(40 + Math.sin(t * 4) * 6, 26);
      ctx.fillStyle = '#8FC9A8'; el(ctx, 0, 0, 10, 10); ctx.fill();
      ctx.restore();
    }
    ctx.restore(); // stage scale
  }

  A.define('chick', {
    draw: draw,
    bounds: { top: -100, bottom: 8, halfWidth: 52 },
    // 小雞的個性:碎步快、完全不前傾(靠身體左右滾)
    locomotion: { speed: 74, legFreq: 9, tailFreq: 1, lean: 0, gait: 'waddle' },
    holds: { happy: 2.2, eat: 2.2, play: 2.0, rest: 2.8, sleep: 4.2, stretch: 1.6, greet: 1.6 },
    ambient: {
      min: 2.5, max: 6,
      pool: [{ action: 'stretch', weight: 3 }, { action: 'rest', weight: 3 }, { action: 'sleep', weight: 2 }]
    }
  });
})();
