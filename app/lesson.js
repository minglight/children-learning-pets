// lesson.js — 「先教再考」上課畫面:寵物老師講解 → 一起做(答錯給提示、不計分)→ 開始考試
// 腳本在 app/lessons.js(key = 關卡 id)。版面沿用答題畫面(題目卡 / 答案卡 / 左邊寵物)。
// 上課不給食物、不算次數、不動過關記錄;看過(或跳過)就記在 d.lessons,下次點關卡直接考試。
(function () {
  const PLS = window.PLS, A = window.PLS_ART, ACT = window.PLS_ACTOR;
  const CFG = window.PLS_CONFIG, ST = window.PLS_STORE, VIS = window.PLS_VIS;
  const W = PLS.W, H = PLS.H, FONT = A.FONT;
  const QC = { x: 360, y: 158, w: 794, h: 312 };
  const TILE = { w: 230, h: 200, gap: 30, y: 512 };
  const PET = { x: 188, y: 540, s: 0.82 };
  const ACCENT = '#3F8A6E';

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  const PRAISE = ['對!', '答對了!', '好棒!', '就是這樣!'];

  const lesson = {
    enter: function (params) {
      const self = this;
      this.petId = params.pet;
      this.levelIdx = params.levelIdx;
      this.tier = params.tier === 'math2' ? 'math2' : 'math';
      this.practice = !!params.practice;
      this.lv = CFG[this.tier][this.levelIdx];
      this.script = (window.PLS_LESSONS || {})[this.lv.id];
      this.species = ST.load(this.petId).species || 'rabbit';
      this.stage = ST.growthInfo(ST.load(this.petId)).stage;
      this.steps = ((this.script && this.script.steps) || []).concat([{ t: 'done' }]);
      this.i = 0;
      this.wrong = new Set();
      this.locked = false;
      this.hintText = '';
      this.okText = '';
      this.bubbleText = ''; this.bubbleUntil = 0;
      this.petMode = 'idle';
      this.tiles = [];
      this.seen = ST.lessonSeen(ST.load(this.petId), this.lv.id);

      PLS.addButton({
        x: 30, y: 30, w: 84, h: 84,
        draw: function (ctx) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)'; A.rr(ctx, 30, 30, 84, 84, 26); ctx.fill();
          A.drawIcon(ctx, 'back', 72, 72, 1.1, '#9A7B5C');
        },
        onTap: function () { PLS.go('map', { pet: self.petId, tier: self.tier }); }
      });
      PLS.addButton({
        x: W - 114, y: 30, w: 84, h: 84,
        draw: function (ctx) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)'; A.rr(ctx, W - 114, 30, 84, 84, 26); ctx.fill();
          A.drawIcon(ctx, 'speaker', W - 72, 72, 1.05, '#9A7B5C');
        },
        onTap: function () { self.sayStep(); }
      });
      // 跳過:直接去考試(也算看過)
      PLS.addButton({
        x: 130, y: 38, w: 210, h: 68,
        hidden: function () { return self.cur().t === 'done'; },
        draw: function (ctx) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)'; A.rr(ctx, 130, 38, 210, 68, 34); ctx.fill();
          ctx.font = '26px ' + FONT; ctx.fillStyle = '#9A7B5C';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('直接考試 ▶', 235, 74);
        },
        onTap: function () { self.finish(); }
      });
      // 「下一步」大按鈕(show / done 步驟)
      PLS.addButton({
        x: QC.x + QC.w / 2 - 170, y: 556, w: 340, h: 108,
        hidden: function () { return self.cur().t === 'ask'; },
        draw: function (ctx, t) {
          const last = self.cur().t === 'done';
          ctx.save();
          ctx.shadowColor = 'rgba(150,100,60,0.2)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
          ctx.fillStyle = last ? '#F2B96B' : ACCENT;
          A.rr(ctx, QC.x + QC.w / 2 - 170, 556, 340, 108, 36); ctx.fill();
          ctx.restore();
          ctx.font = '42px ' + FONT; ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(last ? '開始考試' : '下一步', QC.x + QC.w / 2, 612);
        },
        onTap: function () { if (self.cur().t === 'done') self.finish(); else self.go(self.i + 1); }
      });
      // 答案卡(ask 步驟,固定 3 個)
      for (let k = 0; k < 3; k++) {
        (function (k) {
          const tx0 = QC.x + QC.w / 2 - (TILE.w * 3 + TILE.gap * 2) / 2;
          const b = PLS.addButton({
            x: tx0 + k * (TILE.w + TILE.gap), y: TILE.y, w: TILE.w, h: TILE.h,
            hidden: function () { return self.cur().t !== 'ask'; },
            draw: function (ctx) { self.drawTile(ctx, k, b.x, b.y, b.w, b.h); },
            disabled: function () { return self.locked || self.wrong.has(k); },
            onTap: function () { self.answer(k); }
          });
          self.tiles.push(b);
        })(k);
      }
      this.go(0);
    },

    cur: function () { return this.steps[this.i] || { t: 'done' }; },

    go: function (i) {
      this.i = i;
      this.wrong = new Set();
      this.locked = false;
      this.hintText = ''; this.okText = '';
      const s = this.cur();
      if (s.t === 'ask') this.opts = shuffle(s.options);
      this.petMode = s.t === 'done' ? 'happy' : 'idle';
      if (s.t === 'done') { this.bubbleText = '上完課囉!'; this.bubbleUntil = PLS.t + 4; PLS.burst(PET.x, PET.y - 60, 'feast'); }
      this.sayStep();
    },

    sayStep: function () {
      const s = this.cur();
      if (s.t === 'done') PLS.say('上完課囉,準備好就開始考試。');
      else PLS.say(s.say || s.text);
    },

    answer: function (k) {
      const s = this.cur();
      if (this.locked) return;
      const self = this;
      if (this.opts[k] === s.answer) {
        this.locked = true;
        PLS.sfx.correct();
        const tile = this.tiles[k];
        PLS.burst(tile.x + tile.w / 2, tile.y + tile.h / 2, 'small');
        this.hintText = '';
        this.okText = s.ok || pick(PRAISE);
        this.petMode = 'happy';
        setTimeout(function () { if (self.cur() === s) { self.petMode = 'idle'; self.go(self.i + 1); } }, 1300);
      } else {
        this.wrong.add(k);
        PLS.sfx.wrong();
        this.hintText = s.hint || '再想想看';
        this.bubbleText = '沒關係,再試一次'; this.bubbleUntil = PLS.t + 2;
        PLS.say(this.hintText);
      }
    },

    finish: function () {
      ST.markLessonSeen(ST.load(this.petId), this.lv.id);
      try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {}
      PLS.go('quiz', { pet: this.petId, levelIdx: this.levelIdx, practice: this.practice, tier: this.tier });
    },

    drawTile: function (ctx, k, x, y, w, h) {
      const s = this.cur(); if (s.t !== 'ask') return;
      const dead = this.wrong.has(k);
      const right = this.locked && this.opts[k] === s.answer;
      ctx.save();
      if (dead) ctx.globalAlpha = 0.35;
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.15)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
      ctx.fillStyle = dead ? '#EDE6DC' : right ? '#D8EFE2' : '#FFFFFF';
      A.rr(ctx, x, y, w, h, 28); ctx.fill();
      ctx.restore();
      const fit = A.fitText(ctx, String(this.opts[k]), w - 34, h - 44, 46, 22);
      A.drawLines(ctx, fit.lines, fit.size, x + w / 2, y + h / 2, right ? '#2F7D5C' : '#5E4A36');
      ctx.restore();
    },

    draw: function (ctx, t) {
      ctx.fillStyle = '#FBF2E4'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(214,178,146,0.12)';
      for (let yy = 60; yy < H; yy += 90)
        for (let xx = Math.floor(yy / 90) % 2 ? 50 : 95; xx < W; xx += 90) { A.el(ctx, xx, yy, 7, 7); ctx.fill(); }
      A.pill(ctx, W / 2 + 120, 64, '上課 · ' + this.lv.name, '#2F7D5C', 'rgba(255,255,255,0.92)', 27);

      // 進度點(每個步驟一顆)
      const n = this.steps.length, gap = Math.min(40, 440 / n);
      for (let k = 0; k < n; k++) {
        const x = W / 2 + 120 - (n - 1) * gap / 2 + k * gap, y = 120;
        if (k < this.i) { ctx.fillStyle = '#A8D8B8'; A.el(ctx, x, y, 10, 10); ctx.fill(); }
        else if (k === this.i) { const p = 1 + Math.sin(t * 4) * 0.18; ctx.fillStyle = '#F2B96B'; A.el(ctx, x, y, 12 * p, 12 * p); ctx.fill(); }
        else { ctx.fillStyle = 'rgba(180,150,120,0.3)'; A.el(ctx, x, y, 8, 8); ctx.fill(); }
      }

      // 題目卡
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.14)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
      ctx.fillStyle = '#FFFCF6'; A.rr(ctx, QC.x, QC.y, QC.w, QC.h, 34); ctx.fill();
      ctx.restore();
      const s = this.cur(), cx = QC.x + QC.w / 2;
      if (s.t === 'done') {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '64px ' + FONT; ctx.fillStyle = '#5E4A36';
        ctx.fillText('上完課囉!', cx, QC.y + QC.h / 2 - 30);
        ctx.font = '36px ' + FONT; ctx.fillStyle = '#A8927A';
        ctx.fillText('準備好了就開始考試', cx, QC.y + QC.h / 2 + 50);
      } else {
        const footer = this.hintText || this.okText;
        const vbox = { x: QC.x + 50, y: QC.y + 112, w: QC.w - 100, h: QC.h - 112 - (footer ? 56 : 14) };
        if (s.visual) {
          const fit = A.fitText(ctx, s.text, QC.w - 110, 84, 40, 24);
          A.drawLines(ctx, fit.lines, fit.size, cx, QC.y + 58, '#5E4A36');
          const v = s.hl ? Object.assign({}, s.visual, { hl: s.hl }) : s.visual;
          VIS.draw(ctx, v, vbox);
        } else {
          const fit = A.fitText(ctx, s.text, QC.w - 130, QC.h - 100, 52, 28);
          A.drawLines(ctx, fit.lines, fit.size, cx, QC.y + QC.h / 2 - (footer ? 18 : 0), '#5E4A36');
        }
        if (footer) {
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const fit2 = A.fitText(ctx, footer, QC.w - 90, 44, 28, 20);
          A.drawLines(ctx, fit2.lines, fit2.size, cx, QC.y + QC.h - 30, this.hintText ? '#C2453D' : '#2F7D5C');
        }
      }

      ACT.drawAt(ctx, this.species, t, PET.x, PET.y + 146 * PET.s, PET.s, { mode: this.petMode, stage: this.stage });
      if (this.seen === false && this.i === 0) {
        A.pill(ctx, PET.x, 790, '看一遍,上課大約 1 分鐘', '#A09182', 'rgba(255,255,255,0.85)', 21);
      }
    },

    drawTop: function (ctx, t) {
      if (t < this.bubbleUntil) A.bubble(ctx, PET.x + 30, PET.y - 200, this.bubbleText, { size: 24 });
    }
  };

  PLS.register('lesson', lesson);
})();
