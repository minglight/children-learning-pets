// admin.js — 維運後台邏輯:Email/Password 登入(跟小孩用的匿名登入是完全不同的帳號系統),
// 使用狀況總覽 + 好友代碼→還原碼查詢。權限邊界全部在 firestore.rules 的 isAdmin() 檢查,
// 不是靠這個頁面的網址保密 —— 沒有 admin 帳密登入,規則會直接拒絕讀取。
// 這個頁面刻意不放進 sw.js 的快取清單、不從小孩看得到的畫面連結過去。
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

  function renderOverview(counts, rows) {
    $('count-rabbit').textContent = counts.rabbit;
    $('count-hamster').textContent = counts.hamster;
    const tbody = $('activity-body');
    tbody.textContent = '';
    rows.forEach(function (p) {
      const tr = document.createElement('tr');
      const kindLabel = (CFG.pets[p.petKind] && CFG.pets[p.petKind].name) || p.petKind || '';
      [p.childNickname || '(未設定)', kindLabel, p.friendCode || '', fmtTime(p.status && p.status.updatedAt)]
        .forEach(function (v) {
          const td = document.createElement('td');
          td.textContent = v;
          tr.appendChild(td);
        });
      tbody.appendChild(tr);
    });
  }

  function countByKind(kind) {
    var q = db.collection('players').where('petKind', '==', kind);
    if (q.count) {
      return q.count().get().then(function (snap) { return snap.data().count; })
        .catch(function () { return q.get().then(function (qs) { return qs.size; }); });
    }
    return q.get().then(function (qs) { return qs.size; });
  }

  function loadOverview() {
    $('overview-err').textContent = '';
    Promise.all([countByKind('rabbit'), countByKind('hamster')]).then(function (res) {
      var counts = { rabbit: res[0], hamster: res[1] };
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
          const kindLabel = (CFG.pets[p.petKind] && CFG.pets[p.petKind].name) || p.petKind || '';
          const box = $('lookup-result');
          box.textContent = '';
          [
            '小朋友:' + (p.childNickname || '(未設定)') + '的' + kindLabel,
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
