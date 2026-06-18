// room.js — 改版「真正的房間」+「換擺設(先選完再確定)」
// 載入順序在 screens.js 之後 → 以同名重新註冊 'room' 與 'shelf',覆蓋舊版。
// 房間:左側設定欄(A)+ 屋頂與厚木框(B)+ 食物區/遊戲區。寵物自己走來走去,
// 停在食物/玩具「前面」吃與玩(無互動)。換擺設:六格慢慢挑,按「確定佈置」才套用。
(function () {
  const PLS = window.PLS, A = window.PLS_ART, P = window.PLS_PETS, TOY = window.PLS_TOY;
  const CFG = window.PLS_CONFIG, ST = window.PLS_STORE;
  const W = PLS.W, H = PLS.H, FONT = A.FONT, TAU = Math.PI * 2;

  function el(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function pickTalk(list) { return list[Math.floor(Math.random() * list.length)]; }

  // 固定地墊色(兩隻寵物共用,維持「食物=暖橘 / 遊戲=綠」的辨識)
  const MAT = {
    floor: '#EAD7BE', floorDark: '#DFC8A8', floorLine: 'rgba(180,140,95,0.30)',
    foodMat: '#F7D9BE', foodMatEdge: '#EFC59E', foodTag: '#C2791E', foodTagBg: 'rgba(255,243,224,0.96)',
    playMat: '#CFE6D6', playMatEdge: '#B6D7C0', playTag: '#4E8A5A', playTagBg: 'rgba(233,246,235,0.96)'
  };

  // ── 待機:寵物自己過生活(走→吃→走→玩,循環)──────────
  function smooth(a, b, x) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
  function petLife(t, fx, px) {
    const P0 = 18, ph = t % P0;
    let x, hop = 0, mode;
    if (ph < 5) { x = fx; mode = 'chew'; }
    else if (ph < 9) { const k = smooth(5, 9, ph); x = fx + (px - fx) * k; mode = 'idle'; hop = -Math.abs(Math.sin((ph - 5) * 6.2)) * 18; }
    else if (ph < 14) { x = px; mode = 'happy'; }
    else { const k = smooth(14, 18, ph); x = px + (fx - px) * k; mode = 'idle'; hop = -Math.abs(Math.sin((ph - 14) * 6.2)) * 18; }
    return { x: x, hop: hop, mode: mode };
  }
  function petAt(ctx, petId, t, x, footY, s, mode) {
    ctx.save(); ctx.translate(x, footY - 140 * s); ctx.scale(s, s);
    P.draw(petId, ctx, t, { mode: mode }); ctx.restore();
  }

  // ── 共用美術 ─────────────────────────────────────────
  function wallpaper(ctx, x, y, w, h, dot) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = dot;
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
    ctx.strokeStyle = '#E6CBA6'; ctx.lineWidth = 5; rr(ctx, x, y, w, h, 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
    ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
  }
  function picture(ctx, x, y, w, h) {
    ctx.fillStyle = '#FBF6EC'; rr(ctx, x, y, w, h, 12); ctx.fill();
    ctx.fillStyle = '#F4C9D0'; rr(ctx, x + 10, y + 10, w - 20, h - 30, 6); ctx.fill();
    ctx.fillStyle = '#9FCBB2'; el(ctx, x + w / 2, y + h - 16, w * 0.36, 12); ctx.fill();
  }
  function floorboards(ctx, x0, x1, yTop, yBot, vx) {
    ctx.strokeStyle = MAT.floorLine; ctx.lineWidth = 2;
    for (let i = -3; i <= 9; i++) {
      const bx = x0 + (x1 - x0) * (i / 6);
      ctx.beginPath(); ctx.moveTo(bx, yTop); ctx.lineTo(bx + (bx - vx) * 0.55, yBot); ctx.stroke();
    }
  }
  function itemShadow(ctx, cx, cy, rx) { ctx.fillStyle = 'rgba(150,110,70,0.14)'; el(ctx, cx, cy, rx, rx * 0.26); ctx.fill(); }

  // 房間內部(後牆 + 地板 + 窗 + 掛畫),回傳 wallB
  function roomInterior(ctx, ix, iy, iw, ih, radius, wall, dot) {
    const wallB = iy + ih * 0.47;
    ctx.save(); ctx.beginPath(); rr(ctx, ix, iy, iw, ih, radius); ctx.clip();
    ctx.fillStyle = wall; ctx.fillRect(ix, iy, iw, ih);
    wallpaper(ctx, ix, iy, iw, wallB - iy, dot);
    warmLight(ctx, ix + iw / 2, iy + 20, 560, ix, iy, iw, ih);
    windowBox(ctx, ix + iw * 0.56, iy + 34, 210, 134);
    picture(ctx, ix + 54, iy + 50, 116, 96);
    const vx = ix + iw / 2;
    ctx.fillStyle = MAT.floor;
    ctx.beginPath();
    ctx.moveTo(ix + 46, wallB); ctx.lineTo(ix + iw - 46, wallB); ctx.lineTo(ix + iw, iy + ih); ctx.lineTo(ix, iy + ih); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); floorboards(ctx, ix + 46, ix + iw - 46, wallB, iy + ih, vx); ctx.restore();
    ctx.fillStyle = MAT.floorDark;
    ctx.beginPath(); ctx.moveTo(ix, iy + ih); ctx.lineTo(ix + 46, wallB); ctx.lineTo(ix + 46, wallB + 12); ctx.lineTo(ix, iy + ih + 12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(ix + iw, iy + ih); ctx.lineTo(ix + iw - 46, wallB); ctx.lineTo(ix + iw - 46, wallB + 12); ctx.lineTo(ix + iw, iy + ih + 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(180,140,95,0.42)'; ctx.fillRect(ix + 46, wallB - 3, iw - 92, 7);
    ctx.restore();
    return wallB;
  }
  // 屋頂 + 厚木框,回傳內部 box
  function roofFrame(ctx, fx, fy, fw, fh, title) {
    ctx.fillStyle = '#F2BD96';
    ctx.beginPath(); ctx.moveTo(fx - 8, fy + 10); ctx.lineTo(fx + fw / 2, fy - 86); ctx.lineTo(fx + fw + 8, fy + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#E9A878'; ctx.fillRect(fx - 8, fy - 2, fw + 16, 14);
    ctx.save();
    ctx.shadowColor = 'rgba(150,100,60,0.18)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#FFF6E9'; rr(ctx, fx + fw / 2 - 132, fy - 70, 264, 50, 25); ctx.fill();
    ctx.restore();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '36px ' + FONT; ctx.fillStyle = '#A85A3C'; ctx.fillText(title, fx + fw / 2, fy - 44);
    ctx.save();
    ctx.shadowColor = 'rgba(120,80,50,0.22)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    ctx.fillStyle = '#D9A86E'; rr(ctx, fx, fy, fw, fh, 32); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#C99355'; rr(ctx, fx, fy, fw, fh, 32); ctx.fill();
    const m = 22;
    return { ix: fx + m, iy: fy + m, iw: fw - m * 2, ih: fh - m * 2 };
  }
  // 一個區(食物或遊戲):地墊 + 三件擺設(分散兩側,中間留給寵物站前面)
  function station(ctx, cx, matY, kind, slots) {
    ctx.fillStyle = kind === 'food' ? MAT.foodMatEdge : MAT.playMatEdge; el(ctx, cx, matY + 9, 176, 52); ctx.fill();
    ctx.fillStyle = kind === 'food' ? MAT.foodMat : MAT.playMat; el(ctx, cx, matY, 164, 46); ctx.fill();
    const ox = [-104, 104, 0];      // 兩側先擺,中間最後(中間那件在寵物後上方)
    ox.forEach(function (dx, n) {
      const s = slots[n], x = cx + dx;
      if (s && s.key) {
        itemShadow(ctx, x, matY + 9, 36);
        if (kind === 'food') { if (s.deluxe) A.drawFoodDeluxe(ctx, s.key, x, matY - 10, 0.84); else A.drawFood(ctx, s.key, x, matY - 10, 0.9); }
        else { if (s.deluxe) TOY.drawToyDeluxe(ctx, s.key, x, matY - 8, 0.84); else TOY.drawToy(ctx, s.key, x, matY - 8, 0.88); }
      } else {
        ctx.save(); ctx.strokeStyle = kind === 'food' ? 'rgba(195,155,100,0.32)' : 'rgba(110,170,140,0.32)';
        ctx.lineWidth = 2.5; ctx.setLineDash([5, 8]); el(ctx, x, matY - 6, 26, 20); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      }
    });
  }

  // ── 設定欄(左)─────────────────────────────────────
  const PW = 384;
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
    },
    abc: function (ctx, x, y) {
      ctx.fillStyle = '#5E8A86'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 27px ' + FONT; ctx.fillText('Aa', x, y + 1);
    },
    gift: function (ctx, x, y) {
      ctx.fillStyle = '#E79A92'; rr(ctx, x - 14, y - 5, 28, 20, 4); ctx.fill();
      ctx.fillStyle = '#D8847B'; rr(ctx, x - 15, y - 10, 30, 8, 3); ctx.fill();
      ctx.fillStyle = '#F0C24E'; ctx.fillRect(x - 2.5, y - 10, 5, 25);
      ctx.fillStyle = '#F0C24E'; el(ctx, x - 6, y - 13, 6, 4); ctx.fill(); el(ctx, x + 6, y - 13, 6, 4); ctx.fill();
    }
  };
  function navCard(ctx, x, y, w, h, bg, line, title, sub, icon) {
    ctx.save();
    ctx.shadowColor = 'rgba(150,100,60,0.14)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
    ctx.fillStyle = bg; rr(ctx, x, y, w, h, 22); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; el(ctx, x + 50, y + h / 2, 34, 34); ctx.fill();
    icon(ctx, x + 50, y + h / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '30px ' + FONT; ctx.fillStyle = line; ctx.fillText(title, x + 100, y + h / 2 - 13);
    ctx.font = '20px ' + FONT; ctx.fillStyle = 'rgba(120,95,70,0.82)'; ctx.fillText(sub, x + 100, y + h / 2 + 17);
  }

  // ════════════════════════════════════════════════════
  // 寵物房間(改版)
  // ════════════════════════════════════════════════════
  const room = {
    petId: 'rabbit',
    enter: function (params) {
      const self = this;
      this.petId = params.pet || 'rabbit';
      const pid = this.petId;
      // 回首頁
      PLS.addButton({
        x: 24, y: 26, w: 58, h: 58,
        draw: function (ctx) {
          ctx.fillStyle = '#FFFFFF'; el(ctx, 53, 55, 29, 29); ctx.fill();
          ctx.strokeStyle = '#F0E0CE'; ctx.lineWidth = 2; el(ctx, 53, 55, 29, 29); ctx.stroke();
          A.drawIcon(ctx, 'back', 53, 55, 0.92, '#A07B58');
        },
        onTap: function () { PLS.go('home', {}); }
      });
      // 主選單卡片(資料驅動;隱藏獎品功能時自動少一張並上移)
      const NAV = [
        { go: 'map',  bg: '#FCEED6', line: '#C2791E', icon: ICON.eat,  title: '數學餐廳',
          sub: function () { const r = ST.remainToday(ST.load(pid), 'math'); return ST.isTest() ? '測試版 · 不限次數' : r > 0 ? '今天還可以吃 ' + r + ' 次大餐' : '今天吃飽了,可以練習'; } },
        { go: 'emap', bg: '#E9F4E3', line: '#4E8A5A', icon: ICON.play, title: '英文遊戲間',
          sub: function () { const r = ST.remainToday(ST.load(pid), 'english'); return ST.isTest() ? '測試版 · 不限次數' : r > 0 ? '今天還可以拿 ' + r + ' 個玩具' : '今天玩具拿夠了,可以練習'; } }
      ];
      NAV.push({ go: 'epractice', bg: '#E5F0EF', line: '#3F8A84', icon: ICON.abc,   title: '字母手寫練習', sub: function () { return '描字母 · 看筆順'; } });
      NAV.push({ go: 'shelf',     bg: '#F6EAF0', line: '#B06A86', icon: ICON.decor, title: '換擺設',       sub: function () { return '布置小窩'; } });
      const NTOP = 168, NSTEP = 98, NH = 86;
      NAV.forEach(function (it, i) {
        const y = NTOP + i * NSTEP;
        PLS.addButton({
          x: 30, y: y, w: PW - 60, h: NH,
          draw: function (ctx) { navCard(ctx, 30, y, PW - 60, NH, it.bg, it.line, it.title, it.sub(), it.icon); },
          onTap: function () { PLS.go(it.go, { pet: pid }); }
        });
      });
      // 測試版:預覽獎勵
      if (ST.isTest()) {
        PLS.addButton({
          x: 30, y: H - 168, w: PW - 60, h: 50,
          draw: function (ctx) {
            ctx.globalAlpha = 0.92;
            A.pill(ctx, PW / 2, H - 143, '🎁 預覽獎勵', '#C2591E', 'rgba(255,240,210,0.95)', 21);
            ctx.globalAlpha = 1;
          },
          onTap: function () { PLS.go('rewardPreview', { pet: pid }); }
        });
      }
      // 家長區
      PLS.addButton({
        x: 30, y: H - 96, w: PW - 60, h: 60,
        draw: function (ctx) {
          ctx.fillStyle = '#FFFFFF'; rr(ctx, 30, H - 96, PW - 60, 60, 18); ctx.fill();
          ctx.strokeStyle = '#EFE0CE'; ctx.lineWidth = 2; rr(ctx, 30, H - 96, PW - 60, 60, 18); ctx.stroke();
          ICON.parent(ctx, 70, H - 66);
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '24px ' + FONT; ctx.fillStyle = '#9A7B5C';
          ctx.fillText('家長區', 106, H - 64);
        },
        onTap: function () { if (window.PLS_PARENT) window.PLS_PARENT.open(); }
      });
    },
    draw: function (ctx, t) {
      const pid = this.petId, th = CFG.pets[pid].theme;
      const d = ST.load(pid), name = d.name || CFG.pets[pid].name;
      ctx.fillStyle = '#EFE3D2'; ctx.fillRect(0, 0, W, H);

      // 右側:屋頂 + 厚木框房間
      const fx = PW + 26, fy = 158, fw = W - (PW + 26) - 30, fh = H - 158 - 34;
      const box = roofFrame(ctx, fx, fy, fw, fh, name + '的房間');
      const wallB = roomInterior(ctx, box.ix, box.iy, box.iw, box.ih, 14, th.wall, th.dot);
      ctx.save();
      ctx.beginPath(); rr(ctx, box.ix, box.iy, box.iw, box.ih, 14); ctx.clip();
      const foodX = box.ix + box.iw * 0.29, playX = box.ix + box.iw * 0.71;
      const matY = wallB + (box.iy + box.ih - wallB) * 0.40, frontY = box.iy + box.ih - 36;
      station(ctx, foodX, matY, 'food', d.home.foods || []);
      station(ctx, playX, matY, 'toy', d.home.toys || []);
      A.pill(ctx, foodX, wallB + 28, '食物區', MAT.foodTag, MAT.foodTagBg, 22);
      A.pill(ctx, playX, wallB + 28, '遊戲區', MAT.playTag, MAT.playTagBg, 22);
      const life = petLife(t, foodX, playX);
      petAt(ctx, pid, t, life.x, frontY + life.hop, 0.46, life.mode);
      ctx.restore();

      // 左側設定欄底板 + 標頭(按鈕由 enter 疊在上面)
      ctx.save();
      ctx.shadowColor = 'rgba(120,80,50,0.18)'; ctx.shadowBlur = 26; ctx.shadowOffsetX = 6;
      ctx.fillStyle = '#FFFBF3'; rr(ctx, -40, 0, PW + 40, H, 0); ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(214,180,150,0.10)'; ctx.fillRect(0, 0, PW, H);
      // 頭像
      ctx.save(); ctx.beginPath(); el(ctx, 132, 116, 42, 42); ctx.clip();
      ctx.fillStyle = '#FCEFE6'; ctx.fillRect(86, 66, 92, 100);
      petAt(ctx, pid, t, 132, 168, 0.32, 'idle'); ctx.restore();
      ctx.strokeStyle = '#F2D8C0'; ctx.lineWidth = 4; el(ctx, 132, 116, 42, 42); ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '34px ' + FONT; ctx.fillStyle = th.deep; ctx.fillText(name + '的房間', 190, 100);
      ctx.font = '20px ' + FONT; ctx.fillStyle = 'rgba(120,95,70,0.82)'; ctx.fillText('今天想做什麼呢?', 190, 134);
    }
  };

  PLS.register('room', room);
  window.PLS_ROOM2 = true;
})();
