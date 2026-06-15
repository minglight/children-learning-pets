// screens.js — 首頁(選角)、寵物房間、數學餐廳關卡圖 — 寬版(平板橫向)
(function () {
  const PLS = window.PLS, A = window.PLS_ART, P = window.PLS_PETS, TOY = window.PLS_TOY;
  const CFG = window.PLS_CONFIG, ST = window.PLS_STORE;
  const W = PLS.W, H = PLS.H, FONT = A.FONT;

  function pickTalk(list) { return list[Math.floor(Math.random() * list.length)]; }

  // ── 共用:皇冠 + 解題次數徽章(關卡圖上 ⭐ 旁顯示) ──────────
  window.PLS_CROWN = function (ctx, cx, cy, s, color) {
    s = s || 1;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    ctx.fillStyle = color || '#F6C44A';
    ctx.beginPath();
    ctx.moveTo(-12, 7); ctx.lineTo(-12, -4); ctx.lineTo(-5, 2);
    ctx.lineTo(0, -9); ctx.lineTo(5, 2); ctx.lineTo(12, -4); ctx.lineTo(12, 7);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(-12, 7, 24, 3);
    ctx.fillStyle = '#FFFFFF';
    A.el(ctx, -8, -3, 1.6, 1.6); ctx.fill(); A.el(ctx, 0, -7, 1.6, 1.6); ctx.fill(); A.el(ctx, 8, -3, 1.6, 1.6); ctx.fill();
    ctx.restore();
  };
  // 在 (cx,cy) 置中畫一顆「⭐×N」徽章;mastered(≥10 次)改皇冠 + 金底
  window.PLS_CLEARBADGE = function (ctx, cx, cy, clears, mastered) {
    if (!clears) return;
    const txt = '×' + clears;
    ctx.save();
    ctx.font = '800 22px ' + FONT;
    const tw = ctx.measureText(txt).width;
    const iconW = 20, padL = 8, padR = 12, gap = 1;
    const w = padL + iconW + gap + tw + padR, h = 32;
    const bx = cx - w / 2, by = cy - h / 2;
    ctx.shadowColor = 'rgba(150,100,40,0.30)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillStyle = mastered ? '#F4B53C' : '#FFF4D8';
    A.rr(ctx, bx, by, w, h, h / 2); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = mastered ? '#E59A1E' : '#F1D89A'; ctx.lineWidth = 2;
    A.rr(ctx, bx, by, w, h, h / 2); ctx.stroke();
    const ix = bx + padL + iconW / 2;
    if (mastered) window.PLS_CROWN(ctx, ix, cy, 0.72, '#FFFFFF');
    else A.drawIcon(ctx, 'star', ix, cy, 0.62, '#F2BD58');
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = mastered ? '#FFFFFF' : '#C98A2E';
    ctx.fillText(txt, bx + padL + iconW + gap, cy + 1);
    ctx.restore();
  };

  // 在 (cx,cy) 置中畫一顆「關卡編號」圓徽章(永遠顯示,不受 locked 變暗影響)
  window.PLS_NUMBADGE = function (ctx, cx, cy, num, fill) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.shadowColor = 'rgba(150,100,40,0.30)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillStyle = fill || '#B98A4F';
    A.el(ctx, cx, cy, 20, 20); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2.5;
    A.el(ctx, cx, cy, 20, 20); ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 22px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(num), cx, cy + 1);
    ctx.restore();
  };

  // ── 食物中文名 ──────────────────────────────────────────
  const FOOD_NAMES = {
    apple: '蘋果', strawberry: '草莓', orange: '橘子', banana: '香蕉',
    eggcake: '雞蛋糕', boba: '珍珠奶茶', sushi: '壽司', pizza: '披薩',
    bao: '小籠包', burger: '漢堡', fries: '薯條', scoop: '冰淇淋',
    sundae: '聖代', cake: '蛋糕'
  };
  // 布置小窩:基礎版(解 1 次) / 豪華版(解 10 次)名稱
  const FOOD_BASIC_NAMES = {
    apple: '一顆蘋果', strawberry: '一顆草莓', orange: '一顆橘子', banana: '一根香蕉',
    eggcake: '一份雞蛋糕', boba: '一杯珍珠奶茶', sushi: '一盤壽司', pizza: '一塊披薩',
    bao: '一籠小籠包', burger: '一個小漢堡', fries: '一份薯條', scoop: '一球冰淇淋',
    sundae: '一份聖代', cake: '一塊蛋糕'
  };
  const FOOD_DELUXE_NAMES = {
    apple: '水果豪華禮籃', strawberry: '草莓豪華盤', orange: '橘子豪華禮籃', banana: '水果豪華大禮籃',
    eggcake: '雞蛋糕大全套', boba: '珍珠奶茶豪華組', sushi: '壽司豪華全餐', pizza: '一份披薩',
    bao: '小籠包豪華宴', burger: '大麥克豪華餐', fries: '薯條豪華大份', scoop: '冰淇淋聖代塔',
    sundae: '聖代豪華版', cake: '蛋糕豪華塔'
  };
  // 玩具中文名(由英文關卡設定推得)
  const TOY_NAMES = {};
  CFG.english.forEach(function (lv) {
    if (lv.toyArt && lv.toy) {
      if (lv.toyArt.rabbit) TOY_NAMES[lv.toyArt.rabbit] = lv.toy.rabbit;
      if (lv.toyArt.hamster) TOY_NAMES[lv.toyArt.hamster] = lv.toy.hamster;
    }
  });
  // 已過關可展示的寶物清單:食物(數學)+ 玩具(英文)。測試版顯示全部
  window.PLS_TREASURE = {
    label: function (key, type) {
      return type === 'toy' ? (TOY_NAMES[key] || '玩具') : (FOOD_NAMES[key] || '寶物');
    },
    list: function (petId) {
      const d = ST.load(petId), test = ST.isTest();
      const seen = {}, out = [];
      CFG.math.forEach(function (lv) {
        const rec = d.levels[lv.id];
        if (!(rec && rec.cleared) && !test) return;
        const clears = ST.clearCount(d, lv.id);
        const lvDlx = test || clears >= ST.deluxeAt();
        const keys = [];
        if (lv.bite) keys.push(lv.bite);
        (lv.feast && lv.feast.items || []).forEach(function (k) { keys.push(k); });
        keys.forEach(function (k) {
          if (!FOOD_NAMES[k]) return;
          if (!seen['f:' + k]) {
            seen['f:' + k] = 1;
            out.push({ key: k, type: 'food', label: FOOD_BASIC_NAMES[k] || FOOD_NAMES[k], deluxe: false });
          }
          if (lvDlx && !seen['fd:' + k]) {
            seen['fd:' + k] = 1;
            out.push({ key: k, type: 'food', label: FOOD_DELUXE_NAMES[k] || FOOD_NAMES[k] + '（豪華版）', deluxe: true });
          }
        });
      });
      CFG.english.forEach(function (lv) {
        if (!lv.toyArt) return;
        const rec = d.levels[lv.id];
        if (!(rec && rec.cleared) && !test) return;
        const k = lv.toyArt[petId];
        if (k && !seen['t:' + k]) { seen['t:' + k] = 1; out.push({ key: k, type: 'toy', label: TOY_NAMES[k] || '玩具' }); }
      });
      return out;
    }
  };

  // ── 共用:房子背景(寬版)──────────────────────────────
  const FY = 690; // 地板線
  function drawWall(ctx, wall, dot) {
    ctx.fillStyle = wall || '#F6E9DB'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = dot || 'rgba(214,178,146,0.16)';
    for (let yy = 60; yy < FY; yy += 90)
      for (let xx = Math.floor(yy / 90) % 2 ? 50 : 95; xx < W; xx += 90) { A.el(ctx, xx, yy, 7, 7); ctx.fill(); }
    ctx.fillStyle = '#E9D2B2'; ctx.fillRect(0, FY, W, H - FY);
    ctx.strokeStyle = 'rgba(180,140,95,0.35)'; ctx.lineWidth = 2;
    for (let xx = 0; xx < W + 60; xx += 120) {
      ctx.beginPath(); ctx.moveTo(xx, FY); ctx.lineTo(xx - 40, H); ctx.stroke();
    }
    const rg = ctx.createRadialGradient(W / 2, 80, 40, W / 2, 80, 700);
    rg.addColorStop(0, 'rgba(255,210,140,0.22)'); rg.addColorStop(1, 'rgba(255,210,140,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, 700);
  }

  // ── 共用:小玩具 ──────────────────────────────────────
  function doll(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
    ctx.fillStyle = '#F2A9B8';
    ctx.beginPath();
    ctx.moveTo(-8, -14); ctx.lineTo(8, -14); ctx.lineTo(22, 30); ctx.lineTo(-22, 30);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#F8D8B8'; A.el(ctx, 0, -36, 22, 22); ctx.fill();
    ctx.fillStyle = '#8A5A3C';
    ctx.beginPath(); ctx.arc(0, -38, 23, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#5A4636';
    A.el(ctx, -7, -32, 2.5, 2.5); ctx.fill();
    A.el(ctx, 7, -32, 2.5, 2.5); ctx.fill();
    ctx.restore();
  }
  function toyBlocks(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '26px ' + FONT;
    ctx.fillStyle = '#BCE0C8'; A.rr(ctx, 0, 0, 46, 46, 10); ctx.fill();
    ctx.fillStyle = '#7FAE8E'; ctx.fillText('A', 23, 25);
    ctx.fillStyle = '#F6C9A8'; A.rr(ctx, 20, -48, 46, 46, 10); ctx.fill();
    ctx.fillStyle = '#C08B5E'; ctx.fillText('3', 43, -23);
    ctx.restore();
  }
  function toyCar(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
    ctx.fillStyle = '#BCD8F2';
    ctx.beginPath(); ctx.arc(-2, -24, 30, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; A.rr(ctx, -16, -44, 28, 18, 6); ctx.fill();
    ctx.fillStyle = '#9FC3E8'; A.rr(ctx, -56, -26, 112, 40, 16); ctx.fill();
    ctx.fillStyle = '#5A6B7C'; A.el(ctx, -30, 16, 13, 13); ctx.fill(); A.el(ctx, 30, 16, 13, 13); ctx.fill();
    ctx.fillStyle = '#C9D6E2'; A.el(ctx, -30, 16, 6, 6); ctx.fill(); A.el(ctx, 30, 16, 6, 6); ctx.fill();
    ctx.restore();
  }
  function toyRobot(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
    ctx.strokeStyle = '#7FAE9C'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(0, -58); ctx.stroke();
    ctx.fillStyle = '#FFD98E'; A.el(ctx, 0, -61, 4, 4); ctx.fill();
    ctx.fillStyle = '#C4E4D9'; A.rr(ctx, -16, -48, 32, 28, 8); ctx.fill();
    ctx.fillStyle = '#A9D6C7'; A.rr(ctx, -20, -16, 40, 42, 8); ctx.fill();
    ctx.fillStyle = '#5A7A6E'; A.el(ctx, -8, -35, 3, 3); ctx.fill(); A.el(ctx, 8, -35, 3, 3); ctx.fill();
    ctx.restore();
  }

  function backBtn(toScreen, params, color) {
    PLS.addButton({
      x: 30, y: 30, w: 84, h: 84,
      draw: function (ctx) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; A.rr(ctx, 30, 30, 84, 84, 26); ctx.fill();
        A.drawIcon(ctx, 'back', 72, 72, 1.1, color || '#9A7B5C');
      },
      onTap: function () { PLS.go(toScreen, params || {}); }
    });
  }

  // ════════════════════════════════════════════════════
  // 首頁:選角(寬房子,兩房並排)
  // ════════════════════════════════════════════════════
  const HOUSE = { x: 70, y: 248, w: 1054, h: 478 };
  const CARD_W = 478, CARD_H = 350, CARD_Y = 322;
  const CARD1_X = 116, CARD2_X = 600;

  const home = {
    enter: function () {
      PLS.addButton({
        x: CARD1_X, y: CARD_Y, w: CARD_W, h: CARD_H,
        draw: function (ctx, t) { drawRoomCard(ctx, t, 'rabbit', CARD1_X, CARD_Y, CARD_W, CARD_H); },
        onTap: function () { PLS.go('room', { pet: 'rabbit' }); }
      });
      PLS.addButton({
        x: CARD2_X, y: CARD_Y, w: CARD_W, h: CARD_H,
        draw: function (ctx, t) { drawRoomCard(ctx, t, 'hamster', CARD2_X, CARD_Y, CARD_W, CARD_H); },
        onTap: function () { PLS.go('room', { pet: 'hamster' }); }
      });
      // 家長區(小、低調)
      PLS.addButton({
        x: W - 150, y: H - 66, w: 120, h: 48,
        draw: function (ctx) {
          ctx.globalAlpha = 0.75;
          A.pill(ctx, W - 90, H - 42, '家長區', '#9A7B5C', 'rgba(255,255,255,0.8)', 22);
          ctx.globalAlpha = 1;
        },
        onTap: function () { if (window.PLS_PARENT) window.PLS_PARENT.open(); }
      });
    },
    draw: function (ctx, t) {
      drawWall(ctx);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '64px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText(CFG.appName, W / 2, 92);
      ctx.fillStyle = '#8A6242'; ctx.fillText(CFG.appName, W / 2, 88);
      ctx.font = '26px ' + FONT; ctx.globalAlpha = 0.75;
      ctx.fillText('每天一起學習,一起吃大餐!', W / 2, 150);
      ctx.globalAlpha = 1;

      // 房子外框 + 屋頂
      const hx = HOUSE.x, hy = HOUSE.y, hw = HOUSE.w, hh = HOUSE.h;
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.2)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
      ctx.fillStyle = '#FFF9EF'; A.rr(ctx, hx, hy, hw, hh, 36); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#F2BD96'; ctx.strokeStyle = '#F2BD96';
      ctx.lineWidth = 26; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - 14, hy + 12); ctx.lineTo(W / 2, hy - 64); ctx.lineTo(hx + hw + 14, hy + 12);
      ctx.closePath(); ctx.stroke(); ctx.fill();

      const rName = ST.load('rabbit').name || CFG.pets.rabbit.name;
      const hName = ST.load('hamster').name || CFG.pets.hamster.name;
      A.pill(ctx, W / 2, hy + 30, rName + ' 和 ' + hName + ' 的家', '#A07B58', 'rgba(255,255,255,0.9)', 24);
      A.pill(ctx, W / 2, H - 48, '點一下你的寵物,開始今天的學習', '#9A7B5C', 'rgba(255,255,255,0.85)', 26);
    }
  };

  function drawRoomCard(ctx, t, petId, left, top, w, h) {
    const th = CFG.pets[petId].theme;
    const d = ST.load(petId);
    const name = d.name || CFG.pets[petId].name;
    ctx.fillStyle = th.wall; A.rr(ctx, left, top, w, h, 24); ctx.fill();
    ctx.fillStyle = th.dot;
    for (let xx = left + 40; xx < left + w; xx += 80)
      for (let yy = top + 35; yy < top + h - 20; yy += 80) { A.el(ctx, xx, yy, 5, 5); ctx.fill(); }
    ctx.save();
    ctx.beginPath(); A.rr(ctx, left, top, w, h, 24); ctx.clip();
    // 地毯
    ctx.fillStyle = 'rgba(255,255,255,0.34)'; A.el(ctx, left + w * 0.5, top + h - 30, w * 0.42, 30); ctx.fill();
    // 寵物
    ctx.save(); ctx.translate(left + w * 0.30, top + h - 64); ctx.scale(0.56, 0.56); P.draw(petId, ctx, t, {}); ctx.restore();
    // 佈置:一個食物 + 一個玩具(與房間、佈置小窩一模一樣)
    var _fa = d.home.foods || [], _ta = d.home.toys || [];
    var _ff = null, _ft = null;
    for (var _fi = 0; _fi < _fa.length; _fi++) { if (_fa[_fi] && _fa[_fi].key) { _ff = _fa[_fi]; break; } }
    for (var _ti = 0; _ti < _ta.length;  _ti++) { if (_ta[_ti] && _ta[_ti].key) { _ft = _ta[_ti];  break; } }
    if (_ff) {
      if (_ff.deluxe) A.drawFoodDeluxe(ctx, _ff.key, left + w * 0.62, top + h - 76, 1.0);
      else A.drawFood(ctx, _ff.key, left + w * 0.62, top + h - 76, 0.95);
    }
    if (_ft) TOY.drawToy(ctx, _ft.key, left + w * 0.85, top + h - 72, 0.95);
    ctx.restore();
    A.pill(ctx, left + 80, top + 36, name, th.accent, 'rgba(255,255,255,0.92)', 26);
    A.bubble(ctx, left + w * 0.62, top + 84, pickStable(petId, t), { size: 24 });
  }
  function pickStable(seed, t) {
    const list = CFG.talk.welcome;
    const i = Math.floor(t / 6 + (seed === 'rabbit' ? 0 : 1)) % list.length;
    return list[i];
  }

  // ════════════════════════════════════════════════════
  // 寵物房間:選科目(寬版:寵物在左,三張卡在右)
  // ════════════════════════════════════════════════════
  const room = {
    petId: 'rabbit',
    bubbleText: '',
    enter: function (params) {
      const self = this;
      this.petId = params.pet || 'rabbit';
      this.bubbleText = pickTalk(CFG.talk.welcome);
      backBtn('home', {});
      // 數學餐廳
      PLS.addButton({
        x: 596, y: 246, w: 250, h: 244,
        draw: function (ctx, t) { self.drawDoor(ctx, t, 596, 246, 250, 244, '數學餐廳', '吃大餐', 'math'); },
        onTap: function () { PLS.go('map', { pet: self.petId }); }
      });
      // 英文遊戲間
      PLS.addButton({
        x: 862, y: 246, w: 250, h: 244,
        draw: function (ctx, t) { self.drawDoor(ctx, t, 862, 246, 250, 244, '英文遊戲間', '玩玩具', 'english'); },
        onTap: function () { PLS.go('emap', { pet: self.petId }); }
      });
      // 展示櫃(布置小窩)
      PLS.addButton({
        x: 596, y: 512, w: 516, h: 168,
        draw: function (ctx, t) { self.drawShelf(ctx, t, 596, 512, 516, 168); },
        onTap: function () { PLS.go('shelf', { pet: self.petId }); }
      });
      // 測試版:預覽獎勵按鈕(右下角,低調)
      if (ST.isTest()) {
        PLS.addButton({
          x: W - 240, y: H - 68, w: 210, h: 50,
          draw: function (ctx) {
            ctx.globalAlpha = 0.88;
            A.pill(ctx, W - 135, H - 43, '🎁 預覽獎勵', '#C2591E', 'rgba(255,240,210,0.95)', 22);
            ctx.globalAlpha = 1;
          },
          onTap: function () { PLS.go('rewardPreview', { pet: self.petId }); }
        });
      }
    },
    drawShelf: function (ctx, t, x, y, w, h) {
      var d = ST.load(this.petId);
      var sfoods = d.home.foods || [], stoys = d.home.toys || [];
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.16)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
      ctx.fillStyle = '#FFFCF6'; A.rr(ctx, x, y, w, h, 26); ctx.fill();
      ctx.restore();
      A.pill(ctx, x + 82, y + 26, '換擺設', '#B98A4F', 'rgba(255,247,220,0.95)', 18);
      var sR = 26, sG = 10, row1Y = y + 76, row2Y = y + 126, startX = x + 42;
      for (var sfi = 0; sfi < 3; sfi++) {
        var scx = startX + sfi * (sR * 2 + sG) + sR;
        ctx.fillStyle = '#EEE0CC'; A.el(ctx, scx, row1Y + sR + 5, sR, 6); ctx.fill();
        var sf = sfoods[sfi];
        if (sf && sf.key) {
          if (sf.deluxe) A.drawFoodDeluxe(ctx, sf.key, scx, row1Y, 0.65);
          else A.drawFood(ctx, sf.key, scx, row1Y, 0.63);
        } else {
          ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='22px '+FONT;
          ctx.fillStyle='rgba(160,130,100,0.32)'; ctx.fillText('?', scx, row1Y);
        }
      }
      for (var sti = 0; sti < 3; sti++) {
        var tcx = startX + sti * (sR * 2 + sG) + sR;
        ctx.fillStyle = '#D8EAE0'; A.el(ctx, tcx, row2Y + sR + 5, sR, 6); ctx.fill();
        var st = stoys[sti];
        if (st && st.key) {
          TOY.drawTreasure(ctx, st.key, 'toy', tcx, row2Y, 0.63);
        } else {
          ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='22px '+FONT;
          ctx.fillStyle='rgba(100,140,120,0.32)'; ctx.fillText('?', tcx, row2Y);
        }
      }
      var tx = startX + 3 * (sR * 2 + sG) + 22;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '30px ' + FONT; ctx.fillStyle = '#7A5C3E';
      ctx.fillText('布置小窩', tx, y + h / 2 - 16);
      ctx.font = '20px ' + FONT; ctx.fillStyle = '#A8927A';
      ctx.fillText('水果和玩具各三個!', tx, y + h / 2 + 18);
    },
    drawDoor: function (ctx, t, x, y, w, h, label, sub, subject) {
      const d = ST.load(this.petId);
      const remain = ST.remainToday(d, subject);
      const isEng = subject === 'english';
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.18)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
      ctx.fillStyle = '#FFFCF6';
      A.rr(ctx, x, y, w, h, 30); ctx.fill();
      ctx.restore();
      const cx = x + w / 2;
      ctx.save();
      if (subject === 'math') {
        ctx.fillStyle = '#F6EBDD'; A.el(ctx, cx, y + 92, 64, 64); ctx.fill();
        A.drawFood(ctx, 'eggcake', cx - 26, y + 84, 0.78);
        A.drawFood(ctx, 'boba', cx + 26, y + 92, 0.74);
      } else {
        ctx.fillStyle = '#F0F2EC'; A.el(ctx, cx, y + 92, 64, 64); ctx.fill();
        if (this.petId === 'rabbit') { doll(ctx, cx - 24, y + 104, 0.72); toyBlocks(ctx, cx + 6, y + 96, 0.68); }
        else { toyCar(ctx, cx - 10, y + 108, 0.68); toyRobot(ctx, cx + 50, y + 100, 0.64); }
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '32px ' + FONT; ctx.fillStyle = '#7A5C3E';
      ctx.fillText(label, cx, y + 170);
      ctx.restore();
      if (isEng) {
        const txt = ST.isTest() ? '測試版 · 不限次數'
          : remain > 0 ? '今天還可以拿 ' + remain + ' 個玩具' : '今天玩具拿夠了,可以練習';
        A.pill(ctx, cx, y + 210, txt, '#6E9A6E', 'rgba(232,242,230,0.96)', 17);
      } else {
        const txt = ST.isTest() ? '測試版 · 不限次數'
          : remain > 0 ? '今天還可以吃 ' + remain + ' 次大餐' : '今天吃飽了,可以練習';
        A.pill(ctx, cx, y + 210, txt, '#B98A4F', 'rgba(252,238,214,0.95)', 17);
      }
    },
    draw: function (ctx, t) {
      const th = CFG.pets[this.petId].theme;
      drawWall(ctx, th.wall, th.dot);
      const d = ST.load(this.petId);
      const name = d.name || CFG.pets[this.petId].name;

      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '50px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText(name + '的房間', 290, 88);
      ctx.fillStyle = th.deep; ctx.fillText(name + '的房間', 290, 84);

      // 房間地毯 + 佈置(3 食物 + 3 玩具散落在地板上)
      var _rfa = d.home.foods || [], _rta = d.home.toys || [];
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.30)'; A.el(ctx, 285, 620, 250, 44); ctx.fill();
      ctx.fillStyle = th.dot; A.el(ctx, 285, 614, 160, 26); ctx.fill();
      ctx.restore();
      var FSPOTS = [{x:100,y:704},{x:305,y:704},{x:498,y:704}];
      var TSPOTS = [{x:696,y:704},{x:882,y:704},{x:1072,y:704}];
      FSPOTS.forEach(function (pos, i) {
        if (!_rfa[i] || !_rfa[i].key) {
          ctx.save(); ctx.strokeStyle='rgba(195,155,100,0.28)'; ctx.lineWidth=2.5; ctx.setLineDash([5,8]);
          A.el(ctx, pos.x, pos.y-8, 26, 22); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        }
      });
      TSPOTS.forEach(function (pos, i) {
        if (!_rta[i] || !_rta[i].key) {
          ctx.save(); ctx.strokeStyle='rgba(120,180,150,0.28)'; ctx.lineWidth=2.5; ctx.setLineDash([5,8]);
          A.el(ctx, pos.x, pos.y-8, 26, 22); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        }
      });
      _rfa.forEach(function (f, i) {
        if (!f || !f.key) return;
        var pos = FSPOTS[i];
        ctx.fillStyle='rgba(155,115,75,0.16)'; A.el(ctx, pos.x, pos.y+6, 24, 7); ctx.fill();
        if (f.deluxe) A.drawFoodDeluxe(ctx, f.key, pos.x, pos.y-12, 1.18);
        else A.drawFood(ctx, f.key, pos.x, pos.y-12, 1.14);
      });
      _rta.forEach(function (toy, i) {
        if (!toy || !toy.key) return;
        var pos = TSPOTS[i];
        ctx.fillStyle='rgba(95,145,115,0.14)'; A.el(ctx, pos.x, pos.y+6, 24, 7); ctx.fill();
        TOY.drawToy(ctx, toy.key, pos.x, pos.y-12, 1.14);
      });

      // 寵物(左側)
      ctx.save(); ctx.translate(270, 470); P.draw(this.petId, ctx, t, {}); ctx.restore();
      A.bubble(ctx, 290, 250, this.bubbleText, { size: 28 });
    }
  };

  // ════════════════════════════════════════════════════
  // 共用:捲動式關卡圖(數學/英文共用主體)
  // ── nodes 蜿蜒小路(寬版置中)
  // ════════════════════════════════════════════════════
  const MAP_XS = [330, 600, 870, 600];
  const MAP_Y0 = 256, MAP_STEP = 86;
  const TOP_BAND = 184;

  // ════════════════════════════════════════════════════
  // 數學餐廳:關卡圖
  // ════════════════════════════════════════════════════
  const map = {
    petId: 'rabbit',
    nodes: [],
    note: '',
    enter: function (params) {
      const self = this;
      this.petId = params.pet || 'rabbit';
      this.note = '';
      this.scrollY = 0;
      this._pdown = false;
      this._drag = false;
      this._enteredAt = Date.now(); // 防止切換畫面時誤觸節點
      this.nodes = CFG.math.map(function (lv, i) {
        return { lv: lv, i: i, x: MAP_XS[i % 4], y: MAP_Y0 + i * MAP_STEP };
      });
      const lastY = this.nodes.length ? this.nodes[this.nodes.length - 1].y : MAP_Y0;
      this.maxScroll = Math.max(0, (lastY + 150) - (H - 70));
      backBtn('room', { pet: this.petId });
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
        // 剛進入畫面 350ms 內忽略 tap，防止「吃飽收工」誤觸下一關
        if (Date.now() - (this._enteredAt || 0) < 350) return;
        const cy = y + this.scrollY;
        for (let k = 0; k < this.nodes.length; k++) {
          const n = this.nodes[k];
          const dx = x - n.x, dyy = cy - n.y;
          if (dx * dx + dyy * dyy <= 66 * 66) { this.tapNode(n); break; }
        }
      }
    },
    onWheel: function (dy) { this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY + dy)); },
    thumbRect: function () {
      const top = 200, bot = H - 24, trackH = bot - top;
      const viewH = H - TOP_BAND;
      const contentH = this.maxScroll + viewH;
      const th = Math.max(70, Math.min(trackH, trackH * viewH / contentH));
      const raw = top + (trackH - th) * (this.maxScroll ? this.scrollY / this.maxScroll : 0);
      const ty = Math.max(top, Math.min(top + trackH - th, raw));
      return { x: W - 28, w: 14, top: top, trackH: trackH, th: th, ty: ty };
    },
    scrollFromBar: function (y) {
      const r = this.thumbRect();
      const t = (y - r.top - r.th / 2) / (r.trackH - r.th);
      this.scrollY = Math.max(0, Math.min(this.maxScroll, t * this.maxScroll));
    },
    tapNode: function (n) {
      const d = ST.load(this.petId);
      const state = ST.levelState(d, CFG.math, n.i);
      if (state === 'locked') {
        this.note = n.lv.locked ? '這一關還沒開放喔' : '先把上一關吃到大餐,就會開門囉';
        PLS.sfx.wrong();
        return;
      }
      const remain = ST.remainToday(d, 'math');
      const practice = ST.clearedToday(d, n.lv.id) || remain <= 0;
      PLS.go('quiz', { pet: this.petId, levelIdx: n.i, practice: practice });
    },
    drawNode: function (ctx, t, n) {
      const d = ST.load(this.petId);
      const state = ST.levelState(d, CFG.math, n.i);
      const x = n.x, y = n.y;
      ctx.save();
      if (state === 'locked') ctx.globalAlpha = 0.7;
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.16)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      ctx.fillStyle = state === 'locked' ? '#F3ECE0' : '#FFFCF6';
      A.el(ctx, x, y, 54, 54); ctx.fill();
      ctx.restore();
      if (state === 'cleared') {
        ctx.strokeStyle = '#F2BD58'; ctx.lineWidth = 6;
        A.el(ctx, x, y, 54, 54); ctx.stroke();
      } else if (state === 'open') {
        const p = 1 + Math.sin(t * 2.4) * 0.05;
        ctx.strokeStyle = 'rgba(242,168,140,0.9)'; ctx.lineWidth = 5;
        A.el(ctx, x, y, 56 * p, 56 * p); ctx.stroke();
      }
      if (n.lv.gen === 'shapeFind') {
        A.drawShape(ctx, 'triangle', x - 12, y + 4, 0.45);
        A.drawShape(ctx, 'circle', x + 16, y - 8, 0.4);
      } else if (n.lv.gen === 'shapeCompose') {
        A.drawPair(ctx, 'tri2', x, y, 0.55);
      } else {
        A.drawFood(ctx, n.lv.bite, x, y, 0.85);
      }
      if (state === 'cleared') {
        const clears = ST.clearCount(d, n.lv.id);
        window.PLS_CLEARBADGE(ctx, x + 40, y - 42, clears, clears >= ST.deluxeAt());
      }
      if (state === 'locked') {
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.shadowColor = 'rgba(150,100,60,0.18)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
        ctx.fillStyle = '#FFF7EA'; A.el(ctx, x + 40, y - 36, 18, 18); ctx.fill();
        ctx.restore();
        A.drawIcon(ctx, 'lock', x + 40, y - 36, 0.92, '#A0876E');
      }
      // 關卡編號(永遠顯示在左上角)
      window.PLS_NUMBADGE(ctx, x - 40, y - 40, n.i + 1, '#C2924F');
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '26px ' + FONT; ctx.fillStyle = '#7A5C3E';
      ctx.fillText(n.lv.name, x, y + 80);
      ctx.font = '20px ' + FONT; ctx.fillStyle = '#A8927A';
      ctx.fillText(n.lv.sub, x, y + 108);
      ctx.restore();
    },
    draw: function (ctx, t) {
      drawWall(ctx, '#FBF1E2', 'rgba(214,178,146,0.14)');
      const d = ST.load(this.petId);
      const remain = ST.remainToday(d, 'math');
      const self = this;

      ctx.save();
      ctx.beginPath(); ctx.rect(0, TOP_BAND, W, H - TOP_BAND); ctx.clip();
      ctx.translate(0, -this.scrollY);
      ctx.strokeStyle = 'rgba(193,154,107,0.4)'; ctx.lineWidth = 10;
      ctx.setLineDash([2, 22]); ctx.lineCap = 'round';
      ctx.beginPath();
      this.nodes.forEach(function (n, i) { ctx[i ? 'lineTo' : 'moveTo'](n.x, n.y); });
      ctx.stroke();
      ctx.setLineDash([]);
      this.nodes.forEach(function (n) { self.drawNode(ctx, t, n); });
      ctx.restore();

      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '50px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText('數學餐廳', W / 2, 74);
      ctx.fillStyle = '#8A6242'; ctx.fillText('數學餐廳', W / 2, 70);
      A.pill(ctx, W / 2, 134,
        ST.isTest() ? '測試版 · 所有關卡已解鎖'
          : remain > 0 ? '今天還可以吃 ' + remain + ' 次大餐' : '今天吃飽了!其他關卡可以練習',
        '#B98A4F', 'rgba(255,255,255,0.9)', 23);

      if (this.scrollY < this.maxScroll - 2) {
        A.pill(ctx, W / 2, H - 38, '往下滑,還有更多關卡 ↓', '#B08A5E', 'rgba(255,255,255,0.92)', 22);
      }
      if (this.maxScroll > 2) {
        const r = this.thumbRect();
        ctx.fillStyle = 'rgba(180,150,120,0.16)';
        A.rr(ctx, r.x, r.top, r.w, r.trackH, r.w / 2); ctx.fill();
        ctx.fillStyle = 'rgba(176,138,94,0.72)';
        A.rr(ctx, r.x, r.ty, r.w, r.th, r.w / 2); ctx.fill();
      }
    },
    drawTop: function (ctx, t) {
      if (this.note) A.bubble(ctx, W / 2, H - 96, this.note, { size: 23 });
    }
  };

  // ════════════════════════════════════════════════════
  // 布置小窩:3 格食物 + 3 格玩具選取器
  // ════════════════════════════════════════════════════
  const SHELF = { cols: 8, cw: 124, ch: 100, gap: 8 };
  SHELF.gridW = SHELF.cols * SHELF.cw + (SHELF.cols - 1) * SHELF.gap;
  SHELF.x0 = (W - SHELF.gridW) / 2;
  const ITEMS_Y0 = 302;   // 道具格子起點(內容座標)
  const SHELF_TOP = 272;  // 固定標題區高度;捲動從這裡開始

  // 6 格選取器位置
  const SL_CY = 207, SL_W = 88, SL_H = 88;
  const SL_FOOD_CX = [248, 352, 456];
  const SL_TOY_CX  = [738, 842, 946];

  const shelf = {
    petId: 'rabbit', note: '',
    allFoods: [], allToys: [],
    curFoods: [{key:null,deluxe:false},{key:null,deluxe:false},{key:null,deluxe:false}],
    curToys:  [{key:null,deluxe:false},{key:null,deluxe:false},{key:null,deluxe:false}],
    canFoods: [true,true,true], canToys: [true,true,true],
    activeSlot: { type: 'food', idx: 0 },
    scrollY: 0, maxScroll: 0,
    _pdown: false, _drag: false, _py: 0, _ps: 0, _sbdrag: false,
    enter: function (params) {
      this.petId = params.pet || 'rabbit';
      this.note = '';
      this.scrollY = 0;
      this.activeSlot = { type: 'food', idx: 0 };
      var all = window.PLS_TREASURE.list(this.petId);
      this.allFoods = all.filter(function (it) { return it.type === 'food'; });
      this.allToys  = all.filter(function (it) { return it.type === 'toy'; });
      var d = ST.load(this.petId);
      this.curFoods = d.home.foods.map(function (f) { return { key: f.key, deluxe: !!f.deluxe }; });
      this.curToys  = d.home.toys.map(function  (t) { return { key: t.key, deluxe: !!t.deluxe }; });
      this.canFoods = [0,1,2].map(function (i) { return ST.canSwitchHome(d, 'food', i); });
      this.canToys  = [0,1,2].map(function (i) { return ST.canSwitchHome(d, 'toy',  i); });
      this._syncScroll();
      backBtn('room', { pet: this.petId });
    },
    _syncScroll: function () {
      var items = this.activeSlot.type === 'food' ? this.allFoods : this.allToys;
      var rows = Math.max(1, Math.ceil(items.length / SHELF.cols));
      var contentBottom = ITEMS_Y0 + rows * (SHELF.ch + SHELF.gap) + 40;
      this.maxScroll = Math.max(0, contentBottom - H);
      this.scrollY = Math.max(0, Math.min(this.scrollY, this.maxScroll));
    },
    pointer: function (phase, x, y) {
      var self = this;
      if (phase === 'down') {
        if (this.maxScroll > 2 && x >= W - 46) { this._sbdrag = true; this.scrollFromBar(y); return; }
        this._py = y; this._ps = this.scrollY; this._drag = false; this._pdown = true;
      } else if (phase === 'move') {
        if (this._sbdrag) { this.scrollFromBar(y); return; }
        if (!this._pdown) return;
        var dy = y - this._py;
        if (Math.abs(dy) > 6) this._drag = true;
        this.scrollY = Math.max(0, Math.min(this.maxScroll, this._ps - dy));
      } else if (phase === 'up') {
        this._pdown = false;
        if (this._sbdrag) { this._sbdrag = false; return; }
        if (this._drag) { this._drag = false; return; }
        // 點選固定標題區的格子
        if (y < SHELF_TOP) {
          SL_FOOD_CX.forEach(function (cx, i) {
            if (x >= cx - SL_W/2 && x <= cx + SL_W/2 && y >= SL_CY - SL_H/2 && y <= SL_CY + SL_H/2) {
              self.activeSlot = { type: 'food', idx: i }; self.scrollY = 0; self._syncScroll();
            }
          });
          SL_TOY_CX.forEach(function (cx, i) {
            if (x >= cx - SL_W/2 && x <= cx + SL_W/2 && y >= SL_CY - SL_H/2 && y <= SL_CY + SL_H/2) {
              self.activeSlot = { type: 'toy', idx: i }; self.scrollY = 0; self._syncScroll();
            }
          });
          return;
        }
        // 點選道具格子
        var cy = y + this.scrollY;
        var items = this.activeSlot.type === 'food' ? this.allFoods : this.allToys;
        items.forEach(function (it, i) {
          var c = i % SHELF.cols, r = Math.floor(i / SHELF.cols);
          var bx = SHELF.x0 + c * (SHELF.cw + SHELF.gap);
          var by = ITEMS_Y0 + r * (SHELF.ch + SHELF.gap);
          if (x >= bx && x <= bx + SHELF.cw && cy >= by && cy <= by + SHELF.ch) { self.choose(it); }
        });
      }
    },
    onWheel: function (dy) { this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY + dy)); },
    thumbRect: function () {
      var top = SHELF_TOP + 8, bot = H - 24, trackH = bot - top;
      var viewH = H - SHELF_TOP;
      var contentH = this.maxScroll + viewH;
      var th = Math.max(70, Math.min(trackH, trackH * viewH / contentH));
      var raw = top + (trackH - th) * (this.maxScroll ? this.scrollY / this.maxScroll : 0);
      var ty = Math.max(top, Math.min(top + trackH - th, raw));
      return { x: W - 28, w: 14, top: top, trackH: trackH, th: th, ty: ty };
    },
    scrollFromBar: function (y) {
      var r = this.thumbRect();
      var t = (y - r.top - r.th / 2) / (r.trackH - r.th);
      this.scrollY = Math.max(0, Math.min(this.maxScroll, t * this.maxScroll));
    },
    choose: function (it) {
      var self = this;
      var d = ST.load(this.petId);
      var slot = this.activeSlot;
      var curArr = slot.type === 'food' ? this.curFoods : this.curToys;
      var cur = curArr[slot.idx];
      if (cur.key === it.key && !!cur.deluxe === !!it.deluxe) { this.note = '這個已經擺在這格了'; return; }
      if (!ST.canSwitchHome(d, slot.type, slot.idx)) {
        this.note = (slot.type === 'food' ? '食物格 ' : '玩具格 ') + (slot.idx + 1) + ' 今天已換過了,明天再來喔!';
        PLS.sfx.wrong(); return;
      }
      ST.setHomeItem(d, slot.type, slot.idx, it.key, it.deluxe);
      PLS.sfx.correct();
      PLS.burst(W / 2, 200, 'small');
      PLS.go('room', { pet: self.petId });
    },
    drawSlots: function (ctx) {
      var self = this;
      // 底板
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.10)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
      ctx.fillStyle = 'rgba(255,252,246,0.96)';
      A.rr(ctx, 36, 150, W - 72, 112, 22); ctx.fill();
      ctx.restore();
      // 分組標籤
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '23px ' + FONT; ctx.fillStyle = '#C2894C';
      ctx.fillText('食物', 175, SL_CY);
      ctx.fillStyle = '#5E9E6E';
      ctx.fillText('玩具', 665, SL_CY);
      // 食物格
      SL_FOOD_CX.forEach(function (cx, i) {
        var isActive = self.activeSlot.type === 'food' && self.activeSlot.idx === i;
        var cur = self.curFoods[i], locked = !self.canFoods[i];
        ctx.save();
        if (isActive) { ctx.shadowColor = 'rgba(242,185,107,0.7)'; ctx.shadowBlur = 18; }
        ctx.fillStyle = isActive ? '#FFF3DC' : '#FFFCF6';
        A.rr(ctx, cx - SL_W/2, SL_CY - SL_H/2, SL_W, SL_H, 18); ctx.fill();
        if (isActive) { ctx.strokeStyle = '#F2BD58'; ctx.lineWidth = 3.5; A.rr(ctx, cx - SL_W/2, SL_CY - SL_H/2, SL_W, SL_H, 18); ctx.stroke(); }
        ctx.restore();
        if (cur.key) {
          if (cur.deluxe) A.drawFoodDeluxe(ctx, cur.key, cx, SL_CY, 0.76);
          else A.drawFood(ctx, cur.key, cx, SL_CY, 0.74);
        } else {
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '32px ' + FONT;
          ctx.fillStyle = isActive ? 'rgba(200,150,80,0.7)' : 'rgba(160,130,100,0.32)';
          ctx.fillText('?', cx, SL_CY + 1);
        }
        if (locked) {
          ctx.globalAlpha = 0.5; ctx.fillStyle = '#FFF3DC';
          A.rr(ctx, cx - SL_W/2, SL_CY - SL_H/2, SL_W, SL_H, 18); ctx.fill(); ctx.globalAlpha = 1;
          A.drawIcon(ctx, 'lock', cx, SL_CY, 0.7, '#C9A06A');
        }
      });
      // 玩具格
      SL_TOY_CX.forEach(function (cx, i) {
        var isActive = self.activeSlot.type === 'toy' && self.activeSlot.idx === i;
        var cur = self.curToys[i], locked = !self.canToys[i];
        ctx.save();
        if (isActive) { ctx.shadowColor = 'rgba(110,160,120,0.6)'; ctx.shadowBlur = 18; }
        ctx.fillStyle = isActive ? '#EEF6EC' : '#FFFCF6';
        A.rr(ctx, cx - SL_W/2, SL_CY - SL_H/2, SL_W, SL_H, 18); ctx.fill();
        if (isActive) { ctx.strokeStyle = '#6FA86A'; ctx.lineWidth = 3.5; A.rr(ctx, cx - SL_W/2, SL_CY - SL_H/2, SL_W, SL_H, 18); ctx.stroke(); }
        ctx.restore();
        if (cur.key) {
          TOY.drawToy(ctx, cur.key, cx, SL_CY, 0.74);
        } else {
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '32px ' + FONT;
          ctx.fillStyle = isActive ? 'rgba(80,140,100,0.7)' : 'rgba(100,140,120,0.32)';
          ctx.fillText('?', cx, SL_CY + 1);
        }
        if (locked) {
          ctx.globalAlpha = 0.5; ctx.fillStyle = '#EEF6EC';
          A.rr(ctx, cx - SL_W/2, SL_CY - SL_H/2, SL_W, SL_H, 18); ctx.fill(); ctx.globalAlpha = 1;
          A.drawIcon(ctx, 'lock', cx, SL_CY, 0.7, '#6FA86A');
        }
      });
    },
    drawItem: function (ctx, t, it, sel, x, y, w, h) {
      var isDlx = !!it.deluxe;
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.14)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      ctx.fillStyle = sel ? '#FFF3DC' : (isDlx ? '#FFFAF4' : '#FFFCF6');
      A.rr(ctx, x, y, w, h, 20); ctx.fill();
      ctx.restore();
      if (sel) { ctx.strokeStyle = '#F2BD58'; ctx.lineWidth = 4; A.rr(ctx, x, y, w, h, 20); ctx.stroke(); }
      if (isDlx && it.type === 'food') A.drawFoodDeluxe(ctx, it.key, x + w/2, y + h/2 - 14, 0.84);
      else TOY.drawTreasure(ctx, it.key, it.type, x + w/2, y + h/2 - 14, 0.82);
      ctx.font = '20px ' + FONT; ctx.fillStyle = '#7A5C3E';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(it.label, x + w/2, y + h - 20);
      if (sel) A.pill(ctx, x + w/2, y + 15, '展示中', '#B98A4F', 'rgba(255,247,220,0.95)', 14);
    },
    draw: function (ctx, t) {
      var self = this;
      drawWall(ctx, '#FBF1E2', 'rgba(214,178,146,0.14)');
      var name = ST.load(this.petId).name || CFG.pets[this.petId].name;
      // 固定標題
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '44px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText('布置' + name + '的家', W / 2, 68);
      ctx.fillStyle = '#8A6242'; ctx.fillText('布置' + name + '的家', W / 2, 64);
      // 提示列
      var slot = this.activeSlot, isFood = slot.type === 'food';
      var canNow = isFood ? this.canFoods[slot.idx] : this.canToys[slot.idx];
      var hint = canNow
        ? (isFood ? '點選食物格 ' + (slot.idx+1) + ',再點下方食物放進去'
                  : '點選玩具格 ' + (slot.idx+1) + ',再點下方玩具放進去')
        : '今天這個格子已換過了,明天再來喔!';
      A.pill(ctx, W / 2, 116, hint,
        isFood ? '#B98A4F' : '#6E9A6E',
        isFood ? 'rgba(252,238,214,0.95)' : 'rgba(232,244,228,0.95)', 21);
      // 6 格選取器
      this.drawSlots(ctx);
      // 捲動道具格
      var items = isFood ? this.allFoods : this.allToys;
      var curArr = isFood ? this.curFoods : this.curToys;
      var curSlot = curArr[slot.idx];
      ctx.save();
      ctx.beginPath(); ctx.rect(0, SHELF_TOP, W, H - SHELF_TOP); ctx.clip();
      ctx.translate(0, -this.scrollY);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '26px ' + FONT; ctx.fillStyle = '#9A7060';
      ctx.fillText(isFood ? '可以擺的食物' : '可以擺的玩具', SHELF.x0 + 4, ITEMS_Y0 - 26);
      if (!items.length) {
        ctx.textAlign = 'center'; ctx.font = '24px ' + FONT; ctx.fillStyle = '#A8927A';
        ctx.fillText(isFood ? '先去數學餐廳過關,拿到食物就能擺!' : '先去英文遊戲間玩,拿到玩具就能擺!', W / 2, ITEMS_Y0 + 70);
      }
      items.forEach(function (it, i) {
        var c = i % SHELF.cols, r = Math.floor(i / SHELF.cols);
        var bx = SHELF.x0 + c * (SHELF.cw + SHELF.gap);
        var by = ITEMS_Y0 + r * (SHELF.ch + SHELF.gap);
        var sel = curSlot.key === it.key && !!curSlot.deluxe === !!it.deluxe;
        self.drawItem(ctx, t, it, sel, bx, by, SHELF.cw, SHELF.ch);
      });
      ctx.restore();
      if (this.scrollY < this.maxScroll - 2) {
        A.pill(ctx, W / 2, H - 38, '往下滑,還有更多 ↓', '#B08A5E', 'rgba(255,255,255,0.92)', 22);
      }
      if (this.maxScroll > 2) {
        var r = this.thumbRect();
        ctx.fillStyle = 'rgba(180,150,120,0.16)';
        A.rr(ctx, r.x, r.top, r.w, r.trackH, r.w / 2); ctx.fill();
        ctx.fillStyle = 'rgba(176,138,94,0.72)';
        A.rr(ctx, r.x, r.ty, r.w, r.th, r.w / 2); ctx.fill();
      }
    },
    drawTop: function (ctx, t) {
      if (this.note) A.bubble(ctx, W / 2, H - 52, this.note, { size: 24 });
    }
  };

  // ════════════════════════════════════════════════════
  // 測試版:獎勵預覽畫面
  // ════════════════════════════════════════════════════
  const rewardPreview = {
    petId: 'rabbit',
    enter: function (params) {
      const self = this;
      this.petId = params.pet || 'rabbit';
      backBtn('rewardPreview', { pet: this.petId });
      // 返回房間
      PLS.addButton({
        x: 30, y: 30, w: 84, h: 84,
        draw: function (ctx) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)'; A.rr(ctx, 30, 30, 84, 84, 26); ctx.fill();
          A.drawIcon(ctx, 'back', 72, 72, 1.1, '#9A7B5C');
        },
        onTap: function () { PLS.go('room', { pet: self.petId }); }
      });
      var btns = [
        { label: '基礎版大餐', sub: '答對 90% 以上拿到', color: '#C2791E', bg: '#FFF7EA',
          cb: function () { PLS.go('feast', { pet: self.petId, levelIdx: 0, deluxe: false, clears: 1 }); } },
        { label: '豪華版大餐', sub: '同一關過關滿 10 次', color: '#B03B10', bg: '#FFF0D8',
          cb: function () { PLS.go('feast', { pet: self.petId, levelIdx: 0, deluxe: true, clears: 10 }); } },
        { label: '基礎版玩具', sub: '英文關卡過關獎勵', color: '#3A8A5A', bg: '#EEF6EC',
          cb: function () { PLS.go('etoy', { pet: self.petId, levelIdx: 0, deluxe: false, clears: 1 }); } },
        { label: '豪華版玩具', sub: '同一英文關滿 10 次', color: '#1A6A50', bg: '#E4F4F0',
          cb: function () { PLS.go('etoy', { pet: self.petId, levelIdx: 0, deluxe: true, clears: 10 }); } }
      ];
      var BW = 456, BH = 188, GAP = 28;
      var startX = (W - BW * 2 - GAP) / 2;
      var startY = 290;
      btns.forEach(function (btn, i) {
        var col = i % 2, row = Math.floor(i / 2);
        var bx = startX + col * (BW + GAP);
        var by = startY + row * (BH + GAP);
        PLS.addButton({
          x: bx, y: by, w: BW, h: BH,
          draw: function (ctx, t) {
            ctx.save();
            ctx.shadowColor = 'rgba(150,100,60,0.18)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
            ctx.fillStyle = btn.bg; A.rr(ctx, bx, by, BW, BH, 30); ctx.fill();
            ctx.restore();
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = '800 44px ' + FONT; ctx.fillStyle = btn.color;
            ctx.fillText(btn.label, bx + BW / 2, by + BH / 2 - 20);
            ctx.font = '24px ' + FONT; ctx.fillStyle = '#A8927A';
            ctx.fillText(btn.sub, bx + BW / 2, by + BH / 2 + 30);
          },
          onTap: btn.cb
        });
      });
    },
    draw: function (ctx, t) {
      ctx.fillStyle = '#FBF1E2'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(214,178,146,0.14)';
      for (var yy = 60; yy < H; yy += 90)
        for (var xx = Math.floor(yy / 90) % 2 ? 50 : 95; xx < W; xx += 90) { A.el(ctx, xx, yy, 7, 7); ctx.fill(); }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '50px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText('獎勵預覽', W / 2, 92);
      ctx.fillStyle = '#8A6242'; ctx.fillText('獎勵預覽', W / 2, 88);
      A.pill(ctx, W / 2, 152, '測試版限定 · 點選直接預覽各種獎勵畫面', '#9A7B5C', 'rgba(255,255,255,0.9)', 24);
    }
  };

  PLS.register('home', home);
  PLS.register('room', room);
  PLS.register('map', map);
  PLS.register('shelf', shelf);
  PLS.register('rewardPreview', rewardPreview);
})();
