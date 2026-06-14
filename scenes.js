// scenes.js — 首頁三個視覺方向的場景繪製(834×1194 邏輯座標)
(function () {
  const TAU = Math.PI * 2;
  const FONT = '"Huninn","Baloo 2",sans-serif';

  function el(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

  function cloud(ctx, x, y, s, color) {
    ctx.fillStyle = color;
    el(ctx, x, y, 46 * s, 30 * s); ctx.fill();
    el(ctx, x - 40 * s, y + 8 * s, 30 * s, 22 * s); ctx.fill();
    el(ctx, x + 42 * s, y + 8 * s, 32 * s, 22 * s); ctx.fill();
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
  }

  function bubble(ctx, x, y, text) {
    ctx.font = '27px ' + FONT;
    const w = ctx.measureText(text).width + 44, h = 58;
    ctx.save();
    ctx.shadowColor = 'rgba(150,110,70,0.18)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    rr(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 9, y + h / 2 - 3);
    ctx.lineTo(x, y + h / 2 + 13);
    ctx.lineTo(x + 9, y + h / 2 - 3);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#7A6450'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 2);
  }

  function title(ctx, W, y, col, shadowCol) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '66px ' + FONT;
    ctx.fillStyle = shadowCol; ctx.fillText('寵物小學堂', W / 2, y + 4);
    ctx.fillStyle = col; ctx.fillText('寵物小學堂', W / 2, y);
    ctx.font = '26px ' + FONT;
    ctx.globalAlpha = 0.75;
    ctx.fillText('每天一起學習,一起吃大餐!', W / 2, y + 56);
    ctx.globalAlpha = 1;
  }

  function floaters(ctx, t, items, color) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    items.forEach(function (it, i) {
      const dy = Math.sin(t * 0.8 + i * 1.7) * 8;
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = color;
      ctx.font = it.s + 'px ' + FONT;
      ctx.fillText(it.g, it.x, it.y + dy);
    });
    ctx.globalAlpha = 1;
  }

  // ── A · 奶油草地 ──────────────────────────────────────
  function meadow(ctx, t, W, H) {
    let g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#FFF8E9'); g.addColorStop(0.55, '#FFEFDA'); g.addColorStop(1, '#FFEFDA');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const rg = ctx.createRadialGradient(690, 170, 10, 690, 170, 130);
    rg.addColorStop(0, 'rgba(255,196,140,0.7)'); rg.addColorStop(1, 'rgba(255,196,140,0)');
    ctx.fillStyle = rg; ctx.fillRect(540, 20, 300, 300);
    ctx.fillStyle = '#FFD9A8'; el(ctx, 690, 170, 46, 46); ctx.fill();

    cloud(ctx, 150 + Math.sin(t * 0.3) * 6, 240, 1, 'rgba(255,255,255,0.85)');
    cloud(ctx, 560 + Math.sin(t * 0.25 + 2) * 6, 330, 0.7, 'rgba(255,255,255,0.6)');
    floaters(ctx, t, [
      { g: '3', x: 110, y: 430, s: 54 }, { g: 'A', x: 720, y: 470, s: 50 },
      { g: '7', x: 230, y: 530, s: 40 }, { g: 'b', x: 630, y: 620, s: 44 }
    ], '#E8A36C');

    // 山丘與草地
    ctx.fillStyle = '#E2F0DA'; el(ctx, 180, 870, 520, 210); ctx.fill();
    ctx.fillStyle = '#D5EACA'; el(ctx, 720, 890, 520, 220); ctx.fill();
    ctx.fillStyle = '#CFE7C2'; ctx.fillRect(0, 888, W, H - 888);

    // 小花
    [[90, 960], [180, 1070], [330, 1000], [500, 1075], [640, 990], [760, 1065], [420, 940]].forEach(function (p, i) {
      ctx.fillStyle = i % 2 ? '#FFFFFF' : '#FFD3C2';
      for (let k = 0; k < 5; k++) { el(ctx, p[0] + Math.cos(k / 5 * TAU) * 7, p[1] + Math.sin(k / 5 * TAU) * 7, 5, 5); ctx.fill(); }
      ctx.fillStyle = '#F9C25E'; el(ctx, p[0], p[1], 4.5, 4.5); ctx.fill();
    });

    title(ctx, W, 150, '#8A6240', 'rgba(255,255,255,0.9)');

    // 草墩 + 角色
    ctx.fillStyle = '#C2DFB2';
    el(ctx, 225, 915, 160, 42); ctx.fill();
    el(ctx, 610, 915, 160, 42); ctx.fill();
    ctx.save(); ctx.translate(225, 786); ctx.scale(0.85, 0.85); window.PetArt.drawRabbit(ctx, t); ctx.restore();
    ctx.save(); ctx.translate(610, 786); ctx.scale(0.85, 0.85); window.PetArt.drawHamster(ctx, t); ctx.restore();

    bubble(ctx, 215, 540, '今天也一起加油!');
    bubble(ctx, 625, 540, '我們來解題吧!');
    pill(ctx, 225, 995, '兔兔', '#8A6240', 'rgba(255,255,255,0.92)');
    pill(ctx, 610, 995, '倉倉', '#8A6240', 'rgba(255,255,255,0.92)');
    pill(ctx, W / 2, 1120, '點一下你的寵物,開始今天的學習', '#9A7B5C', 'rgba(255,255,255,0.8)', 26);
  }

  // ── B · 清晨雲朵 ──────────────────────────────────────
  function bigCloud(ctx, x, y, s) {
    ctx.save();
    ctx.shadowColor = 'rgba(130,160,190,0.25)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#FFFFFF';
    el(ctx, x, y, 120 * s, 42 * s); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#FFFFFF';
    el(ctx, x - 70 * s, y - 16 * s, 52 * s, 34 * s); ctx.fill();
    el(ctx, x + 10 * s, y - 26 * s, 60 * s, 40 * s); ctx.fill();
    el(ctx, x + 78 * s, y - 12 * s, 46 * s, 30 * s); ctx.fill();
  }

  function sky(ctx, t, W, H) {
    let g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#DCEFFA'); g.addColorStop(0.6, '#F2F6EC'); g.addColorStop(1, '#FFF6E2');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const rg = ctx.createRadialGradient(150, 170, 10, 150, 170, 150);
    rg.addColorStop(0, 'rgba(255,226,140,0.8)'); rg.addColorStop(1, 'rgba(255,226,140,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, 330, 340);
    ctx.fillStyle = '#FFE49B'; el(ctx, 150, 170, 50, 50); ctx.fill();

    cloud(ctx, 650 + Math.sin(t * 0.3) * 8, 210, 0.9, 'rgba(255,255,255,0.9)');
    cloud(ctx, 120, 420, 0.6, 'rgba(255,255,255,0.7)');
    cloud(ctx, 745, 660, 0.55, 'rgba(255,255,255,0.7)');
    sparkle(ctx, 90, 570, 10, '#FFD98E', 0.7);
    sparkle(ctx, 770, 340, 8, '#FFD98E', 0.6);
    sparkle(ctx, 730, 1110, 9, '#FFD98E', 0.5);
    sparkle(ctx, 70, 1070, 7, '#FFD98E', 0.5);

    title(ctx, W, 150, '#5B7B9E', 'rgba(255,255,255,0.95)');

    // 雲朵平台 1 — 兔兔(左上)
    bigCloud(ctx, 250, 645, 1.25);
    ctx.save(); ctx.translate(250, 500); ctx.scale(0.8, 0.8); window.PetArt.drawRabbit(ctx, t); ctx.restore();
    pill(ctx, 250, 705, '兔兔', '#5B7B9E', 'rgba(255,255,255,0.95)');
    bubble(ctx, 565, 430, '早安!一起學習囉');

    // 雲朵平台 2 — 倉倉(右下)
    bigCloud(ctx, 580, 1045, 1.25);
    ctx.save(); ctx.translate(580, 900); ctx.scale(0.8, 0.8); window.PetArt.drawHamster(ctx, t); ctx.restore();
    pill(ctx, 580, 1105, '倉倉', '#5B7B9E', 'rgba(255,255,255,0.95)');
    bubble(ctx, 255, 845, '解題請我吃點心!');
  }

  // ── C · 溫馨小屋 ──────────────────────────────────────
  function doll(ctx, x, y) {
    ctx.fillStyle = '#F2A9B8';
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 14); ctx.lineTo(x + 8, y - 14);
    ctx.lineTo(x + 22, y + 30); ctx.lineTo(x - 22, y + 30);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#F8D8B8'; el(ctx, x, y - 36, 22, 22); ctx.fill();
    ctx.fillStyle = '#8A5A3C';
    ctx.beginPath(); ctx.arc(x, y - 38, 23, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#5A4636';
    el(ctx, x - 7, y - 32, 2.5, 2.5); ctx.fill();
    el(ctx, x + 7, y - 32, 2.5, 2.5); ctx.fill();
  }

  function toyBlocks(ctx, x, y) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '26px ' + FONT;
    ctx.fillStyle = '#BCE0C8'; rr(ctx, x, y, 46, 46, 10); ctx.fill();
    ctx.fillStyle = '#7FAE8E'; ctx.fillText('A', x + 23, y + 25);
    ctx.fillStyle = '#F6C9A8'; rr(ctx, x + 20, y - 48, 46, 46, 10); ctx.fill();
    ctx.fillStyle = '#C08B5E'; ctx.fillText('3', x + 43, y - 23);
  }

  function toyCar(ctx, x, y) {
    ctx.fillStyle = '#BCD8F2';
    ctx.beginPath(); ctx.arc(x - 2, y - 24, 30, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; rr(ctx, x - 16, y - 44, 28, 18, 6); ctx.fill();
    ctx.fillStyle = '#9FC3E8'; rr(ctx, x - 56, y - 26, 112, 40, 16); ctx.fill();
    ctx.fillStyle = '#5A6B7C'; el(ctx, x - 30, y + 16, 13, 13); ctx.fill(); el(ctx, x + 30, y + 16, 13, 13); ctx.fill();
    ctx.fillStyle = '#C9D6E2'; el(ctx, x - 30, y + 16, 6, 6); ctx.fill(); el(ctx, x + 30, y + 16, 6, 6); ctx.fill();
  }

  function toyRobot(ctx, x, y) {
    ctx.strokeStyle = '#7FAE9C'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y - 48); ctx.lineTo(x, y - 58); ctx.stroke();
    ctx.fillStyle = '#FFD98E'; el(ctx, x, y - 61, 4, 4); ctx.fill();
    ctx.fillStyle = '#C4E4D9'; rr(ctx, x - 16, y - 48, 32, 28, 8); ctx.fill();
    ctx.fillStyle = '#A9D6C7'; rr(ctx, x - 20, y - 16, 40, 42, 8); ctx.fill();
    ctx.fillStyle = '#5A7A6E'; el(ctx, x - 8, y - 35, 3, 3); ctx.fill(); el(ctx, x + 8, y - 35, 3, 3); ctx.fill();
  }

  function cozy(ctx, t, W, H) {
    // 牆與點點壁紙
    ctx.fillStyle = '#F6E9DB'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(214,178,146,0.16)';
    for (let yy = 60; yy < 940; yy += 90)
      for (let xx = Math.floor(yy / 90) % 2 ? 50 : 95; xx < W; xx += 90) { el(ctx, xx, yy, 7, 7); ctx.fill(); }

    // 地板
    ctx.fillStyle = '#E9D2B2'; ctx.fillRect(0, 950, W, H - 950);
    ctx.strokeStyle = 'rgba(180,140,95,0.35)'; ctx.lineWidth = 2;
    for (let xx = 0; xx < W + 60; xx += 120) {
      ctx.beginPath(); ctx.moveTo(xx, 950); ctx.lineTo(xx - 40, H); ctx.stroke();
    }

    // 暖光
    const rg = ctx.createRadialGradient(W / 2, 80, 40, W / 2, 80, 700);
    rg.addColorStop(0, 'rgba(255,210,140,0.25)'); rg.addColorStop(1, 'rgba(255,210,140,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, 900);

    title(ctx, W, 100, '#8A6242', 'rgba(255,255,255,0.85)');

    // 小屋外框
    const hx = 107, hw = 620, hy = 270, hh = 800;
    ctx.save();
    ctx.shadowColor = 'rgba(150,100,60,0.2)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#FFF9EF'; rr(ctx, hx, hy, hw, hh, 36); ctx.fill();
    ctx.restore();

    // 屋頂
    ctx.fillStyle = '#F2BD96';
    ctx.strokeStyle = '#F2BD96'; ctx.lineWidth = 26; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - 14, hy + 12); ctx.lineTo(W / 2, hy - 58); ctx.lineTo(hx + hw + 14, hy + 12);
    ctx.closePath(); ctx.stroke(); ctx.fill();

    pill(ctx, W / 2, 305, '兔兔 和 倉倉 的家', '#A07B58', 'rgba(255,255,255,0.9)', 24);

    // 房間 1 — 兔兔(扮家家酒)
    ctx.fillStyle = '#FBE8E4'; rr(ctx, 135, 350, 564, 320, 24); ctx.fill();
    ctx.fillStyle = 'rgba(238,170,170,0.25)';
    for (let xx = 175; xx < 680; xx += 80) for (let yy = 385; yy < 560; yy += 80) { el(ctx, xx, yy, 5, 5); ctx.fill(); }
    ctx.save(); ctx.translate(280, 565); ctx.scale(0.6, 0.6); window.PetArt.drawRabbit(ctx, t); ctx.restore();
    doll(ctx, 520, 605);
    toyBlocks(ctx, 580, 590);
    pill(ctx, 218, 385, '兔兔', '#B97A82', 'rgba(255,255,255,0.92)', 26);
    bubble(ctx, 500, 430, '歡迎回家!');

    // 房間 2 — 倉倉(機器人與小汽車)
    ctx.fillStyle = '#E6EFF5'; rr(ctx, 135, 700, 564, 320, 24); ctx.fill();
    ctx.fillStyle = 'rgba(140,175,205,0.22)';
    for (let xx = 175; xx < 680; xx += 80) for (let yy = 735; yy < 910; yy += 80) { el(ctx, xx, yy, 5, 5); ctx.fill(); }
    ctx.save(); ctx.translate(280, 915); ctx.scale(0.6, 0.6); window.PetArt.drawHamster(ctx, t); ctx.restore();
    toyCar(ctx, 520, 960);
    toyRobot(ctx, 630, 945);
    pill(ctx, 218, 735, '倉倉', '#6E8BA4', 'rgba(255,255,255,0.92)', 26);
    bubble(ctx, 500, 780, '今天玩什麼呢?');

    pill(ctx, W / 2, 1130, '點一下你的寵物,開始今天的學習', '#9A7B5C', 'rgba(255,255,255,0.85)', 26);
  }

  window.Scenes = { meadow: meadow, sky: sky, cozy: cozy };
})();
