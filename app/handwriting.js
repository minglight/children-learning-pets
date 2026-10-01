// handwriting.js — 手寫字母比對(window.PLS_HW)
// ─────────────────────────────────────────────────────────────
// 用途:小朋友在格子裡「自己寫」(沒有虛線)或「描寫」一個字母後,判斷寫的是不是要的那個字母。
//
// 設計理念(why):
//  • 答案是哪個字母我們已經知道,所以這是「驗證」不是「辨識」——只要它夠像目標、而且沒有明顯更像別的字母就算對。
//  • 範本直接用 letters.js 的筆順骨架(跟描寫卡上畫的是同一套字形),再加幾種小朋友常見的不同寫法(ALT)。
//  • 比對用 $P+ 點雲辨識(Vatavu 2017,改良自 $P / Vatavu, Anthony & Wobbrock 2012):把筆畫重新取樣成 N 個點、
//    縮放成同一大小,每點再記一個「轉角」,算兩團點雲最近點配對的距離。不看筆順、筆畫方向、寫了幾筆
//    → 筆順不對、一筆連著寫也認得出來。不做旋轉正規化 → b/d、p/q、n/u 這種鏡像、倒過來的字分得開。
//  • 只跟「同大小寫」的字母比:單字是小寫就只跟小寫比,i/I、y/Y 這種只差一點點的不互相搶。
//  • 大小寫同形的字(c/C、o/O、s/S…)只差大小和位置,當成同一個字,寫太大不算錯。
//  • 純 JS、完全離線、不需要模型檔;一個字母比對 52+ 個範本約幾毫秒。
//
// 用法:
//  PLS_HW.check(strokes, 'f')  → { ok, d, other, best:[{ch,d}…], reason }
//     strokes = [[{x,y},…], …](螢幕座標即可,會自己縮放置中)
//  PLS_HW.rank(strokes)        → [{ch, d}, …] 由像到不像(除錯/預覽頁用)
//  PLS_HW.TUNE                 → 判定門檻(handwriting-preview.html 可以即時調整試寫)
(function () {
  'use strict';

  const N = 32;                 // 每個字重新取樣成幾個點($P 論文建議 32)
  const MAX_STROKES = 12;       // 超過就只取最長的 12 筆(正常字母最多 4 筆,再多是亂畫)

  // 判定門檻(2026-10-01 用模擬手寫校準:骨架加上歪斜、錯位、抖動、頭尾長短、亂筆順、一筆連寫,52 字母各數十筆;
  // 重跑校準:handwriting-preview.html 的「模擬手寫自我測試」):
  //  abs      — 跟目標字母的距離上限(超過 = 不像這個字的任何寫法)
  //  ratio    — 目標距離 ÷ 最像的「別的字母」距離 的上限;>1 代表「跟別的字母差不多像」也算對。
  //             刻意偏寬鬆:中等歪斜約 98% 寫對會過、寫錯的字約 5% 會被放過(寧可放過,不要冤枉小朋友)
  //  sameCase — 只跟同大小寫的字母比
  const TUNE = { abs: 0.30, ratio: 1.25, sameCase: true };

  // 小朋友常見的其他寫法(座標系同 letters.js:CAP=0、x-height=50、baseline=100、下伸部≈128)
  const ALT = {
    I: [['M46 8 L46 100']],                                              // 沒有上下橫的 I
    J: [['M62 8 L62 72 A22 22 0 0 1 20 70']],                            // 沒有頂橫的 J
    a: [['M30 60 C36 50 62 50 62 64 L62 100', 'M62 74 C40 70 26 78 28 90 C30 102 54 100 62 88']], // 雙層 a
    t: [['M50 22 L50 100', 'M32 52 L68 52']],                            // 沒有底鉤的 t
    y: [['M28 52 L28 80 A18 18 0 0 0 64 80', 'M64 52 L64 112 A18 16 0 0 1 32 116']],  // u 形 y
    f: [['M62 26 A16 14 0 0 0 40 30 L40 100', 'M28 56 L56 56']],
    q: [['M64 56 C40 56 26 64 26 78 C26 92 40 100 64 100', 'M64 52 L64 128 L74 120']], // 尾巴往右勾
    G: [['M80 28 A33 36 0 1 0 80 80 L80 56 L58 56']],                    // 一筆寫完的 G
    k: [['M28 8 L28 100', 'M62 56 L30 78 L64 100']]                      // 兩斜線一筆
  };

  // 大小寫同形(只差大小/位置)→ 視為同一個字
  const EQUIV = ['cC', 'oO', 'sS', 'uU', 'vV', 'wW', 'xX', 'zZ', 'pP', 'kK'];
  function sameSet(ch) {
    for (let i = 0; i < EQUIV.length; i++) if (EQUIV[i].indexOf(ch) >= 0) return EQUIV[i].split('');
    return [ch];
  }

  function isUpper(ch) { return ch >= 'A' && ch <= 'Z'; }

  function pathLen(s) {
    let L = 0;
    for (let i = 1; i < s.length; i++) L += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
    return L;
  }

  // 一筆取樣成 k 個等距點;k=1 用整筆的平均點(點一下的 i 點、j 點)
  function resampleStroke(s, k) {
    if (k <= 1 || s.length === 1) {
      let sx = 0, sy = 0;
      s.forEach(function (p) { sx += p.x; sy += p.y; });
      const c = { x: sx / s.length, y: sy / s.length };
      const out = []; for (let i = 0; i < k; i++) out.push(c); return out;
    }
    const L = pathLen(s);
    if (L <= 0) { const out = []; for (let i = 0; i < k; i++) out.push(s[0]); return out; }
    const I = L / (k - 1), out = [{ x: s[0].x, y: s[0].y }];
    let acc = 0, prev = s[0];
    for (let i = 1; i < s.length && out.length < k; i++) {
      let cur = s[i], d = Math.hypot(cur.x - prev.x, cur.y - prev.y);
      while (d > 0 && acc + d >= I && out.length < k) {
        const t = (I - acc) / d;
        const q = { x: prev.x + t * (cur.x - prev.x), y: prev.y + t * (cur.y - prev.y) };
        out.push(q); prev = q; d = Math.hypot(cur.x - prev.x, cur.y - prev.y); acc = 0;
      }
      acc += d; prev = cur;
    }
    while (out.length < k) out.push(s[s.length - 1]);
    return out;
  }

  // 筆畫 → N 個點,縮放到最長邊 = 1、重心移到原點。點太少或只有一個點 → null
  function normalize(strokes) {
    let ss = (strokes || []).filter(function (s) { return s && s.length; });
    if (!ss.length) return null;
    if (ss.length > MAX_STROKES) ss = ss.slice().sort(function (a, b) { return pathLen(b) - pathLen(a); }).slice(0, MAX_STROKES);
    const lens = ss.map(pathLen);
    const total = lens.reduce(function (a, b) { return a + b; }, 0);
    if (total <= 0) return null;
    // 依長度分配點數,每筆至少 1 點(點一下的「點」才不會被吃掉)
    const counts = lens.map(function (l) { return Math.max(1, Math.round(N * l / total)); });
    let longest = 0; lens.forEach(function (l, i) { if (l > lens[longest]) longest = i; });
    counts[longest] += N - counts.reduce(function (a, b) { return a + b; }, 0);
    if (counts[longest] < 1) return null;
    let pts = [];
    // 每點另記「轉角」a(0=直走、1=折返,不分方向):$P+ 用它分辨 U/V、O/D 這種點雲很像、轉折不同的字
    ss.forEach(function (s, i) {
      const r = resampleStroke(s, counts[i]);
      r.forEach(function (p, j) {
        let a = 0;
        if (j > 0 && j < r.length - 1) {
          const ux = p.x - r[j - 1].x, uy = p.y - r[j - 1].y, vx = r[j + 1].x - p.x, vy = r[j + 1].y - p.y;
          const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
          if (lu > 0 && lv > 0) a = Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (lu * lv)))) / Math.PI;
        }
        pts.push({ x: p.x, y: p.y, a: a });
      });
    });
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    pts.forEach(function (p) {
      if (p.x < minx) minx = p.x; if (p.x > maxx) maxx = p.x;
      if (p.y < miny) miny = p.y; if (p.y > maxy) maxy = p.y;
    });
    const size = Math.max(maxx - minx, maxy - miny);
    if (size < 1e-6) return null;
    pts = pts.map(function (p) { return { x: (p.x - minx) / size, y: (p.y - miny) / size, a: p.a }; });
    let cx = 0, cy = 0;
    pts.forEach(function (p) { cx += p.x; cy += p.y; });
    cx /= pts.length; cy /= pts.length;
    return pts.map(function (p) { return { x: p.x - cx, y: p.y - cy, a: p.a }; });
  }

  // $P+(Vatavu 2017):距離多算一維「轉角」;一對多配對(每點找最近的,沒被配到的範本點再補算),
  // 對筆畫抖、多畫少畫比較寬容,也比 $P 快(不用試多個起點)。
  function plusDistance(a, b) {
    const n = a.length, m = b.length, cnt = new Uint16Array(m);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      let min = Infinity, idx = 0;
      for (let j = 0; j < m; j++) {
        const dx = a[i].x - b[j].x, dy = a[i].y - b[j].y, da = a[i].a - b[j].a, d = dx * dx + dy * dy + da * da;
        if (d < min) { min = d; idx = j; }
      }
      cnt[idx]++; sum += Math.sqrt(min);
    }
    for (let j = 0; j < m; j++) {
      if (cnt[j]) continue;
      let min = Infinity;
      for (let i = 0; i < n; i++) {
        const dx = a[i].x - b[j].x, dy = a[i].y - b[j].y, da = a[i].a - b[j].a, d = dx * dx + dy * dy + da * da;
        if (d < min) min = d;
      }
      sum += Math.sqrt(min);
    }
    return sum;
  }
  function plusMatch(a, b) { return Math.min(plusDistance(a, b), plusDistance(b, a)) / N; }


  let _tpl = null;   // [{ch, pts}]
  function templates() {
    if (_tpl) return _tpl;
    const L = window.PLS_LETTERS;
    _tpl = [];
    if (!L || !L.chars) return _tpl;
    L.chars().forEach(function (ch) {
      const p = normalize(L.strokesOf(ch));
      if (p) _tpl.push({ ch: ch, pts: p });
      (ALT[ch] || []).forEach(function (ds) {
        const q = normalize(L.samplePaths(ds));
        if (q) _tpl.push({ ch: ch, pts: q, alt: true });
      });
    });
    return _tpl;
  }

  // 每個字母取它所有寫法裡最像的距離,由小到大
  function rankPts(pts) {
    const best = {};
    templates().forEach(function (t) {
      const d = plusMatch(pts, t.pts);
      if (best[t.ch] == null || d < best[t.ch]) best[t.ch] = d;
    });
    return Object.keys(best).map(function (ch) { return { ch: ch, d: best[ch] }; })
      .sort(function (a, b) { return a.d - b.d; });
  }

  function rank(strokes) {
    const pts = normalize(strokes);
    return pts ? rankPts(pts) : [];
  }

  function has(ch) { return templates().some(function (t) { return t.ch === ch; }); }

  function check(strokes, target) {
    if (!has(target)) return { ok: true, reason: 'no-template', best: [] };   // 沒範本(標點等)不擋
    const pts = normalize(strokes);
    if (!pts) return { ok: false, reason: 'empty', best: [] };
    const r = rankPts(pts);
    const same = sameSet(target);
    let d = Infinity, other = Infinity, otherCh = null;
    // 只跟「同大小寫」的字母比(單字是小寫就只跟小寫比):i/I、y/Y 這種大小寫差一點點的不互相搶;
    // 位置與大小本來就不看,寫成大寫也不會因此判錯。
    const up = isUpper(target);
    r.forEach(function (e) {
      if (same.indexOf(e.ch) >= 0) { if (e.d < d) d = e.d; }
      else if ((!TUNE.sameCase || isUpper(e.ch) === up) && e.d < other) { other = e.d; otherCh = e.ch; }
    });
    let reason = 'ok';
    if (d > TUNE.abs) reason = 'unlike';                   // 寫得不像這個字
    else if (d > other * TUNE.ratio) reason = 'looks-like'; // 比較像別的字(例如 b 寫成 d)
    return { ok: reason === 'ok', reason: reason, d: d, other: other, otherCh: otherCh, best: r.slice(0, 5) };
  }

  window.PLS_HW = { check: check, rank: rank, has: has, sameSet: sameSet, TUNE: TUNE, _alt: ALT, _normalize: normalize, _match: plusMatch, _templates: templates };
})();
