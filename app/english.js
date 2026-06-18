// english.js — 英文遊戲間 — 寬版(平板橫向)
// 玩法 play: pick(聽音選字母) | match(大小寫配對) | trace(描寫) | write(自己寫)
(function () {
  const PLS = window.PLS, A = window.PLS_ART, P = window.PLS_PETS, TOY = window.PLS_TOY;
  const CFG = window.PLS_CONFIG, ST = window.PLS_STORE;
  const W = PLS.W, H = PLS.H, FONT = A.FONT;

  function pickTalk(list) { return list[Math.floor(Math.random() * list.length)]; }
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = ri(0, i); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  const UP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const WORDS_CVC = [
    'cat', 'dog', 'sun', 'hat', 'pig', 'cup', 'bus', 'bed', 'box', 'pen', 'bag', 'fox',
    'ant', 'bee', 'cow', 'egg', 'fan', 'hen', 'jam', 'leg', 'map',
    'net', 'owl', 'pot', 'rat', 'sit', 'top', 'van', 'wet', 'yak', 'zip'
  ];
  // magic-e 小學 長母音單字(e7b 關卡用)
  const WORDS_MAGIC_E = [
    'kite', 'cake', 'bike', 'gate', 'home', 'rose', 'game', 'name', 'bone', 'tune', 'cube', 'lake'
  ];
  function sayWord(w) { if (w) PLS.say(w.toLowerCase(), 'en-US'); }

  const MAP_XS = [330, 600, 870, 600];
  const MAP_Y0 = 256, MAP_STEP = 86, TOP_BAND = 184;

  // 英文遊戲間的牆面(偏清新薄荷)
  const FY = 690;
  function drawRoom(ctx) {
    ctx.fillStyle = '#EEF2EA'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(150,190,165,0.14)';
    for (let yy = 60; yy < FY; yy += 90)
      for (let xx = Math.floor(yy / 90) % 2 ? 50 : 95; xx < W; xx += 90) { A.el(ctx, xx, yy, 7, 7); ctx.fill(); }
    ctx.fillStyle = '#DCE7D8'; ctx.fillRect(0, FY, W, H - FY);
    ctx.strokeStyle = 'rgba(150,180,150,0.4)'; ctx.lineWidth = 2;
    for (let xx = 0; xx < W + 60; xx += 120) {
      ctx.beginPath(); ctx.moveTo(xx, FY); ctx.lineTo(xx - 40, H); ctx.stroke();
    }
    const rg = ctx.createRadialGradient(W / 2, 80, 40, W / 2, 80, 700);
    rg.addColorStop(0, 'rgba(255,225,150,0.18)'); rg.addColorStop(1, 'rgba(255,225,150,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, 700);
  }

  function backButton(toScreen, petId) {
    PLS.addButton({
      x: 30, y: 30, w: 84, h: 84,
      draw: function (ctx) {
        ctx.fillStyle = 'rgba(255,255,255,0.92)'; A.rr(ctx, 30, 30, 84, 84, 26); ctx.fill();
        A.drawIcon(ctx, 'back', 72, 72, 1.1, '#6E8B72');
      },
      onTap: function () { PLS.go(toScreen, { pet: petId }); }
    });
  }

  // ════════════════════════════════════════════════════
  // 英文遊戲間:關卡圖
  // ════════════════════════════════════════════════════
  const emap = {
    petId: 'rabbit', nodes: [], note: '',
    enter: function (params) {
      this.petId = params.pet || 'rabbit';
      this.note = '';
      this.scrollY = 0; this._pdown = false; this._drag = false; this._sbdrag = false;
      this._enteredAt = Date.now(); // 防止切換畫面時誤觸節點
      this.nodes = CFG.english.map(function (lv, i) {
        return { lv: lv, i: i, x: MAP_XS[i % 4], y: MAP_Y0 + i * MAP_STEP };
      });
      const lastY = this.nodes.length ? this.nodes[this.nodes.length - 1].y : MAP_Y0;
      this.maxScroll = Math.max(0, (lastY + 150) - (H - 70));
      backButton('room', this.petId);
    },
    pointer: function (phase, x, y) {
      if (phase === 'down') {
        if (this.maxScroll > 2 && x >= W - 46) { this._sbdrag = true; this.scrollFromBar(y); return; }
        this._py = y; this._ps = this.scrollY; this._drag = false; this._pdown = true;
      } else if (phase === 'move') {
        if (this._sbdrag) { this.scrollFromBar(y); return; }
        if (!this._pdown) return;
        const dy = y - this._py;
        if (Math.abs(dy) > 6) this._drag = true;
        this.scrollY = Math.max(0, Math.min(this.maxScroll, this._ps - dy));
      } else if (phase === 'up') {
        if (this._sbdrag) { this._sbdrag = false; return; }
        this._pdown = false;
        if (this._drag) { this._drag = false; return; }
        if (y < TOP_BAND - 6) return;
        // 剛進入畫面 350ms 內忽略 tap，防止「收下玩具」誤觸下一關
        if (Date.now() - (this._enteredAt || 0) < 350) return;
        const cy = y + this.scrollY;
        for (let k = 0; k < this.nodes.length; k++) {
          const n = this.nodes[k], dx = x - n.x, dyy = cy - n.y;
          if (dx * dx + dyy * dyy <= 66 * 66) { this.tapNode(n); break; }
        }
      }
    },
    onWheel: function (dy) { this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY + dy)); },
    thumbRect: function () {
      const top = 200, bot = H - 24, trackH = bot - top, viewH = H - TOP_BAND;
      const contentH = this.maxScroll + viewH;
      const th = Math.max(70, trackH * viewH / contentH);
      const ty = top + (trackH - th) * (this.maxScroll ? this.scrollY / this.maxScroll : 0);
      return { x: W - 28, w: 14, top: top, trackH: trackH, th: th, ty: ty };
    },
    scrollFromBar: function (y) {
      const r = this.thumbRect();
      const t = (y - r.top - r.th / 2) / (r.trackH - r.th);
      this.scrollY = Math.max(0, Math.min(this.maxScroll, t * this.maxScroll));
    },
    tapNode: function (n) {
      const d = ST.load(this.petId);
      const state = ST.levelState(d, CFG.english, n.i);
      if (state === 'locked' || !n.lv.play) {
        this.note = n.lv.soon ? '這個玩具還在做喔,等一下下!' : '先把上一關玩完,就會開門囉';
        PLS.sfx.wrong(); return;
      }
      const remain = ST.remainToday(d, 'english');
      const practice = ST.clearedToday(d, n.lv.id) || remain <= 0;
      PLS.go('eplay', { pet: this.petId, levelIdx: n.i, practice: practice });
    },
    drawNode: function (ctx, t, n) {
      const d = ST.load(this.petId);
      const state = ST.levelState(d, CFG.english, n.i);
      const x = n.x, y = n.y;
      ctx.save();
      if (state === 'locked') ctx.globalAlpha = 0.7;
      ctx.save();
      ctx.shadowColor = 'rgba(110,140,115,0.18)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      ctx.fillStyle = state === 'locked' ? '#EEF0E8' : '#FFFFFF';
      A.el(ctx, x, y, 54, 54); ctx.fill();
      ctx.restore();
      if (state === 'cleared') { ctx.strokeStyle = '#F2BD58'; ctx.lineWidth = 6; A.el(ctx, x, y, 54, 54); ctx.stroke(); }
      else if (state === 'open') {
        const p = 1 + Math.sin(t * 2.4) * 0.05;
        ctx.strokeStyle = 'rgba(143,201,168,0.95)'; ctx.lineWidth = 5;
        A.el(ctx, x, y, 56 * p, 56 * p); ctx.stroke();
      }
      const tk = n.lv.toyArt && n.lv.toyArt[this.petId];
      if (tk) TOY.drawToy(ctx, tk, x, y, 0.66);
      else { ctx.fillStyle = 'rgba(150,170,150,0.5)'; ctx.font = '46px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x, y + 2); }
      if (state === 'cleared') {
        const clears = ST.clearCount(d, n.lv.id);
        window.PLS_CLEARBADGE(ctx, x + 40, y - 42, clears, clears >= ST.deluxeAt());
      }
      if (state === 'locked') {
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.shadowColor = 'rgba(110,140,115,0.18)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
        ctx.fillStyle = '#F5F7F0'; A.el(ctx, x + 40, y - 36, 18, 18); ctx.fill();
        ctx.restore();
        A.drawIcon(ctx, 'lock', x + 40, y - 36, 0.92, '#8FA58F');
      }
      // 關卡編號(永遠顯示在左上角)
      window.PLS_NUMBADGE(ctx, x - 40, y - 40, n.i + 1, '#6E9A6E');
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '26px ' + FONT; ctx.fillStyle = '#56684E';
      ctx.fillText(n.lv.name, x, y + 80);
      ctx.font = '20px ' + FONT; ctx.fillStyle = '#8AA08A';
      ctx.fillText(n.lv.sub, x, y + 108);
      ctx.restore();
    },
    draw: function (ctx, t) {
      drawRoom(ctx);
      const d = ST.load(this.petId);
      const remain = ST.remainToday(d, 'english');
      const self = this;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, TOP_BAND, W, H - TOP_BAND); ctx.clip();
      ctx.translate(0, -this.scrollY);
      ctx.strokeStyle = 'rgba(150,185,155,0.45)'; ctx.lineWidth = 10;
      ctx.setLineDash([2, 22]); ctx.lineCap = 'round';
      ctx.beginPath();
      this.nodes.forEach(function (n, i) { ctx[i ? 'lineTo' : 'moveTo'](n.x, n.y); });
      ctx.stroke(); ctx.setLineDash([]);
      this.nodes.forEach(function (n) { self.drawNode(ctx, t, n); });
      ctx.restore();

      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '50px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText('英文遊戲間', W / 2, 74);
      ctx.fillStyle = '#5E7A56'; ctx.fillText('英文遊戲間', W / 2, 70);
      A.pill(ctx, W / 2, 134,
        ST.isTest() ? '測試版 · 所有關卡已解鎖'
          : remain > 0 ? '今天還可以拿 ' + remain + ' 個玩具' : '今天玩具拿夠了!其他關可以練習',
        '#6E9A6E', 'rgba(255,255,255,0.92)', 23);
      if (this.scrollY < this.maxScroll - 2)
        A.pill(ctx, W / 2, H - 38, '往下滑,還有更多關卡 ↓', '#6E9A6E', 'rgba(255,255,255,0.92)', 22);
      if (this.maxScroll > 2) {
        const r = this.thumbRect();
        ctx.fillStyle = 'rgba(150,180,150,0.16)'; A.rr(ctx, r.x, r.top, r.w, r.trackH, r.w / 2); ctx.fill();
        ctx.fillStyle = 'rgba(120,160,120,0.72)'; A.rr(ctx, r.x, r.ty, r.w, r.th, r.w / 2); ctx.fill();
      }
    },
    drawTop: function (ctx, t) { if (this.note) A.bubble(ctx, W / 2, H - 96, this.note, { size: 23 }); }
  };

  // ════════════════════════════════════════════════════
  // 玩法:eplay
  // ════════════════════════════════════════════════════
  const PC = { x: 160, y: 158, w: 874, h: 292 };        // pick/match 提示卡
  const TILE = { w: 230, h: 200, gap: 40, y: 498 };
  const TCARD = { x: 332, y: 196, w: 700, h: 392 };     // trace 描寫畫布
  // 自己寫:6 個字母框
  const BOX = { n: 6, w: 165, h: 200, gap: 16, y: 296 };
  BOX.x0 = (W - (BOX.n * BOX.w + (BOX.n - 1) * BOX.gap)) / 2;
  // 拼字(spell):字母槽 + 字母庫
  const SLOT = { w: 150, h: 170, gap: 28, y: 336 };
  SLOT.x0 = (W - (3 * SLOT.w + 2 * SLOT.gap)) / 2;
  const BANK = { w: 124, h: 124, gap: 20, y: 566 };
  BANK.x0 = (W - (6 * BANK.w + 5 * BANK.gap)) / 2;
  // 單字手寫(wword):每個字母一格
  const WB = { w: 200, h: 240, gap: 30, y: 296 };

  // 把大寫字母唸出來(用小寫,語音才不會多唸 "Capital")
  function sayLetter(ch) { if (ch) PLS.say(ch.toLowerCase(), 'en-US'); }

  // 共用:描寫卡(白卡 + 四線格 + 筆順骨架/示範 + 玩家筆畫)。reveal=null 不示範。
  // 給「描寫關卡」與「字母手寫練習」共用,字形/版面才一致。
  function renderTraceCard(ctx, letter, strokes, accent, reveal) {
    ctx.save();
    ctx.shadowColor = 'rgba(110,140,115,0.14)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#FFFFFF'; A.rr(ctx, TCARD.x, TCARD.y, TCARD.w, TCARD.h, 30); ctx.fill();
    ctx.restore();
    const cardCx = TCARD.x + TCARD.w / 2, cardCy = TCARD.y + TCARD.h / 2;
    const LcY = cardCy + 4, Lh = 230;
    const gx0 = TCARD.x + 44, gx1 = TCARD.x + TCARD.w - 44;
    const lnTop = LcY - Lh / 2, lnBase = LcY + Lh / 2, lnDesc = LcY + Lh * 0.78;
    ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(150,180,150,0.45)'; ctx.lineWidth = 2;
    [lnTop, lnBase].forEach(function (yy) { ctx.beginPath(); ctx.moveTo(gx0, yy); ctx.lineTo(gx1, yy); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(150,180,150,0.3)'; ctx.lineWidth = 2; ctx.setLineDash([6, 10]);
    [LcY, lnDesc].forEach(function (yy) { ctx.beginPath(); ctx.moveTo(gx0, yy); ctx.lineTo(gx1, yy); ctx.stroke(); });
    ctx.setLineDash([]);
    if (letter) {
      const L = window.PLS_LETTERS;
      if (L && L.has(letter)) {
        L.draw(ctx, letter, { cx: cardCx, cy: LcY, h: Lh, color: '#E7E0CF', showOrder: true, badgeColor: '#7FB08E', arrowColor: '#C9BC9C', reveal: reveal, penColor: accent });
      } else {
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.font = '700 270px ' + FONT;
        ctx.fillStyle = '#ECE7DA'; ctx.fillText(letter, cardCx, lnBase);
        ctx.strokeStyle = '#CFC4AC'; ctx.lineWidth = 3; ctx.setLineDash([4, 14]);
        ctx.strokeText(letter, cardCx, lnBase); ctx.setLineDash([]);
      }
    }
    // 玩家筆畫
    ctx.strokeStyle = accent; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    strokes.forEach(function (s) {
      if (s.length < 2) { if (s.length === 1) { ctx.fillStyle = accent; A.el(ctx, s[0].x, s[0].y, 8, 8); ctx.fill(); } return; }
      ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y);
      for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
      ctx.stroke();
    });
  }

  // 共用:依 demo 狀態(物件 {on,t0,dur})算出 reveal(0~1 或 null),示範結束會把 on 設 false。
  function demoReveal(demo) {
    if (!demo || !demo.on) return null;
    const e = PLS.t - demo.t0;
    if (e < 0) return 0;
    if (e >= demo.dur) { demo.on = false; return null; }
    return e / demo.dur;
  }

  const eplay = {
    enter: function (params) {
      const self = this;
      this.petId = params.pet;
      this.levelIdx = params.levelIdx;
      this.practice = !!params.practice;
      this.lv = CFG.english[this.levelIdx];
      this.mode = this.lv.play;
      this.count = this.lv.count || 10;
      this.qIndex = 0;
      this.firstTryCount = 0;
      this.accent = CFG.pets[this.petId].theme.accent;
      this.deep = CFG.pets[this.petId].theme.deep;
      this.bubbleText = pickTalk(CFG.talkEng.welcome);
      this.bubbleUntil = PLS.t + 2.6;
      this.locked = false;
      this.tiles = [];
      this.strokes = []; this.cur = null; this.drawnLen = 0;
      this.boxes = []; this.curBox = null;
      this.deck = shuffle(UP.slice());
      // 依關卡設定選用正確的單字庫：spell 用純三字母、wpick 依層級分 CVC / magic-e
      var wordPool;
      if (this.mode === 'spell') {
        wordPool = WORDS_CVC.filter(function (w) { return w.length === 3; });
      } else if (this.lv.wordPool === 'magic_e') {
        wordPool = WORDS_MAGIC_E;
      } else {
        wordPool = WORDS_CVC;
      }
      this.wordDeck = shuffle(wordPool.slice());
      this.slots = ['', '', '']; this.slotFrom = [null, null, null]; this.bank = [];

      backButton('emap', this.petId);
      // 喇叭(再聽一次)
      PLS.addButton({
        x: W - 114, y: 30, w: 84, h: 84,
        draw: function (ctx) {
          ctx.fillStyle = 'rgba(255,255,255,0.92)'; A.rr(ctx, W - 114, 30, 84, 84, 26); ctx.fill();
          A.drawIcon(ctx, 'speaker', W - 72, 72, 1.05, '#6E8B72');
        },
        onTap: function () { self.replay(); }
      });

      if (this.mode === 'pick' || this.mode === 'match' || this.mode === 'wpick') {
        const x0 = (PC.x + PC.w / 2) - (TILE.w * 3 + TILE.gap * 2) / 2;
        for (let i = 0; i < 3; i++) (function (i) {
          const bx = x0 + i * (TILE.w + TILE.gap);
          const b = PLS.addButton({
            x: bx, y: TILE.y, w: TILE.w, h: TILE.h,
            draw: function (ctx, t) { self.drawTile(ctx, t, i, bx, TILE.y, TILE.w, TILE.h); },
            disabled: function () { return self.locked || !self.q || (self.wrong && self.wrong.has(i)); },
            onTap: function () { self.answer(i); }
          });
          self.tiles.push(b);
        })(i);
      } else if (this.mode === 'spell') {
        for (let i = 0; i < 3; i++) (function (i) {
          const bx = SLOT.x0 + i * (SLOT.w + SLOT.gap);
          PLS.addButton({
            x: bx, y: SLOT.y, w: SLOT.w, h: SLOT.h,
            draw: function (ctx) { self.drawSlot(ctx, i, bx); },
            disabled: function () { return self.locked; },
            onTap: function () { self.removeSlot(i); }
          });
        })(i);
        for (let i = 0; i < 6; i++) (function (i) {
          const bx = BANK.x0 + i * (BANK.w + BANK.gap);
          PLS.addButton({
            x: bx, y: BANK.y, w: BANK.w, h: BANK.h,
            draw: function (ctx) { self.drawBank(ctx, i, bx); },
            disabled: function () { return self.locked || !self.bank[i] || self.bank[i].used; },
            onTap: function () { self.placeBank(i); }
          });
        })(i);
      } else {
        // 描寫 / 自己寫:清除 + 完成
        const by = this.mode === 'write' ? 540 : this.mode === 'wword' ? 568 : 622;
        PLS.addButton({
          x: W / 2 - 260, y: by, w: 240, h: 96,
          draw: function (ctx) {
            ctx.fillStyle = '#FFFFFF'; A.rr(ctx, W / 2 - 260, by, 240, 96, 28); ctx.fill();
            ctx.strokeStyle = '#D8E0D2'; ctx.lineWidth = 3; A.rr(ctx, W / 2 - 260, by, 240, 96, 28); ctx.stroke();
            ctx.font = '34px ' + FONT; ctx.fillStyle = '#8AA08A';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('清除', W / 2 - 140, by + 48);
          },
          onTap: function () { self.clearStrokes(); }
        });
        PLS.addButton({
          x: W / 2 + 20, y: by, w: 240, h: 96,
          draw: function (ctx, t) {
            const ready = self.hasEnough();
            ctx.save();
            ctx.shadowColor = 'rgba(120,150,110,0.28)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
            ctx.fillStyle = ready ? '#8FC9A8' : '#CDE0D2';
            const p = ready ? 1 + Math.sin(t * 3) * 0.02 : 1;
            ctx.translate(W / 2 + 140, by + 48); ctx.scale(p, p); ctx.translate(-(W / 2 + 140), -(by + 48));
            A.rr(ctx, W / 2 + 20, by, 240, 96, 28); ctx.fill();
            ctx.restore();
            ctx.font = '36px ' + FONT; ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('完成', W / 2 + 140, by + 48);
          },
          onTap: function () { self.finishStroke(); }
        });
        // 描寫:看筆順(重播筆順動畫)
        if (this.mode === 'trace') {
          PLS.addButton({
            x: 884, y: by, w: 230, h: 96,
            draw: function (ctx) {
              ctx.fillStyle = '#FFFFFF'; A.rr(ctx, 884, by, 230, 96, 28); ctx.fill();
              ctx.strokeStyle = '#D8E0D2'; ctx.lineWidth = 3; A.rr(ctx, 884, by, 230, 96, 28); ctx.stroke();
              ctx.font = '30px ' + FONT; ctx.fillStyle = '#8AA08A';
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText('看筆順', 999, by + 48);
            },
            onTap: function () { self.startDemo(0); }
          });
        }
      }
      this.next();
    },

    clearStrokes: function () {
      this.strokes = []; this.cur = null; this.drawnLen = 0;
      this.boxes.forEach(function (b) { b.strokes = []; b.len = 0; });
    },
    hasEnough: function () {
      if (this.mode === 'write') {
        const tb = this.boxes.find(function (b) { return b.letter === this.target; }, this);
        return tb && tb.len > 60;
      }
      if (this.mode === 'wword') {
        return this.boxes.length > 0 && this.boxes.every(function (b) { return b.len > 60; });
      }
      return this.drawnLen > 60;
    },

    next: function () {
      this.wrong = new Set();
      this.firstTry = true;
      this.clearStrokes();
      this.locked = false;
      const self = this;
      if (this.mode === 'pick') {
        const target = this.deck[this.qIndex % this.deck.length];
        const others = shuffle(UP.filter(function (c) { return c !== target; })).slice(0, 2);
        this.q = { letter: target, options: shuffle([target].concat(others)), answer: target };
        setTimeout(function () { sayLetter(target); }, 350);
      } else if (this.mode === 'match') {
        const target = this.deck[this.qIndex % this.deck.length];
        const others = shuffle(UP.filter(function (c) { return c !== target; })).slice(0, 2);
        // 顯示大寫,選對應小寫
        this.q = { letter: target, options: shuffle([target].concat(others)).map(function (c) { return c.toLowerCase(); }), answer: target.toLowerCase() };
        setTimeout(function () { sayLetter(target); }, 350);
      } else if (this.mode === 'write') {
        // 6 個字母框:其中一個是要寫的字母,其他是干擾
        const base = this.deck[this.qIndex % this.deck.length];
        const decoyBases = shuffle(UP.filter(function (c) { return c !== base; })).slice(0, BOX.n - 1);
        const cs = this.lv.cs;
        const disp = function (c) { return cs === 'lower' ? c.toLowerCase() : c; };
        const letters = shuffle([base].concat(decoyBases)).map(disp);
        this.target = disp(base);
        this.targetBase = base;
        this.boxes = letters.map(function (ch, i) {
          return {
            letter: ch,
            x: BOX.x0 + i * (BOX.w + BOX.gap), y: BOX.y, w: BOX.w, h: BOX.h,
            strokes: [], len: 0
          };
        });
        this.bubbleText = pickTalk(CFG.talkEng.write);
        this.bubbleUntil = PLS.t + 2.6;
        setTimeout(function () { sayLetter(base); }, 350);
      } else if (this.mode === 'wpick') {
        const target = this.wordDeck[this.qIndex % this.wordDeck.length];
        const others = shuffle(this.wordDeck.filter(function (w) { return w !== target; })).slice(0, 2);
        this.q = { word: target, options: shuffle([target].concat(others)), answer: target };
        this.bubbleText = pickTalk(CFG.talkEng.welcome);
        this.bubbleUntil = PLS.t + 2.2;
        setTimeout(function () { sayWord(target); }, 350);
      } else if (this.mode === 'spell') {
        const target = this.wordDeck[this.qIndex % this.wordDeck.length];
        this.word = target;
        this.slots = ['', '', ''];
        this.slotFrom = [null, null, null];
        const letters = target.split('');
        const decoys = shuffle(UP.filter(function (c) { return letters.indexOf(c.toLowerCase()) < 0; }))
          .slice(0, 3).map(function (c) { return c.toLowerCase(); });
        this.bank = shuffle(letters.concat(decoys)).map(function (ch) { return { ch: ch, used: false }; });
        this.bubbleText = '把字母排出這個單字';
        this.bubbleUntil = PLS.t + 2.6;
        setTimeout(function () { sayWord(target); }, 350);
      } else if (this.mode === 'wword') {
        const target = this.wordDeck[this.qIndex % this.wordDeck.length];
        this.word = target;
        const n = target.length;
        const x0 = (W - (n * WB.w + (n - 1) * WB.gap)) / 2;
        this.boxes = target.split('').map(function (ch, i) {
          return { letter: ch, x: x0 + i * (WB.w + WB.gap), y: WB.y, w: WB.w, h: WB.h, strokes: [], len: 0 };
        });
        this.bubbleText = pickTalk(CFG.talkEng.write);
        this.bubbleUntil = PLS.t + 2.6;
        setTimeout(function () { sayWord(target); }, 350);
      } else { // trace
        const base = this.deck[this.qIndex % this.deck.length];
        const ch = this.lv.cs === 'lower' ? base.toLowerCase() : base;
        this.q = { letter: ch, base: base };
        this.bubbleText = pickTalk(CFG.talkEng.trace);
        this.bubbleUntil = PLS.t + 2.6;
        setTimeout(function () { sayLetter(base); }, 350);
        this.startDemo(0.5);   // 新字母出現:自動示範一次筆順
      }
    },

    // 開始/重播筆順動畫(逐筆畫)。delay:延遲幾秒才開始。
    startDemo: function (delay) {
      const L = window.PLS_LETTERS;
      if (!this.q || !L || !L.has(this.q.letter)) { this.demoOn = false; return; }
      this.demoT0 = PLS.t + (delay || 0);
      this.demoDur = 0.75 * L.strokeCount(this.q.letter) + 0.5;   // 每筆約 0.75 秒
      this.demoOn = true;
    },

    replay: function () {
      if (this.mode === 'write') { sayLetter(this.targetBase); return; }
      if (this.mode === 'spell' || this.mode === 'wword') { sayWord(this.word); return; }
      if (this.mode === 'wpick') { if (this.q) sayWord(this.q.word); return; }
      if (!this.q) return;
      if (this.mode === 'match') sayLetter(this.q.letter);
      else sayLetter(this.q.base || this.q.letter);
    },

    // ── 選擇題(pick / match)──
    answer: function (i) {
      if (this.locked || !this.q) return;
      const self = this;
      const opt = this.q.options[i];
      if (opt === this.q.answer) {
        this.locked = true;
        if (this.firstTry) this.firstTryCount++;
        PLS.sfx.correct();
        const tile = this.tiles[i];
        PLS.burst(tile.x + tile.w / 2, tile.y + tile.h / 2, 'small');
        this.bubbleText = pickTalk(CFG.talkEng.correct);
        this.bubbleUntil = PLS.t + 1.6;
        setTimeout(function () { self.advance(); }, 1000);
      } else {
        this.wrong.add(i);
        this.firstTry = false;
        PLS.sfx.wrong();
        this.bubbleText = pickTalk(CFG.talkEng.wrong);
        this.bubbleUntil = PLS.t + 2;
        this.replay();
      }
    },

    // ── 拼字(spell)──
    placeBank: function (i) {
      if (this.locked || !this.bank[i] || this.bank[i].used) return;
      const slot = this.slots.indexOf('');
      if (slot < 0) return;
      this.slots[slot] = this.bank[i].ch;
      this.slotFrom[slot] = i;
      this.bank[i].used = true;
      if (this.slots.indexOf('') < 0) this.checkSpell();
    },
    removeSlot: function (i) {
      if (this.locked) return;
      if (this.slots[i] === '') { this.replay(); return; }
      const bi = this.slotFrom[i];
      if (bi != null && this.bank[bi]) this.bank[bi].used = false;
      this.slots[i] = ''; this.slotFrom[i] = null;
    },
    checkSpell: function () {
      const self = this;
      if (this.slots.join('') === this.word) {
        this.locked = true;
        if (this.firstTry) this.firstTryCount++;
        PLS.sfx.correct();
        PLS.burst(W / 2, SLOT.y + SLOT.h / 2, 'small');
        this.bubbleText = pickTalk(CFG.talkEng.correct);
        this.bubbleUntil = PLS.t + 1.6;
        sayWord(this.word);
        setTimeout(function () { self.advance(); }, 1150);
      } else {
        this.firstTry = false;
        PLS.sfx.wrong();
        this.bubbleText = pickTalk(CFG.talkEng.wrong);
        this.bubbleUntil = PLS.t + 2;
        setTimeout(function () {
          if (self.locked) return;
          self.slots = ['', '', '']; self.slotFrom = [null, null, null];
          self.bank.forEach(function (b) { b.used = false; });
        }, 700);
      }
    },

    // ── 描寫 / 自己寫:筆畫 ──
    pointer: function (phase, x, y) {
      if (this.mode === 'trace') {
        const inside = x >= TCARD.x && x <= TCARD.x + TCARD.w && y >= TCARD.y && y <= TCARD.y + TCARD.h;
        if (phase === 'down') {
          if (!inside) { this.cur = null; return; }
          this.cur = [{ x: x, y: y }]; this.strokes.push(this.cur);
        } else if (phase === 'move') {
          if (!this.cur) return;
          const last = this.cur[this.cur.length - 1];
          const cx = Math.max(TCARD.x, Math.min(TCARD.x + TCARD.w, x));
          const cy = Math.max(TCARD.y, Math.min(TCARD.y + TCARD.h, y));
          this.drawnLen += Math.hypot(cx - last.x, cy - last.y);
          this.cur.push({ x: cx, y: cy });
        } else if (phase === 'up') { this.cur = null; }
        return;
      }
      if (this.mode === 'write' || this.mode === 'wword') {
        if (phase === 'down') {
          this.curBox = null;
          for (let i = 0; i < this.boxes.length; i++) {
            const b = this.boxes[i];
            if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
              this.curBox = b; this.cur = [{ x: x, y: y }]; b.strokes.push(this.cur); break;
            }
          }
        } else if (phase === 'move') {
          if (!this.curBox || !this.cur) return;
          const b = this.curBox;
          const last = this.cur[this.cur.length - 1];
          const cx = Math.max(b.x, Math.min(b.x + b.w, x));
          const cy = Math.max(b.y, Math.min(b.y + b.h, y));
          b.len += Math.hypot(cx - last.x, cy - last.y);
          this.cur.push({ x: cx, y: cy });
        } else if (phase === 'up') { this.cur = null; this.curBox = null; }
      }
    },

    finishStroke: function () {
      const self = this;
      if (this.locked) return;
      if (this.mode === 'wword') {
        const unfinished = this.boxes.filter(function (b) { return b.len <= 60; });
        if (unfinished.length) {
          this.bubbleText = '每個格子都要寫滿喔';
          this.bubbleUntil = PLS.t + 2.2; PLS.sfx.wrong(); return;
        }
        this.locked = true;
        this.firstTryCount++;
        PLS.sfx.correct();
        this.boxes.forEach(function (b) { PLS.burst(b.x + b.w / 2, b.y + b.h / 2, 'small'); });
        this.bubbleText = pickTalk(CFG.talkEng.nice);
        this.bubbleUntil = PLS.t + 1.6;
        setTimeout(function () { self.advance(); }, 1100);
        return;
      }
      if (this.mode === 'write') {
        const tb = this.boxes.find(function (b) { return b.letter === this.target; }, this);
        const other = this.boxes.filter(function (b) { return b !== tb; });
        const maxOther = other.reduce(function (m, b) { return Math.max(m, b.len); }, 0);
        if (!tb || tb.len <= 60) {
          // 還沒寫,或寫在別的框
          if (maxOther > 60) this.bubbleText = '要寫在「' + this.target + '」的框框裡喔';
          else this.bubbleText = '在「' + this.target + '」的框框裡寫寫看';
          this.bubbleUntil = PLS.t + 2.2; PLS.sfx.wrong(); return;
        }
        if (maxOther > tb.len) {
          this.bubbleText = '再看一次,要寫在「' + this.target + '」的框框裡喔';
          this.bubbleUntil = PLS.t + 2.2; PLS.sfx.wrong(); return;
        }
        // 其他框框不能有明顯筆跡(只要答對的那格有寫才算過關)
        if (maxOther > 50) {
          this.bubbleText = '只要寫在「' + this.target + '」的框框裡就好喔';
          this.bubbleUntil = PLS.t + 2.2; PLS.sfx.wrong(); return;
        }
        this.locked = true;
        this.firstTryCount++;
        PLS.sfx.correct();
        PLS.burst(tb.x + tb.w / 2, tb.y + tb.h / 2, 'small');
        this.bubbleText = pickTalk(CFG.talkEng.nice);
        this.bubbleUntil = PLS.t + 1.6;
        setTimeout(function () { self.advance(); }, 1100);
        return;
      }
      // trace
      if (this.drawnLen <= 60) {
        this.bubbleText = '沿著線描描看再按完成喔';
        this.bubbleUntil = PLS.t + 2; PLS.sfx.wrong(); return;
      }
      this.locked = true;
      this.firstTryCount++;
      PLS.sfx.correct();
      PLS.burst(TCARD.x + TCARD.w / 2, TCARD.y + TCARD.h / 2, 'small');
      this.bubbleText = pickTalk(CFG.talkEng.nice);
      this.bubbleUntil = PLS.t + 1.6;
      setTimeout(function () { self.advance(); }, 1100);
    },

    advance: function () {
      this.qIndex++;
      if (this.qIndex >= this.count) {
        const d = ST.load(this.petId);
        const res = ST.recordRun(d, 'english', this.lv.id, this.count, this.count, this.practice);
        if (res.feast) PLS.go('etoy', { pet: this.petId, levelIdx: this.levelIdx, deluxe: res.deluxe, clears: res.clears });
        else PLS.go('eresult', { pet: this.petId, levelIdx: this.levelIdx, practice: this.practice });
      } else { this.next(); }
    },

    drawTile: function (ctx, t, i, x, y, w, h) {
      const q = this.q; if (!q) return;
      const dead = this.wrong.has(i);
      ctx.save();
      if (dead) ctx.globalAlpha = 0.35;
      ctx.save();
      ctx.shadowColor = 'rgba(110,140,115,0.16)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
      ctx.fillStyle = dead ? '#EEF0E8' : '#FFFFFF';
      A.rr(ctx, x, y, w, h, 28); ctx.fill();
      ctx.restore();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = this.mode === 'wpick' ? '700 64px ' + FONT : '700 120px ' + FONT;
      ctx.fillStyle = this.deep;
      ctx.fillText(q.options[i], x + w / 2, y + h / 2 + 6);
      ctx.restore();
    },

    draw: function (ctx, t) {
      drawRoom(ctx);
      const tag = this.practice ? ' · 練習' : '';
      A.pill(ctx, W / 2, 64, this.lv.name + '(' + this.lv.sub + ')' + tag, '#5E7A56', 'rgba(255,255,255,0.94)', 27);
      // 進度點
      for (let i = 0; i < this.count; i++) {
        const x = W / 2 - (this.count - 1) * 20 + i * 40, y = 118;
        if (i < this.qIndex) { ctx.fillStyle = '#A8D8B8'; A.el(ctx, x, y, 11, 11); ctx.fill(); }
        else if (i === this.qIndex) { const p = 1 + Math.sin(t * 4) * 0.18; ctx.fillStyle = '#8FC9A8'; A.el(ctx, x, y, 12 * p, 12 * p); ctx.fill(); }
        else { ctx.fillStyle = 'rgba(150,175,150,0.32)'; A.el(ctx, x, y, 9, 9); ctx.fill(); }
      }
      // 玩具進度(右上,愈做愈亮)
      const tk = this.lv.toyArt && this.lv.toyArt[this.petId];
      if (tk) {
        ctx.save();
        ctx.globalAlpha = 0.28 + 0.72 * (this.qIndex / this.count);
        TOY.drawToy(ctx, tk, W - 70, 150, 0.7);
        ctx.restore();
      }

      if (this.mode === 'pick' || this.mode === 'match') this.drawPick(ctx, t);
      else if (this.mode === 'wpick') this.drawWordPick(ctx, t);
      else if (this.mode === 'spell') this.drawSpell(ctx, t);
      else if (this.mode === 'write') this.drawWrite(ctx, t);
      else if (this.mode === 'wword') this.drawWword(ctx, t);
      else this.drawTrace(ctx, t);

      // 寵物
      const petPos = (this.mode === 'pick' || this.mode === 'match' || this.mode === 'wpick') ? { x: 150, y: 742, s: 0.5 }
        : (this.mode === 'write' || this.mode === 'wword') ? { x: 104, y: 740, s: 0.4 }
          : this.mode === 'spell' ? { x: 96, y: 744, s: 0.4 }
            : { x: 160, y: 660, s: 0.55 };
      ctx.save(); ctx.translate(petPos.x, petPos.y); ctx.scale(petPos.s, petPos.s);
      P.draw(this.petId, ctx, t, {});
      ctx.restore();
      this._petPos = petPos;
    },

    drawPick: function (ctx, t) {
      const q = this.q;
      const cx = PC.x + PC.w / 2, cy = PC.y + PC.h / 2;
      ctx.save();
      ctx.shadowColor = 'rgba(110,140,115,0.14)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
      ctx.fillStyle = '#FFFFFF'; A.rr(ctx, PC.x, PC.y, PC.w, PC.h, 34); ctx.fill();
      ctx.restore();
      if (!q) return;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (this.mode === 'pick') {
        ctx.fillStyle = '#EAF3EC'; A.el(ctx, cx, cy - 38, 84, 84); ctx.fill();
        A.drawIcon(ctx, 'speaker', cx, cy - 38, 1.9, '#6E9A6E');
        ctx.font = '40px ' + FONT; ctx.fillStyle = '#5E7A56';
        ctx.fillText('聽聽看,是哪個字母?', cx, cy + 78);
        ctx.font = '24px ' + FONT; ctx.fillStyle = '#9AB09A';
        ctx.fillText('點喇叭再聽一次', cx, cy + 124);
      } else {
        ctx.font = '700 180px ' + FONT; ctx.fillStyle = this.deep;
        ctx.fillText(q.letter, cx, cy - 18);
        ctx.font = '40px ' + FONT; ctx.fillStyle = '#5E7A56';
        ctx.fillText('找出一樣的小寫字母', cx, cy + 108);
      }
    },

    drawWordPick: function (ctx, t) {
      const q = this.q;
      const cx = PC.x + PC.w / 2, cy = PC.y + PC.h / 2;
      ctx.save();
      ctx.shadowColor = 'rgba(110,140,115,0.14)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
      ctx.fillStyle = '#FFFFFF'; A.rr(ctx, PC.x, PC.y, PC.w, PC.h, 34); ctx.fill();
      ctx.restore();
      if (!q) return;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#EAF3EC'; A.el(ctx, cx, cy - 38, 84, 84); ctx.fill();
      A.drawIcon(ctx, 'speaker', cx, cy - 38, 1.9, '#6E9A6E');
      ctx.font = '40px ' + FONT; ctx.fillStyle = '#5E7A56';
      ctx.fillText('聽聽看,是哪個單字?', cx, cy + 78);
      ctx.font = '24px ' + FONT; ctx.fillStyle = '#9AB09A';
      ctx.fillText('點喇叭再聽一次', cx, cy + 124);
    },

    drawSpell: function (ctx, t) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '30px ' + FONT; ctx.fillStyle = '#5E7A56';
      ctx.fillText('看著單字,把字母依順序排進格子', W / 2, 178);
      ctx.font = '700 78px ' + FONT; ctx.fillStyle = this.deep;
      ctx.fillText(this.word || '', W / 2, 256);
      ctx.font = '22px ' + FONT; ctx.fillStyle = '#9AB09A';
      ctx.fillText('點右上角喇叭聽發音', W / 2, 300);
    },

    drawSlot: function (ctx, i, x) {
      ctx.save();
      ctx.shadowColor = 'rgba(110,140,115,0.16)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
      ctx.fillStyle = '#FFFFFF'; A.rr(ctx, x, SLOT.y, SLOT.w, SLOT.h, 26); ctx.fill();
      ctx.restore();
      const ch = this.slots[i];
      if (ch) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '700 118px ' + FONT; ctx.fillStyle = this.deep;
        ctx.fillText(ch, x + SLOT.w / 2, SLOT.y + SLOT.h / 2 + 6);
      } else {
        ctx.strokeStyle = 'rgba(150,180,150,0.45)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.setLineDash([4, 12]);
        ctx.beginPath();
        ctx.moveTo(x + 26, SLOT.y + SLOT.h - 42); ctx.lineTo(x + SLOT.w - 26, SLOT.y + SLOT.h - 42);
        ctx.stroke(); ctx.setLineDash([]);
      }
    },

    drawBank: function (ctx, i, x) {
      const b = this.bank[i]; if (!b) return;
      ctx.save();
      if (b.used) ctx.globalAlpha = 0.32;
      ctx.shadowColor = 'rgba(110,140,115,0.14)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      ctx.fillStyle = b.used ? '#EEF0E8' : '#F4FAF1'; A.rr(ctx, x, BANK.y, BANK.w, BANK.h, 22); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = b.used ? 0.4 : 1;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 70px ' + FONT; ctx.fillStyle = this.deep;
      ctx.fillText(b.ch, x + BANK.w / 2, BANK.y + BANK.h / 2 + 4);
      ctx.globalAlpha = 1;
    },

    drawWword: function (ctx, t) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '30px ' + FONT; ctx.fillStyle = '#5E7A56';
      ctx.fillText('聽一聽,在每個格子裡寫出單字', W / 2, 176);
      ctx.font = '700 64px ' + FONT; ctx.fillStyle = 'rgba(94,122,86,0.5)';
      ctx.fillText(this.word || '', W / 2, 244);
      const self = this;
      this.boxes.forEach(function (b) {
        ctx.save();
        ctx.shadowColor = 'rgba(110,140,115,0.14)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
        ctx.fillStyle = '#FFFFFF'; A.rr(ctx, b.x, b.y, b.w, b.h, 26); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = 'rgba(150,180,150,0.3)'; ctx.lineWidth = 2; ctx.setLineDash([5, 9]);
        ctx.beginPath(); ctx.moveTo(b.x + 18, b.y + b.h / 2); ctx.lineTo(b.x + b.w - 18, b.y + b.h / 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '800 170px ' + FONT; ctx.fillStyle = 'rgba(150,150,135,0.16)';
        ctx.fillText(b.letter, b.x + b.w / 2, b.y + b.h / 2 + 8);
        ctx.strokeStyle = self.accent; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        b.strokes.forEach(function (s) {
          if (s.length < 2) { if (s.length === 1) { ctx.fillStyle = self.accent; A.el(ctx, s[0].x, s[0].y, 7, 7); ctx.fill(); } return; }
          ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y);
          for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
          ctx.stroke();
        });
      });
    },

    drawTrace: function (ctx, t) {
      let reveal = null;
      if (this.demoOn) {
        const e = PLS.t - this.demoT0;
        if (e < 0) reveal = 0;                            // 延遲中:只顯示底圖
        else if (e >= this.demoDur) this.demoOn = false;  // 示範結束
        else reveal = e / this.demoDur;
      }
      renderTraceCard(ctx, this.q ? this.q.letter : null, this.strokes, this.accent, reveal);
    },

    drawWrite: function (ctx, t) {
      // 提示文字:用聽的找框框(不顯示答案字母,也不框出目標框)
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '30px ' + FONT; ctx.fillStyle = '#5E7A56';
      ctx.fillText('聽聽看,把唸到的字母寫進它的框框', W / 2, 182);
      ctx.font = '23px ' + FONT; ctx.fillStyle = '#9AB09A';
      ctx.fillText('點右上角喇叭再聽一次', W / 2, 224);

      const self = this;
      this.boxes.forEach(function (b) {
        ctx.save();
        ctx.shadowColor = 'rgba(110,140,115,0.14)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
        ctx.fillStyle = '#FFFFFF'; A.rr(ctx, b.x, b.y, b.w, b.h, 26); ctx.fill();
        ctx.restore();
        // 四線格中線
        ctx.strokeStyle = 'rgba(150,180,150,0.3)'; ctx.lineWidth = 2; ctx.setLineDash([5, 9]);
        ctx.beginPath(); ctx.moveTo(b.x + 18, b.y + b.h / 2); ctx.lineTo(b.x + b.w - 18, b.y + b.h / 2); ctx.stroke();
        ctx.setLineDash([]);
        // 淡淡的字母提示(每個框都一樣淡,不洩漏哪個是答案)
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '800 150px ' + FONT;
        ctx.fillStyle = 'rgba(150,150,135,0.14)';
        ctx.fillText(b.letter, b.x + b.w / 2, b.y + b.h / 2 + 6);
        // 玩家筆畫
        ctx.strokeStyle = self.accent; ctx.lineWidth = 13; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        b.strokes.forEach(function (s) {
          if (s.length < 2) { if (s.length === 1) { ctx.fillStyle = self.accent; A.el(ctx, s[0].x, s[0].y, 7, 7); ctx.fill(); } return; }
          ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y);
          for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
          ctx.stroke();
        });
      });
    },

    drawTop: function (ctx, t) {
      if (t < this.bubbleUntil) {
        const pp = this._petPos || { x: 150, y: 742 };
        A.bubble(ctx, pp.x + 44, pp.y - 158, this.bubbleText, { size: 23 });
      }
    }
  };

  // ════════════════════════════════════════════════════
  // 玩具獎勵:etoy
  // ════════════════════════════════════════════════════
  const etoy = {
    enter: function (params) {
      const self = this;
      this.petId = params.pet;
      this.lv = CFG.english[params.levelIdx];
      this.toyKey = this.lv.toyArt[this.petId];
      this.toyName = this.lv.toy[this.petId];
      this.deluxe = !!params.deluxe;
      this.clears = params.clears || 0;
      this.start = PLS.t; this.heartTimer = 0;
      PLS.sfx.feast();
      PLS.say(this.deluxe ? '哇,豪華版玩具!' : '哇,新玩具!');
      PLS.addButton({
        x: W / 2 - 160, y: 706, w: 320, h: 100,
        hidden: function () { return PLS.t - self.start < 2.2; },
        draw: function (ctx) {
          ctx.save();
          ctx.shadowColor = 'rgba(120,150,110,0.28)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
          ctx.fillStyle = '#8FC9A8'; A.rr(ctx, W / 2 - 160, 706, 320, 100, 34); ctx.fill();
          ctx.restore();
          ctx.font = '38px ' + FONT; ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('收下玩具!', W / 2, 758);
        },
        onTap: function () { PLS.go('emap', { pet: self.petId }); }
      });
    },
    draw: function (ctx, t) {
      const k = t - this.start;
      ctx.fillStyle = this.deluxe ? '#EFF6E2' : '#EAF2EA'; ctx.fillRect(0, 0, W, H);
      const rg = ctx.createRadialGradient(W / 2, 420, 80, W / 2, 420, 620);
      if (this.deluxe) { rg.addColorStop(0, 'rgba(255,205,110,0.5)'); rg.addColorStop(1, 'rgba(255,205,110,0)'); }
      else { rg.addColorStop(0, 'rgba(190,225,200,0.55)'); rg.addColorStop(1, 'rgba(190,225,200,0)'); }
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 14; i++) {
        const fx = 50 + i * 90, fy = 60 + Math.sin(i * 1.3) * 14;
        ctx.fillStyle = this.deluxe ? ['#F6C95E', '#F2B96B', '#FFD98A', '#E59A1E'][i % 4] : ['#F4A8A0', '#8FC9A8', '#92B8E0', '#F6C95E'][i % 4];
        ctx.beginPath(); ctx.moveTo(fx - 22, fy); ctx.lineTo(fx + 22, fy); ctx.lineTo(fx, fy + 36); ctx.closePath(); ctx.fill();
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '56px ' + FONT;
      const title = this.deluxe ? '豪華玩具耀!' : '得到新玩具!';
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText(title, W / 2, 134);
      ctx.fillStyle = this.deluxe ? '#C2591E' : '#5E8A56'; ctx.fillText(title, W / 2, 130);
      if (this.deluxe) A.pill(ctx, W / 2, 194, '✨ 豪華版 · ' + this.toyName + ' ✨', '#C2591E', 'rgba(255,240,205,0.96)', 28);
      else A.pill(ctx, W / 2, 194, this.toyName, '#6E9A6E', 'rgba(255,255,255,0.94)', 28);

      // 寵物(左)+ 展示台(右)
      ctx.save(); ctx.translate(360, 480); P.draw(this.petId, ctx, t, { mode: k < 6 ? 'happy' : 'idle' }); ctx.restore();
      const talk = this.deluxe ? CFG.talkEng.rewardDeluxe : CFG.talkEng.reward;
      A.bubble(ctx, 360, 300, k < 3.4 ? talk[0] : talk[1], { size: 27 });

      ctx.save();
      ctx.shadowColor = this.deluxe ? 'rgba(180,130,40,0.26)' : 'rgba(110,140,115,0.22)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
      ctx.fillStyle = '#FFFFFF'; A.el(ctx, 840, 600, 190, 48); ctx.fill();
      ctx.restore();
      ctx.fillStyle = this.deluxe ? '#FBE6B8' : '#E3EEDF'; A.el(ctx, 840, 596, 140, 32); ctx.fill();
      const pop = k < 0.5 ? 1 + Math.sin(k / 0.5 * Math.PI) * 0.3 : 1 + Math.sin(t * 2) * 0.03;
      if (this.deluxe) {
        // 金色光圈 + 皇冠
        ctx.save();
        ctx.strokeStyle = 'rgba(246,196,74,0.55)'; ctx.lineWidth = 5;
        for (let r = 0; r < 8; r++) {
          const a = t * 0.6 + r * Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(840 + Math.cos(a) * 130, 500 + Math.sin(a) * 130);
          ctx.lineTo(840 + Math.cos(a) * 158, 500 + Math.sin(a) * 158);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (this.deluxe) TOY.drawToyDeluxe(ctx, this.toyKey, 840, 510, 2.3 * pop);
      else TOY.drawToy(ctx, this.toyKey, 840, 510, 2.3 * pop);
      if (this.deluxe) window.PLS_CROWN(ctx, 840, 372, 2.0, '#F6C44A');

      this.heartTimer -= 1 / 60;
      if (this.heartTimer <= 0 && k < 7) { this.heartTimer = this.deluxe ? 0.3 : 0.5; PLS.burst(840 + (Math.random() - 0.5) * 260, 430, 'small'); }
    }
  };

  // ════════════════════════════════════════════════════
  // 結束(練習完成 / 今天玩具拿夠了)
  // ════════════════════════════════════════════════════
  const eresult = {
    enter: function (params) {
      const self = this;
      this.petId = params.pet; this.levelIdx = params.levelIdx; this.practice = params.practice;
      this.msg = this.practice ? '練習完成!明天再來拿新玩具喔' : pickTalk(CFG.talkEng.full);
      PLS.addButton({
        x: W / 2 - 160, y: 720, w: 320, h: 100,
        draw: function (ctx) {
          ctx.save();
          ctx.shadowColor = 'rgba(120,150,110,0.24)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
          ctx.fillStyle = '#8FC9A8'; A.rr(ctx, W / 2 - 160, 720, 320, 100, 34); ctx.fill();
          ctx.restore();
          ctx.font = '38px ' + FONT; ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('回遊戲間', W / 2, 770);
        },
        onTap: function () { PLS.go('emap', { pet: self.petId }); }
      });
    },
    draw: function (ctx, t) {
      drawRoom(ctx);
      const lv = CFG.english[this.levelIdx];
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '50px ' + FONT; ctx.fillStyle = '#5E7A56';
      ctx.fillText(this.practice ? '練習結束' : '今天玩夠囉', W / 2, 116);
      ctx.save();
      ctx.shadowColor = 'rgba(110,140,115,0.14)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
      ctx.fillStyle = '#FFFFFF'; A.rr(ctx, W / 2 - 250, 186, 500, 180, 32); ctx.fill();
      ctx.restore();
      ctx.font = '32px ' + FONT; ctx.fillStyle = '#8AA08A';
      ctx.fillText(lv.name + '(' + lv.sub + ')', W / 2, 240);
      const tk = lv.toyArt && lv.toyArt[this.petId];
      if (tk) TOY.drawToy(ctx, tk, W / 2, 318, 1.2);

      ctx.save(); ctx.translate(W / 2, 600); ctx.scale(0.72, 0.72); P.draw(this.petId, ctx, t, {}); ctx.restore();
      A.bubble(ctx, W / 2, 440, this.msg, { size: 26 });
    }
  };

  // ════════════════════════════════════════════════════
  // 字母手寫練習(自由練習:不計每日次數、不給獎勵,可逐字慢慢描)
  // ════════════════════════════════════════════════════
  const epractice = {
    enter: function (params) {
      const self = this;
      this.petId = params.pet || 'rabbit';
      this.accent = CFG.pets[this.petId].theme.accent;
      this.cs = (params.cs === 'lower') ? 'lower' : 'upper';
      this.idx = 0;
      if (params.letter) {
        const k = UP.indexOf(String(params.letter).toUpperCase());
        if (k >= 0) this.idx = k;
      }
      this.strokes = []; this.cur = null;
      this.demo = { on: false, t0: 0, dur: 1 };
      this.refreshRound();
      // 返回字母表(記住目前大小寫)
      PLS.addButton({
        x: 30, y: 30, w: 84, h: 84,
        draw: function (ctx) {
          ctx.fillStyle = 'rgba(255,255,255,0.92)'; A.rr(ctx, 30, 30, 84, 84, 26); ctx.fill();
          A.drawIcon(ctx, 'back', 72, 72, 1.1, '#6E8B72');
        },
        onTap: function () { PLS.go('emenu', { pet: self.petId, cs: self.cs }); }
      });

      // 大小寫切換
      PLS.addButton({
        x: W - 250, y: 34, w: 210, h: 72,
        draw: function (ctx) {
          ctx.fillStyle = 'rgba(255,255,255,0.92)'; A.rr(ctx, W - 250, 34, 210, 72, 24); ctx.fill();
          ctx.strokeStyle = '#D8E0D2'; ctx.lineWidth = 2; A.rr(ctx, W - 250, 34, 210, 72, 24); ctx.stroke();
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = '30px ' + FONT; ctx.fillStyle = '#6E8B72';
          ctx.fillText(self.cs === 'upper' ? '大寫 ABC' : '小寫 abc', W - 145, 70);
        },
        onTap: function () { self.cs = (self.cs === 'upper') ? 'lower' : 'upper'; self.pick(self.idx); }
      });
      // 上一個 / 下一個字母
      PLS.addButton({
        x: 150, y: 300, w: 120, h: 184,
        draw: function (ctx) { self.arrowBtn(ctx, 150, 300, 120, 184, -1); },
        onTap: function () { self.step(-1); }
      });
      PLS.addButton({
        x: 1062, y: 300, w: 120, h: 184,
        draw: function (ctx) { self.arrowBtn(ctx, 1062, 300, 120, 184, 1); },
        onTap: function () { self.step(1); }
      });
      // 底部按鈕:清除 / 看筆順 (+ 完成,描完一輪 +1 分;隱藏獎品功能時不顯示「完成」)
      const showDone = !ST.rewardsHidden();
      const clearX = showDone ? 300 : (W / 2 - 260), clearW = showDone ? 200 : 240;
      const demoX = showDone ? 520 : (W / 2 + 20), demoW = showDone ? 220 : 240;
      // 清除
      PLS.addButton({
        x: clearX, y: 622, w: clearW, h: 96,
        draw: function (ctx) {
          ctx.fillStyle = '#FFFFFF'; A.rr(ctx, clearX, 622, clearW, 96, 28); ctx.fill();
          ctx.strokeStyle = '#D8E0D2'; ctx.lineWidth = 3; A.rr(ctx, clearX, 622, clearW, 96, 28); ctx.stroke();
          ctx.font = '34px ' + FONT; ctx.fillStyle = '#8AA08A';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('清除', clearX + clearW / 2, 670);
        },
        onTap: function () { self.strokes = []; self.cur = null; }
      });
      // 看筆順
      PLS.addButton({
        x: demoX, y: 622, w: demoW, h: 96,
        draw: function (ctx) {
          ctx.save();
          ctx.shadowColor = 'rgba(120,150,110,0.28)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
          ctx.fillStyle = '#8FC9A8'; A.rr(ctx, demoX, 622, demoW, 96, 28); ctx.fill();
          ctx.restore();
          ctx.font = '34px ' + FONT; ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('看筆順', demoX + demoW / 2, 670);
        },
        onTap: function () { self.startDemo(0); }
      });
      // 寫好了:把這個字母記進本輪;描滿一輪(A–Z 大寫 + a–z 小寫 共 52 個)才 +1 分(規則在 store.submitHwLetter)
      if (showDone) {
        PLS.addButton({
          x: 760, y: 622, w: 220, h: 96,
          draw: function (ctx) {
            const ok = self.strokes.length > 0;
            ctx.save();
            if (ok) { ctx.shadowColor = 'rgba(200,140,50,0.28)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6; }
            ctx.fillStyle = ok ? '#F2A93C' : '#E8DEC9'; A.rr(ctx, 760, 622, 220, 96, 28); ctx.fill();
            ctx.restore();
            ctx.font = '32px ' + FONT; ctx.fillStyle = ok ? '#FFFFFF' : '#B6A488';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('寫好了', 870, 670);
          },
          onTap: function () {
            if (!self.strokes.length) { self.hint = '先描一個字母再按「寫好了」喔'; self.hintT = PLS.t; return; }
            const res = ST.submitHwLetter(ST.load(self.petId), self.letter());
            if (res.complete) {
              PLS.go('hwpass', { pet: self.petId, awarded: res.awarded, capped: res.capped, dailyLeft: res.dailyLeft });
              return;
            }
            self.refreshRound();
            PLS.sfx.correct();
            self.hint = '寫好了!本輪已完成 ' + res.count + ' / ' + res.total + ' 個';
            self.hintT = PLS.t;
            self.gotoNextUndone();
          }
        });
      }

      this.hint = ''; this.hintT = -10;
      this.pick(this.idx);
    },

    letter: function () {
      const base = UP[this.idx];
      return this.cs === 'lower' ? base.toLowerCase() : base;
    },
    // 重新讀取本輪手寫進度(已描完字母的集合 + 計數)
    refreshRound: function () {
      const p = ST.hwRoundProgress(ST.load(this.petId));
      this.doneSet = new Set(p.letters);
      this.doneCount = p.count; this.doneTotal = p.total;
    },
    // 跳到本輪「還沒描過」的下一個字母,依「大寫→小寫」配對順序前進(A→a→B→b→…)
    gotoNextUndone: function () {
      let g = this.idx * 2 + (this.cs === 'lower' ? 1 : 0);
      for (let s = 0; s < 52; s++) {
        g = (g + 1) % 52;
        const cs = (g % 2 === 1) ? 'lower' : 'upper';
        const i = Math.floor(g / 2);
        const ch = (cs === 'lower') ? UP[i].toLowerCase() : UP[i];
        if (!this.doneSet || !this.doneSet.has(ch)) { this.cs = cs; this.pick(i); return; }
      }
      this.pick(this.idx);   // 理論上不會到這(滿 52 會 complete)
    },
    // 上一個 / 下一個:每個字母「大寫→小寫」配對前進(A→a→B→b→…→Z→z→循環)。
    // 全序列 g=0..51:偶數=大寫、奇數=小寫;idx = floor(g/2)。
    step: function (dir) {
      let g = this.idx * 2 + (this.cs === 'lower' ? 1 : 0);
      g = ((g + dir) % 52 + 52) % 52;
      this.cs = (g % 2 === 1) ? 'lower' : 'upper';
      this.pick(Math.floor(g / 2));
    },
    pick: function (i) {
      this.idx = ((i % 26) + 26) % 26;
      this.strokes = []; this.cur = null;
      this.demo.on = false;                 // 預設不自動示範筆順(要看請按「看筆順」)
      const base = UP[this.idx];
      setTimeout(function () { sayLetter(base); }, 200);
    },
    startDemo: function (delay) {
      const L = window.PLS_LETTERS, ch = this.letter();
      if (!L || !L.has(ch)) { this.demo.on = false; return; }
      this.demo = { on: true, t0: PLS.t + (delay || 0), dur: 0.75 * L.strokeCount(ch) + 0.5 };
    },
    arrowBtn: function (ctx, x, y, w, h, dir) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; A.rr(ctx, x, y, w, h, 26); ctx.fill();
      ctx.strokeStyle = '#D8E0D2'; ctx.lineWidth = 2; A.rr(ctx, x, y, w, h, 26); ctx.stroke();
      const cx = x + w / 2, cy = y + h / 2, s = 26;
      ctx.fillStyle = '#8FBF9E';
      ctx.beginPath();
      if (dir < 0) { ctx.moveTo(cx + s * 0.5, cy - s); ctx.lineTo(cx - s * 0.6, cy); ctx.lineTo(cx + s * 0.5, cy + s); }
      else { ctx.moveTo(cx - s * 0.5, cy - s); ctx.lineTo(cx + s * 0.6, cy); ctx.lineTo(cx - s * 0.5, cy + s); }
      ctx.closePath(); ctx.fill();
    },
    pointer: function (phase, x, y) {
      const inside = x >= TCARD.x && x <= TCARD.x + TCARD.w && y >= TCARD.y && y <= TCARD.y + TCARD.h;
      if (phase === 'down') {
        if (!inside) { this.cur = null; return; }
        this.cur = [{ x: x, y: y }]; this.strokes.push(this.cur);
      } else if (phase === 'move') {
        if (!this.cur) return;
        const cx = Math.max(TCARD.x, Math.min(TCARD.x + TCARD.w, x));
        const cy = Math.max(TCARD.y, Math.min(TCARD.y + TCARD.h, y));
        this.cur.push({ x: cx, y: cy });
      } else if (phase === 'up') { this.cur = null; }
    },
    draw: function (ctx, t) {
      drawRoom(ctx);
      A.pill(ctx, W / 2, 64, '字母手寫練習', '#5E7A56', 'rgba(255,255,255,0.94)', 27);
      // 本輪進度(只有開啟積分時才有意義):描滿 A–Z 大小寫共 52 個 +1 分
      if (!ST.rewardsHidden()) {
        A.pill(ctx, W / 2, 116, '本輪 ' + (this.doneCount || 0) + ' / ' + (this.doneTotal || 52) + ' 個 · 寫滿整輪 +1 分',
          '#C2851E', 'rgba(255,255,255,0.92)', 22);
      }
      renderTraceCard(ctx, this.letter(), this.strokes, this.accent, demoReveal(this.demo));
      // 這個字母本輪已描過 → 角落打勾,讓孩子知道還沒寫的還有哪些
      if (!ST.rewardsHidden() && this.doneSet && this.doneSet.has(this.letter())) {
        const cx = TCARD.x + TCARD.w - 42, cy = TCARD.y + 42;
        ctx.fillStyle = '#8FC9A8'; A.el(ctx, cx, cy, 22, 22); ctx.fill();
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(cx - 10, cy + 1); ctx.lineTo(cx - 2, cy + 9); ctx.lineTo(cx + 11, cy - 8); ctx.stroke();
      }
      ctx.save(); ctx.translate(170, 700); ctx.scale(0.5, 0.5); P.draw(this.petId, ctx, t, {}); ctx.restore();
      if (this.hint && t - this.hintT < 1.8) A.bubble(ctx, W / 2, 150, this.hint, { size: 23 });
    }
  };

  // ════════════════════════════════════════════════════
  // 字母手寫練習:A–Z 首頁(點字母進去描寫)
  // ════════════════════════════════════════════════════
  const emenu = {
    enter: function (params) {
      const self = this;
      this.petId = params.pet || 'rabbit';
      this.accent = CFG.pets[this.petId].theme.accent;
      this.cs = (params.cs === 'lower') ? 'lower' : 'upper';
      // 本輪已描完的字母(大小寫各自獨立),用來在格子上打勾 + 顯示進度
      this.doneSet = new Set(ST.hwRoundProgress(ST.load(this.petId)).letters);
      backButton('room', this.petId);

      // 大小寫切換(切換後重畫,字母格內字形跟著變)
      PLS.addButton({
        x: W - 250, y: 34, w: 210, h: 72,
        draw: function (ctx) {
          ctx.fillStyle = 'rgba(255,255,255,0.92)'; A.rr(ctx, W - 250, 34, 210, 72, 24); ctx.fill();
          ctx.strokeStyle = '#D8E0D2'; ctx.lineWidth = 2; A.rr(ctx, W - 250, 34, 210, 72, 24); ctx.stroke();
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = '30px ' + FONT; ctx.fillStyle = '#6E8B72';
          ctx.fillText(self.cs === 'upper' ? '大寫 ABC' : '小寫 abc', W - 145, 70);
        },
        onTap: function () { self.cs = (self.cs === 'upper') ? 'lower' : 'upper'; }
      });

      // 26 個字母格子(7 欄 × 4 列),點進去進描寫頁
      const cols = 7, cw = 132, chh = 128, gap = 18;
      const totalW = cols * cw + (cols - 1) * gap;
      const x0 = (W - totalW) / 2, y0 = 168;
      for (let i = 0; i < 26; i++) {
        (function (i) {
          const r = Math.floor(i / cols), c = i % cols;
          const x = x0 + c * (cw + gap), y = y0 + r * (chh + gap);
          PLS.addButton({
            x: x, y: y, w: cw, h: chh,
            draw: function (ctx) { self.cellDraw(ctx, x, y, cw, chh, i); },
            onTap: function () { PLS.go('epractice', { pet: self.petId, letter: UP[i], cs: self.cs }); }
          });
        })(i);
      }
    },
    cellDraw: function (ctx, x, y, w, h, i) {
      const base = UP[i], ch = this.cs === 'lower' ? base.toLowerCase() : base;
      ctx.fillStyle = '#FFFFFF'; A.rr(ctx, x, y, w, h, 24); ctx.fill();
      ctx.strokeStyle = '#E0E6DC'; ctx.lineWidth = 2; A.rr(ctx, x, y, w, h, 24); ctx.stroke();
      const L = window.PLS_LETTERS;
      if (L && L.has(ch)) {
        L.draw(ctx, ch, { cx: x + w / 2, cy: y + h / 2, h: 62, color: this.accent, width: 9 });
      } else {
        ctx.font = '70px ' + FONT; ctx.fillStyle = this.accent;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(ch, x + w / 2, y + h / 2);
      }
      // 本輪已描完 → 右上角打勾(隱藏積分功能時不顯示)
      if (!ST.rewardsHidden() && this.doneSet && this.doneSet.has(ch)) {
        const bx = x + w - 22, by = y + 22;
        ctx.fillStyle = '#8FC9A8'; A.el(ctx, bx, by, 16, 16); ctx.fill();
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(bx - 7, by + 1); ctx.lineTo(bx - 1, by + 7); ctx.lineTo(bx + 8, by - 6); ctx.stroke();
      }
    },
    draw: function (ctx, t) {
      drawRoom(ctx);
      A.pill(ctx, W / 2, 64, '字母手寫練習 · 選一個字母', '#5E7A56', 'rgba(255,255,255,0.94)', 27);
      if (!ST.rewardsHidden() && this.doneSet) {
        A.pill(ctx, W / 2, 116, '本輪已完成 ' + this.doneSet.size + ' / 52 個 · 寫滿整輪 +1 分',
          '#C2851E', 'rgba(255,255,255,0.92)', 21);
      }
      ctx.save(); ctx.translate(120, 720); ctx.scale(0.42, 0.42); P.draw(this.petId, ctx, t, {}); ctx.restore();
    }
  };

  PLS.register('emap', emap);
  PLS.register('eplay', eplay);
  PLS.register('etoy', etoy);
  PLS.register('eresult', eresult);
  PLS.register('epractice', epractice);
  PLS.register('emenu', emenu);
})();
