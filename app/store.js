// store.js — 本機進度(localStorage,雙寵物各自獨立)
// ⚠ 改動儲存/匯出結構前,務必閱讀 docs/export-import-schema.md 與 CLAUDE.md 的相容規則。
(function () {
  const KEY = function (pet) { return 'pls.' + pet; };

  // 目前匯出檔的 schema 版本。動到結構就 +1,並更新 docs/export-import-schema.md。
  // v2:每筆寵物新增 points(可兌換積分)、hwEarned(手寫練習累計給分),daily 新增 hw(今日手寫輪數)。
  // v3:每筆寵物新增 hwRound(本輪已描完的字母清單;描滿 A–Z 大寫+a–z 小寫共 52 個才 +1 分)。
  const SCHEMA_VERSION = 3;

  // 一輪手寫 = 26 個大寫 + 26 個小寫 = 52 個字母,全描完才得 1 分。
  const HW_ROUND_TOTAL = 52;

  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function emptySlot() { return { key: null, deluxe: false, date: null }; }

  function blank(petId) {
    return {
      pet: petId,
      name: null,                 // null = 用預設名
      levels: {},                 // levelId -> {attempts, bestRate, cleared, plays}
      points: 0,                  // 可兌換獎品的積分(本寵物獨立)
      hwEarned: 0,                // 字母手寫練習累計已給的積分(上限 100)
      hwRound: [],                // v3:本輪已描完的字母(描滿 52 個才 +1 分)
      daily: { date: today(), math: 0, english: 0, hw: 0 },
      home: {                     // 家裡展示:3 食物格 + 3 玩具格(各格每天可換一次)
        foods: [emptySlot(), emptySlot(), emptySlot()],
        toys:  [emptySlot(), emptySlot(), emptySlot()]
      }
    };
  }

  // 把 home 結構統一成新版 {foods[3], toys[3]};相容所有舊版格式
  function migrateHome(h) {
    if (!h || typeof h !== 'object') {
      return { foods: [emptySlot(), emptySlot(), emptySlot()], toys: [emptySlot(), emptySlot(), emptySlot()] };
    }
    // 最舊格式: { item, type, date }
    if ('item' in h && !('food' in h) && !('foods' in h)) {
      var out0 = { foods: [emptySlot(), emptySlot(), emptySlot()], toys: [emptySlot(), emptySlot(), emptySlot()] };
      out0[h.type === 'toy' ? 'toys' : 'foods'][0] = { key: h.item || null, deluxe: false, date: h.date || null };
      return out0;
    }
    // 舊格式: { food:{...}, toy:{...} }
    if (('food' in h || 'toy' in h) && !('foods' in h) && !('toys' in h)) {
      var out1 = { foods: [emptySlot(), emptySlot(), emptySlot()], toys: [emptySlot(), emptySlot(), emptySlot()] };
      if (h.food && h.food.key) out1.foods[0] = { key: h.food.key, deluxe: !!h.food.deluxe, date: h.food.date || null };
      if (h.toy  && h.toy.key)  out1.toys[0]  = { key: h.toy.key,  deluxe: !!h.toy.deluxe,  date: h.toy.date  || null };
      return out1;
    }
    // 新格式:確保 3 格
    if (!Array.isArray(h.foods)) h.foods = [emptySlot(), emptySlot(), emptySlot()];
    if (!Array.isArray(h.toys))  h.toys  = [emptySlot(), emptySlot(), emptySlot()];
    while (h.foods.length < 3) h.foods.push(emptySlot());
    while (h.toys.length  < 3) h.toys.push(emptySlot());
    h.foods = h.foods.map(function (s) { return (s && s.key !== undefined) ? s : emptySlot(); });
    h.toys  = h.toys.map(function  (s) { return (s && s.key !== undefined) ? s : emptySlot(); });
    return h;
  }

  // ── 測試版 / 正式版(全域,非分寵物)──
  // 測試版:解除關卡鎖定與每日限制,方便檢查內容
  function isTest() {
    try { return localStorage.getItem('pls.testMode') === '1'; } catch (e) { return false; }
  }
  function setTest(on) {
    try { localStorage.setItem('pls.testMode', on ? '1' : '0'); } catch (e) {}
  }

  // 把單一寵物資料正規化/升級到目前結構;向後相容所有舊版(localStorage 或匯出檔)。
  // 規則:缺的欄位補安全預設值,絕不因缺欄位而丟掉既有進度。
  function migratePet(p, petId) {
    if (!p || typeof p !== 'object') return blank(petId);
    var from = (typeof p._v === 'number') ? p._v : 0;   // 來源 schema 版本(無戳記視為 0=最舊)

    // ── 版本升級階梯:每次 SCHEMA_VERSION +1 就在這裡加一段 if (from < N) {...} ──
    // 目前的相容處理(對 from 0~1 都適用):缺欄位補預設、舊結構轉新結構。
    if (!p.pet) p.pet = petId;
    if (!('name' in p)) p.name = null;
    if (!p.levels || typeof p.levels !== 'object') p.levels = {};
    // 舊資料補 clears 欄位(由 cleared 推回)
    Object.keys(p.levels).forEach(function (k) {
      var r = p.levels[k];
      if (r && r.clears == null) r.clears = r.cleared ? 1 : 0;
    });
    if (!p.daily || typeof p.daily !== 'object') p.daily = { date: today(), math: 0, english: 0, hw: 0 };
    if (typeof p.daily.hw !== 'number') p.daily.hw = 0;          // v2:今日手寫輪數
    if (typeof p.points !== 'number') p.points = 0;             // v2:可兌換積分
    if (typeof p.hwEarned !== 'number') p.hwEarned = 0;         // v2:手寫練習累計給分
    if (!Array.isArray(p.hwRound)) p.hwRound = [];             // v3:本輪已描完的字母
    p.home = migrateHome(p.home);

    p._v = SCHEMA_VERSION;   // 升級完成,標記為目前版本
    return p;
  }

  function load(petId) {
    try {
      const raw = localStorage.getItem(KEY(petId));
      if (!raw) return blank(petId);
      const d = migratePet(JSON.parse(raw), petId);
      if (d.daily.date !== today()) d.daily = { date: today(), math: 0, english: 0, hw: 0 };  // 跨日歸零
      return d;
    } catch (e) { return blank(petId); }
  }

  function save(d) {
    try {
      d._v = SCHEMA_VERSION;   // 蓋上 schema 版本戳記,讓日後升級可判斷來源版本做 migrate
      localStorage.setItem(KEY(d.pet), JSON.stringify(d));
    } catch (e) {}
  }

  // 關卡狀態:'cleared' | 'open' | 'locked'
  // 規則:第一關永遠開;之後「上一關 cleared(≥90%)」才開;config locked:true 一律鎖
  function levelState(d, list, idx) {
    const lv = list[idx];
    const rec = d.levels[lv.id];
    // 測試版:一律解鎖(已通關仍顯示金框)
    if (isTest()) return (rec && rec.cleared) ? 'cleared' : 'open';
    if (lv.locked || lv.soon) return 'locked';
    if (rec && rec.cleared) return 'cleared';
    if (lv.alwaysOpen) return 'open';
    if (idx === 0) return 'open';
    const prev = d.levels[list[idx - 1].id];
    return (prev && prev.cleared) ? 'open' : 'locked';
  }

  // ── 每日關卡上限(家長可在家長區調整,存在 localStorage)──
  function getDailyLimit() {
    try {
      const v = parseInt(localStorage.getItem('pls.dailyLimit'), 10);
      return isNaN(v) || v < 1 ? (window.PLS_CONFIG.dailyLimit || 10) : v;
    } catch (e) { return window.PLS_CONFIG.dailyLimit || 10; }
  }
  function setDailyLimit(n) {
    try { localStorage.setItem('pls.dailyLimit', String(n)); } catch (e) {}
  }

  function remainToday(d, subject) {
    if (isTest()) return 99;
    return Math.max(0, getDailyLimit() - (d.daily[subject] || 0));
  }

  // ── 家裡展示寶物(食物 / 玩具 各自每天只能換一次，各格獨立)──
  // slot: 'food' | 'toy', idx: 0‥2
  function canSwitchHome(d, slot, idx) {
    if (isTest()) return true;
    idx = idx || 0;
    var arr = slot === 'food' ? (d.home && d.home.foods) : (d.home && d.home.toys);
    var s = arr && arr[idx];
    return !s || s.date !== today();
  }
  function setHomeItem(d, slot, idx, key, deluxe) {
    d.home = migrateHome(d.home);
    var arr = slot === 'food' ? d.home.foods : d.home.toys;
    arr[idx] = { key: key, deluxe: !!deluxe, date: isTest() ? (arr[idx] && arr[idx].date) : today() };
    save(d);
  }

  // 每關解完幾次(過 90%):相容沒有 clears 欄位的舊資料
  function clearCount(d, levelId) {
    const r = d.levels[levelId];
    if (!r) return 0;
    return r.clears != null ? r.clears : (r.cleared ? 1 : 0);
  }
  // 這一關今天是否已經「正式」解過(每關一天只能解一次,當天再玩算練習)
  function clearedToday(d, levelId) {
    if (isTest()) return false;
    const r = d.levels[levelId];
    return !!(r && r.lastClearDate === today());
  }
  function deluxeAt() { return window.PLS_CONFIG.deluxeAt || 10; }

  // 記錄一次完整關卡結果
  function recordRun(d, subject, levelId, firstTryCorrect, total, practice) {
    const rate = firstTryCorrect / total;
    const rec = d.levels[levelId] || { attempts: 0, bestRate: 0, cleared: false, plays: 0, clears: 0, lastClearDate: null };
    if (rec.clears == null) rec.clears = rec.cleared ? 1 : 0;   // 舊資料補欄位
    rec.plays++;
    rec.attempts += total;
    if (rate > rec.bestRate) rec.bestRate = rate;
    let feast = false, deluxe = false, point = 0;
    if (!practice) {
      d.daily[subject] = (d.daily[subject] || 0) + 1;
      if (rate >= window.PLS_CONFIG.passRate) {
        rec.cleared = true;
        rec.clears = (rec.clears || 0) + 1;
        if (!isTest()) rec.lastClearDate = today();   // 測試版不鎖每日
        feast = true;
        deluxe = rec.clears >= deluxeAt();             // 滿 10 次起,送豪華版
        // 過關積分:同一關第 1~10 次過關各 +1 分,第 11 次起不再加分
        if (rec.clears <= 10) { d.points = (d.points || 0) + 1; point = 1; }
      }
    }
    d.levels[levelId] = rec;
    save(d);
    return { rate: rate, feast: feast, deluxe: deluxe, clears: rec.clears, point: point };
  }

  // ── 積分(過關 / 手寫練習累積,可兌換獎品;本寵物獨立)──
  function getPoints(d) { return (d && typeof d.points === 'number') ? d.points : 0; }

  // 字母手寫練習給分:每天最多 3 輪、累計上限 100 分(測試版不受限,方便預覽)。
  // 回 { awarded, capped, dailyLeft, earned }。
  function awardHandwriting(d) {
    if (typeof d.points !== 'number') d.points = 0;
    if (typeof d.hwEarned !== 'number') d.hwEarned = 0;
    if (typeof d.daily.hw !== 'number') d.daily.hw = 0;
    var capped = d.hwEarned >= 100;
    if (!isTest() && (capped || d.daily.hw >= 3)) {
      return { awarded: false, capped: capped, dailyLeft: Math.max(0, 3 - d.daily.hw), earned: d.hwEarned };
    }
    d.daily.hw += 1;
    d.hwEarned += 1;
    d.points += 1;
    save(d);
    return { awarded: true, capped: d.hwEarned >= 100, dailyLeft: isTest() ? 3 : Math.max(0, 3 - d.daily.hw), earned: d.hwEarned };
  }
  function hwDailyLeft(d) {
    if (isTest()) return 3;
    if (!d.daily || typeof d.daily.hw !== 'number') return 3;
    return Math.max(0, 3 - d.daily.hw);
  }

  // 本輪手寫進度:回 { count, total, letters }(letters 為已描完字母,含大小寫各自獨立)。
  function hwRoundProgress(d) {
    var arr = Array.isArray(d.hwRound) ? d.hwRound : [];
    return { count: arr.length, total: HW_ROUND_TOTAL, letters: arr.slice() };
  }

  // 描完一個字母:記進本輪。描滿一輪(52 個)才呼叫 awardHandwriting 給 1 分並重置本輪。
  // 回 { complete, count, total, awarded, capped, dailyLeft }。
  function submitHwLetter(d, ch) {
    if (!Array.isArray(d.hwRound)) d.hwRound = [];
    if (ch && d.hwRound.indexOf(ch) < 0) d.hwRound.push(ch);
    if (d.hwRound.length >= HW_ROUND_TOTAL) {
      var res = awardHandwriting(d);     // 套用每天 3 輪 / 累計上限 100 規則(內含 save)
      d.hwRound = [];                    // 不論有沒有拿到分,完成一輪就開始新的一輪
      save(d);
      res.complete = true;
      res.count = HW_ROUND_TOTAL;
      res.total = HW_ROUND_TOTAL;
      return res;
    }
    save(d);
    return {
      complete: false, count: d.hwRound.length, total: HW_ROUND_TOTAL,
      awarded: false, capped: d.hwEarned >= 100, dailyLeft: hwDailyLeft(d)
    };
  }

  // ── 獎品目錄(全域,所有寵物共用;只存名稱與所需點數)──
  function getPrizes() {
    try {
      var arr = JSON.parse(localStorage.getItem('pls.prizes') || '[]');
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (p) { return p && p.name; }).map(function (p) {
        return {
          id: p.id || ('z' + Math.random().toString(36).slice(2, 9)),
          name: String(p.name).slice(0, 24),
          cost: Math.max(1, parseInt(p.cost, 10) || 1)
        };
      });
    } catch (e) { return []; }
  }
  function setPrizes(arr) {
    try { localStorage.setItem('pls.prizes', JSON.stringify(Array.isArray(arr) ? arr : [])); } catch (e) {}
  }

  // 兌換獎品:扣本寵物積分,成功回 true(點數不足回 false)。
  function redeem(d, cost) {
    cost = Math.max(0, parseInt(cost, 10) || 0);
    if ((d.points || 0) < cost) return false;
    d.points = (d.points || 0) - cost;
    save(d);
    return true;
  }

  // ── 隱藏整個積分 / 獎品功能(全域開關,家長區可切換)──
  function rewardsHidden() {
    try { return localStorage.getItem('pls.rewardsHidden') === '1'; } catch (e) { return false; }
  }
  function setRewardsHidden(on) {
    try { localStorage.setItem('pls.rewardsHidden', on ? '1' : '0'); } catch (e) {}
  }

  // 匯出 / 匯入(家長區)— schema 細節見 docs/export-import-schema.md
  function exportAll() {
    return JSON.stringify({
      app: 'pls', version: SCHEMA_VERSION, exportedAt: new Date().toISOString(),
      rabbit: load('rabbit'), hamster: load('hamster'),
      prizes: getPrizes(), rewardsHidden: rewardsHidden()      // v2:獎品目錄與隱藏設定(全域)
    }, null, 2);
  }
  // 向後相容:任何舊版(含沒有 version 欄位)的備份檔都先經 migratePet 正規化再存。
  // 較新版本(version > SCHEMA_VERSION)則盡力匯入已知欄位,不直接拒絕。
  function importAll(json) {
    const d = JSON.parse(json);
    if (!d || d.app !== 'pls') throw new Error('不是寵物小學堂的備份檔');
    if (d.rabbit)  save(migratePet(d.rabbit, 'rabbit'));
    if (d.hamster) save(migratePet(d.hamster, 'hamster'));
    if (Array.isArray(d.prizes)) setPrizes(d.prizes);                       // 舊檔沒有就略過
    if (typeof d.rewardsHidden === 'boolean') setRewardsHidden(d.rewardsHidden);
  }

  // 申請「持久化儲存」:讓瀏覽器永遠記住資料、不要自動清掉(家長把它當 iPad App 用)。
  // 加到主畫面的 PWA 通常會自動獲得持久化;這裡再主動申請一次當保險。
  if (navigator.storage && navigator.storage.persist) {
    try {
      navigator.storage.persisted().then(function (already) {
        if (!already) navigator.storage.persist();   // 尚未持久化才申請,避免重複
      }).catch(function () { navigator.storage.persist(); });
    } catch (e) {}
  }

  window.PLS_STORE = {
    load: load, save: save, levelState: levelState,
    remainToday: remainToday, recordRun: recordRun,
    exportAll: exportAll, importAll: importAll, today: today,
    isTest: isTest, setTest: setTest,
    canSwitchHome: canSwitchHome, setHomeItem: setHomeItem,
    clearCount: clearCount, clearedToday: clearedToday, deluxeAt: deluxeAt,
    getDailyLimit: getDailyLimit, setDailyLimit: setDailyLimit,
    getPoints: getPoints, awardHandwriting: awardHandwriting, hwDailyLeft: hwDailyLeft,
    hwRoundProgress: hwRoundProgress, submitHwLetter: submitHwLetter,
    getPrizes: getPrizes, setPrizes: setPrizes, redeem: redeem,
    rewardsHidden: rewardsHidden, setRewardsHidden: setRewardsHidden
  };
})();
