// store.js — 本機進度(localStorage,雙寵物各自獨立)
(function () {
  const KEY = function (pet) { return 'pls.' + pet; };

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
      daily: { date: today(), math: 0, english: 0 },
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

  function load(petId) {
    try {
      const raw = localStorage.getItem(KEY(petId));
      if (!raw) return blank(petId);
      const d = JSON.parse(raw);
      if (!d.daily || d.daily.date !== today()) d.daily = { date: today(), math: 0, english: 0 };
      if (!d.levels) d.levels = {};
      d.home = migrateHome(d.home);
      return d;
    } catch (e) { return blank(petId); }
  }

  function save(d) {
    try { localStorage.setItem(KEY(d.pet), JSON.stringify(d)); } catch (e) {}
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
    let feast = false, deluxe = false;
    if (!practice) {
      d.daily[subject] = (d.daily[subject] || 0) + 1;
      if (rate >= window.PLS_CONFIG.passRate) {
        rec.cleared = true;
        rec.clears = (rec.clears || 0) + 1;
        if (!isTest()) rec.lastClearDate = today();   // 測試版不鎖每日
        feast = true;
        deluxe = rec.clears >= deluxeAt();             // 滿 10 次起,送豪華版
      }
    }
    d.levels[levelId] = rec;
    save(d);
    return { rate: rate, feast: feast, deluxe: deluxe, clears: rec.clears };
  }

  // 匯出 / 匯入(家長區)
  function exportAll() {
    return JSON.stringify({
      app: 'pls', version: 1, exportedAt: new Date().toISOString(),
      rabbit: load('rabbit'), hamster: load('hamster')
    }, null, 2);
  }
  function importAll(json) {
    const d = JSON.parse(json);
    if (d.app !== 'pls') throw new Error('不是寵物小學堂的備份檔');
    if (d.rabbit) save(d.rabbit);
    if (d.hamster) save(d.hamster);
  }

  // 申請持久化,降低被 Safari 清除的風險
  if (navigator.storage && navigator.storage.persist) {
    try { navigator.storage.persist(); } catch (e) {}
  }

  window.PLS_STORE = {
    load: load, save: save, levelState: levelState,
    remainToday: remainToday, recordRun: recordRun,
    exportAll: exportAll, importAll: importAll, today: today,
    isTest: isTest, setTest: setTest,
    canSwitchHome: canSwitchHome, setHomeItem: setHomeItem,
    clearCount: clearCount, clearedToday: clearedToday, deluxeAt: deluxeAt,
    getDailyLimit: getDailyLimit, setDailyLimit: setDailyLimit
  };
})();
