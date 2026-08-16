// room.js — 「真正的房間」(2.5D)
// 載入順序在 screens.js 之後 → 以同名重新註冊 'room',覆蓋舊版。
// 房間:左側設定欄 + 屋頂與厚木框 + 食物墊/遊戲墊。寵物在整片地板上 2.5D 漫遊
// (近大遠小、轉身翻面),點地板可以叫牠走過去;餵食/陪玩會走到墊子旁演出。
// v6:佈置(換擺設)已移除,墊子只是餵食/陪玩的定點。
(function () {
  const PLS = window.PLS, A = window.PLS_ART, P = window.PLS_PETS, TOY = window.PLS_TOY;
  const CFG = window.PLS_CONFIG, ST = window.PLS_STORE;
  const W = PLS.W, H = PLS.H, FONT = A.FONT, TAU = Math.PI * 2;

  function el(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function pickTalk(list) { return list[Math.floor(Math.random() * list.length)]; }

  // 固定地墊色(兩隻寵物共用,維持「食物=暖橘 / 遊戲=綠」的辨識)
  const MAT = {
    floor: '#EAD7BE', floorDark: '#DFC8A8', floorLine: 'rgba(180,140,95,0.30)',
    foodMat: '#F7D9BE', foodMatEdge: '#EFC59E', foodTag: '#C2791E', foodTagBg: 'rgba(255,243,224,0.96)',
    playMat: '#CFE6D6', playMatEdge: '#B6D7C0', playTag: '#4E8A5A', playTagBg: 'rgba(233,246,235,0.96)'
  };

  // ── 2.5D 地板:z=0 靠牆(遠、小)~ z=1 前緣(近、大)──────────
  function smooth(a, b, x) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function yAt(geo, z) { return geo.yTop + (geo.yBot - geo.yTop) * z; }
  function scAt(z) { return 0.24 + 0.18 * z; }          // 深度 → 寵物縮放(遠 0.24、近 0.42)
  function xRange(geo, z) {                              // 地板梯形 + 前緣兩角讓給籃子
    return { min: geo.x0 + 90 + 90 * z, max: geo.x1 - 90 - 90 * z };
  }
  // rot:整隻旋轉角度(開心轉圈用);face:-1 = 向左(只在側面時翻面);dir:'front'|'side'|'back'
  // species = 物種 id;growDeco = 大寶配件 index(隨機抽的那款)
  function petAt(ctx, species, t, x, footY, s, mode, stage, rot, face, dir, growDeco) {
    ctx.save(); ctx.translate(x, footY - 140 * s);
    ctx.scale(s * (dir === 'side' ? (face || 1) : 1), s);
    if (rot) { ctx.translate(0, 20); ctx.rotate(rot); ctx.translate(0, -20); }
    P.draw(species, ctx, t, { mode: mode, stage: stage, dir: dir, growDeco: growDeco }); ctx.restore();
  }
  // 依移動向量決定視角:縱向為主 → 走遠=背面/走近=正面;橫向為主 → 側面
  function dirOf(geo, ddx, ddz) {
    const ddy = ddz * (geo.yBot - geo.yTop);
    if (Math.abs(ddy) > Math.abs(ddx) * 1.15) return ddy < 0 ? 'back' : 'front';
    return 'side';
  }
  // 漫遊一步(主寵物與訪客共用):隨機走走停停、近大遠小、轉身翻面
  function wanderStep(t, geo, w) {
    const dt = clamp(t - w.lastT, 0, 0.1); w.lastT = t;
    if (w.state === 'walk') {
      const sc = scAt(w.z);
      const dx = w.tx - w.x, dzz = w.tz - w.z;
      w.x += clamp(dx, -300 * sc * dt, 300 * sc * dt);
      w.z += clamp(dzz, -0.24 * dt, 0.24 * dt);
      if (Math.abs(dx) > 3) w.face = dx < 0 ? -1 : 1;
      w.dir = dirOf(geo, dx, dzz);
      w.hop = -Math.abs(Math.sin(t * 7)) * 38 * sc;
      w.mode = 'idle';
      if (Math.abs(dx) < 4 && Math.abs(dzz) < 0.02) {
        const r = Math.random();
        w.state = r < 0.6 ? 'idle' : 'happy';
        w.until = t + (w.state === 'happy' ? 1.3 : 1.6 + Math.random() * 2.4);
        w.hop = 0;
        w.dir = 'front';   // 停下來就轉回來看鏡頭
      }
    } else {
      w.dir = 'front';
      w.hop = w.state === 'happy' ? -Math.abs(Math.sin(t * 6)) * 26 * scAt(w.z) : 0;
      w.mode = w.state === 'happy' ? 'happy' : 'idle';
      if (t >= w.until) {
        w.tz = Math.random();
        const xr = xRange(geo, w.tz);
        w.tx = xr.min + Math.random() * (xr.max - xr.min);
        w.state = 'walk';
      }
    }
    // 邊界保護(視窗尺寸不變,但保險起見夾住)
    const xr2 = xRange(geo, w.z);
    w.x = clamp(w.x, xr2.min, xr2.max); w.z = clamp(w.z, 0, 1);
    return w;
  }
  // 直線走向目標(訪客進場/離場/走向點心墊用);回傳是否到達。不夾 xRange,才能走出房外
  function walkStep(t, geo, w, tx, tz) {
    const dt = clamp(t - w.lastT, 0, 0.1); w.lastT = t;
    const sc = scAt(w.z);
    const dx = tx - w.x, dzz = tz - w.z;
    w.x += clamp(dx, -300 * sc * dt, 300 * sc * dt);
    w.z += clamp(dzz, -0.24 * dt, 0.24 * dt);
    if (Math.abs(dx) > 3) w.face = dx < 0 ? -1 : 1;
    w.dir = dirOf(geo, dx, dzz);
    w.hop = -Math.abs(Math.sin(t * 7)) * 38 * sc;
    w.mode = 'idle';
    return Math.abs(dx) < 4 && Math.abs(dzz) < 0.02;
  }

  // ── 共用美術 ─────────────────────────────────────────
  function wallpaper(ctx, x, y, w, h, dot) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = dot;
    for (let yy = y + 40; yy < y + h; yy += 78)
      for (let xx = x + (Math.floor((yy - y) / 78) % 2 ? 40 : 80); xx < x + w; xx += 80) { el(ctx, xx, yy, 6, 6); ctx.fill(); }
    ctx.restore();
  }
  function warmLight(ctx, cx, cy, r, x, y, w, h) {
    const rg = ctx.createRadialGradient(cx, cy, 30, cx, cy, r);
    rg.addColorStop(0, 'rgba(255,214,150,0.22)'); rg.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = rg; ctx.fillRect(x, y, w, h);
  }
  function windowBox(ctx, x, y, w, h) {
    ctx.fillStyle = '#FBF6EC'; rr(ctx, x - 7, y - 7, w + 14, h + 14, 16); ctx.fill();
    const sky = ctx.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, '#CFEAF6'); sky.addColorStop(1, '#E9F6EC');
    ctx.fillStyle = sky; rr(ctx, x, y, w, h, 10); ctx.fill();
    ctx.fillStyle = '#FBE6B8'; el(ctx, x + w * 0.74, y + h * 0.30, 17, 17); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    el(ctx, x + w * 0.30, y + h * 0.62, 22, 13); ctx.fill();
    el(ctx, x + w * 0.48, y + h * 0.60, 17, 11); ctx.fill();
    ctx.strokeStyle = '#E6CBA6'; ctx.lineWidth = 5; rr(ctx, x, y, w, h, 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
    ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
  }
  function picture(ctx, x, y, w, h) {
    ctx.fillStyle = '#FBF6EC'; rr(ctx, x, y, w, h, 12); ctx.fill();
    ctx.fillStyle = '#F4C9D0'; rr(ctx, x + 10, y + 10, w - 20, h - 30, 6); ctx.fill();
    ctx.fillStyle = '#9FCBB2'; el(ctx, x + w / 2, y + h - 16, w * 0.36, 12); ctx.fill();
  }
  function floorboards(ctx, x0, x1, yTop, yBot, vx) {
    ctx.strokeStyle = MAT.floorLine; ctx.lineWidth = 2;
    for (let i = -3; i <= 9; i++) {
      const bx = x0 + (x1 - x0) * (i / 6);
      ctx.beginPath(); ctx.moveTo(bx, yTop); ctx.lineTo(bx + (bx - vx) * 0.55, yBot); ctx.stroke();
    }
  }
  function itemShadow(ctx, cx, cy, rx) { ctx.fillStyle = 'rgba(150,110,70,0.14)'; el(ctx, cx, cy, rx, rx * 0.26); ctx.fill(); }

  // 房間內部(後牆 + 地板 + 窗 + 掛畫),回傳 wallB
  function roomInterior(ctx, ix, iy, iw, ih, radius, wall, dot) {
    const wallB = iy + ih * 0.47;
    ctx.save(); ctx.beginPath(); rr(ctx, ix, iy, iw, ih, radius); ctx.clip();
    ctx.fillStyle = wall; ctx.fillRect(ix, iy, iw, ih);
    wallpaper(ctx, ix, iy, iw, wallB - iy, dot);
    warmLight(ctx, ix + iw / 2, iy + 20, 560, ix, iy, iw, ih);
    windowBox(ctx, ix + iw * 0.56, iy + 34, 210, 134);
    picture(ctx, ix + 54, iy + 50, 116, 96);
    const vx = ix + iw / 2;
    ctx.fillStyle = MAT.floor;
    ctx.beginPath();
    ctx.moveTo(ix + 46, wallB); ctx.lineTo(ix + iw - 46, wallB); ctx.lineTo(ix + iw, iy + ih); ctx.lineTo(ix, iy + ih); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); floorboards(ctx, ix + 46, ix + iw - 46, wallB, iy + ih, vx); ctx.restore();
    ctx.fillStyle = MAT.floorDark;
    ctx.beginPath(); ctx.moveTo(ix, iy + ih); ctx.lineTo(ix + 46, wallB); ctx.lineTo(ix + 46, wallB + 12); ctx.lineTo(ix, iy + ih + 12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(ix + iw, iy + ih); ctx.lineTo(ix + iw - 46, wallB); ctx.lineTo(ix + iw - 46, wallB + 12); ctx.lineTo(ix + iw, iy + ih + 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(180,140,95,0.42)'; ctx.fillRect(ix + 46, wallB - 3, iw - 92, 7);
    ctx.restore();
    return wallB;
  }
  // 屋頂 + 厚木框,回傳內部 box
  function roofFrame(ctx, fx, fy, fw, fh, title) {
    ctx.fillStyle = '#F2BD96';
    ctx.beginPath(); ctx.moveTo(fx - 8, fy + 10); ctx.lineTo(fx + fw / 2, fy - 86); ctx.lineTo(fx + fw + 8, fy + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#E9A878'; ctx.fillRect(fx - 8, fy - 2, fw + 16, 14);
    ctx.save();
    ctx.shadowColor = 'rgba(150,100,60,0.18)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#FFF6E9'; rr(ctx, fx + fw / 2 - 132, fy - 70, 264, 50, 25); ctx.fill();
    ctx.restore();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '36px ' + FONT; ctx.fillStyle = '#A85A3C'; ctx.fillText(title, fx + fw / 2, fy - 44);
    ctx.save();
    ctx.shadowColor = 'rgba(120,80,50,0.22)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    ctx.fillStyle = '#D9A86E'; rr(ctx, fx, fy, fw, fh, 32); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#C99355'; rr(ctx, fx, fy, fw, fh, 32); ctx.fill();
    const m = 22;
    return { ix: fx + m, iy: fy + m, iw: fw - m * 2, ih: fh - m * 2 };
  }
  // v12:獎盃徽章(「目前破到第幾關」,自己房間 / 好友拜訪畫面共用同一個繪製,確保視覺一致)。
  // n=0(還沒破第一關)不畫。沿用既有的皇冠圖示(window.PLS_CROWN,關卡圖 mastered 徽章同一款)當獎盃視覺。
  // v13:多接一個 icon 參數區分數學/英文(兩個科目各自的「第幾關」)。
  function trophyBadge(ctx, cx, cy, n, icon) {
    if (!n) return;
    const label = (icon ? icon + ' ' : '') + '第 ' + n + ' 關';
    ctx.save();
    ctx.font = '700 20px ' + FONT;
    const tw = ctx.measureText(label).width;
    const pw = tw + 54, ph = 40, pr = 20;
    ctx.shadowColor = 'rgba(150,100,40,0.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#FFF6E0'; rr(ctx, cx - pw / 2, cy - ph / 2, pw, ph, pr); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#E8C47C'; ctx.lineWidth = 2; rr(ctx, cx - pw / 2, cy - ph / 2, pw, ph, pr); ctx.stroke();
    window.PLS_CROWN(ctx, cx - pw / 2 + 26, cy, 0.72, '#F2B96B');
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#A85A3C';
    ctx.fillText(label, cx - pw / 2 + 44, cy + 1);
    ctx.restore();
  }

  // 一個區(食物或遊戲):純地墊(v6 起佈置移除,墊子是餵食/陪玩的定點)
  function station(ctx, cx, matY, kind) {
    ctx.fillStyle = kind === 'food' ? MAT.foodMatEdge : MAT.playMatEdge; el(ctx, cx, matY + 9, 150, 44); ctx.fill();
    ctx.fillStyle = kind === 'food' ? MAT.foodMat : MAT.playMat; el(ctx, cx, matY, 140, 39); ctx.fill();
  }

  // ── 設定欄(左)─────────────────────────────────────
  const PW = 384;
  const ICON = {
    eat: function (ctx, x, y) { A.drawFood(ctx, 'eggcake', x - 9, y - 2, 0.5); A.drawFood(ctx, 'boba', x + 11, y, 0.42); },
    play: function (ctx, x, y) { TOY.drawToy(ctx, 'doll', x, y + 2, 0.46); },
    decor: function (ctx, x, y) {
      ctx.fillStyle = '#E7B6BE'; rr(ctx, x - 16, y - 4, 32, 16, 5); ctx.fill();
      ctx.fillStyle = '#D89AA4'; rr(ctx, x - 16, y - 14, 12, 14, 4); ctx.fill(); rr(ctx, x + 4, y - 14, 12, 14, 4); ctx.fill();
    },
    parent: function (ctx, x, y) {
      ctx.fillStyle = '#B79B7E'; el(ctx, x, y - 8, 8, 8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 13, y + 13); ctx.quadraticCurveTo(x, y - 2, x + 13, y + 13); ctx.fill();
    },
    abc: function (ctx, x, y) {
      ctx.fillStyle = '#5E8A86'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 27px ' + FONT; ctx.fillText('Aa', x, y + 1);
    },
    gift: function (ctx, x, y) {
      ctx.fillStyle = '#E79A92'; rr(ctx, x - 14, y - 5, 28, 20, 4); ctx.fill();
      ctx.fillStyle = '#D8847B'; rr(ctx, x - 15, y - 10, 30, 8, 3); ctx.fill();
      ctx.fillStyle = '#F0C24E'; ctx.fillRect(x - 2.5, y - 10, 5, 25);
      ctx.fillStyle = '#F0C24E'; el(ctx, x - 6, y - 13, 6, 4); ctx.fill(); el(ctx, x + 6, y - 13, 6, 4); ctx.fill();
    },
    friend: function (ctx, x, y) {
      ctx.fillStyle = '#C79BD0'; el(ctx, x - 8, y + 1, 11, 11); ctx.fill();
      ctx.fillStyle = '#8FB4CE'; el(ctx, x + 8, y - 1, 11, 11); ctx.fill();
    }
  };
  function navCard(ctx, x, y, w, h, bg, line, title, sub, icon) {
    ctx.save();
    ctx.shadowColor = 'rgba(150,100,60,0.14)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
    ctx.fillStyle = bg; rr(ctx, x, y, w, h, 22); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; el(ctx, x + 50, y + h / 2, 34, 34); ctx.fill();
    icon(ctx, x + 50, y + h / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '30px ' + FONT; ctx.fillStyle = line; ctx.fillText(title, x + 100, y + h / 2 - 13);
    ctx.font = '20px ' + FONT; ctx.fillStyle = 'rgba(120,95,70,0.82)'; ctx.fillText(sub, x + 100, y + h / 2 + 17);
  }

  // ════════════════════════════════════════════════════
  // 寵物房間(改版)
  // v4 電子雞化:食物籃/玩具箱(背包)、餵食/陪玩動畫、成長條、升階慶祝、摸寵物。
  // ════════════════════════════════════════════════════
  const room = {
    petId: 'kidL',
    enter: function (params) {
      const self = this;
      this.petId = params.pet || 'kidL';         // v9:petId = 儲存 slot(kidL/kidR)
      const pid = this.petId;
      this.species = ST.load(pid).species || 'rabbit';   // v9:外觀物種
      // 互動狀態
      this.tray = null;      // 開啟中的背包托盤:'food' | 'toy' | null
      this.act = null;       // 進行中的餵食/陪玩動畫
      this.grow = null;      // 升階慶祝 {t0, stage, stageZh}
      this.pat = null;       // 摸摸寵物 {t0}
      this.bubble = null;    // 寵物對話泡泡 {text, until}
      this._prDisp = null;   // 成長條顯示值(緩動)
      this._down = null;
      this._wander = null;   // 2.5D 漫遊狀態 {x, z, tx, tz, state, until, face, hop, mode}
      // 雙寵物互訪:每次進房 1/3 機率,另一隻寵物過一會兒來作客(測試版必來,方便驗證)
      this.gBubble = null;   // 訪客的對話泡泡
      this._guestX = null;
      this._visit = null;    // {id(物種), name, deco, phase, at, stage, w}
      // 訪客 = 另一個小孩正在養的寵物;對方還沒選寵物(species=null)就不來作客
      const otherSlot = pid === 'kidL' ? 'kidR' : 'kidL';
      const other = ST.load(otherSlot);
      const gid = other.species;
      if (gid && Math.random() < (ST.isTest() ? 1 : 1 / 3)) {
        const ogi = ST.growthInfo(other);
        this._visit = {
          id: gid, name: other.name || CFG.pets[gid].name, deco: ogi.deco, phase: 'wait',
          at: PLS.t + (ST.isTest() ? 3 : 6 + Math.random() * 8),
          stage: ogi.stage
        };
      }
      // 好友隨機來家裡玩(選用附加功能,無 schema 變更)— 加了雲端好友後,偶爾會有朋友的寵物隨機來家裡玩。
      // 不需要 realtime:只是用上次同步到的朋友快照(status)隨機決定要不要來作客,離線/沒有好友就不會發生。
      // 跟上面的雙寵物互訪共用同一套演出(this._visit / updateVisit),只有這次進房沒輪到手足時才輪得到朋友。
      if (!this._visit && window.PLS_CLOUD && window.PLS_CLOUD.isConfigured()) {
        window.PLS_CLOUD.listFriends(pid).then(function (list) {
          if (self.petId !== pid || self._visit) return;
          const pool = (list || []).filter(function (f) { return f.status && f.species && CFG.pets[f.species]; });
          if (!pool.length || Math.random() >= (ST.isTest() ? 1 : 1 / 3)) return;
          const f = pool[Math.floor(Math.random() * pool.length)];
          self._visit = {
            id: f.species, name: f.childNickname || '朋友', deco: f.status.growDeco || 0, phase: 'wait',
            at: PLS.t + (ST.isTest() ? 3 : 6 + Math.random() * 8),
            stage: f.status.stage || 'baby'
          };
        });
      }
      // v11:拜訪分享通知(選用附加功能)— 小孩回到房間(自然的「上線」時機)時,檢查有沒有朋友
      // 來訪過、分享了東西給自己。純本機游標判斷已讀,不寫回 Firestore(見 docs/cloud-friends-schema.md)。
      this.visitNotices = [];
      if (window.PLS_CLOUD) {
        window.PLS_CLOUD.checkVisitLog(pid).then(function (list) {
          if (self.petId !== pid || !list.length) return;
          self.visitNotices = list.slice().reverse();   // 舊的先顯示,依序點掉
          PLS.addButton({
            x: PW + 40, y: 30, w: W - PW - 80, h: 104,
            hidden: function () { return !self.visitNotices.length; },
            draw: function (ctx) { self.drawNotice(ctx); },
            onTap: function () {
              const n = self.visitNotices.shift();
              if (n && window.PLS_CLOUD) window.PLS_CLOUD.advanceVisitLogCursor(pid, n.at);
            }
          });
        });
      }
      // 回首頁
      PLS.addButton({
        x: 24, y: 26, w: 58, h: 58,
        draw: function (ctx) {
          ctx.fillStyle = '#FFFFFF'; el(ctx, 53, 55, 29, 29); ctx.fill();
          ctx.strokeStyle = '#F0E0CE'; ctx.lineWidth = 2; el(ctx, 53, 55, 29, 29); ctx.stroke();
          A.drawIcon(ctx, 'back', 53, 55, 0.92, '#A07B58');
        },
        onTap: function () { PLS.go('home', {}); }
      });
      // 主選單卡片(資料驅動;隱藏獎品功能時自動少一張並上移)
      const NAV = [
        { go: 'map',  bg: '#FCEED6', line: '#C2791E', icon: ICON.eat,  title: '數學餐廳',
          sub: function () { const r = ST.remainToday(ST.load(pid), 'math'); return ST.isTest() ? '測試版 · 不限次數' : r > 0 ? '今天還可以賺 ' + r + ' 次食物' : '今天賺夠了,可以練習'; } },
        { go: 'emap', bg: '#E9F4E3', line: '#4E8A5A', icon: ICON.play, title: '英文遊戲間',
          sub: function () { const r = ST.remainToday(ST.load(pid), 'english'); return ST.isTest() ? '測試版 · 不限次數' : r > 0 ? '今天還可以拿 ' + r + ' 個玩具' : '今天玩具拿夠了,可以練習'; } }
      ];
      NAV.push({ go: 'emenu', bg: '#E5F0EF', line: '#3F8A84', icon: ICON.abc,   title: '字母手寫練習', sub: function () { return '選字母 · 描字母 · 看筆順'; } });
      // v11:好友雲端同步(選用附加功能)— cloud.js 沒載入/未設定時 PLS_FRIENDS 不存在,這張卡不會被加進去。
      if (window.PLS_FRIENDS) {
        NAV.push({
          bg: '#EAF1F6', line: '#3B6E8F', icon: ICON.friend, title: '好友',
          sub: function () { return '串門子看看朋友家'; },
          action: function () { window.PLS_FRIENDS.open(pid); }
        });
      }
      const NTOP = 168, NSTEP = 98, NH = 86;
      NAV.forEach(function (it, i) {
        const y = NTOP + i * NSTEP;
        PLS.addButton({
          x: 30, y: y, w: PW - 60, h: NH,
          draw: function (ctx) { navCard(ctx, 30, y, PW - 60, NH, it.bg, it.line, it.title, it.sub(), it.icon); },
          onTap: function () { if (it.action) it.action(); else PLS.go(it.go, { pet: pid }); }
        });
      });
      // v9:大寶滿 3 天 → 畢業入珍藏(金色脈動卡)
      if (ST.canGraduate(ST.load(pid))) {
        const gy = NTOP + NAV.length * NSTEP;
        PLS.addButton({
          x: 30, y: gy, w: PW - 60, h: NH,
          draw: function (ctx) {
            const pulse = 0.5 + 0.5 * Math.sin(PLS.t * 3);
            ctx.save(); ctx.shadowColor = 'rgba(230,168,60,' + (0.25 + 0.35 * pulse) + ')'; ctx.shadowBlur = 22;
            navCard(ctx, 30, gy, PW - 60, NH, '#FBEFC8', '#C2851E', '🎓 讓牠畢業', '養大成功!收進珍藏館,再養一隻', ICON.gift);
            ctx.restore();
          },
          onTap: function () { PLS.go('graduate', { pet: pid }); }
        });
      }
      // 測試版:預覽獎勵
      if (ST.isTest()) {
        PLS.addButton({
          x: 30, y: H - 168, w: PW - 60, h: 50,
          draw: function (ctx) {
            ctx.globalAlpha = 0.92;
            A.pill(ctx, PW / 2, H - 143, '🎁 預覽獎勵', '#C2591E', 'rgba(255,240,210,0.95)', 21);
            ctx.globalAlpha = 1;
          },
          onTap: function () { PLS.go('rewardPreview', { pet: pid }); }
        });
      }
      // 家長區
      PLS.addButton({
        x: 30, y: H - 96, w: PW - 60, h: 60,
        draw: function (ctx) {
          ctx.fillStyle = '#FFFFFF'; rr(ctx, 30, H - 96, PW - 60, 60, 18); ctx.fill();
          ctx.strokeStyle = '#EFE0CE'; ctx.lineWidth = 2; rr(ctx, 30, H - 96, PW - 60, 60, 18); ctx.stroke();
          ICON.parent(ctx, 70, H - 66);
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '24px ' + FONT; ctx.fillStyle = '#9A7B5C';
          ctx.fillText('家長區', 106, H - 64);
        },
        onTap: function () { if (window.PLS_PARENT) window.PLS_PARENT.open(); }
      });
    },
    // ── 輸入:自己做 tap 偵測(避免和左欄按鈕打架,只處理房間框內的點擊)──
    pointer: function (phase, x, y) {
      if (phase === 'down') { this._down = { x: x, y: y }; return; }
      if (phase !== 'up' || !this._down) return;
      const dx = x - this._down.x, dy = y - this._down.y;
      this._down = null;
      if (dx * dx + dy * dy > 20 * 20) return;   // 拖曳不算點擊
      this.tap(x, y);
    },
    tap: function (x, y) {
      const B = this._box; if (!B || x < PW + 26) return;
      function inR(r) { return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
      // 升階慶祝:看 1.2 秒後點一下關閉
      if (this.grow) { if (PLS.t - this.grow.t0 > 1.2) { this.grow = null; PLS.sfx.tap(); } return; }
      if (this.act) return;                       // 餵食/陪玩動畫中不接受點擊
      if (this.tray) {
        if (inR(this._trayClose)) { this.tray = null; PLS.sfx.tap(); return; }
        if (inR(this._trayCTA)) { PLS.sfx.tap(); PLS.go(this.tray === 'food' ? 'map' : 'emap', { pet: this.petId }); return; }
        const cells = this._trayRects || [];
        for (let i = 0; i < cells.length; i++) {
          if (inR(cells[i])) {
            const kind = this.tray; this.tray = null;
            if (kind === 'food') this.startFeed(cells[i].key, cells[i].gold); else this.startPlay(cells[i].key);
            return;
          }
        }
        if (!inR(this._trayPanel)) this.tray = null;   // 點托盤外:收起
        return;
      }
      if (inR(this._foodBasket)) { this.tray = 'food'; PLS.sfx.tap(); return; }
      if (inR(this._toyBox)) { this.tray = 'toy'; PLS.sfx.tap(); return; }
      // 掛畫 → 收集圖鑑
      if (inR(this._picRect)) { PLS.sfx.tap(); PLS.go('dex', { pet: this.petId }); return; }
      // 許願泡泡 → 提示去哪一關賺這個食物
      if (inR(this._wishRect)) {
        PLS.sfx.tap();
        const w2 = this._wishInfo;
        this.say(w2 && w2.levelName ? ('在「' + w2.levelName + '」過關就能賺到喔!') : '解數學題就能賺到喔!');
        return;
      }
      // 點寵物:摸摸牠(純互動,不消耗任何東西;命中範圍隨深度縮放)
      const ps = this._petS || 0.42;
      if (this._petX != null && Math.abs(x - this._petX) < 190 * ps &&
          y > (this._petY || 0) - 400 * ps && y < (this._petY || 0) + 16) {
        this.pat = { t0: PLS.t };
        PLS.burst(this._petX, (this._petY || 0) - 280 * ps, 'small');
        PLS.sfx.tap();
        this.say(pickTalk(['嘿嘿,好舒服~', '最喜歡主人摸摸了!', '呀~好癢好癢!']));
        return;
      }
      // 點訪客:也可以摸摸牠
      const gs = this._guestS || 0.42;
      if (this._guestX != null && Math.abs(x - this._guestX) < 190 * gs &&
          y > (this._guestY || 0) - 400 * gs && y < (this._guestY || 0) + 16) {
        if (this._visit) this._visit.pat = PLS.t;
        PLS.burst(this._guestX, (this._guestY || 0) - 280 * gs, 'small');
        PLS.sfx.tap();
        this.sayG(pickTalk(CFG.talkCare.visitPat));
        return;
      }
      // 點地板:叫寵物走過去(2.5D 整場跑)
      const geo = this._geo, w3 = this._wander;
      if (geo && w3 && y > geo.yTop - 20 && y < geo.yBot + 24) {
        const z = clamp((y - geo.yTop) / (geo.yBot - geo.yTop), 0, 1);
        const xr = xRange(geo, z);
        w3.tx = clamp(x, xr.min, xr.max); w3.tz = z; w3.state = 'walk';
        PLS.sfx.tap();
      }
    },
    say: function (text) { this.bubble = { text: text, until: PLS.t + 2.4 }; },
    sayG: function (text) { this.gBubble = { text: text, until: PLS.t + 2.4 }; },

    // v11:拜訪分享通知橫幅(疊在房間框上方,點一下關閉、換下一則)
    drawNotice: function (ctx) {
      const n = this.visitNotices[0];
      if (!n) return;
      const kindLabel = (CFG.pets[n.fromSpecies] && CFG.pets[n.fromSpecies].name) || '';
      const giftLabel = (n.gift && n.gift.label) || '';
      const bx = PW + 40, by = 30, bw = W - PW - 80, bh = 104;
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.20)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
      ctx.fillStyle = '#FFF7E0'; rr(ctx, bx, by, bw, bh, 24); ctx.fill();
      ctx.restore();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '24px ' + FONT; ctx.fillStyle = '#C2791E';
      ctx.fillText('🎁 ' + (n.fromNickname || '朋友') + '的' + kindLabel + ' 拜訪過你', bx + 28, by + 38);
      ctx.font = '20px ' + FONT; ctx.fillStyle = '#8A6242';
      ctx.fillText('分享了「' + giftLabel + '」!(點一下關閉)', bx + 28, by + 74);
    },

    // ── 餵食 / 陪玩:點托盤的那一刻就先扣資料(store),動畫只是演出來 ──
    startFeed: function (key, gold) {
      const res = ST.feed(ST.load(this.petId), key, gold);
      if (!res) { this.say(CFG.talkCare.noFood[0]); return; }
      // v5:吃完的隨機小反應。許願命中最優先;1/8 吃出幸運星(+1 成長);其餘四選一。
      let reaction;
      if (res.wishGranted) reaction = 'wishGranted';
      else if (Math.random() < 1 / 8) reaction = 'star';
      else reaction = pickTalk(['burp', 'spin', 'hops', 'hearts']);
      const w = this._wander || { x: 0, z: 0.7 };
      this.act = { kind: 'feed', key: key, gold: !!gold, t0: PLS.t, fromX: w.x, fromZ: w.z, bites: 0, result: res, reaction: reaction };
    },
    startPlay: function (key) {
      const res = ST.playToy(ST.load(this.petId), key);
      if (!res) { this.say(CFG.talkCare.noToy[0]); return; }
      const w = this._wander || { x: 0, z: 0.7 };
      this.act = { kind: 'play', key: key, t0: PLS.t, fromX: w.x, fromZ: w.z, result: res };
    },
    // 動畫時間軸:回傳寵物 {x, z, hop, mode, rot, face},並在對的時間點觸發音效/粒子/對話。
    // 餵食:走過去(1.1s)→ 吃三口(→3.35s)→ 開心(→4.9s);陪玩:走過去 → 玩(→3.6s)→ 收玩具(→5.0s)。
    actPose: function (t, foodPt, playPt, matY, frontY) {
      const a = this.act, e = t - a.t0;
      const pt = a.kind === 'feed' ? foodPt : playPt;
      const stand = { x: pt.x - 64, z: pt.z + 0.08 };
      const face = stand.x < a.fromX ? -1 : 1;
      if (e < 1.1) {
        const k = smooth(0, 1.1, e);
        const sc = scAt(a.fromZ + (stand.z - a.fromZ) * k);
        return {
          x: a.fromX + (stand.x - a.fromX) * k, z: a.fromZ + (stand.z - a.fromZ) * k,
          hop: -Math.abs(Math.sin(e * 7)) * 38 * sc, mode: 'idle', face: face,
          dir: dirOf(this._geo, stand.x - a.fromX, stand.z - a.fromZ)
        };
      }
      const dz = stand.z;
      const sc = scAt(dz), headY = yAt(this._geo, dz) - 300 * sc;
      const at = function (mode, hop, rot) { return { x: stand.x, z: dz, hop: hop || 0, mode: mode, rot: rot, face: face }; };
      if (a.kind === 'feed') {
        if (e < 3.35) {
          if (!a.saidStart) {
            a.saidStart = true;
            // v7:金色食物有專屬開吃語錄
            this.say(pickTalk(a.gold && CFG.talkCare.goldFood ? CFG.talkCare.goldFood : CFG.talkCare.feedStart));
          }
          const bites = [1.5, 2.2, 2.9];
          while (a.bites < 3 && e >= bites[a.bites]) {
            a.bites++; PLS.sfx.bite(); PLS.burst(foodPt.x, matY - 10, 'small');
          }
          return at('chew');
        }
        if (e < 4.9) {
          // v5:吃完的隨機小反應(burp / spin / hops / hearts / star / wishGranted)
          const re = e - 3.35;
          if (!a.reacted) {
            a.reacted = true; PLS.sfx.correct();
            if (a.reaction === 'wishGranted') {
              PLS.sfx.feast();
              PLS.burst(stand.x, headY, 'feast'); PLS.burst(stand.x + 40, headY + 50, 'feast');
              this.say(pickTalk(CFG.talkCare.wishGranted));
            } else if (a.reaction === 'star') {
              // 幸運星:額外 +1 成長(可能因此升階 → 蓋掉原本的結果一起慶祝)
              const bres = ST.bonusXp(ST.load(this.petId), 1);
              if (bres.grew) a.result = bres;
              PLS.burst(stand.x, headY - 10, 'feast');
              this.say(pickTalk(CFG.talkCare.star));
            } else {
              if (a.reaction === 'hearts') { PLS.burst(stand.x, headY + 10, 'feast'); }
              this.say(pickTalk(CFG.talkCare[a.reaction] || CFG.talkCare.feedDone));
            }
          }
          if (a.reaction === 'hearts' && !a.hb2 && re > 0.6) { a.hb2 = true; PLS.burst(stand.x - 30, headY + 40, 'feast'); }
          if (a.reaction === 'spin') {
            const sk = Math.min(1, re / 0.9);
            return at('happy', -Math.sin(sk * Math.PI) * 30 * sc, sk * TAU);
          }
          if (a.reaction === 'hops') return at('happy', -Math.abs(Math.sin(re * 9)) * 70 * sc);
          if (a.reaction === 'burp') return at(re < 0.5 ? 'chew' : 'happy');
          return at('happy');
        }
      } else {
        if (e < 3.6) {
          if (!a.saidStart) { a.saidStart = true; this.say(pickTalk(CFG.talkCare.playStart)); }
          if (!a.hb || t - a.hb > 0.7) { a.hb = t; PLS.burst(playPt.x, matY - 46, 'small'); }
          return at('happy');
        }
        if (e < 5.0) {
          if (!a.reacted) { a.reacted = true; PLS.sfx.correct(); this.say(pickTalk(CFG.talkCare.playDone)); }
          return at('idle');
        }
      }
      // 動畫結束:清掉,並檢查有沒有升階;漫遊狀態接手目前位置(不會瞬移)
      const res = a.result;
      this.act = null;
      if (this._wander) {
        this._wander.x = stand.x; this._wander.z = dz;
        this._wander.state = 'idle'; this._wander.until = t + 1.0; this._wander.hop = 0;
      }
      if (res && res.grew) {
        this.grow = { t0: t, stage: res.stage, stageZh: res.stageZh };
        PLS.sfx.feast();
        const d = ST.load(this.petId);
        PLS.say((d.name || CFG.pets[this.species || d.species || 'rabbit'].name) + '長大了!');
      }
      return at('happy');
    },

    // ── 2.5D 漫遊:整片地板隨機走走停停,轉身翻面、近大遠小 ──
    updateWander: function (t, geo) {
      let w = this._wander;
      if (!w) {
        const xr0 = xRange(geo, 0.7);
        w = this._wander = {
          x: (xr0.min + xr0.max) / 2, z: 0.7, tx: 0, tz: 0.7,
          state: 'idle', until: t + 1.2, face: 1, hop: 0, mode: 'idle', lastT: t
        };
      }
      return wanderStep(t, geo, w);
    },

    // ── 雙寵物互訪:另一隻寵物從房間邊緣走進來作客,一起吃點心,待一陣子再回家 ──
    // 回傳訪客 pose {x,z,hop,mode,face,dir} 或 null(還沒來/已離開)。純演出,不動任何存檔。
    updateVisit: function (t, geo, foodPt) {
      const v = this._visit;
      if (!v) return null;
      if (v.phase === 'wait') {
        if (t < v.at) return null;
        // 進場:從左或右邊緣走進來,邊走邊打招呼
        const fromLeft = Math.random() < 0.5;
        const z0 = 0.42 + Math.random() * 0.3;
        const xr = xRange(geo, z0);
        v.exitX = fromLeft ? geo.x0 - 90 : geo.x1 + 90;
        v.phase = 'in';
        v.w = { x: v.exitX, z: z0, tx: fromLeft ? xr.min + 30 : xr.max - 30, tz: z0,
                state: 'walk', until: 0, face: fromLeft ? 1 : -1, hop: 0, mode: 'idle', lastT: t };
        v.stayUntil = t + 45;
        v.hostSayAt = t + 1.6;   // 主人寵物晚一點回話,泡泡才不會撞在一起
        this.sayG(pickTalk(CFG.talkCare.visitArrive));
        PLS.sfx.correct();
      }
      const w = v.w, act = this.act;
      if (v.hostSayAt && t >= v.hostSayAt) {
        v.hostSayAt = 0;
        this.say(pickTalk(CFG.talkCare.visitHost).replace('{name}', v.name || CFG.pets[v.id].name));
      }
      if (v.phase === 'in') {
        if (walkStep(t, geo, w, w.tx, w.tz)) {
          v.phase = 'stay'; w.state = 'idle'; w.until = t + 1.4; w.hop = 0; w.dir = 'front';
        }
      } else if (v.phase === 'stay') {
        if (act && act.kind === 'feed') {
          // 主人寵物開飯了 → 走過去墊子另一側一起吃
          v.phase = 'join'; v.thanked = false;
          this.sayG(pickTalk(CFG.talkCare.visitEat));
        } else if (act && act.kind === 'play') {
          // 在旁邊蹦蹦跳跳幫忙加油
          w.hop = -Math.abs(Math.sin(t * 6)) * 26 * scAt(w.z);
          w.mode = 'happy'; w.dir = 'front';
        } else if (t >= v.stayUntil) {
          v.phase = 'leave';
          this.sayG(pickTalk(CFG.talkCare.visitLeave));
        } else {
          wanderStep(t, geo, w);
        }
      } else if (v.phase === 'join') {
        if (!act) {
          // 吃完了:道謝,回去繼續逛(至少再待一下下才回家)
          if (!v.thanked) { v.thanked = true; this.sayG(pickTalk(CFG.talkCare.visitThanks)); }
          v.phase = 'stay'; w.state = 'idle'; w.until = t + 1.2;
          v.stayUntil = Math.max(v.stayUntil, t + 8);
        } else if (walkStep(t, geo, w, foodPt.x + 64, foodPt.z + 0.08)) {
          // 主人寵物站墊子左邊(-64),訪客站右邊(+64),跟著一起咀嚼
          const e = t - act.t0;
          w.hop = 0; w.dir = 'front';
          w.mode = e > 1.2 && e < 3.35 ? 'chew' : 'happy';
        }
      } else if (v.phase === 'leave') {
        if (walkStep(t, geo, w, v.exitX, w.z)) { this._visit = null; return null; }
      }
      // 被摸摸:開心一下
      if (v.pat && t - v.pat < 1.0 && (v.phase === 'stay' || v.phase === 'join')) {
        w.mode = 'happy'; w.dir = 'front';
      }
      return { x: w.x, z: w.z, hop: w.hop, mode: w.mode, face: w.face, dir: w.dir };
    },

    // ── v5:照顧圖示(頭上兩顆:飯碗=今天餵過、球=今天玩過;沒做的半透明)──
    drawCareIcons: function (ctx, d, cx, y) {
      const fed = d.care.fed > 0, played = d.care.played > 0;
      const self = this;
      [{ done: fed, dx: -26, kind: 'bowl' }, { done: played, dx: 26, kind: 'ball' }].forEach(function (it) {
        const x = cx + it.dx;
        ctx.save();
        ctx.globalAlpha = it.done ? 1 : 0.35;
        ctx.fillStyle = '#FFFFFF'; el(ctx, x, y, 17, 17); ctx.fill();
        ctx.strokeStyle = it.done ? '#F2B96B' : '#C9BCA8'; ctx.lineWidth = 2.5; el(ctx, x, y, 17, 17); ctx.stroke();
        if (it.kind === 'bowl') {
          ctx.fillStyle = '#E8965E';
          ctx.beginPath(); ctx.arc(x, y - 1, 9, 0, Math.PI); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#FFF3DC'; el(ctx, x, y - 3, 8, 3); ctx.fill();
        } else {
          ctx.fillStyle = '#8FB8D8'; el(ctx, x, y, 9, 9); ctx.fill();
          ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x - 8, y - 3); ctx.quadraticCurveTo(x, y + 4, x + 8, y - 3); ctx.stroke();
        }
        if (it.done) {   // 小綠勾
          ctx.fillStyle = '#8FC9A8'; el(ctx, x + 12, y - 12, 8, 8); ctx.fill();
          ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x + 8.5, y - 12); ctx.lineTo(x + 11, y - 9.5); ctx.lineTo(x + 15.5, y - 15); ctx.stroke();
        }
        ctx.restore();
      });
    },

    // ── v5:許願泡泡(想吃的食物;點泡泡告訴你去哪關賺)──
    drawWish: function (ctx, t, wish, petX, footY, sc) {
      const bx = clamp(petX + 300 * sc, this._box.ix + 96, this._box.ix + this._box.iw - 110);
      const by = Math.max(this._box.iy + 78, footY - 300 * sc - 130) + Math.sin(t * 2) * 4;
      ctx.save();
      ctx.shadowColor = 'rgba(150,110,70,0.2)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      ctx.fillStyle = 'rgba(255,255,255,0.96)'; el(ctx, bx, by, 78, 56); ctx.fill();
      ctx.shadowColor = 'transparent';
      // 思考小圓點(往寵物方向)
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      el(ctx, bx - 62, by + 52, 10, 10); ctx.fill();
      el(ctx, bx - 82, by + 70, 6, 6); ctx.fill();
      ctx.restore();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '17px ' + FONT; ctx.fillStyle = '#A8865E';
      ctx.fillText('好想吃…', bx, by - 30);
      A.drawFood(ctx, wish.key, bx, by + 8, 0.62);
      this._wishRect = { x: bx - 80, y: by - 58, w: 160, h: 116 };
    },

    // ── 食物籃 / 玩具箱(畫在房間前緣兩角,回傳點擊範圍)──
    drawBasket: function (ctx, cx, cy, kind, count, t) {
      const bob = count > 0 ? Math.sin(t * 2.4 + (kind === 'toy' ? 2 : 0)) * 2 : 0;
      ctx.save();
      ctx.translate(cx, cy + bob);
      if (kind === 'food') {
        // 野餐籃:提把 + 梯形籃身 + 編織紋
        ctx.strokeStyle = '#A9784A'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, -18, 24, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#C99355';
        ctx.beginPath(); ctx.moveTo(-40, -16); ctx.lineTo(40, -16); ctx.lineTo(30, 26); ctx.lineTo(-30, 26); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#B57F42'; rr(ctx, -44, -22, 88, 12, 6); ctx.fill();
        ctx.strokeStyle = 'rgba(120,80,40,0.28)'; ctx.lineWidth = 2;
        [0, 12].forEach(function (yy) { ctx.beginPath(); ctx.moveTo(-34 + yy * 0.3, yy); ctx.lineTo(34 - yy * 0.3, yy); ctx.stroke(); });
      } else {
        // 玩具箱:掀蓋木箱 + 露出一點玩具
        ctx.fillStyle = '#E88A80'; el(ctx, -16, -26, 8, 8); ctx.fill();
        ctx.fillStyle = '#8FC9A8'; rr(ctx, 6, -34, 16, 13, 3); ctx.fill();
        ctx.fillStyle = '#8FB8D8'; rr(ctx, -40, -14, 80, 40, 8); ctx.fill();
        ctx.fillStyle = '#7AA6C9'; rr(ctx, -44, -26, 88, 16, 7); ctx.fill();
        ctx.fillStyle = '#F2CE5E'; el(ctx, 0, -6, 7, 5); ctx.fill();
      }
      ctx.restore();
      A.pill(ctx, cx, cy + 44, kind === 'food' ? '食物籃' : '玩具箱',
        kind === 'food' ? MAT.foodTag : MAT.playTag, 'rgba(255,255,255,0.92)', 17);
      // 數量徽章
      const bx2 = cx + 40, by2 = cy - 36;
      ctx.fillStyle = count > 0 ? '#E8734E' : '#B9AC98';
      el(ctx, bx2, by2, 18, 18); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.font = '700 19px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(count > 99 ? 99 : count), bx2, by2 + 1);
      return { x: cx - 62, y: cy - 56, w: 124, h: 118 };
    },

    // ── 背包托盤(蓋在房間下半,列出可餵/可玩的東西)──
    drawTray: function (ctx, t, d) {
      const B = this._box, kind = this.tray;
      let list = ST.invList(d, kind === 'food' ? 'foods' : 'toys');
      // v7:金色食物排在一般食物後面,格子鍍金
      if (kind === 'food') {
        list = list.concat(ST.invList(d, 'gold').map(function (it) {
          return { key: it.key, n: it.n, gold: true };
        }));
      }
      const pw2 = B.iw - 56, ph2 = 292;
      const px = B.ix + 28, py = B.iy + B.ih - ph2 - 14;
      this._trayPanel = { x: px, y: py, w: pw2, h: ph2 };
      ctx.save();
      ctx.shadowColor = 'rgba(90,60,30,0.28)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
      ctx.fillStyle = 'rgba(255,251,242,0.98)'; rr(ctx, px, py, pw2, ph2, 24); ctx.fill();
      ctx.restore();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '26px ' + FONT; ctx.fillStyle = kind === 'food' ? MAT.foodTag : MAT.playTag;
      ctx.fillText(kind === 'food' ? '食物籃 · 點一個餵牠吃' : '玩具箱 · 點一個陪牠玩', px + 26, py + 36);
      // 關閉鈕(✕)
      const cr = { x: px + pw2 - 58, y: py + 14, w: 44, h: 44 };
      this._trayClose = cr;
      ctx.fillStyle = '#F0E4D2'; rr(ctx, cr.x, cr.y, cr.w, cr.h, 14); ctx.fill();
      ctx.strokeStyle = '#9A7B5C'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cr.x + 14, cr.y + 14); ctx.lineTo(cr.x + 30, cr.y + 30);
      ctx.moveTo(cr.x + 30, cr.y + 14); ctx.lineTo(cr.x + 14, cr.y + 30);
      ctx.stroke();
      this._trayRects = []; this._trayCTA = null;
      if (!list.length) {
        // 空背包:提示 + 直達解題的按鈕(把想玩的動力引回學習)
        ctx.textAlign = 'center';
        ctx.font = '25px ' + FONT; ctx.fillStyle = '#A8927A';
        ctx.fillText(kind === 'food' ? '背包裡沒有食物了' : '玩具箱空空的', px + pw2 / 2, py + 106);
        const bw = 420, bh = 70, bx3 = px + (pw2 - bw) / 2, by3 = py + 152;
        this._trayCTA = { x: bx3, y: by3, w: bw, h: bh };
        ctx.save();
        ctx.shadowColor = 'rgba(180,120,40,0.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
        ctx.fillStyle = kind === 'food' ? '#F2A93C' : '#8FC9A8'; rr(ctx, bx3, by3, bw, bh, 22); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#FFFFFF'; ctx.font = '27px ' + FONT;
        ctx.fillText(kind === 'food' ? '去數學餐廳解題賺食物 →' : '去英文遊戲間過關拿玩具 →', px + pw2 / 2, by3 + bh / 2);
        return;
      }
      // 物品格:一排最多 7 個、最多兩排
      const cell = 96, gap2 = 12;
      const perRow = Math.min(7, list.length);
      const gx0 = px + (pw2 - (perRow * cell + (perRow - 1) * gap2)) / 2;
      const self = this;
      list.slice(0, 14).forEach(function (it, i) {
        const r = Math.floor(i / 7), c = i % 7;
        const x = gx0 + c * (cell + gap2), y = py + 66 + r * (cell + gap2);
        ctx.fillStyle = it.gold ? '#FFF6DC' : '#FFFFFF'; rr(ctx, x, y, cell, cell, 18); ctx.fill();
        ctx.strokeStyle = it.gold ? '#E8B23C' : '#EFE0CE'; ctx.lineWidth = it.gold ? 3 : 2;
        rr(ctx, x, y, cell, cell, 18); ctx.stroke();
        if (kind === 'food') {
          (it.gold ? A.drawFoodGold : A.drawFood)(ctx, it.key, x + cell / 2, y + cell / 2 - 4, 0.72);
        } else TOY.drawToy(ctx, it.key, x + cell / 2, y + cell / 2 - 2, 0.6);
        ctx.fillStyle = it.gold ? '#D89A18' : '#E8734E'; el(ctx, x + cell - 16, y + 16, 15, 15); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.font = '700 16px ' + FONT;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(it.n > 99 ? 99 : it.n), x + cell - 16, y + 17);
        self._trayRects.push({ x: x, y: y, w: cell, h: cell, key: it.key, gold: !!it.gold });
      });
      if (list.length > 14) {
        ctx.textAlign = 'center'; ctx.font = '18px ' + FONT; ctx.fillStyle = '#B9A88F';
        ctx.fillText('東西太多裝不下,先吃掉/玩掉一些吧!', px + pw2 / 2, py + ph2 - 16);
      }
    },

    // ── 成長條(左欄,主選單卡片下方)──
    drawGrowth: function (ctx, t, d) {
      const gi = ST.growthInfo(d);
      if (this._prDisp == null) this._prDisp = gi.progress;
      this._prDisp += (gi.progress - this._prDisp) * 0.1;
      const x = 30, y = 568, w = PW - 60, h = 76;
      ctx.save();
      ctx.shadowColor = 'rgba(150,100,60,0.12)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#FFFFFF'; rr(ctx, x, y, w, h, 20); ctx.fill();
      ctx.restore();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '23px ' + FONT; ctx.fillStyle = '#8A6242';
      ctx.fillText('成長:' + gi.stageZh, x + 22, y + 24);
      ctx.textAlign = 'right'; ctx.font = '19px ' + FONT; ctx.fillStyle = '#B49A7C';
      ctx.fillText(gi.next ? ('還差 ' + Math.max(0, gi.next - gi.xp) + ' 點長大') : '已經是大寶了!', x + w - 22, y + 24);
      const bx = x + 22, bw = w - 44, by = y + 46, bh = 15;
      ctx.fillStyle = '#F0E6D6'; rr(ctx, bx, by, bw, bh, 7); ctx.fill();
      const pr = Math.max(0, Math.min(1, this._prDisp));
      if (pr > 0.02) { ctx.fillStyle = '#F2B96B'; rr(ctx, bx, by, Math.max(bh, bw * pr), bh, 7); ctx.fill(); }
    },

    // ── 升階慶祝(蓋在房間框上)──
    drawGrow: function (ctx, t, d) {
      const g = this.grow, B = this._box, e = t - g.t0;
      const species = this.species || d.species || 'rabbit';
      const name = d.name || CFG.pets[species].name;
      const gDeco = ST.growthInfo(d).deco;
      ctx.save();
      ctx.beginPath(); rr(ctx, B.ix, B.iy, B.iw, B.ih, 14); ctx.clip();
      ctx.fillStyle = 'rgba(80,60,35,0.45)'; ctx.fillRect(B.ix, B.iy, B.iw, B.ih);
      const cx = B.ix + B.iw / 2, cy = B.iy + B.ih / 2 + 30;
      const rg = ctx.createRadialGradient(cx, cy - 60, 30, cx, cy - 60, 360);
      rg.addColorStop(0, 'rgba(255,214,120,0.75)'); rg.addColorStop(1, 'rgba(255,214,120,0)');
      ctx.fillStyle = rg; ctx.fillRect(B.ix, B.iy, B.iw, B.ih);
      // 旋轉光芒
      ctx.strokeStyle = 'rgba(255,235,170,0.5)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let r = 0; r < 10; r++) {
        const a2 = t * 0.7 + r * Math.PI / 5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a2) * 150, cy - 40 + Math.sin(a2) * 150);
        ctx.lineTo(cx + Math.cos(a2) * 190, cy - 40 + Math.sin(a2) * 190);
        ctx.stroke();
      }
      const pop = e < 0.5 ? 0.6 + 0.4 * Math.sin(e / 0.5 * Math.PI / 2) : 1;
      ctx.save(); ctx.translate(cx, cy + 110); ctx.scale(0.62 * pop, 0.62 * pop);
      P.draw(species, ctx, t, { mode: 'happy', stage: g.stage, growDeco: gDeco });
      ctx.restore();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '52px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillText(name + '長大了!', cx, B.iy + 86);
      ctx.fillStyle = '#C2591E'; ctx.fillText(name + '長大了!', cx, B.iy + 82);
      A.pill(ctx, cx, B.iy + 140, '變成「' + g.stageZh + '」了!', '#C2851E', 'rgba(255,244,214,0.96)', 26);
      if (e > 1.2) A.pill(ctx, cx, B.iy + B.ih - 40, '點一下繼續', 'rgba(255,255,255,0.9)', 'rgba(120,90,60,0.55)', 19);
      ctx.restore();
      if (!g.hb || t - g.hb > 0.5) { g.hb = t; PLS.burst(cx + (Math.random() - 0.5) * 320, cy - 60, 'feast'); }
    },

    draw: function (ctx, t) {
      const pid = this.petId;                          // 儲存 slot
      const species = this.species || ST.load(pid).species || 'rabbit';
      const th = CFG.pets[species].theme;
      const d = ST.load(pid), name = d.name || CFG.pets[species].name;
      const gi = ST.growthInfo(d);
      ctx.fillStyle = '#EFE3D2'; ctx.fillRect(0, 0, W, H);

      // 右側:屋頂 + 厚木框房間
      const fx = PW + 26, fy = 158, fw = W - (PW + 26) - 30, fh = H - 158 - 34;
      const box = roofFrame(ctx, fx, fy, fw, fh, name + '的房間');
      this._box = box;
      trophyBadge(ctx, fx + fw - 78, fy - 44, ST.trophyNumber(d), '🧮');           // v12:數學獎盃(目前破到第幾關)
      trophyBadge(ctx, fx + fw - 78, fy - 90, ST.trophyNumberEnglish(d), '🔤');    // v13:英文獎盃,疊在數學獎盃上方
      // 部分物種有專屬場景背景(見 screens.js SCENE_ROOM);沒有的物種沿用通用壁紙房間
      const sceneFn = window.PLS_SCENE_ROOM && window.PLS_SCENE_ROOM[species];
      let wallB;
      if (sceneFn) {
        ctx.save(); ctx.beginPath(); rr(ctx, box.ix, box.iy, box.iw, box.ih, 14); ctx.clip();
        ctx.translate(box.ix, box.iy); ctx.scale(box.iw / 440, box.ih / 340);
        sceneFn(ctx, 440, 340);
        ctx.restore();
        wallB = box.iy + box.ih * 0.47;
      } else {
        wallB = roomInterior(ctx, box.ix, box.iy, box.iw, box.ih, 14, th.wall, th.dot);
      }
      ctx.save();
      ctx.beginPath(); rr(ctx, box.ix, box.iy, box.iw, box.ih, 14); ctx.clip();
      const frontY = box.iy + box.ih - 36;
      // 2.5D 地板幾何:寵物可在 yTop(靠牆) ~ yBot(前緣) 之間整場走動
      const geo = this._geo = { x0: box.ix, x1: box.ix + box.iw, yTop: wallB + 55, yBot: frontY };
      const matZ = 0.34, matY = yAt(geo, matZ);
      const foodPt = { x: box.ix + box.iw * 0.30, z: matZ };
      const playPt = { x: box.ix + box.iw * 0.70, z: matZ };
      station(ctx, foodPt.x, matY, 'food');
      station(ctx, playPt.x, matY, 'toy');
      A.pill(ctx, foodPt.x, wallB + 28, '食物區', MAT.foodTag, MAT.foodTagBg, 22);
      A.pill(ctx, playPt.x, wallB + 28, '遊戲區', MAT.playTag, MAT.playTagBg, 22);

      // 餵食/陪玩動畫 or 平常自己在地板上漫遊
      let pose = null;
      const actRef = this.act;
      if (actRef) pose = this.actPose(t, foodPt, playPt, matY, frontY);
      if (actRef && this.act) {
        // 還在進行中:把食物/玩具畫在墊子中央(大小配合墊子深度)
        const e = t - actRef.t0, msc = scAt(matZ) / 0.42;
        if (actRef.kind === 'feed') {
          if (actRef.bites < 3) {
            const fs = [0.95, 0.72, 0.5][actRef.bites] * msc;
            itemShadow(ctx, foodPt.x, matY + 7, 30 * fs);
            (actRef.gold ? A.drawFoodGold : A.drawFood)(ctx, actRef.key, foodPt.x, matY - 8, fs);
          }
        } else {
          const doing = e >= 1.1 && e < 3.6;
          const off = doing ? Math.abs(Math.sin((e - 1.1) * 5)) * 22 : 0;
          const fade = e >= 3.6 ? Math.max(0, 1 - (e - 3.6) / 0.9) : 1;
          ctx.save(); ctx.globalAlpha = fade;
          itemShadow(ctx, playPt.x, matY + 7, 24);
          TOY.drawToy(ctx, actRef.key, playPt.x, matY - 12 - off, 0.66);
          ctx.restore();
        }
      }
      if (!pose) {
        const w = this.updateWander(t, geo);
        pose = { x: w.x, z: w.z, hop: w.hop, mode: w.mode, face: w.face, dir: w.dir };
      }
      if (this.pat && t - this.pat.t0 < 1.0 && !this.act) { pose.mode = 'happy'; pose.dir = 'front'; }
      // 訪客(另一隻寵物來作客);兩隻依深度排序,遠的先畫
      const gpose = this.updateVisit(t, geo, foodPt);
      const petsDraw = [{ id: species, pose: pose, stage: gi.stage, deco: gi.deco, main: true }];
      if (gpose) petsDraw.push({ id: this._visit.id, pose: gpose, stage: this._visit.stage, deco: this._visit.deco, main: false });
      petsDraw.sort(function (a, b) { return a.pose.z - b.pose.z; });
      const self = this;
      petsDraw.forEach(function (it) {
        const s = scAt(it.pose.z), gy = yAt(geo, it.pose.z);
        ctx.fillStyle = 'rgba(150,110,70,0.16)'; el(ctx, it.pose.x, gy + 4, 150 * s, 34 * s); ctx.fill();
        petAt(ctx, it.id, t, it.pose.x, gy + it.pose.hop, s, it.pose.mode, it.stage, it.pose.rot, it.pose.face, it.pose.dir, it.deco);
        if (it.main) { self._petX = it.pose.x; self._petY = gy; self._petS = s; }
        else { self._guestX = it.pose.x; self._guestY = gy; self._guestS = s; }
      });
      if (!gpose) this._guestX = null;
      const psc = this._petS, groundY = this._petY;

      // ── v5:照顧圖示(飯碗/球)+ 許願泡泡 + 撒嬌 ──
      if (!this.act && !this.grow) {
        this.drawCareIcons(ctx, d, pose.x, groundY - 440 * psc);
        const wish = ST.getWish(d);
        this._wishRect = null;
        if (wish && !wish.done) this.drawWish(ctx, t, wish, pose.x, groundY, psc);
        this._wishInfo = wish;
        // 撒嬌:今天還沒餵(每 16 秒)/ 餵了但還沒陪玩且有玩具(每 26 秒)
        if (!this.bubble || t >= this.bubble.until) {
          if (d.care.fed === 0 && t - (this._nagT || -99) > 16) {
            this._nagT = t; this.say(pickTalk(CFG.talkCare.hungryNag));
          } else if (d.care.fed > 0 && d.care.played === 0 && ST.invTotal(d, 'toys') > 0 && t - (this._nagT || -99) > 26) {
            this._nagT = t; this.say(pickTalk(CFG.talkCare.playNag));
          }
        }
      } else { this._wishRect = null; }

      // ── v5:掛畫 = 收集圖鑑入口 ──
      this._picRect = { x: box.ix + 54, y: box.iy + 50, w: 116, h: 118 };
      A.pill(ctx, box.ix + 112, box.iy + 162, '圖鑑', '#B06A86', 'rgba(255,255,255,0.9)', 16);

      // 食物籃 / 玩具箱(前緣兩角,可點)
      this._foodBasket = this.drawBasket(ctx, box.ix + 88, box.iy + box.ih - 64, 'food', ST.invTotal(d, 'foods') + ST.invTotal(d, 'gold'), t);
      this._toyBox = this.drawBasket(ctx, box.ix + box.iw - 88, box.iy + box.ih - 64, 'toy', ST.invTotal(d, 'toys'), t);
      ctx.restore();

      // 左側設定欄底板 + 標頭(按鈕由 enter 疊在上面)
      ctx.save();
      ctx.shadowColor = 'rgba(120,80,50,0.18)'; ctx.shadowBlur = 26; ctx.shadowOffsetX = 6;
      ctx.fillStyle = '#FFFBF3'; rr(ctx, -40, 0, PW + 40, H, 0); ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(214,180,150,0.10)'; ctx.fillRect(0, 0, PW, H);
      // 頭像
      ctx.save(); ctx.beginPath(); el(ctx, 132, 116, 42, 42); ctx.clip();
      ctx.fillStyle = '#FCEFE6'; ctx.fillRect(86, 66, 92, 100);
      petAt(ctx, species, t, 132, 168, 0.32, 'idle', gi.stage, 0, 1, 'front', gi.deco); ctx.restore();
      ctx.strokeStyle = '#F2D8C0'; ctx.lineWidth = 4; el(ctx, 132, 116, 42, 42); ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '34px ' + FONT; ctx.fillStyle = th.deep; ctx.fillText(name + '的房間', 190, 100);
      ctx.font = '20px ' + FONT; ctx.fillStyle = 'rgba(120,95,70,0.82)'; ctx.fillText('今天想做什麼呢?', 190, 134);
      // 成長條
      this.drawGrowth(ctx, t, d);

      // 蓋在最上面的層:背包托盤 / 升階慶祝
      if (this.tray) this.drawTray(ctx, t, d);
      if (this.grow) this.drawGrow(ctx, t, d);
    },

    drawTop: function (ctx, t) {
      if (this.bubble && t < this.bubble.until && !this.grow) {
        const bx = Math.min(W - 190, Math.max(PW + 190, this._petX || (PW + 400)));
        const by = Math.max(200, (this._petY || 640) - 460 * (this._petS || 0.42));
        A.bubble(ctx, bx, by, this.bubble.text, { size: 22 });
      }
      // 訪客的泡泡(跟著訪客位置)
      if (this.gBubble && t < this.gBubble.until && !this.grow && this._guestX != null) {
        const gx = Math.min(W - 190, Math.max(PW + 190, this._guestX));
        const gy2 = Math.max(200, (this._guestY || 640) - 460 * (this._guestS || 0.42));
        A.bubble(ctx, gx, gy2, this.gBubble.text, { size: 22 });
      }
    }
  };

  PLS.register('room', room);
  // v11:把 2.5D 房間的共用繪製元件匯出,讓 app/visit.js(拜訪好友)能重用同一套視覺語言
  // (屋頂厚木框、地板、食物/遊戲墊、寵物定位與走位),不用另外重畫一份房間殼。
  window.PLS_ROOM2 = {
    MAT: MAT, el: el, rr: rr, roofFrame: roofFrame, roomInterior: roomInterior, station: station,
    petAt: petAt, xRange: xRange, yAt: yAt, scAt: scAt, dirOf: dirOf,
    wanderStep: wanderStep, walkStep: walkStep, clamp: clamp, smooth: smooth,
    trophyBadge: trophyBadge   // v12:獎盃徽章,app/visit.js 拜訪畫面重用同一份繪製
  };
})();
