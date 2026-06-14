// gen.js — 動態出題引擎(不寫死題庫)
// 每個出題函式回傳:
// { kind:'number'|'shape'|'compose'|'visual',
//   display: {...依 kind 而異},
//   say: 'TTS 唸題文字(繁中)',
//   answer: 正解值, options: [選項...](含正解,已洗牌) }
(function () {
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[ri(0, arr.length - 1)]; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = ri(0, i); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // 數字轉中文(1~99)
  const DIG = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  function numZh(n) {
    if (n < 10) return DIG[n];
    const t = Math.floor(n / 10), u = n % 10;
    let s = (t === 1 ? '十' : DIG[t] + '十');
    if (u > 0) s += DIG[u];
    return s;
  }

  // 數字選項:正解 + 2 個干擾(diff 0~2 控制干擾遠近)
  function numOptions(ans, diff) {
    const close = diff >= 2 ? [1, 2] : diff === 1 ? [1, 2, 3, 10] : [2, 3, 10, 5];
    const set = new Set([ans]);
    let guard = 0;
    while (set.size < 3 && guard++ < 60) {
      const d = pick(close) * (Math.random() < 0.5 ? -1 : 1);
      const v = ans + d;
      if (v >= 0 && v <= 99 && !set.has(v)) set.add(v);
    }
    while (set.size < 3) set.add(ans + set.size);
    return shuffle([...set]);
  }

  // 小數字選項:干擾距離 1~3,限定在 [lo, hi]
  function numOptionsSmall(ans, lo, hi) {
    const set = new Set([ans]);
    let guard = 0;
    while (set.size < 3 && guard++ < 80) {
      const d = ri(1, 3) * (Math.random() < 0.5 ? -1 : 1);
      const v = ans + d;
      if (v >= lo && v <= hi && !set.has(v)) set.add(v);
    }
    let f = lo;
    while (set.size < 3 && f <= hi) { if (!set.has(f)) set.add(f); f++; }
    while (set.size < 3) set.add(ans + set.size);
    return shuffle([...set]);
  }

  const gen = {};

  // 【入門階梯】十以內加法(純數字,和 ≤ 10)
  gen.addWithin10 = function () {
    const a = ri(1, 8);
    const b = ri(1, Math.min(9, 10 - a));
    const ans = a + b;
    return {
      kind: 'number', display: { a: a, op: '+', b: b },
      say: numZh(a) + ' 加 ' + numZh(b) + ',等於多少?',
      answer: ans, options: numOptionsSmall(ans, 0, 12)
    };
  };

  // 【入門階梯】十以內減法(不會變負)
  gen.subWithin10 = function () {
    const a = ri(2, 10);
    const b = ri(1, a - 1);
    const ans = a - b;
    return {
      kind: 'number', display: { a: a, op: '−', b: b },
      say: numZh(a) + ' 減 ' + numZh(b) + ',等於多少?',
      answer: ans, options: numOptionsSmall(ans, 0, 10)
    };
  };

  // 【入門階梯】二十以內加法(可跨十,和 ≤ 20)
  gen.addWithin20 = function () {
    const a = ri(3, 14);
    const b = ri(1, Math.min(9, 20 - a));
    const ans = a + b;
    return {
      kind: 'number', display: { a: a, op: '+', b: b },
      say: numZh(a) + ' 加 ' + numZh(b) + ',等於多少?',
      answer: ans, options: numOptionsSmall(ans, 0, 22)
    };
  };

  // m1 圖案相加(視覺化,和 ≤ 10)
  gen.visualAdd = function (diff) {
    const max = diff >= 2 ? 5 : 4;
    const a = ri(1, max), b = ri(1, Math.min(max, 10 - a));
    const fruit = pick(['apple', 'strawberry', 'orange', 'banana']);
    const ans = a + b;
    return {
      kind: 'visual',
      display: { a: a, b: b, fruit: fruit },
      say: numZh(a) + '個加' + numZh(b) + '個,一共有幾個?',
      answer: ans, options: numOptions(ans, 2)
    };
  };

  // m2 兩位數+一位數,個位相加 ≤ 9(不進位)
  gen.addNoCarry = function (diff) {
    const t = ri(1, diff >= 1 ? 9 : 6), u = ri(0, 8);
    const b = ri(1, 9 - u);
    const a = t * 10 + u, ans = a + b;
    return {
      kind: 'number',
      display: { a: a, op: '+', b: b },
      say: numZh(a) + ' 加 ' + numZh(b) + ',等於多少?',
      answer: ans, options: numOptions(ans, diff)
    };
  };

  // m3 兩位數+一位數,會進位,和 ≤ 99
  gen.addCarry = function (diff) {
    let a, b, guard = 0;
    do {
      a = ri(10, 89);
      const u = a % 10;
      b = ri(Math.max(1, 10 - u), 9);
    } while (a + b > 99 && guard++ < 50);
    const ans = a + b;
    return {
      kind: 'number',
      display: { a: a, op: '+', b: b },
      say: numZh(a) + ' 加 ' + numZh(b) + ',等於多少?',
      answer: ans, options: numOptions(ans, diff)
    };
  };

  // m4 兩位數−一位數(會退位):例如 12 − 6 = 6
  // 約六成會退位,讓孩子練習借位;其餘不退位以維持節奏
  gen.subOne = function (diff) {
    const t = ri(1, 9);
    let a, b;
    if (Math.random() < 0.6) {       // 退位:減數比個位大
      const u = ri(0, 8);
      a = t * 10 + u;
      b = ri(u + 1, 9);
    } else {                         // 不退位
      const u = ri(1, 9);
      a = t * 10 + u;
      b = ri(1, u);
    }
    const ans = a - b;
    return {
      kind: 'number',
      display: { a: a, op: '−', b: b },
      say: numZh(a) + ' 減 ' + numZh(b) + ',等於多少?',
      answer: ans, options: numOptions(ans, diff)
    };
  };

  // m5 兩位數−兩位數,個位十位都不退位
  gen.subTwo = function (diff) {
    const t1 = ri(2, 9), u1 = ri(1, 9);
    const t2 = ri(1, t1 - 1), u2 = ri(0, u1);
    const a = t1 * 10 + u1, b = t2 * 10 + u2, ans = a - b;
    return {
      kind: 'number',
      display: { a: a, op: '−', b: b },
      say: numZh(a) + ' 減 ' + numZh(b) + ',等於多少?',
      answer: ans, options: numOptions(ans, diff)
    };
  };

  // m6 幾何圖形辨認:找出指定形狀
  const SHAPES = [
    { id: 'circle', zh: '圓形' },
    { id: 'triangle', zh: '三角形' },
    { id: 'square', zh: '正方形' },
    { id: 'rect', zh: '長方形' },
    { id: 'star', zh: '星星' },
    { id: 'oval', zh: '橢圓形' },
    { id: 'diamond', zh: '菱形' },
    { id: 'heart', zh: '愛心' }
  ];
  gen.shapeFind = function () {
    const target = pick(SHAPES);
    const others = shuffle(SHAPES.filter(function (s) { return s.id !== target.id; })).slice(0, 2);
    return {
      kind: 'shape',
      display: { targetZh: target.zh },
      say: '找一找,哪一個是' + target.zh + '?',
      answer: target.id,
      options: shuffle([target].concat(others)).map(function (s) { return s.id; })
    };
  };

  // m7 圖形拼補:哪兩塊合起來是這個形狀?
  // pieces 由 art.js 依 key 繪製
  const COMPOSE = [
    { target: 'square', zh: '正方形', good: ['tri2', 'rect2', 'tri2b'], bad: ['semi2', 'triCir', 'sq2', 'rect2v'] },
    { target: 'circle', zh: '圓形', good: ['semi2', 'semi2h'], bad: ['tri2', 'rect2', 'triCir', 'sq2'] },
    { target: 'rect', zh: '長方形', good: ['sq2', 'rect2v'], bad: ['semi2', 'triCir', 'tri2w', 'tri2'] },
    { target: 'triangle', zh: '三角形', good: ['tri2w', 'tri2L'], bad: ['semi2', 'sq2', 'triCir', 'rect2'] }
  ];
  gen.shapeCompose = function () {
    const c = pick(COMPOSE);
    const good = pick(c.good);
    const bads = shuffle(c.bad.filter(function (b) { return c.good.indexOf(b) < 0; })).slice(0, 2);
    return {
      kind: 'compose',
      display: { target: c.target, targetZh: c.zh },
      say: '哪兩塊積木合起來,會變成' + c.zh + '?',
      answer: good,
      options: shuffle([good].concat(bads))
    };
  };

  // ── 小二進階(先上鎖,規則已備好)──────────────────────
  gen.addBig = function (diff) { // 兩位數+兩位數(可進位,和 ≤ 99)
    let a, b, g = 0;
    do { a = ri(10, 88); b = ri(10, 89 - Math.floor(a / 2)); } while (a + b > 99 && g++ < 50);
    const ans = a + b;
    return { kind: 'number', display: { a: a, op: '+', b: b }, say: numZh(a) + ' 加 ' + numZh(b) + ',等於多少?', answer: ans, options: numOptions(ans, diff) };
  };
  gen.subBorrow = function (diff) { // 退位減法
    let a, b, g = 0;
    do { a = ri(20, 99); b = ri(2, 19); } while ((a % 10) >= (b % 10) && g++ < 80);
    const ans = a - b;
    return { kind: 'number', display: { a: a, op: '−', b: b }, say: numZh(a) + ' 減 ' + numZh(b) + ',等於多少?', answer: ans, options: numOptions(ans, diff) };
  };
  gen.mulIntro = function () { // 乘法初體驗(幾個幾)
    const a = ri(2, 5), b = ri(2, 5), ans = a * b;
    return { kind: 'number', display: { a: a, op: '×', b: b }, say: numZh(a) + ' 乘 ' + numZh(b) + ',等於多少?', answer: ans, options: numOptions(ans, 1) };
  };

  // 同數連加過渡(乘法預備)— 先呈現加法串,再統計答案
  gen.mulBridge = function () {
    const a = ri(2, 4), b = ri(2, 4);
    const ans = a * b;
    const parts = [];
    for (var k = 0; k < b; k++) parts.push(String(a));
    const chain = parts.join(' + ');
    return {
      kind: 'repeatadd',
      display: { a: a, b: b, chain: chain },
      say: numZh(b) + '個' + numZh(a) + '相加,一共是多少?',
      answer: ans,
      options: numOptions(ans, 1)
    };
  };

  window.PLS_GEN = { gen: gen, numZh: numZh, ri: ri, pick: pick, shuffle: shuffle };
})();
