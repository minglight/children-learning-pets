// lifecycle.js — v9 成長生命週期畫面:選寵物(pickpet)、畢業(graduate)、寵物珍藏館(museum)
// 存檔以小孩為單位(kidL / kidR),寵物養到大寶滿 3 天可畢業入珍藏,再重選一隻從幼幼養。
(function () {
  const PLS = window.PLS, A = window.PLS_ART, P = window.PLS_PETS;
  const CFG = window.PLS_CONFIG, ST = window.PLS_STORE;
  const W = PLS.W, H = PLS.H, FONT = A.FONT;

  function pickTalk(list) { return list[Math.floor(Math.random() * list.length)]; }
  const SLOT_ZH = { kidL: '左邊', kidR: '右邊' };
  // 8 種可選物種(順序 = 選單排列)
  const SPECIES = ['rabbit', 'hamster', 'tabby', 'meerkat', 'capybara', 'husky', 'elephant', 'xmascat'];

  function backButton(to, params) {
    PLS.addButton({
      x: 30, y: 26, w: 60, h: 60,
      draw: function (ctx) {
        ctx.fillStyle = '#FFFFFF'; A.el(ctx, 60, 56, 30, 30); ctx.fill();
        ctx.strokeStyle = '#F0E0CE'; ctx.lineWidth = 2; A.el(ctx, 60, 56, 30, 30); ctx.stroke();
        A.drawIcon(ctx, 'back', 60, 56, 0.95, '#A07B58');
      },
      onTap: function () { PLS.go(to, params || {}); }
    });
  }

  // 在 (cx, footY) 底部置中畫一隻寵物(footY = 腳底 y)
  function drawPetAt(ctx, species, t, cx, footY, s, o) {
    ctx.save(); ctx.translate(cx, footY - 146 * s); ctx.scale(s, s);
    P.draw(species, ctx, t, o || {}); ctx.restore();
  }

  // ════════════════════════════════════════════════════
  // pickpet — 從 8 種挑一隻,開始(或畢業後重新)養
  // ════════════════════════════════════════════════════
  const COLS = 4, CW = 250, CH = 292, GAP = 26;
  const GRID_X = (W - (COLS * CW + (COLS - 1) * GAP)) / 2;   // 置中
  const GRID_Y = 168, ROW_STEP = CH + 26;

  const pickpet = {
    enter: function (params) {
      const self = this;
      this.slot = (params && params.pet) || 'kidL';
      this.first = !ST.collectionOf(this.slot).length;   // 第一次養 vs 畢業後重選
      backButton('home', {});
      SPECIES.forEach(function (sp, i) {
        const col = i % COLS, row = Math.floor(i / COLS);
        const x = GRID_X + col * (CW + GAP), y = GRID_Y + row * ROW_STEP;
        PLS.addButton({
          x: x, y: y, w: CW, h: CH,
          draw: function (ctx, t) { self.drawCard(ctx, t, sp, x, y); },
          onTap: function () {
            ST.chooseSpecies(self.slot, sp);
            PLS.sfx && PLS.sfx.tap && PLS.sfx.tap();
            PLS.go('room', { pet: self.slot });
          }
        });
      });
    },
    drawCard: function (ctx, t, sp, x, y) {
      const th = CFG.pets[sp].theme;
      ctx.save();
      ctx.shadowColor = 'rgba(140,100,60,0.18)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
      ctx.fillStyle = th.wall; A.rr(ctx, x, y, CW, CH, 24); ctx.fill();
      ctx.restore();
      ctx.fillStyle = th.dot;
      for (let xx = x + 34; xx < x + CW; xx += 62)
        for (let yy = y + 40; yy < y + CH - 70; yy += 62) { A.el(ctx, xx, yy, 4.5, 4.5); ctx.fill(); }
      ctx.save(); ctx.beginPath(); A.rr(ctx, x, y, CW, CH, 24); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.30)'; A.el(ctx, x + CW / 2, y + CH - 54, CW * 0.4, 24); ctx.fill();
      // 幼幼樣子(帶呆毛),微微上下浮動
      const bob = Math.sin(t * 2 + x) * 4;
      drawPetAt(ctx, sp, t, x + CW / 2, y + CH - 66 + bob, 0.62, { stage: 'baby' });
      ctx.restore();
      A.pill(ctx, x + CW / 2, y + CH - 30, CFG.pets[sp].name, th.accent, 'rgba(255,255,255,0.94)', 24);
    },
    draw: function (ctx, t) {
      drawWallBg(ctx);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const zh = SLOT_ZH[this.slot] || '';
      A.pill(ctx, W / 2, 74, zh + '小孩 · ' + (this.first ? '選一隻寵物開始養' : '選一隻新寵物,從幼幼養起'),
        '#8A6242', 'rgba(255,255,255,0.9)', 30);
      A.pill(ctx, W / 2, 126, '養到大寶、陪牠 3 天,就能畢業進珍藏館', '#A07B58', 'rgba(255,255,255,0.8)', 20);
    }
  };

  // ════════════════════════════════════════════════════
  // graduate — 大寶畢業入珍藏(從房間的畢業鈕進來)
  // ════════════════════════════════════════════════════
  const graduate = {
    enter: function (params) {
      const self = this;
      this.slot = (params && params.pet) || 'kidL';
      const d = ST.load(this.slot);
      this.species = d.species || 'rabbit';
      this.deco = ST.growthInfo(d).deco;
      this.name = d.name || CFG.pets[this.species].name;
      this.start = PLS.t; this._burst = 0;
      // 確認畢業
      PLS.addButton({
        x: W / 2 - 320, y: 640, w: 300, h: 96,
        draw: function (ctx, tt) { self.btn(ctx, W / 2 - 320, 640, 300, 96, '🎓 畢業入珍藏', '#C2851E', '#FFF6E2', true); },
        onTap: function () {
          const e = ST.graduate(self.slot);
          if (e) { PLS.sfx && PLS.sfx.feast && PLS.sfx.feast(); PLS.go('pickpet', { pet: self.slot }); }
        }
      });
      // 再抱一下(取消)
      PLS.addButton({
        x: W / 2 + 20, y: 640, w: 300, h: 96,
        draw: function (ctx, tt) { self.btn(ctx, W / 2 + 20, 640, 300, 96, '還要再抱一下', '#9A7B5C', 'rgba(255,255,255,0.9)', false); },
        onTap: function () { PLS.go('room', { pet: self.slot }); }
      });
    },
    btn: function (ctx, x, y, w, h, text, fg, bg, primary) {
      ctx.save();
      if (primary) { ctx.shadowColor = 'rgba(200,140,40,0.4)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6; }
      ctx.fillStyle = bg; A.rr(ctx, x, y, w, h, h / 2); ctx.fill();
      ctx.restore();
      if (!primary) { ctx.strokeStyle = 'rgba(160,120,80,0.4)'; ctx.lineWidth = 2; A.rr(ctx, x, y, w, h, h / 2); ctx.stroke(); }
      ctx.fillStyle = fg; ctx.font = '32px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, x + w / 2, y + h / 2 + 1);
    },
    draw: function (ctx, t) {
      const th = CFG.pets[this.species].theme;
      // 背景光暈
      ctx.fillStyle = th.wall; ctx.fillRect(0, 0, W, H);
      const cx = W / 2, cy = 366;
      const rg = ctx.createRadialGradient(cx, cy - 40, 40, cx, cy - 40, 420);
      rg.addColorStop(0, 'rgba(255,220,130,0.7)'); rg.addColorStop(1, 'rgba(255,220,130,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,225,150,0.55)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      for (let r = 0; r < 12; r++) {
        const a2 = t * 0.6 + r * Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a2) * 170, cy - 30 + Math.sin(a2) * 170);
        ctx.lineTo(cx + Math.cos(a2) * 214, cy - 30 + Math.sin(a2) * 214);
        ctx.stroke();
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '56px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillText(this.name + ' 準備畢業了!', cx, 118);
      ctx.fillStyle = '#C2591E'; ctx.fillText(this.name + ' 準備畢業了!', cx, 114);
      // 大寶 + 獎牌
      drawPetAt(ctx, this.species, t, cx, cy + 150, 1.06, { stage: 'grown', mode: 'happy', growDeco: this.deco });
      ctx.font = '64px ' + FONT; ctx.fillText('🏅', cx + 150, cy - 90);
      A.pill(ctx, cx, 556, '畢業後會永久收進「寵物珍藏館」,金幣和圖鑑都留著', '#8A6242', 'rgba(255,255,255,0.9)', 22);
      // 撒花
      if (t - this._burst > 0.4) { this._burst = t; PLS.burst && PLS.burst(cx + (Math.random() - 0.5) * 360, 200, 'feast'); }
    }
  };

  // ════════════════════════════════════════════════════
  // museum — 寵物珍藏館(左右兩小孩各自的收藏;點寵物 → 換裝 dressup)
  // ════════════════════════════════════════════════════
  const PET_SPAN = 366;   // 大寶在 P.draw 座標的總高(含最高的兔耳);反推縮放讓頭頂不被 clip 切到
  const CUR_H = 118;

  // 在方框內置中畫寵物,縮放依框高反推,頭頂剛好落在 (框頂+topM)、腳底在 (框底-botM),不會被 clip 切到
  function petInBox(ctx, species, t, bx, by, bw, bh, o, topM, botM) {
    const sc = (bh - topM - botM) / PET_SPAN;
    drawPetAt(ctx, species, t, bx + bw / 2, by + bh - botM, sc, o);
  }
  function corner(ctx, x, y, s) {   // 右上角小圖示(🎨 = 可換裝)
    ctx.font = '22px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y);
  }

  // 算好一欄(一個小孩)的版面 + 可點區域,enter(放按鈕)與 draw(畫)共用,存檔只在此讀一次
  function colLayout(slot, x, y, w) {
    const d = ST.load(slot);
    const coll = Array.isArray(d.collection) ? d.collection : [];
    const curTop = y + 70;
    const current = d.species
      ? { rect: { x: x, y: curTop, w: w, h: CUR_H }, grown: ST.growthInfo(d).stage === 'grown' }
      : null;
    const gridTop = curTop + CUR_H + 20 + 34;   // 現況卡 + 間距 + 「已畢業珍藏」標題列
    const per = 3, TW = (w - (per - 1) * 12) / per, TH = 168;
    const cards = coll.map(function (e, i) {
      const col = i % per, row = Math.floor(i / per);
      return {
        index: i, species: e.species, deco: (typeof e.deco === 'number' ? e.deco : 0), name: e.name,
        x: x + col * (TW + 12), y: gridTop + row * (TH + 12), w: TW, h: TH
      };
    });
    return { slot: slot, x: x, y: y, w: w, d: d, zh: SLOT_ZH[slot], coll: coll, current: current, gridTop: gridTop };
  }

  function drawColumn(ctx, t, c) {
    const x = c.x, y = c.y, w = c.w, d = c.d;
    const accent = c.slot === 'kidL' ? '#C58A4E' : '#5F86A0';
    A.pill(ctx, x + w / 2, y + 24, c.zh + '小孩 · 珍藏 ' + c.coll.length + ' 隻', accent, 'rgba(255,255,255,0.92)', 24);
    // 正在養
    const curTop = y + 70;
    if (c.current) {
      const gi = ST.growthInfo(d);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; A.rr(ctx, x, curTop, w, CUR_H, 18); ctx.fill();
      ctx.save(); A.rr(ctx, x, curTop, w, CUR_H, 18); ctx.clip();
      petInBox(ctx, d.species, t, x + 8, curTop, 116, CUR_H, { stage: gi.stage, growDeco: gi.deco }, 8, 10);
      ctx.restore();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '20px ' + FONT; ctx.fillStyle = '#B0752E'; ctx.fillText('正在養', x + 132, curTop + 30);
      ctx.font = '26px ' + FONT; ctx.fillStyle = '#6A4A2E';
      ctx.fillText((d.name || CFG.pets[d.species].name) + '(' + gi.stageZh + ')', x + 132, curTop + 62);
      ctx.fillStyle = 'rgba(160,120,80,0.2)'; A.rr(ctx, x + 132, curTop + 84, w - 162, 10, 5); ctx.fill();
      ctx.fillStyle = '#F2B96B'; A.rr(ctx, x + 132, curTop + 84, Math.max(10, (w - 162) * gi.progress), 10, 5); ctx.fill();
      if (c.current.grown) corner(ctx, x + w - 12, curTop + 14, '🎨');   // 大寶可換配件
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; A.rr(ctx, x, curTop, w, CUR_H, 18); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '22px ' + FONT; ctx.fillStyle = '#A88A66'; ctx.fillText('還沒選寵物', x + w / 2, curTop + 59);
    }
    // 已畢業珍藏標題
    const labelY = curTop + CUR_H + 20;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '20px ' + FONT; ctx.fillStyle = '#9A7B5C'; ctx.fillText('已畢業珍藏', x + 6, labelY);
    if (!c.coll.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; A.rr(ctx, x, c.gridTop, w, 90, 16); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '20px ' + FONT; ctx.fillStyle = '#B09A7E';
      ctx.fillText('把寵物養到大寶畢業,就會收進這裡', x + w / 2, c.gridTop + 46);
      return;
    }
    // 縮圖格子:每列 3 個(縮放算好不切頭;右上 🎨 = 點了可換配件)
    const per = 3, TW = (w - (per - 1) * 12) / per, TH = 168;
    c.coll.forEach(function (e, i) {
      const col = i % per, row = Math.floor(i / per);
      const gx = x + col * (TW + 12), gy = c.gridTop + row * (TH + 12);
      ctx.fillStyle = 'rgba(255,255,255,0.62)'; A.rr(ctx, gx, gy, TW, TH, 16); ctx.fill();
      ctx.save(); A.rr(ctx, gx, gy, TW, TH, 16); ctx.clip();
      petInBox(ctx, e.species, t, gx, gy, TW, TH, { stage: 'grown', growDeco: (typeof e.deco === 'number' ? e.deco : 0) }, 12, 44);
      ctx.restore();
      corner(ctx, gx + TW - 10, gy + 14, '🎨');
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '20px ' + FONT; ctx.fillStyle = '#6A4A2E';
      ctx.fillText(e.name || CFG.pets[e.species].name, gx + TW / 2, gy + TH - 20);
    });
  }

  const museum = {
    enter: function () {
      backButton('home', {});
      this.cols = [colLayout('kidL', 40, 130, W / 2 - 70), colLayout('kidR', W / 2 + 30, 130, W / 2 - 70)];
      this.cols.forEach(function (c) {
        if (c.current && c.current.grown) {
          const r = c.current.rect;
          PLS.addButton({ x: r.x, y: r.y, w: r.w, h: r.h, draw: function () {}, onTap: function () { PLS.go('dressup', { pet: c.slot, index: -1 }); } });
        }
        // 每列 3 個縮圖 → 對應可點按鈕
        const w = c.w, per = 3, TW = (w - (per - 1) * 12) / per, TH = 168;
        c.coll.forEach(function (e, i) {
          const col = i % per, row = Math.floor(i / per);
          const gx = c.x + col * (TW + 12), gy = c.gridTop + row * (TH + 12);
          PLS.addButton({ x: gx, y: gy, w: TW, h: TH, draw: function () {}, onTap: function () { PLS.go('dressup', { pet: c.slot, index: i }); } });
        });
      });
    },
    draw: function (ctx, t) {
      drawWallBg(ctx);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '48px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText('🏅 寵物珍藏館', W / 2, 74);
      ctx.fillStyle = '#8A6242'; ctx.fillText('🏅 寵物珍藏館', W / 2, 70);
      ctx.strokeStyle = 'rgba(160,120,80,0.25)'; ctx.lineWidth = 3;
      ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.moveTo(W / 2, 130); ctx.lineTo(W / 2, H - 40); ctx.stroke(); ctx.setLineDash([]);
      (this.cols || []).forEach(function (c) { drawColumn(ctx, t, c); });
    }
  };

  // ════════════════════════════════════════════════════
  // dressup — 幫大寶換配件(從珍藏館點寵物進來;只能換成「已收集」的款式)
  // ════════════════════════════════════════════════════
  const dressup = {
    enter: function (params) {
      const self = this;
      this.slot = (params && params.pet) || 'kidL';
      this.index = (params && typeof params.index === 'number') ? params.index : -1;
      const d = ST.load(this.slot);
      if (this.index >= 0 && Array.isArray(d.collection) && d.collection[this.index]) {
        const e = d.collection[this.index];
        this.species = e.species; this.cur = (typeof e.deco === 'number' ? e.deco : 0);
        this.name = e.name || CFG.pets[e.species].name;
      } else {
        this.index = -1;
        this.species = d.species || 'rabbit'; this.cur = ST.growthInfo(d).deco;
        this.name = d.name || CFG.pets[this.species].name;
      }
      this.owned = ST.decoOwned(d, this.species);   // 已收集的配件 index 清單
      backButton('museum', {});
      const N = ST.DECO_N || 5, SW = 150, SH = 178, GAP = 22;
      const sx = (W - (N * SW + (N - 1) * GAP)) / 2, sy = 500;
      for (let i = 0; i < N; i++) {
        const bx = sx + i * (SW + GAP);
        PLS.addButton({
          x: bx, y: sy, w: SW, h: SH,
          draw: function (ctx, t) { self.drawSlot(ctx, t, i, bx, sy, SW, SH); },
          onTap: function () {
            if (self.owned.indexOf(i) < 0) { PLS.sfx && PLS.sfx.err && PLS.sfx.err(); return; }   // 未收集不能換
            const ok = self.index >= 0 ? ST.setCollectionDeco(self.slot, self.index, i) : ST.setCurrentDeco(self.slot, i);
            if (ok) { self.cur = i; PLS.sfx && PLS.sfx.tap && PLS.sfx.tap(); PLS.burst && PLS.burst(bx + SW / 2, sy, 'feast'); }
          }
        });
      }
    },
    drawSlot: function (ctx, t, i, x, y, w, h) {
      const owned = this.owned.indexOf(i) >= 0;
      const sel = i === this.cur;
      ctx.save();
      if (sel) { ctx.shadowColor = 'rgba(230,168,60,0.5)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4; }
      ctx.fillStyle = owned ? 'rgba(255,255,255,0.9)' : 'rgba(232,222,208,0.75)';
      A.rr(ctx, x, y, w, h, 18); ctx.fill();
      ctx.restore();
      if (sel) { ctx.strokeStyle = '#E0A828'; ctx.lineWidth = 4; A.rr(ctx, x, y, w, h, 18); ctx.stroke(); }
      ctx.save(); A.rr(ctx, x, y, w, h, 18); ctx.clip();
      petInBox(ctx, this.species, t, x, y, w, h, { stage: 'grown', growDeco: i }, 14, 30);
      if (!owned) { ctx.fillStyle = 'rgba(120,105,90,0.5)'; ctx.fillRect(x, y, w, h); }
      ctx.restore();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (!owned) { ctx.font = '40px ' + FONT; ctx.fillText('🔒', x + w / 2, y + h / 2); }
      else if (sel) { ctx.font = '24px ' + FONT; ctx.fillStyle = '#C2851E'; ctx.fillText('✓ 穿戴中', x + w / 2, y + h - 16); }
    },
    draw: function (ctx, t) {
      drawWallBg(ctx);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '38px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText(this.name + ' 的配件', W / 2, 84);
      ctx.fillStyle = '#8A6242'; ctx.fillText(this.name + ' 的配件', W / 2, 80);
      const N = ST.DECO_N || 5;
      A.pill(ctx, W / 2, 132, '已收集 ' + this.owned.length + ' / ' + N + ' 款 · 點下面就能換上', '#A07B58', 'rgba(255,255,255,0.85)', 22);
      const bob = Math.sin(t * 2) * 4;
      drawPetAt(ctx, this.species, t, W / 2, 468 + bob, 0.8, { stage: 'grown', mode: 'happy', growDeco: this.cur });
    }
  };

  // 珍藏館 / 選寵物共用的柔和牆背景
  function drawWallBg(ctx) {
    ctx.fillStyle = '#F6E9DB'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(214,178,146,0.14)';
    for (let yy = 60; yy < H; yy += 88)
      for (let xx = Math.floor(yy / 88) % 2 ? 50 : 94; xx < W; xx += 88) { A.el(ctx, xx, yy, 6, 6); ctx.fill(); }
    const rg = ctx.createRadialGradient(W / 2, 70, 40, W / 2, 70, 720);
    rg.addColorStop(0, 'rgba(255,210,140,0.20)'); rg.addColorStop(1, 'rgba(255,210,140,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  }

  PLS.register('pickpet', pickpet);
  PLS.register('graduate', graduate);
  PLS.register('museum', museum);
  PLS.register('dressup', dressup);
})();
