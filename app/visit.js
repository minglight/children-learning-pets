// visit.js — 互動式「串門子」畫面(v11,適配 2.5D 房間)。
// 重用 app/room.js 匯出的 window.PLS_ROOM2(屋頂厚木框、地板、寵物定位/走位),畫出朋友的房間;
// 自己的寵物從畫面邊緣走進來一起逛,可以從背包(inv)挑一項食物/玩具分享給朋友的寵物。
// 分享只會在朋友的 players/{hostId}/visitLog 新增一筆(app/cloud.js: shareGift),結構上不可能
// 碰到朋友的 status/成長值/點數/背包(見 docs/cloud-friends-schema.md「拜訪分享」一節)。
// 身份一律顯示「{小朋友暱稱}的{物種}」,不是可改的寵物名字/寵物存檔 slot。
(function () {
  const PLS = window.PLS, A = window.PLS_ART, CFG = window.PLS_CONFIG, ST = window.PLS_STORE;
  const R2 = window.PLS_ROOM2;
  const W = PLS.W, H = PLS.H, FONT = A.FONT;

  function speciesOf(id) { return (id && CFG.pets[id]) ? id : 'rabbit'; }
  function itemLabel(key, type) { return window.PLS_TREASURE ? window.PLS_TREASURE.label(key, type) : key; }

  const visit = {
    petId: 'kidL',
    friend: null,
    enter: function (params) {
      const self = this;
      this.petId = params.pet || 'kidL';              // 自己的寵物存檔 slot(供返回房間用)
      this.friend = params.friend || {};
      this.myPet = ST.load(this.petId);
      this.mySpecies = speciesOf(this.myPet.species);
      this.myGi = ST.growthInfo(this.myPet);

      // 可分享清單:自己背包(inv)裡的食物/一般食物/金色食物/玩具,一次拜訪限分享一次。
      const foods = ST.invList(this.myPet, 'foods').map(function (it) { return { key: it.key, type: 'food', gold: false }; });
      const gold = ST.invList(this.myPet, 'gold').map(function (it) { return { key: it.key, type: 'food', gold: true }; });
      const toys = ST.invList(this.myPet, 'toys').map(function (it) { return { key: it.key, type: 'toy', gold: false }; });
      this.shareItems = foods.concat(gold, toys).slice(0, 8);

      this.mode = 'idle';        // 'idle' | 'confirm' | 'shared'
      this.sel = null;
      this.note = ''; this.noteT = -10;
      this._friendWander = null;
      this._mine = null;         // 自己寵物的走位狀態(從畫面外走進來)

      PLS.addButton({
        x: 30, y: 30, w: 240, h: 66,
        draw: function (ctx) {
          ctx.save();
          ctx.shadowColor = 'rgba(150,100,60,0.16)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
          ctx.fillStyle = '#FFFFFF'; R2.rr(ctx, 30, 30, 240, 66, 22); ctx.fill();
          ctx.restore();
          A.drawIcon(ctx, 'back', 66, 63, 0.8, '#9A7B5C');
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.font = '24px ' + FONT; ctx.fillStyle = '#8A6B4C';
          ctx.fillText('回好友列表', 96, 64);
        },
        onTap: function () {
          PLS.go('room', { pet: self.petId });
          if (window.PLS_FRIENDS) window.PLS_FRIENDS.open(self.petId);
        }
      });

      // 分享物品(最多 8 個,排一列在畫面下方)
      const n = this.shareItems.length;
      const startX = W / 2 - (n - 1) * 45;
      this.shareItems.forEach(function (it, i) {
        const ix = startX + i * 90, iy = H - 92;
        PLS.addButton({
          x: ix - 44, y: iy - 44, w: 88, h: 88,
          hidden: function () { return self.mode !== 'idle'; },
          draw: function () {},   // 實際繪製在 drawShareRow(需要跟著清單一起排版),按鈕只負責命中
          onTap: function () { self.sel = it; self.mode = 'confirm'; }
        });
      });

      // 確認彈窗按鈕(位置固定,平常隱藏)
      const CANCEL = { x: W / 2 - 250, y: H / 2 + 70, w: 220, h: 88 };
      const OK = { x: W / 2 + 30, y: H / 2 + 70, w: 220, h: 88 };
      PLS.addButton({
        x: CANCEL.x, y: CANCEL.y, w: CANCEL.w, h: CANCEL.h,
        hidden: function () { return self.mode !== 'confirm'; },
        draw: function () {},
        onTap: function () { self.mode = 'idle'; self.sel = null; }
      });
      PLS.addButton({
        x: OK.x, y: OK.y, w: OK.w, h: OK.h,
        hidden: function () { return self.mode !== 'confirm'; },
        draw: function () {},
        onTap: function () { self.confirmShare(); }
      });
    },

    confirmShare: function () {
      const self = this, sel = this.sel, f = this.friend || {};
      if (!window.PLS_CLOUD || !f.playerId || !sel) { this.mode = 'idle'; return; }
      const label = itemLabel(sel.key, sel.type);
      window.PLS_CLOUD.shareGift(this.petId, f.playerId, { type: sel.type, key: sel.key, label: label }).then(function (res) {
        if (!res || !res.ok) { self.note = '分享失敗,請稍後再試'; self.noteT = PLS.t; self.mode = 'idle'; return; }
        const d = ST.load(self.petId);
        d.giftsGiven = (d.giftsGiven || 0) + 1;
        ST.save(d);
        self.mode = 'shared';
        self.note = '分享了「' + label + '」!';
        self.noteT = PLS.t;
        PLS.sfx.feast(); PLS.burst(W / 2, H - 160, 'feast');
      });
    },

    // ── 房間幾何(全寬,沒有左側設定欄)──
    layout: function () {
      const fx = 60, fy = 158, fw = W - 120, fh = H - 158 - 34;
      return { fx: fx, fy: fy, fw: fw, fh: fh };
    },

    draw: function (ctx, t) {
      const f = this.friend || {};
      const fSpecies = speciesOf(f.species);
      const speciesLabel = (CFG.pets[fSpecies] && CFG.pets[fSpecies].name) || '';
      const nickname = f.childNickname || '朋友';
      const status = f.status || {};
      const th = CFG.pets[fSpecies].theme;

      ctx.fillStyle = '#EFE3D2'; ctx.fillRect(0, 0, W, H);

      const L = this.layout();
      const box = R2.roofFrame(ctx, L.fx, L.fy, L.fw, L.fh, nickname + '的房間');
      this._box = box;
      const wallB = R2.roomInterior(ctx, box.ix, box.iy, box.iw, box.ih, 14, th.wall, th.dot);
      ctx.save();
      ctx.beginPath(); R2.rr(ctx, box.ix, box.iy, box.iw, box.ih, 14); ctx.clip();
      const frontY = box.iy + box.ih - 36;
      const geo = { x0: box.ix, x1: box.ix + box.iw, yTop: wallB + 55, yBot: frontY };

      // 朋友的寵物:在房間裡自己逛(唯讀,不可餵/不可玩,只是有生氣)
      if (!this._friendWander) {
        const xr0 = R2.xRange(geo, 0.62);
        this._friendWander = {
          x: (xr0.min + xr0.max) / 2, z: 0.62, tx: 0, tz: 0.62,
          state: 'idle', until: t + 1.0, face: 1, hop: 0, mode: 'idle', lastT: t
        };
      }
      const fw2 = R2.wanderStep(t, geo, this._friendWander);

      // 自己的寵物:從畫面左緣走進來,站定後保持待機
      if (!this._mine) {
        const xr1 = R2.xRange(geo, 0.86);
        this._mine = {
          x: geo.x0 - 80, z: 0.86, tx: xr1.min + 70, tz: 0.86,
          state: 'walk', until: 0, face: 1, hop: 0, mode: 'idle', lastT: t, arrived: false
        };
      }
      const mw = this._mine;
      if (!mw.arrived) {
        if (R2.walkStep(t, geo, mw, mw.tx, mw.tz)) { mw.arrived = true; mw.hop = 0; mw.mode = 'idle'; mw.dir = 'front'; }
      } else {
        mw.dir = 'front'; mw.mode = 'idle'; mw.hop = Math.sin(t * 2) * 3;
      }

      const petsDraw = [
        { species: fSpecies, pose: fw2, stage: status.stage || 'baby', deco: status.growDeco || 0, mine: false },
        { species: this.mySpecies, pose: mw, stage: this.myGi.stage, deco: this.myGi.deco, mine: true }
      ];
      petsDraw.sort(function (a, b) { return a.pose.z - b.pose.z; });
      const self = this;
      petsDraw.forEach(function (it) {
        const s = R2.scAt(it.pose.z), gy = R2.yAt(geo, it.pose.z);
        ctx.fillStyle = 'rgba(150,110,70,0.16)'; R2.el(ctx, it.pose.x, gy + 4, 150 * s, 34 * s); ctx.fill();
        R2.petAt(ctx, it.species, t, it.pose.x, gy + it.pose.hop, s, it.pose.mode, it.stage, 0, it.pose.face, it.pose.dir, it.deco);
      });
      ctx.restore();

      // 左上:訪客身份標籤(小朋友暱稱 + 物種,不是可改的寵物名字)
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.14)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
      ctx.fillStyle = '#FFFBF3'; R2.rr(ctx, 30, 112, 320, 74, 22); ctx.fill();
      ctx.restore();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '20px ' + FONT; ctx.fillStyle = 'rgba(120,95,70,0.72)';
      ctx.fillText('正在拜訪', 54, 136);
      ctx.font = '30px ' + FONT; ctx.fillStyle = '#8A6242';
      ctx.fillText(nickname + '的' + speciesLabel, 54, 166);

      if (typeof status.points === 'number') {
        A.pill(ctx, 190, 210, nickname + ' 有 ' + status.points + ' 點', '#B98A4F', 'rgba(255,255,255,0.94)', 20);
      }

      this.drawShareRow(ctx, t);
      if (this.mode === 'confirm') this.drawConfirm(ctx);
      if (this.note && t - this.noteT < 1.8) A.bubble(ctx, W / 2, H / 2 - 40, this.note, { size: 24 });
    },

    drawShareRow: function (ctx, t) {
      const n = this.shareItems.length;
      if (this.mode === 'shared') {
        A.pill(ctx, W / 2, H - 92, '已經分享過一次囉,下次再來玩!', '#7FAE8E', 'rgba(255,255,255,0.94)', 20);
        return;
      }
      if (!n) {
        A.pill(ctx, W / 2, H - 92, '背包空空的,先去賺點食物/玩具再來分享吧', '#B98A4F', 'rgba(255,255,255,0.9)', 18);
        return;
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '20px ' + FONT; ctx.fillStyle = 'rgba(120,95,70,0.8)';
      ctx.fillText('分享給' + (this.friend.childNickname || '朋友'), W / 2, H - 148);
      const startX = W / 2 - (n - 1) * 45;
      this.shareItems.forEach(function (it, i) {
        const ix = startX + i * 90, iy = H - 92;
        ctx.save();
        ctx.shadowColor = 'rgba(150,100,60,0.16)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
        ctx.fillStyle = '#FFFFFF'; R2.el(ctx, ix, iy, 40, 40); ctx.fill();
        ctx.restore();
        if (it.type === 'food') {
          (it.gold ? A.drawFoodGold : A.drawFood)(ctx, it.key, ix, iy - 6, 0.64);
        } else {
          window.PLS_TOY.drawToy(ctx, it.key, ix, iy - 4, 0.62);
        }
      });
    },

    drawConfirm: function (ctx) {
      const sel = this.sel, f = this.friend || {};
      if (!sel) return;
      const fSpecies = speciesOf(f.species);
      const speciesLabel = (CFG.pets[fSpecies] && CFG.pets[fSpecies].name) || '';
      const label = itemLabel(sel.key, sel.type);
      ctx.save();
      ctx.fillStyle = 'rgba(60,44,28,0.38)'; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      const bx = W / 2 - 300, by = H / 2 - 130, bw = 600, bh = 300;
      ctx.save();
      ctx.shadowColor = 'rgba(90,60,30,0.28)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
      ctx.fillStyle = '#FFFCF6'; R2.rr(ctx, bx, by, bw, bh, 28); ctx.fill();
      ctx.restore();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '28px ' + FONT; ctx.fillStyle = '#6E5238';
      ctx.fillText('要把「' + label + '」分享給', W / 2, by + 90);
      ctx.fillText((f.childNickname || '朋友') + '的' + speciesLabel + '嗎?', W / 2, by + 130);
      const CANCEL = { x: W / 2 - 250, y: H / 2 + 70, w: 220, h: 88 };
      const OK = { x: W / 2 + 30, y: H / 2 + 70, w: 220, h: 88 };
      ctx.fillStyle = '#F2E8D8'; R2.rr(ctx, CANCEL.x, CANCEL.y, CANCEL.w, CANCEL.h, 22); ctx.fill();
      ctx.fillStyle = '#8A6242'; ctx.font = '26px ' + FONT; ctx.fillText('再想想', CANCEL.x + CANCEL.w / 2, CANCEL.y + CANCEL.h / 2);
      ctx.save();
      ctx.shadowColor = 'rgba(180,120,40,0.28)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
      ctx.fillStyle = '#F2A93C'; R2.rr(ctx, OK.x, OK.y, OK.w, OK.h, 22); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#FFFFFF'; ctx.fillText('分享', OK.x + OK.w / 2, OK.y + OK.h / 2);
    }
  };

  PLS.register('visit', visit);
})();
