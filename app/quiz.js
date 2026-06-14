// quiz.js — 答題流程(10 題)、結果、吃大餐 — 寬版(平板橫向)
(function () {
  const PLS = window.PLS, A = window.PLS_ART, P = window.PLS_PETS;
  const CFG = window.PLS_CONFIG, ST = window.PLS_STORE, G = window.PLS_GEN;
  const VIS = window.PLS_VIS;
  const W = PLS.W, H = PLS.H, FONT = A.FONT;

  function pickTalk(list) { return list[Math.floor(Math.random() * list.length)]; }

  // 豪華大餐:拿原本的大餐加碼兩樣甜點,擺更滿、更豐盛
  function deluxeItems(lv) {
    if (lv.feastDeluxe) return lv.feastDeluxe;
    const b = lv.feast.items, n = b.length;
    return [b[0], 'cake', b[1 % n], 'sundae', b[2 % n], 'scoop', b[3 % n]];
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
      this.bubbleText = this.practice ? pickTalk(CFG.talk.practice) : pickTalk(CFG.talk.welcome);
      this.bubbleUntil = PLS.t + 3;
      this.flying = null;
      this.locked = false;
      this.plate = 0;
      this.stars = 0;
      this.tiles = [];
      this.bankQueue = null;

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
      // 三張答案卡
      const x0 = (QC.x + QC.w / 2) - (TILE.w * 3 + TILE.gap * 2) / 2;
      for (let i = 0; i < 3; i++) {
        (function (i) {
          const bx = x0 + i * (TILE.w + TILE.gap);
          const b = PLS.addButton({
            x: bx, y: TILE.y, w: TILE.w, h: TILE.h,
            draw: function (ctx, t) { self.drawTile(ctx, t, i, bx, TILE.y, TILE.w, TILE.h); },
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
      const diff = this.streak >= 4 ? 2 : this.streak >= 2 ? 1 : 0;
      this.q = this.lv.bank ? this.pickBank() : G.gen[this.lv.gen](diff);
      this.locked = false;
      if (this.q) PLS.say(this.q.say);
    },

    pickBank: function () {
      const BANK = window.PLS_BANK;
      if (!this.bankQueue || !this.bankQueue.length) {
        this.bankQueue = G.shuffle(BANK.list(this.lv.bank).slice());
      }
      const item = this.bankQueue.shift();
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
        if (this.firstTry) { this.firstTryCount++; this.streak++; }
        else this.streak = 0;
        PLS.sfx.correct();
        const tile = this.tiles[i];
        const fx = tile.x + tile.w / 2, fy = tile.y + tile.h / 2;
        if (this.practice) {
          this.stars++;
          PLS.burst(fx, fy, 'small');
          this.petMode = 'happy';
          this.bubbleText = pickTalk(CFG.talk.practiceCorrect);
          this.bubbleUntil = PLS.t + 1.6;
          setTimeout(function () { self.petMode = 'idle'; self.advance(); }, 1100);
        } else {
          this.flying = { x0: fx, y0: fy, x1: PET.x, y1: PET.y - 40, start: PLS.t, dur: 0.55 };
          setTimeout(function () {
            self.flying = null;
            self.petMode = 'chew';
            PLS.sfx.bite();
            self.plate++;
            if (Math.random() < 0.45) {
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
        PLS.sfx.wrong();
        this.bubbleText = pickTalk(CFG.talk.wrong);
        this.bubbleUntil = PLS.t + 2.2;
      }
    },

    advance: function () {
      this.qIndex++;
      if (this.qIndex >= CFG.questionsPerLevel) {
        const d = ST.load(this.petId);
        const res = ST.recordRun(d, 'math', this.lv.id,
          this.firstTryCount, CFG.questionsPerLevel, this.practice);
        if (res.feast) PLS.go('feast', { pet: this.petId, levelIdx: this.levelIdx, deluxe: res.deluxe, clears: res.clears });
        else PLS.go('result', {
          pet: this.petId, levelIdx: this.levelIdx,
          correct: this.firstTryCount, practice: this.practice
        });
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
        A.drawShape(ctx, opt, cx, cy, 0.95);
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
        ctx.font = '38px ' + FONT; ctx.fillStyle = '#A8927A';
        ctx.fillText('點下面正確的形狀', cx, cy + 56);
      } else if (q.kind === 'compose') {
        A.drawShape(ctx, q.display.target, cx, cy - 30, 1.25);
        ctx.font = '40px ' + FONT; ctx.fillStyle = '#8A6242';
        ctx.fillText('哪兩塊積木合起來,會變成它?', cx, cy + 96);
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

      this.drawQuestion(ctx, t);

      // 寵物 + 盤子 / 星星(左側)
      ctx.save(); ctx.translate(PET.x, PET.y); ctx.scale(PET.s, PET.s);
      P.draw(this.petId, ctx, t, { mode: this.petMode });
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
      P.draw(this.petId, ctx, t, {});
      ctx.restore();
      A.bubble(ctx, W / 2, 430, this.msg, { size: 26 });
    }
  };

  // ════════════════════════════════════════════════════
  // FEAST(吃大餐)
  // ════════════════════════════════════════════════════
  const feast = {
    enter: function (params) {
      const self = this;
      this.petId = params.pet;
      this.lv = CFG.math[params.levelIdx];
      this.deluxe = !!params.deluxe;
      this.clears = params.clears || 0;
      this.items = this.deluxe ? deluxeItems(this.lv) : this.lv.feast.items;
      this.feastName = this.deluxe ? ('豪華版 · ' + this.lv.feast.name) : this.lv.feast.name;
      this.start = PLS.t;
      this.heartTimer = 0;
      PLS.sfx.feast();
      PLS.say(this.deluxe ? '哇,豪華大餐耀!' : '太棒了,吃大餐囉!');
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
          ctx.fillText('吃飽收工!', W / 2, 758);
        },
        onTap: function () { PLS.go('map', { pet: self.petId }); }
      });
    },
    draw: function (ctx, t) {
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
      const title = this.deluxe ? '豪華大餐耀!' : '吃大餐囉!';
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText(title, W / 2, 134);
      ctx.fillStyle = this.deluxe ? '#C2591E' : '#C97B4A'; ctx.fillText(title, W / 2, 130);
      if (this.deluxe) A.pill(ctx, W / 2, 192, '✨ ' + this.feastName + ' ✨', '#C2591E', 'rgba(255,240,205,0.96)', 28);
      else A.pill(ctx, W / 2, 192, this.feastName, '#B98A4F', 'rgba(255,255,255,0.92)', 28);

      // 桌子
      ctx.fillStyle = '#E0B98A'; A.rr(ctx, 160, 600, W - 320, 44, 20); ctx.fill();
      ctx.fillStyle = '#CDA170'; A.rr(ctx, 210, 640, 36, 150, 12); ctx.fill();
      A.rr(ctx, W - 246, 640, 36, 150, 12); ctx.fill();
      // 大餐盤
      ctx.save();
      ctx.shadowColor = 'rgba(120,90,60,0.22)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
      ctx.fillStyle = '#FFFFFF'; A.el(ctx, W / 2, 594, 250, 54); ctx.fill();
      ctx.restore();
      const items = this.items;
      const gap = items.length > 5 ? 78 : 92;
      items.forEach(function (key, i) {
        const ik = (k - 0.4 - i * 0.3);
        if (ik < 0) return;
        const pop = ik < 0.35 ? 1 + Math.sin(ik / 0.35 * Math.PI) * 0.25 : 1;
        const x = W / 2 + (i - (items.length - 1) / 2) * gap;
        A.drawFood(ctx, key, x, 558, 1.1 * pop);
      });

      // 豪華版:寵物頭上的金皇冠(畫在寵物之後)

      // 寵物開心跳
      ctx.save(); ctx.translate(W / 2, 410);
      P.draw(this.petId, ctx, t, { mode: k < 6 ? 'happy' : 'chew' });
      ctx.restore();
      if (this.deluxe) window.PLS_CROWN(ctx, W / 2, 322, 2.1, '#F6C44A');
      const talk = this.deluxe ? CFG.talk.feastDeluxe : CFG.talk.feast;
      A.bubble(ctx, W / 2, 252, k < 3.4 ? talk[0] : talk[1], { size: 28 });

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
