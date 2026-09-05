// visit.js — 互動式「串門子」畫面(v11,適配 2.5D 房間;v14 大改「拿東西給朋友的寵物吃/玩」)。
// 重用 app/room.js 匯出的 window.PLS_ROOM2(屋頂厚木框、地板、寵物定位/走位),畫出朋友的房間;
// 自己的寵物從畫面邊緣走進來一起逛,可以從背包(inv)挑一項食物/玩具「當場給朋友的寵物吃/陪牠玩」。
//
// ⚠ 這不是「送禮物」:東西不會進到朋友的背包,朋友的寵物是當場吃掉/玩過(所以有走過來吃的演出)。
//   主人端下次進房間只會看到「誰家的哪隻寵物來過、給我吃了什麼」的通知與寵物回憶(app/room.js)。
//   寫入只會落在朋友的 players/{hostId}/visitLog 子集合(app/cloud.js: shareGift),結構上不可能
//   碰到朋友的 status/成長值/點數/背包(見 docs/cloud-friends-schema.md「拜訪分享」一節)。
// 身份一律顯示「{小朋友暱稱}的{物種}」,不是可改的寵物名字/寵物存檔 slot。
(function () {
  const PLS = window.PLS, A = window.PLS_ART, CFG = window.PLS_CONFIG, ST = window.PLS_STORE;
  const R2 = window.PLS_ROOM2, TOY = window.PLS_TOY;
  const W = PLS.W, H = PLS.H, FONT = A.FONT;
  const MAT = R2.MAT;

  function speciesOf(id) { return (id && CFG.pets[id]) ? id : 'rabbit'; }
  function itemLabel(key, type) { return window.PLS_TREASURE ? window.PLS_TREASURE.label(key, type) : key; }
  function pickTalk(list) { return list[Math.floor(Math.random() * list.length)]; }
  function inR(r, x, y) { return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }

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

      // mode 預設 idle,但如果是從「看圖鑑」晃一圈回來(params.shared),要記得這次拜訪已經分享過,
      // 不然子畫面把 visit 的 enter() 重跑一次,「一次拜訪限分享一次」的軟限制就被繞過去了。
      this.mode = (params && params.shared) ? 'shared' : 'idle';   // 'idle' | 'confirm' | 'shared'
      this.tray = null;          // 開啟中的背包托盤:'food' | 'toy' | null(跟房間同一套操作)
      this.act = null;           // 朋友的寵物正在吃/玩的演出

      // v13:記住「我們去誰家玩過」(同一位朋友只留最新一次;給過東西後會再更新成帶道具的版本)。
      // 從子畫面(看圖鑑)晃一圈回來時 enter() 會重跑,dedupe 保證不會重複佔位。
      if (ST.pushMemo) {
        const dm = ST.load(this.petId);
        ST.pushMemo(dm, {
          k: 'visitOut', mood: 'happy', who: this.friend.childNickname || '朋友',
          pet: R2.speciesName(speciesOf(this.friend.species))
        }, 'who');
        ST.save(dm);
      }
      this.sel = null;
      this.note = ''; this.noteT = -10;
      this._friendWander = null;
      this._mine = null;         // 自己寵物的走位狀態(從畫面外走進來)
      this.fBubble = null;       // 摸摸朋友寵物的反應泡泡
      this._down = null;
      this._trayRects = null; this._trayClose = null;
      this._foodBtn = null; this._toyBtn = null;
      this._okRect = null; this._cancelRect = null;

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

      // 看朋友的收集圖鑑/珍藏館/配件圖鑑(唯讀,v13)——重用 app/dex.js 的朋友模式
      PLS.addButton({
        x: W - 240 - 30, y: 30, w: 240, h: 66,
        hidden: function () { return self.mode === 'confirm' || !!self.tray; },
        draw: function (ctx) {
          ctx.save();
          ctx.shadowColor = 'rgba(150,100,60,0.16)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
          ctx.fillStyle = '#FFFFFF'; R2.rr(ctx, W - 270, 30, 240, 66, 22); ctx.fill();
          ctx.restore();
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = '24px ' + FONT; ctx.fillStyle = '#8A6B4C';
          ctx.fillText('🏅 看圖鑑', W - 150, 64);
        },
        onTap: function () { PLS.go('dex', { pet: self.petId, friendView: self.friend, shared: self.mode === 'shared' }); }
      });
    },

    // 背包清單(跟房間托盤同一份資料來源;金色食物排在一般食物後面)
    invOf: function (kind) {
      const d = ST.load(this.petId);
      let list = ST.invList(d, kind === 'food' ? 'foods' : 'toys').map(function (it) {
        return { key: it.key, n: it.n, gold: false };
      });
      if (kind === 'food') {
        list = list.concat(ST.invList(d, 'gold').map(function (it) {
          return { key: it.key, n: it.n, gold: true };
        }));
      }
      return list;
    },

    // ── 給出去:寫進朋友的 visitLog,自己記一筆回憶,朋友的寵物當場吃掉/玩起來 ──
    confirmShare: function () {
      const self = this, sel = this.sel, f = this.friend || {};
      if (!window.PLS_CLOUD || !f.playerId || !sel) { this.mode = 'idle'; return; }
      // 金色食物在 visitLog 只能存 type/key/label 三個欄位(firestore.rules 的 hasOnly 限制),
      // 所以把「金色」寫進 label,朋友那端的通知/回憶才講得出「金色的壽司」。
      const base = itemLabel(sel.key, sel.type);
      const label = sel.gold ? ('金色的' + base) : base;
      window.PLS_CLOUD.shareGift(this.petId, f.playerId, { type: sel.type, key: sel.key, label: label }).then(function (res) {
        if (!res || !res.ok) { self.note = '分享失敗,請稍後再試'; self.noteT = PLS.t; self.mode = 'idle'; return; }
        const d = ST.load(self.petId);
        d.giftsGiven = (d.giftsGiven || 0) + 1;
        // v14:回憶是「我請{pet}吃{item}」/「我跟{pet}玩{item}」,不是送禮物
        if (ST.pushMemo) {
          ST.pushMemo(d, {
            k: 'visitOut', mood: 'proud', who: f.childNickname || '朋友',
            pet: R2.speciesName(speciesOf(f.species)),
            act: sel.type === 'toy' ? 'play' : 'eat', item: label
          }, 'who');
        }
        ST.save(d);
        self.mode = 'shared';
        self.note = '';
        // 朋友的寵物走過來吃掉/玩起來 —— 這是「當場給牠吃」,不是留下禮物
        self.act = { kind: sel.type === 'toy' ? 'play' : 'eat', key: sel.key, gold: !!sel.gold, t0: PLS.t, bites: -1, said: false };
        PLS.sfx.feast();
      });
    },

    // 點朋友的寵物:摸摸牠(純互動,不寫回任何資料)
    pointer: function (phase, x, y) {
      if (phase === 'down') { this._down = { x: x, y: y }; return; }
      if (phase !== 'up' || !this._down) return;
      const dx = x - this._down.x, dy = y - this._down.y;
      this._down = null;
      if (dx * dx + dy * dy > 20 * 20) return;   // 拖曳不算點擊
      this.tap(x, y);
    },
    tap: function (x, y) {
      const self = this;
      // 1) 確認彈窗開著:只吃彈窗的兩顆鈕
      if (this.mode === 'confirm') {
        if (inR(this._okRect, x, y)) { PLS.sfx.tap(); this.confirmShare(); return; }
        if (inR(this._cancelRect, x, y)) { PLS.sfx.tap(); this.mode = 'idle'; this.sel = null; }
        return;
      }
      // 2) 托盤開著:選一樣東西 / 關起來(跟房間托盤同一套手感)
      if (this.tray) {
        if (inR(this._trayClose, x, y)) { this.tray = null; PLS.sfx.tap(); return; }
        const cells = this._trayRects || [];
        for (let i = 0; i < cells.length; i++) {
          if (inR(cells[i], x, y)) {
            this.sel = { key: cells[i].key, type: this.tray === 'food' ? 'food' : 'toy', gold: !!cells[i].gold };
            this.tray = null; this.mode = 'confirm'; PLS.sfx.tap();
            return;
          }
        }
        if (!inR(this._trayPanel, x, y)) this.tray = null;    // 點托盤外:收起
        return;
      }
      // 3) 下緣兩個入口(還沒給過東西、也沒有正在吃的演出時才開得了)
      if (this.mode === 'idle' && !this.act) {
        if (inR(this._foodBtn, x, y)) { this.tray = 'food'; PLS.sfx.tap(); return; }
        if (inR(this._toyBtn, x, y)) { this.tray = 'toy'; PLS.sfx.tap(); return; }
      }
      // 4) 摸摸朋友的寵物
      const s = this._fPS || 0.42;
      if (this._fPX != null &&
          Math.abs(x - this._fPX) < 190 * s &&
          y > (this._fPY || 0) - 400 * s && y < (this._fPY || 0) + 16) {
        this._friendWander.pat = PLS.t;
        PLS.burst(this._fPX, (this._fPY || 0) - 280 * s, 'small');
        PLS.sfx.tap();
        this.fBubble = { text: pickTalk(CFG.talkCare.visitPat || ['嘿嘿~']), until: PLS.t + 2.4 };
      }
    },

    // ── 房間幾何(全寬,沒有左側設定欄)──
    layout: function () {
      const fx = 60, fy = 158, fw = W - 120, fh = H - 158 - 34;
      return { fx: fx, fy: fy, fw: fw, fh: fh };
    },

    draw: function (ctx, t) {
      const f = this.friend || {};
      const fSpecies = speciesOf(f.species);
      const speciesLabel = R2.speciesName(fSpecies);
      const nickname = f.childNickname || '朋友';
      const status = f.status || {};
      const th = CFG.pets[fSpecies].theme;

      ctx.fillStyle = '#EFE3D2'; ctx.fillRect(0, 0, W, H);

      const L = this.layout();
      const box = R2.roofFrame(ctx, L.fx, L.fy, L.fw, L.fh, nickname + '的房間');
      this._box = box;
      // v14:朋友養的物種有專屬場景就畫牠的場景(大象/聖誕貓/小雞/貓頭鷹/長頸鹿…),
      // 沒有的沿用該物種主題色的通用壁紙 —— 走進朋友家要看得出「這裡跟我家不一樣」。
      const sceneFn = window.PLS_SCENE_ROOM && window.PLS_SCENE_ROOM[fSpecies];
      let wallB;
      if (sceneFn) {
        ctx.save();
        ctx.beginPath(); R2.rr(ctx, box.ix, box.iy, box.iw, box.ih, 14); ctx.clip();
        ctx.translate(box.ix, box.iy); ctx.scale(box.iw / 440, box.ih / 340);
        sceneFn(ctx, 440, 340);
        ctx.restore();
        wallB = box.iy + box.ih * 0.47;
      } else {
        wallB = R2.roomInterior(ctx, box.ix, box.iy, box.iw, box.ih, 14, th.wall, th.dot);
      }
      ctx.save();
      ctx.beginPath(); R2.rr(ctx, box.ix, box.iy, box.iw, box.ih, 14); ctx.clip();
      const frontY = box.iy + box.ih - 36;
      const geo = { x0: box.ix, x1: box.ix + box.iw, yTop: wallB + 55, yBot: frontY };
      // 朋友的寵物只在中右側活動,自己的寵物待在左側 —— 兩隻不會疊在一起把主角擋住
      const geoF = { x0: box.ix + box.iw * 0.30, x1: geo.x1, yTop: geo.yTop, yBot: geo.yBot };
      // 給東西的定點(朋友的寵物會走到這裡吃/玩)。這是朋友家,不是自己的房間 ——
      // 平常不擺墊子,只有正在挑東西/正在吃玩的時候才鋪一塊,免得朋友家看起來像自己家。
      const matZ = 0.34, matY = R2.yAt(geo, matZ);
      const givePt = { x: box.ix + box.iw * 0.56, z: matZ };
      if (this.tray || this.act) {
        R2.station(ctx, givePt.x, matY, (this.tray === 'toy' || (this.act && this.act.kind === 'play')) ? 'toy' : 'food');
      }

      // 朋友的寵物:平常在房間裡自己逛;拿東西給牠 → 走過來吃掉/玩起來
      if (!this._friendWander) {
        const xr0 = R2.xRange(geoF, 0.62);
        this._friendWander = {
          x: (xr0.min + xr0.max) / 2, z: 0.62, tx: 0, tz: 0.62,
          state: 'idle', until: t + 1.0, face: 1, hop: 0, mode: 'idle', act: 'idle',
          species: fSpecies, lastT: t
        };
      }
      const fw2 = this.act ? this.actPose(t, givePt) : R2.wanderStep(t, geoF, this._friendWander);
      // 被摸摸:開心一下(跟自己房間裡摸訪客同一招,見 room.js updateVisit)
      if (!this.act && this._friendWander.pat && t - this._friendWander.pat < 1.0) {
        fw2.mode = 'happy'; fw2.dir = 'front'; fw2.act = 'greet';
      }

      // 自己的寵物:從畫面左緣走進來,站定後保持待機
      if (!this._mine) {
        const xr1 = R2.xRange(geo, 0.86);
        this._mine = {
          x: geo.x0 - 80, z: 0.86, tx: xr1.min + 40, tz: 0.86,
          state: 'walk', until: 0, face: 1, hop: 0, mode: 'idle', act: 'walk',
          species: this.mySpecies, lastT: t, arrived: false
        };
      }
      const mw = this._mine;
      if (!mw.arrived) {
        if (R2.walkStep(t, geo, mw, mw.tx, mw.tz)) { mw.arrived = true; mw.hop = 0; mw.mode = 'idle'; mw.act = 'greet'; mw.dir = 'front'; }
      } else {
        mw.dir = 'front'; mw.mode = 'idle'; mw.hop = Math.sin(t * 2) * 3;
        if (mw.act === 'greet' && t - (mw.greetT0 || (mw.greetT0 = t)) > 1.8) mw.act = 'idle';
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
        R2.petAt(ctx, it.species, t, it.pose.x, gy + it.pose.hop, s, {
          act: it.pose.act, mode: it.pose.mode, stage: it.stage, deco: it.deco,
          face: it.pose.face, dir: it.pose.dir, rot: it.pose.rot
        });
        if (!it.mine) { self._fPX = it.pose.x; self._fPY = gy; self._fPS = s; }
      });
      // 正在吃的那樣東西(畫在朋友寵物前面的地上)
      if (this.act) this.drawActItem(ctx, t, givePt, matY);
      ctx.restore();

      // 獎盃掛在房間牆上的右上角(v14:原本疊在畫面右上角,會被「看圖鑑」鈕蓋住)
      R2.trophyBadge(ctx, box.ix + box.iw - 86, box.iy + 44, status.trophy || 0, '🧮');
      R2.trophyBadge(ctx, box.ix + box.iw - 86, box.iy + 96, status.trophyEn || 0, '🔤');

      // 摸摸/道謝的反應泡泡(跟著牠的位置飄)
      if (this.fBubble && t < this.fBubble.until && this._fPX != null) {
        const bx = Math.min(W - 190, Math.max(190, this._fPX));
        const by = Math.max(200, this._fPY - 460 * (this._fPS || 0.42));
        A.bubble(ctx, bx, by, this.fBubble.text, { size: 22 });
      }

      this.drawIdentity(ctx, t, fSpecies, speciesLabel, nickname, status);
      this.drawGiveRow(ctx, t);
      if (this.tray) this.drawTray(ctx, t);
      if (this.mode === 'confirm') this.drawConfirm(ctx);
      if (this.note && t - this.noteT < 1.8) A.bubble(ctx, W / 2, H / 2 - 40, this.note, { size: 24 });
    },

    // 左上:我在誰家 + 那隻寵物長什麼樣 + 牠多大了 + 幾個金幣
    drawIdentity: function (ctx, t, fSpecies, speciesLabel, nickname, status) {
      const bw = 360, bh = 96;
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.14)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
      ctx.fillStyle = '#FFFBF3'; R2.rr(ctx, 30, 108, bw, bh, 24); ctx.fill();
      ctx.restore();
      // 頭像
      // 整隻塞進圓框(不放大裁切)——新制物種的原點在腳底、臉在最上緣,一放大就會把頭切在框外,
      // 變成一團認不出是誰的身體。寧可小一點也要看得出是哪一種動物。
      ctx.save();
      ctx.beginPath(); ctx.arc(78, 156, 34, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#FCEFE6'; ctx.fillRect(44, 122, 68, 68);
      R2.petThumb(ctx, fSpecies, t, 78, 186, 64, { action: 'idle', stage: status.stage, deco: status.growDeco });
      ctx.restore();
      ctx.strokeStyle = '#F2D8C0'; ctx.lineWidth = 3.5; R2.el(ctx, 78, 156, 34, 34); ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '19px ' + FONT; ctx.fillStyle = 'rgba(120,95,70,0.72)';
      ctx.fillText('正在拜訪', 126, 134);
      ctx.font = '28px ' + FONT; ctx.fillStyle = '#8A6242';
      ctx.fillText(nickname + '的' + speciesLabel, 126, 162);
      const stageZh = status.stage === 'grown' ? '大寶' : status.stage === 'kid' ? '小寶' : '幼幼';
      ctx.font = '18px ' + FONT; ctx.fillStyle = '#B49A7C';
      ctx.fillText(stageZh + (typeof status.points === 'number' ? '  ·  ' + status.points + ' 個金幣' : ''), 126, 189);
    },

    // 下緣:兩個入口(給牠吃 / 陪牠玩)—— 跟自己房間的食物籃/玩具箱同一個位置與手感
    drawGiveRow: function (ctx, t) {
      if (this.tray || this.act) { this._foodBtn = this._toyBtn = null; return; }
      const nickname = (this.friend && this.friend.childNickname) || '朋友';
      if (this.mode === 'shared') {
        this._foodBtn = this._toyBtn = null;
        A.pill(ctx, W / 2, H - 74, '今天已經陪' + nickname + '玩過囉,明天再來!', '#7FAE8E', 'rgba(255,255,255,0.94)', 20);
        return;
      }
      const bw = 268, bh = 74, gap = 26;
      const y = H - 74 - bh / 2;
      const fx = W / 2 - gap / 2 - bw, tx = W / 2 + gap / 2;
      this._foodBtn = { x: fx, y: y, w: bw, h: bh };
      this._toyBtn = { x: tx, y: y, w: bw, h: bh };
      const self = this;
      [{ r: this._foodBtn, label: '給牠吃', kind: 'food' },
       { r: this._toyBtn, label: '陪牠玩', kind: 'toy' }].forEach(function (it) {
        const n = self.invOf(it.kind).length;
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
        ctx.save();
        ctx.shadowColor = 'rgba(150,100,60,' + (0.16 + 0.06 * pulse) + ')';
        ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
        ctx.fillStyle = '#FFFFFF'; R2.rr(ctx, it.r.x, it.r.y, it.r.w, it.r.h, 26); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = it.kind === 'food' ? '#F0C99B' : '#B6D7C0'; ctx.lineWidth = 3;
        R2.rr(ctx, it.r.x, it.r.y, it.r.w, it.r.h, 26); ctx.stroke();
        // 圖示:第一樣道具當縮圖,背包空的話畫個問號圈
        const ix = it.r.x + 46, iy = it.r.y + it.r.h / 2;
        const list = self.invOf(it.kind);
        ctx.fillStyle = it.kind === 'food' ? '#FDF2E3' : '#EAF5EE'; R2.el(ctx, ix, iy, 26, 26); ctx.fill();
        if (list.length) {
          if (it.kind === 'food') (list[0].gold ? A.drawFoodGold : A.drawFood)(ctx, list[0].key, ix, iy - 4, 0.44);
          else TOY.drawToy(ctx, list[0].key, ix, iy - 2, 0.42);
        }
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.font = '26px ' + FONT; ctx.fillStyle = it.kind === 'food' ? MAT.foodTag : MAT.playTag;
        ctx.fillText(it.label, it.r.x + 84, iy - 10);
        ctx.font = '18px ' + FONT; ctx.fillStyle = '#B49A7C';
        ctx.fillText(n ? ('背包裡有 ' + n + ' 種') : '背包裡沒有了', it.r.x + 84, iy + 16);
      });
    },

    // 背包托盤(蓋在房間下半,跟 app/room.js drawTray 同一套視覺:7×2 格、數量徽章、金框)
    drawTray: function (ctx, t) {
      const B = this._box, kind = this.tray;
      const list = this.invOf(kind);
      const nickname = (this.friend && this.friend.childNickname) || '朋友';
      const pw2 = B.iw - 56, ph2 = 292;
      const px = B.ix + 28, py = B.iy + B.ih - ph2 - 14;
      this._trayPanel = { x: px, y: py, w: pw2, h: ph2 };
      ctx.save();
      ctx.shadowColor = 'rgba(90,60,30,0.28)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
      ctx.fillStyle = 'rgba(255,251,242,0.98)'; R2.rr(ctx, px, py, pw2, ph2, 24); ctx.fill();
      ctx.restore();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '26px ' + FONT; ctx.fillStyle = kind === 'food' ? MAT.foodTag : MAT.playTag;
      ctx.fillText(kind === 'food' ? ('點一個給' + nickname + '的寵物吃') : ('點一個陪' + nickname + '的寵物玩'), px + 26, py + 36);
      // 關閉鈕(✕)
      const cr = { x: px + pw2 - 58, y: py + 14, w: 44, h: 44 };
      this._trayClose = cr;
      ctx.fillStyle = '#F0E4D2'; R2.rr(ctx, cr.x, cr.y, cr.w, cr.h, 14); ctx.fill();
      ctx.strokeStyle = '#9A7B5C'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cr.x + 14, cr.y + 14); ctx.lineTo(cr.x + 30, cr.y + 30);
      ctx.moveTo(cr.x + 30, cr.y + 14); ctx.lineTo(cr.x + 14, cr.y + 30);
      ctx.stroke();
      this._trayRects = [];
      if (!list.length) {
        ctx.textAlign = 'center';
        ctx.font = '25px ' + FONT; ctx.fillStyle = '#A8927A';
        ctx.fillText(kind === 'food' ? '背包裡沒有食物了' : '玩具箱空空的', px + pw2 / 2, py + 106);
        ctx.font = '21px ' + FONT; ctx.fillStyle = '#B9A88F';
        ctx.fillText(kind === 'food' ? '回家去數學餐廳解題就能賺到喔' : '回家去英文遊戲間過關就能拿到喔', px + pw2 / 2, py + 152);
        return;
      }
      const cell = 96, gap2 = 12;
      const perRow = Math.min(7, list.length);
      const gx0 = px + (pw2 - (perRow * cell + (perRow - 1) * gap2)) / 2;
      const self = this;
      list.slice(0, 14).forEach(function (it, i) {
        const r = Math.floor(i / 7), c = i % 7;
        const x = gx0 + c * (cell + gap2), y = py + 66 + r * (cell + gap2);
        ctx.fillStyle = it.gold ? '#FFF6DC' : '#FFFFFF'; R2.rr(ctx, x, y, cell, cell, 18); ctx.fill();
        ctx.strokeStyle = it.gold ? '#E8B23C' : '#EFE0CE'; ctx.lineWidth = it.gold ? 3 : 2;
        R2.rr(ctx, x, y, cell, cell, 18); ctx.stroke();
        if (kind === 'food') {
          (it.gold ? A.drawFoodGold : A.drawFood)(ctx, it.key, x + cell / 2, y + cell / 2 - 4, 0.72);
        } else TOY.drawToy(ctx, it.key, x + cell / 2, y + cell / 2 - 2, 0.6);
        ctx.fillStyle = it.gold ? '#D89A18' : '#E8734E'; R2.el(ctx, x + cell - 16, y + 16, 15, 15); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.font = '700 16px ' + FONT;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(it.n > 99 ? 99 : it.n), x + cell - 16, y + 17);
        self._trayRects.push({ x: x, y: y, w: cell, h: cell, key: it.key, gold: !!it.gold });
      });
      if (list.length > 14) {
        ctx.textAlign = 'center'; ctx.font = '18px ' + FONT; ctx.fillStyle = '#B9A88F';
        ctx.fillText('東西太多了,先自己吃掉/玩掉一些再帶出門吧!', px + pw2 / 2, py + ph2 - 16);
      }
    },

    // ── 朋友的寵物走過來吃掉 / 玩起來(3.9 秒的小演出,結束回去自己逛)──
    // 吃:走過去(1.1s)→ 咬三口(→3.0s)→ 開心道謝;玩:走過去 → 蹦跳玩一玩 → 開心道謝。
    actPose: function (t, givePt) {
      const a = this.act, e = t - a.t0;
      const w = this._friendWander;
      const stand = { x: givePt.x + 62, z: givePt.z + 0.08 };
      if (e < 1.1) {
        const k = R2.smooth(0, 1, e / 1.1);
        w.x = w.x + (stand.x - w.x) * k * 0.35;
        w.z = w.z + (stand.z - w.z) * k * 0.35;
        w.face = stand.x < w.x ? -1 : 1;
        w.act = 'walk'; w.mode = 'idle'; w.dir = 'side';
        w.hop = 0;
      } else if (e < 3.0) {
        w.x = stand.x; w.z = stand.z; w.dir = 'front'; w.face = -1;
        if (a.kind === 'eat') {
          w.act = 'eat'; w.mode = 'chew';
          const bite = Math.floor((e - 1.1) / 0.62);
          if (bite > a.bites) { a.bites = bite; PLS.sfx.bite(); }
          w.hop = Math.abs(Math.sin((e - 1.1) * 7)) * -5;
        } else {
          w.act = 'play'; w.mode = 'happy';
          w.hop = -Math.abs(Math.sin((e - 1.1) * 5.5)) * 26 * R2.scAt(w.z);
        }
      } else if (e < 3.9) {
        w.act = 'happy'; w.mode = 'happy'; w.dir = 'front'; w.hop = -Math.abs(Math.sin(e * 6)) * 12;
        if (!a.said) {
          a.said = true;
          const pool = a.kind === 'eat' ? CFG.talkCare.visitThanks : CFG.talkCare.playDone;
          this.fBubble = { text: pickTalk(pool), until: PLS.t + 2.6 };
          PLS.burst(this._fPX || W / 2, (this._fPY || H / 2) - 200, 'feast');
        }
      } else {
        this.act = null;
        w.act = 'idle'; w.mode = 'idle'; w.state = 'idle'; w.until = t + 0.8; w.hop = 0; w.lastT = t;
        this.note = ''; this.noteT = -10;
      }
      return w;
    },

    // 地上那樣正在被吃/被玩的東西(吃到後面會變小,玩具則跟著蹦)
    drawActItem: function (ctx, t, givePt, matY) {
      const a = this.act, e = t - a.t0;
      if (e < 0.9) return;
      const s = R2.scAt(givePt.z);
      const x = givePt.x - 6, y = matY - 6;
      if (a.kind === 'eat') {
        const left = Math.max(0, 1 - (e - 1.1) / 1.9);
        if (left <= 0) return;
        const sc = 0.72 * s / 0.34 * (0.55 + 0.45 * left);
        (a.gold ? A.drawFoodGold : A.drawFood)(ctx, a.key, x, y, sc);
      } else {
        const hop = e < 3.0 ? -Math.abs(Math.sin((e - 1.1) * 5.5)) * 14 : 0;
        TOY.drawToy(ctx, a.key, x, y + hop, 0.6 * s / 0.34);
      }
    },

    drawConfirm: function (ctx) {
      const sel = this.sel, f = this.friend || {};
      if (!sel) return;
      const fSpecies = speciesOf(f.species);
      const speciesLabel = R2.speciesName(fSpecies);
      const label = itemLabel(sel.key, sel.type);
      const isToy = sel.type === 'toy';
      ctx.save();
      ctx.fillStyle = 'rgba(60,44,28,0.38)'; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      const bx = W / 2 - 300, by = H / 2 - 170, bw = 600, bh = 380;
      ctx.save();
      ctx.shadowColor = 'rgba(90,60,30,0.28)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
      ctx.fillStyle = '#FFFCF6'; R2.rr(ctx, bx, by, bw, bh, 28); ctx.fill();
      ctx.restore();
      // 要給的那樣東西(小孩不用讀完字就知道自己選了什麼)
      const ix = W / 2, iy = by + 84;
      ctx.fillStyle = sel.gold ? '#FFF6DC' : '#FFFFFF'; R2.el(ctx, ix, iy, 48, 48); ctx.fill();
      ctx.strokeStyle = sel.gold ? '#E8B23C' : '#F0E4D2'; ctx.lineWidth = sel.gold ? 3 : 2.5;
      R2.el(ctx, ix, iy, 48, 48); ctx.stroke();
      if (isToy) TOY.drawToy(ctx, sel.key, ix, iy - 2, 0.62);
      else (sel.gold ? A.drawFoodGold : A.drawFood)(ctx, sel.key, ix, iy - 5, 0.7);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '28px ' + FONT; ctx.fillStyle = '#6E5238';
      ctx.fillText('要給' + (f.childNickname || '朋友') + '的' + speciesLabel, W / 2, by + 176);
      ctx.fillText((isToy ? '玩「' : '吃「') + label + '」嗎?', W / 2, by + 216);
      ctx.font = '19px ' + FONT; ctx.fillStyle = '#B49A7C';
      ctx.fillText('一次拜訪只能給一樣喔', W / 2, by + 252);
      const CANCEL = { x: W / 2 - 250, y: by + 276, w: 220, h: 84 };
      const OK = { x: W / 2 + 30, y: by + 276, w: 220, h: 84 };
      this._cancelRect = CANCEL; this._okRect = OK;
      ctx.fillStyle = '#F2E8D8'; R2.rr(ctx, CANCEL.x, CANCEL.y, CANCEL.w, CANCEL.h, 22); ctx.fill();
      ctx.fillStyle = '#8A6242'; ctx.font = '26px ' + FONT; ctx.fillText('再想想', CANCEL.x + CANCEL.w / 2, CANCEL.y + CANCEL.h / 2);
      ctx.save();
      ctx.shadowColor = 'rgba(180,120,40,0.28)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
      ctx.fillStyle = '#F2A93C'; R2.rr(ctx, OK.x, OK.y, OK.w, OK.h, 22); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#FFFFFF'; ctx.fillText(isToy ? '給牠玩' : '給牠吃', OK.x + OK.w / 2, OK.y + OK.h / 2);
    }
  };

  PLS.register('visit', visit);
})();
