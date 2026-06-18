// points.js — 積分系統:全域積分 HUD + 獎品商店(shop)+ 手寫練習過關畫面(hwpass)
// 積分本寵物獨立(存在 pet.points);獎品目錄與「隱藏功能」開關是全域(見 store.js)。
(function () {
  const PLS = window.PLS, A = window.PLS_ART, ST = window.PLS_STORE, CFG = window.PLS_CONFIG, P = window.PLS_PETS;
  const W = PLS.W, H = PLS.H, FONT = A.FONT;

  // ── 小金幣 ──
  function coin(ctx, x, y, r) {
    ctx.save();
    ctx.fillStyle = '#D99A1A'; A.el(ctx, x, y, r, r); ctx.fill();
    ctx.fillStyle = '#F6C94E'; A.el(ctx, x, y, r - 2.5, r - 2.5); ctx.fill();
    A.drawIcon(ctx, 'star', x, y, r * 0.046, '#E0A41C');
    ctx.restore();
  }
  // ── 禮物盒 ──
  function gift(ctx, x, y, s) {
    s = s || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#F4A8A0'; A.rr(ctx, -22, -10, 44, 30, 6); ctx.fill();
    ctx.fillStyle = '#EC9088'; A.rr(ctx, -24, -14, 48, 12, 5); ctx.fill();
    ctx.fillStyle = '#F6C95E'; ctx.fillRect(-4, -14, 8, 34);
    ctx.fillStyle = '#F6C95E'; A.el(ctx, -9, -18, 7, 5); ctx.fill(); A.el(ctx, 9, -18, 7, 5); ctx.fill();
    ctx.restore();
  }

  function backBtn(toScreen, params) {
    PLS.addButton({
      x: 30, y: 30, w: 84, h: 84,
      draw: function (ctx) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; A.rr(ctx, 30, 30, 84, 84, 26); ctx.fill();
        A.drawIcon(ctx, 'back', 72, 72, 1.1, '#9A7B5C');
      },
      onTap: function () { PLS.go(toScreen, params || {}); }
    });
  }

  // ════════════════════════════════════════════════════
  // 全域積分 HUD：每個畫面左上角(返回鈕右邊),過關 / 兌換時 +N / −N 飄字
  // ════════════════════════════════════════════════════
  const HUD = {
    pet: null, display: 0, target: 0, dirty: true,
    flashAmt: 0, flashSign: 1, flashT: -10,
    visible: false, rect: null, _down: false,
    mark: function () { this.dirty = true; },
    // 點金幣 → 直接進獎品商店(在獎品商店裡不重複進入)
    hitTest: function (x, y) {
      if (!this.visible || !this.rect || PLS.currentName === 'shop') return false;
      const r = this.rect;
      return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    },
    tap: function () { if (PLS.activePet) PLS.go('shop', { pet: PLS.activePet }); },
    sync: function () {
      const pet = PLS.activePet;
      if (!pet) { this.pet = null; return; }              // 首頁:不顯示
      if (!this.dirty && pet === this.pet) return;
      this.dirty = false;
      const pts = ST.getPoints(ST.load(pet));
      if (pet !== this.pet) {                              // 換寵物 → 直接套用,不播動畫
        this.pet = pet; this.display = pts; this.target = pts; return;
      }
      if (pts !== this.target) {                           // 分數有變 → 播 +N / −N
        this.flashAmt = Math.abs(pts - this.target);
        this.flashSign = pts >= this.target ? 1 : -1;
        this.flashT = PLS.t;
        this.target = pts;
      }
    },
    draw: function (ctx, t, dt) {
      this.sync();
      this.visible = false;
      if (!this.pet || ST.rewardsHidden()) return;         // 隱藏功能時不顯示
      let diff = this.target - this.display;
      if (Math.abs(diff) < 0.4) this.display = this.target;
      else this.display += diff * Math.min(1, dt * 9);
      const shown = Math.round(this.display);

      const cy = 54, h = 52;
      ctx.font = '30px ' + FONT;
      const numW = ctx.measureText(String(shown)).width;
      const w = 50 + numW + 22 + 26;     // +26 給右側小箭頭(可點進商店的暗示)
      // 固定在右上角(右對齊);遇到右上角已有控制鈕的畫面就往左讓位
      let rightEdge = W - 30;
      const nm = PLS.currentName;
      if (nm === 'quiz' || nm === 'eplay') rightEdge = W - 128;     // 喇叭鈕在 W-114
      else if (nm === 'epractice') rightEdge = W - 264;             // 大小寫鈕在 W-250
      const x = rightEdge - w;
      this.rect = { x: x, y: cy - h / 2, w: w, h: h };
      this.visible = true;

      const s = this._down ? 0.94 : 1;
      ctx.save();
      ctx.translate(x + w / 2, cy); ctx.scale(s, s); ctx.translate(-(x + w / 2), -cy);
      ctx.font = '30px ' + FONT;
      ctx.shadowColor = 'rgba(150,110,70,0.18)'; ctx.shadowBlur = 9; ctx.shadowOffsetY = 3;
      ctx.fillStyle = 'rgba(255,251,240,0.97)';
      A.rr(ctx, x, cy - h / 2, w, h, h / 2); ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#F0DBAB'; ctx.lineWidth = 2;
      A.rr(ctx, x, cy - h / 2, w, h, h / 2); ctx.stroke();
      coin(ctx, x + 28, cy, 15);
      ctx.fillStyle = '#C2851E'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(String(shown), x + 50, cy + 1);
      // 右側小箭頭:暗示「可以點進去」
      ctx.strokeStyle = '#D9A85A'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x + w - 24, cy - 7); ctx.lineTo(x + w - 16, cy); ctx.lineTo(x + w - 24, cy + 7);
      ctx.stroke();
      ctx.restore();

      const k = t - this.flashT;
      if (this.flashAmt > 0 && k >= 0 && k < 1.15) {
        const pr = k / 1.15;
        const a = pr < 0.16 ? pr / 0.16 : 1 - (pr - 0.16) / 0.84;
        ctx.save();
        ctx.globalAlpha = Math.max(0, a);
        ctx.font = '700 32px ' + FONT;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';      // 飄字放膠囊左邊,往左上飄,避免超出畫面右緣
        ctx.fillStyle = this.flashSign > 0 ? '#54A268' : '#D98268';
        ctx.fillText((this.flashSign > 0 ? '+' : '−') + this.flashAmt, x - 12, cy - pr * 26);
        ctx.restore();
      }
    }
  };
  window.PLS_POINTS = HUD;

  // ════════════════════════════════════════════════════
  // 獎品商店(shop):顯示本寵物積分 + 獎品清單,點「兌換」扣點數
  // ════════════════════════════════════════════════════
  const shop = {
    petId: 'rabbit',
    enter: function (params) {
      this.petId = params.pet || 'rabbit';
      this.prizes = ST.getPrizes();
      this.scroll = 0;
      this.mode = 'list';           // 'list' | 'confirm' | 'done'
      this.sel = null;
      this.note = ''; this.noteT = -10;
      this._pdown = false; this._drag = false;
      this.rowH = 104; this.gap = 16; this.listTop = 196; this.listBot = H - 28;
      this.maxScroll = Math.max(0, this.prizes.length * (this.rowH + this.gap) - (this.listBot - this.listTop));
      backBtn('room', { pet: this.petId });
    },
    onWheel: function (dy) {
      if (this.mode !== 'list') return;
      this.scroll = Math.max(0, Math.min(this.maxScroll, this.scroll + dy));
    },
    pointer: function (phase, x, y) {
      if (this.mode !== 'list') { if (phase === 'up') this.modalTap(x, y); return; }
      if (phase === 'down') { this._py = y; this._ps = this.scroll; this._drag = false; this._pdown = true; }
      else if (phase === 'move') {
        if (!this._pdown) return;
        const dy = y - this._py;
        if (Math.abs(dy) > 6) this._drag = true;
        this.scroll = Math.max(0, Math.min(this.maxScroll, this._ps - dy));
      } else if (phase === 'up') {
        const wasDrag = this._drag; this._pdown = false; this._drag = false;
        if (!wasDrag) this.listTap(x, y);
      }
    },
    listTap: function (x, y) {
      const pts = ST.getPoints(ST.load(this.petId));
      for (let i = 0; i < this.prizes.length; i++) {
        const top = this.listTop + i * (this.rowH + this.gap) - this.scroll;
        if (top + this.rowH < this.listTop || top > this.listBot) continue;
        const bx = 868, by = top + this.rowH / 2 - 34, bw = 176, bh = 68;
        if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
          const pz = this.prizes[i];
          if (pts >= pz.cost) { this.sel = pz; this.mode = 'confirm'; PLS.sfx.tap(); }
          else { this.note = '點數不夠囉,再多過幾關吧!'; this.noteT = PLS.t; PLS.sfx.wrong(); }
          return;
        }
      }
    },
    modalTap: function (x, y) {
      function inR(r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
      const CANCEL = { x: W / 2 - 250, y: 486, w: 220, h: 96 };
      const OK = { x: W / 2 + 30, y: 486, w: 220, h: 96 };
      const DONE = { x: W / 2 - 130, y: 520, w: 260, h: 92 };
      if (this.mode === 'confirm') {
        if (inR(OK)) {
          const d = ST.load(this.petId);
          if (ST.redeem(d, this.sel.cost)) {
            if (window.PLS_POINTS) window.PLS_POINTS.mark();
            PLS.sfx.feast(); PLS.burst(W / 2, 360, 'feast');
            this.mode = 'done'; this.doneT = PLS.t;
          } else { this.mode = 'list'; }
        } else if (inR(CANCEL)) { this.mode = 'list'; PLS.sfx.tap(); }
      } else if (this.mode === 'done') {
        if (inR(DONE)) { this.mode = 'list'; this.sel = null; PLS.sfx.tap(); }
      }
    },
    drawRow: function (ctx, i, pts) {
      const pz = this.prizes[i];
      const top = this.listTop + i * (this.rowH + this.gap) - this.scroll;
      if (top + this.rowH < this.listTop - 8 || top > this.listBot + 8) return;
      const x = 130, w = 934, h = this.rowH;
      ctx.save();
      ctx.shadowColor = 'rgba(150,110,70,0.12)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#FFFCF6'; A.rr(ctx, x, top, w, h, 24); ctx.fill();
      ctx.restore();
      gift(ctx, x + 54, top + h / 2, 1.1);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '30px ' + FONT; ctx.fillStyle = '#6E5238';
      ctx.fillText(pz.name, x + 110, top + h / 2 - 14);
      coin(ctx, x + 122, top + h / 2 + 22, 11);
      ctx.font = '21px ' + FONT; ctx.fillStyle = '#B98A4F';
      ctx.fillText('需要 ' + pz.cost + ' 點', x + 140, top + h / 2 + 23);
      const bx = 868, by = top + h / 2 - 34, bw = 176, bh = 68;
      const can = pts >= pz.cost;
      ctx.save();
      if (can) { ctx.shadowColor = 'rgba(180,120,40,0.28)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5; }
      ctx.fillStyle = can ? '#F2A93C' : '#E8DEC9';
      A.rr(ctx, bx, by, bw, bh, 22); ctx.fill();
      ctx.restore();
      ctx.font = '28px ' + FONT; ctx.fillStyle = can ? '#FFFFFF' : '#B6A488';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(can ? '兌換' : ('差 ' + (pz.cost - pts) + ' 點'), bx + bw / 2, by + bh / 2);
    },
    draw: function (ctx, t) {
      ctx.fillStyle = '#FBF2E0'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '46px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText('獎品商店', W / 2, 72);
      ctx.fillStyle = '#C2851E'; ctx.fillText('獎品商店', W / 2, 68);
      const d = ST.load(this.petId), pts = ST.getPoints(d);
      const name = d.name || CFG.pets[this.petId].name;
      A.pill(ctx, W / 2, 138, name + ' 目前有 ' + pts + ' 點', '#B98A4F', 'rgba(255,255,255,0.94)', 24);

      ctx.save();
      ctx.beginPath(); A.rr(ctx, 116, this.listTop - 8, W - 232, this.listBot - this.listTop + 16, 22); ctx.clip();
      if (this.prizes.length === 0) {
        ctx.fillStyle = '#A8927A'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '30px ' + FONT; ctx.fillText('家長還沒設定獎品喔', W / 2, 320);
        ctx.font = '22px ' + FONT; ctx.fillText('請到「家長區 → 獎品商店」新增獎品', W / 2, 366);
      } else {
        for (let i = 0; i < this.prizes.length; i++) this.drawRow(ctx, i, pts);
      }
      ctx.restore();

      if (this.maxScroll > 2) {
        const trackH = this.listBot - this.listTop;
        const th = Math.max(40, trackH * trackH / (trackH + this.maxScroll));
        const ty = this.listTop + (trackH - th) * (this.scroll / this.maxScroll);
        ctx.fillStyle = 'rgba(150,120,80,0.22)'; A.rr(ctx, W - 96, ty, 8, th, 4); ctx.fill();
      }

      if (this.note && t - this.noteT < 1.8) A.bubble(ctx, W / 2, this.listBot - 24, this.note, { size: 22 });

      if (this.mode === 'confirm') this.drawConfirm(ctx);
      else if (this.mode === 'done') this.drawDone(ctx, t);
    },
    drawConfirm: function (ctx) {
      ctx.fillStyle = 'rgba(90,70,50,0.42)'; ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.shadowColor = 'rgba(90,60,30,0.3)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
      ctx.fillStyle = '#FFFCF6'; A.rr(ctx, W / 2 - 300, 250, 600, 300, 32); ctx.fill();
      ctx.restore();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '32px ' + FONT; ctx.fillStyle = '#8A6242';
      ctx.fillText('要兌換這個獎品嗎?', W / 2, 320);
      A.pill(ctx, W / 2, 388, this.sel.name + ' · ' + this.sel.cost + ' 點', '#C2851E', 'rgba(255,244,216,0.96)', 26);
      ctx.fillStyle = '#EDE2D0'; A.rr(ctx, W / 2 - 250, 486, 220, 96, 28); ctx.fill();
      ctx.font = '32px ' + FONT; ctx.fillStyle = '#8A6242'; ctx.fillText('取消', W / 2 - 140, 535);
      ctx.save(); ctx.shadowColor = 'rgba(180,120,40,0.3)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
      ctx.fillStyle = '#F2A93C'; A.rr(ctx, W / 2 + 30, 486, 220, 96, 28); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#FFFFFF'; ctx.fillText('確定兌換', W / 2 + 140, 535);
    },
    drawDone: function (ctx, t) {
      ctx.fillStyle = 'rgba(90,70,50,0.42)'; ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.shadowColor = 'rgba(90,60,30,0.3)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
      ctx.fillStyle = '#FFFCF6'; A.rr(ctx, W / 2 - 300, 230, 600, 360, 32); ctx.fill();
      ctx.restore();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '44px ' + FONT; ctx.fillStyle = '#54A268';
      ctx.fillText('兌換成功!', W / 2, 312);
      if (this.sel) A.pill(ctx, W / 2, 378, this.sel.name, '#C2851E', 'rgba(255,244,216,0.96)', 26);
      ctx.font = '26px ' + FONT; ctx.fillStyle = '#8A6242';
      ctx.fillText('獎品要找爸爸媽媽拿喔!', W / 2, 446);
      ctx.save(); ctx.shadowColor = 'rgba(120,150,110,0.28)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
      ctx.fillStyle = '#8FC9A8'; A.rr(ctx, W / 2 - 130, 520, 260, 92, 30); ctx.fill(); ctx.restore();
      ctx.font = '34px ' + FONT; ctx.fillStyle = '#FFFFFF'; ctx.fillText('好', W / 2, 567);
    }
  };

  // ════════════════════════════════════════════════════
  // 字母手寫練習過關畫面(hwpass):描完一輪的小慶祝 + 顯示得分狀況
  // ════════════════════════════════════════════════════
  const hwpass = {
    enter: function (params) {
      const self = this;
      this.petId = params.pet || 'rabbit';
      this.awarded = !!params.awarded;
      this.capped = !!params.capped;
      this.dailyLeft = params.dailyLeft | 0;
      this.start = PLS.t; this.heartTimer = 0;
      if (this.awarded) PLS.sfx.feast(); else PLS.sfx.correct();
      PLS.addButton({
        x: W / 2 - 330, y: 700, w: 300, h: 100,
        draw: function (ctx) {
          ctx.fillStyle = '#FFFFFF'; A.rr(ctx, W / 2 - 330, 700, 300, 100, 32); ctx.fill();
          ctx.strokeStyle = '#D8E0D2'; ctx.lineWidth = 3; A.rr(ctx, W / 2 - 330, 700, 300, 100, 32); ctx.stroke();
          ctx.font = '34px ' + FONT; ctx.fillStyle = '#6E8B72'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('再寫一個', W / 2 - 180, 752);
        },
        onTap: function () { PLS.go('epractice', { pet: self.petId }); }
      });
      PLS.addButton({
        x: W / 2 + 30, y: 700, w: 300, h: 100,
        draw: function (ctx) {
          ctx.save(); ctx.shadowColor = 'rgba(120,150,110,0.28)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
          ctx.fillStyle = '#8FC9A8'; A.rr(ctx, W / 2 + 30, 700, 300, 100, 32); ctx.fill(); ctx.restore();
          ctx.font = '34px ' + FONT; ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('回房間', W / 2 + 180, 752);
        },
        onTap: function () { PLS.go('room', { pet: self.petId }); }
      });
    },
    draw: function (ctx, t) {
      const k = t - this.start;
      ctx.fillStyle = '#EAF2EA'; ctx.fillRect(0, 0, W, H);
      const rg = ctx.createRadialGradient(W / 2, 380, 80, W / 2, 380, 560);
      rg.addColorStop(0, 'rgba(190,225,200,0.5)'); rg.addColorStop(1, 'rgba(190,225,200,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 14; i++) {
        const fx = 50 + i * 90, fy = 60 + Math.sin(i * 1.3) * 14;
        ctx.fillStyle = ['#F4A8A0', '#8FC9A8', '#92B8E0', '#F6C95E'][i % 4];
        ctx.beginPath(); ctx.moveTo(fx - 22, fy); ctx.lineTo(fx + 22, fy); ctx.lineTo(fx, fy + 36); ctx.closePath(); ctx.fill();
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '52px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText('描得真好!', W / 2, 130);
      ctx.fillStyle = '#5E8A56'; ctx.fillText('描得真好!', W / 2, 126);
      let msg;
      if (this.awarded) msg = this.capped ? '+1 分! 手寫積分已滿 100 分!' : ('+1 分! 今天還可以拿 ' + this.dailyLeft + ' 分');
      else if (this.capped) msg = '手寫積分已達上限 100 分囉!';
      else msg = '今天的手寫積分拿完了,明天再來!';
      A.pill(ctx, W / 2, 198, msg, this.awarded ? '#C2591E' : '#7A6450', 'rgba(255,255,255,0.95)', 26);
      ctx.save(); ctx.translate(W / 2, 560); ctx.scale(1.15, 1.15);
      P.draw(this.petId, ctx, t, { mode: k < 5 ? 'happy' : 'idle' }); ctx.restore();
      if (this.awarded) {
        this.heartTimer -= 1 / 60;
        if (this.heartTimer <= 0 && k < 5) { this.heartTimer = 0.4; PLS.burst(W / 2 + (Math.random() - 0.5) * 240, 360, 'small'); }
      }
    }
  };

  PLS.register('shop', shop);
  PLS.register('hwpass', hwpass);
})();
