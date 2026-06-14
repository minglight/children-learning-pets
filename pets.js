// pets.js — Canvas 角色繪製:兔兔 & 倉倉
// 座標系:角色置中於 (0,0),腳底約在 y=140。用 ctx.translate/scale 擺位。
(function () {
  const TAU = Math.PI * 2;

  function el(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
  }

  // 眨眼:回傳 0(閉)~ 1(開)
  function blink(t, seed) {
    const period = 3.4 + seed;
    const ph = (t + seed * 2.1) % period;
    if (ph < 0.14) return 1 - Math.sin((ph / 0.14) * Math.PI);
    return 1;
  }

  function drawEyes(ctx, dx, y, open, col) {
    [-1, 1].forEach(function (s) {
      const ex = s * dx;
      if (open > 0.3) {
        ctx.fillStyle = col;
        el(ctx, ex, y, 7.5, 7.5 * open); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        el(ctx, ex - 2.4, y - 2.4, 2.6, 2.6 * open); ctx.fill();
      } else {
        ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(ex, y - 2, 8, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      }
    });
  }

  function mouth(ctx, y, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-9, y);
    ctx.quadraticCurveTo(-4.5, y + 6, 0, y);
    ctx.quadraticCurveTo(4.5, y + 6, 9, y);
    ctx.stroke();
  }

  // ── 兔兔 ──────────────────────────────────────────────
  function drawRabbit(ctx, t, o) {
    o = o || {};
    const bob = Math.sin(t * 1.8) * 4;
    const sq = 1 + Math.sin(t * 1.8 + Math.PI) * 0.012;
    const sway = Math.sin(t * 1.1) * 0.05;
    const open = blink(t, 0.3);

    ctx.save();
    // 地面陰影
    ctx.fillStyle = 'rgba(120,90,60,0.13)';
    el(ctx, 0, 142, 92, 16); ctx.fill();

    ctx.translate(0, 140 + bob);
    ctx.scale(1, sq);
    ctx.translate(0, -140);

    // 耳朵
    [-1, 1].forEach(function (s) {
      ctx.save();
      ctx.translate(s * 40, -98);
      ctx.rotate(s * 0.16 - sway * s);
      ctx.fillStyle = '#FFF9F0';
      el(ctx, 0, -58, 24, 66); ctx.fill();
      ctx.fillStyle = '#FAD2DA';
      el(ctx, 0, -50, 12, 46); ctx.fill();
      ctx.restore();
    });

    // 身體 + 頭(同一塊奶油色)
    const g = ctx.createLinearGradient(0, -150, 0, 145);
    g.addColorStop(0, '#FFFDF8');
    g.addColorStop(1, '#F6E7D2');
    ctx.fillStyle = g;
    el(ctx, 0, 58, 92, 80); ctx.fill();
    el(ctx, 0, -58, 78, 74); ctx.fill();

    // 手與腳
    ctx.fillStyle = '#F9EDDC';
    el(ctx, -78, 38, 19, 27, 0.45); ctx.fill();
    el(ctx, 78, 38, 19, 27, -0.45); ctx.fill();
    el(ctx, -38, 130, 30, 16); ctx.fill();
    el(ctx, 38, 130, 30, 16); ctx.fill();

    // 臉
    drawEyes(ctx, 30, -62, open, '#4B3A2F');
    ctx.fillStyle = '#F2A0AC';
    el(ctx, 0, -46, 6, 4.5); ctx.fill();
    mouth(ctx, -37, '#C98A77');
    ctx.fillStyle = 'rgba(246,160,150,0.40)';
    el(ctx, -52, -42, 13, 8); ctx.fill();
    el(ctx, 52, -42, 13, 8); ctx.fill();

    ctx.restore();
  }

  // ── 倉倉 ──────────────────────────────────────────────
  function drawHamster(ctx, t, o) {
    o = o || {};
    const bob = Math.sin(t * 1.9 + 1.3) * 4;
    const sq = 1 + Math.sin(t * 1.9 + 1.3 + Math.PI) * 0.012;
    const open = blink(t, 1.1);

    ctx.save();
    ctx.fillStyle = 'rgba(120,90,60,0.13)';
    el(ctx, 0, 142, 100, 16); ctx.fill();

    ctx.translate(0, 140 + bob);
    ctx.scale(1, sq);
    ctx.translate(0, -140);

    // 耳朵
    [-1, 1].forEach(function (s) {
      ctx.fillStyle = '#EFAF66';
      el(ctx, s * 54, -112, 21, 21); ctx.fill();
      ctx.fillStyle = '#F6BFA8';
      el(ctx, s * 54, -110, 11, 11); ctx.fill();
    });

    // 身體 + 頭
    const g = ctx.createLinearGradient(0, -140, 0, 150);
    g.addColorStop(0, '#FFDFA6');
    g.addColorStop(1, '#EFAC60');
    ctx.fillStyle = g;
    el(ctx, 0, 58, 100, 82); ctx.fill();
    el(ctx, 0, -52, 80, 74); ctx.fill();

    // 口鼻區與肚子(奶油色)
    ctx.fillStyle = '#FFF3DC';
    el(ctx, 0, -28, 46, 34); ctx.fill();
    el(ctx, 0, 78, 58, 46); ctx.fill();

    // 鬍鬚
    ctx.strokeStyle = 'rgba(160,120,80,0.35)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    [-1, 1].forEach(function (s) {
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(s * 48, -32 + i * 8);
        ctx.lineTo(s * 78, -38 + i * 11);
        ctx.stroke();
      }
    });

    // 手(抱胸前)與腳
    ctx.fillStyle = '#EFAC60';
    el(ctx, -26, 18, 14, 17, 0.5); ctx.fill();
    el(ctx, 26, 18, 14, 17, -0.5); ctx.fill();
    ctx.fillStyle = '#F4C685';
    el(ctx, -42, 132, 27, 14); ctx.fill();
    el(ctx, 42, 132, 27, 14); ctx.fill();

    // 臉
    drawEyes(ctx, 34, -58, open, '#503823');
    ctx.fillStyle = '#E89BA2';
    el(ctx, 0, -44, 5.5, 4); ctx.fill();
    mouth(ctx, -34, '#B98358');
    ctx.fillStyle = 'rgba(243,150,130,0.40)';
    el(ctx, -60, -34, 15, 9); ctx.fill();
    el(ctx, 60, -34, 15, 9); ctx.fill();

    ctx.restore();
  }

  window.PetArt = { drawRabbit: drawRabbit, drawHamster: drawHamster, el: el };
})();
