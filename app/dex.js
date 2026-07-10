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

  // 各區段垂直偏移(相對於可捲動內容頂端)
  function sectionOffsets(foodCount, toyCount) {
    var foodTitle = 0;
    var foodGrid  = foodTitle + SECTION_TITLE_H;
    var toyTitle  = foodGrid + gridHeight(foodCount) + 24;  // 24 間隔
    var toyGrid   = toyTitle + SECTION_TITLE_H;
    var total     = toyGrid + gridHeight(toyCount) + 40;    // 底部留白
    return { foodTitle: foodTitle, foodGrid: foodGrid, toyTitle: toyTitle, toyGrid: toyGrid, total: total };
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

      this._foods = buildFoodCatalog();
      this._toys  = buildToyCatalog(this.petId);
      this._offsets = sectionOffsets(this._foods.length, this._toys.length);

      // 可捲動內容總高 vs 可視區域(標題佔 CONTENT_TOP,底部到 H)
      var viewH = H - CONTENT_TOP;
      this.maxScroll = Math.max(0, this._offsets.total - viewH);

      // 返回鈕:左上角,回到 room
      var self = this;
      PLS.addButton({
        x: 30, y: 30, w: 84, h: 84,
        draw: function (ctx) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          A.rr(ctx, 30, 30, 84, 84, 26); ctx.fill();
          A.drawIcon(ctx, 'back', 72, 72, 1.1, '#9A7B5C');
        },
        onTap: function () { PLS.go('room', { pet: self.petId }); }
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
      } else if (phase === 'move') {
        if (!this._pdown) return;
        var dy = y - this._py;
        if (Math.abs(dy) > 6) this._drag = true;
        this.scroll = Math.max(0, Math.min(this.maxScroll, this._ps - dy));
      } else if (phase === 'up') {
        this._pdown = false;
        this._drag = false;
      }
    },

    draw: function (ctx) {
      // 背景
      ctx.fillStyle = '#FBF2E0';
      ctx.fillRect(0, 0, W, H);

      // ── 標題 ──
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '46px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText('收集圖鑑', W / 2, 72);
      ctx.fillStyle = '#C2851E';
      ctx.fillText('收集圖鑑', W / 2, 68);

      // ── 讀取寵物資料 ──
      var d = ST.load(this.petId);
      var dexFoods = (d.dex && Array.isArray(d.dex.foods)) ? d.dex.foods : [];
      var dexToys  = (d.dex && Array.isArray(d.dex.toys))  ? d.dex.toys  : [];
      var foodGot = 0, toyGot = 0;
      this._foods.forEach(function (k) { if (dexFoods.indexOf(k) >= 0) foodGot++; });
      this._toys.forEach(function  (k) { if (dexToys.indexOf(k)  >= 0) toyGot++;  });
      var allDone = foodGot === this._foods.length && toyGot === this._toys.length && this._foods.length > 0;

      // ── 進度 pill(+ 全部集滿時多一行金色 pill)──
      var progressText = '食物 ' + foodGot + '/' + this._foods.length +
                         '  ·  玩具 ' + toyGot + '/' + this._toys.length;
      if (allDone) {
        // 兩個 pill 上下疊:進度稍微上移,下方加金色慶祝 pill
        A.pill(ctx, W / 2, 116, progressText, '#B98A4F', 'rgba(255,255,255,0.94)', 20);
        A.pill(ctx, W / 2, 148, '全部集滿了!你是收集大師!', '#C2851E', 'rgba(255,244,200,0.97)', 22);
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
      drawGrid(ctx, this._foods, dexFoods, 'food',
        GRID_X, CONTENT_TOP + off.foodGrid, sc, clipTop, clipBot);

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
      drawGrid(ctx, this._toys, dexToys, 'toy',
        GRID_X, CONTENT_TOP + off.toyGrid, sc, clipTop, clipBot);

      ctx.restore();

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
