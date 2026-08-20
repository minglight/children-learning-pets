// dex.js — 收集圖鑑畫面(Phase 3 電子雞化)
// 寵物吃過的食物、玩過的玩具會點亮;未收集顯示剪影 + 問號,培養收集動機。
// 僅建立新畫面,不修改任何既有檔案。由 index.html / main.js 引入後自動生效。
(function () {
  var PLS = window.PLS;
  var A = window.PLS_ART;
  var TOY = window.PLS_TOY;
  var CFG = window.PLS_CONFIG;
  var ST = window.PLS_STORE;
  var W = PLS.W;   // 1194
  var H = PLS.H;   // 834
  var FONT = A.FONT;

  // ── 建立穩定排序的全集目錄 ──────────────────────────────
  // 食物:依 CFG.math 關卡順序,先收 lv.bite,再收 lv.feast.items,去重。
  function buildFoodCatalog() {
    var seen = {};
    var list = [];
    var math = CFG.math || [];
    math.forEach(function (lv) {
      function add(k) {
        if (k && !seen[k]) { seen[k] = true; list.push(k); }
      }
      if (lv.bite) add(lv.bite);
      if (lv.feast && Array.isArray(lv.feast.items)) {
        lv.feast.items.forEach(add);
      }
    });
    return list;
  }

  // 玩具:依 CFG.english 關卡順序,取全物種共用玩具 lv.toyArtU,去重。
  // v9:玩具改共用一套,不再分寵物;參數保留相容,實際不使用。
  function buildToyCatalog(petId) {
    var seen = {};
    var list = [];
    var english = CFG.english || [];
    english.forEach(function (lv) {
      var k = lv.toyArtU;
      if (k && !seen[k]) { seen[k] = true; list.push(k); }
    });
    return list;
  }

  // ── 收集來源對照(哪一關的獎勵)── 純靜態算法,依 CFG 關卡順序取「第一個給這個 key 的關卡」,
  // 不需要另外存檔記錄「實際哪次拿到的」(同一個 key 常常好幾關都會給)。滑鼠移到已收集格子上時顯示用。
  function levelLabel(lv) { return lv.name + (lv.sub ? '·' + lv.sub : ''); }
  function buildFoodSourceMap() {
    var map = {};
    (CFG.math || []).forEach(function (lv) {
      function claim(k) { if (k && !map[k]) map[k] = levelLabel(lv); }
      if (lv.bite) claim(lv.bite);
      if (lv.feast && Array.isArray(lv.feast.items)) lv.feast.items.forEach(claim);
    });
    return map;
  }
  function buildToySourceMap() {
    var map = {};
    (CFG.english || []).forEach(function (lv) {
      if (lv.toyArtU && !map[lv.toyArtU]) map[lv.toyArtU] = levelLabel(lv);
    });
    return map;
  }

  // ── 格子版面常數 ───────────────────────────────────────
  var CELL = 110;      // 格子寬高(含間距)
  var GAP  = 8;        // 格子間距(格子實際大小 = CELL - GAP = 102px)
  var CELL_SIZE = CELL - GAP;  // 102
  var COLS = 8;
  var GRID_W = COLS * CELL;    // 880
  var GRID_X = Math.floor((W - GRID_W) / 2);  // 左邊起始 x,約 157

  // 各區塊在捲動內容裡的 y 起始(相對於捲動起點)
  var SECTION_TITLE_H = 52;   // 區塊標題高度
  var CONTENT_TOP = 166;      // 第一個區塊頂部(標題+pill 後的留白)

  // 計算一個格子陣列需要的高度
  function gridHeight(n) {
    var rows = Math.ceil(n / COLS);
    return rows * CELL + GAP;
  }

  // 拜訪朋友時多兩區:珍藏館縮圖(畢業寶貝牆)、配件圖鑑(每物種 5 款收集狀態)——只有 friendMode 才會用到
  var COLL_COLS = 3, COLL_GAP = 16;
  var COLL_W = (GRID_W - (COLL_COLS - 1) * COLL_GAP) / COLL_COLS;
  var COLL_H = 176;
  var DECO_ROW_H = 58;
  function collGridHeight(n) {
    if (!n) return 90;
    return Math.ceil(n / COLL_COLS) * (COLL_H + COLL_GAP) - COLL_GAP;
  }
  function decoGridHeight(n) {
    return n ? n * DECO_ROW_H : 60;
  }

  // 各區段垂直偏移(相對於可捲動內容頂端);collCount/decoCount 給 null 就不算那兩區(自己的圖鑑不用)
  function sectionOffsets(foodCount, toyCount, collCount, decoCount) {
    var foodTitle = 0;
    var foodGrid  = foodTitle + SECTION_TITLE_H;
    var toyTitle  = foodGrid + gridHeight(foodCount) + 24;  // 24 間隔
    var toyGrid   = toyTitle + SECTION_TITLE_H;
    var off = { foodTitle: foodTitle, foodGrid: foodGrid, toyTitle: toyTitle, toyGrid: toyGrid };
    var cursor = toyGrid + gridHeight(toyCount) + 24;
    if (collCount != null) {
      off.collTitle = cursor; off.collGrid = off.collTitle + SECTION_TITLE_H;
      cursor = off.collGrid + collGridHeight(collCount) + 24;
    }
    if (decoCount != null) {
      off.decoTitle = cursor; off.decoGrid = off.decoTitle + SECTION_TITLE_H;
      cursor = off.decoGrid + decoGridHeight(decoCount) + 24;
    }
    off.total = cursor + 16;   // 底部留白
    return off;
  }

  // ── 單一格子繪製 ──────────────────────────────────────
  function drawCell(ctx, cx, cy, key, type, unlocked) {
    var r = CELL_SIZE / 2;
    // 白底圓角卡
    ctx.save();
    ctx.shadowColor = 'rgba(140,110,70,0.13)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#FFFFFF';
    A.rr(ctx, cx - r, cy - r, CELL_SIZE, CELL_SIZE, 16);
    ctx.fill();
    ctx.restore();

    if (unlocked) {
      // 已收集:正常繪製
      ctx.save();
      if (type === 'food') {
        A.drawFood(ctx, key, cx, cy, 0.7);
      } else {
        TOY.drawToy(ctx, key, cx, cy, 0.6);
      }
      ctx.restore();
      // 右上角綠勾
      var bx = cx + r - 18, by = cy - r + 8;
      ctx.save();
      ctx.fillStyle = '#54A268';
      ctx.beginPath();
      ctx.arc(bx, by, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(bx - 5, by);
      ctx.lineTo(bx - 1, by + 4);
      ctx.lineTo(bx + 5, by - 4);
      ctx.stroke();
      ctx.restore();
    } else {
      // 未收集:灰色剪影 + 問號
      ctx.save();
      ctx.globalAlpha = 0.16;
      if (type === 'food') {
        A.drawFood(ctx, key, cx, cy, 0.7);
      } else {
        TOY.drawToy(ctx, key, cx, cy, 0.6);
      }
      ctx.restore();
      // 中央淡淡的「?」
      ctx.save();
      ctx.font = '700 38px ' + FONT;
      ctx.fillStyle = '#B9A88F';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', cx, cy + 2);
      ctx.restore();
    }
  }

  // ── 一個格子陣列的繪製(有 clip,不畫超出範圍的格子)──
  function drawGrid(ctx, items, dexArr, type, gridX, gridY, scrollY, clipTop, clipBot) {
    items.forEach(function (key, i) {
      var col = i % COLS;
      var row = Math.floor(i / COLS);
      var cx = gridX + col * CELL + CELL_SIZE / 2;
      var cy = gridY + row * CELL + CELL_SIZE / 2 - scrollY;
      // 超出 clip 範圍就跳過
      if (cy + CELL_SIZE / 2 < clipTop || cy - CELL_SIZE / 2 > clipBot) return;
      var unlocked = dexArr.indexOf(key) >= 0;
      drawCell(ctx, cx, cy, key, type, unlocked);
    });
  }

  // 滑鼠/手指位置命中哪一個格子(回傳 items 的 index,沒命中回 -1)——hover tooltip 用
  function hitTestGrid(items, gridX, gridY, scrollY, hx, hy) {
    if (hx == null || hy == null) return -1;
    var col = Math.floor((hx - gridX) / CELL);
    var row = Math.floor((hy - (gridY - scrollY)) / CELL);
    if (col < 0 || col >= COLS || row < 0) return -1;
    var i = row * COLS + col;
    if (i < 0 || i >= items.length) return -1;
    var cx = gridX + col * CELL + CELL_SIZE / 2;
    var cy = gridY + row * CELL + CELL_SIZE / 2 - scrollY;
    if (Math.abs(hx - cx) > CELL_SIZE / 2 || Math.abs(hy - cy) > CELL_SIZE / 2) return -1;
    return i;
  }

  // ── 朋友模式:珍藏館縮圖 + 配件圖鑑(唯讀,不能換裝)──────────
  // v13:縮放與繪製都交給 PLS_ACTOR(每隻自己報總高;尚未搬家的物種自動回舊的 366 + P.draw)
  function petInBoxRO(ctx, species, t, bx, by, bw, bh, o, topM, botM) {
    var sc = (bh - topM - botM) / window.PLS_ACTOR.spanOf(species);
    window.PLS_ACTOR.drawAt(ctx, species, t, bx + bw / 2, by + bh - botM, sc, o || {});
  }

  function drawCollGrid(ctx, t, list, gridX, gridY, scrollY, clipTop, clipBot) {
    list.forEach(function (e, i) {
      var col = i % COLL_COLS, row = Math.floor(i / COLL_COLS);
      var gx = gridX + col * (COLL_W + COLL_GAP);
      var gy = gridY + row * (COLL_H + COLL_GAP) - scrollY;
      if (gy + COLL_H < clipTop || gy > clipBot) return;
      var sp = CFG.pets[e.species] ? e.species : 'rabbit';
      ctx.save();
      ctx.shadowColor = 'rgba(140,110,70,0.13)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
      ctx.fillStyle = '#FFFFFF'; A.rr(ctx, gx, gy, COLL_W, COLL_H, 16); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.beginPath(); A.rr(ctx, gx, gy, COLL_W, COLL_H, 16); ctx.clip();
      petInBoxRO(ctx, sp, t, gx, gy, COLL_W, COLL_H, { stage: 'grown', growDeco: (typeof e.deco === 'number' ? e.deco : 0) }, 12, 44);
      ctx.restore();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '20px ' + FONT; ctx.fillStyle = '#6A4A2E';
      ctx.fillText(e.name || (CFG.pets[sp] && CFG.pets[sp].name) || '', gx + COLL_W / 2, gy + COLL_H - 20);
    });
  }

  function drawDecoRows(ctx, speciesList, decoDex, gridX, gridY, scrollY, clipTop, clipBot) {
    var n = ST.DECO_N || 5;
    speciesList.forEach(function (sp, i) {
      var ry = gridY + i * DECO_ROW_H - scrollY;
      if (ry + DECO_ROW_H < clipTop || ry > clipBot) return;
      var owned = ST.decoOwned({ decoDex: decoDex }, sp);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '22px ' + FONT; ctx.fillStyle = '#6A4A2E';
      ctx.fillText((CFG.pets[sp] && CFG.pets[sp].name) || sp, gridX, ry + DECO_ROW_H / 2);
      var dotX = gridX + 140;
      for (var k = 0; k < n; k++) {
        ctx.beginPath();
        ctx.arc(dotX + k * 34, ry + DECO_ROW_H / 2, 11, 0, Math.PI * 2);
        ctx.fillStyle = owned.indexOf(k) >= 0 ? '#E0A828' : 'rgba(160,140,110,0.25)';
        ctx.fill();
      }
      ctx.font = '18px ' + FONT; ctx.fillStyle = 'rgba(120,95,70,0.7)'; ctx.textAlign = 'left';
      ctx.fillText(owned.length + '/' + n, dotX + n * 34 + 12, ry + DECO_ROW_H / 2);
    });
  }

  // ── 畫面物件 ──────────────────────────────────────────
  var dex = {
    petId: 'kidL',
    scroll: 0,
    maxScroll: 0,
    _pdown: false,
    _drag: false,
    _py: 0,
    _ps: 0,
    _foods: [],
    _toys: [],
    _offsets: null,

    enter: function (params) {
      this.petId = (params && params.pet) || 'kidL';
      this.scroll = 0;
      this._pdown = false;
      this._drag = false;
      this._hx = null;
      this._hy = null;

      // 朋友模式(v13):從拜訪畫面點「看圖鑑」進來,params.friendView = listFriends()/visitFriend() 給的
      // 唯讀好友物件({childNickname, species, status:{dex, decoDex, collection, ...}})。
      this.friendMode = !!(params && params.friendView);
      this.friend = (params && params.friendView) || null;
      this._resumeShared = !!(params && params.shared);   // 回 visit 時要記得帶回去,別讓「一次拜訪限分享一次」被繞過

      this._foods = buildFoodCatalog();
      this._toys  = buildToyCatalog(this.petId);
      this._foodSrc = buildFoodSourceMap();
      this._toySrc  = buildToySourceMap();

      var collCount = null, decoCount = null;
      if (this.friendMode) {
        var st = (this.friend && this.friend.status) || {};
        this._friendDex = (st.dex && typeof st.dex === 'object') ? st.dex : { foods: [], toys: [] };
        this._friendCollection = Array.isArray(st.collection) ? st.collection : [];
        this._friendDecoDex = (st.decoDex && typeof st.decoDex === 'object') ? st.decoDex : {};
        this._decoSpecies = Object.keys(this._friendDecoDex).filter(function (sp) { return !!CFG.pets[sp]; });
        collCount = this._friendCollection.length;
        decoCount = this._decoSpecies.length;
      }
      this._offsets = sectionOffsets(this._foods.length, this._toys.length, collCount, decoCount);

      // 可捲動內容總高 vs 可視區域(標題佔 CONTENT_TOP,底部到 H)
      var viewH = H - CONTENT_TOP;
      this.maxScroll = Math.max(0, this._offsets.total - viewH);

      // 返回鈕:左上角,朋友模式回拜訪畫面,自己的圖鑑回 room
      var self = this;
      PLS.addButton({
        x: 30, y: 30, w: 84, h: 84,
        draw: function (ctx) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          A.rr(ctx, 30, 30, 84, 84, 26); ctx.fill();
          A.drawIcon(ctx, 'back', 72, 72, 1.1, '#9A7B5C');
        },
        onTap: function () {
          if (self.friendMode) PLS.go('visit', { pet: self.petId, friend: self.friend, shared: self._resumeShared });
          else PLS.go('room', { pet: self.petId });
        }
      });
    },

    onWheel: function (dy) {
      this.scroll = Math.max(0, Math.min(this.maxScroll, this.scroll + dy));
    },

    pointer: function (phase, x, y) {
      if (phase === 'down') {
        this._py = y;
        this._ps = this.scroll;
        this._drag = false;
        this._pdown = true;
        this._hx = x; this._hy = y;
      } else if (phase === 'move') {
        this._hx = x; this._hy = y;   // 記錄游標位置,供已收集格子的 hover 提示使用(不論有沒有按著拖曳)
        if (!this._pdown) return;
        var dy = y - this._py;
        if (Math.abs(dy) > 6) this._drag = true;
        this.scroll = Math.max(0, Math.min(this.maxScroll, this._ps - dy));
      } else if (phase === 'up') {
        this._pdown = false;
        this._drag = false;
      }
    },

    draw: function (ctx, t) {
      // 背景
      ctx.fillStyle = '#FBF2E0';
      ctx.fillRect(0, 0, W, H);

      var nickname = this.friendMode ? ((this.friend && this.friend.childNickname) || '朋友') : '';
      var title = this.friendMode ? nickname + '的收集圖鑑' : '收集圖鑑';

      // ── 標題 ──
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '46px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(title, W / 2, 72);
      ctx.fillStyle = '#C2851E';
      ctx.fillText(title, W / 2, 68);

      // ── 讀取寵物資料(朋友模式讀雲端唯讀快照,否則讀自己的本機存檔)──
      var dexFoods, dexToys;
      if (this.friendMode) {
        dexFoods = Array.isArray(this._friendDex.foods) ? this._friendDex.foods : [];
        dexToys  = Array.isArray(this._friendDex.toys)  ? this._friendDex.toys  : [];
      } else {
        var d = ST.load(this.petId);
        dexFoods = (d.dex && Array.isArray(d.dex.foods)) ? d.dex.foods : [];
        dexToys  = (d.dex && Array.isArray(d.dex.toys))  ? d.dex.toys  : [];
      }
      var foodGot = 0, toyGot = 0;
      this._foods.forEach(function (k) { if (dexFoods.indexOf(k) >= 0) foodGot++; });
      this._toys.forEach(function  (k) { if (dexToys.indexOf(k)  >= 0) toyGot++;  });
      var allDone = foodGot === this._foods.length && toyGot === this._toys.length && this._foods.length > 0;

      // ── 進度 pill(+ 全部集滿時多一行金色 pill)──
      var progressText = '食物 ' + foodGot + '/' + this._foods.length +
                         '  ·  玩具 ' + toyGot + '/' + this._toys.length;
      if (allDone) {
        // 兩個 pill 上下疊:進度稍微上移,下方加金色慶祝 pill
        var doneText = this.friendMode ? (nickname + ' 全部集滿了!') : '全部集滿了!你是收集大師!';
        A.pill(ctx, W / 2, 116, progressText, '#B98A4F', 'rgba(255,255,255,0.94)', 20);
        A.pill(ctx, W / 2, 148, doneText, '#C2851E', 'rgba(255,244,200,0.97)', 22);
      } else {
        A.pill(ctx, W / 2, 126, progressText, '#B98A4F', 'rgba(255,255,255,0.94)', 22);
      }

      // ── 捲動內容(clip) ──
      var clipTop = CONTENT_TOP;
      var clipBot = H;
      ctx.save();
      ctx.beginPath();
      A.rr(ctx, GRID_X - 8, clipTop, GRID_W + 16, clipBot - clipTop, 10);
      ctx.clip();

      var off = this._offsets;
      var sc  = this.scroll;

      // 食物區塊標題
      var foodTitleY = CONTENT_TOP + off.foodTitle - sc;
      if (foodTitleY > clipTop - 50 && foodTitleY < clipBot + 50) {
        ctx.font = '28px ' + FONT;
        ctx.fillStyle = '#9A7B5C';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('食物圖鑑', GRID_X + 4, foodTitleY + 22);
        // 小分隔線
        ctx.strokeStyle = 'rgba(180,140,90,0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(GRID_X + 90, foodTitleY + 22);
        ctx.lineTo(GRID_X + GRID_W, foodTitleY + 22);
        ctx.stroke();
      }

      // 食物格子
      var foodGridY = CONTENT_TOP + off.foodGrid;
      drawGrid(ctx, this._foods, dexFoods, 'food', GRID_X, foodGridY, sc, clipTop, clipBot);

      // 玩具區塊標題
      var toyTitleY = CONTENT_TOP + off.toyTitle - sc;
      if (toyTitleY > clipTop - 50 && toyTitleY < clipBot + 50) {
        ctx.font = '28px ' + FONT;
        ctx.fillStyle = '#9A7B5C';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('玩具圖鑑', GRID_X + 4, toyTitleY + 22);
        ctx.strokeStyle = 'rgba(180,140,90,0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(GRID_X + 90, toyTitleY + 22);
        ctx.lineTo(GRID_X + GRID_W, toyTitleY + 22);
        ctx.stroke();
      }

      // 玩具格子
      var toyGridY = CONTENT_TOP + off.toyGrid;
      drawGrid(ctx, this._toys, dexToys, 'toy', GRID_X, toyGridY, sc, clipTop, clipBot);

      // 朋友模式多兩區:珍藏館縮圖牆(唯讀)、配件圖鑑(每物種收集點數)
      if (this.friendMode) {
        if (off.collTitle != null) {
          var collTitleY = CONTENT_TOP + off.collTitle - sc;
          if (collTitleY > clipTop - 50 && collTitleY < clipBot + 50) {
            ctx.font = '28px ' + FONT; ctx.fillStyle = '#9A7B5C';
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText('🏅 珍藏館', GRID_X + 4, collTitleY + 22);
            ctx.strokeStyle = 'rgba(180,140,90,0.25)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(GRID_X + 110, collTitleY + 22); ctx.lineTo(GRID_X + GRID_W, collTitleY + 22); ctx.stroke();
          }
          var collGridY = CONTENT_TOP + off.collGrid;
          if (!this._friendCollection.length) {
            var emptyY = collGridY - sc;
            if (emptyY > clipTop - 100 && emptyY < clipBot + 100) {
              ctx.fillStyle = 'rgba(255,255,255,0.5)'; A.rr(ctx, GRID_X, emptyY, GRID_W, 74, 16); ctx.fill();
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '20px ' + FONT; ctx.fillStyle = '#B09A7E';
              ctx.fillText('還沒有畢業的寶貝', GRID_X + GRID_W / 2, emptyY + 37);
            }
          } else {
            drawCollGrid(ctx, t, this._friendCollection, GRID_X, collGridY, sc, clipTop, clipBot);
          }
        }
        if (off.decoTitle != null) {
          var decoTitleY = CONTENT_TOP + off.decoTitle - sc;
          if (decoTitleY > clipTop - 50 && decoTitleY < clipBot + 50) {
            ctx.font = '28px ' + FONT; ctx.fillStyle = '#9A7B5C';
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText('🎀 配件圖鑑', GRID_X + 4, decoTitleY + 22);
            ctx.strokeStyle = 'rgba(180,140,90,0.25)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(GRID_X + 130, decoTitleY + 22); ctx.lineTo(GRID_X + GRID_W, decoTitleY + 22); ctx.stroke();
          }
          var decoGridY = CONTENT_TOP + off.decoGrid;
          if (!this._decoSpecies.length) {
            var emptyY2 = decoGridY - sc;
            if (emptyY2 > clipTop - 100 && emptyY2 < clipBot + 100) {
              ctx.fillStyle = 'rgba(255,255,255,0.5)'; A.rr(ctx, GRID_X, emptyY2, GRID_W, 50, 14); ctx.fill();
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '20px ' + FONT; ctx.fillStyle = '#B09A7E';
              ctx.fillText('還沒有收集到配件', GRID_X + GRID_W / 2, emptyY2 + 25);
            }
          } else {
            drawDecoRows(ctx, this._decoSpecies, this._friendDecoDex, GRID_X, decoGridY, sc, clipTop, clipBot);
          }
        }
      }

      ctx.restore();

      // ── hover 提示:滑鼠移到已收集的食物/玩具格子上,顯示是哪一關的獎勵 ──
      if (this._hx != null && !this._drag) {
        var label = null;
        var fi = hitTestGrid(this._foods, GRID_X, foodGridY, sc, this._hx, this._hy);
        if (fi >= 0 && dexFoods.indexOf(this._foods[fi]) >= 0 && this._foodSrc[this._foods[fi]]) {
          label = '「' + this._foodSrc[this._foods[fi]] + '」的獎勵';
        }
        if (!label) {
          var ti = hitTestGrid(this._toys, GRID_X, toyGridY, sc, this._hx, this._hy);
          if (ti >= 0 && dexToys.indexOf(this._toys[ti]) >= 0 && this._toySrc[this._toys[ti]]) {
            label = '「' + this._toySrc[this._toys[ti]] + '」的獎勵';
          }
        }
        if (label) {
          var ty2 = Math.max(30, this._hy - 66);
          A.pill(ctx, this._hx, ty2, label, '#6A4A2E', 'rgba(255,250,238,0.97)', 19);
        }
      }

      // ── 捲動條 ──
      if (this.maxScroll > 4) {
        var trackH = clipBot - clipTop;
        var th = Math.max(40, trackH * trackH / (trackH + this.maxScroll));
        var ty = clipTop + (trackH - th) * (this.scroll / this.maxScroll);
        ctx.fillStyle = 'rgba(150,120,80,0.22)';
        A.rr(ctx, W - 14, ty, 6, th, 3);
        ctx.fill();
      }
    }
  };

  PLS.register('dex', dex);
})();
