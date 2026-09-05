// art.js — 共用繪圖:UI 元件、食物、形狀、圖示
(function () {
  const TAU = Math.PI * 2;
  const FONT = '"Andika","Huninn","Baloo 2",sans-serif';

  function el(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

  function pill(ctx, x, y, text, fg, bg, size) {
    size = size || 30;
    ctx.font = size + 'px ' + FONT;
    const w = ctx.measureText(text).width + size * 1.6;
    const h = size * 1.9;
    ctx.fillStyle = bg;
    rr(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.fillStyle = fg;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 2);
    return w;
  }

  function bubble(ctx, x, y, text, opts) {
    opts = opts || {};
    const size = opts.size || 27;
    ctx.font = size + 'px ' + FONT;
    const w = ctx.measureText(text).width + 44, h = size * 2.15;
    ctx.save();
    ctx.globalAlpha = opts.alpha == null ? 1 : opts.alpha;
    ctx.shadowColor = 'rgba(150,110,70,0.18)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    rr(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 9, y + h / 2 - 3);
    ctx.lineTo(x, y + h / 2 + 13);
    ctx.lineTo(x + 9, y + h / 2 - 3);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#7A6450'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 2);
    ctx.restore();
  }

  function sparkle(ctx, x, y, r, color, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill(); ctx.restore();
  }

  function heart(ctx, x, y, r, color, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.3, y, x - r * 0.7, y - r, x, y - r * 0.35);
    ctx.bezierCurveTo(x + r * 0.7, y - r, x + r * 1.3, y, x, y + r * 0.9);
    ctx.fill(); ctx.restore();
  }

  // ── 食物 ──────────────────────────────────────────────
  // 全部以 (0,0) 為中心、約 ±40 大小;用 translate/scale 擺位
  const FOODS = {
    apple: function (ctx) {
      ctx.fillStyle = '#E8625D'; el(ctx, 0, 4, 30, 28); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; el(ctx, -10, -5, 8, 11); ctx.fill();
      ctx.strokeStyle = '#7A5236'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.quadraticCurveTo(2, -32, 6, -36); ctx.stroke();
      ctx.fillStyle = '#7FBE72'; el(ctx, 12, -30, 11, 6, -0.5); ctx.fill();
    },
    strawberry: function (ctx) {
      ctx.fillStyle = '#E8546B';
      ctx.beginPath();
      ctx.moveTo(-26, -10);
      ctx.quadraticCurveTo(-26, 28, 0, 34);
      ctx.quadraticCurveTo(26, 28, 26, -10);
      ctx.quadraticCurveTo(0, -22, -26, -10);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,243,200,0.9)';
      [[-12, 2], [0, 10], [12, 2], [-6, 18], [6, 18], [0, -4]].forEach(function (p) { el(ctx, p[0], p[1], 1.8, 2.6); ctx.fill(); });
      ctx.fillStyle = '#6FA86A';
      [[-12, -14], [0, -18], [12, -14]].forEach(function (p) { el(ctx, p[0], p[1], 8, 6, p[0] * 0.03); ctx.fill(); });
    },
    orange: function (ctx) {
      ctx.fillStyle = '#F29B40'; el(ctx, 0, 2, 29, 27); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; el(ctx, -9, -7, 8, 9); ctx.fill();
      ctx.fillStyle = '#7FBE72'; el(ctx, 6, -26, 10, 5, -0.4); ctx.fill();
    },
    banana: function (ctx) {
      ctx.strokeStyle = '#F4CE5A'; ctx.lineWidth = 18; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, -10, 28, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      ctx.strokeStyle = '#8A6B36'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-25, 1); ctx.lineTo(-28, -4); ctx.stroke();
    },
    eggcake: function (ctx) { // 雞蛋糕
      ctx.fillStyle = '#E0A050'; el(ctx, 0, 6, 30, 18); ctx.fill();
      ctx.fillStyle = '#F2C277'; el(ctx, 0, -2, 30, 18); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; el(ctx, -10, -8, 9, 5); ctx.fill();
    },
    boba: function (ctx) { // 珍珠奶茶
      ctx.fillStyle = '#E8D3BC'; rr(ctx, -20, -26, 40, 60, 10); ctx.fill();
      ctx.fillStyle = '#D9BD9C'; rr(ctx, -20, 8, 40, 26, 8); ctx.fill();
      ctx.fillStyle = '#5C4632';
      [[-11, 26], [0, 28], [11, 26], [-6, 18], [7, 18]].forEach(function (p) { el(ctx, p[0], p[1], 4.5, 4.5); ctx.fill(); });
      ctx.strokeStyle = '#F2A0AC'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(8, -24); ctx.lineTo(16, -44); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; rr(ctx, -14, -20, 8, 24, 4); ctx.fill();
    },
    sushi: function (ctx) {
      ctx.fillStyle = '#FFF7EC'; el(ctx, 0, 12, 30, 16); ctx.fill();
      ctx.fillStyle = '#F2845E'; el(ctx, 0, -6, 28, 13, -0.06); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-16, -8); ctx.lineTo(14, -10); ctx.stroke();
      ctx.fillStyle = '#3E5A48'; rr(ctx, -8, -17, 16, 42, 4); ctx.fill();
    },
    pizza: function (ctx) {
      ctx.fillStyle = '#F2C277';
      ctx.beginPath(); ctx.moveTo(0, 36); ctx.lineTo(-26, -22); ctx.lineTo(26, -22); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#D9913F'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-26, -24); ctx.lineTo(26, -24); ctx.stroke();
      ctx.fillStyle = '#E8625D';
      [[-8, -10], [9, -6], [0, 10]].forEach(function (p) { el(ctx, p[0], p[1], 6, 6); ctx.fill(); });
    },
    bao: function (ctx) { // 小籠包
      ctx.fillStyle = '#FBF0DE';
      ctx.beginPath(); ctx.arc(0, 8, 28, Math.PI, 0); ctx.closePath(); ctx.fill();
      el(ctx, 0, 8, 28, 12); ctx.fill();
      ctx.strokeStyle = '#E3CCA8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 9, -18);
        ctx.quadraticCurveTo(i * 4, -8, i * 11, 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#E3CCA8'; el(ctx, 0, -19, 5, 4); ctx.fill();
    },
    burger: function (ctx) {
      ctx.fillStyle = '#F2B96B';
      ctx.beginPath(); ctx.arc(0, -4, 28, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8FC9A8'; el(ctx, 0, 0, 30, 6); ctx.fill();
      ctx.fillStyle = '#9C6B42'; rr(ctx, -26, 3, 52, 10, 5); ctx.fill();
      ctx.fillStyle = '#F2B96B'; rr(ctx, -27, 15, 54, 12, 7); ctx.fill();
      ctx.fillStyle = '#FFF3DC';
      [[-10, -14], [2, -18], [12, -10]].forEach(function (p) { el(ctx, p[0], p[1], 2.5, 1.8); ctx.fill(); });
    },
    fries: function (ctx) {
      ctx.fillStyle = '#F4CE5A';
      [[-14, -26, -0.12], [-5, -30, 0], [5, -28, 0.06], [13, -24, 0.14]].forEach(function (p) {
        ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(p[2]);
        rr(ctx, -4, 0, 8, 34, 3); ctx.fill(); ctx.restore();
      });
      ctx.fillStyle = '#E8625D'; rr(ctx, -22, -2, 44, 34, 6); ctx.fill();
      ctx.fillStyle = '#FFF'; el(ctx, 0, 16, 10, 7); ctx.fill();
    },
    scoop: function (ctx) { // 單球冰淇淋
      ctx.fillStyle = '#F2C277';
      ctx.beginPath(); ctx.moveTo(0, 36); ctx.lineTo(-16, 2); ctx.lineTo(16, 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#F8B8C4'; el(ctx, 0, -10, 22, 20); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; el(ctx, -7, -15, 6, 5); ctx.fill();
    },
    sundae: function (ctx) {
      ctx.fillStyle = '#D8E8F2';
      ctx.beginPath(); ctx.moveTo(-24, -8); ctx.lineTo(24, -8); ctx.lineTo(12, 22); ctx.lineTo(-12, 22); ctx.closePath(); ctx.fill();
      rr(ctx, -10, 22, 20, 8, 3); ctx.fill();
      rr(ctx, -16, 30, 32, 6, 3); ctx.fill();
      ctx.fillStyle = '#F8B8C4'; el(ctx, -10, -14, 13, 12); ctx.fill();
      ctx.fillStyle = '#FFF7EC'; el(ctx, 10, -16, 13, 12); ctx.fill();
      ctx.fillStyle = '#E8546B'; el(ctx, 0, -28, 6, 6); ctx.fill();
    },
    cake: function (ctx) { // 草莓蛋糕(切片)
      ctx.fillStyle = '#FFF7EC';
      ctx.beginPath(); ctx.moveTo(-24, 28); ctx.lineTo(0, -16); ctx.lineTo(24, 28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#F8B8C4';
      ctx.beginPath(); ctx.moveTo(-13, 8); ctx.lineTo(13, 8); ctx.lineTo(17, 16); ctx.lineTo(-17, 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#E8546B'; el(ctx, 0, -22, 8, 9); ctx.fill();
      ctx.fillStyle = '#6FA86A'; el(ctx, 0, -30, 5, 3); ctx.fill();
    },

    // ── 二年級上學期數學新食物(v14,跟一年級的 14 種區隔開,課本進度用新獎勵) ──
    onigiri: function (ctx) { // 飯糰
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(28, 24); ctx.quadraticCurveTo(0, 34, -28, 24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3A3A3A'; rr(ctx, -10, -6, 20, 34, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; el(ctx, -10, -14, 6, 8); ctx.fill();
      ctx.fillStyle = '#F2F2ED'; [[-16, 10], [14, 6], [2, -4]].forEach(function (p) { el(ctx, p[0], p[1], 1.6, 1); ctx.fill(); });
    },
    mango: function (ctx) { // 芒果
      ctx.fillStyle = '#E8A83E'; el(ctx, -4, 2, 26, 30, -0.15); ctx.fill();
      ctx.fillStyle = '#E85C4A'; el(ctx, -14, -8, 14, 16, -0.3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; el(ctx, -8, -8, 7, 9, -0.2); ctx.fill();
      ctx.strokeStyle = '#6FA86A'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(10, -24); ctx.quadraticCurveTo(16, -32, 22, -30); ctx.stroke();
    },
    taiyaki: function (ctx) { // 鯛魚燒
      ctx.fillStyle = '#E0A050';
      ctx.beginPath();
      ctx.moveTo(-30, 0); ctx.quadraticCurveTo(-20, -22, 6, -20);
      ctx.lineTo(26, -30); ctx.lineTo(20, 0); ctx.lineTo(26, 30); ctx.lineTo(6, 20);
      ctx.quadraticCurveTo(-20, 22, -30, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#B87A38'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-16, -14); ctx.lineTo(-16, 14); ctx.moveTo(-2, -18); ctx.lineTo(-2, 18); ctx.stroke();
      ctx.fillStyle = '#5A4636'; el(ctx, -22, -4, 2.2, 2.2); ctx.fill();
    },
    hotdog: function (ctx) { // 熱狗
      ctx.fillStyle = '#F2C277';
      ctx.beginPath();
      ctx.moveTo(-30, -6); ctx.quadraticCurveTo(-30, 14, -20, 16); ctx.lineTo(20, 16);
      ctx.quadraticCurveTo(30, 14, 30, -6); ctx.quadraticCurveTo(30, -18, 18, -18);
      ctx.lineTo(-18, -18); ctx.quadraticCurveTo(-30, -18, -30, -6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#C9622E'; el(ctx, 0, -2, 26, 10); ctx.fill();
      ctx.strokeStyle = '#F2CE5A'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 9 - 4, -8); ctx.lineTo(i * 9 + 6, 4); ctx.stroke(); }
    },
    watermelon: function (ctx) { // 西瓜(切片)
      ctx.fillStyle = '#4F9E5C';
      ctx.beginPath(); ctx.moveTo(-30, 20); ctx.quadraticCurveTo(0, -32, 30, 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#F2F2ED';
      ctx.beginPath(); ctx.moveTo(-24, 17); ctx.quadraticCurveTo(0, -24, 24, 17); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#E8546B';
      ctx.beginPath(); ctx.moveTo(-19, 16); ctx.quadraticCurveTo(0, -16, 19, 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3A3A3A';
      [[-8, 4], [6, 0], [0, 10], [-2, -6]].forEach(function (p) { el(ctx, p[0], p[1], 1.6, 2.4, 0.3); ctx.fill(); });
    },
    donut: function (ctx) { // 甜甜圈
      ctx.fillStyle = '#E0A050'; el(ctx, 0, 0, 28, 24); ctx.fill();
      ctx.fillStyle = '#F8B8C4'; el(ctx, 0, -2, 25, 21); ctx.fill();
      ctx.fillStyle = '#FBF2E0'; el(ctx, 0, -2, 9, 8); ctx.fill();
      ctx.fillStyle = '#E8546B';
      [[-14, -8], [10, -10], [16, 4], [-4, 10], [-16, 6], [4, -2]].forEach(function (p) { el(ctx, p[0], p[1], 2.2, 2.2); ctx.fill(); });
    },
    popcorn: function (ctx) { // 爆米花
      ctx.fillStyle = '#E4574B';
      ctx.beginPath(); ctx.moveTo(-20, -2); ctx.lineTo(20, -2); ctx.lineTo(15, 32); ctx.lineTo(-15, 32); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(-7, 32); ctx.moveTo(10, -2); ctx.lineTo(7, 32); ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = 'rgba(210,150,60,0.4)'; ctx.lineWidth = 1;
      [[-14, -10], [0, -16], [14, -10], [-6, -18], [7, -19], [-18, -4], [18, -4]].forEach(function (p) { el(ctx, p[0], p[1], 8, 7); ctx.fill(); ctx.stroke(); });
    },
    macaron: function (ctx) { // 馬卡龍
      ctx.fillStyle = '#F2A9B8'; el(ctx, 0, -14, 24, 9); ctx.fill();
      ctx.fillStyle = '#E88A9E'; rr(ctx, -20, -8, 40, 8, 3); ctx.fill();
      ctx.fillStyle = '#F2A9B8'; el(ctx, 0, 6, 24, 9); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; el(ctx, -8, -16, 6, 3); ctx.fill();
    },
    mochi: function (ctx) { // 麻糬/大福
      ctx.fillStyle = '#F6E2EA'; el(ctx, 0, 6, 26, 22); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; el(ctx, -8, -2, 8, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(220,180,195,0.6)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(-4, 6, 0, 28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-20, 6); ctx.quadraticCurveTo(0, -2, 20, 6); ctx.stroke();
      ctx.fillStyle = '#F8D8DE'; el(ctx, 0, -16, 10, 6); ctx.fill();
    },
    potsticker: function (ctx) { // 煎餃
      ctx.fillStyle = '#E0A050'; el(ctx, 0, 10, 30, 10); ctx.fill();
      ctx.fillStyle = '#FBF0DE';
      ctx.beginPath(); ctx.moveTo(-28, 4); ctx.quadraticCurveTo(0, -26, 28, 4); ctx.quadraticCurveTo(0, -4, -28, 4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#E3CCA8'; ctx.lineWidth = 2;
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 7, -16); ctx.quadraticCurveTo(i * 7 + 3, -8, i * 7, 4); ctx.stroke(); }
      ctx.fillStyle = 'rgba(180,120,50,0.4)'; el(ctx, -6, 12, 10, 4); ctx.fill(); el(ctx, 10, 13, 8, 3.4); ctx.fill();
    }
  };

  function drawFood(ctx, key, x, y, s) {
    const fn = FOODS[key] || FOODS.apple;
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
    fn(ctx);
    ctx.restore();
  }

  // ── 豪華版食物(布置小窩:圖案與基礎版明顯不同)──────────────
  const FOODS_DELUXE = {
    // 3 個雞蛋糕並排
    eggcake: function(ctx) {
      [-22, 0, 22].forEach(function(ox) {
        ctx.save(); ctx.translate(ox, 0); ctx.scale(0.62, 0.62); FOODS.eggcake(ctx); ctx.restore();
      });
    },
    // 2 杯珍珠奶茶並排
    boba: function(ctx) {
      ctx.save(); ctx.translate(-16, 2); ctx.scale(0.66, 0.66); FOODS.boba(ctx); ctx.restore();
      ctx.save(); ctx.translate(14, -2); ctx.scale(0.72, 0.72); FOODS.boba(ctx); ctx.restore();
    },
    // 3 顆蘋果三角排列
    apple: function(ctx) {
      ctx.save(); ctx.translate(-22, 8); ctx.scale(0.58, 0.58); FOODS.apple(ctx); ctx.restore();
      ctx.save(); ctx.translate(22, 8); ctx.scale(0.58, 0.58); FOODS.apple(ctx); ctx.restore();
      ctx.save(); ctx.translate(0, -14); ctx.scale(0.65, 0.65); FOODS.apple(ctx); ctx.restore();
    },
    // 4 顆草莓 2×2 排列
    strawberry: function(ctx) {
      [[-17,-12],[17,-12],[-17,14],[17,14]].forEach(function(p) {
        ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(0.52, 0.52); FOODS.strawberry(ctx); ctx.restore();
      });
    },
    // 3 顆橘子三角排列
    orange: function(ctx) {
      ctx.save(); ctx.translate(-22, 8); ctx.scale(0.58, 0.58); FOODS.orange(ctx); ctx.restore();
      ctx.save(); ctx.translate(22, 8); ctx.scale(0.58, 0.58); FOODS.orange(ctx); ctx.restore();
      ctx.save(); ctx.translate(0, -12); ctx.scale(0.62, 0.62); FOODS.orange(ctx); ctx.restore();
    },
    // 一串 3 根香蕉
    banana: function(ctx) {
      ctx.save(); ctx.translate(-8, 4); ctx.scale(0.72, 0.72); FOODS.banana(ctx); ctx.restore();
      ctx.save(); ctx.translate(7, -10); ctx.scale(0.65, 0.65); ctx.rotate(-0.28); FOODS.banana(ctx); ctx.restore();
      ctx.save(); ctx.translate(0, 16); ctx.scale(0.62, 0.62); ctx.rotate(0.22); FOODS.banana(ctx); ctx.restore();
    },
    // 3 個壽司放在盤子上
    sushi: function(ctx) {
      ctx.fillStyle = '#F0EDE8'; el(ctx, 0, 20, 40, 12); ctx.fill();
      [-22, 0, 22].forEach(function(ox) {
        ctx.save(); ctx.translate(ox, 2); ctx.scale(0.56, 0.56); FOODS.sushi(ctx); ctx.restore();
      });
    },
    // 整個圓形披薩(不是一片)
    pizza: function(ctx) {
      ctx.fillStyle = '#E8C070'; el(ctx, 0, 0, 34, 34); ctx.fill();
      ctx.fillStyle = '#E8625D'; el(ctx, 0, 0, 28, 28); ctx.fill();
      ctx.fillStyle = '#F4CE5A'; el(ctx, 0, 0, 24, 24); ctx.fill();
      ctx.fillStyle = '#C04040';
      [[0,-14],[-12,6],[12,6],[0,16],[-16,-3],[16,-3]].forEach(function(p) { el(ctx, p[0], p[1], 4, 4); ctx.fill(); });
      ctx.strokeStyle = 'rgba(200,130,40,0.45)'; ctx.lineWidth = 1.5;
      for (var i = 0; i < 6; i++) {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(24*Math.cos(i*TAU/6), 24*Math.sin(i*TAU/6)); ctx.stroke();
      }
    },
    // 竹蒸籠俯視圖,3 個小籠包
    bao: function(ctx) {
      ctx.fillStyle = '#D4A055'; el(ctx, 0, 6, 34, 28); ctx.fill();
      ctx.strokeStyle = '#B07840'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 6, 33, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#C49050'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 6, 24, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#FBF0DE';
      [[-15,0],[15,0],[0,-14]].forEach(function(p) { el(ctx, p[0], p[1], 12, 11); ctx.fill(); });
      ctx.fillStyle = '#E3CCA8';
      [[-15,0],[15,0],[0,-14]].forEach(function(p) { el(ctx, p[0], p[1], 3.5, 3.5); ctx.fill(); });
    },
    // 雙層大漢堡
    burger: function(ctx) {
      ctx.fillStyle = '#F2B96B';
      ctx.beginPath(); ctx.arc(0, -20, 26, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      [[-8,-26],[4,-29],[14,-22]].forEach(function(p){ el(ctx,p[0],p[1],2.5,1.8); ctx.fill(); });
      ctx.fillStyle = '#8FC9A8'; el(ctx, 0, -14, 29, 5); ctx.fill();
      ctx.fillStyle = '#F4CE5A'; rr(ctx, -25, -11, 50, 5, 2); ctx.fill();
      ctx.fillStyle = '#9C6B42'; rr(ctx, -26, -7, 52, 9, 4); ctx.fill();
      ctx.fillStyle = '#E8A850'; rr(ctx, -23, 3, 46, 7, 4); ctx.fill();
      ctx.fillStyle = '#7A5230'; rr(ctx, -25, 10, 50, 9, 4); ctx.fill();
      ctx.fillStyle = '#F2B96B'; rr(ctx, -27, 20, 54, 12, 7); ctx.fill();
    },
    // 大份薯條(6 根 + 大盒)
    fries: function(ctx) {
      ctx.fillStyle = '#F4CE5A';
      [[-18,-34,-0.18],[-9,-38,0],[0,-36,0.04],[9,-32,0.1],[16,-30,0.16],[-4,-32,-0.08]].forEach(function(p) {
        ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(p[2]); rr(ctx, -4, 0, 8, 38, 3); ctx.fill(); ctx.restore();
      });
      ctx.fillStyle = '#E8625D'; rr(ctx, -26, -4, 52, 36, 8); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; rr(ctx, -18, 2, 14, 22, 4); ctx.fill();
    },
    // 三球冰淇淋疊塔
    scoop: function(ctx) {
      ctx.fillStyle = '#F2C277';
      ctx.beginPath(); ctx.moveTo(0, 38); ctx.lineTo(-16, 4); ctx.lineTo(16, 4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#D4A040'; ctx.lineWidth = 1;
      [-6,0,6].forEach(function(ox){ ctx.beginPath(); ctx.moveTo(ox,4); ctx.lineTo(ox*0.4,38); ctx.stroke(); });
      ctx.fillStyle = '#F8B8C4'; el(ctx, -11, -4, 14, 13); ctx.fill();
      ctx.fillStyle = '#C8E8B0'; el(ctx, 11, -4, 14, 13); ctx.fill();
      ctx.fillStyle = '#F8D4A0'; el(ctx, 0, -20, 15, 14); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      el(ctx, -14, -7, 4, 3); ctx.fill(); el(ctx, 8, -7, 4, 3); ctx.fill(); el(ctx, -3, -24, 4, 3); ctx.fill();
    },
    // 豪華聖代+鮮奶油+草莓
    sundae: function(ctx) {
      ctx.fillStyle = '#D8E8F2';
      ctx.beginPath(); ctx.moveTo(-22, -6); ctx.lineTo(22, -6); ctx.lineTo(14, 22); ctx.lineTo(-14, 22); ctx.closePath(); ctx.fill();
      rr(ctx, -10, 22, 20, 8, 3); ctx.fill(); rr(ctx, -17, 30, 34, 6, 3); ctx.fill();
      ctx.fillStyle = '#F8B8C4'; el(ctx, -8, -12, 14, 11); ctx.fill();
      ctx.fillStyle = '#F4CE5A'; el(ctx, 10, -14, 12, 10); ctx.fill();
      ctx.fillStyle = '#FFFAF6'; el(ctx, -2, -22, 14, 12); ctx.fill();
      ctx.beginPath(); ctx.arc(-2, -28, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = '#E8546B'; el(ctx, -2, -36, 6, 6); ctx.fill();
      ctx.strokeStyle = '#6FA86A'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-2, -30); ctx.quadraticCurveTo(5, -36, 4, -38); ctx.stroke();
    },
    // 雙層整個蛋糕+蠟燭
    cake: function(ctx) {
      ctx.fillStyle = '#FFF7EC'; rr(ctx, -30, 6, 60, 24, 7); ctx.fill();
      ctx.fillStyle = '#F8B8C4'; rr(ctx, -30, 4, 60, 6, 3); ctx.fill();
      ctx.fillStyle = '#FFF7EC'; rr(ctx, -22, -18, 44, 24, 6); ctx.fill();
      ctx.fillStyle = '#F8B8C4'; rr(ctx, -22, -20, 44, 6, 3); ctx.fill();
      ctx.fillStyle = '#F8B8C4';
      [[-16,-14],[-4,-12],[8,-13],[18,-14]].forEach(function(p){ el(ctx,p[0],p[1],2.5,4); ctx.fill(); });
      ctx.fillStyle = '#E8546B'; el(ctx, 0, -28, 7, 7); ctx.fill();
      ctx.fillStyle = '#6FA86A'; el(ctx, 0, -34, 4, 3); ctx.fill();
      ctx.fillStyle = '#92B8E0'; rr(ctx, 11, -36, 5, 14, 2); ctx.fill();
      ctx.fillStyle = '#F6C95E'; el(ctx, 13.5, -38, 2, 3); ctx.fill();
    }
  };

  // 豪華版原本只是「同一份圖多畫幾份」，沒有任何發亮處理，跟普通版擺一起分不出差別、
  // 甚至更雜亂（使用者反饋:看起來像二手貨）。補上柔光暈 + 白/金雙層 sparkle，
  // 跟 toys.js drawToyDeluxe 的手法一致（白色墊底 + 金色疊上去），讓「豪華」有視覺依據。
  function drawFoodDeluxe(ctx, key, x, y, s) {
    s = s || 1;
    const fn = FOODS_DELUXE[key] || FOODS[key] || FOODS.apple;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.save();
    ctx.shadowColor = 'rgba(246,196,74,0.5)'; ctx.shadowBlur = 22;
    const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, 48);
    glow.addColorStop(0, 'rgba(255,244,200,0.55)'); glow.addColorStop(1, 'rgba(255,244,200,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 48, 0, TAU); ctx.fill();
    fn(ctx);
    ctx.restore();
    [[-34, -30, 6], [34, -18, 5], [-6, 36, 4]].forEach(function (p) {
      sparkle(ctx, p[0], p[1], p[2], '#FFFFFF', 0.95);
      sparkle(ctx, p[0], p[1], p[2] * 0.6, '#F6C44A', 0.95);
    });
    ctx.restore();
  }

  // ── 金色食物(v7 神秘獎勵:同一個食物鍍上金光,吃了成長值 ×2)──
  // 做法同 toys.js 的豪華玩具:離屏 canvas 畫好普通版,再以 source-atop 疊金色漸層
  // 只染食物本體;結果快取,之後 drawImage 縮放即可,避免每幀重畫。
  const goldCache = {};
  function gildedFood(key) {
    const ck = FOODS[key] ? key : 'apple';
    if (goldCache[ck] !== undefined) return goldCache[ck];
    const S = 3, buf = 300;   // 食物圖形約在 ±45 內,±50 邏輯單位夠用
    const oc = document.createElement('canvas');
    oc.width = buf; oc.height = buf;
    const o = oc.getContext('2d');
    o.save();
    o.translate(buf / 2, buf / 2); o.scale(S, S);
    (FOODS[ck] || FOODS.apple)(o);          // 普通版食物
    o.globalCompositeOperation = 'source-atop';
    const g = o.createLinearGradient(0, -46, 0, 46);
    g.addColorStop(0, 'rgba(255,238,176,0.62)');
    g.addColorStop(0.5, 'rgba(246,196,74,0.50)');
    g.addColorStop(1, 'rgba(206,146,32,0.60)');
    o.fillStyle = g; o.fillRect(-buf / 2 / S, -buf / 2 / S, buf / S, buf / S);
    o.fillStyle = 'rgba(255,255,255,0.38)'; el(o, -10, -16, 13, 7); o.fill();  // 高光
    o.globalCompositeOperation = 'source-over';
    o.restore();
    goldCache[ck] = { c: oc, S: S, buf: buf };
    return goldCache[ck];
  }
  function drawFoodGold(ctx, key, x, y, s) {
    s = s || 1;
    const g = gildedFood(key);
    const dw = g.buf * s / g.S;
    ctx.save();
    ctx.shadowColor = 'rgba(246,196,74,0.55)'; ctx.shadowBlur = 22 * s;
    ctx.drawImage(g.c, x - dw / 2, y - dw / 2, dw, dw);
    ctx.restore();
    // 閃亮星星(位置固定,跟著縮放)
    [[-36, -26, 6], [40, -14, 7], [-30, 26, 5], [34, 30, 6]].forEach(function (p) {
      sparkle(ctx, x + p[0] * s, y + p[1] * s, p[2] * s, '#FFFFFF', 0.92);
    });
  }

  // ── 形狀(m6)──────────────────────────────────────────
  const SHAPE_COLORS = { circle: '#F4A8A0', triangle: '#8FC9A8', square: '#92B8E0', rect: '#C5A8E0', star: '#F6C95E', oval: '#B8E0F4', diamond: '#D4B8E0', heart: '#F4B8C8' };
  function drawShape(ctx, id, x, y, s, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
    ctx.fillStyle = color || SHAPE_COLORS[id] || '#999';
    if (id === 'circle') { el(ctx, 0, 0, 34, 34); ctx.fill(); }
    else if (id === 'triangle') {
      ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(36, 28); ctx.lineTo(-36, 28); ctx.closePath(); ctx.fill();
    } else if (id === 'square') { rr(ctx, -30, -30, 60, 60, 8); ctx.fill(); }
    else if (id === 'rect') { rr(ctx, -40, -22, 80, 44, 8); ctx.fill(); }
    else if (id === 'star') {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 16 : 36;
        const a = -Math.PI / 2 + i * Math.PI / 5;
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
    }
    else if (id === 'oval') { el(ctx, 0, 0, 44, 26); ctx.fill(); }
    else if (id === 'diamond') {
      ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(28, 0); ctx.lineTo(0, 32); ctx.lineTo(-28, 0); ctx.closePath(); ctx.fill();
    }
    else if (id === 'heart') {
      const r = 28;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.9);
      ctx.bezierCurveTo(-r * 1.3, 0, -r * 0.7, -r, 0, -r * 0.35);
      ctx.bezierCurveTo(r * 0.7, -r, r * 1.3, 0, 0, r * 0.9);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── 拼補積木對(m7)────────────────────────────────────
  // 兩塊積木中間留一道小縫;同一組的兩塊「同色」(合起來才是一個完整圖形)。
  // 幾何要算對:合起來的外框要真的等於題目形狀。
  const PAIRS = {
    tri2: function (ctx) { // 兩個直角三角形 → 正方形(沿對角線切開)
      ctx.fillStyle = '#8FC9A8';
      // 右上半(把整塊往右上挪一點,讓對角線留縫)
      ctx.beginPath(); ctx.moveTo(-26, -30); ctx.lineTo(30, -30); ctx.lineTo(30, 26); ctx.closePath(); ctx.fill();
      // 左下半
      ctx.beginPath(); ctx.moveTo(-30, -26); ctx.lineTo(26, 30); ctx.lineTo(-30, 30); ctx.closePath(); ctx.fill();
    },
    rect2: function (ctx) { // 兩個窄長方形 → 正方形(各寬 25,加中縫 6 = 56,與高 56 相等)
      ctx.fillStyle = '#92B8E0';
      rr(ctx, -28, -28, 25, 56, 5); ctx.fill();
      rr(ctx, 3, -28, 25, 56, 5); ctx.fill();
    },
    sq2: function (ctx) { // 兩個正方形 → 長方形(各 44×44,並排成 2:1)
      ctx.fillStyle = '#C5A8E0';
      rr(ctx, -47, -22, 44, 44, 6); ctx.fill();
      rr(ctx, 3, -22, 44, 44, 6); ctx.fill();
    },
    semi2: function (ctx) { // 兩個半圓 → 圓形
      ctx.fillStyle = '#F4A8A0';
      ctx.beginPath(); ctx.arc(-4, 0, 30, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(4, 0, 30, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill();
    },
    tri2w: function (ctx) { // 兩個直角三角形 → 大三角形(沿正中垂直切開)
      ctx.fillStyle = '#F6C95E';
      ctx.beginPath(); ctx.moveTo(-2, -28); ctx.lineTo(-2, 28); ctx.lineTo(-44, 28); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(2, -28); ctx.lineTo(44, 28); ctx.lineTo(2, 28); ctx.closePath(); ctx.fill();
    },
    triCir: function (ctx) { // 三角形 + 半圓(兩塊形狀不同,湊不成完整圖形)— 干擾項
      ctx.fillStyle = '#E89BB0';
      ctx.beginPath(); ctx.moveTo(-40, 24); ctx.lineTo(-16, -24); ctx.lineTo(8, 24); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(30, 0, 24, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill();
    },
    // ── 額外正解組合(同一個目標多種拼法,避免被死背)──────
    tri2b: function (ctx) { // 兩個直角三角形 → 正方形(沿另一條對角線切開)
      ctx.fillStyle = '#7FB6D6';
      ctx.beginPath(); ctx.moveTo(-30, -30); ctx.lineTo(26, -30); ctx.lineTo(-30, 26); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(30, -26); ctx.lineTo(30, 30); ctx.lineTo(-26, 30); ctx.closePath(); ctx.fill();
    },
    semi2h: function (ctx) { // 兩個半圓(上下切)→ 圓形
      ctx.fillStyle = '#F4B86A';
      ctx.beginPath(); ctx.arc(0, -4, 30, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 4, 30, 0, Math.PI); ctx.closePath(); ctx.fill();
    },
    rect2v: function (ctx) { // 兩個寬扁長方形(上下疊)→ 長方形
      ctx.fillStyle = '#9FD09A';
      rr(ctx, -38, -22, 76, 19, 5); ctx.fill();
      rr(ctx, -38, 3, 76, 19, 5); ctx.fill();
    },
    tri2L: function (ctx) { // 兩個直角三角形(不對稱切)→ 大三角形
      ctx.fillStyle = '#E0A6D6';
      ctx.beginPath(); ctx.moveTo(-1, -28); ctx.lineTo(-44, 28); ctx.lineTo(10, 28); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(1, -28); ctx.lineTo(14, 28); ctx.lineTo(44, 28); ctx.closePath(); ctx.fill();
    }
  };
  function drawPair(ctx, key, x, y, s) {
    const fn = PAIRS[key]; if (!fn) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
    fn(ctx);
    ctx.restore();
  }

  // ── 文字排版(題庫文字、答案卡)──────────────────────
  // 中文無空格,以字元為單位斷行;英數字則整串當一個詞元,不從單字中間斷行
  // (例如「嗨,我是Abu。」的 Abu 不會被拆成 Ab / u 兩行)
  function wrapLines(ctx, text, maxW) {
    const out = [];
    let line = '';
    const tokens = text.match(/[A-Za-z0-9']+|[^A-Za-z0-9']/g) || [];
    for (let i = 0; i < tokens.length; i++) {
      const tk = tokens[i];
      if (tk === '\n') { out.push(line); line = ''; continue; }
      const test = line + tk;
      if (line && ctx.measureText(test).width > maxW) { out.push(line); line = tk; }
      else line = test;
    }
    if (line) out.push(line);
    return out;
  }
  // 由大到小挑出能塞進 (maxW × maxH) 的字級,回傳 {lines, size}
  function fitText(ctx, text, maxW, maxH, baseSize, minSize) {
    const gap = 1.18;
    for (let s = baseSize; s >= minSize; s -= 2) {
      ctx.font = s + 'px ' + FONT;
      const lines = wrapLines(ctx, text, maxW);
      if (lines.length * s * gap <= maxH) return { lines: lines, size: s };
    }
    ctx.font = minSize + 'px ' + FONT;
    return { lines: wrapLines(ctx, text, maxW), size: minSize };
  }
  // 置中(垂直也置中)畫多行文字
  function drawLines(ctx, lines, size, cx, cy, color) {
    const gap = size * 1.18;
    ctx.font = size + 'px ' + FONT;
    ctx.fillStyle = color || '#5E4A36';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const total = lines.length * gap;
    let y = cy - total / 2 + gap / 2;
    for (let i = 0; i < lines.length; i++) { ctx.fillText(lines[i], cx, y); y += gap; }
  }

  // ── 小圖示 ────────────────────────────────────────────
  function drawIcon(ctx, key, x, y, s, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
    const c = color || '#8A6242';
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (key === 'back') {
      ctx.beginPath(); ctx.moveTo(8, -14); ctx.lineTo(-8, 0); ctx.lineTo(8, 14); ctx.stroke();
    } else if (key === 'home') {
      ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(0, -15); ctx.lineTo(16, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-11, 2); ctx.lineTo(-11, 15); ctx.lineTo(11, 15); ctx.lineTo(11, 2); ctx.stroke();
    } else if (key === 'speaker') {
      ctx.beginPath();
      ctx.moveTo(-12, -6); ctx.lineTo(-4, -6); ctx.lineTo(5, -14); ctx.lineTo(5, 14); ctx.lineTo(-4, 6); ctx.lineTo(-12, 6);
      ctx.closePath(); ctx.fill();
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(7, 0, 12, -0.7, 0.7); ctx.stroke();
    } else if (key === 'lock') {
      ctx.lineWidth = 5;
      rr(ctx, -12, -4, 24, 18, 5); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -6, 8, Math.PI, 0); ctx.stroke();
    } else if (key === 'star') {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 7 : 15;
        const a = -Math.PI / 2 + i * Math.PI / 5;
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
    } else if (key === 'check') {
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-3, 9); ctx.lineTo(13, -9); ctx.stroke();
    }
    ctx.restore();
  }

  window.PLS_ART = {
    FONT: FONT, el: el, rr: rr, pill: pill, bubble: bubble, sparkle: sparkle, heart: heart,
    drawFood: drawFood, drawFoodDeluxe: drawFoodDeluxe, drawFoodGold: drawFoodGold,
    drawShape: drawShape, drawPair: drawPair, drawIcon: drawIcon,
    fitText: fitText, drawLines: drawLines, wrapLines: wrapLines,
    SHAPE_COLORS: SHAPE_COLORS
  };
})();
