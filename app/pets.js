// pets.js(app 版)— 角色繪製,含模式:idle / chew(咀嚼) / happy(開心跳) / sad(輕微失落)
// v4:o.stage('baby'|'kid'|'grown')控制成長外觀 — 幼幼縮小+呆毛、大寶放大+配件;不傳=kid(現在的樣子)。
// 2.5D:o.dir('front'|'side'|'back')控制視角 — side 是 3/4 側面(五官前移、耳朵後倒、露尾巴,
// 預設面向右,呼叫端用 ctx.scale(-1,1) 翻面朝左)、back 是背面(無臉、耳背、屁股尾巴);不傳=front。
(function () {
  const TAU = Math.PI * 2;

  // 幼幼呆毛(畫在頭頂;topY = 頭頂 y 座標)
  function babySprout(ctx, topY, col) {
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, topY + 4);
    ctx.quadraticCurveTo(3, topY - 16, 14, topY - 18);
    ctx.stroke();
    ctx.restore();
  }
  // 大寶配件:蝴蝶結(兔兔耳朵旁)
  function bow(ctx, x, y, s, col, knotCol) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = col;
    [-1, 1].forEach(function (k) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(k * 20, -16, k * 26, -4);
      ctx.quadraticCurveTo(k * 24, 10, 0, 0);
      ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle = knotCol;
    ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 6.5, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // 大寶配件:小領巾(倉倉脖子)
  function scarf(ctx, y, col, dark) {
    ctx.save();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, y, 50, 13, 0, 0, TAU); ctx.fill();
    // 垂下來的巾角
    ctx.beginPath();
    ctx.moveTo(-6, y + 8); ctx.lineTo(20, y + 8); ctx.lineTo(10, y + 34);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-2, y + 12); ctx.lineTo(8, y + 28); ctx.stroke();
    ctx.restore();
  }

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
    const dir = (o.dir === 'back' || o.dir === 'side') ? o.dir : 'front';
    const fx = dir === 'side' ? 30 : 0;   // 3/4 側面:五官與耳根往面向側偏移
    const sway = Math.sin(t * 1.1) * 0.05;
    ctx.save();
    shadow(ctx, 92);
    const mode = motion(ctx, t, o, 0);

    // 耳朵(開心時豎直擺動大;側面往後倒、背面只見耳背不畫內耳粉)
    [-1, 1].forEach(function (s) {
      ctx.save();
      ctx.translate(s * 40 + fx * 0.45, -98);
      ctx.rotate(s * (mode === 'happy' ? 0.06 : 0.16) - sway * s * (mode === 'happy' ? 2.5 : 1)
        - (dir === 'side' ? 0.34 : 0));
      ctx.fillStyle = '#FFF9F0';
      el(ctx, 0, -58, 24, 66); ctx.fill();
      if (dir !== 'back') {
        ctx.fillStyle = '#FAD2DA';
        el(ctx, dir === 'side' ? 4 : 0, -50, 12, 46); ctx.fill();
      }
      ctx.restore();
    });

    const g = ctx.createLinearGradient(0, -150, 0, 145);
    g.addColorStop(0, '#FFFDF8');
    g.addColorStop(1, '#F6E7D2');
    ctx.fillStyle = g;
    el(ctx, 0, 58, 92, 80); ctx.fill();
    el(ctx, 0, -58, 78, 74); ctx.fill();

    // 尾巴(圓絨球):背面在屁股正中、側面在身後
    if (dir === 'back') {
      ctx.fillStyle = '#FFFDF8'; el(ctx, 0, 94, 23, 21); ctx.fill();
      ctx.strokeStyle = 'rgba(205,175,145,0.55)'; ctx.lineWidth = 3;
      el(ctx, 0, 94, 23, 21); ctx.stroke();
    } else if (dir === 'side') {
      ctx.fillStyle = '#FFFDF8'; el(ctx, -84, 74, 17, 15); ctx.fill();
    }

    // 手:開心時舉高(背面藏在身體後,不畫)
    ctx.fillStyle = '#F9EDDC';
    if (dir !== 'back') {
      if (mode === 'happy') {
        el(ctx, -82, -10, 19, 27, -0.9); ctx.fill();
        el(ctx, 82, -10, 19, 27, 0.9); ctx.fill();
      } else if (mode === 'chew') {
        el(ctx, -42, 4, 17, 24, 0.9); ctx.fill();
        el(ctx, 42, 4, 17, 24, -0.9); ctx.fill();
      } else {
        el(ctx, -78 + fx * 0.3, 38, 19, 27, 0.45); ctx.fill();
        el(ctx, 78 + fx * 0.3, 38, 19, 27, -0.45); ctx.fill();
      }
    }
    el(ctx, -38, 130, 30, 16); ctx.fill();
    el(ctx, 38, 130, 30, 16); ctx.fill();

    if (dir !== 'back') {
      ctx.save(); ctx.translate(fx, 0);
      face(ctx, t, o, -62, 30, '#4B3A2F', '#C98A77', '#F2A0AC', 'rgba(246,160,150,0.40)', 52, -42, 0.3);
      ctx.restore();
    }

    // 成長階段裝飾(跟著身體的彈跳一起動;頭頂/耳旁的從背面側面也看得到)
    if (o.stage === 'baby') babySprout(ctx, -128, '#E8C9A8');
    else if (o.stage === 'grown') rabbitDeco(ctx, o.growDeco | 0, fx);
    ctx.restore();
  }
  // 兔兔 5 款大寶配件(v10 可收集;idx0 = 原本的粉蝴蝶結,維持舊大寶外觀)
  function rabbitDeco(ctx, idx, fx) {
    ctx.save();
    if (idx === 0) bow(ctx, 40 + fx * 0.45, -118, 1, '#E88AA0', '#D06A84');    // 耳邊粉蝴蝶結
    else if (idx === 1) scarf(ctx, 8, '#7FB3E0', '#5B90C4');                   // 藍領巾
    else if (idx === 2) collarBell(ctx, 6, '#E88AA0', '#F4C64E');              // 鈴鐺項圈
    else if (idx === 3) {                                                      // 金皇冠(頭頂)
      var cx = fx * 0.4;
      ctx.fillStyle = '#F4C64E';
      ctx.beginPath();
      ctx.moveTo(cx - 26, -104); ctx.lineTo(cx - 26, -122); ctx.lineTo(cx - 13, -110);
      ctx.lineTo(cx, -128); ctx.lineTo(cx + 13, -110); ctx.lineTo(cx + 26, -122);
      ctx.lineTo(cx + 26, -104); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#E88AA0'; el(ctx, cx, -113, 4.5, 4.5); ctx.fill();
    } else {                                                                   // 花圈
      var hx = fx * 0.4;
      ctx.strokeStyle = '#9FCB8E'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(hx, -102, 44, Math.PI * 1.14, Math.PI * 1.86); ctx.stroke();
      [['#F0A0B4', -28], ['#F4C64E', -4], ['#EF9BC0', 20]].forEach(function (f) {
        ctx.fillStyle = f[0]; el(ctx, hx + f[1], -126, 7, 7); ctx.fill();
      });
    }
    ctx.restore();
  }

  // ── 倉倉 ──────────────────────────────────────────────
  function drawHamster(ctx, t, o) {
    o = o || {};
    const dir = (o.dir === 'back' || o.dir === 'side') ? o.dir : 'front';
    const fx = dir === 'side' ? 30 : 0;   // 3/4 側面:五官與耳朵往面向側偏移
    ctx.save();
    shadow(ctx, 100);
    const mode = motion(ctx, t, o, 1.3);

    // 耳朵(背面只見耳背,不畫內耳粉)
    [-1, 1].forEach(function (s) {
      ctx.fillStyle = '#EFAF66';
      el(ctx, s * 54 + fx * 0.4, -112, 21, 21); ctx.fill();
      if (dir !== 'back') {
        ctx.fillStyle = '#F6BFA8';
        el(ctx, s * 54 + fx * 0.4 + (dir === 'side' ? 3 : 0), -110, 11, 11); ctx.fill();
      }
    });

    const g = ctx.createLinearGradient(0, -140, 0, 150);
    g.addColorStop(0, '#FFDFA6');
    g.addColorStop(1, '#EFAC60');
    ctx.fillStyle = g;
    el(ctx, 0, 58, 100, 82); ctx.fill();
    el(ctx, 0, -52, 80, 74); ctx.fill();

    // 背面:屁股淺色橢圓 + 小尾巴;側面:身後小尾巴
    if (dir === 'back') {
      ctx.fillStyle = 'rgba(214,140,70,0.25)';
      el(ctx, 0, 74, 54, 42); ctx.fill();
      ctx.fillStyle = '#F4C685'; el(ctx, 0, 106, 12, 9); ctx.fill();
    } else if (dir === 'side') {
      ctx.fillStyle = '#F4C685'; el(ctx, -92, 66, 11, 9); ctx.fill();
    }

    // 咀嚼時臉頰鼓起(只有正面看得到)
    if (mode === 'chew' && dir === 'front') {
      ctx.fillStyle = '#FFDFA6';
      const p = 1 + 0.12 * Math.sin(t * 14);
      el(ctx, -58, -34, 26 * p, 24 * p); ctx.fill();
      el(ctx, 58, -34, 26 * p, 24 * p); ctx.fill();
    }

    if (dir !== 'back') {
      // 臉口鼻淺色塊 + 肚皮
      ctx.fillStyle = '#FFF3DC';
      el(ctx, fx, -28, 46, 34); ctx.fill();
      el(ctx, fx * 0.5, 78, 58, 46); ctx.fill();

      // 鬍鬚(側面只畫面向側那撮)
      ctx.strokeStyle = 'rgba(160,120,80,0.35)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      (dir === 'side' ? [1] : [-1, 1]).forEach(function (s) {
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(s * 48 + fx, -32 + i * 8);
          ctx.lineTo(s * 78 + fx, -38 + i * 11);
          ctx.stroke();
        }
      });
    }

    // 手(背面藏在身體後,不畫)
    if (dir !== 'back') {
      ctx.fillStyle = '#EFAC60';
      if (mode === 'happy') {
        el(ctx, -84, -16, 14, 17, -0.9); ctx.fill();
        el(ctx, 84, -16, 14, 17, 0.9); ctx.fill();
      } else {
        el(ctx, -26 + fx * 0.4, 18, 14, 17, 0.5); ctx.fill();
        el(ctx, 26 + fx * 0.4, 18, 14, 17, -0.5); ctx.fill();
      }
    }
    ctx.fillStyle = '#F4C685';
    el(ctx, -42, 132, 27, 14); ctx.fill();
    el(ctx, 42, 132, 27, 14); ctx.fill();

    if (dir !== 'back') {
      ctx.save(); ctx.translate(fx, 0);
      face(ctx, t, o, -58, 34, '#503823', '#B98358', '#E89BA2', 'rgba(243,150,130,0.40)', 60, -34, 1.1);
      ctx.restore();
    }

    // 成長階段裝飾(跟著身體的彈跳一起動;領巾繞脖子一圈,背面也看得到,垂角只在非背面畫)
    if (o.stage === 'baby') babySprout(ctx, -122, '#D89A55');
    else if (o.stage === 'grown') hamsterDeco(ctx, o.growDeco | 0, fx, dir);
    ctx.restore();
  }
  // 倉倉 5 款大寶配件(v10 可收集;idx0 = 原本的紅領巾,維持舊大寶外觀;背面只有領巾特別處理)
  function hamsterDeco(ctx, idx, fx, dir) {
    ctx.save();
    if (idx === 0) {                                                           // 紅領巾(繞脖一圈)
      if (dir === 'back') { ctx.fillStyle = '#D9705E'; el(ctx, 0, 8, 50, 13); ctx.fill(); }
      else scarf(ctx, 8, '#D9705E', '#B85648');
    } else if (idx === 1) bow(ctx, 44 + fx * 0.4, -104, 0.85, '#E08AAB', '#B85E82');  // 耳邊蝴蝶結
    else if (idx === 2) collarBell(ctx, 8, '#6E9E5A', '#F4C64E');              // 鈴鐺項圈
    else if (idx === 3) {                                                      // 頭頂小花
      var f3 = 44 + fx * 0.4;
      ctx.fillStyle = '#F4A0B8';
      for (var k = 0; k < 5; k++) { var a = k / 5 * Math.PI * 2; el(ctx, f3 + Math.cos(a) * 8, -118 + Math.sin(a) * 8, 6, 6); ctx.fill(); }
      ctx.fillStyle = '#F6D06A'; el(ctx, f3, -118, 5, 5); ctx.fill();
    } else {                                                                   // 金皇冠(頭頂)
      var cx = fx * 0.4;
      ctx.fillStyle = '#F4C64E';
      ctx.beginPath();
      ctx.moveTo(cx - 24, -96); ctx.lineTo(cx - 24, -114); ctx.lineTo(cx - 12, -102);
      ctx.lineTo(cx, -120); ctx.lineTo(cx + 12, -102); ctx.lineTo(cx + 24, -114);
      ctx.lineTo(cx + 24, -96); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#D9705E'; el(ctx, cx, -105, 4.5, 4.5); ctx.fill();
    }
    ctx.restore();
  }

  // ═══════════ 備用物種(v8)═══════════
  // 全部沿用 el / shadow / motion / face / babySprout 的座標慣例(腳底 y≈132、頭 y≈-54、頭頂 y≈-110)。
  // 大寶配件由 o.growDeco(0-4)決定,每種 5 款;dir 'back' 不畫臉、'side' 五官 fx 偏移。

  function collarBell(ctx, y, band, bell) {          // 共用:項圈 + 鈴鐺
    ctx.save(); ctx.strokeStyle = band; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-46, y); ctx.quadraticCurveTo(0, y + 16, 46, y); ctx.stroke();
    ctx.fillStyle = bell; el(ctx, 0, y + 16, 10, 10); ctx.fill();
    ctx.fillStyle = '#8A6A1E'; el(ctx, 0, y + 19, 3, 3); ctx.fill(); ctx.restore();
  }
  function star4(ctx, x, y, r) {                     // 共用:四角星
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.3, y - r * 0.3); ctx.lineTo(x + r, y);
    ctx.lineTo(x + r * 0.3, y + r * 0.3); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.3, y + r * 0.3);
    ctx.lineTo(x - r, y); ctx.lineTo(x - r * 0.3, y - r * 0.3); ctx.closePath(); ctx.fill();
  }

  // ── 虎斑貓(斑斑)──
  function drawTabby(ctx, t, o) {
    o = o || {};
    const dir = (o.dir === 'back' || o.dir === 'side') ? o.dir : 'front';
    const fx = dir === 'side' ? 28 : 0;
    ctx.save(); shadow(ctx, 90); const mode = motion(ctx, t, o, 0.5);
    ctx.save(); ctx.translate(0, 60); ctx.rotate(0.5 + Math.sin(t * 1.6) * 0.08);
    ctx.fillStyle = '#EEB86A'; el(ctx, 58, -6, 15, 52, 0.4); ctx.fill();
    ctx.strokeStyle = '#C88A3E'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(52, -22); ctx.lineTo(64, -14); ctx.moveTo(56, 2); ctx.lineTo(68, 8); ctx.stroke(); ctx.restore();
    [-1, 1].forEach(function (s) {
      ctx.fillStyle = '#EEB86A';
      ctx.beginPath(); ctx.moveTo(s * 40 + fx * 0.5, -118); ctx.lineTo(s * 66 + fx * 0.5, -150); ctx.lineTo(s * 74 + fx * 0.5, -108); ctx.closePath(); ctx.fill();
      if (dir !== 'back') { ctx.fillStyle = '#E58B86'; ctx.beginPath(); ctx.moveTo(s * 48 + fx * 0.5, -116); ctx.lineTo(s * 62 + fx * 0.5, -138); ctx.lineTo(s * 68 + fx * 0.5, -112); ctx.closePath(); ctx.fill(); }
    });
    const g = ctx.createLinearGradient(0, -140, 0, 150); g.addColorStop(0, '#F4CC86'); g.addColorStop(1, '#E5A85A');
    ctx.fillStyle = g; el(ctx, 0, 58, 90, 80); ctx.fill(); el(ctx, 0, -54, 78, 72); ctx.fill();
    if (dir !== 'back') {
      ctx.fillStyle = '#FBF3E4'; el(ctx, fx * 0.4, 78, 50, 44); ctx.fill(); el(ctx, fx, -30, 40, 32); ctx.fill();
      ctx.strokeStyle = '#C88A3E'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(fx, -104); ctx.lineTo(fx, -86); ctx.moveTo(fx - 16, -100); ctx.lineTo(fx - 10, -84); ctx.moveTo(fx + 16, -100); ctx.lineTo(fx + 10, -84); ctx.stroke();
    }
    ctx.fillStyle = '#EEB86A';
    if (dir !== 'back') { el(ctx, -64 + fx * 0.3, 40, 16, 22, 0.4); ctx.fill(); el(ctx, 64 + fx * 0.3, 40, 16, 22, -0.4); ctx.fill(); }
    el(ctx, -38, 132, 28, 15); ctx.fill(); el(ctx, 38, 132, 28, 15); ctx.fill();
    if (dir !== 'back') {
      ctx.save(); ctx.translate(fx, 0);
      face(ctx, t, o, -58, 30, '#4B3A2F', '#B06A62', '#E58B86', 'rgba(246,160,150,0.40)', 54, -36, 0.3);
      ctx.strokeStyle = 'rgba(160,120,80,0.35)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      [-1, 1].forEach(function (s) { for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(s * 40, -36 + i * 7); ctx.lineTo(s * 72, -40 + i * 10); ctx.stroke(); } });
      ctx.restore();
    }
    if (o.stage === 'baby') babySprout(ctx, -128, '#E7B872');
    else if (o.stage === 'grown') tabbyDeco(ctx, o.growDeco | 0, fx);
    ctx.restore();
  }
  function tabbyDeco(ctx, idx, fx) {
    ctx.save();
    if (idx === 0) collarBell(ctx, 6, '#B85A5F', '#F4C64E');
    else if (idx === 1) bow(ctx, 0, 6, 0.9, '#C7607E', '#9E3E5C');
    else if (idx === 2) { ctx.fillStyle = '#8FB48E'; el(ctx, 0, 6, 50, 14); ctx.fill(); }
    else if (idx === 3) { ctx.fillStyle = '#D8A24E'; el(ctx, fx * 0.5 + 8, -112, 44, 20); ctx.fill(); ctx.fillStyle = '#E6B45E'; el(ctx, fx * 0.5 + 8, -120, 38, 17); ctx.fill(); ctx.fillStyle = '#8A5A2E'; el(ctx, fx * 0.5 + 8, -136, 5, 5); ctx.fill(); }
    else { ctx.strokeStyle = '#8FB48E'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(fx * 0.5, -104, 46, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); [['#F0A0B4', -30], ['#F4C64E', -6], ['#E58BA4', 18]].forEach(function (f) { ctx.fillStyle = f[0]; el(ctx, fx * 0.5 + f[1], -128, 7, 7); ctx.fill(); }); }
    ctx.restore();
  }

  // ── 狐蒙(蒙蒙)── 直立哨兵
  function drawMeerkat(ctx, t, o) {
    o = o || {};
    const dir = (o.dir === 'back' || o.dir === 'side') ? o.dir : 'front';
    const fx = dir === 'side' ? 24 : 0;
    ctx.save(); shadow(ctx, 62); motion(ctx, t, o, 0.8);
    ctx.strokeStyle = '#D8B98A'; ctx.lineWidth = 13; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(30, 120); ctx.quadraticCurveTo(80, 90, 70, 22); ctx.stroke();
    ctx.strokeStyle = '#5A4632'; ctx.beginPath(); ctx.moveTo(70, 28); ctx.lineTo(70, 18); ctx.stroke();
    const g = ctx.createLinearGradient(0, -120, 0, 150); g.addColorStop(0, '#E2C79A'); g.addColorStop(1, '#CFAE7E');
    ctx.fillStyle = g; el(ctx, 0, 60, 42, 84); ctx.fill(); el(ctx, fx, -70, 50, 48); ctx.fill();
    if (dir !== 'back') { ctx.fillStyle = '#F2E6CF'; el(ctx, 0, 66, 26, 64); ctx.fill(); }
    [-1, 1].forEach(function (s) { ctx.fillStyle = '#5A4632'; el(ctx, s * 40 + fx, -92, 13, 12); ctx.fill(); });
    if (dir !== 'back') { ctx.fillStyle = '#CFAE7E'; el(ctx, -24, 30, 11, 22, 0.2); ctx.fill(); el(ctx, 24, 30, 11, 22, -0.2); ctx.fill(); }
    ctx.fillStyle = '#C8A877'; el(ctx, -26, 134, 18, 12); ctx.fill(); el(ctx, 26, 134, 18, 12); ctx.fill();
    if (dir !== 'back') {
      ctx.save(); ctx.translate(fx, 0);
      ctx.fillStyle = '#5A4632'; el(ctx, -24, -72, 16, 19, -0.2); ctx.fill(); el(ctx, 24, -72, 16, 19, 0.2); ctx.fill();
      face(ctx, t, o, -72, 24, '#241A12', '#7A5A44', '#3A2C22', 'rgba(226,154,110,0.40)', 44, -52, 0.6);
      ctx.restore();
    }
    if (o.stage === 'baby') babySprout(ctx, -116, '#D8B98A');
    else if (o.stage === 'grown') meerkatDeco(ctx, o.growDeco | 0, fx);
    ctx.restore();
  }
  function meerkatDeco(ctx, idx, fx) {
    ctx.save();
    if (idx === 0) { ctx.fillStyle = '#C24E3E'; ctx.beginPath(); ctx.moveTo(-30, -18); ctx.quadraticCurveTo(0, -6, 30, -18); ctx.lineTo(24, -4); ctx.quadraticCurveTo(0, 6, -24, -4); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#A83E30'; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(-8, 16); ctx.lineTo(8, 16); ctx.closePath(); ctx.fill(); }
    else if (idx === 1) { ctx.fillStyle = '#8A6E48'; el(ctx, fx, -104, 30, 10); ctx.fill(); ctx.beginPath(); ctx.moveTo(fx - 22, -104); ctx.quadraticCurveTo(fx, -134, fx + 22, -104); ctx.fill(); ctx.fillStyle = '#5F86A0'; el(ctx, fx, -120, 5, 6); ctx.fill(); }
    else if (idx === 2) { ctx.strokeStyle = '#5F86A0'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-28, -20); ctx.quadraticCurveTo(0, -8, 28, -20); ctx.stroke(); ctx.fillStyle = '#3E5A6E'; ctx.fillRect(14, -14, 20, 12); ctx.fillStyle = '#9CC4D6'; el(ctx, 30, -8, 3, 3); ctx.fill(); }
    else if (idx === 3) { ctx.fillStyle = '#3A2C22'; el(ctx, fx - 24, -72, 15, 11); ctx.fill(); el(ctx, fx + 24, -72, 15, 11); ctx.fill(); ctx.fillRect(fx - 6, -74, 12, 4); }
    else { ctx.strokeStyle = '#8A6E48'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-30, -16); ctx.lineTo(28, 10); ctx.stroke(); ctx.fillStyle = '#B57A3E'; ctx.fillRect(20, 4, 16, 20); }
    ctx.restore();
  }

  // ── 水豚(豚豚)── 方臉佛系
  function drawCapybara(ctx, t, o) {
    o = o || {};
    const dir = (o.dir === 'back' || o.dir === 'side') ? o.dir : 'front';
    const fx = dir === 'side' ? 26 : 0;
    ctx.save(); shadow(ctx, 96); motion(ctx, t, o, 1.6);
    const g = ctx.createLinearGradient(0, -120, 0, 150); g.addColorStop(0, '#C49A6E'); g.addColorStop(1, '#AC7E52');
    ctx.fillStyle = g; el(ctx, 0, 64, 96, 74); ctx.fill(); el(ctx, fx, -44, 80, 66); ctx.fill();
    [-1, 1].forEach(function (s) { ctx.fillStyle = '#A87A4E'; el(ctx, s * 58 + fx * 0.6, -96, 15, 13); ctx.fill(); if (dir !== 'back') { ctx.fillStyle = '#7A5638'; el(ctx, s * 58 + fx * 0.6, -94, 7, 6); ctx.fill(); } });
    ctx.fillStyle = '#8A6544'; el(ctx, -40, 132, 26, 14); ctx.fill(); el(ctx, 40, 132, 26, 14); ctx.fill();
    if (dir !== 'back') {
      ctx.save(); ctx.translate(fx, 0);
      [-1, 1].forEach(function (s) { ctx.fillStyle = '#3A2A20'; el(ctx, s * 32, -44, 6, 8); ctx.fill(); ctx.fillStyle = '#FFF'; el(ctx, s * 32 - 2, -47, 2, 2); ctx.fill(); });
      ctx.fillStyle = 'rgba(216,154,110,0.40)'; el(ctx, -52, -22, 9, 6); ctx.fill(); el(ctx, 52, -22, 9, 6); ctx.fill();
      ctx.fillStyle = '#A87A4E'; el(ctx, 0, -6, 40, 30); ctx.fill();
      ctx.fillStyle = '#4A362A'; el(ctx, 0, 2, 34, 18); ctx.fill();
      ctx.fillStyle = '#2A1E16'; el(ctx, -14, -2, 4, 5); ctx.fill(); el(ctx, 14, -2, 4, 5); ctx.fill();
      ctx.strokeStyle = '#6E5038'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-8, 14); ctx.quadraticCurveTo(0, 20, 8, 14); ctx.stroke();
      ctx.restore();
    }
    if (o.stage === 'baby') babySprout(ctx, -108, '#CDA87E');
    else if (o.stage === 'grown') capyDeco(ctx, o.growDeco | 0, fx);
    ctx.restore();
  }
  function capyDeco(ctx, idx, fx) {
    ctx.save();
    if (idx === 0) { ctx.fillStyle = '#F4A93C'; el(ctx, fx, -104, 15, 15); ctx.fill(); ctx.fillStyle = '#7BAE5A'; ctx.beginPath(); ctx.moveTo(fx, -116); ctx.quadraticCurveTo(fx + 8, -126, fx + 14, -120); ctx.quadraticCurveTo(fx + 6, -112, fx, -112); ctx.closePath(); ctx.fill(); }
    else if (idx === 1) { ctx.fillStyle = '#FBF6EC'; el(ctx, fx, -100, 34, 12); ctx.fill(); ctx.fillStyle = '#8FBCA2'; ctx.fillRect(fx - 34, -102, 68, 4); }
    else if (idx === 2) { ctx.strokeStyle = '#5E8A72'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-30, 6); ctx.quadraticCurveTo(0, 20, 30, 6); ctx.stroke(); [-18, 0, 18].forEach(function (p) { ctx.fillStyle = '#6E9E7E'; ctx.beginPath(); ctx.moveTo(p, 2); ctx.lineTo(p - 6, -12); ctx.lineTo(p + 6, -10); ctx.closePath(); ctx.fill(); }); }
    else if (idx === 3) { ctx.fillStyle = '#C7A86E'; ctx.beginPath(); ctx.moveTo(fx - 40, -98); ctx.lineTo(fx, -138); ctx.lineTo(fx + 40, -98); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#A88650'; ctx.fillRect(fx - 40, -100, 80, 6); }
    else { [['#BFE0EA', -16, -108, 9], ['#D6EEF4', 6, -118, 7], ['#BFE0EA', 16, -102, 6]].forEach(function (b) { ctx.fillStyle = b[0]; ctx.globalAlpha = 0.7; el(ctx, fx + b[1], b[2], b[3], b[3]); ctx.fill(); }); ctx.globalAlpha = 1; }
    ctx.restore();
  }

  // ── 哈士奇(哈哈)──
  function drawHusky(ctx, t, o) {
    o = o || {};
    const dir = (o.dir === 'back' || o.dir === 'side') ? o.dir : 'front';
    const fx = dir === 'side' ? 28 : 0;
    ctx.save(); shadow(ctx, 90); const mode = motion(ctx, t, o, 2.1);
    ctx.fillStyle = '#8A97A6'; ctx.beginPath(); ctx.moveTo(58, 70); ctx.quadraticCurveTo(112, 40, 86, -6); ctx.quadraticCurveTo(70, 22, 52, 42); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#F4F6FA'; el(ctx, 90, 2, 10, 12); ctx.fill();
    [-1, 1].forEach(function (s) {
      ctx.fillStyle = '#8A97A6'; ctx.beginPath(); ctx.moveTo(s * 40 + fx * 0.5, -108); ctx.lineTo(s * 58 + fx * 0.5, -150); ctx.lineTo(s * 74 + fx * 0.5, -104); ctx.closePath(); ctx.fill();
      if (dir !== 'back') { ctx.fillStyle = '#E7C4CE'; ctx.beginPath(); ctx.moveTo(s * 48 + fx * 0.5, -108); ctx.lineTo(s * 58 + fx * 0.5, -136); ctx.lineTo(s * 66 + fx * 0.5, -106); ctx.closePath(); ctx.fill(); }
    });
    const g = ctx.createLinearGradient(0, -140, 0, 150); g.addColorStop(0, '#9AA6B4'); g.addColorStop(1, '#7E8B9A');
    ctx.fillStyle = g; el(ctx, 0, 58, 88, 80); ctx.fill(); el(ctx, 0, -52, 78, 72); ctx.fill();
    if (dir !== 'back') {
      ctx.fillStyle = '#F4F6FA'; el(ctx, fx * 0.4, 80, 48, 44); ctx.fill();
      el(ctx, fx, -14, 30, 34); ctx.fill();
      ctx.beginPath(); ctx.moveTo(fx - 12, -30); ctx.lineTo(fx, -92); ctx.lineTo(fx + 12, -30); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#8A97A6';
    if (dir !== 'back') { el(ctx, -64 + fx * 0.3, 40, 16, 22, 0.3); ctx.fill(); el(ctx, 64 + fx * 0.3, 40, 16, 22, -0.3); ctx.fill(); }
    ctx.fillStyle = '#F4F6FA'; el(ctx, -38, 132, 26, 15); ctx.fill(); el(ctx, 38, 132, 26, 15); ctx.fill();
    if (dir !== 'back') {
      ctx.save(); ctx.translate(fx, 0);
      face(ctx, t, o, -56, 30, '#5BA6D6', '#C96A82', '#2E333B', 'rgba(156,196,214,0.35)', 56, -36, 0.9);
      if (mode !== 'sad') { ctx.fillStyle = '#E88AA0'; ctx.beginPath(); ctx.moveTo(-6, -28); ctx.quadraticCurveTo(0, -4, 6, -28); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    if (o.stage === 'baby') babySprout(ctx, -122, '#B7C2CE');
    else if (o.stage === 'grown') huskyDeco(ctx, o.growDeco | 0, fx);
    ctx.restore();
  }
  function huskyDeco(ctx, idx, fx) {
    ctx.save();
    if (idx === 0) { ctx.fillStyle = '#3E9E8E'; ctx.beginPath(); ctx.moveTo(fx - 40, -104); ctx.quadraticCurveTo(fx, -150, fx + 40, -104); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#33506E'; el(ctx, fx, -104, 42, 9); ctx.fill(); ctx.fillStyle = '#F4F6FA'; el(ctx, fx, -146, 9, 9); ctx.fill(); }
    else if (idx === 1) { ctx.fillStyle = '#C24E3E'; el(ctx, 0, 6, 50, 14); ctx.fill(); ctx.fillStyle = '#A83E30'; ctx.beginPath(); ctx.moveTo(18, 10); ctx.lineTo(30, 34); ctx.lineTo(40, 28); ctx.closePath(); ctx.fill(); }
    else if (idx === 2) { ctx.strokeStyle = '#B57A3E'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-34, -16); ctx.lineTo(28, 16); ctx.moveTo(34, -16); ctx.lineTo(-28, 16); ctx.stroke(); }
    else if (idx === 3) { ctx.strokeStyle = '#33506E'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(fx - 34, -98); ctx.quadraticCurveTo(fx, -108, fx + 34, -98); ctx.stroke(); ctx.fillStyle = '#5F86A0'; el(ctx, fx - 16, -100, 12, 9); ctx.fill(); el(ctx, fx + 16, -100, 12, 9); ctx.fill(); }
    else collarBell(ctx, 6, '#C24E3E', '#F4C64E');
    ctx.restore();
  }

  // ── 大象(象象)──
  function drawElephant(ctx, t, o) {
    o = o || {};
    const dir = (o.dir === 'back' || o.dir === 'side') ? o.dir : 'front';
    const fx = dir === 'side' ? 26 : 0;
    ctx.save(); shadow(ctx, 100); motion(ctx, t, o, 0.3);
    [-1, 1].forEach(function (s) { ctx.fillStyle = '#A7B0B4'; el(ctx, s * 78 + fx * 0.4, -40, 40, 52); ctx.fill(); if (dir !== 'back') { ctx.fillStyle = '#E6B8C2'; el(ctx, s * 74 + fx * 0.4, -38, 26, 36); ctx.fill(); } });
    const g = ctx.createLinearGradient(0, -120, 0, 150); g.addColorStop(0, '#B7C1C5'); g.addColorStop(1, '#98A4AA');
    ctx.fillStyle = g; el(ctx, 0, 62, 94, 78); ctx.fill(); el(ctx, fx, -46, 72, 66); ctx.fill();
    ctx.fillStyle = '#98A4AA'; el(ctx, -44, 132, 30, 16); ctx.fill(); el(ctx, 44, 132, 30, 16); ctx.fill();
    if (dir !== 'back') {
      ctx.save(); ctx.translate(fx, 0);
      ctx.strokeStyle = '#F4EDDD'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-20, 6); ctx.quadraticCurveTo(-26, 24, -20, 32); ctx.moveTo(20, 6); ctx.quadraticCurveTo(26, 24, 20, 32); ctx.stroke();
      ctx.strokeStyle = '#A7B0B4'; ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -28); ctx.quadraticCurveTo(6, 12, -2, 40); ctx.quadraticCurveTo(-8, 58, 8, 60); ctx.stroke();
      [-1, 1].forEach(function (s) { ctx.fillStyle = '#3A3A3E'; el(ctx, s * 34, -52, 7, 9); ctx.fill(); ctx.fillStyle = '#FFF'; el(ctx, s * 34 - 2, -55, 2.4, 2.4); ctx.fill(); });
      ctx.fillStyle = 'rgba(226,150,150,0.30)'; el(ctx, -50, -24, 9, 6); ctx.fill(); el(ctx, 50, -24, 9, 6); ctx.fill();
      ctx.restore();
    }
    if (o.stage === 'baby') babySprout(ctx, -108, '#AEB8BC');
    else if (o.stage === 'grown') elephantDeco(ctx, o.growDeco | 0, fx);
    ctx.restore();
  }
  function elephantDeco(ctx, idx, fx) {
    ctx.save();
    if (idx === 0) { ctx.fillStyle = '#4A3A2A'; el(ctx, fx, -104, 8, 8); ctx.fill(); for (let i = 0; i < 8; i++) { ctx.fillStyle = '#F4C64E'; ctx.save(); ctx.translate(fx, -104); ctx.rotate(i * Math.PI / 4); el(ctx, 0, -14, 4, 8); ctx.fill(); ctx.restore(); } }
    else if (idx === 1) { ctx.fillStyle = '#D8B87A'; el(ctx, fx, -102, 40, 11); ctx.fill(); ctx.beginPath(); ctx.moveTo(fx - 24, -102); ctx.quadraticCurveTo(fx, -130, fx + 24, -102); ctx.fill(); ctx.strokeStyle = '#C24E5A'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(fx - 24, -104); ctx.quadraticCurveTo(fx, -110, fx + 24, -104); ctx.stroke(); }
    else if (idx === 2) { ctx.strokeStyle = '#6E9E7E'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(fx, -104, 44, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); [-28, -4, 20].forEach(function (p) { ctx.fillStyle = '#FBF6EC'; el(ctx, fx + p, -126, 7, 7); ctx.fill(); ctx.fillStyle = '#F4C64E'; el(ctx, fx + p, -126, 2.5, 2.5); ctx.fill(); }); }
    else if (idx === 3) bow(ctx, fx + 30, -96, 0.9, '#3F9E8C', '#2E6E60');
    else collarBell(ctx, 8, '#3F9E8C', '#F4C64E');
    ctx.restore();
  }

  // ── 橘白貓(橘橘)── 聖誕橘白貓
  function drawXmascat(ctx, t, o) {
    o = o || {};
    const dir = (o.dir === 'back' || o.dir === 'side') ? o.dir : 'front';
    const fx = dir === 'side' ? 28 : 0;
    ctx.save(); shadow(ctx, 90); motion(ctx, t, o, 0.7);
    ctx.save(); ctx.translate(0, 60); ctx.rotate(0.5 + Math.sin(t * 1.6) * 0.08);
    ctx.fillStyle = '#F4EBDD'; el(ctx, 58, -6, 15, 50, 0.4); ctx.fill();
    ctx.fillStyle = '#F0A85E'; el(ctx, 64, -22, 12, 16, 0.4); ctx.fill(); ctx.restore();
    [-1, 1].forEach(function (s) {
      ctx.fillStyle = '#F0A85E'; ctx.beginPath(); ctx.moveTo(s * 40 + fx * 0.5, -116); ctx.lineTo(s * 64 + fx * 0.5, -148); ctx.lineTo(s * 72 + fx * 0.5, -106); ctx.closePath(); ctx.fill();
      if (dir !== 'back') { ctx.fillStyle = '#E58B86'; ctx.beginPath(); ctx.moveTo(s * 48 + fx * 0.5, -114); ctx.lineTo(s * 60 + fx * 0.5, -136); ctx.lineTo(s * 66 + fx * 0.5, -110); ctx.closePath(); ctx.fill(); }
    });
    const g = ctx.createLinearGradient(0, -140, 0, 150); g.addColorStop(0, '#FFFBF4'); g.addColorStop(1, '#F0E6D6');
    ctx.fillStyle = g; el(ctx, 0, 58, 88, 80); ctx.fill(); el(ctx, 0, -54, 76, 72); ctx.fill();
    if (dir !== 'back') {
      ctx.fillStyle = '#F0A85E'; el(ctx, -46, 40, 26, 34, 0.3); ctx.fill(); el(ctx, fx - 28, -76, 24, 20); ctx.fill();
      ctx.strokeStyle = '#E08840'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(fx - 38, -70); ctx.lineTo(fx - 30, -58); ctx.moveTo(fx - 46, -58); ctx.lineTo(fx - 38, -48); ctx.stroke();
    }
    ctx.fillStyle = '#FBF4EC';
    if (dir !== 'back') { el(ctx, -64 + fx * 0.3, 40, 16, 22, 0.4); ctx.fill(); el(ctx, 64 + fx * 0.3, 40, 16, 22, -0.4); ctx.fill(); }
    el(ctx, -38, 132, 28, 15); ctx.fill(); el(ctx, 38, 132, 28, 15); ctx.fill();
    if (dir !== 'back') {
      ctx.save(); ctx.translate(fx, 0);
      face(ctx, t, o, -58, 30, '#3A2A22', '#C98A77', '#E88B7E', 'rgba(246,170,150,0.40)', 52, -36, 0.5);
      ctx.strokeStyle = 'rgba(160,120,80,0.30)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      [-1, 1].forEach(function (s) { for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(s * 40, -36 + i * 7); ctx.lineTo(s * 72, -40 + i * 10); ctx.stroke(); } });
      ctx.restore();
    }
    if (o.stage === 'baby') babySprout(ctx, -128, '#F0C79E');
    else if (o.stage === 'grown') xmasDeco(ctx, o.growDeco | 0, fx);
    ctx.restore();
  }
  function xmasDeco(ctx, idx, fx) {
    ctx.save();
    if (idx === 0) bow(ctx, 0, 6, 1, '#8E2B2B', '#6E1F1F');
    else if (idx === 1) { ctx.fillStyle = '#C0323C'; ctx.beginPath(); ctx.moveTo(fx - 40, -104); ctx.quadraticCurveTo(fx + 10, -160, fx + 42, -108); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#F4F6FA'; el(ctx, fx, -104, 44, 10); ctx.fill(); el(ctx, fx + 42, -152, 9, 9); ctx.fill(); }
    else if (idx === 2) { ctx.fillStyle = '#2E7D46'; el(ctx, 0, 6, 50, 13); ctx.fill(); ctx.fillStyle = '#F4C64E'; el(ctx, 0, 20, 6, 6); ctx.fill(); }
    else if (idx === 3) { ctx.fillStyle = '#2E7D46'; [[-14, -118], [6, -120]].forEach(function (p) { ctx.beginPath(); ctx.moveTo(fx + p[0], p[1]); ctx.lineTo(fx + p[0] + 14, p[1] - 6); ctx.lineTo(fx + p[0] + 8, p[1] + 6); ctx.closePath(); ctx.fill(); }); ctx.fillStyle = '#C0323C'; el(ctx, fx + 2, -116, 4, 4); ctx.fill(); }
    else { ctx.fillStyle = '#F4C64E'; star4(ctx, fx * 0.5 - 30, -118, 8); }
    ctx.restore();
  }

  // ── 蛋孵化共用:小雞/貓頭鷹的「幼幼」都是蛋殼裡探頭 ──
  function eggShell(ctx) {
    ctx.fillStyle = '#FBF3E2'; el(ctx, 0, 86, 66, 58); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-66, 40);
    let zx = -66; while (zx < 66) { ctx.lineTo(zx + 11, 26); ctx.lineTo(zx + 22, 40); zx += 22; }
    ctx.lineTo(66, 120); ctx.lineTo(-66, 120); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(210,180,140,0.5)'; ctx.lineWidth = 2; el(ctx, 0, 86, 66, 58); ctx.stroke();
  }

  // ── 小雞(蛋孵化)──
  function chickTuft(ctx, topY) {
    ctx.strokeStyle = '#F5C23F'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    [-12, 0, 12].forEach(function (a) { ctx.beginPath(); ctx.moveTo(a * 0.4, topY + 8); ctx.quadraticCurveTo(a, topY - 16, a * 1.5, topY - 22); ctx.stroke(); });
  }
  function chickEyes(ctx, t, eyeY, seed) {
    const open = blink(t, seed);
    [-1, 1].forEach(function (s) { const ex = s * 20; ctx.fillStyle = '#2E2119'; el(ctx, ex, eyeY, 6, 6.4 * open); ctx.fill(); ctx.fillStyle = '#fff'; el(ctx, ex - 1.8, eyeY - 2.4, 2, 2 * open); ctx.fill(); });
  }
  function drawChick(ctx, t, o) {
    o = o || {};
    const mode = o.mode || 'idle';
    ctx.save();
    if (o.stage === 'baby') {
      shadow(ctx, 74); motion(ctx, t, o, 1.1);
      eggShell(ctx);
      let gg = ctx.createLinearGradient(0, -40, 0, 40); gg.addColorStop(0, '#FFE07A'); gg.addColorStop(1, '#F6C846');
      ctx.fillStyle = gg; el(ctx, 0, -6, 52, 50); ctx.fill();
      chickTuft(ctx, -52);
      chickEyes(ctx, t, -10, 1.1);
      ctx.fillStyle = '#F0912E'; ctx.beginPath(); ctx.moveTo(-10, 3); ctx.lineTo(10, 3); ctx.lineTo(0, 12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#E0791E'; ctx.beginPath(); ctx.moveTo(-7, 7); ctx.lineTo(7, 7); ctx.lineTo(0, 12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(247,150,120,0.42)'; el(ctx, -28, -2, 10, 6); ctx.fill(); el(ctx, 28, -2, 10, 6); ctx.fill();
      ctx.fillStyle = '#F6C846'; el(ctx, -54, 44, 18, 12, -0.4); ctx.fill(); el(ctx, 54, 44, 18, 12, 0.4); ctx.fill();
      ctx.restore(); return;
    }
    const big = o.stage === 'grown';
    shadow(ctx, big ? 86 : 78); motion(ctx, t, o, 1.1);
    ctx.fillStyle = '#F2B92E'; ctx.beginPath(); ctx.moveTo(70, 64); ctx.quadraticCurveTo(112, 40, 96, 2); ctx.quadraticCurveTo(78, 30, 58, 44); ctx.closePath(); ctx.fill();
    let g = ctx.createLinearGradient(0, -120, 0, 150); g.addColorStop(0, '#FFE486'); g.addColorStop(1, '#F5C23F');
    ctx.fillStyle = g; el(ctx, 0, 66, 80, 80); ctx.fill(); el(ctx, 0, -30, 58, 54); ctx.fill();
    ctx.fillStyle = 'rgba(255,244,200,0.55)'; el(ctx, 0, 74, 50, 54); ctx.fill();
    ctx.fillStyle = '#F2B92E';
    if (mode === 'happy') { el(ctx, -78, 30, 20, 30, -0.7); ctx.fill(); el(ctx, 78, 30, 20, 30, 0.7); ctx.fill(); }
    else { el(ctx, -74, 52, 20, 34, 0.2); ctx.fill(); el(ctx, 74, 52, 20, 34, -0.2); ctx.fill(); }
    chickTuft(ctx, -58);
    chickEyes(ctx, t, -34, 1.1);
    const beakY = -34;
    if (mode === 'chew') {
      const ch = 0.5 + 0.5 * Math.sin(t * 14);
      ctx.fillStyle = '#F0912E'; el(ctx, 0, beakY + 16, 8, 4 + 6 * ch); ctx.fill();
    } else {
      ctx.fillStyle = '#F0912E'; ctx.beginPath(); ctx.moveTo(-10, beakY + 13); ctx.lineTo(10, beakY + 13); ctx.lineTo(0, beakY + 22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#E0791E'; ctx.beginPath(); ctx.moveTo(-7, beakY + 17); ctx.lineTo(7, beakY + 17); ctx.lineTo(0, beakY + 22); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(247,150,120,0.42)'; el(ctx, -28, beakY + 8, 10, 6); ctx.fill(); el(ctx, 28, beakY + 8, 10, 6); ctx.fill();
    ctx.strokeStyle = '#F0912E'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    [-26, 26].forEach(function (x) { ctx.beginPath(); ctx.moveTo(x, 120); ctx.lineTo(x, 138); ctx.moveTo(x, 138); ctx.lineTo(x - 9, 146); ctx.moveTo(x, 138); ctx.lineTo(x, 148); ctx.moveTo(x, 138); ctx.lineTo(x + 9, 146); ctx.stroke(); });
    if (big) chickDeco(ctx, o.growDeco | 0);
    ctx.restore();
  }
  function chickDeco(ctx, idx) {
    ctx.save();
    if (idx === 0) {
      ctx.fillStyle = '#E7C877'; el(ctx, 0, -58, 42, 12); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-24, -58); ctx.quadraticCurveTo(0, -88, 24, -58); ctx.fill();
      ctx.strokeStyle = '#5FA84A'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-24, -60); ctx.quadraticCurveTo(0, -66, 24, -60); ctx.stroke();
    } else if (idx === 1) bow(ctx, 0, -4, 0.8, '#E08AAB', '#B85E82');
    else if (idx === 2) scarf(ctx, -4, '#5FA84A', '#3E7A32');
    else if (idx === 3) {
      ctx.fillStyle = '#F4A0B8';
      for (var k = 0; k < 5; k++) { var a = k / 5 * Math.PI * 2; el(ctx, Math.cos(a) * 8, -66 + Math.sin(a) * 8, 6, 6); ctx.fill(); }
      ctx.fillStyle = '#F6D06A'; el(ctx, 0, -66, 5, 5); ctx.fill();
    } else collarBell(ctx, 4, '#E08AAB', '#F4C64E');
    ctx.restore();
  }

  // ── 貓頭鷹(蛋孵化)──
  function owlSpeckle(ctx) {
    ctx.fillStyle = 'rgba(70,74,84,0.85)';
    [[-40, 80], [-14, 104], [24, 92], [50, 110], [-52, 120], [10, 128], [40, 64], [-24, 60], [62, 88], [-60, 54]].forEach(function (p) {
      ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(0.5); el(ctx, 0, 0, 3.4, 6); ctx.fill(); ctx.restore();
    });
  }
  function owlFace(ctx, t, o, eyeY, eyeDX, seed) {
    const mode = o.mode || 'idle';
    const open = blink(t, seed);
    [-1, 1].forEach(function (s) {
      const ex = s * eyeDX;
      ctx.fillStyle = '#F2A81E'; el(ctx, ex, eyeY, 17, 17 * Math.max(0.5, open)); ctx.fill();
      ctx.fillStyle = '#241A12'; el(ctx, ex, eyeY + 1, 10, 10 * Math.max(0.5, open)); ctx.fill();
      ctx.fillStyle = '#fff'; el(ctx, ex - 4, eyeY - 4, 4, 4 * Math.max(0.5, open)); ctx.fill();
    });
    ctx.fillStyle = '#9AA0AA'; ctx.beginPath(); ctx.moveTo(0, eyeY - 2); ctx.lineTo(-6, eyeY + 16); ctx.lineTo(6, eyeY + 16); ctx.closePath(); ctx.fill();
    if (mode === 'chew') { const ch = 0.5 + 0.5 * Math.sin(t * 14); ctx.fillStyle = '#5A5E66'; el(ctx, 0, eyeY + 20, 6, 3 + 5 * ch); ctx.fill(); }
    else { ctx.fillStyle = '#5A5E66'; ctx.beginPath(); ctx.moveTo(-5, eyeY + 16); ctx.lineTo(5, eyeY + 16); ctx.lineTo(0, eyeY + 27); ctx.closePath(); ctx.fill(); }
  }
  function drawOwl(ctx, t, o) {
    o = o || {};
    ctx.save();
    if (o.stage === 'baby') {
      shadow(ctx, 74); motion(ctx, t, o, 0.9);
      eggShell(ctx);
      let gg = ctx.createRadialGradient(0, -16, 6, 0, -16, 58); gg.addColorStop(0, '#fff'); gg.addColorStop(1, '#E9ECF1');
      ctx.fillStyle = gg; el(ctx, 0, -16, 54, 52); ctx.fill();
      owlFace(ctx, t, o, -18, 20, 0.9);
      ctx.fillStyle = '#EEF0F4'; el(ctx, -54, 44, 18, 12, -0.4); ctx.fill(); el(ctx, 54, 44, 18, 12, 0.4); ctx.fill();
      ctx.restore(); return;
    }
    const big = o.stage === 'grown';
    shadow(ctx, big ? 92 : 84); motion(ctx, t, o, 0.5);
    let g = ctx.createLinearGradient(0, -130, 0, 150); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#E7EAF0');
    ctx.fillStyle = g; el(ctx, 0, 60, 82, 84); ctx.fill(); el(ctx, 0, -46, 78, 72); ctx.fill();
    ctx.save(); ctx.beginPath(); el(ctx, 0, 60, 82, 84); ctx.clip(); owlSpeckle(ctx); ctx.restore();
    const mode = o.mode || 'idle';
    ctx.fillStyle = '#F1F3F7';
    if (mode === 'happy') { el(ctx, -78, 40, 24, 56, -0.5); ctx.fill(); el(ctx, 78, 40, 24, 56, 0.5); ctx.fill(); }
    else { el(ctx, -72, 66, 22, 52, 0.12); ctx.fill(); el(ctx, 72, 66, 22, 52, -0.12); ctx.fill(); }
    ctx.fillStyle = 'rgba(70,74,84,0.7)';
    [[-74, 50], [-70, 78], [-66, 104], [74, 50], [70, 78], [66, 104]].forEach(function (p) { el(ctx, p[0], p[1], 3, 6, 0.4); ctx.fill(); });
    ctx.fillStyle = '#FBFCFE'; el(ctx, 0, -44, 58, 54); ctx.fill();
    owlFace(ctx, t, o, -48, 26, 0.5);
    ctx.fillStyle = '#F4F6FA'; el(ctx, -30, 128, 20, 16); ctx.fill(); el(ctx, 30, 128, 20, 16); ctx.fill();
    ctx.strokeStyle = '#C9B48E'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    [-30, 30].forEach(function (x) { [-9, 0, 9].forEach(function (o2) { ctx.beginPath(); ctx.moveTo(x, 138); ctx.lineTo(x + o2, 148); ctx.stroke(); }); });
    if (big) owlDeco(ctx, o.growDeco | 0);
    ctx.restore();
  }
  function owlDeco(ctx, idx) {
    ctx.save();
    if (idx === 0) {
      ctx.fillStyle = '#33506E'; ctx.fillRect(-30, -104, 60, 9);
      ctx.beginPath(); ctx.moveTo(-38, -104); ctx.lineTo(0, -116); ctx.lineTo(38, -104); ctx.lineTo(0, -92); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#F4C64E'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -110); ctx.lineTo(30, -104); ctx.lineTo(30, -88); ctx.stroke();
      ctx.fillStyle = '#F4C64E'; el(ctx, 30, -86, 5, 5); ctx.fill();
    } else if (idx === 1) bow(ctx, 0, -18, 0.85, '#3F9E8C', '#2E6E60');
    else if (idx === 2) scarf(ctx, -20, '#C24E5A', '#8E2530');
    else if (idx === 3) {
      ctx.fillStyle = '#F4A0B8';
      for (var k = 0; k < 5; k++) { var a = k / 5 * Math.PI * 2; el(ctx, Math.cos(a) * 8, -96 + Math.sin(a) * 8, 6, 6); ctx.fill(); }
      ctx.fillStyle = '#F6D06A'; el(ctx, 0, -96, 5, 5); ctx.fill();
    } else collarBell(ctx, -20, '#3F9E8C', '#F4C64E');
    ctx.restore();
  }

  // o.stage:'baby' 縮小 0.85、'grown' 放大 1.12(以腳底 y≈146 為基準對齊,站的位置不變)
  const DRAWERS = {
    rabbit: drawRabbit, hamster: drawHamster, tabby: drawTabby, meerkat: drawMeerkat,
    capybara: drawCapybara, husky: drawHusky, elephant: drawElephant, xmascat: drawXmascat,
    chick: drawChick, owl: drawOwl
  };
  function draw(petId, ctx, t, o) {
    o = o || {};
    const s = o.stage === 'baby' ? 0.85 : o.stage === 'grown' ? 1.12 : 1;
    if (s !== 1) { ctx.save(); ctx.translate(0, 146 * (1 - s)); ctx.scale(s, s); }
    (DRAWERS[petId] || drawRabbit)(ctx, t, o);
    if (s !== 1) ctx.restore();
  }

  window.PLS_PETS = {
    draw: draw, drawRabbit: drawRabbit, drawHamster: drawHamster, drawTabby: drawTabby,
    drawMeerkat: drawMeerkat, drawCapybara: drawCapybara, drawHusky: drawHusky,
    drawElephant: drawElephant, drawXmascat: drawXmascat, drawChick: drawChick, drawOwl: drawOwl
  };
})();
