// store.js — 本機進度(localStorage,兩個小孩各自獨立存檔)
// ⚠ 改動儲存/匯出結構前,務必閱讀 docs/export-import-schema.md 與 CLAUDE.md 的相容規則。
(function () {
  const KEY = function (slot) { return 'pls.' + slot; };

  // v9:存檔改成「以小孩為單位」。slot = 左/右小孩(pls.kidL / pls.kidR);
  //     species = 這個小孩目前在養的物種(可從 8 種挑,大寶畢業後重選)。
  const SLOTS = ['kidL', 'kidR'];
  const SLOT_NAMES = { kidL: '左邊', kidR: '右邊' };
  // 舊版以物種為鍵(pls.rabbit / pls.hamster)→ 對應到左/右小孩,首次讀取時自動搬遷。
  const LEGACY_SLOT = { kidL: 'rabbit', kidR: 'hamster' };

  // 目前匯出檔的 schema 版本。動到結構就 +1,並更新 docs/export-import-schema.md。
  // v2:每筆寵物新增 points(可兌換積分)、hwEarned(手寫練習累計給分),daily 新增 hw(今日手寫輪數)。
  // v3:每筆寵物新增 hwRound(本輪已描完的字母清單;描滿 A–Z 大寫+a–z 小寫共 52 個才 +1 分)。
  // v4:電子雞化 — 新增 inv(背包:食物/玩具數量)、growth(成長值 xp)、care(今日餵食/陪玩計數)。
  // v5:新增 wish(寵物今日許願的食物;餵中成長值加倍)、dex(圖鑑:吃過的食物/玩過的玩具)。
  // v6:移除佈置/換擺設功能 — migration 把 home 各格的食物/玩具轉進 inv 背包(deluxe 算 2 份)後清空格子。
  //     GROW 加重:FEED_XP 4、PLAY_XP 6、DAILY_BONUS 2。
  // v7:神秘金色食物 — inv 新增 gold(金色食物數量,與 foods 同 key 空間);
  //     數學過關 1/10 機率整份獎勵變金色,餵金色食物成長值 ×2(與許願加倍可疊)。
  // v8:成長節奏 — growth 新增 deco(升大寶隨機抽的配件 index 0-4,固定到畢業);
  //     care 新增 xpToday(今日已累積成長值,跨日歸零);GROW 加 DAILY_XP_CAP(每日成長上限=平板時間煞車)。
  // v9:存檔改「以小孩為單位」— slot(kidL/kidR)取代物種當儲存鍵;新增 species(目前養的物種)、
  //     collection(已畢業大寶清單 [{species,deco,date}])、growth.grownAt(升大寶日期,滿 3 天可畢業)。
  //     畢業/換寵物只重置 species+growth+care+wish;points/dex/inv/levels/collection 留給小孩。
  //     英文玩具改「全物種共用一套」(config 的 toyU/toyArtU)。
  // v10:配件可收集 — 每小孩新增 decoDex({species:[5 bool]}),養大寶抽到哪款就解鎖那款;
  //     珍藏館可把已畢業大寶(及正在養的大寶)換成「已收集」的配件。每物種各 5 款(兔兔/倉倉也補到 5)。
  // v11:好友雲端同步 — 每小孩新增 childNickname(好友辨識用暱稱,獨立於寵物名字/種類,slot 不變則暱稱不變、
  //     不受換寵物/畢業影響)、giftsGiven(拜訪好友分享食物/玩具的次數小統計,不影響經驗值/點數)。
  const SCHEMA_VERSION = 11;
  const GRADUATE_DAYS = 3;   // 大寶停留幾天後可畢業入珍藏(測試版不限)

  // 一輪手寫 = 26 個大寫 + 26 個小寫 = 52 個字母,全描完才得 1 分。
  const HW_ROUND_TOTAL = 52;

  // ── 成長系統常數(v4)──
  // 階段門檻:xp < KID_AT = 幼幼;< GROWN_AT = 小寶;之後 = 大寶。
  // v8:DAILY_XP_CAP = 每日成長值上限(平板時間煞車)。100xp ÷ 15 ≈ 7 天,最快一週長大;測試模式不限。
  const GROW = { KID_AT: 30, GROWN_AT: 100, FEED_XP: 4, PLAY_XP: 6, DAILY_BONUS: 2, DAILY_XP_CAP: 15 };
  const STAGE_NAMES = { baby: '幼幼', kid: '小寶', grown: '大寶' };

  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function emptySlot() { return { key: null, deluxe: false, date: null }; }

  function blank(slot, species) {
    return {
      slot: slot || 'kidL',       // v9:儲存分割 = 小孩(kidL/kidR)
      species: species || null,   // v9:目前在養的物種(null = 尚未選,進 pickpet 挑一隻)
      pet: species || slot,       // 相容舊欄位:盡量放物種(舊讀者/舊匯出檔用)
      name: null,                 // null = 用預設名
      childNickname: null,        // v11:小朋友暱稱(好友辨識用身份錨點,獨立於寵物名字/種類,slot 不變就不變)
      giftsGiven: 0,               // v11:拜訪好友時分享食物/玩具的次數(小統計,不影響經驗值/點數)
      collection: [],             // v9:已畢業大寶 [{species, deco, date}](本小孩專屬,只增不減)
      levels: {},                 // levelId -> {attempts, bestRate, cleared, plays}
      points: 0,                  // 可兌換獎品的積分(本小孩獨立,畢業不歸零)
      hwEarned: 0,                // 字母手寫練習累計已給的積分(上限 100)
      hwRound: [],                // v3:本輪已描完的字母(描滿 52 個才 +1 分)
      daily: { date: today(), math: 0, english: 0, hw: 0 },
      inv: { foods: {}, toys: {}, gold: {} },  // v4:背包(key -> 數量);過關賺到、餵食/陪玩消耗。v7:gold=金色食物
      growth: { xp: 0, deco: null, grownAt: null },  // v4:成長值。v8:deco=大寶配件 index。v9:grownAt=升大寶日期
      decoDex: {},                // v10:配件圖鑑 {species:[5 bool]};養大寶抽到的款式會解鎖,珍藏館換裝只能用已解鎖的
      care: { date: today(), fed: 0, played: 0, xpToday: 0 },  // v4:今日照顧計數(跨日歸零)。v8:xpToday=今日已累積成長值
      wish: null,                    // v5:今日許願 {key, date, done};由 getWish() 產生
      dex: { foods: [], toys: [] },  // v5:圖鑑(吃過的食物 / 玩過的玩具 key 清單,畢業不歸零)
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
  function migratePet(p, slot, defaultSpecies) {
    if (!p || typeof p !== 'object') return blank(slot, defaultSpecies || null);
    var from = (typeof p._v === 'number') ? p._v : 0;   // 來源 schema 版本(無戳記視為 0=最舊)

    // ── 版本升級階梯:每次 SCHEMA_VERSION +1 就在這裡加一段 if (from < N) {...} ──
    // 目前的相容處理(對 from 0~1 都適用):缺欄位補預設、舊結構轉新結構。
    // ── v9:小孩存檔分割 ──
    // slot = 儲存鍵(kidL/kidR);species = 目前養的物種。
    // 舊資料的 p.pet 就是物種('rabbit'/'hamster'…),沿用它當 species。
    if (!p.slot) p.slot = slot || 'kidL';
    // 只有「沒有 species 欄位」的舊資料才推斷物種;v9 存檔的 species:null(畢業後待重選)要保留 null。
    if (!('species' in p) || p.species === undefined) {
      p.species = (p.pet && window.PLS_CONFIG && PLS_CONFIG.pets && PLS_CONFIG.pets[p.pet])
        ? p.pet : (defaultSpecies || null);
    }
    if (!Array.isArray(p.collection)) p.collection = [];   // v9:已畢業大寶清單
    if (!p.pet) p.pet = p.species || slot;
    if (!('name' in p)) p.name = null;
    // ── v11:好友雲端同步 ──
    if (!('childNickname' in p) || !p.childNickname) p.childNickname = null;
    if (typeof p.giftsGiven !== 'number') p.giftsGiven = 0;
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
    // ── v4:背包 / 成長 / 照顧 ──
    if (!p.inv || typeof p.inv !== 'object') p.inv = {};
    if (!p.inv.foods || typeof p.inv.foods !== 'object') p.inv.foods = {};
    if (!p.inv.toys || typeof p.inv.toys !== 'object') p.inv.toys = {};
    if (!p.inv.gold || typeof p.inv.gold !== 'object') p.inv.gold = {};   // v7:金色食物
    if (!p.growth || typeof p.growth !== 'object' || typeof p.growth.xp !== 'number') {
      // 老玩家補償:依既有過關次數換算成長值(每次過關 +2),封頂 99(小寶),
      // 讓玩很久的孩子升級後不會從幼幼重養。
      var totalClears = 0;
      Object.keys(p.levels).forEach(function (k) {
        var r = p.levels[k];
        if (r) totalClears += (r.clears != null ? r.clears : (r.cleared ? 1 : 0));
      });
      p.growth = { xp: Math.min(99, totalClears * 2) };
    }
    if (!p.care || typeof p.care !== 'object') p.care = { date: today(), fed: 0, played: 0, xpToday: 0 };
    if (typeof p.care.fed !== 'number') p.care.fed = 0;
    if (typeof p.care.played !== 'number') p.care.played = 0;
    if (typeof p.care.xpToday !== 'number') p.care.xpToday = 0;   // v8:今日已累積成長值
    // v8:大寶配件 index。舊的大寶資料沒有 → 給 0(第一款);還沒到大寶 → null
    if (typeof p.growth.deco !== 'number') p.growth.deco = (p.growth.xp >= GROW.GROWN_AT) ? 0 : null;
    // v9:升大寶日期。已是大寶但沒記日期的舊資料 → 用今天起算 3 天畢業(公平);還沒大寶 → null
    if (typeof p.growth.grownAt !== 'string') p.growth.grownAt = (p.growth.xp >= GROW.GROWN_AT) ? today() : null;
    // ── v10:配件圖鑑 ──
    if (!p.decoDex || typeof p.decoDex !== 'object') p.decoDex = {};
    // 相容/修正:目前的大寶 + 已畢業珍藏戴過的配件,一律算「已收集」(idempotent,每次載入補一次無妨)
    if (p.species && p.growth.xp >= GROW.GROWN_AT && typeof p.growth.deco === 'number') markDeco(p.decoDex, p.species, p.growth.deco);
    if (Array.isArray(p.collection)) p.collection.forEach(function (e) { if (e) markDeco(p.decoDex, e.species, e.deco); });
    // ── v5:許願 / 圖鑑 ──
    if (!('wish' in p) || (p.wish && (typeof p.wish !== 'object' || !p.wish.key))) p.wish = null;
    if (!p.dex || typeof p.dex !== 'object') p.dex = {};
    if (!Array.isArray(p.dex.foods)) p.dex.foods = [];
    if (!Array.isArray(p.dex.toys)) p.dex.toys = [];
    p.home = migrateHome(p.home);
    // ── v6:移除佈置功能 — 把家裡擺出的食物/玩具轉進背包(deluxe 算 2 份),格子清空 ──
    if (from < 6) {
      ['foods', 'toys'].forEach(function (kind) {
        (p.home[kind] || []).forEach(function (s) {
          if (s && s.key) {
            var box = kind === 'foods' ? p.inv.foods : p.inv.toys;
            box[s.key] = (box[s.key] || 0) + (s.deluxe ? 2 : 1);
            s.key = null; s.deluxe = false; s.date = null;
          }
        });
      });
    }

    p._v = SCHEMA_VERSION;   // 升級完成,標記為目前版本
    return p;
  }

  function load(slot) {
    slot = slot || 'kidL';
    try {
      var raw = localStorage.getItem(KEY(slot));
      // v9:新鍵不存在 → 試著搬遷舊的物種鍵(pls.rabbit → kidL、pls.hamster → kidR)
      if (!raw && LEGACY_SLOT[slot]) {
        var lraw = localStorage.getItem(KEY(LEGACY_SLOT[slot]));
        if (lraw) {
          var ld = migratePet(JSON.parse(lraw), slot, LEGACY_SLOT[slot]);
          save(ld);                       // 寫進新鍵(舊鍵保留不動,當備份)
          raw = localStorage.getItem(KEY(slot));
        }
      }
      if (!raw) return blank(slot, null);   // 全新小孩:尚未選寵物(species = null)
      const d = migratePet(JSON.parse(raw), slot, LEGACY_SLOT[slot] || null);
      if (d.daily.date !== today()) d.daily = { date: today(), math: 0, english: 0, hw: 0 };  // 跨日歸零
      if (d.care.date !== today()) d.care = { date: today(), fed: 0, played: 0, xpToday: 0 };   // v4:照顧計數跨日歸零(v8:含 xpToday)
      return d;
    } catch (e) { return blank(slot, null); }
  }

  function save(d) {
    try {
      d._v = SCHEMA_VERSION;   // 蓋上 schema 版本戳記,讓日後升級可判斷來源版本做 migrate
      d.pet = d.species || d.slot;   // 保持相容欄位同步
      localStorage.setItem(KEY(d.slot || 'kidL'), JSON.stringify(d));
    } catch (e) {}
    // v11:好友雲端同步(選用附加功能)— 每次存檔都標記「待上傳」,由 cloud.js 背景節流合併備份。
    // cloud.js 未載入/未設定/離線時 markDirty 不存在或安靜失敗,完全不影響本機存檔。
    if (window.PLS_CLOUD && PLS_CLOUD.markDirty) PLS_CLOUD.markDirty(d.slot || 'kidL');
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

  // ════════════════════════════════════════════════════
  // v4 電子雞化:背包(inv)+ 成長(growth)+ 照顧(care)
  // ════════════════════════════════════════════════════

  // xp → 成長階段
  function stageOf(xp) { return xp >= GROW.GROWN_AT ? 'grown' : xp >= GROW.KID_AT ? 'kid' : 'baby'; }

  // ── v10:配件圖鑑(每物種 5 款,養大寶抽到才解鎖)──
  const DECO_N = 5;   // 每物種配件款數(8 隻都是 5)
  function markDeco(dex, sp, idx) {          // 在圖鑑上把某物種的某款配件標記為已收集
    if (!dex || sp == null || typeof idx !== 'number' || idx < 0 || idx >= DECO_N) return;
    if (!Array.isArray(dex[sp])) { dex[sp] = []; for (var i = 0; i < DECO_N; i++) dex[sp][i] = false; }
    dex[sp][idx] = true;
  }
  function ownsDeco(d, sp, idx) { var a = d && d.decoDex && d.decoDex[sp]; return !!(Array.isArray(a) && a[idx]); }
  // 回某物種已收集的配件 index 清單(如 [0,2,4])
  function decoOwned(d, sp) {
    var a = d && d.decoDex && d.decoDex[sp], out = [];
    if (Array.isArray(a)) for (var i = 0; i < DECO_N; i++) if (a[i]) out.push(i);
    return out;
  }
  // 換「已畢業珍藏大寶」的配件(index=collection 索引);只能換成已收集的。回成功與否。
  function setCollectionDeco(slot, index, decoIdx) {
    var d = load(slot);
    if (!Array.isArray(d.collection) || !d.collection[index]) return false;
    if (!ownsDeco(d, d.collection[index].species, decoIdx)) return false;
    d.collection[index].deco = decoIdx; save(d); return true;
  }
  // 換「正在養的大寶」的配件;只能換成已收集的、且必須已是大寶。回成功與否。
  function setCurrentDeco(slot, decoIdx) {
    var d = load(slot);
    if (!d.species || stageOf(d.growth.xp) !== 'grown') return false;
    if (!ownsDeco(d, d.species, decoIdx)) return false;
    d.growth.deco = decoIdx; save(d); return true;
  }

  // 成長總覽:{ xp, stage, stageZh, next(下一階門檻,大寶為 null), progress(本階段進度 0~1) }
  function growthInfo(d) {
    var xp = (d.growth && typeof d.growth.xp === 'number') ? d.growth.xp : 0;
    var stage = stageOf(xp);
    var lo = stage === 'baby' ? 0 : stage === 'kid' ? GROW.KID_AT : GROW.GROWN_AT;
    var next = stage === 'baby' ? GROW.KID_AT : stage === 'kid' ? GROW.GROWN_AT : null;
    return {
      xp: xp, stage: stage, stageZh: STAGE_NAMES[stage], next: next,
      deco: (d.growth && typeof d.growth.deco === 'number') ? d.growth.deco : 0,  // v8:大寶配件 index
      progress: next ? Math.min(1, (xp - lo) / (next - lo)) : 1
    };
  }

  // ── v9:成長生命週期(選寵物 → 養大 → 大寶滿 3 天畢業入珍藏 → 重選)──
  // today() 格式 'Y-M-D'(月/日不補零),用 UTC 換算避開時區問題。
  function dateNum(s) { var p = (s || '').split('-'); return p.length === 3 ? Date.UTC(+p[0], +p[1] - 1, +p[2]) : NaN; }
  function daysSince(s) { var n = dateNum(s); return isNaN(n) ? 0 : Math.floor((dateNum(today()) - n) / 86400000); }

  function speciesOf(slot) { return load(slot).species; }

  // 這個小孩選了(或畢業後重選)一隻物種,從幼幼開始養。
  // 只重置寵物本身:species / growth / care / wish;points / dex / inv / levels / collection 全部保留給小孩。
  function chooseSpecies(slot, species) {
    var d = load(slot);
    d.species = species || null;
    d.name = null;                 // 用新物種的預設名
    d.growth = { xp: 0, deco: null, grownAt: null };
    d.care = { date: today(), fed: 0, played: 0, xpToday: 0 };
    d.wish = null;
    save(d);
    return d;
  }

  // 大寶滿 GRADUATE_DAYS 天才能畢業(測試版即可)。回 { can, grown, daysLeft }。
  function graduateInfo(d) {
    var grown = !!(d.growth && stageOf(d.growth.xp) === 'grown');
    if (!grown) return { can: false, grown: false, daysLeft: 0 };
    if (isTest()) return { can: true, grown: true, daysLeft: 0 };
    var since = d.growth.grownAt ? daysSince(d.growth.grownAt) : 0;
    var left = Math.max(0, GRADUATE_DAYS - since);
    return { can: left <= 0, grown: true, daysLeft: left };
  }
  function canGraduate(d) { return graduateInfo(d).can; }

  // 畢業:把「大寶的樣子 + 抽到的配件 + 日期」永久收進本小孩的 collection,寵物 slot 重置成需重選。
  // 回 collection entry(成功)或 null(還不能畢業)。
  function graduate(slot) {
    var d = load(slot);
    if (!canGraduate(d)) return null;
    var entry = {
      species: d.species,
      deco: (d.growth && typeof d.growth.deco === 'number') ? d.growth.deco : 0,
      name: d.name || (window.PLS_CONFIG && PLS_CONFIG.pets[d.species] && PLS_CONFIG.pets[d.species].name) || null,
      date: today()
    };
    if (!Array.isArray(d.collection)) d.collection = [];
    d.collection.push(entry);
    markDeco(d.decoDex || (d.decoDex = {}), entry.species, entry.deco);  // v10:確保畢業戴的配件已收集
    d.species = null;              // 需要重新選一隻
    d.growth = { xp: 0, deco: null, grownAt: null };
    d.care = { date: today(), fed: 0, played: 0, xpToday: 0 };
    d.wish = null;
    save(d);
    return entry;
  }

  function collectionOf(slot) { var c = load(slot).collection; return Array.isArray(c) ? c : []; }

  // 背包清單(依 key 排序,回 [{key, n}];n > 0 才列)
  function invList(d, kind) {
    var bag = (d.inv && d.inv[kind]) || {};
    return Object.keys(bag).sort().filter(function (k) { return bag[k] > 0; })
      .map(function (k) { return { key: k, n: bag[k] }; });
  }
  function invTotal(d, kind) {
    return invList(d, kind).reduce(function (s, it) { return s + it.n; }, 0);
  }

  // 過關收穫:食物(陣列,可重複 key)/ 玩具(單一 key × n 個)進背包
  // v7:gold=true 時整份收進金色食物庫存(inv.gold)
  function addFoods(d, keys, gold) {
    if (!d.inv) d.inv = { foods: {}, toys: {}, gold: {} };
    if (gold && (!d.inv.gold || typeof d.inv.gold !== 'object')) d.inv.gold = {};
    var box = gold ? d.inv.gold : d.inv.foods;
    (keys || []).forEach(function (k) { if (k) box[k] = (box[k] || 0) + 1; });
    save(d);
  }
  function addToy(d, key, n) {
    if (!d.inv) d.inv = { foods: {}, toys: {} };
    if (key) d.inv.toys[key] = (d.inv.toys[key] || 0) + Math.max(1, n | 0);
    save(d);
  }

  // 加成長值(內部):回 { gain, capped, xp, stage, grew(有沒有升階), stageZh, deco }
  // v8:每日成長上限(平板時間煞車)。超過上限的部分不再加 xp(但呼叫端動畫/圖鑑/積分照常);測試模式不限。
  function gainXp(d, base, firstToday) {
    var before = stageOf(d.growth.xp);
    var want = base + (firstToday ? GROW.DAILY_BONUS : 0);
    var gain = want;
    if (!isTest()) {
      if (typeof d.care.xpToday !== 'number') d.care.xpToday = 0;
      var room = Math.max(0, GROW.DAILY_XP_CAP - d.care.xpToday);
      gain = Math.min(want, room);
      d.care.xpToday += gain;
    }
    d.growth.xp += gain;
    var after = stageOf(d.growth.xp);
    var grew = after !== before;
    // v8:第一次升上大寶 → 隨機抽一款配件(0-4)存住,固定戴到畢業
    // v10:抽到的那款同時在配件圖鑑上解鎖(之後珍藏館可換成已解鎖的)
    if (grew && after === 'grown' && d.growth.deco == null) {
      d.growth.deco = Math.floor(Math.random() * DECO_N);
      markDeco(d.decoDex || (d.decoDex = {}), d.species, d.growth.deco);
    }
    // v9:第一次升上大寶 → 記日期,開始 3 天畢業倒數
    if (grew && after === 'grown' && !d.growth.grownAt) d.growth.grownAt = today();
    return { gain: gain, capped: gain < want, xp: d.growth.xp, stage: after, stageZh: STAGE_NAMES[after], grew: grew, deco: d.growth.deco };
  }

  // 餵食:消耗 1 個食物,成長值 +2(當天第一次多 +1);餵中今日許願的食物 → 基礎值加倍。
  // v7:gold=true 消耗金色食物(inv.gold),基礎成長值再 ×2(與許願加倍可疊)。
  // 沒有該食物回 null;成功回 gainXp 的結果(含 grew 供升階慶祝、wishGranted 供許願慶祝)。
  function feed(d, key, gold) {
    var box = gold ? (d.inv && d.inv.gold) : (d.inv && d.inv.foods);
    if (!box || !(box[key] > 0)) return null;
    box[key]--;
    if (box[key] <= 0) delete box[key];
    d.care.fed++;
    // v5:許願命中 → 基礎成長值 ×2,並把願望標記完成(金色也算,加倍可疊)
    var wishGranted = !!(d.wish && d.wish.date === today() && !d.wish.done && d.wish.key === key);
    if (wishGranted) d.wish.done = true;
    var res = gainXp(d, GROW.FEED_XP * (wishGranted ? 2 : 1) * (gold ? 2 : 1), d.care.fed === 1);
    res.wishGranted = wishGranted;
    res.gold = !!gold;
    if (d.dex.foods.indexOf(key) < 0) d.dex.foods.push(key);   // v5:圖鑑點亮
    save(d);
    return res;
  }

  // 陪玩:消耗 1 個玩具,成長值 +3(當天第一次多 +1)。
  function playToy(d, key) {
    if (!d.inv || !d.inv.toys || !(d.inv.toys[key] > 0)) return null;
    d.inv.toys[key]--;
    if (d.inv.toys[key] <= 0) delete d.inv.toys[key];
    d.care.played++;
    var res = gainXp(d, GROW.PLAY_XP, d.care.played === 1);
    if (d.dex.toys.indexOf(key) < 0) d.dex.toys.push(key);     // v5:圖鑑點亮
    save(d);
    return res;
  }

  // 額外成長值(吃出幸運星等驚喜):回 gainXp 結果(可能觸發升階)。
  function bonusXp(d, n) {
    var res = gainXp(d, Math.max(1, n | 0), false);
    save(d);
    return res;
  }

  // ── v5:寵物許願(每天一個想吃的食物;餵中成長值加倍)──
  // 池子 = 前三關 + 已解過的數學關卡的 feast 食物(確保拿得到)。
  // 回 { key, date, done, levelName }(levelName = 可以賺到這個食物的關卡,給小朋友提示)。
  function wishPool(d) {
    var pool = {};
    var math = (window.PLS_CONFIG && window.PLS_CONFIG.math) || [];
    math.forEach(function (lv, i) {
      if (!lv.feast || !lv.feast.items) return;
      var r = d.levels[lv.id];
      var reachable = i < 3 || (r && (r.clears || r.cleared));
      if (!reachable) return;
      lv.feast.items.forEach(function (k) { if (!pool[k]) pool[k] = lv; });
    });
    return pool;
  }
  function getWish(d) {
    if (!d.wish || d.wish.date !== today()) {
      var pool = wishPool(d);
      var keys = Object.keys(pool);
      if (!keys.length) return null;
      var key = keys[Math.floor(Math.random() * keys.length)];
      d.wish = { key: key, date: today(), done: false };
      save(d);
    }
    var pool2 = wishPool(d);
    var lv2 = pool2[d.wish.key];
    return {
      key: d.wish.key, date: d.wish.date, done: !!d.wish.done,
      levelName: lv2 ? (lv2.name + '(' + lv2.sub + ')') : null
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
      kidL: load('kidL'), kidR: load('kidR'),
      prizes: getPrizes(), rewardsHidden: rewardsHidden()      // v2:獎品目錄與隱藏設定(全域)
    }, null, 2);
  }
  // 向後相容:任何舊版(含沒有 version 欄位)的備份檔都先經 migratePet 正規化再存。
  // v9:新檔用 kidL/kidR;舊檔用 rabbit/hamster → 對應到 左/右 小孩(兔兔→左、倉倉→右)。
  // 較新版本(version > SCHEMA_VERSION)則盡力匯入已知欄位,不直接拒絕。
  function importAll(json) {
    const d = JSON.parse(json);
    if (!d || d.app !== 'pls') throw new Error('不是寵物小學堂的備份檔');
    if (d.kidL) save(migratePet(d.kidL, 'kidL', 'rabbit'));
    else if (d.rabbit) save(migratePet(d.rabbit, 'kidL', 'rabbit'));       // 舊檔:兔兔 → 左小孩
    if (d.kidR) save(migratePet(d.kidR, 'kidR', 'hamster'));
    else if (d.hamster) save(migratePet(d.hamster, 'kidR', 'hamster'));    // 舊檔:倉倉 → 右小孩
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
    SLOTS: SLOTS, SLOT_NAMES: SLOT_NAMES,
    // v9:小孩存檔 / 成長生命週期
    speciesOf: speciesOf, chooseSpecies: chooseSpecies,
    graduate: graduate, canGraduate: canGraduate, graduateInfo: graduateInfo, collectionOf: collectionOf,
    // v10:配件圖鑑 / 換裝
    DECO_N: DECO_N, decoOwned: decoOwned, ownsDeco: ownsDeco,
    setCollectionDeco: setCollectionDeco, setCurrentDeco: setCurrentDeco,
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
    rewardsHidden: rewardsHidden, setRewardsHidden: setRewardsHidden,
    // v4:背包 / 成長 / 照顧
    stageOf: stageOf, growthInfo: growthInfo,
    invList: invList, invTotal: invTotal,
    addFoods: addFoods, addToy: addToy, feed: feed, playToy: playToy,
    // v5:驚喜加成 / 許願
    bonusXp: bonusXp, getWish: getWish
  };
})();
