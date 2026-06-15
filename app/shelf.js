// shelf.js — 換擺設(新流程):食物三格 + 玩具三格,慢慢挑、隨時換,
// 按「確定佈置」才一次套用並回房間;「取消」放棄變更。載入順序在 screens.js 之後,覆蓋舊 'shelf'。
(function () {
  const PLS = window.PLS, A = window.PLS_ART, P = window.PLS_PETS, TOY = window.PLS_TOY;
  const CFG = window.PLS_CONFIG, ST = window.PLS_STORE;
  const W = PLS.W, H = PLS.H, FONT = A.FONT, TAU = Math.PI * 2;

  function el(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

  // 版面常數
  const TRAY = { x: 60, y: 150, w: W - 120, h: 158 };
  const SL_Y = 244, SL_W = 100, SL_H = 100;
  const FCX = [158, 270, 382], TCX = [698, 810, 922];
  const TAB_FOOD = { cx: 150, cy: 348, w: 108, h: 46 }, TAB_TOY = { cx: 274, cy: 348, w: 108, h: 46 };
  const GRID = { cols: 7, cw: 148, ch: 116, gap: 12 };
  GRID.w = GRID.cols * GRID.cw + (GRID.cols - 1) * GRID.gap;
  GRID.x0 = (W - GRID.w) / 2;
  const GRID_Y0 = 388, CLIP_TOP = 372;
  const CANCEL = { x: 60, y: H - 96, w: 200, h: 64 };
  const CONFIRM = { w: 360, h: 72 }; CONFIRM.x = W - 60 - CONFIRM.w; CONFIRM.y = H - 100;

  function slotBox(ctx, cx, cy, active, accent, activeBg, locked) {
    ctx.save();
    if (active) { ctx.shadowColor = accent; ctx.shadowBlur = 18; }
    ctx.fillStyle = active ? activeBg : '#FFFCF6';
    rr(ctx, cx - SL_W / 2, cy - SL_H / 2, SL_W, SL_H, 18); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = active ? accent : '#EFE0CE'; ctx.lineWidth = active ? 4 : 2.5;
    rr(ctx, cx - SL_W / 2, cy - SL_H / 2, SL_W, SL_H, 18); ctx.stroke();
  }
  function plusMark(ctx, cx, cy, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 13, cy); ctx.lineTo(cx + 13, cy); ctx.moveTo(cx, cy - 13); ctx.lineTo(cx, cy + 13); ctx.stroke();
  }
  function check(ctx, cx, cy, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 9, cy); ctx.lineTo(cx - 2, cy + 8); ctx.lineTo(cx + 11, cy - 9); ctx.stroke();
  }
  function inRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
  function inCenter(x, y, c) { return x >= c.cx - c.w / 2 && x <= c.cx + c.w / 2 && y >= c.cy - c.h / 2 && y <= c.cy + c.h / 2; }

  const shelf = {
    petId: 'rabbit', note: '', noteUntil: 0,
    foods: [], toys: [], origFoods: [], origToys: [], canFoods: [], canToys: [],
    allFoods: [], allToys: [],
    tab: 'food', activeIdx: 0,
    scrollY: 0, maxScroll: 0,
    _pdown: false, _drag: false, _py: 0, _ps: 0, _sbdrag: false,

    enter: function (params) {
      this.petId = params.pet || 'rabbit';
      const d = ST.load(this.petId);
      this.foods = (d.home.foods || []).map(function (s) { return { key: s.key, deluxe: !!s.deluxe }; });
      this.toys = (d.home.toys || []).map(function (s) { return { key: s.key, deluxe: !!s.deluxe }; });
      while (this.foods.length < 3) this.foods.push({ key: null, deluxe: false });
      while (this.toys.length < 3) this.toys.push({ key: null, deluxe: false });
      this.origFoods = this.foods.map(function (s) { return { key: s.key, deluxe: s.deluxe }; });
      this.origToys = this.toys.map(function (s) { return { key: s.key, deluxe: s.deluxe }; });
      this.canFoods = [0, 1, 2].map(function (i) { return ST.canSwitchHome(d, 'food', i); });
      this.canToys = [0, 1, 2].map(function (i) { return ST.canSwitchHome(d, 'toy', i); });
      const all = window.PLS_TREASURE.list(this.petId);
      this.allFoods = all.filter(function (it) { return it.type === 'food'; });
      this.allToys = all.filter(function (it) { return it.type === 'toy'; });
      this.tab = 'food';
      this.activeIdx = this._firstEditable('food');
      this.note = ''; this.scrollY = 0;
      this._syncScroll();
    },
    _curCan: function () { return this.tab === 'food' ? this.canFoods : this.canToys; },
    _curWork: function () { return this.tab === 'food' ? this.foods : this.toys; },
    _curAll: function () { return this.tab === 'food' ? this.allFoods : this.allToys; },
    _firstEditable: function (tab) {
      const can = tab === 'food' ? this.canFoods : this.canToys;
      for (let i = 0; i < 3; i++) if (can[i]) return i;
      return 0;
    },
    _syncScroll: function () {
      const n = this._curAll().length;
      const rows = Math.max(1, Math.ceil(n / GRID.cols));
      const contentBottom = GRID_Y0 + rows * (GRID.ch + GRID.gap) + 24;
      this.maxScroll = Math.max(0, contentBottom - (H - 112));
      this.scrollY = Math.max(0, Math.min(this.scrollY, this.maxScroll));
    },
    _say: function (msg) { this.note = msg; this.noteUntil = PLS.t + 2.4; PLS.sfx.wrong(); },

    setTab: function (tab) { this.tab = tab; this.activeIdx = this._firstEditable(tab); this.scrollY = 0; this._syncScroll(); },
    chooseSlot: function (tab, idx) {
      const can = tab === 'food' ? this.canFoods : this.canToys;
      this.tab = tab; this.scrollY = 0; this._syncScroll();
      if (!can[idx]) { this.activeIdx = idx; this._say((tab === 'food' ? '食物格 ' : '玩具格 ') + (idx + 1) + ' 今天已換過了,明天再來喔'); return; }
      this.activeIdx = idx;
    },
    chooseItem: function (it) {
      const can = this._curCan();
      if (!can[this.activeIdx]) { this._say('這一格今天已換過了,先選別格'); return; }
      const work = this._curWork(), cur = work[this.activeIdx];
      if (cur.key === it.key && !!cur.deluxe === !!it.deluxe) { work[this.activeIdx] = { key: null, deluxe: false }; }
      else { work[this.activeIdx] = { key: it.key, deluxe: !!it.deluxe }; }
      PLS.sfx.tap();
    },
    confirm: function () {
      const d = ST.load(this.petId);
      let changed = false;
      const apply = function (work, orig, can, kind) {
        for (let i = 0; i < 3; i++) {
          const diff = work[i].key !== orig[i].key || !!work[i].deluxe !== !!orig[i].deluxe;
          if (diff && can[i]) { ST.setHomeItem(d, kind, i, work[i].key, work[i].deluxe); changed = true; }
        }
      };
      apply(this.foods, this.origFoods, this.canFoods, 'food');
      apply(this.toys, this.origToys, this.canToys, 'toy');
      if (changed) { PLS.sfx.correct(); PLS.burst(W / 2, H - 64, 'small'); }
      PLS.go('room', { pet: this.petId });
    },

    // ── 輸入 ──
    pointer: function (phase, x, y) {
      const self = this;
      if (phase === 'down') {
        if (this.maxScroll > 2 && x >= W - 46) { this._sbdrag = true; this.scrollFromBar(y); return; }
        this._py = y; this._ps = this.scrollY; this._drag = false; this._pdown = true;
      } else if (phase === 'move') {
        if (this._sbdrag) { this.scrollFromBar(y); return; }
        if (!this._pdown) return;
        const dy = y - this._py;
        if (Math.abs(dy) > 6) this._drag = true;
        if (y >= CLIP_TOP) this.scrollY = Math.max(0, Math.min(this.maxScroll, this._ps - dy));
      } else if (phase === 'up') {
        this._pdown = false;
        if (this._sbdrag) { this._sbdrag = false; return; }
        if (this._drag) { this._drag = false; return; }
        // 底部按鈕
        if (inRect(x, y, CANCEL)) { PLS.go('room', { pet: this.petId }); return; }
        if (inRect(x, y, CONFIRM)) { this.confirm(); return; }
        // 分頁
        if (inCenter(x, y, TAB_FOOD)) { this.setTab('food'); return; }
        if (inCenter(x, y, TAB_TOY)) { this.setTab('toy'); return; }
        // 格子(食物 / 玩具)
        if (y >= SL_Y - SL_H / 2 - 6 && y <= SL_Y + SL_H / 2 + 6) {
          for (let i = 0; i < 3; i++) if (Math.abs(x - FCX[i]) <= SL_W / 2) { this.chooseSlot('food', i); return; }
          for (let i = 0; i < 3; i++) if (Math.abs(x - TCX[i]) <= SL_W / 2) { this.chooseSlot('toy', i); return; }
          return;
        }
        // 道具格
        if (y >= CLIP_TOP && y < H - 112) {
          const cy = y + this.scrollY;
          const items = this._curAll();
          for (let i = 0; i < items.length; i++) {
            const c = i % GRID.cols, r = Math.floor(i / GRID.cols);
            const bx = GRID.x0 + c * (GRID.cw + GRID.gap), by = GRID_Y0 + r * (GRID.ch + GRID.gap);
            if (x >= bx && x <= bx + GRID.cw && cy >= by && cy <= by + GRID.ch) { this.chooseItem(items[i]); return; }
          }
        }
      }
    },
    onWheel: function (dy) { this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY + dy)); },
    thumbRect: function () {
      const top = CLIP_TOP + 6, bot = H - 116, trackH = bot - top;
      const viewH = (H - 112) - CLIP_TOP, contentH = this.maxScroll + viewH;
      const th = Math.max(60, Math.min(trackH, trackH * viewH / contentH));
      const raw = top + (trackH - th) * (this.maxScroll ? this.scrollY / this.maxScroll : 0);
      const ty = Math.max(top, Math.min(top + trackH - th, raw));
      return { x: W - 28, w: 14, top: top, trackH: trackH, th: th, ty: ty };
    },
    scrollFromBar: function (y) {
      const r = this.thumbRect();
      const tt = (y - r.top - r.th / 2) / (r.trackH - r.th);
      this.scrollY = Math.max(0, Math.min(this.maxScroll, tt * this.maxScroll));
    },

    // ── 繪製 ──
    _slotMatch: function (work, it) { return work.key === it.key && !!work.deluxe === !!it.deluxe; },
    draw: function (ctx, t) {
      const self = this, pid = this.petId, th = CFG.pets[pid].theme;
      const name = ST.load(pid).name || CFG.pets[pid].name;
      ctx.fillStyle = '#FBF1E2'; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
      ctx.fillStyle = 'rgba(214,178,146,0.12)';
      for (let yy = 60; yy < H; yy += 88) for (let xx = (Math.floor(yy / 88) % 2 ? 50 : 94); xx < W; xx += 88) { el(ctx, xx, yy, 6, 6); ctx.fill(); }
      ctx.restore();

      // 標題
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '46px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText('布置' + name + '的家', W / 2, 60);
      ctx.fillStyle = th.deep; ctx.fillText('布置' + name + '的家', W / 2, 56);
      A.pill(ctx, W / 2, 110, '慢慢挑 ── 食物三格、玩具三格,選好再按「確定佈置」', '#B07A52', 'rgba(255,247,228,0.96)', 21);

      // 六格擺設盤
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.12)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
      ctx.fillStyle = '#FFFCF6'; rr(ctx, TRAY.x, TRAY.y, TRAY.w, TRAY.h, 26); ctx.fill();
      ctx.restore();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '24px ' + FONT;
      ctx.fillStyle = '#C2791E'; ctx.fillText('食物 ×3', 270, 182);
      ctx.fillStyle = '#4E8A5A'; ctx.fillText('玩具 ×3', 810, 182);
      // 食物格
      this.foods.forEach(function (s, i) {
        const active = self.tab === 'food' && self.activeIdx === i, locked = !self.canFoods[i];
        slotBox(ctx, FCX[i], SL_Y, active, '#F2BD58', '#FFF3DC');
        if (s.key) { if (s.deluxe) A.drawFoodDeluxe(ctx, s.key, FCX[i], SL_Y, 0.8); else A.drawFood(ctx, s.key, FCX[i], SL_Y, 0.84); }
        else plusMark(ctx, FCX[i], SL_Y, 'rgba(194,121,30,0.45)');
        if (locked) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#FFF3DC'; rr(ctx, FCX[i] - SL_W / 2, SL_Y - SL_H / 2, SL_W, SL_H, 18); ctx.fill(); ctx.globalAlpha = 1; A.drawIcon(ctx, 'lock', FCX[i], SL_Y, 0.7, '#C9A06A'); }
        else if (active) A.pill(ctx, FCX[i], SL_Y - 64, '正在選這格', '#C2791E', '#FFF3DC', 15);
      });
      // 玩具格
      this.toys.forEach(function (s, i) {
        const active = self.tab === 'toy' && self.activeIdx === i, locked = !self.canToys[i];
        slotBox(ctx, TCX[i], SL_Y, active, '#6FA86A', '#EEF6EC');
        if (s.key) { if (s.deluxe) TOY.drawToyDeluxe(ctx, s.key, TCX[i], SL_Y, 0.78); else TOY.drawToy(ctx, s.key, TCX[i], SL_Y, 0.82); }
        else plusMark(ctx, TCX[i], SL_Y, 'rgba(78,138,90,0.45)');
        if (locked) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#EEF6EC'; rr(ctx, TCX[i] - SL_W / 2, SL_Y - SL_H / 2, SL_W, SL_H, 18); ctx.fill(); ctx.globalAlpha = 1; A.drawIcon(ctx, 'lock', TCX[i], SL_Y, 0.7, '#6FA86A'); }
        else if (active) A.pill(ctx, TCX[i], SL_Y - 64, '正在選這格', '#4E8A5A', '#EEF6EC', 15);
      });

      // 分頁 + 指示
      const fActive = this.tab === 'food';
      A.pill(ctx, TAB_FOOD.cx, TAB_FOOD.cy, '食物', fActive ? '#FFFFFF' : '#9A7B5C', fActive ? '#C2894C' : 'rgba(255,255,255,0.9)', 22);
      A.pill(ctx, TAB_TOY.cx, TAB_TOY.cy, '玩具', !fActive ? '#FFFFFF' : '#9A7B5C', !fActive ? '#5E9E6E' : 'rgba(255,255,255,0.9)', 22);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '21px ' + FONT; ctx.fillStyle = '#9A7060';
      ctx.fillText('點' + (fActive ? '食物' : '玩具') + ' → 放進上面那一格(可以一直換,不會跳走)', 344, 348);

      // 道具格(可捲動)
      const items = this._curAll(), work = this._curWork();
      ctx.save();
      ctx.beginPath(); ctx.rect(0, CLIP_TOP, W, (H - 112) - CLIP_TOP); ctx.clip();
      ctx.translate(0, -this.scrollY);
      if (!items.length) {
        ctx.textAlign = 'center'; ctx.font = '24px ' + FONT; ctx.fillStyle = '#A8927A';
        ctx.fillText(fActive ? '先去數學餐廳過關,拿到食物就能擺!' : '先去英文遊戲間玩,拿到玩具就能擺!', W / 2, GRID_Y0 + 80);
      }
      items.forEach(function (it, i) {
        const c = i % GRID.cols, r = Math.floor(i / GRID.cols);
        const x = GRID.x0 + c * (GRID.cw + GRID.gap), y = GRID_Y0 + r * (GRID.ch + GRID.gap);
        const sel = work.some(function (wsl) { return self._slotMatch(wsl, it); });
        ctx.save();
        ctx.shadowColor = 'rgba(150,100,60,0.12)'; ctx.shadowBlur = 9; ctx.shadowOffsetY = 3;
        ctx.fillStyle = sel ? (fActive ? '#FFF3DC' : '#EEF6EC') : '#FFFCF6'; rr(ctx, x, y, GRID.cw, GRID.ch, 18); ctx.fill();
        ctx.restore();
        if (sel) { ctx.strokeStyle = fActive ? '#F2BD58' : '#6FA86A'; ctx.lineWidth = 4; rr(ctx, x, y, GRID.cw, GRID.ch, 18); ctx.stroke(); }
        if (it.type === 'food') { if (it.deluxe) A.drawFoodDeluxe(ctx, it.key, x + GRID.cw / 2, y + GRID.ch / 2 - 12, 0.82); else A.drawFood(ctx, it.key, x + GRID.cw / 2, y + GRID.ch / 2 - 12, 0.86); }
        else TOY.drawTreasure(ctx, it.key, it.type, x + GRID.cw / 2, y + GRID.ch / 2 - 12, 0.82);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '20px ' + FONT; ctx.fillStyle = '#7A5C3E';
        ctx.fillText(it.label, x + GRID.cw / 2, y + GRID.ch - 22);
        if (sel) { ctx.fillStyle = fActive ? '#F2BD58' : '#6FA86A'; el(ctx, x + GRID.cw - 22, y + 22, 15, 15); ctx.fill(); check(ctx, x + GRID.cw - 22, y + 22, '#FFFFFF'); }
      });
      ctx.restore();
      // 捲軸
      if (this.maxScroll > 2) {
        const r = this.thumbRect();
        ctx.fillStyle = 'rgba(180,150,120,0.16)'; rr(ctx, r.x, r.top, r.w, r.trackH, r.w / 2); ctx.fill();
        ctx.fillStyle = 'rgba(176,138,94,0.72)'; rr(ctx, r.x, r.ty, r.w, r.th, r.w / 2); ctx.fill();
      }

      // 底部:取消 / 確定佈置
      ctx.fillStyle = '#F2E6D4'; rr(ctx, CANCEL.x, CANCEL.y, CANCEL.w, CANCEL.h, 20); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '26px ' + FONT; ctx.fillStyle = '#9A7B5C';
      ctx.fillText('取消', CANCEL.x + CANCEL.w / 2, CANCEL.y + CANCEL.h / 2);
      const pulse = 1 + Math.sin(t * 2.4) * 0.012;
      ctx.save();
      ctx.translate(CONFIRM.x + CONFIRM.w / 2, CONFIRM.y + CONFIRM.h / 2); ctx.scale(pulse, pulse);
      ctx.translate(-(CONFIRM.x + CONFIRM.w / 2), -(CONFIRM.y + CONFIRM.h / 2));
      ctx.shadowColor = 'rgba(200,120,40,0.35)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
      ctx.fillStyle = '#F2A85C'; rr(ctx, CONFIRM.x, CONFIRM.y, CONFIRM.w, CONFIRM.h, 26); ctx.fill();
      ctx.restore();
      A.drawIcon(ctx, 'check', CONFIRM.x + 60, CONFIRM.y + CONFIRM.h / 2, 1.0, '#FFFFFF');
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '32px ' + FONT; ctx.fillStyle = '#FFFFFF';
      ctx.fillText('確定佈置,回房間', CONFIRM.x + 98, CONFIRM.y + CONFIRM.h / 2 + 1);
    },
    drawTop: function (ctx, t) {
      if (this.note && PLS.t < this.noteUntil) A.bubble(ctx, W / 2, H - 150, this.note, { size: 23 });
    }
  };

  PLS.register('shelf', shelf);
  window.PLS_SHELF2 = true;
})();
