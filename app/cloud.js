// cloud.js — 好友雲端同步 / 自動備份(選用):Firebase Firestore + 匿名登入
// ⚠ 純附加功能,完全 fail-soft:未設定 CFG.firebase 或離線時,所有方法安靜地不做事/回傳失敗物件,
//   絕不丟例外、絕不影響本機遊戲(數學/英文/手寫/積分/家長區永遠只靠 store.js 的 localStorage)。
// v11:身份錨點是「小孩存檔 slot(kidL/kidR)」,不是物種——物種(species)是小孩底下會換的屬性
//   (畢業重選寵物時 species 會變,但 slot、childNickname、好友代碼/還原碼都不變)。
// 詳細資料模型與權限見 docs/cloud-friends-schema.md、firestore.rules。
(function () {
  const CFG = window.PLS_CONFIG;
  const ST = window.PLS_STORE;

  const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // 排除易混淆字元 0/O/1/I/L
  const FRIEND_CODE_LEN = 6;
  const RESTORE_CODE_LEN = 10;
  const FLUSH_INTERVAL_MS = 90000;      // 定時自動備份週期
  const PUSH_THROTTLE_MS = 15000;       // pushStatus 節流(例如打開好友面板前呼叫)
  const LOCAL_PREFIX = 'pls.cloud.';

  const configured = !!(CFG && CFG.firebase && CFG.firebase.apiKey);

  var db = null, auth = null, uid = null;
  var readyPromise = null;
  var flushTimer = null;
  var dirty = {};       // slot -> true(尚未上傳的變更)
  var lastPush = {};    // slot -> timestamp(節流用)

  // ── 本機雲端連結資訊(獨立於 pet schema,不進 SCHEMA_VERSION/匯出檔)──
  function localKey(slot) { return LOCAL_PREFIX + slot; }
  function loadLocal(slot) {
    try {
      var raw = localStorage.getItem(localKey(slot));
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function saveLocal(slot, rec) {
    try { localStorage.setItem(localKey(slot), JSON.stringify(rec)); } catch (e) {}
  }

  function randCode(len) {
    var s = '';
    for (var i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
  }

  // ── 初始化(匿名登入),整頁只跑一次,失敗/未設定時 resolve(false),不丟例外 ──
  function init() {
    if (readyPromise) return readyPromise;
    startFlushTimer();
    if (!configured || typeof firebase === 'undefined') {
      readyPromise = Promise.resolve(false);
      return readyPromise;
    }
    try {
      firebase.initializeApp(CFG.firebase);
      db = firebase.firestore();
      auth = firebase.auth();
      readyPromise = auth.signInAnonymously().then(function () {
        return new Promise(function (resolve) {
          var unsub = auth.onAuthStateChanged(function (user) {
            if (user) { uid = user.uid; if (unsub) unsub(); resolve(true); }
          });
        });
      }).catch(function () { return false; });
    } catch (e) {
      readyPromise = Promise.resolve(false);
    }
    return readyPromise;
  }

  // 拜訪時對方看得到的唯讀快照:物種/暱稱/成長階段/配件款式/點數。不含背包/圖鑑/關卡等學習細節。
  function statusSnapshot(petData) {
    var gi = ST.growthInfo(petData);
    return {
      species: petData.species || '',
      name: petData.name ? String(petData.name).slice(0, 6) : '',
      stage: gi.stage,
      growDeco: typeof gi.deco === 'number' ? gi.deco : 0,
      points: petData.points || 0,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
  }

  function uniqueCode(collectionName, len) {
    function attempt(triesLeft) {
      var code = randCode(len);
      return db.collection(collectionName).doc(code).get().then(function (snap) {
        if (!snap.exists) return code;
        if (triesLeft <= 0) return code + randCode(2);   // 極低機率的退路,避免卡死
        return attempt(triesLeft - 1);
      });
    }
    return attempt(5);
  }

  // ── 建立/取得這個小孩存檔的雲端身份(players 文件 + 好友代碼 + 還原碼)──
  function ensureLinked(slot) {
    return init().then(function (ok) {
      if (!ok) return null;
      var rec = loadLocal(slot);
      if (rec && rec.playerId) return rec;
      return createPlayer(slot, rec);
    }).catch(function () { return null; });
  }

  function createPlayer(slot, rec) {
    rec = rec || {};
    var petData = ST.load(slot);
    var childNickname = petData.childNickname ? String(petData.childNickname).slice(0, 6) : '';
    var petName = petData.name ? String(petData.name).slice(0, 6) : '';
    return uniqueCode('friendCodes', FRIEND_CODE_LEN).then(function (friendCode) {
      return uniqueCode('backups', RESTORE_CODE_LEN).then(function (restoreCode) {
        var playerRef = db.collection('players').doc();
        // players 主文件先單獨寫入、等它 commit 完成,子集合(private/meta 等)的安全規則才能用
        // get() 讀到「已存在」的 players 文件來驗證擁有者 —— 如果跟它包在同一個 batch,batch 內的
        // get() 只會看到 batch 送出前的快照(那時 players 文件還不存在),規則會判定失敗。
        return playerRef.set({
          ownerUid: uid,
          species: petData.species || '',
          childNickname: childNickname,
          petName: petName,
          friendCode: friendCode,
          status: statusSnapshot(petData),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function () {
          var batch = db.batch();
          batch.set(db.collection('friendCodes').doc(friendCode), { playerId: playerRef.id });
          batch.set(playerRef.collection('private').doc('meta'), {
            restoreCode: restoreCode,
            lastSeenAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          batch.set(db.collection('backups').doc(restoreCode), {
            playerId: playerRef.id,
            snapshot: petData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          return batch.commit();
        }).then(function () {
          var newRec = {
            playerId: playerRef.id, friendCode: friendCode, restoreCode: restoreCode,
            lastBackupAt: Date.now()
          };
          saveLocal(slot, newRec);
          return newRec;
        });
      });
    });
  }

  // 家長區顯示用:純讀本機快取,不用等網路。小朋友暱稱一律讀 store.js 的正式 schema(ST.load),
  // 不再由 cloud.js 自己維護一份會失步的副本。
  function getLocalInfo(slot) {
    var rec = loadLocal(slot);
    return {
      linked: !!rec.playerId,
      friendCode: rec.friendCode || '',
      restoreCode: rec.restoreCode || '',
      childNickname: (ST.load(slot).childNickname) || '',
      lastBackupAt: rec.lastBackupAt || null
    };
  }

  // ── 自動備份:store.save() 每次寫入都會呼叫 markDirty,定時器合併成一次上傳 ──
  function markDirty(slot) {
    dirty[slot] = true;
    init();
    startFlushTimer();
  }

  function startFlushTimer() {
    if (flushTimer) return;
    flushTimer = setInterval(flushAll, FLUSH_INTERVAL_MS);
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') flushAll();
      });
    }
  }

  function flushAll() {
    Object.keys(dirty).forEach(function (slot) {
      delete dirty[slot];
      flushPet(slot).catch(function () { dirty[slot] = true; });   // 失敗留到下次 tick 重試
    });
  }

  function flushPet(slot) {
    return ensureLinked(slot).then(function (rec) {
      if (!rec) return;
      var petData = ST.load(slot);
      var playerRef = db.collection('players').doc(rec.playerId);
      var batch = db.batch();
      batch.update(playerRef, {
        species: petData.species || '',
        status: statusSnapshot(petData),
        petName: petData.name ? String(petData.name).slice(0, 6) : '',
        childNickname: petData.childNickname ? String(petData.childNickname).slice(0, 6) : ''
      });
      batch.set(db.collection('backups').doc(rec.restoreCode), {
        playerId: rec.playerId,
        snapshot: petData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      batch.update(playerRef.collection('private').doc('meta'), {
        lastSeenAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return batch.commit().then(function () {
        rec.lastBackupAt = Date.now();
        saveLocal(slot, rec);
      });
    });
  }

  // 手動立即節流上傳(例如打開好友面板前刷新自己的 status)
  function pushStatus(slot) {
    var now = Date.now();
    if (lastPush[slot] && now - lastPush[slot] < PUSH_THROTTLE_MS) return Promise.resolve();
    lastPush[slot] = now;
    return flushPet(slot).catch(function () {});
  }

  // ── 還原碼救回進度(家長區專用,不在好友面板出現)──
  // 兩步驟確認:先查這組還原碼實際是「哪個小朋友、養哪種寵物」的備份,家長確認過內容後,
  // 才選要蓋掉本機哪一個小孩(kidL/kidR)。
  function lookupRestoreCode(restoreCode) {
    restoreCode = (restoreCode || '').trim().toUpperCase();
    if (!restoreCode) return Promise.resolve({ ok: false, reason: 'empty' });
    return init().then(function (ok) {
      if (!ok) return { ok: false, reason: 'offline' };
      return db.collection('backups').doc(restoreCode).get().then(function (snap) {
        if (!snap.exists) return { ok: false, reason: 'not_found' };
        var data = snap.data();
        if (!data || !data.playerId) return { ok: false, reason: 'empty' };
        return db.collection('players').doc(data.playerId).get().then(function (pSnap) {
          var p = pSnap.exists ? pSnap.data() : {};
          return { ok: true, childNickname: p.childNickname || '', species: p.species || '' };
        });
      });
    }).catch(function () { return { ok: false, reason: 'error' }; });
  }

  function restoreFromCode(slot, restoreCode) {
    restoreCode = (restoreCode || '').trim().toUpperCase();
    if (!restoreCode) return Promise.resolve({ ok: false, reason: 'empty' });
    return init().then(function (ok) {
      if (!ok) return { ok: false, reason: 'offline' };
      return db.collection('backups').doc(restoreCode).get().then(function (snap) {
        if (!snap.exists) return { ok: false, reason: 'not_found' };
        var data = snap.data();
        if (!data || !data.snapshot) return { ok: false, reason: 'empty' };
        var wrapper = { app: 'pls' };
        wrapper[slot] = data.snapshot;
        ST.importAll(JSON.stringify(wrapper));
        // 還原後不做「過戶」:本機沒有雲端連結才建立這台新裝置自己的身份,已連結就維持原樣。
        return ensureLinked(slot).then(function () { return { ok: true }; });
      });
    }).catch(function () { return { ok: false, reason: 'error' }; });
  }

  // ── 加好友(先查代碼供 UI 顯示確認文字,再寫入)──
  function lookupFriendCode(code) {
    code = (code || '').trim().toUpperCase();
    if (!code) return Promise.resolve({ ok: false, reason: 'empty' });
    return init().then(function (ok) {
      if (!ok) return { ok: false, reason: 'offline' };
      return db.collection('friendCodes').doc(code).get().then(function (snap) {
        if (!snap.exists) return { ok: false, reason: 'not_found' };
        var friendId = snap.data().playerId;
        return db.collection('players').doc(friendId).get().then(function (pSnap) {
          if (!pSnap.exists) return { ok: false, reason: 'not_found' };
          var p = pSnap.data();
          return { ok: true, playerId: friendId, childNickname: p.childNickname || '', species: p.species || '' };
        });
      });
    }).catch(function () { return { ok: false, reason: 'error' }; });
  }

  // 雙向加好友:一次寫入自己→對方、對方→自己兩筆 friends 文件,對方不用再輸入一次代碼
  // 就能在自己的好友清單看到我(firestore.rules 的 friends create 規則允許「建立自己的清單」或
  // 「在任何人的清單裡建立代表自己的那一筆」,所以這個 batch 兩筆寫入都合法)。
  function addFriendByCode(slot, code) {
    return lookupFriendCode(code).then(function (res) {
      if (!res.ok) return res;
      return ensureLinked(slot).then(function (rec) {
        if (!rec) return { ok: false, reason: 'offline' };
        if (res.playerId === rec.playerId) return { ok: false, reason: 'self' };
        var addedAt = firebase.firestore.FieldValue.serverTimestamp();
        var batch = db.batch();
        batch.set(db.collection('players').doc(rec.playerId).collection('friends').doc(res.playerId), { addedAt: addedAt });
        batch.set(db.collection('players').doc(res.playerId).collection('friends').doc(rec.playerId), { addedAt: addedAt });
        return batch.commit().then(function () { return res; });
      });
    }).catch(function () { return { ok: false, reason: 'error' }; });
  }

  function listFriends(slot) {
    return ensureLinked(slot).then(function (rec) {
      if (!rec) return [];
      return db.collection('players').doc(rec.playerId).collection('friends').get().then(function (qs) {
        var ids = [];
        qs.forEach(function (d) { ids.push(d.id); });
        return Promise.all(ids.map(function (fid) {
          return Promise.all([
            db.collection('players').doc(fid).get(),
            db.collection('players').doc(rec.playerId).collection('visits').doc(fid + '_' + ST.today()).get()
          ]).then(function (res) {
            var pSnap = res[0], vSnap = res[1];
            if (!pSnap.exists) return null;
            var p = pSnap.data();
            return {
              playerId: fid,
              childNickname: p.childNickname || '',
              species: p.species || '',
              status: p.status || null,
              visitedToday: vSnap.exists
            };
          });
        })).then(function (arr) { return arr.filter(function (x) { return x; }); });
      });
    }).catch(function () { return []; });
  }

  function canVisitToday(slot, friendId) {
    return ensureLinked(slot).then(function (rec) {
      if (!rec) return false;
      return db.collection('players').doc(rec.playerId).collection('visits')
        .doc(friendId + '_' + ST.today()).get().then(function (snap) { return !snap.exists; });
    }).catch(function () { return false; });
  }

  // create-only:doc 已存在時 Firestore 規則會擋下(update 被禁止),等於原子的每日一次限制
  function visitFriend(slot, friendId) {
    return ensureLinked(slot).then(function (rec) {
      if (!rec) return { ok: false, reason: 'offline' };
      var visitRef = db.collection('players').doc(rec.playerId).collection('visits')
        .doc(friendId + '_' + ST.today());
      return visitRef.set({ at: firebase.firestore.FieldValue.serverTimestamp() }).then(function () {
        return db.collection('players').doc(friendId).get().then(function (snap) {
          if (!snap.exists) return { ok: false, reason: 'not_found' };
          var p = snap.data();
          return {
            ok: true,
            friend: { playerId: friendId, childNickname: p.childNickname || '', species: p.species || '', status: p.status || null }
          };
        });
      }).catch(function (err) {
        return { ok: false, reason: (err && err.code === 'permission-denied') ? 'already_visited' : 'error' };
      });
    }).catch(function () { return { ok: false, reason: 'error' }; });
  }

  // ── 拜訪分享:帶自己背包(inv)裡的食物/玩具分享給主人(gift = {type:'food'|'toy', key, label})──
  // 只會在對方的 visitLog 底下新增一筆,絕對碰不到對方 players 文件本身的 status/經驗值/點數/背包。
  function shareGift(slot, friendId, gift) {
    return ensureLinked(slot).then(function (rec) {
      if (!rec) return { ok: false, reason: 'offline' };
      var petData = ST.load(slot);
      return db.collection('players').doc(friendId).collection('visitLog').doc().set({
        fromNickname: petData.childNickname ? String(petData.childNickname).slice(0, 6) : '',
        fromSpecies: petData.species || '',
        fromPetName: petData.name ? String(petData.name).slice(0, 6) : '',
        gift: {
          type: gift.type,
          key: String(gift.key || '').slice(0, 40),
          label: String(gift.label || '').slice(0, 20)
        },
        at: firebase.firestore.FieldValue.serverTimestamp()
      }).then(function () { return { ok: true }; });
    }).catch(function () { return { ok: false, reason: 'error' }; });
  }

  // ── 拜訪通知:讀自己 visitLog 裡比本機游標新的紀錄;呼叫端顯示完要自己呼叫 advanceVisitLogCursor ──
  function checkVisitLog(slot) {
    return ensureLinked(slot).then(function (rec) {
      if (!rec) return [];
      var cursor = loadLocal(slot).lastVisitLogCheckAt || 0;
      return db.collection('players').doc(rec.playerId).collection('visitLog')
        .orderBy('at', 'desc').limit(10).get().then(function (qs) {
          var out = [];
          qs.forEach(function (d) {
            var v = d.data();
            var ts = (v.at && v.at.toMillis) ? v.at.toMillis() : 0;
            if (ts > cursor) {
              out.push({
                id: d.id, fromNickname: v.fromNickname || '', fromSpecies: v.fromSpecies,
                fromPetName: v.fromPetName || '', gift: v.gift || null, at: ts
              });
            }
          });
          return out;
        });
    }).catch(function () { return []; });
  }

  // 通知顯示/點掉後,把本機游標往前推,不寫回 Firestore(visitLog 本身永遠不會被 update)。
  function advanceVisitLogCursor(slot, ts) {
    var rec = loadLocal(slot);
    rec.lastVisitLogCheckAt = ts || Date.now();
    saveLocal(slot, rec);
  }

  window.PLS_CLOUD = {
    init: init,
    isConfigured: function () { return configured; },
    ensureLinked: ensureLinked,
    getLocalInfo: getLocalInfo,
    pushStatus: pushStatus,
    markDirty: markDirty,
    lookupRestoreCode: lookupRestoreCode,
    restoreFromCode: restoreFromCode,
    lookupFriendCode: lookupFriendCode,
    addFriendByCode: addFriendByCode,
    listFriends: listFriends,
    canVisitToday: canVisitToday,
    visitFriend: visitFriend,
    shareGift: shareGift,
    checkVisitLog: checkVisitLog,
    advanceVisitLogCursor: advanceVisitLogCursor
  };
})();
