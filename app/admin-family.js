// admin-family.js — 維運後台的「家庭與存檔還原」資料邏輯(SEC-380),不碰 DOM,畫面在 app/admin.js。
// 權限邊界在 firestore.rules 的 isAdmin():只有管理員 email 登入才讀得到 families/**、才寫得進還原。
(function (root) {
  var CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
  var SLOTS = ['kidL', 'kidR'];

  function ts() { return root.firebase.firestore.FieldValue.serverTimestamp(); }

  // 一份小孩存檔的摘要(後台列表與歷史用,不顯示答題細節)
  function summary(d) {
    d = d || {};
    var xp = (d.growth && d.growth.xp) || 0;
    var clears = 0;
    Object.keys(d.levels || {}).forEach(function (k) { var r = d.levels[k]; if (r) clears += (r.clears || 0); });
    return {
      childNickname: d.childNickname || '', name: d.name || '', species: d.species || '',
      stage: xp >= 100 ? '大寶' : xp >= 30 ? '小寶' : '幼幼', xp: xp,
      points: d.points || 0, clears: clears, levels: Object.keys(d.levels || {}).length,
      collection: Array.isArray(d.collection) ? d.collection.length : 0
    };
  }

  function playerRow(id, p) {
    return {
      playerId: id, childNickname: p.childNickname || '', species: p.species || '', friendCode: p.friendCode || '',
      familyId: p.familyId || '', updatedAt: p.status && p.status.updatedAt
    };
  }

  // 用好友代碼(6 碼)或小朋友暱稱找人
  function findPlayers(db, q) {
    q = String(q || '').trim();
    if (!q) return Promise.resolve([]);
    var up = q.toUpperCase();
    if (CODE_RE.test(up)) {
      return db.collection('friendCodes').doc(up).get().then(function (snap) {
        if (!snap.exists) return [];
        var id = snap.data().playerId;
        return db.collection('players').doc(id).get().then(function (ps) { return ps.exists ? [playerRow(id, ps.data())] : []; });
      });
    }
    return db.collection('players').where('childNickname', '==', q).limit(20).get().then(function (qs) {
      var out = [];
      qs.forEach(function (d) { out.push(playerRow(d.id, d.data())); });
      return out;
    });
  }

  function loadFamily(db, fid) {
    var fam = db.collection('families').doc(fid);
    return Promise.all([
      fam.get(),
      fam.collection('members').get(),
      Promise.all(SLOTS.map(function (s) { return fam.collection('kids').doc(s).get(); }))
    ]).then(function (res) {
      if (!res[0].exists) return null;
      var f = res[0].data();
      var members = [];
      res[1].forEach(function (d) { var m = d.data(); members.push({ uid: d.id, label: m.label || '', joinedAt: m.joinedAt, lastSeenAt: m.lastSeenAt }); });
      var kids = {};
      res[2].forEach(function (k, i) {
        if (!k.exists) return;
        var r = k.data();
        kids[SLOTS[i]] = { rev: r.rev, updatedAt: r.updatedAt, restoredAt: r.restoredAt || 0, by: r.by || '', link: r.link || null, summary: summary(r.data) };
      });
      return { familyId: fid, pairCode: f.pairCode || '', createdAt: f.createdAt, members: members, kids: kids };
    });
  }

  function loadHistory(db, fid, slot, limit) {
    return db.collection('families').doc(fid).collection('kids').doc(slot).collection('history')
      .orderBy('at', 'desc').limit(limit || 50).get().then(function (qs) {
        var out = [];
        qs.forEach(function (d) { var h = d.data(); out.push({ id: d.id, rev: h.rev, at: h.at, by: h.by || '', reason: h.reason || '', summary: summary(h.data) }); });
        return out;
      });
  }

  // 清掉過期(expireAt 已過)的歷史。Firestore TTL 要開帳單(Blaze)才能用,免費方案改由後台開歷史時順手清;
  // 規則只讓 admin 刪歷史。一次最多清 200 筆,剩下的下次再清。回傳清掉幾筆。
  function pruneExpired(db, fid, slot) {
    var now = root.firebase.firestore.Timestamp.fromMillis(Date.now());
    return db.collection('families').doc(fid).collection('kids').doc(slot).collection('history')
      .where('expireAt', '<', now).limit(200).get().then(function (qs) {
        if (qs.empty) return 0;
        var batch = db.batch();
        qs.forEach(function (d) { batch.delete(d.ref); });
        return batch.commit().then(function () { return qs.size; });
      });
  }

  // 還原成某一筆歷史:先把現在的雲端版存成一筆 before-restore(還原錯了可以再還原回來),
  // 再寫入歷史版、rev+1、restoredAt=現在 → 各裝置下次同步看到 restoredAt 變新,整份換成這一版。
  function restore(db, fid, slot, histId) {
    var kidRef = db.collection('families').doc(fid).collection('kids').doc(slot);
    var histRef = kidRef.collection('history').doc(histId);
    return db.runTransaction(function (tx) {
      return Promise.all([tx.get(kidRef), tx.get(histRef)]).then(function (r) {
        var kid = r[0], hist = r[1];
        if (!kid.exists || !hist.exists) throw new Error('找不到存檔或歷史');
        var cur = kid.data();
        var expireAt = root.firebase.firestore.Timestamp.fromMillis(Date.now() + 30 * 86400000);   // 跟裝置寫的歷史一樣留 30 天
        tx.set(kidRef.collection('history').doc(), { rev: cur.rev, data: cur.data, at: ts(), by: 'admin', reason: 'before-restore', expireAt: expireAt });
        var restoredAt = Date.now();
        tx.update(kidRef, { data: hist.data().data, rev: cur.rev + 1, updatedAt: ts(), by: 'admin', restoredAt: restoredAt, link: cur.link || null, wids: [] });
        return { rev: cur.rev + 1, restoredAt: restoredAt };
      });
    });
  }

  var api = { summary: summary, findPlayers: findPlayers, loadFamily: loadFamily, loadHistory: loadHistory, pruneExpired: pruneExpired, restore: restore };
  root.PLS_ADMIN_FAMILY = api;
})(typeof window !== 'undefined' ? window : globalThis);
