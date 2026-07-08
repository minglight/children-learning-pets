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
  // rot:整隻旋轉角度(開心轉圈用),以身體中心為軸
  function petAt(ctx, petId, t, x, footY, s, mode, stage, rot) {
    ctx.save(); ctx.translate(x, footY - 140 * s); ctx.scale(s, s);
    if (rot) { ctx.translate(0, 20); ctx.rotate(rot); ctx.translate(0, -20); }
    P.draw(petId, ctx, t, { mode: mode, stage: stage }); ctx.restore();
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
  // v4 電子雞化:食物籃/玩具箱(背包)、餵食/陪玩動畫、成長條、升階慶祝、摸寵物。
  // ════════════════════════════════════════════════════
  const room = {
    petId: 'rabbit',
    enter: function (params) {
      const self = this;
      this.petId = params.pet || 'rabbit';
      const pid = this.petId;
      // 互動狀態
      this.tray = null;      // 開啟中的背包托盤:'food' | 'toy' | null
      this.act = null;       // 進行中的餵食/陪玩動畫
      this.grow = null;      // 升階慶祝 {t0, stage, stageZh}
      this.pat = null;       // 摸摸寵物 {t0}
      this.bubble = null;    // 寵物對話泡泡 {text, until}
      this._prDisp = null;   // 成長條顯示值(緩動)
      this._down = null;
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
          sub: function () { const r = ST.remainToday(ST.load(pid), 'math'); return ST.isTest() ? '測試版 · 不限次數' : r > 0 ? '今天還可以賺 ' + r + ' 次食物' : '今天賺夠了,可以練習'; } },
        { go: 'emap', bg: '#E9F4E3', line: '#4E8A5A', icon: ICON.play, title: '英文遊戲間',
          sub: function () { const r = ST.remainToday(ST.load(pid), 'english'); return ST.isTest() ? '測試版 · 不限次數' : r > 0 ? '今天還可以拿 ' + r + ' 個玩具' : '今天玩具拿夠了,可以練習'; } }
      ];
      NAV.push({ go: 'emenu', bg: '#E5F0EF', line: '#3F8A84', icon: ICON.abc,   title: '字母手寫練習', sub: function () { return '選字母 · 描字母 · 看筆順'; } });
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
    // ── 輸入:自己做 tap 偵測(避免和左欄按鈕打架,只處理房間框內的點擊)──
    pointer: function (phase, x, y) {
      if (phase === 'down') { this._down = { x: x, y: y }; return; }
      if (phase !== 'up' || !this._down) return;
      const dx = x - this._down.x, dy = y - this._down.y;
      this._down = null;
      if (dx * dx + dy * dy > 20 * 20) return;   // 拖曳不算點擊
      this.tap(x, y);
    },
    tap: function (x, y) {
      const B = this._box; if (!B || x < PW + 26) return;
      function inR(r) { return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
      // 升階慶祝:看 1.2 秒後點一下關閉
      if (this.grow) { if (PLS.t - this.grow.t0 > 1.2) { this.grow = null; PLS.sfx.tap(); } return; }
      if (this.act) return;                       // 餵食/陪玩動畫中不接受點擊
      if (this.tray) {
        if (inR(this._trayClose)) { this.tray = null; PLS.sfx.tap(); return; }
        if (inR(this._trayCTA)) { PLS.sfx.tap(); PLS.go(this.tray === 'food' ? 'map' : 'emap', { pet: this.petId }); return; }
        const cells = this._trayRects || [];
        for (let i = 0; i < cells.length; i++) {
          if (inR(cells[i])) {
            const kind = this.tray; this.tray = null;
            if (kind === 'food') this.startFeed(cells[i].key); else this.startPlay(cells[i].key);
            return;
          }
        }
        if (!inR(this._trayPanel)) this.tray = null;   // 點托盤外:收起
        return;
      }
      if (inR(this._foodBasket)) { this.tray = 'food'; PLS.sfx.tap(); return; }
      if (inR(this._toyBox)) { this.tray = 'toy'; PLS.sfx.tap(); return; }
      // 掛畫 → 收集圖鑑
      if (inR(this._picRect)) { PLS.sfx.tap(); PLS.go('dex', { pet: this.petId }); return; }
      // 許願泡泡 → 提示去哪一關賺這個食物
      if (inR(this._wishRect)) {
        PLS.sfx.tap();
        const w2 = this._wishInfo;
        this.say(w2 && w2.levelName ? ('在「' + w2.levelName + '」過關就能賺到喔!') : '解數學題就能賺到喔!');
        return;
      }
      // 點寵物:摸摸牠(純互動,不消耗任何東西)
      if (this._petX != null && Math.abs(x - this._petX) < 82 && y > (this._petY || 0) - 175 && y < (this._petY || 0) + 16) {
        this.pat = { t0: PLS.t };
        PLS.burst(this._petX, (this._petY || 0) - 130, 'small');
        PLS.sfx.tap();
        this.say(pickTalk(['嘿嘿,好舒服~', '最喜歡主人摸摸了!', '呀~好癢好癢!']));
      }
    },
    say: function (text) { this.bubble = { text: text, until: PLS.t + 2.4 }; },

    // ── 餵食 / 陪玩:點托盤的那一刻就先扣資料(store),動畫只是演出來 ──
    startFeed: function (key) {
      const res = ST.feed(ST.load(this.petId), key);
      if (!res) { this.say(CFG.talkCare.noFood[0]); return; }
      // v5:吃完的隨機小反應。許願命中最優先;1/8 吃出幸運星(+1 成長);其餘四選一。
      let reaction;
      if (res.wishGranted) reaction = 'wishGranted';
      else if (Math.random() < 1 / 8) reaction = 'star';
      else reaction = pickTalk(['burp', 'spin', 'hops', 'hearts']);
      this.act = { kind: 'feed', key: key, t0: PLS.t, fromX: this._petX || 0, bites: 0, result: res, reaction: reaction };
    },
    startPlay: function (key) {
      const res = ST.playToy(ST.load(this.petId), key);
      if (!res) { this.say(CFG.talkCare.noToy[0]); return; }
      this.act = { kind: 'play', key: key, t0: PLS.t, fromX: this._petX || 0, result: res };
    },
    // 動畫時間軸:回傳寵物 {x, hop, mode},並在對的時間點觸發音效/粒子/對話。
    // 餵食:走過去(1.1s)→ 吃三口(→3.35s)→ 開心(→4.9s);陪玩:走過去 → 玩(→3.6s)→ 收玩具(→5.0s)。
    actPose: function (t, foodX, playX, matY, frontY) {
      const a = this.act, e = t - a.t0;
      const stand = (a.kind === 'feed' ? foodX : playX) - 74;
      if (e < 1.1) {
        const k = smooth(0, 1.1, e);
        return { x: a.fromX + (stand - a.fromX) * k, hop: -Math.abs(Math.sin(e * 7)) * 16, mode: 'idle' };
      }
      if (a.kind === 'feed') {
        if (e < 3.35) {
          if (!a.saidStart) { a.saidStart = true; this.say(pickTalk(CFG.talkCare.feedStart)); }
          const bites = [1.5, 2.2, 2.9];
          while (a.bites < 3 && e >= bites[a.bites]) {
            a.bites++; PLS.sfx.bite(); PLS.burst(foodX, matY - 10, 'small');
          }
          return { x: stand, hop: 0, mode: 'chew' };
        }
        if (e < 4.9) {
          // v5:吃完的隨機小反應(burp / spin / hops / hearts / star / wishGranted)
          const re = e - 3.35;
          if (!a.reacted) {
            a.reacted = true; PLS.sfx.correct();
            if (a.reaction === 'wishGranted') {
              PLS.sfx.feast();
              PLS.burst(stand, frontY - 150, 'feast'); PLS.burst(stand + 40, frontY - 100, 'feast');
              this.say(pickTalk(CFG.talkCare.wishGranted));
            } else if (a.reaction === 'star') {
              // 幸運星:額外 +1 成長(可能因此升階 → 蓋掉原本的結果一起慶祝)
              const bres = ST.bonusXp(ST.load(this.petId), 1);
              if (bres.grew) a.result = bres;
              PLS.burst(stand, frontY - 160, 'feast');
              this.say(pickTalk(CFG.talkCare.star));
            } else {
              if (a.reaction === 'hearts') { PLS.burst(stand, frontY - 140, 'feast'); }
              this.say(pickTalk(CFG.talkCare[a.reaction] || CFG.talkCare.feedDone));
            }
          }
          if (a.reaction === 'hearts' && !a.hb2 && re > 0.6) { a.hb2 = true; PLS.burst(stand - 30, frontY - 110, 'feast'); }
          if (a.reaction === 'spin') {
            const sk = Math.min(1, re / 0.9);
            return { x: stand, hop: -Math.sin(sk * Math.PI) * 14, mode: 'happy', rot: sk * TAU };
          }
          if (a.reaction === 'hops') {
            return { x: stand, hop: -Math.abs(Math.sin(re * 9)) * 30, mode: 'happy' };
          }
          if (a.reaction === 'burp') {
            return { x: stand, hop: 0, mode: re < 0.5 ? 'chew' : 'happy' };
          }
          return { x: stand, hop: 0, mode: 'happy' };
        }
      } else {
        if (e < 3.6) {
          if (!a.saidStart) { a.saidStart = true; this.say(pickTalk(CFG.talkCare.playStart)); }
          if (!a.hb || t - a.hb > 0.7) { a.hb = t; PLS.burst(playX, matY - 46, 'small'); }
          return { x: stand, hop: 0, mode: 'happy' };
        }
        if (e < 5.0) {
          if (!a.reacted) { a.reacted = true; PLS.sfx.correct(); this.say(pickTalk(CFG.talkCare.playDone)); }
          return { x: stand, hop: 0, mode: 'idle' };
        }
      }
      // 動畫結束:清掉,並檢查有沒有升階;位置用 _resume 平滑接回日常走動
      const res = a.result;
      this.act = null;
      this._resume = { t0: t, x: stand };
      if (res && res.grew) {
        this.grow = { t0: t, stage: res.stage, stageZh: res.stageZh };
        PLS.sfx.feast();
        const d = ST.load(this.petId);
        PLS.say((d.name || CFG.pets[this.petId].name) + '長大了!');
      }
      return { x: stand, hop: 0, mode: 'happy' };
    },

    // ── v5:照顧圖示(頭上兩顆:飯碗=今天餵過、球=今天玩過;沒做的半透明)──
    drawCareIcons: function (ctx, d, cx, y) {
      const fed = d.care.fed > 0, played = d.care.played > 0;
      const self = this;
      [{ done: fed, dx: -26, kind: 'bowl' }, { done: played, dx: 26, kind: 'ball' }].forEach(function (it) {
        const x = cx + it.dx;
        ctx.save();
        ctx.globalAlpha = it.done ? 1 : 0.35;
        ctx.fillStyle = '#FFFFFF'; el(ctx, x, y, 17, 17); ctx.fill();
        ctx.strokeStyle = it.done ? '#F2B96B' : '#C9BCA8'; ctx.lineWidth = 2.5; el(ctx, x, y, 17, 17); ctx.stroke();
        if (it.kind === 'bowl') {
          ctx.fillStyle = '#E8965E';
          ctx.beginPath(); ctx.arc(x, y - 1, 9, 0, Math.PI); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#FFF3DC'; el(ctx, x, y - 3, 8, 3); ctx.fill();
        } else {
          ctx.fillStyle = '#8FB8D8'; el(ctx, x, y, 9, 9); ctx.fill();
          ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x - 8, y - 3); ctx.quadraticCurveTo(x, y + 4, x + 8, y - 3); ctx.stroke();
        }
        if (it.done) {   // 小綠勾
          ctx.fillStyle = '#8FC9A8'; el(ctx, x + 12, y - 12, 8, 8); ctx.fill();
          ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x + 8.5, y - 12); ctx.lineTo(x + 11, y - 9.5); ctx.lineTo(x + 15.5, y - 15); ctx.stroke();
        }
        ctx.restore();
      });
    },

    // ── v5:許願泡泡(想吃的食物;點泡泡告訴你去哪關賺)──
    drawWish: function (ctx, t, wish, petX, frontY) {
      const bx = Math.min(this._box.ix + this._box.iw - 110, petX + 128);
      const by = frontY - 236 + Math.sin(t * 2) * 4;
      ctx.save();
      ctx.shadowColor = 'rgba(150,110,70,0.2)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      ctx.fillStyle = 'rgba(255,255,255,0.96)'; el(ctx, bx, by, 78, 56); ctx.fill();
      ctx.shadowColor = 'transparent';
      // 思考小圓點(往寵物方向)
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      el(ctx, bx - 62, by + 52, 10, 10); ctx.fill();
      el(ctx, bx - 82, by + 70, 6, 6); ctx.fill();
      ctx.restore();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '17px ' + FONT; ctx.fillStyle = '#A8865E';
      ctx.fillText('好想吃…', bx, by - 30);
      A.drawFood(ctx, wish.key, bx, by + 8, 0.62);
      this._wishRect = { x: bx - 80, y: by - 58, w: 160, h: 116 };
    },

    // ── 食物籃 / 玩具箱(畫在房間前緣兩角,回傳點擊範圍)──
    drawBasket: function (ctx, cx, cy, kind, count, t) {
      const bob = count > 0 ? Math.sin(t * 2.4 + (kind === 'toy' ? 2 : 0)) * 2 : 0;
      ctx.save();
      ctx.translate(cx, cy + bob);
      if (kind === 'food') {
        // 野餐籃:提把 + 梯形籃身 + 編織紋
        ctx.strokeStyle = '#A9784A'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, -18, 24, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#C99355';
        ctx.beginPath(); ctx.moveTo(-40, -16); ctx.lineTo(40, -16); ctx.lineTo(30, 26); ctx.lineTo(-30, 26); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#B57F42'; rr(ctx, -44, -22, 88, 12, 6); ctx.fill();
        ctx.strokeStyle = 'rgba(120,80,40,0.28)'; ctx.lineWidth = 2;
        [0, 12].forEach(function (yy) { ctx.beginPath(); ctx.moveTo(-34 + yy * 0.3, yy); ctx.lineTo(34 - yy * 0.3, yy); ctx.stroke(); });
      } else {
        // 玩具箱:掀蓋木箱 + 露出一點玩具
        ctx.fillStyle = '#E88A80'; el(ctx, -16, -26, 8, 8); ctx.fill();
        ctx.fillStyle = '#8FC9A8'; rr(ctx, 6, -34, 16, 13, 3); ctx.fill();
        ctx.fillStyle = '#8FB8D8'; rr(ctx, -40, -14, 80, 40, 8); ctx.fill();
        ctx.fillStyle = '#7AA6C9'; rr(ctx, -44, -26, 88, 16, 7); ctx.fill();
        ctx.fillStyle = '#F2CE5E'; el(ctx, 0, -6, 7, 5); ctx.fill();
      }
      ctx.restore();
      A.pill(ctx, cx, cy + 44, kind === 'food' ? '食物籃' : '玩具箱',
        kind === 'food' ? MAT.foodTag : MAT.playTag, 'rgba(255,255,255,0.92)', 17);
      // 數量徽章
      const bx2 = cx + 40, by2 = cy - 36;
      ctx.fillStyle = count > 0 ? '#E8734E' : '#B9AC98';
      el(ctx, bx2, by2, 18, 18); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.font = '700 19px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(count > 99 ? 99 : count), bx2, by2 + 1);
      return { x: cx - 62, y: cy - 56, w: 124, h: 118 };
    },

    // ── 背包托盤(蓋在房間下半,列出可餵/可玩的東西)──
    drawTray: function (ctx, t, d) {
      const B = this._box, kind = this.tray;
      const list = ST.invList(d, kind === 'food' ? 'foods' : 'toys');
      const pw2 = B.iw - 56, ph2 = 292;
      const px = B.ix + 28, py = B.iy + B.ih - ph2 - 14;
      this._trayPanel = { x: px, y: py, w: pw2, h: ph2 };
      ctx.save();
      ctx.shadowColor = 'rgba(90,60,30,0.28)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
      ctx.fillStyle = 'rgba(255,251,242,0.98)'; rr(ctx, px, py, pw2, ph2, 24); ctx.fill();
      ctx.restore();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '26px ' + FONT; ctx.fillStyle = kind === 'food' ? MAT.foodTag : MAT.playTag;
      ctx.fillText(kind === 'food' ? '食物籃 · 點一個餵牠吃' : '玩具箱 · 點一個陪牠玩', px + 26, py + 36);
      // 關閉鈕(✕)
      const cr = { x: px + pw2 - 58, y: py + 14, w: 44, h: 44 };
      this._trayClose = cr;
      ctx.fillStyle = '#F0E4D2'; rr(ctx, cr.x, cr.y, cr.w, cr.h, 14); ctx.fill();
      ctx.strokeStyle = '#9A7B5C'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cr.x + 14, cr.y + 14); ctx.lineTo(cr.x + 30, cr.y + 30);
      ctx.moveTo(cr.x + 30, cr.y + 14); ctx.lineTo(cr.x + 14, cr.y + 30);
      ctx.stroke();
      this._trayRects = []; this._trayCTA = null;
      if (!list.length) {
        // 空背包:提示 + 直達解題的按鈕(把想玩的動力引回學習)
        ctx.textAlign = 'center';
        ctx.font = '25px ' + FONT; ctx.fillStyle = '#A8927A';
        ctx.fillText(kind === 'food' ? '背包裡沒有食物了' : '玩具箱空空的', px + pw2 / 2, py + 106);
        const bw = 420, bh = 70, bx3 = px + (pw2 - bw) / 2, by3 = py + 152;
        this._trayCTA = { x: bx3, y: by3, w: bw, h: bh };
        ctx.save();
        ctx.shadowColor = 'rgba(180,120,40,0.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
        ctx.fillStyle = kind === 'food' ? '#F2A93C' : '#8FC9A8'; rr(ctx, bx3, by3, bw, bh, 22); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#FFFFFF'; ctx.font = '27px ' + FONT;
        ctx.fillText(kind === 'food' ? '去數學餐廳解題賺食物 →' : '去英文遊戲間過關拿玩具 →', px + pw2 / 2, by3 + bh / 2);
        return;
      }
      // 物品格:一排最多 7 個、最多兩排
      const cell = 96, gap2 = 12;
      const perRow = Math.min(7, list.length);
      const gx0 = px + (pw2 - (perRow * cell + (perRow - 1) * gap2)) / 2;
      const self = this;
      list.slice(0, 14).forEach(function (it, i) {
        const r = Math.floor(i / 7), c = i % 7;
        const x = gx0 + c * (cell + gap2), y = py + 66 + r * (cell + gap2);
        ctx.fillStyle = '#FFFFFF'; rr(ctx, x, y, cell, cell, 18); ctx.fill();
        ctx.strokeStyle = '#EFE0CE'; ctx.lineWidth = 2; rr(ctx, x, y, cell, cell, 18); ctx.stroke();
        if (kind === 'food') A.drawFood(ctx, it.key, x + cell / 2, y + cell / 2 - 4, 0.72);
        else TOY.drawToy(ctx, it.key, x + cell / 2, y + cell / 2 - 2, 0.6);
        ctx.fillStyle = '#E8734E'; el(ctx, x + cell - 16, y + 16, 15, 15); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.font = '700 16px ' + FONT;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(it.n > 99 ? 99 : it.n), x + cell - 16, y + 17);
        self._trayRects.push({ x: x, y: y, w: cell, h: cell, key: it.key });
      });
      if (list.length > 14) {
        ctx.textAlign = 'center'; ctx.font = '18px ' + FONT; ctx.fillStyle = '#B9A88F';
        ctx.fillText('東西太多裝不下,先吃掉/玩掉一些吧!', px + pw2 / 2, py + ph2 - 16);
      }
    },

    // ── 成長條(左欄,主選單卡片下方)──
    drawGrowth: function (ctx, t, d) {
      const gi = ST.growthInfo(d);
      if (this._prDisp == null) this._prDisp = gi.progress;
      this._prDisp += (gi.progress - this._prDisp) * 0.1;
      const x = 30, y = 568, w = PW - 60, h = 76;
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.12)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#FFFFFF'; rr(ctx, x, y, w, h, 20); ctx.fill();
      ctx.restore();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '23px ' + FONT; ctx.fillStyle = '#8A6242';
      ctx.fillText('成長:' + gi.stageZh, x + 22, y + 24);
      ctx.textAlign = 'right'; ctx.font = '19px ' + FONT; ctx.fillStyle = '#B49A7C';
      ctx.fillText(gi.next ? ('還差 ' + Math.max(0, gi.next - gi.xp) + ' 點長大') : '已經是大寶了!', x + w - 22, y + 24);
      const bx = x + 22, bw = w - 44, by = y + 46, bh = 15;
      ctx.fillStyle = '#F0E6D6'; rr(ctx, bx, by, bw, bh, 7); ctx.fill();
      const pr = Math.max(0, Math.min(1, this._prDisp));
      if (pr > 0.02) { ctx.fillStyle = '#F2B96B'; rr(ctx, bx, by, Math.max(bh, bw * pr), bh, 7); ctx.fill(); }
    },

    // ── 升階慶祝(蓋在房間框上)──
    drawGrow: function (ctx, t, d) {
      const g = this.grow, B = this._box, e = t - g.t0;
      const name = d.name || CFG.pets[this.petId].name;
      ctx.save();
      ctx.beginPath(); rr(ctx, B.ix, B.iy, B.iw, B.ih, 14); ctx.clip();
      ctx.fillStyle = 'rgba(80,60,35,0.45)'; ctx.fillRect(B.ix, B.iy, B.iw, B.ih);
      const cx = B.ix + B.iw / 2, cy = B.iy + B.ih / 2 + 30;
      const rg = ctx.createRadialGradient(cx, cy - 60, 30, cx, cy - 60, 360);
      rg.addColorStop(0, 'rgba(255,214,120,0.75)'); rg.addColorStop(1, 'rgba(255,214,120,0)');
      ctx.fillStyle = rg; ctx.fillRect(B.ix, B.iy, B.iw, B.ih);
      // 旋轉光芒
      ctx.strokeStyle = 'rgba(255,235,170,0.5)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let r = 0; r < 10; r++) {
        const a2 = t * 0.7 + r * Math.PI / 5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a2) * 150, cy - 40 + Math.sin(a2) * 150);
        ctx.lineTo(cx + Math.cos(a2) * 190, cy - 40 + Math.sin(a2) * 190);
        ctx.stroke();
      }
      const pop = e < 0.5 ? 0.6 + 0.4 * Math.sin(e / 0.5 * Math.PI / 2) : 1;
      ctx.save(); ctx.translate(cx, cy + 110); ctx.scale(0.62 * pop, 0.62 * pop);
      P.draw(this.petId, ctx, t, { mode: 'happy', stage: g.stage });
      ctx.restore();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '52px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillText(name + '長大了!', cx, B.iy + 86);
      ctx.fillStyle = '#C2591E'; ctx.fillText(name + '長大了!', cx, B.iy + 82);
      A.pill(ctx, cx, B.iy + 140, '變成「' + g.stageZh + '」了!', '#C2851E', 'rgba(255,244,214,0.96)', 26);
      if (e > 1.2) A.pill(ctx, cx, B.iy + B.ih - 40, '點一下繼續', 'rgba(255,255,255,0.9)', 'rgba(120,90,60,0.55)', 19);
      ctx.restore();
      if (!g.hb || t - g.hb > 0.5) { g.hb = t; PLS.burst(cx + (Math.random() - 0.5) * 320, cy - 60, 'feast'); }
    },

    draw: function (ctx, t) {
      const pid = this.petId, th = CFG.pets[pid].theme;
      const d = ST.load(pid), name = d.name || CFG.pets[pid].name;
      const gi = ST.growthInfo(d);
      ctx.fillStyle = '#EFE3D2'; ctx.fillRect(0, 0, W, H);

      // 右側:屋頂 + 厚木框房間
      const fx = PW + 26, fy = 158, fw = W - (PW + 26) - 30, fh = H - 158 - 34;
      const box = roofFrame(ctx, fx, fy, fw, fh, name + '的房間');
      this._box = box;
      const wallB = roomInterior(ctx, box.ix, box.iy, box.iw, box.ih, 14, th.wall, th.dot);
      ctx.save();
      ctx.beginPath(); rr(ctx, box.ix, box.iy, box.iw, box.ih, 14); ctx.clip();
      const foodX = box.ix + box.iw * 0.29, playX = box.ix + box.iw * 0.71;
      const matY = wallB + (box.iy + box.ih - wallB) * 0.40, frontY = box.iy + box.ih - 36;
      station(ctx, foodX, matY, 'food', d.home.foods || []);
      station(ctx, playX, matY, 'toy', d.home.toys || []);
      A.pill(ctx, foodX, wallB + 28, '食物區', MAT.foodTag, MAT.foodTagBg, 22);
      A.pill(ctx, playX, wallB + 28, '遊戲區', MAT.playTag, MAT.playTagBg, 22);

      // 餵食/陪玩動畫 or 平常自己過生活
      let pose = null;
      const actRef = this.act;
      if (actRef) pose = this.actPose(t, foodX, playX, matY, frontY);
      if (actRef && this.act) {
        // 還在進行中:把食物/玩具畫在墊子中央
        const e = t - actRef.t0;
        if (actRef.kind === 'feed') {
          if (actRef.bites < 3) {
            const fs = [0.95, 0.72, 0.5][actRef.bites];
            itemShadow(ctx, foodX, matY + 9, 30 * fs);
            A.drawFood(ctx, actRef.key, foodX, matY - 8, fs);
          }
        } else {
          const doing = e >= 1.1 && e < 3.6;
          const off = doing ? Math.abs(Math.sin((e - 1.1) * 5)) * 26 : 0;
          const fade = e >= 3.6 ? Math.max(0, 1 - (e - 3.6) / 0.9) : 1;
          ctx.save(); ctx.globalAlpha = fade;
          itemShadow(ctx, playX, matY + 9, 30);
          TOY.drawToy(ctx, actRef.key, playX, matY - 14 - off, 0.9);
          ctx.restore();
        }
      }
      if (!pose) {
        const life = petLife(t, foodX, playX);
        pose = { x: life.x, hop: life.hop, mode: life.mode };
        // 剛結束餵食/陪玩:0.7 秒內從剛剛站的位置滑回日常走動,避免瞬移
        if (this._resume) {
          const rk = (t - this._resume.t0) / 0.7;
          if (rk < 1) { pose.x = this._resume.x + (pose.x - this._resume.x) * smooth(0, 1, rk); pose.hop = 0; }
          else this._resume = null;
        }
      }
      if (this.pat && t - this.pat.t0 < 1.0 && !this.act) pose.mode = 'happy';
      petAt(ctx, pid, t, pose.x, frontY + pose.hop, 0.46, pose.mode, gi.stage, pose.rot);
      this._petX = pose.x; this._petY = frontY;

      // ── v5:照顧圖示(飯碗/球)+ 許願泡泡 + 撒嬌 ──
      if (!this.act && !this.grow) {
        this.drawCareIcons(ctx, d, pose.x, frontY - 196);
        const wish = ST.getWish(d);
        this._wishRect = null;
        if (wish && !wish.done) this.drawWish(ctx, t, wish, pose.x, frontY);
        this._wishInfo = wish;
        // 撒嬌:今天還沒餵(每 16 秒)/ 餵了但還沒陪玩且有玩具(每 26 秒)
        if (!this.bubble || t >= this.bubble.until) {
          if (d.care.fed === 0 && t - (this._nagT || -99) > 16) {
            this._nagT = t; this.say(pickTalk(CFG.talkCare.hungryNag));
          } else if (d.care.fed > 0 && d.care.played === 0 && ST.invTotal(d, 'toys') > 0 && t - (this._nagT || -99) > 26) {
            this._nagT = t; this.say(pickTalk(CFG.talkCare.playNag));
          }
        }
      } else { this._wishRect = null; }

      // ── v5:掛畫 = 收集圖鑑入口 ──
      this._picRect = { x: box.ix + 54, y: box.iy + 50, w: 116, h: 118 };
      A.pill(ctx, box.ix + 112, box.iy + 162, '圖鑑', '#B06A86', 'rgba(255,255,255,0.9)', 16);

      // 食物籃 / 玩具箱(前緣兩角,可點)
      this._foodBasket = this.drawBasket(ctx, box.ix + 88, box.iy + box.ih - 64, 'food', ST.invTotal(d, 'foods'), t);
      this._toyBox = this.drawBasket(ctx, box.ix + box.iw - 88, box.iy + box.ih - 64, 'toy', ST.invTotal(d, 'toys'), t);
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
      petAt(ctx, pid, t, 132, 168, 0.32, 'idle', gi.stage); ctx.restore();
      ctx.strokeStyle = '#F2D8C0'; ctx.lineWidth = 4; el(ctx, 132, 116, 42, 42); ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '34px ' + FONT; ctx.fillStyle = th.deep; ctx.fillText(name + '的房間', 190, 100);
      ctx.font = '20px ' + FONT; ctx.fillStyle = 'rgba(120,95,70,0.82)'; ctx.fillText('今天想做什麼呢?', 190, 134);
      // 成長條
      this.drawGrowth(ctx, t, d);

      // 蓋在最上面的層:背包托盤 / 升階慶祝
      if (this.tray) this.drawTray(ctx, t, d);
      if (this.grow) this.drawGrow(ctx, t, d);
    },

    drawTop: function (ctx, t) {
      if (this.bubble && t < this.bubble.until && !this.grow) {
        const bx = Math.min(W - 190, Math.max(PW + 190, this._petX || (PW + 400)));
        A.bubble(ctx, bx, (this._petY || 640) - 208, this.bubble.text, { size: 22 });
      }
    }
  };

  PLS.register('room', room);
  window.PLS_ROOM2 = true;
})();
