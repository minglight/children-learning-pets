// sync-merge.js — 多裝置同步的三方合併(純函式,不碰 localStorage / Firestore)。
// 用在 app/family.js:同一個小孩在兩台裝置都改過存檔時,用「上次同步的版本(base)」把兩邊的改動合在一起,
// 讓點數、過關次數、背包數量這類計數不會因為「誰最後存檔誰贏」而被吃掉。規則見 docs/cloud-friends-schema.md「家庭同步」。
//
// merge3(base, local, remote):
//   - 只有一邊改過 → 取改過的那邊。
//   - 兩邊都改過:
//     數字:MAX_KEYS 取大、LOCAL_KEYS 取本機,其他當計數加差值(base + Δ本機 + Δ遠端,最小 0)。
//     帶 date 字串的物件(daily/care/wish):日期不同 → 整個取日期新的(日期當數字比,'2026-11-9' 不補 0);
//       相同 → 逐欄位合併;base 是別天的(跨日後兩台都歸零重算過)就把 base 當空的,今天的計數兩邊相加。
//     陣列:布林陣列逐格 OR;跟 base 一樣長的物件陣列逐格合併;其他做三方集合合併:
//       兩邊都還在的 + 本機新增的 + 遠端新增的(本機順序在前);任一邊刪掉/重置掉的 base 元素就不再加回來
//       (hwRound 描滿一輪重置、珍藏換配件、memo 擠掉舊的)。memo 只留最後 MEMO_MAX 筆。
//     布林:OR_KEYS(cleared)取 OR。
//     其他(字串、布林、null、型別不同):取本機(正在用的這台,小朋友剛做的事不要消失)。
(function (root) {
  var MAX_KEYS = { _v: 1, bestRate: 1 };
  var LOCAL_KEYS = { deco: 1 };
  var OR_KEYS = { cleared: 1 };   // 布林:任一台過關就算過關
  var MEMO_MAX = 20;

  function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  // 跟欄位順序無關的比較(兩台裝置存檔的 key 順序可能不同)
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (isObj(v)) return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + stable(v[k]); }).join(',') + '}';
    return v === undefined ? 'undefined' : JSON.stringify(v);
  }
  function same(a, b) { return stable(a) === stable(b); }
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  // 'YYYY-M-D'(不補 0)→ 可比大小的數字;格式不對回 NaN
  function dateNum(s) {
    var p = String(s || '').split('-');
    return p.length === 3 ? (+p[0]) * 10000 + (+p[1]) * 100 + (+p[2]) : NaN;
  }

  function mergeNumber(key, b, l, r) {
    if (MAX_KEYS[key]) return Math.max(l, r);
    if (LOCAL_KEYS[key]) return l;
    var base = typeof b === 'number' ? b : 0;
    return Math.max(0, base + (l - base) + (r - base));
  }

  function mergeArray(key, b, l, r) {
    var bools = function (a) { return a.every(function (x) { return typeof x === 'boolean'; }); };
    if (bools(l) && bools(r)) {
      var n = Math.max(l.length, r.length), out = [];
      for (var i = 0; i < n; i++) out.push(!!l[i] || !!r[i]);
      return out;
    }
    if (Array.isArray(b) && b.length === l.length && b.length === r.length &&
        l.every(isObj) && r.every(isObj)) {
      return l.map(function (x, i) { return merge(String(i), b[i], x, r[i]); });
    }
    var count = function (a) { var m = {}; (a || []).forEach(function (x) { var k = stable(x); m[k] = (m[k] || 0) + 1; }); return m; };
    var inB = Array.isArray(b) ? count(b) : {}, inL = count(l), inR = count(r);
    var seen = {}, res = [];
    l.concat(r).forEach(function (x) {
      var k = stable(x);
      if (seen[k]) return;
      // base 有、但某一邊已經沒有 → 那邊刪掉或重置了,不加回來
      if (inB[k] && (!inL[k] || !inR[k])) return;
      seen[k] = true; res.push(clone(x));
    });
    if (key === 'memo' && res.length > MEMO_MAX) res = res.slice(res.length - MEMO_MAX);
    return res;
  }

  function merge(key, b, l, r) {
    if (same(l, b)) return clone(r);
    if (same(r, b)) return clone(l);
    // 數字與物件不能用「兩邊一樣就取一邊」:兩台各加 1 點是兩件事,要加成 +2
    if (typeof l === 'number' && typeof r === 'number') return mergeNumber(key, b, l, r);
    if (same(l, r) && !isObj(l)) return clone(l);
    if (OR_KEYS[key] && typeof l === 'boolean' && typeof r === 'boolean') return l || r;
    if (Array.isArray(l) && Array.isArray(r)) return mergeArray(key, b, l, r);
    if (isObj(l) && isObj(r)) {
      if (typeof l.date === 'string' && typeof r.date === 'string' && l.date !== r.date) {
        return clone(dateNum(l.date) >= dateNum(r.date) ? l : r);
      }
      var bo = isObj(b) ? b : {}, out = {};
      if (typeof l.date === 'string' && bo.date !== l.date) bo = {};   // base 是別天的:今天的計數從 0 算
      Object.keys(l).concat(Object.keys(r)).forEach(function (k) {
        if (k in out) return;
        if (!(k in r)) { if (!(k in bo) || !same(l[k], bo[k])) out[k] = clone(l[k]); return; }   // 遠端刪掉、本機沒動 → 跟著刪
        if (!(k in l)) { if (!(k in bo) || !same(r[k], bo[k])) out[k] = clone(r[k]); return; }
        out[k] = merge(k, bo[k], l[k], r[k]);
      });
      return out;
    }
    return clone(l);
  }

  function merge3(base, local, remote) {
    if (local === undefined || local === null) return clone(remote);
    if (remote === undefined || remote === null) return clone(local);
    return merge('', base, local, remote);
  }

  var api = { merge3: merge3, equal: same, MEMO_MAX: MEMO_MAX };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PLS_MERGE = api;
})(typeof window !== 'undefined' ? window : this);
