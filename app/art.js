// art.js — 共用繪圖:UI 元件、食物、形狀、圖示
(function () {
  const TAU = Math.PI * 2;
  const FONT = '"Huninn","Baloo 2",sans-serif';

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

  function drawFoodDeluxe(ctx, key, x, y, s) {
    const fn = FOODS_DELUXE[key] || FOODS[key] || FOODS.apple;
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
    fn(ctx);
    ctx.restore();
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
  // 中文無空格,以字元為單位斷行
  function wrapLines(ctx, text, maxW) {
    const out = [];
    let line = '';
    const chars = Array.from(text);
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (ch === '\n') { out.push(line); line = ''; continue; }
      const test = line + ch;
      if (line && ctx.measureText(test).width > maxW) { out.push(line); line = ch; }
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
    drawFood: drawFood, drawFoodDeluxe: drawFoodDeluxe,
    drawShape: drawShape, drawPair: drawPair, drawIcon: drawIcon,
    fitText: fitText, drawLines: drawLines, wrapLines: wrapLines,
    SHAPE_COLORS: SHAPE_COLORS
  };
})();
