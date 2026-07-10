// quiz.js — 答題流程(10 題)、結果、吃大餐 — 寬版(平板橫向)
(function () {
  const PLS = window.PLS, A = window.PLS_ART, P = window.PLS_PETS;
  const CFG = window.PLS_CONFIG, ST = window.PLS_STORE, G = window.PLS_GEN;
  const VIS = window.PLS_VIS;
  const W = PLS.W, H = PLS.H, FONT = A.FONT;

  function pickTalk(list) { return list[Math.floor(Math.random() * list.length)]; }

  // 豪華大餐:同樣食物多給 7 份(基礎版 5 份),份量更豐盛
  function deluxeItems(lv) {
    if (lv.feastDeluxe) return lv.feastDeluxe;
    const b = lv.feast.items, n = b.length, out = [];
    for (let i = 0; i < 7; i++) out.push(b[i % n]);
    return out;
  }

  // 題目卡 / 答案卡 / 寵物盤子 的版面(寬版)
  const QC = { x: 360, y: 158, w: 794, h: 312 };  // 題目卡
  const TILE = { w: 230, h: 200, gap: 30, y: 512 };
  const PET = { x: 188, y: 540, s: 0.82 };
  const PLATE = { x: 188, y: 762, rx: 150, ry: 42 };
  const SLOTS = [];
  for (let i = 0; i < 10; i++) {
    const row = i < 5 ? -1 : 1;
    const k = (i % 5) - 2;
    SLOTS.push({ x: PLATE.x + k * 60 + (row > 0 ? 16 : -16), y: PLATE.y + row * 14 - 12 });
  }

  // ════════════════════════════════════════════════════
  // QUIZ
  // ════════════════════════════════════════════════════
  const quiz = {
    enter: function (params) {
      const self = this;
      this.petId = params.pet;
      this.levelIdx = params.levelIdx;
      this.practice = !!params.practice;
      this.lv = CFG.math[this.levelIdx];
      this.qIndex = 0;
      this.firstTryCount = 0;
      this.streak = 0;
      this.petMode = 'idle';
      this.species = ST.load(this.petId).species || 'rabbit';   // v9:petId=slot,species=外觀
      this.stage = ST.growthInfo(ST.load(this.petId)).stage;
      this.bubbleText = this.practice ? pickTalk(CFG.talk.practice) : pickTalk(CFG.talk.welcome);
      this.bubbleUntil = PLS.t + 3;
      this.flying = null;
      this.locked = false;
      this.plate = 0;
      this.stars = 0;
      this.tiles = [];
      this.bankQueue = null;
      this.seenSigs = new Set(); // 回合內不重複:已出過的題目簽名

      // 返回(回關卡圖)
      PLS.addButton({
        x: 30, y: 30, w: 84, h: 84,
        draw: function (ctx) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)'; A.rr(ctx, 30, 30, 84, 84, 26); ctx.fill();
          A.drawIcon(ctx, 'back', 72, 72, 1.1, '#9A7B5C');
        },
        onTap: function () { PLS.go('map', { pet: self.petId }); }
      });
      // 喇叭(再聽一次)
      PLS.addButton({
        x: W - 114, y: 30, w: 84, h: 84,
        draw: function (ctx) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)'; A.rr(ctx, W - 114, 30, 84, 84, 26); ctx.fill();
          A.drawIcon(ctx, 'speaker', W - 72, 72, 1.05, '#9A7B5C');
        },
        onTap: function () { if (self.q) PLS.say(self.q.say); }
      });
      // 答案卡(最多 4 張;第 4 張在連勝後才顯示,由 next() 動態設定位置)
      for (let i = 0; i < 4; i++) {
        (function (i) {
          const b = PLS.addButton({
            x: 0, y: TILE.y, w: TILE.w, h: TILE.h,
            hidden: function () { return i >= 3 && (!self.q || self.q.options.length < 4); },
            draw: function (ctx, t) { self.drawTile(ctx, t, i, b.x, b.y, b.w, b.h); },
            disabled: function () { return self.locked || !self.q || self.wrong.has(i); },
            onTap: function () { self.answer(i); }
          });
          self.tiles.push(b);
        })(i);
      }
      if (this.lv.bank) {
        const self2 = this;
        this.loadingBank = true;
        window.PLS_BANK.ready.then(function () { self2.loadingBank = false; self2.next(); });
      } else {
        this.next();
      }
    },

    next: function () {
      this.wrong = new Set();
      this.firstTry = true;
      this.wrongTries = 0;
      const diff = this.streak >= 4 ? 2 : this.streak >= 2 ? 1 : 0;
      if (this.lv.bank) {
        this.q = this.pickBank();
      } else {
        // 回合內不重複:最多重試 80 次(池太小時放行)
        let q = null, sig = null, retries = 0;
        do {
          q = G.gen[this.lv.gen](diff);
          sig = JSON.stringify([q.kind, q.display, q.answer]);
          retries++;
        } while (this.seenSigs.has(sig) && retries < 80);
        this.seenSigs.add(sig);
        this.q = q;
      }
      this.locked = false;
      // 中後段關卡連勝 3 題 → 加第 4 個選項,提升挑戰
      if (!this.lv.bank && this.levelIdx >= 5 && this.streak >= 3 &&
          this.q && this.q.kind === 'number' && this.q.options.length === 3) {
        const ans = this.q.answer, existing = new Set(this.q.options);
        let extra = null;
        for (let d = 1; d <= 30 && extra === null; d++) {
          const c = ans + (d % 2 === 1 ? d : -d);
          if (c >= 0 && c <= 99 && !existing.has(c)) extra = c;
        }
        if (extra !== null) this.q.options = G.shuffle(this.q.options.concat([extra]));
      }
      // 動態調整答案卡寬度與位置(3 選項:230px × 3;4 選項:175px × 4)
      const n = this.q && this.q.options.length >= 4 ? 4 : 3;
      const tCx = QC.x + QC.w / 2;
      const tw = n === 4 ? 175 : TILE.w, tgap = n === 4 ? 20 : TILE.gap;
      const tx0 = tCx - (tw * n + tgap * (n - 1)) / 2;
      this.tiles.forEach(function (b, i) { b.x = tx0 + i * (tw + tgap); b.y = TILE.y; b.w = tw; b.h = TILE.h; });
      if (this.q) PLS.say(this.q.say);
    },

    pickBank: function () {
      const BANK = window.PLS_BANK;
      if (!this.bankQueue || !this.bankQueue.length) {
        this.bankQueue = G.shuffle(BANK.list(this.lv.bank).slice());
      }
      // 回合內跳過已用過的題目文字;重洗後仍撞到就繼續換下一張
      let item = null, tries = 0;
      while (tries < this.bankQueue.length + 1) {
        const candidate = this.bankQueue.shift();
        if (!candidate) break;
        if (!this.seenSigs.has('bank:' + candidate.text)) {
          item = candidate;
          this.seenSigs.add('bank:' + candidate.text);
          break;
        }
        // 已用過:放回隊尾
        this.bankQueue.push(candidate);
        tries++;
      }
      // 池子耗盡時(tries 超限):直接取下一張放行
      if (!item && this.bankQueue.length) {
        item = this.bankQueue.shift();
      }
      if (!item) return null;
      const visual = item.visual && VIS ? VIS.instantiate(item.visual) : null;
      // 有圖時:若「唸」的版本數字較少,就用它當題目(不寫出數量),讓小朋友自己數
      const digits = function (s) { return (String(s).match(/\d/g) || []).length; };
      let shownText = item.text;
      if (visual && item.say && digits(item.say) < digits(item.text)) shownText = item.say;
      return {
        kind: 'text',
        display: { text: shownText },
        say: item.say || item.text,
        answer: item.answer,
        options: G.shuffle(item.options),
        visual: visual
      };
    },

    answer: function (i) {
      if (this.locked || !this.q) return;
      const self = this;
      const opt = this.q.options[i];
      if (opt === this.q.answer) {
        this.locked = true;
        const prevStreak = this.streak;
        if (this.firstTry) { this.firstTryCount++; this.streak++; }
        else this.streak = 0;
        // 連對里程碑泡泡
        const newStreak = this.streak;
        if (newStreak === 3) { this.bubbleText = '3 連對!好厲害!'; this.bubbleUntil = PLS.t + 2; }
        else if (newStreak === 5) { this.bubbleText = '5 連對!你是天才嗎!'; this.bubbleUntil = PLS.t + 2; }
        PLS.sfx.correct();
        const tile = this.tiles[i];
        const fx = tile.x + tile.w / 2, fy = tile.y + tile.h / 2;
        const isLast = (this.qIndex + 1 >= CFG.questionsPerLevel);
        if (this.practice) {
          this.stars++;
          PLS.burst(fx, fy, 'small');
          if (isLast) { PLS.burst(QC.x + QC.w / 2, QC.y + QC.h / 2, 'feast'); PLS.burst(PET.x, PET.y - 60, 'feast'); this.bubbleText = '全部完成!'; this.bubbleUntil = PLS.t + 3; }
          else if (newStreak !== 3 && newStreak !== 5) { this.petMode = 'happy'; this.bubbleText = pickTalk(CFG.talk.practiceCorrect); this.bubbleUntil = PLS.t + 1.6; }
          this.petMode = 'happy';
          setTimeout(function () { self.petMode = 'idle'; self.advance(); }, 1100);
        } else {
          this.flying = { x0: fx, y0: fy, x1: PET.x, y1: PET.y - 40, start: PLS.t, dur: 0.55 };
          if (isLast) { PLS.burst(QC.x + QC.w / 2, QC.y + QC.h / 2, 'feast'); PLS.burst(PET.x, PET.y - 60, 'feast'); this.bubbleText = '全部完成!'; this.bubbleUntil = PLS.t + 3; }
          setTimeout(function () {
            self.flying = null;
            self.petMode = 'chew';
            PLS.sfx.bite();
            self.plate++;
            if (!isLast && newStreak !== 3 && newStreak !== 5 && Math.random() < 0.45) {
              self.bubbleText = pickTalk(CFG.talk.correct);
              self.bubbleUntil = PLS.t + 1.5;
            }
            PLS.burst(PET.x, PET.y - 70, 'small');
          }, 560);
          setTimeout(function () { self.petMode = 'idle'; self.advance(); }, 1750);
        }
      } else {
        this.wrong.add(i);
        this.firstTry = false;
        this.streak = 0;
        this.wrongTries = (this.wrongTries || 0) + 1;
        PLS.sfx.wrong();
        if (this.wrongTries >= 2) {
          // 第 2 次答錯:給提示
          let hint = '再仔細想想喔';
          const q = this.q;
          if (q.kind === 'number') {
            if (q.display.op === '+' || q.display.op === '−') hint = '先算個位,再算十位喔';
            else if (q.display.op === '×') hint = '想想看,是幾個幾相加?';
          } else if (q.kind === 'repeatadd') { hint = '一個一個慢慢加上去'; }
          else if (q.kind === 'visual') { hint = '一堆一堆數,再加起來'; }
          else if (q.kind === 'shape') { hint = '找找看:' + q.display.targetZh; }
          else if (q.kind === 'compose') { hint = '想像兩塊拼起來的樣子'; }
          else if (q.kind === 'text') { hint = '再聽一次題目,慢慢想沒關係'; }
          this.bubbleText = hint;
          this.bubbleUntil = PLS.t + 3.5;
          PLS.say(q.say);
        } else {
          this.bubbleText = pickTalk(CFG.talk.wrong);
          this.bubbleUntil = PLS.t + 2.2;
        }
      }
    },

    advance: function () {
      this.qIndex++;
      if (this.qIndex >= CFG.questionsPerLevel) {
        const d = ST.load(this.petId);
        const res = ST.recordRun(d, 'math', this.lv.id,
          this.firstTryCount, CFG.questionsPerLevel, this.practice);
        if (res.feast) {
          // v5:1 個食物;滿分或豪華 → 2 個
          const perfect = this.firstTryCount >= CFG.questionsPerLevel;
          const n = (res.deluxe || perfect) ? 2 : 1;
          const pool = this.lv.feast.items;
          const wish = ST.getWish(d);
          const picks = [];
          // 若今日許願食物在池中且未完成,第一個優先給它
          if (wish && !wish.done && pool.indexOf(wish.key) >= 0) {
            picks.push(wish.key);
          }
          while (picks.length < n) {
            picks.push(pool[Math.floor(Math.random() * pool.length)]);
          }
          // v7:神秘金色食物 — 1/10 機率整份獎勵變金色(餵食成長值 ×2)
          const golden = Math.random() < 0.1;
          ST.addFoods(d, picks, golden);
          PLS.go('feast', { pet: this.petId, levelIdx: this.levelIdx, deluxe: res.deluxe, perfect: perfect, clears: res.clears, items: picks, golden: golden });
        } else {
          PLS.go('result', {
            pet: this.petId, levelIdx: this.levelIdx,
            correct: this.firstTryCount, practice: this.practice
          });
        }
      } else {
        this.next();
      }
    },

    drawTile: function (ctx, t, i, x, y, w, h) {
      const q = this.q; if (!q) return;
      const dead = this.wrong.has(i);
      ctx.save();
      if (dead) ctx.globalAlpha = 0.35;
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.15)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
      ctx.fillStyle = dead ? '#EDE6DC' : '#FFFFFF';
      A.rr(ctx, x, y, w, h, 28); ctx.fill();
      ctx.restore();
      const cx = x + w / 2, cy = y + h / 2;
      const opt = q.options[i];
      if (q.kind === 'shape') {
        // 支援 'shapeId|colorHex|colorZh' 格式的顏色題
        if (String(opt).indexOf('|') >= 0) {
          const parts = opt.split('|');
          A.drawShape(ctx, parts[0], cx, cy, 0.95, parts[1]);
        } else {
          A.drawShape(ctx, opt, cx, cy, 0.95);
        }
      } else if (q.kind === 'compose') {
        A.drawPair(ctx, opt, cx, cy, 0.95);
      } else if (q.kind === 'text') {
        const fit = A.fitText(ctx, String(opt), w - 34, h - 44, 46, 22);
        A.drawLines(ctx, fit.lines, fit.size, cx, cy, '#5E4A36');
      } else {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '84px ' + FONT; ctx.fillStyle = '#5E4A36';
        ctx.fillText(String(opt), cx, cy + 4);
      }
      ctx.restore();
    },

    drawQuestion: function (ctx, t) {
      const q = this.q;
      const cx = QC.x + QC.w / 2, cy = QC.y + QC.h / 2;
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.14)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
      ctx.fillStyle = '#FFFCF6';
      A.rr(ctx, QC.x, QC.y, QC.w, QC.h, 34); ctx.fill();
      ctx.restore();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

      if (!q) {
        ctx.font = '40px ' + FONT; ctx.fillStyle = '#A8927A';
        ctx.fillText(this.loadingBank ? '題目載入中…' : '這個單元還沒有題目喔', cx, cy);
        return;
      }

      if (q.kind === 'number') {
        ctx.font = '120px ' + FONT; ctx.fillStyle = '#5E4A36';
        ctx.fillText(q.display.a + ' ' + q.display.op + ' ' + q.display.b + ' = ?', cx, cy);
      } else if (q.kind === 'visual') {
        const d = q.display;
        function group(gx, n) {
          const gw = (n - 1) * 60;
          for (let k = 0; k < n; k++) A.drawFood(ctx, d.fruit, gx - gw / 2 + k * 60, cy - 26, 0.6);
        }
        group(cx - 175, d.a); group(cx + 175, d.b);
        ctx.font = '90px ' + FONT; ctx.fillStyle = '#C9A06A';
        ctx.fillText('+', cx, cy - 26);
        ctx.font = '44px ' + FONT; ctx.fillStyle = '#8A6242';
        ctx.fillText('一共有幾個?', cx, cy + 100);
      } else if (q.kind === 'shape') {
        ctx.font = '64px ' + FONT; ctx.fillStyle = '#5E4A36';
        ctx.fillText('找一找:' + q.display.targetZh, cx, cy - 44);
        // 顏色題:在問題文字左方補一個顏色圓點示意
        if (q.display.colorHex) {
          ctx.save();
          ctx.fillStyle = q.display.colorHex;
          ctx.beginPath(); ctx.arc(cx - 300, cy - 44, 20, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        ctx.font = '38px ' + FONT; ctx.fillStyle = '#A8927A';
        ctx.fillText('點下面正確的形狀', cx, cy + 56);
      } else if (q.kind === 'compose') {
        A.drawShape(ctx, q.display.target, cx, cy - 30, 1.25);
        ctx.font = '40px ' + FONT; ctx.fillStyle = '#8A6242';
        ctx.fillText('哪兩塊積木合起來,會變成它?', cx, cy + 96);
      } else if (q.kind === 'repeatadd') {
        const chainFit = A.fitText(ctx, q.display.chain + '  =  ?', QC.w - 120, 110, 66, 42);
        A.drawLines(ctx, chainFit.lines, chainFit.size, cx, cy - 28, '#5E4A36');
        ctx.font = '34px ' + FONT; ctx.fillStyle = '#A8927A';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(G.numZh(q.display.b) + ' 個 ' + G.numZh(q.display.a) + ' 相加，一共是多少?', cx, cy + 66);
      } else if (q.kind === 'text') {
        if (q.visual) {
          const fit = A.fitText(ctx, q.display.text, QC.w - 120, 96, 40, 24);
          A.drawLines(ctx, fit.lines, fit.size, cx, QC.y + 58, '#5E4A36');
          VIS.draw(ctx, q.visual, { x: QC.x + 50, y: QC.y + 116, w: QC.w - 100, h: QC.h - 150 });
        } else {
          const fit = A.fitText(ctx, q.display.text, QC.w - 130, QC.h - 90, 56, 30);
          A.drawLines(ctx, fit.lines, fit.size, cx, cy, '#5E4A36');
        }
      }
    },

    draw: function (ctx, t) {
      drawQuizWall(ctx);
      const tag = this.practice ? ' · 練習' : '';
      A.pill(ctx, W / 2, 64, this.lv.name + '(' + this.lv.sub + ')' + tag, '#8A6242', 'rgba(255,255,255,0.92)', 27);

      // 進度點(10 顆)
      for (let i = 0; i < CFG.questionsPerLevel; i++) {
        const x = W / 2 - 180 + i * 40, y = 120;
        if (i < this.qIndex) { ctx.fillStyle = '#A8D8B8'; A.el(ctx, x, y, 11, 11); ctx.fill(); }
        else if (i === this.qIndex) {
          const p = 1 + Math.sin(t * 4) * 0.18;
          ctx.fillStyle = '#F2B96B'; A.el(ctx, x, y, 12 * p, 12 * p); ctx.fill();
        } else { ctx.fillStyle = 'rgba(180,150,120,0.3)'; A.el(ctx, x, y, 9, 9); ctx.fill(); }
      }
      // Combo 徽章(streak >= 2)
      if (this.streak >= 2) {
        const pulse = 1 + Math.sin(t * 5) * 0.04;
        const bx = W / 2 + 220, by = 120;
        const label = '🔥 ' + this.streak + ' 連對!';
        const bg = this.streak >= 5 ? '#E84A1A' : '#F2A040';
        ctx.save();
        ctx.translate(bx, by); ctx.scale(pulse, pulse); ctx.translate(-bx, -by);
        ctx.font = '700 22px ' + FONT;
        const tw = ctx.measureText(label).width;
        const pw = tw + 28, ph = 36, pr = 18;
        ctx.fillStyle = bg; A.rr(ctx, bx - pw / 2, by - ph / 2, pw, ph, pr); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, bx, by + 1);
        ctx.restore();
      }

      this.drawQuestion(ctx, t);

      // 寵物 + 盤子 / 星星(左側)
      ctx.save(); ctx.translate(PET.x, PET.y); ctx.scale(PET.s, PET.s);
      P.draw(this.species, ctx, t, { mode: this.petMode, stage: this.stage });
      ctx.restore();

      if (this.practice) {
        A.pill(ctx, PET.x, PLATE.y - 4, '練習中,不吃東西喔', '#A09182', 'rgba(255,255,255,0.85)', 21);
        for (let i = 0; i < this.stars; i++) {
          A.drawIcon(ctx, 'star', PET.x - 120 + (i % 5) * 60, PLATE.y + 40 + Math.floor(i / 5) * 54, 1.4, '#F2BD58');
        }
      } else {
        ctx.save();
        ctx.shadowColor = 'rgba(120,90,60,0.2)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
        ctx.fillStyle = '#FFFFFF'; A.el(ctx, PLATE.x, PLATE.y, PLATE.rx, PLATE.ry); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#F2E6D4'; A.el(ctx, PLATE.x, PLATE.y - 4, PLATE.rx - 26, PLATE.ry - 12); ctx.fill();
        for (let i = 0; i < this.plate; i++) {
          A.drawFood(ctx, this.lv.bite, SLOTS[i].x, SLOTS[i].y, 0.52);
        }
      }

      if (this.flying) {
        const f = this.flying;
        const k = Math.min(1, (t - f.start) / f.dur);
        const e = 1 - (1 - k) * (1 - k);
        const x = f.x0 + (f.x1 - f.x0) * e;
        const y = f.y0 + (f.y1 - f.y0) * e - Math.sin(k * Math.PI) * 110;
        A.drawFood(ctx, this.lv.bite, x, y, 0.7 - 0.15 * k);
      }
    },

    drawTop: function (ctx, t) {
      if (t < this.bubbleUntil) {
        A.bubble(ctx, PET.x + 30, PET.y - 200, this.bubbleText, { size: 24 });
      }
    }
  };

  function drawQuizWall(ctx) {
    ctx.fillStyle = '#FBF2E4'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(214,178,146,0.12)';
    for (let yy = 60; yy < H; yy += 90)
      for (let xx = Math.floor(yy / 90) % 2 ? 50 : 95; xx < W; xx += 90) { A.el(ctx, xx, yy, 7, 7); ctx.fill(); }
  }

  // ════════════════════════════════════════════════════
  // RESULT
  // ════════════════════════════════════════════════════
  const result = {
    enter: function (params) {
      const self = this;
      this.petId = params.pet;
      this.levelIdx = params.levelIdx;
      this.correct = params.correct;
      this.practice = params.practice;
      this.species = ST.load(this.petId).species || 'rabbit';   // v9:petId=slot,species=外觀
      this.stage = ST.growthInfo(ST.load(this.petId)).stage;
      this.msg = this.practice
        ? '練習完成!明天再請我吃大餐喔'
        : pickTalk(CFG.talk.almost);
      PLS.addButton({
        x: W / 2 - 160, y: 720, w: 320, h: 100,
        draw: function (ctx) {
          ctx.save();
          ctx.shadowColor = 'rgba(150,100,60,0.2)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
          ctx.fillStyle = '#F2B96B'; A.rr(ctx, W / 2 - 160, 720, 320, 100, 34); ctx.fill();
          ctx.restore();
          ctx.font = '38px ' + FONT; ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('回關卡地圖', W / 2, 772);
        },
        onTap: function () { PLS.go('map', { pet: self.petId }); }
      });
    },
    draw: function (ctx, t) {
      drawQuizWall(ctx);
      const lv = CFG.math[this.levelIdx];
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '50px ' + FONT; ctx.fillStyle = '#8A6242';
      ctx.fillText(this.practice ? '練習結束' : '這一關結束了', W / 2, 116);
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.14)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
      ctx.fillStyle = '#FFFCF6'; A.rr(ctx, W / 2 - 260, 188, 520, 196, 32); ctx.fill();
      ctx.restore();
      ctx.font = '32px ' + FONT; ctx.fillStyle = '#A8927A';
      ctx.fillText(lv.name + '(' + lv.sub + ')', W / 2, 248);
      ctx.font = '60px ' + FONT; ctx.fillStyle = '#5E4A36';
      ctx.fillText('答對 ' + this.correct + ' / ' + CFG.questionsPerLevel + ' 題', W / 2, 332);

      ctx.save(); ctx.translate(W / 2, 590); ctx.scale(0.7, 0.7);
      P.draw(this.species, ctx, t, { stage: this.stage });
      ctx.restore();
      A.bubble(ctx, W / 2, 430, this.msg, { size: 26 });
    }
  };

  // ════════════════════════════════════════════════════
  // FEAST(豐收,v4:食物收進背包)
  // ════════════════════════════════════════════════════
  const feast = {
    enter: function (params) {
      const self = this;
      this.petId = params.pet;
      this.lv = CFG.math[params.levelIdx];
      this.deluxe = !!params.deluxe;
      this.perfect = !!params.perfect;
      this.golden = !!params.golden;   // v7:金色食物開獎
      this.clears = params.clears || 0;
      // v5:優先用 params.items;fallback 向下相容
      this.items = params.items || (this.deluxe ? deluxeItems(this.lv) : this.lv.feast.items);
      this.feastName = this.deluxe
        ? (this.lv.feast.deluxeName || ('豪華版 · ' + this.lv.feast.name))
        : (this.lv.feast.basicName  || this.lv.feast.name);
      this.start = PLS.t;
      this.heartTimer = 0;
      this.species = ST.load(this.petId).species || 'rabbit';   // v9:petId=slot,species=外觀
      this.stage = ST.growthInfo(ST.load(this.petId)).stage;
      // 籃子:已飛進幾個
      this.basketCount = 0;
      // 飛入食物動畫:每個食物一個 flying 物件
      this.flyings = [];
      PLS.sfx.feast();
      // v5:語音依情境(v7:金色最稀有,優先講)
      var sayText;
      if (this.golden) { sayText = '哇!是金色食物!吃了會長得特別快!'; }
      else if (this.deluxe) { sayText = '豪華大豐收!背包裝得滿滿的!'; }
      else if (this.perfect) { sayText = '滿分!多送一份食物!'; }
      else { sayText = '太棒了,食物收進背包囉!'; }
      PLS.say(sayText);
      PLS.addButton({
        x: W / 2 - 160, y: 706, w: 320, h: 100,
        hidden: function () { return PLS.t - self.start < 2.5; },
        draw: function (ctx) {
          ctx.save();
          ctx.shadowColor = 'rgba(150,100,60,0.2)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
          ctx.fillStyle = '#F2B96B'; A.rr(ctx, W / 2 - 160, 706, 320, 100, 34); ctx.fill();
          ctx.restore();
          ctx.font = '38px ' + FONT; ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('收進背包!', W / 2, 758);
        },
        onTap: function () { PLS.go('map', { pet: self.petId }); }
      });
    },

    // 畫右側食物籃(圓角梯形 + 提把)
    drawBasket: function (ctx, bx, by) {
      ctx.save();
      // 提把(半圓弧)
      ctx.strokeStyle = '#C8913A'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(bx, by - 46, 34, Math.PI, 0); ctx.stroke();
      // 籃身(梯形,用四邊形)
      ctx.fillStyle = '#E8C47C';
      ctx.beginPath();
      ctx.moveTo(bx - 52, by - 22); ctx.lineTo(bx + 52, by - 22);
      ctx.lineTo(bx + 38, by + 46); ctx.lineTo(bx - 38, by + 46);
      ctx.closePath(); ctx.fill();
      // 籃紋(橫線)
      ctx.strokeStyle = '#C8913A'; ctx.lineWidth = 3; ctx.lineCap = 'butt';
      for (let li = 0; li < 3; li++) {
        const ly = by - 8 + li * 18;
        const lw = 44 + li * 8;
        ctx.beginPath(); ctx.moveTo(bx - lw, ly); ctx.lineTo(bx + lw, ly); ctx.stroke();
      }
      ctx.restore();
    },

    draw: function (ctx, t) {
      const self = this;
      const k = t - this.start;
      ctx.fillStyle = this.deluxe ? '#FBE6C0' : '#FBEDD8'; ctx.fillRect(0, 0, W, H);
      const rg = ctx.createRadialGradient(W / 2, 420, 80, W / 2, 420, 620);
      if (this.deluxe) { rg.addColorStop(0, 'rgba(255,205,110,0.6)'); rg.addColorStop(1, 'rgba(255,205,110,0)'); }
      else { rg.addColorStop(0, 'rgba(255,222,160,0.5)'); rg.addColorStop(1, 'rgba(255,222,160,0)'); }
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      // 彩旗
      for (let i = 0; i < 14; i++) {
        const fx = 50 + i * 90, fy = 60 + Math.sin(i * 1.3) * 14;
        ctx.fillStyle = ['#F4A8A0', '#8FC9A8', '#92B8E0', '#F6C95E'][i % 4];
        ctx.beginPath();
        ctx.moveTo(fx - 22, fy); ctx.lineTo(fx + 22, fy); ctx.lineTo(fx, fy + 36);
        ctx.closePath(); ctx.fill();
      }

      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '56px ' + FONT;
      // v5:標題依豪華/滿分/普通分三種
      const title = this.deluxe ? '豪華大豐收!' : (this.perfect ? '滿分收穫!' : '收穫滿滿!');
      const titleColor = this.deluxe ? '#C2591E' : (this.perfect ? '#C2791E' : '#C97B4A');
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText(title, W / 2, 134);
      ctx.fillStyle = titleColor; ctx.fillText(title, W / 2, 130);
      // pill 行:豪華用食物名稱;滿分/普通若 items.length >= 2 加 ×2 獎勵 pill
      const pillY = 192;
      if (this.deluxe) {
        A.pill(ctx, W / 2, pillY, '✨ ' + this.feastName + ' ✨', '#C2591E', 'rgba(255,240,205,0.96)', 28);
      } else {
        A.pill(ctx, W / 2, pillY, this.feastName, '#B98A4F', 'rgba(255,255,255,0.92)', 28);
        // ×2 徽章放標題右側(W/2, 252 有寵物對話泡泡,別壓到)
        if (this.items.length >= 2) {
          A.pill(ctx, W / 2 + 300, 130, '×2 獎勵!', '#FFFFFF', '#E8964E', 24);
        }
      }
      // v7:金色食物徽章(標題左側,與 ×2 徽章對稱;豪華也可能開出金色)
      if (this.golden) {
        A.pill(ctx, W / 2 - 300, 130, '✨ 金色食物!', '#7A5410', '#FFE08A', 24);
      }

      // 桌子
      ctx.fillStyle = '#E0B98A'; A.rr(ctx, 160, 600, W - 320, 44, 20); ctx.fill();
      ctx.fillStyle = '#CDA170'; A.rr(ctx, 210, 640, 36, 150, 12); ctx.fill();
      A.rr(ctx, W - 246, 640, 36, 150, 12); ctx.fill();
      // 大餐盤(豪華版→金色盤)
      ctx.save();
      ctx.shadowColor = 'rgba(120,90,60,0.22)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
      ctx.fillStyle = this.deluxe ? '#F6C44A' : '#FFFFFF';
      A.el(ctx, W / 2, 594, 250, 54); ctx.fill();
      if (this.deluxe) {
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#C98A18'; ctx.lineWidth = 3;
        A.el(ctx, W / 2, 594, 250, 54); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
        A.el(ctx, W / 2, 592, 210, 38); ctx.stroke();
      }
      ctx.restore();

      // 食物依序彈出:計算各個食物位置與 pop
      const items = this.items;
      // v5:1–2 個時放大顯示;3+ 沿用原比例
      const feastScale = this.deluxe ? 1.28 : (items.length <= 2 ? 1.1 * 1.4 : 1.1);
      const gap = items.length > 5 ? 76 : (items.length <= 2 ? 130 : 90);

      // 籃子座標(右側,桌子上方)
      const bx = W - 110, by = 552;

      // v7:金色開獎 → 食物用金色版渲染
      const dFood = this.golden ? A.drawFoodGold : A.drawFood;

      // 食物彈出 + 飛入籃
      items.forEach(function (key, i) {
        const ik = (k - 0.4 - i * 0.3);
        if (ik < 0) return;
        const itemX = W / 2 + (i - (items.length - 1) / 2) * gap;
        const itemY = 558;
        // 飛行動畫:食物彈出 0.9 秒後開始飛
        const flyDelay = 0.9;
        const flyDur = 0.7;
        const ek = ik - flyDelay;
        if (ek < 0) {
          // 尚未飛走:盤子上彈出
          const pop = ik < 0.35 ? 1 + Math.sin(ik / 0.35 * Math.PI) * 0.28 : 1;
          dFood(ctx, key, itemX, itemY, feastScale * pop);
        } else if (ek < flyDur) {
          // 飛行中:拋物線飛向籃子
          const fe = ek / flyDur;
          const ease = 1 - (1 - fe) * (1 - fe);
          const fx = itemX + (bx - itemX) * ease;
          const fy = itemY + (by - itemY) * ease - Math.sin(fe * Math.PI) * 90;
          dFood(ctx, key, fx, fy, feastScale * (1 - 0.3 * fe));
        } else {
          // 已飛入籃:標記 basketCount 並觸發粒子
          if (self.basketCount <= i) {
            self.basketCount = i + 1;
            PLS.burst(bx, by, 'small');
          }
          // 食物不再單獨顯示(已在籃中)
        }
      });

      // ── 右側食物籃 ──
      self.drawBasket(ctx, bx, by);
      // 籃上數量徽章
      if (self.basketCount > 0) {
        ctx.save();
        ctx.shadowColor = 'rgba(150,100,40,0.4)'; ctx.shadowBlur = 8;
        ctx.fillStyle = '#F2591E'; A.el(ctx, bx + 44, by - 68, 22, 22); ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.font = '700 22px ' + FONT; ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(self.basketCount), bx + 44, by - 68);
        ctx.restore();
      }

      // ── 累積進度條 ─────────────────────────────────────────
      var dAt = ST.deluxeAt();          // 10
      var bCY = 660, bSpc = 50, bR = 14;
      var bTW = (dAt - 1) * bSpc;
      var bX0 = W / 2 - bTW / 2;
      var bClears = Math.min(this.clears, dAt);
      ctx.save();
      // 底線
      ctx.strokeStyle = 'rgba(180,140,95,0.22)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bX0, bCY); ctx.lineTo(bX0 + bTW, bCY); ctx.stroke();
      if (bClears >= 2) {
        ctx.strokeStyle = this.deluxe ? '#F6C44A' : '#F2BD58';
        ctx.beginPath();
        ctx.moveTo(bX0, bCY);
        ctx.lineTo(bX0 + (bClears - 1) * bSpc, bCY);
        ctx.stroke();
      }
      // 各格
      for (var bi = 0; bi < dAt; bi++) {
        var bSX = bX0 + bi * bSpc;
        var bFil = bi < bClears;
        ctx.save();
        if (bi < dAt - 1) {
          // 一般進度點
          if (bFil) {
            ctx.shadowColor = 'rgba(150,100,40,0.22)'; ctx.shadowBlur = 8;
            ctx.fillStyle = this.deluxe ? '#F6C44A' : '#F2B96B';
          } else {
            ctx.fillStyle = 'rgba(190,165,135,0.32)';
          }
          A.el(ctx, bSX, bCY, bR, bR); ctx.fill();
          if (bFil) {
            ctx.shadowColor = 'transparent';
            A.drawFood(ctx, this.lv.bite, bSX, bCY, 0.32);
          }
        } else {
          // 最後一格:豪華皇冠
          if (bFil) {
            ctx.shadowColor = 'rgba(250,200,60,0.6)'; ctx.shadowBlur = 20;
            ctx.fillStyle = '#F6C44A';
            A.el(ctx, bSX, bCY, bR + 7, bR + 7); ctx.fill();
            ctx.shadowColor = 'transparent';
            A.drawFood(ctx, this.lv.bite, bSX, bCY, 0.44);
            window.PLS_CROWN(ctx, bSX + bR + 1, bCY - bR - 1, 0.56, '#F6C44A');
          } else {
            // 尚未解鎖:食物圖示 gray out + 皇冠
            ctx.globalAlpha = 0.28;
            ctx.fillStyle = '#C0A870';
            A.el(ctx, bSX, bCY, bR + 7, bR + 7); ctx.fill();
            ctx.globalAlpha = 0.26;
            A.drawFood(ctx, this.lv.bite, bSX, bCY, 0.44);
            ctx.globalAlpha = 0.4;
            window.PLS_CROWN(ctx, bSX + bR + 1, bCY - bR - 1, 0.56, '#8A6438');
          }
        }
        ctx.restore();
      }
      // 說明文字
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '19px ' + FONT; ctx.globalAlpha = 0.72;
      ctx.fillStyle = this.deluxe ? '#C2591E' : '#9A7B5C';
      ctx.fillText(
        bClears >= dAt
          ? '豪華版已解鎖！共解了 ' + bClears + ' 次！'
          : '已解 ' + bClears + ' / ' + dAt + ' 次・集滿就有豪華大豐收！',
        W / 2, bCY + 27
      );
      ctx.restore();

      // 豪華版:寵物頭上的金皇冠(畫在寵物之後)

      // v4:寵物模式改 'happy'(食物收進背包,牠很開心但沒在吃)
      ctx.save(); ctx.translate(W / 2, 410);
      P.draw(this.species, ctx, t, { mode: 'happy', stage: this.stage });
      ctx.restore();
      if (this.deluxe) window.PLS_CROWN(ctx, W / 2, 322, 2.1, '#F6C44A');
      // v4:對話泡泡改用 harvest / harvestDeluxe
      const talkList = this.deluxe ? CFG.talk.harvestDeluxe : CFG.talk.harvest;
      A.bubble(ctx, W / 2, 252, k < 3.4 ? talkList[0] : talkList[1 % talkList.length], { size: 28 });

      this.heartTimer -= 1 / 60;
      if (this.heartTimer <= 0 && k < 7) {
        this.heartTimer = this.deluxe ? 0.3 : 0.5;
        PLS.burst(W / 2 + (Math.random() - 0.5) * 340, 430, 'small');
      }
    }
  };

  PLS.register('quiz', quiz);
  PLS.register('result', result);
  PLS.register('feast', feast);
})();
