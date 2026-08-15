// visit.js — 互動式「串門子」畫面:重用 room.js 的 PLS_ROOM2.drawScene 畫朋友的房間,
// 訪客帶著自己的寵物一起出現,可以從自己裝備的食物/玩具挑一項分享給主人「一起吃一起玩」。
// 分享只會在主人的 players/{hostId}/visitLog 新增一筆(app/cloud.js: shareGift),結構上不可能
// 碰到主人的 status/經驗值/點數(見 docs/cloud-friends-schema.md「拜訪分享」一節)。
// 身份一律顯示「{小朋友暱稱}的{寵物種類}」,不是可改的寵物名字(見 CLAUDE.md 好友雲端同步章節)。
(function () {
  const PLS = window.PLS, A = window.PLS_ART, P = window.PLS_PETS, TOY = window.PLS_TOY, CFG = window.PLS_CONFIG, ST = window.PLS_STORE;
  const W = PLS.W, H = PLS.H, FONT = A.FONT;

  function petAt(ctx, petId, t, x, footY, s, mode) {
    ctx.save(); ctx.translate(x, footY - 140 * s); ctx.scale(s, s);
    P.draw(petId, ctx, t, { mode: mode }); ctx.restore();
  }

  const visit = {
    petId: 'rabbit',
    friend: null,
    enter: function (params) {
      const self = this;
      this.petId = params.pet || 'rabbit';       // 自己的寵物(供返回房間用)
      this.friend = params.friend || {};
      this.myPet = ST.load(this.petId);
      this.myKindLabel = (CFG.pets[this.petId] && CFG.pets[this.petId].name) || '';
      // 可分享清單:自己目前裝備的食物/玩具(換擺設選好的那 3+3 格),一次拜訪限分享一次。
      this.shareItems = []
        .concat((this.myPet.home && this.myPet.home.foods) || [])
        .concat((this.myPet.home && this.myPet.home.toys) || [])
        .map(function (s, i) {
          return s && s.key ? { key: s.key, type: i < 3 ? 'food' : 'toy', deluxe: !!s.deluxe } : null;
        })
        .filter(function (x) { return x; });
      this.mode = 'idle';       // 'idle' | 'confirm' | 'shared'
      this.sel = null;
      this.note = ''; this.noteT = -10;
      PLS.addButton({
        x: 30, y: 30, w: 240, h: 66,
        draw: function (ctx) {
          ctx.save();
          ctx.shadowColor = 'rgba(150,100,60,0.16)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
          ctx.fillStyle = '#FFFFFF'; A.rr(ctx, 30, 30, 240, 66, 22); ctx.fill();
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
    },
    pointer: function (phase, x, y) {
      if (phase !== 'up') return;
      if (this.mode === 'confirm') { this.modalTap(x, y); return; }
      if (this.mode !== 'idle') return;
      const n = this.shareItems.length;
      if (!n) return;
      const startX = W / 2 - (n - 1) * 45;
      for (let i = 0; i < n; i++) {
        const ix = startX + i * 90, iy = H - 92;
        if (Math.hypot(x - ix, y - iy) <= 40) { this.sel = this.shareItems[i]; this.mode = 'confirm'; PLS.sfx.tap(); return; }
      }
    },
    modalTap: function (x, y) {
      function inR(r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
      const CANCEL = { x: W / 2 - 250, y: H / 2 + 70, w: 220, h: 88 };
      const OK = { x: W / 2 + 30, y: H / 2 + 70, w: 220, h: 88 };
      if (inR(CANCEL)) { this.mode = 'idle'; this.sel = null; PLS.sfx.tap(); return; }
      if (inR(OK)) this.confirmShare();
    },
    confirmShare: function () {
      const self = this, sel = this.sel, f = this.friend || {};
      if (!window.PLS_CLOUD || !f.playerId) { this.mode = 'idle'; return; }
      const label = window.PLS_TREASURE ? window.PLS_TREASURE.label(sel.key, sel.type) : sel.key;
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
    draw: function (ctx, t) {
      const f = this.friend || {};
      const petKind = f.petKind === 'hamster' ? 'hamster' : 'rabbit';
      const kindLabel = (CFG.pets[petKind] && CFG.pets[petKind].name) || '';
      const nickname = f.childNickname || '朋友';
      const status = f.status || {};
      const home = status.home || { foods: [], toys: [] };

      ctx.fillStyle = '#EFE3D2'; ctx.fillRect(0, 0, W, H);
      if (window.PLS_ROOM2 && window.PLS_ROOM2.drawScene) {
        window.PLS_ROOM2.drawScene(ctx, t, petKind, nickname, home);
      }

      // 訪客自己的寵物:固定站在畫面左下角「剛走進來」的位置,跟主人房間的待機動畫互不干擾。
      petAt(ctx, this.petId, t, 150, H - 60, 0.4, 'idle');

      // 左上:訪客身份標籤(小朋友暱稱 + 寵物種類,不是可改的寵物名字)
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.14)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
      ctx.fillStyle = '#FFFBF3'; A.rr(ctx, 30, 112, 320, 74, 22); ctx.fill();
      ctx.restore();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '20px ' + FONT; ctx.fillStyle = 'rgba(120,95,70,0.72)';
      ctx.fillText('正在拜訪', 54, 136);
      ctx.font = '30px ' + FONT; ctx.fillStyle = '#8A6242';
      ctx.fillText(nickname + '的' + kindLabel, 54, 166);

      if (typeof status.points === 'number') {
        A.pill(ctx, 190, 210, nickname + ' 有 ' + status.points + ' 點', '#B98A4F', 'rgba(255,255,255,0.94)', 20);
      }

      this.drawShareRow(ctx, t);

      if (this.mode === 'confirm') this.drawConfirm(ctx);

      if (this.note && t - this.noteT < 1.8) {
        A.bubble(ctx, W / 2, H / 2 - 40, this.note, { size: 24 });
      }
    },
    drawShareRow: function (ctx, t) {
      const n = this.shareItems.length;
      if (this.mode === 'shared') {
        A.pill(ctx, W / 2, H - 92, '已經分享過一次囉,下次再來玩!', '#7FAE8E', 'rgba(255,255,255,0.94)', 20);
        return;
      }
      if (!n) {
        A.pill(ctx, W / 2, H - 92, '先去「換擺設」挑食物/玩具,才能帶來分享喔', '#B98A4F', 'rgba(255,255,255,0.9)', 18);
        return;
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '20px ' + FONT; ctx.fillStyle = 'rgba(120,95,70,0.8)';
      ctx.fillText('分享給' + (this.friend.childNickname || '朋友'), W / 2, H - 148);
      const startX = W / 2 - (n - 1) * 45;
      for (let i = 0; i < n; i++) {
        const it = this.shareItems[i], ix = startX + i * 90, iy = H - 92;
        ctx.save();
        ctx.shadowColor = 'rgba(150,100,60,0.16)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
        ctx.fillStyle = '#FFFFFF'; A.el(ctx, ix, iy, 40, 40); ctx.fill();
        ctx.restore();
        if (it.type === 'food') {
          if (it.deluxe) A.drawFoodDeluxe(ctx, it.key, ix, iy - 6, 0.6); else A.drawFood(ctx, it.key, ix, iy - 6, 0.64);
        } else {
          if (it.deluxe) TOY.drawToyDeluxe(ctx, it.key, ix, iy - 4, 0.6); else TOY.drawToy(ctx, it.key, ix, iy - 4, 0.62);
        }
      }
    },
    drawConfirm: function (ctx) {
      const sel = this.sel, f = this.friend || {};
      const kindLabel = (CFG.pets[f.petKind] && CFG.pets[f.petKind].name) || '';
      const label = window.PLS_TREASURE ? window.PLS_TREASURE.label(sel.key, sel.type) : sel.key;
      ctx.save();
      ctx.fillStyle = 'rgba(60,44,28,0.38)'; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      const bx = W / 2 - 300, by = H / 2 - 130, bw = 600, bh = 300;
      ctx.save();
      ctx.shadowColor = 'rgba(90,60,30,0.28)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
      ctx.fillStyle = '#FFFCF6'; A.rr(ctx, bx, by, bw, bh, 28); ctx.fill();
      ctx.restore();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '28px ' + FONT; ctx.fillStyle = '#6E5238';
      ctx.fillText('要把「' + label + '」分享給', W / 2, by + 90);
      ctx.fillText((f.childNickname || '朋友') + '的' + kindLabel + '嗎?', W / 2, by + 130);
      const CANCEL = { x: W / 2 - 250, y: H / 2 + 70, w: 220, h: 88 };
      const OK = { x: W / 2 + 30, y: H / 2 + 70, w: 220, h: 88 };
      ctx.fillStyle = '#F2E8D8'; A.rr(ctx, CANCEL.x, CANCEL.y, CANCEL.w, CANCEL.h, 22); ctx.fill();
      ctx.fillStyle = '#8A6242'; ctx.font = '26px ' + FONT; ctx.fillText('再想想', CANCEL.x + CANCEL.w / 2, CANCEL.y + CANCEL.h / 2);
      ctx.save();
      ctx.shadowColor = 'rgba(180,120,40,0.28)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
      ctx.fillStyle = '#F2A93C'; A.rr(ctx, OK.x, OK.y, OK.w, OK.h, 22); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#FFFFFF'; ctx.fillText('分享', OK.x + OK.w / 2, OK.y + OK.h / 2);
    }
  };

  PLS.register('visit', visit);
})();
