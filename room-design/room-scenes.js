// room-scenes.js — 寵物房間「真正的房間」設計探索
// 邏輯座標 1194×834(iPad 橫向)。寵物用 app/pets.js 即時繪製,含待機動畫:
// 兔兔自己在房間裡走來走去 → 走到食物區「咀嚼」、走到遊戲區「開心跳」。無互動。
// 關鍵:兔兔走在「前緣」,食物/玩具分散在兩側偏後 → 兔兔停在它們前面,不會蓋住。
(function () {
  const A = window.PLS_ART;
  const TOY = window.PLS_TOY;
  const PET = window.PLS_PETS;
  const FONT = A.FONT;
  const TAU = Math.PI * 2;
  const W = 1194, H = 834;

  function el(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

  // 兔兔主題色
  const TH = {
    wall: '#FBE9E5', dot: 'rgba(232,170,170,0.22)',
    floor: '#EAD7BE', floorDark: '#DFC8A8', floorLine: 'rgba(180,140,95,0.30)',
    accent: '#C77F88', deep: '#8A5560',
    foodMat: '#F7D9BE', foodMatEdge: '#EFC59E', foodTag: '#C2791E', foodTagBg: 'rgba(255,243,224,0.96)',
    playMat: '#CFE6D6', playMatEdge: '#B6D7C0', playTag: '#4E8A5A', playTagBg: 'rgba(233,246,235,0.96)'
  };

  // ── 待機:兔兔自己在房間裡生活(走→吃→走→玩,循環)──────────
  function smooth(a, b, x) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
  // 回傳 {x, hop, mode}:fx=食物區停點 x,px=遊戲區停點 x
  function rabbitLife(t, fx, px) {
    const P = 18, ph = t % P;
    let x, hop = 0, mode;
    if (ph < 5) { x = fx; mode = 'chew'; }                                   // 在食物區前吃
    else if (ph < 9) { const k = smooth(5, 9, ph); x = fx + (px - fx) * k; mode = 'idle'; hop = -Math.abs(Math.sin((ph - 5) * 6.2)) * 18; }
    else if (ph < 14) { x = px; mode = 'happy'; }                            // 在遊戲區前玩
    else { const k = smooth(14, 18, ph); x = px + (fx - px) * k; mode = 'idle'; hop = -Math.abs(Math.sin((ph - 14) * 6.2)) * 18; }
    return { x: x, hop: hop, mode: mode };
  }
  function petAt(ctx, t, x, footY, s, mode) {
    ctx.save();
    ctx.translate(x, footY - 140 * s);
    ctx.scale(s, s);
    PET.draw('rabbit', ctx, t, { mode: mode });
    ctx.restore();
  }

  // ── 共用美術 ─────────────────────────────────────────
  function wallpaper(ctx, x, y, w, h, dot) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = dot || TH.dot;
    for (let yy = y + 40; yy < y + h; yy += 78)
      for (let xx = x + (Math.floor((yy - y) / 78) % 2 ? 40 : 80); xx < x + w; xx += 80) { el(ctx, xx, yy, 6, 6); ctx.fill(); }
    ctx.restore();
  }
  function warmLight(ctx, cx, cy, r, x, y, w, h) {
    const rg = ctx.createRadialGradient(cx, cy, 30, cx, cy, r);
    rg.addColorStop(0, 'rgba(255,214,150,0.22)'); rg.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = rg; ctx.fillRect(x, y, w, h);
  }
  function windowBox(ctx, x, y, w, h) {
    ctx.fillStyle = '#FBF6EC'; rr(ctx, x - 7, y - 7, w + 14, h + 14, 16); ctx.fill();
    const sky = ctx.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, '#CFEAF6'); sky.addColorStop(1, '#E9F6EC');
    ctx.fillStyle = sky; rr(ctx, x, y, w, h, 10); ctx.fill();
    ctx.fillStyle = '#FBE6B8'; el(ctx, x + w * 0.74, y + h * 0.30, 17, 17); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    el(ctx, x + w * 0.30, y + h * 0.62, 22, 13); ctx.fill();
    el(ctx, x + w * 0.48, y + h * 0.60, 17, 11); ctx.fill();
    ctx.strokeStyle = '#E6CBA6'; ctx.lineWidth = 5;
    rr(ctx, x, y, w, h, 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
    ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
  }
  function picture(ctx, x, y, w, h) {
    ctx.fillStyle = '#FBF6EC'; rr(ctx, x, y, w, h, 12); ctx.fill();
    ctx.fillStyle = '#F4C9D0'; rr(ctx, x + 10, y + 10, w - 20, h - 30, 6); ctx.fill();
    ctx.fillStyle = '#9FCBB2'; el(ctx, x + w / 2, y + h - 16, w * 0.36, 12); ctx.fill();
  }
  function foodBowl(ctx, cx, cy) {
    ctx.fillStyle = 'rgba(150,110,70,0.12)'; el(ctx, cx, cy + 18, 54, 13); ctx.fill();
    ctx.fillStyle = '#E7C79E'; el(ctx, cx, cy + 6, 48, 20); ctx.fill();
    ctx.fillStyle = '#F3E0C2'; el(ctx, cx, cy, 44, 16); ctx.fill();
    A.drawFood(ctx, 'apple', cx - 15, cy - 6, 0.56);
    A.drawFood(ctx, 'strawberry', cx + 15, cy - 4, 0.54);
  }
  function floorboards(ctx, x0, x1, yTop, yBot, vx) {
    ctx.strokeStyle = TH.floorLine; ctx.lineWidth = 2;
    for (let i = -3; i <= 9; i++) {
      const bx = x0 + (x1 - x0) * (i / 6);
      ctx.beginPath(); ctx.moveTo(bx, yTop);
      ctx.lineTo(bx + (bx - vx) * 0.55, yBot); ctx.stroke();
    }
  }
  function itemShadow(ctx, cx, cy, rx) { ctx.fillStyle = 'rgba(150,110,70,0.14)'; el(ctx, cx, cy, rx, rx * 0.26); ctx.fill(); }

  // ── 食物 / 遊戲站(物件分散兩側、偏後,中間留給兔兔站前面)──
  function foodStation(ctx, cx, matY) {
    ctx.fillStyle = TH.foodMatEdge; el(ctx, cx, matY + 8, 168, 50); ctx.fill();
    ctx.fillStyle = TH.foodMat; el(ctx, cx, matY, 156, 44); ctx.fill();
    itemShadow(ctx, cx - 86, matY + 6, 36); itemShadow(ctx, cx + 78, matY + 10, 40);
    A.drawFoodDeluxe(ctx, 'eggcake', cx - 86, matY - 12, 0.86);
    foodBowl(ctx, cx + 80, matY - 2);
  }
  function playStation(ctx, cx, matY) {
    ctx.fillStyle = TH.playMatEdge; el(ctx, cx, matY + 8, 168, 50); ctx.fill();
    ctx.fillStyle = TH.playMat; el(ctx, cx, matY, 156, 44); ctx.fill();
    itemShadow(ctx, cx - 84, matY + 6, 34); itemShadow(ctx, cx + 80, matY + 8, 34);
    TOY.drawToy(ctx, 'doll', cx - 84, matY - 12, 0.86);
    TOY.drawToy(ctx, 'teaset', cx + 80, matY - 4, 0.9);
  }

  // ── 設定面板的導覽卡 ─────────────────────────────────
  function navCard(ctx, x, y, w, h, bg, line, title, sub, icon) {
    ctx.save();
    ctx.shadowColor = 'rgba(150,100,60,0.14)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
    ctx.fillStyle = bg; rr(ctx, x, y, w, h, 22); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; el(ctx, x + 50, y + h / 2, 34, 34); ctx.fill();
    icon(ctx, x + 50, y + h / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '30px ' + FONT; ctx.fillStyle = line;
    ctx.fillText(title, x + 100, y + h / 2 - 13);
    ctx.font = '21px ' + FONT; ctx.fillStyle = 'rgba(120,95,70,0.8)';
    ctx.fillText(sub, x + 100, y + h / 2 + 17);
  }
  const ICON = {
    eat: function (ctx, x, y) { A.drawFood(ctx, 'eggcake', x - 9, y - 2, 0.5); A.drawFood(ctx, 'boba', x + 11, y, 0.42); },
    play: function (ctx, x, y) { TOY.drawToy(ctx, 'doll', x, y + 2, 0.46); },
    decor: function (ctx, x, y) {
      ctx.fillStyle = '#E7B6BE'; rr(ctx, x - 16, y - 4, 32, 16, 5); ctx.fill();
      ctx.fillStyle = '#D89AA4'; rr(ctx, x - 16, y - 14, 12, 14, 4); ctx.fill(); rr(ctx, x + 4, y - 14, 12, 14, 4); ctx.fill();
    },
    parent: function (ctx, x, y) {
      ctx.fillStyle = '#B79B7E'; el(ctx, x, y - 8, 8, 8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 13, y + 13); ctx.quadraticCurveTo(x, y - 2, x + 13, y + 13); ctx.fill();
    }
  };
  function zoneTag(ctx, cx, cy, text, fg, bg) { A.pill(ctx, cx, cy, text, fg, bg, 22); }

  // ── 共用:左側設定面板(A 與 合併版共用)──────────────
  function drawSidebarPanel(ctx, t, PW, title, sub) {
    ctx.save();
    ctx.shadowColor = 'rgba(120,80,50,0.18)'; ctx.shadowBlur = 26; ctx.shadowOffsetX = 6;
    ctx.fillStyle = '#FFFBF3'; rr(ctx, -40, 0, PW + 40, H, 0); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(214,180,150,0.10)'; ctx.fillRect(0, 0, PW, H);
    // 標頭:兔兔頭像 + 名稱
    ctx.save(); ctx.beginPath(); el(ctx, 92, 96, 48, 48); ctx.clip();
    ctx.fillStyle = '#FCEFE6'; ctx.fillRect(40, 44, 104, 104);
    petAt(ctx, t, 92, 150, 0.36, 'idle'); ctx.restore();
    ctx.strokeStyle = '#F2D8C0'; ctx.lineWidth = 4; el(ctx, 92, 96, 48, 48); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '38px ' + FONT; ctx.fillStyle = TH.deep; ctx.fillText(title, 160, 80);
    ctx.font = '21px ' + FONT; ctx.fillStyle = 'rgba(120,95,70,0.8)'; ctx.fillText(sub, 160, 116);
    // 導覽卡
    const cx0 = 30, cw = PW - 60;
    navCard(ctx, cx0, 184, cw, 96, '#FCEED6', '#C2791E', '數學餐廳', '解題吃大餐', ICON.eat);
    navCard(ctx, cx0, 296, cw, 96, '#E9F4E3', '#4E8A5A', '英文遊戲間', '玩遊戲拿玩具', ICON.play);
    navCard(ctx, cx0, 408, cw, 96, '#F6EAF0', '#B06A86', '換擺設', '布置小窩', ICON.decor);
    // 底部家長區
    ctx.fillStyle = '#FFFFFF'; rr(ctx, cx0, H - 96, cw, 60, 18); ctx.fill();
    ctx.strokeStyle = '#EFE0CE'; ctx.lineWidth = 2; rr(ctx, cx0, H - 96, cw, 60, 18); ctx.stroke();
    ICON.parent(ctx, cx0 + 40, H - 66);
    ctx.textAlign = 'left'; ctx.font = '24px ' + FONT; ctx.fillStyle = '#9A7B5C';
    ctx.fillText('家長區', cx0 + 76, H - 64);
  }

  // ── 共用:房間內部(後牆 + 地板 + 窗 + 掛畫),回傳 wallB ──
  function drawRoomInterior(ctx, ix, iy, iw, ih, radius) {
    const wallB = iy + ih * 0.47;
    ctx.save();
    ctx.beginPath(); rr(ctx, ix, iy, iw, ih, radius || 16); ctx.clip();
    ctx.fillStyle = TH.wall; ctx.fillRect(ix, iy, iw, ih);
    wallpaper(ctx, ix, iy, iw, wallB - iy, TH.dot);
    warmLight(ctx, ix + iw / 2, iy + 20, 560, ix, iy, iw, ih);
    windowBox(ctx, ix + iw * 0.56, iy + 34, 210, 134);
    picture(ctx, ix + 54, iy + 50, 116, 96);
    // 地板
    const vx = ix + iw / 2;
    ctx.fillStyle = TH.floor;
    ctx.beginPath();
    ctx.moveTo(ix + 46, wallB); ctx.lineTo(ix + iw - 46, wallB); ctx.lineTo(ix + iw, iy + ih); ctx.lineTo(ix, iy + ih); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); floorboards(ctx, ix + 46, ix + iw - 46, wallB, iy + ih, vx); ctx.restore();
    // 牆角邊界(踢腳板)
    ctx.fillStyle = TH.floorDark;
    ctx.beginPath(); ctx.moveTo(ix, iy + ih); ctx.lineTo(ix + 46, wallB); ctx.lineTo(ix + 46, wallB + 12); ctx.lineTo(ix, iy + ih + 12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(ix + iw, iy + ih); ctx.lineTo(ix + iw - 46, wallB); ctx.lineTo(ix + iw - 46, wallB + 12); ctx.lineTo(ix + iw, iy + ih + 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(180,140,95,0.42)'; ctx.fillRect(ix + 46, wallB - 3, iw - 92, 7);
    ctx.restore();
    return wallB;
  }

  // ── 共用:屋頂 + 厚木框(B 與 合併版共用),回傳內部 box ──
  function drawRoofFrame(ctx, fx, fy, fw, fh, title) {
    // 屋頂
    ctx.fillStyle = '#F2BD96';
    ctx.beginPath(); ctx.moveTo(fx - 8, fy + 10); ctx.lineTo(fx + fw / 2, fy - 86); ctx.lineTo(fx + fw + 8, fy + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#E9A878'; ctx.fillRect(fx - 8, fy - 2, fw + 16, 14);
    // 標題牌
    ctx.save();
    ctx.shadowColor = 'rgba(150,100,60,0.18)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#FFF6E9'; rr(ctx, fx + fw / 2 - 122, fy - 70, 244, 50, 25); ctx.fill();
    ctx.restore();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '38px ' + FONT; ctx.fillStyle = '#A85A3C'; ctx.fillText(title, fx + fw / 2, fy - 44);
    // 厚木框
    ctx.save();
    ctx.shadowColor = 'rgba(120,80,50,0.22)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    ctx.fillStyle = '#D9A86E'; rr(ctx, fx, fy, fw, fh, 32); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#C99355'; rr(ctx, fx, fy, fw, fh, 32); ctx.fill();
    const m = 22;
    return { ix: fx + m, iy: fy + m, iw: fw - m * 2, ih: fh - m * 2 };
  }

  // ════════════════════════════════════════════════════
  // ★ 合併版 A+B:左側選單 + 屋頂 + 厚木框房間
  // ════════════════════════════════════════════════════
  function hybrid(ctx, t) {
    ctx.fillStyle = '#EFE3D2'; ctx.fillRect(0, 0, W, H);
    const PW = 384;
    // —— 右側:屋頂 + 厚木框房間 ——
    const fx = PW + 26, fy = 158, fw = W - fx - 30, fh = H - fy - 34;
    const box = drawRoofFrame(ctx, fx, fy, fw, fh, '兔兔的房間');
    const wallB = drawRoomInterior(ctx, box.ix, box.iy, box.iw, box.ih, 14);
    // —— 食物區 / 遊戲區 ——
    ctx.save();
    ctx.beginPath(); rr(ctx, box.ix, box.iy, box.iw, box.ih, 14); ctx.clip();
    const foodX = box.ix + box.iw * 0.29, playX = box.ix + box.iw * 0.71;
    const matY = box.iy + box.ih * 0.74;          // 物件落點(偏後)
    const frontY = matY + 86;                      // 兔兔站立前緣
    foodStation(ctx, foodX, matY);
    playStation(ctx, playX, matY);
    // 區域標籤(放在地板後緣,不會被兔兔蓋住)
    zoneTag(ctx, foodX, wallB + 28, '食物區', TH.foodTag, TH.foodTagBg);
    zoneTag(ctx, playX, wallB + 28, '遊戲區', TH.playTag, TH.playTagBg);
    // 兔兔:停在物件「前面」走來走去
    const life = rabbitLife(t, foodX, playX);
    petAt(ctx, t, life.x, frontY + life.hop, 0.46, life.mode);
    ctx.restore();
    // —— 左側設定面板 ——
    drawSidebarPanel(ctx, t, PW, '兔兔', '今天想做什麼呢?');
  }

  // ════════════════════════════════════════════════════
  // 方向 A — 側欄控制台:左邊設定,右邊正面 2.5D 房間(無框)
  // ════════════════════════════════════════════════════
  function sidebar(ctx, t) {
    ctx.fillStyle = '#F3E7D6'; ctx.fillRect(0, 0, W, H);
    const PW = 384, rx = PW, rw = W - PW, wallBot = 540;
    ctx.save();
    ctx.beginPath(); ctx.rect(rx, 0, rw, H); ctx.clip();
    ctx.fillStyle = TH.wall; ctx.fillRect(rx, 0, rw, wallBot);
    wallpaper(ctx, rx, 0, rw, wallBot, TH.dot);
    warmLight(ctx, rx + rw / 2, 70, 560, rx, 0, rw, wallBot);
    windowBox(ctx, rx + rw * 0.60, 120, 230, 150);
    picture(ctx, rx + 64, 150, 124, 100);
    const vx = rx + rw / 2;
    ctx.fillStyle = TH.floor;
    ctx.beginPath();
    ctx.moveTo(rx + 64, wallBot); ctx.lineTo(W - 64, wallBot); ctx.lineTo(W, H); ctx.lineTo(rx, H); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); floorboards(ctx, rx + 64, W - 64, wallBot, H, vx); ctx.restore();
    ctx.fillStyle = TH.floorDark;
    ctx.beginPath(); ctx.moveTo(rx, H); ctx.lineTo(rx + 64, wallBot); ctx.lineTo(rx + 64, wallBot + 14); ctx.lineTo(rx, H + 14); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W, H); ctx.lineTo(W - 64, wallBot); ctx.lineTo(W - 64, wallBot + 14); ctx.lineTo(W, H + 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(180,140,95,0.45)'; ctx.fillRect(rx + 64, wallBot - 3, rw - 128, 7);
    const foodX = rx + rw * 0.30, playX = rx + rw * 0.72, matY = 672, frontY = matY + 86;
    foodStation(ctx, foodX, matY);
    playStation(ctx, playX, matY);
    zoneTag(ctx, foodX, wallBot + 30, '食物區', TH.foodTag, TH.foodTagBg);
    zoneTag(ctx, playX, wallBot + 30, '遊戲區', TH.playTag, TH.playTagBg);
    const life = rabbitLife(t, foodX, playX);
    petAt(ctx, t, life.x, frontY + life.hop, 0.46, life.mode);
    ctx.restore();
    drawSidebarPanel(ctx, t, PW, '兔兔的房間', '今天想做什麼呢?');
  }

  // ════════════════════════════════════════════════════
  // 方向 B — 剖面娃娃屋:上方設定(屋頂橫條),下方一整個房間箱
  // ════════════════════════════════════════════════════
  function dollhouse(ctx, t) {
    ctx.fillStyle = '#EFE3D2'; ctx.fillRect(0, 0, W, H);
    // 屋頂 + 標題
    ctx.fillStyle = '#F2BD96';
    ctx.beginPath(); ctx.moveTo(40, 150); ctx.lineTo(W / 2, 44); ctx.lineTo(W - 40, 150); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#E9A878'; ctx.fillRect(40, 138, W - 80, 14);
    ctx.save();
    ctx.shadowColor = 'rgba(150,100,60,0.18)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#FFF6E9'; rr(ctx, W / 2 - 118, 74, 236, 50, 25); ctx.fill();
    ctx.restore();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '38px ' + FONT; ctx.fillStyle = '#A85A3C'; ctx.fillText('兔兔的家', W / 2, 100);
    // 設定按鈕橫排
    const labels = [['數學餐廳', '#C2791E', '#FCEED6', ICON.eat], ['英文遊戲間', '#4E8A5A', '#E9F4E3', ICON.play],
      ['換擺設', '#B06A86', '#F6EAF0', ICON.decor], ['家長區', '#9A7B5C', '#FFFFFF', ICON.parent]];
    const bw = 250, gap = 18, bx0 = (W - (bw * 4 + gap * 3)) / 2, by = 170, bh = 74;
    labels.forEach(function (L, i) {
      const x = bx0 + i * (bw + gap);
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.16)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
      ctx.fillStyle = L[2]; rr(ctx, x, by, bw, bh, 22); ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; el(ctx, x + 44, by + bh / 2, 28, 28); ctx.fill();
      L[3](ctx, x + 44, by + bh / 2);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '27px ' + FONT; ctx.fillStyle = L[1];
      ctx.fillText(L[0], x + 84, by + bh / 2);
    });
    // 房間箱
    const box = drawRoofFrameBoxOnly(ctx, 60, 282, W - 120, H - 282 - 40);
    const wallB = drawRoomInterior(ctx, box.ix, box.iy, box.iw, box.ih, 14);
    ctx.save();
    ctx.beginPath(); rr(ctx, box.ix, box.iy, box.iw, box.ih, 14); ctx.clip();
    const foodX = box.ix + box.iw * 0.28, playX = box.ix + box.iw * 0.72;
    const matY = box.iy + box.ih * 0.76, frontY = matY + 78;
    foodStation(ctx, foodX, matY);
    playStation(ctx, playX, matY);
    zoneTag(ctx, foodX, wallB + 28, '食物區', TH.foodTag, TH.foodTagBg);
    zoneTag(ctx, playX, wallB + 28, '遊戲區', TH.playTag, TH.playTagBg);
    const life = rabbitLife(t, foodX, playX);
    petAt(ctx, t, life.x, frontY + life.hop, 0.44, life.mode);
    ctx.restore();
  }
  // 只畫厚木框(無屋頂),回傳內部 box
  function drawRoofFrameBoxOnly(ctx, fx, fy, fw, fh) {
    ctx.save();
    ctx.shadowColor = 'rgba(120,80,50,0.22)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    ctx.fillStyle = '#D9A86E'; rr(ctx, fx, fy, fw, fh, 34); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#C99355'; rr(ctx, fx, fy, fw, fh, 34); ctx.fill();
    const m = 22;
    return { ix: fx + m, iy: fy + m, iw: fw - m * 2, ih: fh - m * 2 };
  }

  // ════════════════════════════════════════════════════
  // 換擺設(新流程):食物三格 + 玩具三格,慢慢挑,按「確定佈置」才套用
  // ════════════════════════════════════════════════════
  const FOOD_NAMES = { eggcake: '雞蛋糕', boba: '珍奶', sushi: '壽司', cake: '蛋糕', apple: '蘋果', strawberry: '草莓', orange: '橘子', banana: '香蕉', pizza: '披薩', bao: '小籠包', burger: '漢堡', fries: '薯條', scoop: '冰淇淋', sundae: '聖代' };
  const TOY_NAMES = { doll: '娃娃', teaset: '茶具組', kitchen: '玩具廚房', dollbed: '娃娃床', basket: '野餐籃', teddy: '布偶熊', dollhouse: '玩具屋', wand: '魔法棒', dress: '公主裙', carousel: '旋轉木馬' };

  function slotBox(ctx, cx, cy, w, h, active, accent, activeBg) {
    ctx.save();
    if (active) { ctx.shadowColor = accent; ctx.shadowBlur = 18; }
    ctx.fillStyle = active ? activeBg : '#FFFCF6';
    rr(ctx, cx - w / 2, cy - h / 2, w, h, 18); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = active ? accent : '#EFE0CE'; ctx.lineWidth = active ? 4 : 2.5;
    rr(ctx, cx - w / 2, cy - h / 2, w, h, 18); ctx.stroke();
  }
  function plusMark(ctx, cx, cy, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 13, cy); ctx.lineTo(cx + 13, cy); ctx.moveTo(cx, cy - 13); ctx.lineTo(cx, cy + 13); ctx.stroke();
  }
  function check(ctx, cx, cy, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 9, cy); ctx.lineTo(cx - 2, cy + 8); ctx.lineTo(cx + 11, cy - 9); ctx.stroke();
  }

  function decorate(ctx, t) {
    ctx.fillStyle = '#FBF1E2'; ctx.fillRect(0, 0, W, H);
    wallpaper(ctx, 0, 0, W, H, 'rgba(214,178,146,0.12)');
    warmLight(ctx, W / 2, 40, 640, 0, 0, W, H);
    // 標題
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '46px ' + FONT;
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText('布置兔兔的家', W / 2, 60);
    ctx.fillStyle = '#8A5560'; ctx.fillText('布置兔兔的家', W / 2, 56);
    A.pill(ctx, W / 2, 110, '慢慢挑 ── 食物三格、玩具三格,選好再按「確定佈置」', '#B07A52', 'rgba(255,247,228,0.96)', 21);

    // ── 上方:六格擺設盤 ──
    ctx.save();
    ctx.shadowColor = 'rgba(150,100,60,0.12)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#FFFCF6'; rr(ctx, 60, 150, W - 120, 158, 26); ctx.fill();
    ctx.restore();
    // 分組標籤(置中在各組上方)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '24px ' + FONT;
    ctx.fillStyle = TH.foodTag; ctx.fillText('食物 ×3', 270, 182);
    ctx.fillStyle = TH.playTag; ctx.fillText('玩具 ×3', 810, 182);
    // 食物三格(第1格 active)
    const fSlots = [{ k: 'eggcake' }, { k: 'boba' }, { k: null }];
    const fcx = [158, 270, 382], sY = 244, sW = 100, sH = 100;
    fSlots.forEach(function (s, i) {
      const active = i === 0;
      slotBox(ctx, fcx[i], sY, sW, sH, active, '#F2BD58', '#FFF3DC');
      if (s.k) A.drawFood(ctx, s.k, fcx[i], sY, 0.84);
      else plusMark(ctx, fcx[i], sY, 'rgba(194,121,30,0.5)');
      if (active) A.pill(ctx, fcx[i], sY - 64, '正在選這格', '#C2791E', '#FFF3DC', 15);
    });
    // 玩具三格
    const tSlots = [{ k: 'doll' }, { k: null }, { k: null }];
    const tcx = [698, 810, 922];
    tSlots.forEach(function (s, i) {
      slotBox(ctx, tcx[i], sY, sW, sH, false, '#6FA86A', '#EEF6EC');
      if (s.k) TOY.drawToy(ctx, s.k, tcx[i], sY, 0.82);
      else plusMark(ctx, tcx[i], sY, 'rgba(78,138,90,0.45)');
    });

    // ── 中段:目前在挑「食物」── 分頁 + 可選清單 ──
    A.pill(ctx, 150, 348, '食物', '#FFFFFF', '#C2894C', 22);
    A.pill(ctx, 270, 348, '玩具', '#9A7B5C', 'rgba(255,255,255,0.9)', 22);
    ctx.textAlign = 'left'; ctx.font = '22px ' + FONT; ctx.fillStyle = '#9A7060';
    ctx.fillText('點食物 → 放進上面那一格(可以一直換,不會跳走)', 330, 348);

    // 可選食物格子(7 欄 × 2 列)
    const items = ['eggcake', 'boba', 'sushi', 'cake', 'apple', 'strawberry', 'orange', 'banana', 'pizza', 'bao', 'burger', 'fries', 'scoop', 'sundae'];
    const placed = { eggcake: true, boba: true };   // 目前已擺上(展示中)
    const cols = 7, cw = 148, ch = 116, gap = 12;
    const gridW = cols * cw + (cols - 1) * gap, gx0 = (W - gridW) / 2, gy0 = 388;
    items.forEach(function (key, i) {
      const c = i % cols, r = Math.floor(i / cols);
      const x = gx0 + c * (cw + gap), y = gy0 + r * (ch + gap);
      const sel = placed[key];
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.12)'; ctx.shadowBlur = 9; ctx.shadowOffsetY = 3;
      ctx.fillStyle = sel ? '#FFF3DC' : '#FFFCF6'; rr(ctx, x, y, cw, ch, 18); ctx.fill();
      ctx.restore();
      if (sel) { ctx.strokeStyle = '#F2BD58'; ctx.lineWidth = 4; rr(ctx, x, y, cw, ch, 18); ctx.stroke(); }
      A.drawFood(ctx, key, x + cw / 2, y + ch / 2 - 12, 0.84);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '21px ' + FONT; ctx.fillStyle = '#7A5C3E';
      ctx.fillText(FOOD_NAMES[key] || '', x + cw / 2, y + ch - 22);
      if (sel) {
        ctx.fillStyle = '#F2BD58'; el(ctx, x + cw - 22, y + 22, 15, 15); ctx.fill();
        check(ctx, x + cw - 22, y + 22, '#FFFFFF');
      }
    });

    // ── 底部列:取消 / 確定佈置(大、明顯)──
    ctx.save();
    ctx.fillStyle = '#F2E6D4'; rr(ctx, 60, H - 96, 200, 64, 20); ctx.fill();
    ctx.restore();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '26px ' + FONT; ctx.fillStyle = '#9A7B5C';
    ctx.fillText('取消', 160, H - 64);
    // 確定佈置
    const bw = 360, bx = W - 60 - bw, by = H - 100, bh = 72;
    const pulse = 1 + Math.sin(t * 2.4) * 0.012;
    ctx.save();
    ctx.translate(bx + bw / 2, by + bh / 2); ctx.scale(pulse, pulse); ctx.translate(-(bx + bw / 2), -(by + bh / 2));
    ctx.shadowColor = 'rgba(200,120,40,0.35)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#F2A85C'; rr(ctx, bx, by, bw, bh, 26); ctx.fill();
    ctx.restore();
    A.drawIcon(ctx, 'check', bx + 64, by + bh / 2, 1.0, '#FFFFFF');
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '32px ' + FONT; ctx.fillStyle = '#FFFFFF';
    ctx.fillText('確定佈置,回房間', bx + 100, by + bh / 2 + 1);
  }

  window.RoomScenes = { hybrid: hybrid, decorate: decorate, sidebar: sidebar, dollhouse: dollhouse };
})();
