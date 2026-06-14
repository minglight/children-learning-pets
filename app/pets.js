// pets.js(app 版)— 角色繪製,含模式:idle / chew(咀嚼) / happy(開心跳) / sad(輕微失落)
(function () {
  const TAU = Math.PI * 2;

  function el(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
  }

  function blink(t, seed) {
    const period = 3.4 + seed;
    const ph = (t + seed * 2.1) % period;
    if (ph < 0.14) return 1 - Math.sin((ph / 0.14) * Math.PI);
    return 1;
  }

  function drawEyes(ctx, dx, y, open, col, happy) {
    [-1, 1].forEach(function (s) {
      const ex = s * dx;
      if (happy || open <= 0.3) {
        ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(ex, y - 2, 8, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      } else {
        ctx.fillStyle = col;
        el(ctx, ex, y, 7.5, 7.5 * open); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        el(ctx, ex - 2.4, y - 2.4, 2.6, 2.6 * open); ctx.fill();
      }
    });
  }

  // mode: 'idle' | 'chew' | 'happy' | 'sad'
  function face(ctx, t, o, eyeY, eyeDX, eyeCol, mouthCol, noseCol, blushCol, blushDX, blushY, seed) {
    const mode = o.mode || 'idle';
    const open = blink(t, seed);
    drawEyes(ctx, eyeDX, eyeY, open, eyeCol, mode === 'happy' || mode === 'chew');

    // 鼻子
    ctx.fillStyle = noseCol;
    el(ctx, 0, eyeY + 16, 6, 4.5); ctx.fill();

    // 嘴巴
    const my = eyeY + 25;
    ctx.strokeStyle = mouthCol; ctx.lineWidth = 3; ctx.lineCap = 'round';
    if (mode === 'chew') {
      // 咀嚼:圓嘴一張一合
      const ch = 0.5 + 0.5 * Math.sin(t * 14);
      ctx.fillStyle = mouthCol;
      el(ctx, 0, my + 3, 7, 3 + 6 * ch); ctx.fill();
    } else if (mode === 'sad') {
      ctx.beginPath();
      ctx.moveTo(-8, my + 4);
      ctx.quadraticCurveTo(0, my - 2, 8, my + 4);
      ctx.stroke();
    } else if (mode === 'happy') {
      // 大笑容
      ctx.fillStyle = mouthCol;
      ctx.beginPath();
      ctx.arc(0, my, 10, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(-9, my);
      ctx.quadraticCurveTo(-4.5, my + 6, 0, my);
      ctx.quadraticCurveTo(4.5, my + 6, 9, my);
      ctx.stroke();
    }

    // 腮紅(咀嚼/開心時更明顯)
    ctx.fillStyle = blushCol;
    const bs = (mode === 'chew' || mode === 'happy') ? 1.2 : 1;
    el(ctx, -blushDX, blushY, 13 * bs, 8 * bs); ctx.fill();
    el(ctx, blushDX, blushY, 13 * bs, 8 * bs); ctx.fill();
  }

  function motion(ctx, t, o, speedSeed) {
    const mode = o.mode || 'idle';
    let bob = Math.sin(t * 1.8 + speedSeed) * 4;
    let sq = 1 + Math.sin(t * 1.8 + speedSeed + Math.PI) * 0.012;
    if (mode === 'happy') {
      bob = -Math.abs(Math.sin(t * 5)) * 26;
      sq = 1 + Math.sin(t * 10) * 0.03;
    } else if (mode === 'chew') {
      sq = 1 + Math.sin(t * 14) * 0.015;
    }
    ctx.translate(0, 140 + bob);
    ctx.scale(1, sq);
    ctx.translate(0, -140);
    return mode;
  }

  function shadow(ctx, w) {
    ctx.fillStyle = 'rgba(120,90,60,0.13)';
    el(ctx, 0, 142, w, 16); ctx.fill();
  }

  // ── 兔兔 ──────────────────────────────────────────────
  function drawRabbit(ctx, t, o) {
    o = o || {};
    const sway = Math.sin(t * 1.1) * 0.05;
    ctx.save();
    shadow(ctx, 92);
    const mode = motion(ctx, t, o, 0);

    // 耳朵(開心時豎直擺動大)
    [-1, 1].forEach(function (s) {
      ctx.save();
      ctx.translate(s * 40, -98);
      ctx.rotate(s * (mode === 'happy' ? 0.06 : 0.16) - sway * s * (mode === 'happy' ? 2.5 : 1));
      ctx.fillStyle = '#FFF9F0';
      el(ctx, 0, -58, 24, 66); ctx.fill();
      ctx.fillStyle = '#FAD2DA';
      el(ctx, 0, -50, 12, 46); ctx.fill();
      ctx.restore();
    });

    const g = ctx.createLinearGradient(0, -150, 0, 145);
    g.addColorStop(0, '#FFFDF8');
    g.addColorStop(1, '#F6E7D2');
    ctx.fillStyle = g;
    el(ctx, 0, 58, 92, 80); ctx.fill();
    el(ctx, 0, -58, 78, 74); ctx.fill();

    // 手:開心時舉高
    ctx.fillStyle = '#F9EDDC';
    if (mode === 'happy') {
      el(ctx, -82, -10, 19, 27, -0.9); ctx.fill();
      el(ctx, 82, -10, 19, 27, 0.9); ctx.fill();
    } else if (mode === 'chew') {
      el(ctx, -42, 4, 17, 24, 0.9); ctx.fill();
      el(ctx, 42, 4, 17, 24, -0.9); ctx.fill();
    } else {
      el(ctx, -78, 38, 19, 27, 0.45); ctx.fill();
      el(ctx, 78, 38, 19, 27, -0.45); ctx.fill();
    }
    el(ctx, -38, 130, 30, 16); ctx.fill();
    el(ctx, 38, 130, 30, 16); ctx.fill();

    face(ctx, t, o, -62, 30, '#4B3A2F', '#C98A77', '#F2A0AC', 'rgba(246,160,150,0.40)', 52, -42, 0.3);
    ctx.restore();
  }

  // ── 倉倉 ──────────────────────────────────────────────
  function drawHamster(ctx, t, o) {
    o = o || {};
    ctx.save();
    shadow(ctx, 100);
    const mode = motion(ctx, t, o, 1.3);

    [-1, 1].forEach(function (s) {
      ctx.fillStyle = '#EFAF66';
      el(ctx, s * 54, -112, 21, 21); ctx.fill();
      ctx.fillStyle = '#F6BFA8';
      el(ctx, s * 54, -110, 11, 11); ctx.fill();
    });

    const g = ctx.createLinearGradient(0, -140, 0, 150);
    g.addColorStop(0, '#FFDFA6');
    g.addColorStop(1, '#EFAC60');
    ctx.fillStyle = g;
    el(ctx, 0, 58, 100, 82); ctx.fill();
    el(ctx, 0, -52, 80, 74); ctx.fill();

    // 咀嚼時臉頰鼓起
    if (mode === 'chew') {
      ctx.fillStyle = '#FFDFA6';
      const p = 1 + 0.12 * Math.sin(t * 14);
      el(ctx, -58, -34, 26 * p, 24 * p); ctx.fill();
      el(ctx, 58, -34, 26 * p, 24 * p); ctx.fill();
    }

    ctx.fillStyle = '#FFF3DC';
    el(ctx, 0, -28, 46, 34); ctx.fill();
    el(ctx, 0, 78, 58, 46); ctx.fill();

    ctx.strokeStyle = 'rgba(160,120,80,0.35)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    [-1, 1].forEach(function (s) {
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(s * 48, -32 + i * 8);
        ctx.lineTo(s * 78, -38 + i * 11);
        ctx.stroke();
      }
    });

    ctx.fillStyle = '#EFAC60';
    if (mode === 'happy') {
      el(ctx, -84, -16, 14, 17, -0.9); ctx.fill();
      el(ctx, 84, -16, 14, 17, 0.9); ctx.fill();
    } else {
      el(ctx, -26, 18, 14, 17, 0.5); ctx.fill();
      el(ctx, 26, 18, 14, 17, -0.5); ctx.fill();
    }
    ctx.fillStyle = '#F4C685';
    el(ctx, -42, 132, 27, 14); ctx.fill();
    el(ctx, 42, 132, 27, 14); ctx.fill();

    face(ctx, t, o, -58, 34, '#503823', '#B98358', '#E89BA2', 'rgba(243,150,130,0.40)', 60, -34, 1.1);
    ctx.restore();
  }

  function draw(petId, ctx, t, o) {
    if (petId === 'rabbit') drawRabbit(ctx, t, o);
    else drawHamster(ctx, t, o);
  }

  window.PLS_PETS = { draw: draw, drawRabbit: drawRabbit, drawHamster: drawHamster };
})();
