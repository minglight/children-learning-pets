// family.js — 家庭同步(SEC-380):同一個家的裝置共用兩個小孩的存檔與全家設定。
// 規格:docs/cloud-friends-schema.md「家庭同步」;權限:firestore.rules 的 families/familyCodes。
//
// 正本是雲端 families/{fid}/kids/{slot}(rev 每次 +1),本機 localStorage 是快取 + 離線也能玩。
// - 每台第一次連上雲端就自動建自己的家庭(把兩個小孩上傳成 rev 1);其他裝置輸入配對碼加入。
// - pull 只在「安全時機」做(開 App、回首頁、在首頁時切回前景):這時沒有畫面手上拿著舊的存檔物件,
//   換掉本機資料不會被畫面隨後的 save() 蓋回去。
// - push 隨時做(存檔後節流、定時、切背景);rev 對不上(別台先寫了)時,在首頁就三方合併,不在首頁就等下次安全時機。
// - 每個小孩分開算(左右小孩各一份 rev / base),兩個小孩各用一台裝置時互不干擾。
// ⚠ fail-soft:未設定 Firebase / 離線 / 任何錯誤都安靜略過,絕不影響本機遊戲。
(function () {
  const ST = window.PLS_STORE;
  const MERGE = window.PLS_MERGE;
  const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const PAIR_CODE_LEN = 10;
  const PUSH_THROTTLE_MS = 15000;
  const FLUSH_INTERVAL_MS = 90000;
  const HISTORY_EVERY_MS = 3600000;     // 同一個小孩每小時最多留一筆歷史(admin 還原用)
  const HISTORY_KEEP_MS = 30 * 86400000;   // 歷史保留 30 天:過期的由後台 pruneExpired 清(憲法第 9 條)
  const RETRY_START_MS = 30000;        // 開機連雲端失敗後,最快多久再試一次
  const WID_KEEP = 8;                  // 雲端文件記最近幾次寫入的 id(推送成功但沒收到回應時,認得出自己那次)

  var env = null;            // {db, uid, projectId}
  var started = null;        // start() 的 promise
  var startFailedAt = 0;     // start() 失敗的時間;之後的安全時機會重試
  var dirty = {};            // slot -> true
  var lastPush = {};         // slot -> ms
  var settingsDirty = false;
  var pendingPull = false;   // 不在首頁時收到「該 pull 了」的訊號,等回首頁再做
  var busy = Promise.resolve();   // 所有雲端讀寫排隊,避免同一台自己跟自己搶 rev
  var timer = null;

  function slots() { return ST.SLOTS; }
  function now() { return Date.now(); }
  function ts() { return firebase.firestore.FieldValue.serverTimestamp(); }
  function onSafeScreen() { var P = window.PLS; return !P || !P.currentName || P.currentName === 'home'; }

  // ── 本機狀態(不進小孩存檔 schema)──
  function key(name) { return 'pls.' + name + '.' + (env ? env.projectId : 'default'); }
  function readJSON(k) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function loadFam() { return readJSON(key('fam')); }
  function saveFam(v) { writeJSON(key('fam'), v); }
  function loadSync(slot) { return readJSON(key('sync') + '.' + slot); }
  function saveSync(slot, v) { writeJSON(key('sync') + '.' + slot, v); }

  function queue(fn) {
    var p = busy.then(fn, fn);
    busy = p.catch(function () {});
    return p;
  }

  function randCode(len) {
    var s = '';
    for (var i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
  }
  function deviceLabel() {
    var ua = (navigator && navigator.userAgent) || '';
    if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/Android/.test(ua)) return 'Android';
    if (/Macintosh/.test(ua)) return 'Mac';
    if (/Windows/.test(ua)) return 'Windows';
    return '其他';
  }

  function famRef(fid) { return env.db.collection('families').doc(fid); }
  function kidRef(fid, slot) { return famRef(fid).collection('kids').doc(slot); }
  function settingsRef(fid) { return famRef(fid).collection('settings').doc('main'); }
  function expireAt() { return firebase.firestore.Timestamp.fromMillis(now() + HISTORY_KEEP_MS); }
  // 寫一筆歷史。strict:這筆是「本機進度被換掉前的保險」,寫不進去就要讓呼叫的人中止,不能照樣換掉。
  function addHistory(fid, slot, data, rev, reason, strict) {
    var p = kidRef(fid, slot).collection('history').add({
      rev: rev || 0, data: data, at: ts(), by: env.uid, reason: reason, expireAt: expireAt()
    });
    return strict ? p : p.catch(function () {});
  }
  function newWid() { return env.uid.slice(0, 6) + '-' + randCode(10); }
  // 上次推送其實寫進去了、只是沒收到回應(切背景被凍結、斷線):交易送出前本機先記下 pending = {wid, rev, data},
  // 雲端文件的 wids 有這個 wid 就代表那版寫進去了 → 把它當 base(之後別台再寫的照常合併),不當成別台的改動。
  function recover(sync, r) {
    var pd = sync.pending;
    if (pd && r && Array.isArray(r.wids) && r.wids.indexOf(pd.wid) >= 0 && sync.rev !== pd.rev) {
      return { rev: pd.rev, base: pd.data, restoredAt: pd.restoredAt || 0, histAt: sync.histAt || 0, recovered: true };
    }
    return sync;
  }
  function withWid(r, wid) { return ((r && Array.isArray(r.wids)) ? r.wids : []).concat([wid]).slice(-WID_KEEP); }
  function localLink(slot) { return window.PLS_CLOUD && PLS_CLOUD.getLink ? PLS_CLOUD.getLink(slot) : null; }

  // 這台建立的 players(好友身份)掛到家庭,讓同家庭的其他裝置也能更新好友狀態。不是擁有者時規則會擋,安靜略過。
  function linkPlayer(fid, link) {
    if (!link || !link.playerId) return Promise.resolve();
    var k = key('plink') + '.' + link.playerId;
    if (localStorage.getItem(k) === fid) return Promise.resolve();
    return env.db.collection('players').doc(link.playerId).update({ familyId: fid })
      .then(function () { try { localStorage.setItem(k, fid); } catch (e) {} })
      .catch(function () {});
  }

  // ── 建家庭(每台第一次連上雲端)──
  function uniquePairCode(tries) {
    var code = randCode(PAIR_CODE_LEN);
    return env.db.collection('familyCodes').doc(code).get().then(function (snap) {
      if (!snap.exists || tries <= 0) return code;
      return uniquePairCode(tries - 1);
    });
  }
  function createFamily() {
    return uniquePairCode(5).then(function (code) {
      var ref = env.db.collection('families').doc();
      var fid = ref.id;
      // 依序寫:規則要用 get()/exists() 讀到前一步已經存在的文件,不能包在同一個 batch
      return ref.set({ ownerUid: env.uid, pairCode: code, createdAt: ts() })
        .then(function () { return ref.collection('members').doc(env.uid).set({ code: code, joinedAt: ts(), lastSeenAt: ts(), label: deviceLabel() }); })
        .then(function () { return env.db.collection('familyCodes').doc(code).set({ familyId: fid }); })
        .then(function () {
          saveFam({ familyId: fid, pairCode: code });
          slots().forEach(function (slot) { saveSync(slot, {}); });
          return Promise.all(slots().map(function (slot) { return pushSlot(slot, true); }))
            .then(function () { return pushSettings(); })
            .then(function () { return fid; });
        });
    });
  }

  // 已有家庭就確認自己還是成員(被 admin 移除就重建一個);沒有就建。
  // 只有「確定不是成員」(被規則拒絕 / 文件不在)才重建;網路錯誤直接失敗,下次安全時機再試,不能默默開新家庭。
  function ensureFamily() {
    var fam = loadFam();
    if (!fam.familyId) return createFamily();
    return famRef(fam.familyId).collection('members').doc(env.uid).get().then(function (snap) {
      if (!snap.exists) return createFamily();
      snap.ref.update({ lastSeenAt: ts() }).catch(function () {});
      return fam.familyId;
    }, function (err) {
      if (err && err.code === 'permission-denied') return createFamily();
      throw err;
    });
  }

  // ── 小孩存檔:push(rev 相同就寫;不同時在安全畫面才合併)──
  // 每次寫入帶一個 wid,先記在本機再送出:推送成功但沒收到回應時,下次看到雲端的 wid 是自己的就知道那是自己寫的。
  function pushSlot(slot, allowMerge) {
    var fid = loadFam().familyId;
    if (!fid) return Promise.resolve();
    var ref = kidRef(fid, slot);
    var local = ST.load(slot);
    var sync0 = loadSync(slot);
    var wid = newWid();
    var link = localLink(slot);
    // 送出前先記 pending(交易可能重跑,每次覆蓋成這次要寫的那版)
    function pend(sync, rev, data, restoredAt) {
      saveSync(slot, Object.assign({}, sync0, { pending: { wid: wid, rev: rev, data: data, restoredAt: restoredAt } }));
    }
    return env.db.runTransaction(function (tx) {
      return tx.get(ref).then(function (snap) {
        if (!snap.exists) {
          pend(sync0, 1, local, 0);
          tx.set(ref, { data: local, rev: 1, updatedAt: ts(), by: env.uid, restoredAt: 0, link: link, wids: [wid] });
          return { wrote: local, rev: 1, restoredAt: 0, link: link };
        }
        var r = snap.data();
        var sync = recover(sync0, r);
        var outLink = r.link || link;
        if (r.rev === sync.rev) {
          if (sync.base && MERGE.equal(local, sync.base) && (r.link || !link)) return { same: true, rev: r.rev, link: outLink, sync: sync };
          pend(sync, r.rev + 1, local, r.restoredAt || 0);
          tx.update(ref, { data: local, rev: r.rev + 1, updatedAt: ts(), by: env.uid, link: outLink, wids: withWid(r, wid) });
          return { wrote: local, rev: r.rev + 1, restoredAt: r.restoredAt || 0, link: outLink };
        }
        // 不在安全畫面:什麼都不換(包括 admin 還原),等回首頁
        if (!allowMerge) return { deferred: true, sync: sync };
        if ((r.restoredAt || 0) > (sync.restoredAt || 0)) return { restore: r };
        var merged = MERGE.merge3(sync.base || null, local, r.data);
        pend(sync, r.rev + 1, merged, r.restoredAt || 0);
        tx.update(ref, { data: merged, rev: r.rev + 1, updatedAt: ts(), by: env.uid, link: outLink, wids: withWid(r, wid) });
        return { wrote: merged, rev: r.rev + 1, restoredAt: r.restoredAt || 0, link: outLink, merged: true };
      });
    }).then(function (res) {
      if (res.restore) return applyRestore(fid, slot, res.restore);
      if (res.deferred) {
        if (res.sync.recovered) saveSync(slot, res.sync);
        dirty[slot] = true; pendingPull = true; return;
      }
      if (res.link && window.PLS_CLOUD && PLS_CLOUD.adoptLink) PLS_CLOUD.adoptLink(slot, res.link);
      linkPlayer(fid, localLink(slot));   // 好友身份第一次建好之後才掛得上家庭(有快取,掛過就不再打)
      var histAt = sync0.histAt || 0;
      if (res.same) {
        if (res.sync.recovered) saveSync(slot, res.sync);
        return;
      }
      var base = res.wrote;
      if (res.merged) {
        // 交易進行中這台又存了檔(cur ≠ 當初送出去的 local)→ 那段改動也合進來,下次再推
        var cur = ST.load(slot);
        base = ST.replaceSlot(slot, res.wrote);
        if (!MERGE.equal(cur, local)) { ST.replaceSlot(slot, MERGE.merge3(local, cur, base)); dirty[slot] = true; }
        changed = true;
      }
      var next = { rev: res.rev, base: base, restoredAt: res.restoredAt, histAt: histAt };
      saveSync(slot, next);
      if (now() - histAt > HISTORY_EVERY_MS) {
        next.histAt = now(); saveSync(slot, next);
        return addHistory(fid, slot, res.wrote, res.rev, 'hourly');
      }
    });
  }

  // admin 還原過:本機整份換成雲端版,原本的本機版先存一份歷史
  function applyRestore(fid, slot, r) {
    var local = ST.load(slot);
    var p = MERGE.equal(local, r.data) ? Promise.resolve() : addHistory(fid, slot, local, r.rev, 'restore-replaced', true);
    return p.then(function () {
      var stored = ST.replaceSlot(slot, r.data);
      saveSync(slot, { rev: r.rev, base: stored, restoredAt: r.restoredAt || 0, histAt: now() });
      if (r.link && window.PLS_CLOUD) PLS_CLOUD.adoptLink(slot, r.link);
      changed = true;
    });
  }

  // ── 小孩存檔:pull(只在安全時機呼叫)──
  var changed = false;
  function pullSlot(slot) {
    var fid = loadFam().familyId;
    if (!fid) return Promise.resolve();
    return kidRef(fid, slot).get().then(function (snap) {
      if (!snap.exists) return pushSlot(slot, true);
      var r = snap.data();
      var sync = recover(loadSync(slot), r);
      if (sync.recovered) saveSync(slot, sync);
      var local = ST.load(slot);
      if ((r.restoredAt || 0) > (sync.restoredAt || 0)) return applyRestore(fid, slot, r);
      if (r.link && window.PLS_CLOUD) PLS_CLOUD.adoptLink(slot, r.link);
      if (r.rev === sync.rev) {
        if (!sync.base || !MERGE.equal(local, sync.base)) return pushSlot(slot, true);
        return;
      }
      // 遠端比較新
      if (!sync.base) {
        // 本機沒有同步紀錄(不該發生,保險):本機有進度就先留歷史,再採用雲端版,避免沒有 base 的合併把計數加兩次
        var keep = ST.hasProgress(local) ? addHistory(fid, slot, local, r.rev, 'join-replaced', true) : Promise.resolve();
        return keep.then(function () { adopt(slot, r); });
      }
      if (MERGE.equal(local, sync.base)) { adopt(slot, r); return; }
      return pushSlot(slot, true);   // 兩邊都改過 → 合併後推回去
    });
  }
  function adopt(slot, r) {
    var stored = ST.replaceSlot(slot, r.data);
    var sync = loadSync(slot);
    saveSync(slot, { rev: r.rev, base: stored, restoredAt: r.restoredAt || 0, histAt: sync.histAt || 0 });
    changed = true;
  }

  // ── 全家設定:最後寫的贏(改設定很少見,不做合併)──
  function loadSSync() { return readJSON(key('sync') + '.settings'); }
  function saveSSync(v) { writeJSON(key('sync') + '.settings', v); }
  function pushSettings() {
    var fid = loadFam().familyId;
    if (!fid) return Promise.resolve();
    var ref = settingsRef(fid);
    var local = ST.getSettings();
    return env.db.runTransaction(function (tx) {
      return tx.get(ref).then(function (snap) {
        if (!snap.exists) { tx.set(ref, { data: local, rev: 1, updatedAt: ts(), by: env.uid }); return 1; }
        var rev = snap.data().rev + 1;
        tx.update(ref, { data: local, rev: rev, updatedAt: ts(), by: env.uid });
        return rev;
      });
    }).then(function (rev) { saveSSync({ rev: rev, base: local }); settingsDirty = false; });
  }
  function pullSettings() {
    var fid = loadFam().familyId;
    if (!fid) return Promise.resolve();
    return settingsRef(fid).get().then(function (snap) {
      if (!snap.exists) return pushSettings();
      var r = snap.data(), s = loadSSync(), local = ST.getSettings();
      var localChanged = !s.base || !MERGE.equal(local, s.base);
      if (r.rev === s.rev) return localChanged ? pushSettings() : undefined;
      if (localChanged && s.base) return pushSettings();   // 這台剛改過 → 這台贏
      ST.applySettings(r.data);
      saveSSync({ rev: r.rev, base: ST.getSettings() });
    });
  }

  // ── 對外:安全時機 pull、存檔後 push ──
  function syncAll() {
    changed = false;
    var wasDirty = dirty;
    dirty = {};   // 每個小孩都會在下面 pull(本機改過就推);同步途中新存的改動留在新的 dirty 裡
    return slots().reduce(function (p, slot) { return p.then(function () { return pullSlot(slot); }); }, Promise.resolve())
      .then(function () { return settingsDirty ? pushSettings() : pullSettings(); })
      .then(function () {
        pendingPull = false;
        var fam = loadFam(); fam.lastSyncAt = now(); saveFam(fam);
        // 首頁的小孩卡是進畫面時畫的,換了資料就重進一次首頁
        if (changed && window.PLS && PLS.currentName === 'home' && PLS.go) { changed = false; PLS.go('home', { fromSync: true }); }
      }, function (err) {
        Object.keys(wasDirty).forEach(function (k) { dirty[k] = true; });
        throw err;
      });
  }
  // 開機時連雲端失敗(網路抖、模擬器沒開…)不能讓整個 session 都不同步:過一陣子的安全時機再試
  function ensureStarted() {
    if (!started) return null;
    if (startFailedAt && now() - startFailedAt > RETRY_START_MS) { started = null; startFailedAt = 0; return start(); }
    return started;
  }
  function safePoint(params) {
    if (params && params.fromSync) return Promise.resolve();
    var st = ensureStarted();
    if (!st) return Promise.resolve();
    return st.then(function (ok) {
      if (!ok || !onSafeScreen()) { if (ok) pendingPull = true; return; }
      return queue(syncAll);
    }).catch(function () {});
  }
  function flush() {
    var st = ensureStarted();
    if (!st) return Promise.resolve();
    return st.then(function (ok) {
      if (!ok) return;
      var list = Object.keys(dirty);
      dirty = {};
      return queue(function () {
        var safe = onSafeScreen();   // 排到才看:排隊期間可能已經離開首頁
        var p = list.reduce(function (acc, slot) {
          return acc.then(function () { lastPush[slot] = now(); return pushSlot(slot, safe); })
            .catch(function () { dirty[slot] = true; });
        }, Promise.resolve());
        if (settingsDirty) p = p.then(pushSettings).catch(function () { settingsDirty = true; });
        return p;
      });
    }).catch(function () {});
  }
  function markDirty(slot) {
    dirty[slot] = true;
    if (!started) return;
    var t = now();
    if (lastPush[slot] && t - lastPush[slot] < PUSH_THROTTLE_MS) return;
    flush();
  }
  function markSettingsDirty() { settingsDirty = true; if (started) flush(); }
  // cloud.js 建好某個小孩的好友身份時呼叫:馬上推一次,把 link 寫進家庭、players 掛上 familyId
  function onLinked(slot) { dirty[slot] = true; if (started) flush(); }

  function start() {
    if (started) return started;
    if (!window.PLS_CLOUD || !PLS_CLOUD.ready || !MERGE) { started = Promise.resolve(false); return started; }
    started = PLS_CLOUD.ready().then(function (e) {
      if (!e) return false;
      env = e;
      return queue(function () {
        return ensureFamily().then(function (fid) {
          slots().forEach(function (slot) { linkPlayer(fid, localLink(slot)); });
          return syncAll();
        });
      }).then(function () { return true; });
    }).catch(function () { return false; }).then(function (ok) {
      startFailedAt = ok ? 0 : now();   // 沒設定 Firebase 時重試也只是馬上回 false,很便宜
      return ok;
    });
    if (!timer) {
      timer = setInterval(function () { if (pendingPull && onSafeScreen()) safePoint(); else flush(); }, FLUSH_INTERVAL_MS);
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'hidden') flush(); else safePoint();
        });
      }
    }
    return started;
  }

  // ── 家長區:加入別的家庭 ──
  // 每個小孩:本機有進度、雲端那個小孩還是空的 → 留本機版並推上去;否則本機版先存一份歷史(join-replaced,
  // admin 可還原)再換成雲端版。順序:先讀完兩個小孩 → 歷史都寫成功 → 才一次改本機,中途失敗本機什麼都沒動。
  function join(code) {
    code = String(code || '').trim().toUpperCase();
    if (!code) return Promise.resolve({ ok: false, reason: 'empty' });
    var st = ensureStarted() || start();
    return st.then(function (ok) {
      if (!ok) return { ok: false, reason: 'offline' };
      return queue(function () {
        return env.db.collection('familyCodes').doc(code).get().then(function (snap) {
          if (!snap.exists) return { ok: false, reason: 'not_found' };
          var fid = snap.data().familyId;
          var old = loadFam();
          if (fid === old.familyId) return { ok: false, reason: 'same' };
          var plan = [];
          return famRef(fid).collection('members').doc(env.uid)
            .set({ code: code, joinedAt: ts(), lastSeenAt: ts(), label: deviceLabel() })
            .then(function () {
              return Promise.all(slots().map(function (slot) { return kidRef(fid, slot).get(); }));
            })
            .then(function (snaps) {
              plan = slots().map(function (slot, i) {
                var local = ST.load(slot);
                var r = snaps[i].exists ? snaps[i].data() : null;
                var keepLocal = ST.hasProgress(local) && (!r || !ST.hasProgress(r.data));
                return { slot: slot, local: local, r: r, keepLocal: keepLocal };
              });
              return Promise.all(plan.map(function (x) {
                return ST.hasProgress(x.local) && !x.keepLocal
                  ? addHistory(fid, x.slot, x.local, x.r ? x.r.rev : 0, 'join-replaced', true) : null;
              }));
            })
            .then(function () { return settingsRef(fid).get(); })
            .then(function (ss) {
              // 到這裡雲端該讀的、該備份的都好了,才開始改本機
              plan.forEach(function (x) {
                if (x.keepLocal) { saveSync(x.slot, x.r ? { rev: x.r.rev, base: x.r.data, restoredAt: x.r.restoredAt || 0 } : {}); return; }
                if (x.r) {
                  var stored = ST.replaceSlot(x.slot, x.r.data);
                  saveSync(x.slot, { rev: x.r.rev, base: stored, restoredAt: x.r.restoredAt || 0, histAt: 0 });
                  if (x.r.link && window.PLS_CLOUD) PLS_CLOUD.adoptLink(x.slot, x.r.link);
                } else {
                  saveSync(x.slot, {});
                }
              });
              saveFam({ familyId: fid, pairCode: code, lastSyncAt: now() });
              // 原本的家庭這台就退出了(只刪自己的成員資格,資料與歷史都還在,admin 查得到)
              if (old.familyId) famRef(old.familyId).collection('members').doc(env.uid).delete().catch(function () {});
              if (ss.exists) { ST.applySettings(ss.data().data); saveSSync({ rev: ss.data().rev, base: ST.getSettings() }); settingsDirty = false; return; }
              return pushSettings();
            })
            .then(function () {
              var kept = plan.filter(function (x) { return x.keepLocal; }).map(function (x) { return x.slot; });
              return kept.reduce(function (p, slot) {
                return p.then(function () { linkPlayer(fid, localLink(slot)); return pushSlot(slot, true); });
              }, Promise.resolve()).then(function () {
                // 家長區可能是從房間打開的:一律回首頁,不讓畫面拿著換掉之前的寵物
                if (window.PLS && PLS.go) PLS.go('home', { fromSync: true });
                return { ok: true, kept: kept };
              });
            });
        });
      });
    }).catch(function () { return { ok: false, reason: 'error' }; });
  }

  function info() {
    var fam = env ? loadFam() : {};
    return { ready: !!env, familyId: fam.familyId || '', pairCode: fam.pairCode || '', lastSyncAt: fam.lastSyncAt || null };
  }
  function members() {
    var fid = env && loadFam().familyId;
    if (!fid) return Promise.resolve([]);
    return famRef(fid).collection('members').get().then(function (qs) {
      var out = [];
      qs.forEach(function (d) { var m = d.data(); out.push({ me: d.id === env.uid, label: m.label || '', joinedAt: m.joinedAt, lastSeenAt: m.lastSeenAt }); });
      return out;
    }).catch(function () { return []; });
  }

  window.PLS_FAMILY = {
    start: start, safePoint: safePoint, markDirty: markDirty, markSettingsDirty: markSettingsDirty, onLinked: onLinked,
    flush: flush, join: join, info: info, members: members,
    _idle: function () { return busy; }      // 測試用:等排隊中的雲端讀寫做完
  };
})();
