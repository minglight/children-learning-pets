// admin.js — 維運後台邏輯:Email/Password 登入(跟小孩用的匿名登入是完全不同的帳號系統),
// 使用狀況總覽 + 好友代碼→還原碼查詢 + 家庭存檔歷史與還原(SEC-380)。權限邊界全部在 firestore.rules 的 isAdmin() 檢查
// (寫死單一管理員 email,不是「所有家長都是 admin」),不是靠這個頁面的網址保密 ——
// 沒有 admin 帳密登入,規則會直接拒絕讀取。這個頁面刻意不放進 sw.js 的快取清單、不從小孩看得到的畫面連結過去。
(function () {
  const CFG = window.PLS_CONFIG;
  var db = null, auth = null;

  function $(id) { return document.getElementById(id); }
  function show(id, on) { $(id).style.display = on ? 'block' : 'none'; }
  function fmtTime(ts) {
    if (!ts) return '—';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString();
  }
  function speciesLabel(species) { return (CFG.pets[species] && CFG.pets[species].name) || species || ''; }

  function renderOverview(counts, rows) {
    const box = $('counts-row');
    box.textContent = '';
    Object.keys(CFG.pets).forEach(function (species) {
      const d = document.createElement('div');
      const label = document.createTextNode(speciesLabel(species) + ' player 數');
      const b = document.createElement('b');
      b.textContent = counts[species] != null ? counts[species] : '—';
      d.appendChild(label); d.appendChild(b);
      box.appendChild(d);
    });
    const tbody = $('activity-body');
    tbody.textContent = '';
    rows.forEach(function (p) {
      const tr = document.createElement('tr');
      [p.childNickname || '(未設定)', speciesLabel(p.species), p.friendCode || '', fmtTime(p.status && p.status.updatedAt)]
        .forEach(function (v) {
          const td = document.createElement('td');
          td.textContent = v;
          tr.appendChild(td);
        });
      tr.appendChild(familyCell(p.familyId));
      tbody.appendChild(tr);
    });
  }

  function countBySpecies(species) {
    var q = db.collection('players').where('species', '==', species);
    if (q.count) {
      return q.count().get().then(function (snap) { return snap.data().count; })
        .catch(function () { return q.get().then(function (qs) { return qs.size; }); });
    }
    return q.get().then(function (qs) { return qs.size; });
  }

  function loadOverview() {
    $('overview-err').textContent = '';
    const species = Object.keys(CFG.pets);
    Promise.all(species.map(countBySpecies)).then(function (res) {
      var counts = {};
      species.forEach(function (s, i) { counts[s] = res[i]; });
      db.collection('players').orderBy('status.updatedAt', 'desc').limit(30).get().then(function (qs) {
        var rows = [];
        qs.forEach(function (d) { rows.push(d.data()); });
        renderOverview(counts, rows);
      }).catch(function (err) {
        renderOverview(counts, []);
        $('overview-err').textContent = '活躍清單載入失敗:' + (err && err.message ? err.message : '');
      });
    }).catch(function () {
      $('overview-err').textContent = '總覽載入失敗,請確認這個帳號是否有 admin 權限。';
    });
  }

  // ── 查詢:好友代碼 → 還原碼(僅顯示還原碼,不讀取實際進度內容)──
  $('lookup-btn').addEventListener('click', function () {
    const code = $('lookup-code').value.trim().toUpperCase();
    $('lookup-result').textContent = '';
    $('lookup-err').textContent = '';
    if (!code) return;
    db.collection('friendCodes').doc(code).get().then(function (snap) {
      if (!snap.exists) { $('lookup-err').textContent = '找不到這個好友代碼'; return; }
      const playerId = snap.data().playerId;
      return db.collection('players').doc(playerId).get().then(function (pSnap) {
        if (!pSnap.exists) { $('lookup-err').textContent = '找不到對應的玩家資料'; return; }
        const p = pSnap.data();
        return db.collection('players').doc(playerId).collection('private').doc('meta').get().then(function (mSnap) {
          const box = $('lookup-result');
          box.textContent = '';
          [
            '小朋友:' + (p.childNickname || '(未設定)') + '的' + speciesLabel(p.species),
            '還原碼:' + (mSnap.exists ? mSnap.data().restoreCode : '(查無)'),
            '最後同步:' + fmtTime(mSnap.exists ? mSnap.data().lastSeenAt : null)
          ].forEach(function (line) {
            const p2 = document.createElement('p');
            p2.textContent = line;
            box.appendChild(p2);
          });
        });
      });
    }).catch(function () {
      $('lookup-err').textContent = '查詢失敗(可能沒有權限,請確認登入帳號是否為管理員)';
    });
  });

  // ── 家庭與存檔還原(SEC-380;資料邏輯在 app/admin-family.js)──
  const AF = window.PLS_ADMIN_FAMILY;
  const SLOT_LABEL = { kidL: '左邊小孩', kidR: '右邊小孩' };
  const REASON_LABEL = {
    hourly: '定時', 'join-replaced': '加入家庭前的本機版', 'before-restore': '還原前的版本', 'restore-replaced': '被還原蓋掉的本機版'
  };
  function el(tag, text, cls) {
    const e = document.createElement(tag);
    if (text != null) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }
  function familyCell(fid) {
    const td = document.createElement('td');
    if (!fid) { td.textContent = '—'; return td; }
    const b = el('button', '打開', 'ghost small');
    b.addEventListener('click', function () { openFamily(fid); });
    td.appendChild(b);
    return td;
  }
  function summaryText(s) {
    return (s.childNickname || '(未設定暱稱)') + ' · ' + (speciesLabel(s.species) || '未選寵物') + (s.name ? '「' + s.name + '」' : '') +
      ' · ' + s.stage + '(成長 ' + s.xp + ')· 點數 ' + s.points + ' · 過關 ' + s.clears + ' 次(' + s.levels + ' 關)· 珍藏 ' + s.collection;
  }

  $('fam-search-btn').addEventListener('click', function () {
    $('fam-err').textContent = '';
    $('fam-view').textContent = '';
    const table = $('fam-results');
    const tbody = table.querySelector('tbody');
    tbody.textContent = '';
    AF.findPlayers(db, $('fam-q').value).then(function (list) {
      if (!list.length) { table.style.display = 'none'; $('fam-err').textContent = '找不到這個好友代碼或暱稱'; return; }
      table.style.display = '';
      list.forEach(function (p) {
        const tr = document.createElement('tr');
        [p.childNickname || '(未設定)', speciesLabel(p.species), p.friendCode, fmtTime(p.updatedAt)].forEach(function (v) { tr.appendChild(el('td', v)); });
        if (p.familyId) tr.appendChild(familyCell(p.familyId));
        else tr.appendChild(el('td', '還沒升級到同步版', 'muted'));
        tbody.appendChild(tr);
      });
      if (list.length === 1 && list[0].familyId) openFamily(list[0].familyId);
    }).catch(function (err) { $('fam-err').textContent = '搜尋失敗:' + (err && err.message ? err.message : ''); });
  });

  function openFamily(fid) {
    const view = $('fam-view');
    view.textContent = '載入中…';
    AF.loadFamily(db, fid).then(function (f) {
      view.textContent = '';
      if (!f) { view.textContent = '找不到這個家庭'; return; }
      view.appendChild(el('p', '家庭 ' + f.familyId + ' · 配對碼 ' + f.pairCode + ' · 建立於 ' + fmtTime(f.createdAt), 'muted'));
      view.appendChild(el('p', '綁定的裝置:' + (f.members.length ? f.members.map(function (m) {
        return m.label + '(加入 ' + fmtTime(m.joinedAt) + ',最後上線 ' + fmtTime(m.lastSeenAt) + ')';
      }).join('、') : '沒有')));
      ['kidL', 'kidR'].forEach(function (slot) {
        const k = f.kids[slot];
        const box = el('div', null, 'kid-box');
        box.appendChild(el('h3', SLOT_LABEL[slot]));
        if (!k) { box.appendChild(el('p', '還沒有雲端存檔', 'muted')); view.appendChild(box); return; }
        box.appendChild(el('p', summaryText(k.summary)));
        box.appendChild(el('p', '版本 ' + k.rev + ' · 更新 ' + fmtTime(k.updatedAt) + (k.restoredAt ? ' · 上次還原 ' + new Date(k.restoredAt).toLocaleString() : '') +
          (k.link ? ' · 好友代碼 ' + k.link.friendCode : ''), 'muted'));
        const hb = el('button', '看歷史', 'ghost small');
        const hbox = el('div');
        hb.addEventListener('click', function () { showHistory(fid, slot, hbox); });
        box.appendChild(hb);
        box.appendChild(hbox);
        view.appendChild(box);
      });
    }).catch(function (err) { view.textContent = '載入失敗:' + (err && err.message ? err.message : ''); });
  }

  function showHistory(fid, slot, box) {
    box.textContent = '載入中…';
    // 先順手清過期歷史(清不掉不影響看歷史)
    AF.pruneExpired(db, fid, slot).catch(function () { return 0; }).then(function () {
      return AF.loadHistory(db, fid, slot, 50);
    }).then(function (list) {
      box.textContent = '';
      if (!list.length) { box.appendChild(el('p', '還沒有歷史(每小時最多留一筆)', 'muted')); return; }
      const table = document.createElement('table');
      const head = document.createElement('tr');
      ['時間', '版本', '原因', '內容', ''].forEach(function (h) { head.appendChild(el('th', h)); });
      table.appendChild(head);
      list.forEach(function (h) {
        const tr = document.createElement('tr');
        [fmtTime(h.at), String(h.rev), REASON_LABEL[h.reason] || h.reason, summaryText(h.summary)].forEach(function (v) { tr.appendChild(el('td', v)); });
        const td = document.createElement('td');
        const b = el('button', '還原到這一版', 'small');
        b.addEventListener('click', function () {
          if (!window.confirm('確定把' + SLOT_LABEL[slot] + '還原成 ' + fmtTime(h.at) + ' 的版本?\n(現在的版本會先存一筆歷史,所有綁定的裝置下次回首頁就會換成這一版)')) return;
          b.disabled = true;
          AF.restore(db, fid, slot, h.id).then(function () {
            window.alert('已還原。請家長把 App 關掉重開,或回到首頁。');
            openFamily(fid);
          }).catch(function (err) { b.disabled = false; window.alert('還原失敗:' + (err && err.message ? err.message : '')); });
        });
        td.appendChild(b);
        tr.appendChild(td);
        table.appendChild(tr);
      });
      box.appendChild(table);
    }).catch(function (err) { box.textContent = '載入失敗:' + (err && err.message ? err.message : ''); });
  }

  // ── 登入 ──
  $('login-btn').addEventListener('click', function () {
    $('login-err').textContent = '';
    const email = $('login-email').value.trim();
    const pw = $('login-pw').value;
    if (!email || !pw) { $('login-err').textContent = '請輸入 email 與密碼'; return; }
    auth.signInWithEmailAndPassword(email, pw).catch(function (err) {
      $('login-err').textContent = '登入失敗:' + (err && err.message ? err.message : '');
    });
  });
  $('logout-btn').addEventListener('click', function () { auth.signOut(); });

  function init() {
    if (!CFG || !CFG.firebase || !CFG.firebase.apiKey) {
      $('login-err').textContent = 'Firebase 尚未設定(app/config.js 的 CFG.firebase 是空的)';
      return;
    }
    firebase.initializeApp(CFG.firebase);
    db = firebase.firestore();
    auth = firebase.auth();
    auth.onAuthStateChanged(function (user) {
      if (user && user.email) {
        show('login-view', false);
        show('dashboard-view', true);
        $('who').textContent = user.email;
        loadOverview();
      } else {
        show('login-view', true);
        show('dashboard-view', false);
      }
    });
  }

  init();
})();
