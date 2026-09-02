// gen.js — 動態出題引擎(不寫死題庫)
// 每個出題函式回傳:
// { kind:'number'|'shape'|'compose'|'visual',
//   display: {...依 kind 而異},
//   say: 'TTS 唸題文字(繁中)',
//   answer: 正解值, options: [選項...](含正解,已洗牌),
//   dedupKey: (選填) {...只放影響題目本質的欄位} }
//
// ⚠ 判重複規則(quiz.js 的 next() 用來擋同一輪 10 題內出現同一題):
//   簽名 = kind + (dedupKey || display) + answer。如果 display 裡放了「純裝飾、不影響題目本質」
//   的欄位(例如 visualAdd 的水果圖案 fruit),不要讓它混進判重複的依據——同樣的數字只是換個水果,
//   對小朋友來說仍是「同一題」。這種情況要額外回傳 dedupKey,只放數字/答案/目標等真正決定題目的欄位。
//   新增出題函式時,只要 display 有裝飾用欄位,記得比照 gen.visualAdd 補 dedupKey。
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
  // 允許 0 當加數(機率約 12%),0+0 除外;和仍 ≤ 10
  gen.addWithin10 = function () {
    let a, b;
    if (Math.random() < 0.12) {
      // 含 0 的題目:0+n 或 n+0,n∈1..10
      const n = ri(1, 10);
      if (Math.random() < 0.5) { a = 0; b = n; } else { a = n; b = 0; }
    } else {
      a = ri(1, 9);
      b = ri(1, Math.min(9, 10 - a));
    }
    const ans = a + b;
    return {
      kind: 'number', display: { a: a, op: '+', b: b },
      say: numZh(a) + ' 加 ' + numZh(b) + ',等於多少?',
      answer: ans, options: numOptionsSmall(ans, 0, 12)
    };
  };

  // 【入門階梯】十以內減法(不會變負)
  // 允許 b=0 與 a−a(答案 0),合計機率約 15%;a 範圍 1..10
  gen.subWithin10 = function () {
    let a, b;
    if (Math.random() < 0.15) {
      // 含 0 的題目:n−0 或 n−n,n∈1..10
      a = ri(1, 10);
      b = Math.random() < 0.5 ? 0 : a;
    } else {
      a = ri(2, 10);
      b = ri(1, a - 1);
    }
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
      dedupKey: { a: a, b: b },   // fruit 只是裝飾,換水果不算「不同題」,判重複時排除
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

  // m6 幾何圖形辨認:找出指定形狀(含「顏色+形狀」變化題)
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
  // 顏色表(zh → hex)
  const COLORS = [
    { zh: '紅色', hex: '#E06A5E' },
    { zh: '橙色', hex: '#F2A93C' },
    { zh: '黃色', hex: '#F2CE5E' },
    { zh: '綠色', hex: '#7FB877' },
    { zh: '藍色', hex: '#6E9AD0' },
    { zh: '紫色', hex: '#B58ED0' },
    { zh: '粉色', hex: '#F2A0B5' }
  ];
  // 選項格式:'shapeId' 或 'shapeId|colorHex|colorZh'
  gen.shapeFind = function () {
    const target = pick(SHAPES);
    if (Math.random() < 0.6) {
      // 顏色+形狀變化題
      const targetColor = pick(COLORS);
      // 干擾:至少一個「同形狀不同色」、至少一個「不同形狀」
      const otherColors = shuffle(COLORS.filter(function (c) { return c.hex !== targetColor.hex; }));
      const sameShapeDiff = target.id + '|' + otherColors[0].hex + '|' + otherColors[0].zh;
      const diffShapes = shuffle(SHAPES.filter(function (s) { return s.id !== target.id; }));
      const diffShape = diffShapes[0];
      const diffShapeColor = pick(COLORS);
      const diffShapeOpt = diffShape.id + '|' + diffShapeColor.hex + '|' + diffShapeColor.zh;
      const targetOpt = target.id + '|' + targetColor.hex + '|' + targetColor.zh;
      return {
        kind: 'shape',
        display: { targetZh: targetColor.zh + '的' + target.zh, colorHex: targetColor.hex },
        say: '找一找,' + targetColor.zh + '的' + target.zh + '?',
        answer: targetOpt,
        options: shuffle([targetOpt, sameShapeDiff, diffShapeOpt])
      };
    } else {
      // 純形狀題(向下相容)
      const others = shuffle(SHAPES.filter(function (s) { return s.id !== target.id; })).slice(0, 2);
      return {
        kind: 'shape',
        display: { targetZh: target.zh },
        say: '找一找,哪一個是' + target.zh + '?',
        answer: target.id,
        options: shuffle([target].concat(others)).map(function (s) { return s.id; })
      };
    }
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
    const opts = shuffle([good].concat(bads));
    return {
      kind: 'compose',
      display: { target: c.target, targetZh: c.zh, optsSig: opts.join(',') }, // optsSig 納入簽名,確保選項組合不同的題視為不同
      say: '哪兩塊積木合起來,會變成' + c.zh + '?',
      answer: good,
      options: opts
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
  gen.mulIntro = function () { // 乘法初體驗(幾個幾):a,b ∈ 2..9 且 a×b ≤ 45
    let a, b, guard = 0;
    do {
      a = ri(2, 9); b = ri(2, 9);
    } while (a * b > 45 && guard++ < 80);
    const ans = a * b;
    return { kind: 'number', display: { a: a, op: '×', b: b }, say: numZh(a) + ' 乘 ' + numZh(b) + ',等於多少?', answer: ans, options: numOptions(ans, 1) };
  };

  // 同數連加過渡(乘法預備):a ∈ 2..9、b ∈ 2..9 且 a×b ≤ 48
  gen.mulBridge = function () {
    let a, b, guard = 0;
    do {
      a = ri(2, 9); b = ri(2, 9);
    } while (a * b > 48 && guard++ < 80);
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

  // ── 二年級上學期 課1「200以內的數」──────────────────────
  // 課本 1-1~1-4 四個子技能(跳數/位值/付錢/大小比較)均分出題,合成一關。
  // 每個子技能範圍夠大(數十~數百種組合),回合內幾乎不會撞到同一題。
  // 呼叫端可以塞任意多個「有意義的干擾值」進 set(連同 ans 一起) ——
  // 這裡一律只留 ans + 2 個干擾(不足就補、超過就從裡面挑),ans 保證在最終選項裡,不會被擠掉。
  function fillTo3(set, ans, lo, hi) {
    const distractors = new Set([...set].filter(function (v) { return v !== ans; }));
    let f = 1;
    while (distractors.size < 2 && f <= (hi - lo + 5)) {
      const v = ans + (f % 2 === 0 ? -1 : 1) * Math.ceil(f / 2);
      if (v >= lo && v <= hi && v !== ans) distractors.add(v);
      f++;
    }
    let g = lo;
    while (distractors.size < 2 && g <= hi) { if (g !== ans) distractors.add(g); g++; }
    const picked = shuffle([...distractors]).slice(0, 2);
    return shuffle([ans].concat(picked));
  }

  // 1-1 跳數(一數/十數,可正可反)
  function skipCount200() {
    const byTen = Math.random() < 0.5;
    const step = byTen ? 10 : 1;
    const dir = Math.random() < 0.75 ? 1 : -1;
    const n = dir === 1 ? ri(0, 200 - step) : ri(step, 200);
    const ans = n + step * dir;
    const text = n + (dir === 1 ? ' 再多 ' : ' 再少 ') + step + ',是多少?';
    const set = new Set([ans]);
    const wrongStep = n + (byTen ? 1 : 10) * dir;   // 用錯步長(1 跟 10 搞混)
    const wrongDir = n - step * dir;                 // 方向算反
    [wrongStep, wrongDir].forEach(function (v) { if (v >= 0 && v <= 200 && v !== ans) set.add(v); });
    return { kind: 'text', display: { text: text }, say: text, answer: ans, options: fillTo3(set, ans, 0, 200) };
  }

  // 1-2 位值(百十個位):數字↔組成互換 + 幾個十的橋接題
  // 敘述「N 個 100/10/1」一律用阿拉伯數字、以「、」分隔三段(只有「是幾個十/幾個百」這種問法,問的是位名,才留中文字)
  function decompText(h, t, u) { return h + '個100、' + t + '個10、' + u + '個1'; }
  function placeValue200() {
    const r = Math.random();
    if (r < 0.4) {
      const n = Math.random() < 0.12 ? 200 : ri(100, 199);
      const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), u = n % 10;
      const correct = decompText(h, t, u);
      const set = new Set([correct]);
      const swapTU = decompText(h, u, t);
      if (swapTU !== correct) set.add(swapTU);
      if (t > 0) set.add(decompText(h + 1, t - 1, u));
      let guard = 0;
      while (set.size < 3 && guard++ < 20) set.add(decompText(h, ri(0, 9), ri(0, 9)));
      const text = n + ' 是幾個百、幾個十、幾個一組成的?';
      return { kind: 'text', display: { text: text }, say: text, answer: correct, options: shuffle([...set]).slice(0, 3) };
    } else if (r < 0.75) {
      let h = 1, t = ri(0, 9), u = ri(0, 9);
      if (Math.random() < 0.12) { h = 2; t = 0; u = 0; }
      const n = h * 100 + t * 10 + u;
      const text = decompText(h, t, u) + ',合起來是多少?';
      return { kind: 'text', display: { text: text }, say: text, answer: n, options: fillTo3(new Set([n]), n, 100, 200) };
    } else {
      const tens = ri(10, 20);
      const n = tens * 10;
      const askForward = Math.random() < 0.5;
      const text = askForward ? (n + ' 是幾個十?') : (tens + ' 個10是多少?');
      const ans = askForward ? tens : n;
      return {
        kind: 'text', display: { text: text }, say: text, answer: ans,
        options: fillTo3(new Set([ans]), ans, askForward ? 10 : 100, askForward ? 20 : 200)
      };
    }
  }

  // 1-3 付錢(100 元鈔 + 50/10/1 元銅板組合,問一共多少元)
  function moneyCount200() {
    const useFifty = Math.random() < 0.55;
    const rem = useFifty ? ri(0, 49) : ri(0, 69);
    const fifty = useFifty ? 1 : 0;
    const tens = Math.floor(rem / 10), ones = rem % 10;
    const n = 100 + fifty * 50 + tens * 10 + ones;
    const coins = [{ d: 100, n: 1 }];
    if (fifty) coins.push({ d: 50, n: 1 });
    if (tens) coins.push({ d: 10, n: tens });
    if (ones) coins.push({ d: 1, n: ones });
    const set = new Set([n]);
    [n - 100, fifty ? n - 50 : n + 50, n + 10, n - 10].forEach(function (v) {
      if (v > 0 && v <= 300 && v !== n) set.add(v);
    });
    return {
      kind: 'text', display: { text: '一共多少元?' }, visual: { kind: 'money', coins: coins },
      say: '算算看,一共多少元?', answer: n, options: fillTo3(set, n, 100, 260)
    };
  }

  // 1-4 三位數大小比較
  function compareHundreds200() {
    let a = ri(100, 200), b = ri(100, 200);
    while (b === a) b = ri(100, 200);
    const askBigger = Math.random() < 0.5;
    const ans = askBigger ? Math.max(a, b) : Math.min(a, b);
    let c = ri(100, 200);
    while (c === a || c === b) c = ri(100, 200);
    const text = a + ' 和 ' + b + ',哪一個比較' + (askBigger ? '大' : '小') + '?';
    return { kind: 'text', display: { text: text }, say: text, answer: ans, options: shuffle([a, b, c]) };
  }

  gen.hundredsTo200 = function () {
    const r = Math.random();
    if (r < 0.25) return skipCount200();
    if (r < 0.50) return placeValue200();
    if (r < 0.75) return moneyCount200();
    return compareHundreds200();
  };

  // ── 二年級上學期 課2「二位數的加減法」──────────────────
  // 2.1 加法(不進位/進位皆有,和可能跨百,課本例題如 52+56=108)
  function addCarry200() {
    const a = ri(10, 79), b = ri(10, 79);
    const ans = a + b;
    const set = new Set([ans]);
    // 常見錯誤:忘記進位(少 10)、個位算錯(±1)
    [ans - 10, ans + 1, ans - 1].forEach(function (v) { if (v >= 0) set.add(v); });
    return {
      kind: 'number', display: { a: a, op: '+', b: b },
      say: numZh(a) + ' 加 ' + numZh(b) + ',等於多少?',
      answer: ans, options: fillTo3(set, ans, 0, 200)
    };
  }

  // 2.2 減法(退位),二位數−二位數,約七成刻意出需要退位的組合
  function subBorrow200() {
    let a, b, guard = 0;
    const wantBorrow = Math.random() < 0.7;
    do {
      a = ri(20, 99);
      b = ri(2, a - 1);
      guard++;
    } while (guard < 60 && (wantBorrow ? (a % 10) >= (b % 10) : (a % 10) < (b % 10)));
    const ans = a - b;
    const set = new Set([ans]);
    // 常見錯誤:忘記借位(多 10)、個位算錯(±1)
    [ans + 10, ans - 1, ans + 1].forEach(function (v) { if (v >= 0 && v < a) set.add(v); });
    return {
      kind: 'number', display: { a: a, op: '−', b: b },
      say: numZh(a) + ' 減 ' + numZh(b) + ',等於多少?',
      answer: ans, options: fillTo3(set, ans, 0, 99)
    };
  }

  // 2.3 等式、大於和小於:一個算式 vs 一個數字,選對的符號(>/</=)
  function compareExpr200() {
    const useAdd = Math.random() < 0.6;
    let a, b, val;
    if (useAdd) { a = ri(5, 89); b = ri(1, 20); val = a + b; }
    else { a = ri(15, 99); b = ri(1, a - 1); val = a - b; }
    let c = ri(Math.max(0, val - 15), Math.min(200, val + 15));
    if (Math.random() < 0.3) c = val;   // 刻意抬高「=」出現的機率,不然幾乎都是 >/<
    const op = useAdd ? '+' : '−';
    const exprText = a + ' ' + op + ' ' + b;
    const symbol = val > c ? '>' : (val < c ? '<' : '=');
    const text = exprText + '　○　' + c;
    return {
      kind: 'text', display: { text: text },
      say: exprText + ',和 ' + c + ' 比,要填哪一個符號?',
      answer: symbol, options: shuffle(['>', '<', '='])
    };
  }

  gen.addSubCompare200 = function () {
    const r = Math.random();
    if (r < 0.34) return addCarry200();
    if (r < 0.67) return subBorrow200();
    return compareExpr200();
  };

  // ── 二年級上學期 課3「認識公分」──────────────────────────
  // 3.2+3.3 合併(讀尺):尺一律從 0 對齊,問色條是幾公分。
  // 3.1(個別單位)簡化成長度比較(甲乙丙三條,不帶刻度),3.4 是公分加減。
  // ⚠ 課本 3.3 另有「用尺畫出指定長度的線」,屬手繪操作,目前答題引擎只有選擇題,先不做這個子題。
  function readRuler200() {
    const cm = ri(2, 18);
    return {
      kind: 'text', display: { text: '這條是幾公分?' },
      visual: { kind: 'ruler', cm: 20, bar: cm },
      say: '量量看,這條是幾公分?',
      answer: cm, options: fillTo3(new Set([cm]), cm, 1, 20)
    };
  }

  function lenCompare200() {
    const labels = ['甲', '乙', '丙'];
    const cms = [];
    while (cms.length < 3) { const v = ri(2, 16); if (cms.indexOf(v) < 0) cms.push(v); }
    const askLonger = Math.random() < 0.5;
    const target = askLonger ? Math.max.apply(null, cms) : Math.min.apply(null, cms);
    const ansIdx = cms.indexOf(target);
    const bars = labels.map(function (lb, i) { return { cm: cms[i], label: lb }; });
    const text = '哪一條' + (askLonger ? '最長' : '最短') + '?';
    return {
      kind: 'text', display: { text: text }, visual: { kind: 'lenCompare', bars: bars },
      say: text, answer: labels[ansIdx], options: shuffle(labels.slice())
    };
  }

  function lenAddSub200() {
    const isAdd = Math.random() < 0.6;
    let a, b, ans;
    if (isAdd) { a = ri(2, 15); b = ri(2, 15); ans = a + b; }
    else { a = ri(5, 20); b = ri(1, a - 1); ans = a - b; }
    const op = isAdd ? '+' : '−';
    const text = a + '公分 ' + op + ' ' + b + '公分,' + (isAdd ? '合起來' : '剩下') + '是幾公分?';
    const set = new Set([ans]);
    [ans + 1, ans - 1, isAdd ? ans - 2 : ans + 2].forEach(function (v) { if (v >= 0) set.add(v); });
    return {
      kind: 'text', display: { text: text }, say: text,
      answer: ans, options: fillTo3(set, ans, 0, 40)
    };
  }

  gen.cmLength200 = function () {
    const r = Math.random();
    if (r < 0.34) return readRuler200();
    if (r < 0.67) return lenCompare200();
    return lenAddSub200();
  };

  // ── 二年級上學期 課4「加減應用」──────────────────────────
  // 4.1 加減互逆:給一個算式,推另一個相關算式
  function inverseRelation200() {
    const a = ri(2, 50), b = ri(2, Math.min(40, 99 - a));
    const c = a + b;
    const mode = ri(0, 2);
    let text, ans;
    if (mode === 0) { text = a + ' + ' + b + ' = ' + c + ',所以 ' + c + ' − ' + a + ' = ?'; ans = b; }
    else if (mode === 1) { text = a + ' + ' + b + ' = ' + c + ',所以 ' + c + ' − ' + b + ' = ?'; ans = a; }
    else { text = c + ' − ' + a + ' = ' + b + ',所以 ' + a + ' + ' + b + ' = ?'; ans = c; }
    const set = new Set([ans]);
    [ans + 1, ans - 1, ans + 10, ans - 10].forEach(function (v) { if (v >= 0) set.add(v); });
    return { kind: 'text', display: { text: text }, say: text, answer: ans, options: fillTo3(set, ans, 0, 150) };
  }

  // 4.2 解題和驗算:加減應用題(含用加法驗算減法)
  const WP_NAMES = ['小明', '小華', '妹妹', '弟弟', '媽媽', '老師'];
  const WP_ITEMS = ['紅豆餅', '貼紙', '氣球', '糖果', '蘋果', '筆記本'];
  function wordProblem200() {
    const r = Math.random();
    if (r < 0.4) {
      const a = ri(5, 60), b = ri(5, Math.min(40, 99 - a));
      const ans = a + b;
      const text = pick(WP_NAMES) + '原本有 ' + a + ' 個' + pick(WP_ITEMS) + ',又做了 ' + b + ' 個,現在一共幾個?';
      const set = new Set([ans]);
      [ans + 1, ans - 1, ans - 10].forEach(function (v) { if (v >= 0) set.add(v); });
      return { kind: 'text', display: { text: text }, say: text, answer: ans, options: fillTo3(set, ans, 0, 150) };
    } else if (r < 0.75) {
      const a = ri(20, 99), b = ri(5, a - 1);
      const ans = a - b;
      const text = pick(WP_NAMES) + '有 ' + a + ' 元,買東西花了 ' + b + ' 元,還剩多少元?';
      const set = new Set([ans]);
      [ans + 1, ans - 1, ans + 10].forEach(function (v) { if (v >= 0) set.add(v); });
      return { kind: 'text', display: { text: text }, say: text, answer: ans, options: fillTo3(set, ans, 0, 99) };
    } else {
      const a = ri(20, 99), b = ri(2, a - 1), c = a - b;
      const text = a + ' − ' + b + ' = ' + c + ',用加法驗算:' + c + ' + ' + b + ' = ?';
      const set = new Set([a]);
      [a + 1, a - 1, a + 10].forEach(function (v) { if (v >= 0) set.add(v); });
      return { kind: 'text', display: { text: text }, say: text, answer: a, options: fillTo3(set, a, 0, 150) };
    }
  }

  gen.addSubApply200 = function () {
    return Math.random() < 0.5 ? inverseRelation200() : wordProblem200();
  };

  // ── 二年級上學期 課5「容量」──────────────────────────────
  // 5.1+5.2 合併:容器容量比較(梯形容器,高度∝容量)+ 裝滿幾杯水比較(純文字)
  // 課本原文用了水桶/碗/杯子/花瓶/水壺等好幾種容器,出題也比照抽一個名詞,不要每題都是水壺。
  const VESSELS = ['水壺', '水桶', '茶壺', '花瓶', '水瓶', '碗'];
  function capCompare200() {
    const labels = ['甲', '乙', '丙'];
    const vols = [];
    while (vols.length < 3) { const v = ri(2, 16); if (vols.indexOf(v) < 0) vols.push(v); }
    const askBigger = Math.random() < 0.5;
    const target = askBigger ? Math.max.apply(null, vols) : Math.min.apply(null, vols);
    const ansIdx = vols.indexOf(target);
    const containers = labels.map(function (lb, i) { return { vol: vols[i], label: lb }; });
    const noun = Math.random() < 0.4 ? '容器' : pick(VESSELS);
    const text = '哪一個' + noun + '可以裝的水' + (askBigger ? '最多' : '最少') + '?';
    return {
      kind: 'text', display: { text: text }, visual: { kind: 'capCompare', containers: containers },
      say: text, answer: labels[ansIdx], options: shuffle(labels.slice())
    };
  }

  function cupCount200() {
    let a = ri(2, 15), b = ri(2, 15);
    const equal = Math.random() < 0.15;
    if (equal) b = a; else while (b === a) b = ri(2, 15);
    const noun = pick(VESSELS);
    const text = '甲' + noun + '可以裝滿 ' + a + ' 杯水,乙' + noun + '可以裝滿 ' + b + ' 杯水,哪一個容量比較大?';
    const ans = a > b ? '甲' : (a < b ? '乙' : '一樣大');
    return { kind: 'text', display: { text: text }, say: text, answer: ans, options: shuffle(['甲', '乙', '一樣大']) };
  }

  gen.capacity200 = function () {
    return Math.random() < 0.55 ? capCompare200() : cupCount200();
  };

  // ── 二年級上學期 課6「加減的商店」──────────────────────────
  // 三個子技能都各自一半機率用純算式、一半機率用商店情境應用題,呼應課名。
  const SHOP_ITEMS = ['麵包', '飲料', '玩具', '文具', '水果', '貼紙'];
  const SHOP_NAMES = ['小明', '小華', '妹妹', '弟弟', '媽媽'];

  // 6.1 三數相加
  function threeSum200() {
    const a = ri(3, 25), b = ri(3, 25), c = ri(2, 20);
    const ans = a + b + c;
    const useWord = Math.random() < 0.5;
    const text = useWord
      ? '買了三份' + pick(SHOP_ITEMS) + ',分別是 ' + a + ' 元、' + b + ' 元、' + c + ' 元,一共多少元?'
      : a + ' + ' + b + ' + ' + c + ' = ?';
    const set = new Set([ans]);
    [ans + 1, ans - 1, ans + 10, ans - 10].forEach(function (v) { if (v >= 0) set.add(v); });
    return { kind: 'text', display: { text: text }, say: text, answer: ans, options: fillTo3(set, ans, 0, 150) };
  }

  // 6.2 兩步驟減法
  function twoStepSub200() {
    const a = ri(30, 90);
    const b = ri(2, a - 4);
    const rem = a - b;
    const c = ri(2, rem - 1);
    const ans = rem - c;
    const useWord = Math.random() < 0.5;
    const text = useWord
      ? pick(SHOP_NAMES) + '有 ' + a + ' 元,先花了 ' + b + ' 元買' + pick(SHOP_ITEMS) + ',又花了 ' + c + ' 元買' + pick(SHOP_ITEMS) + ',還剩多少元?'
      : a + ' − ' + b + ' − ' + c + ' = ?';
    const set = new Set([ans]);
    [ans + 1, ans - 1, ans + 10].forEach(function (v) { if (v >= 0) set.add(v); });
    return { kind: 'text', display: { text: text }, say: text, answer: ans, options: fillTo3(set, ans, 0, 90) };
  }

  // 6.3 加減兩步驟(加減混合)
  function twoStepMix200() {
    let text, ans;
    if (Math.random() < 0.5) {
      // 果汁店:原本有 a 杯,賣掉 b 杯,又做了 c 杯,現在有幾杯?(a − b + c,保證 a − b ≥ 0)
      const a = ri(20, 60), b = ri(2, a - 2), c = ri(2, 30);
      ans = a - b + c;
      text = '果汁店原本有 ' + a + ' 杯果汁,賣掉 ' + b + ' 杯,又做了 ' + c + ' 杯,現在有幾杯?';
    } else if (Math.random() < 0.5) {
      const a = ri(10, 50), b = ri(5, 40), sum = a + b, c = ri(2, Math.min(30, sum - 1));
      ans = sum - c;
      text = a + ' + ' + b + ' − ' + c + ' = ?';
    } else {
      const a = ri(30, 90), b = ri(2, a - 5), rem = a - b, c = ri(2, 30);
      ans = rem + c;
      text = a + ' − ' + b + ' + ' + c + ' = ?';
    }
    const set = new Set([ans]);
    [ans + 1, ans - 1, ans + 10, ans - 10].forEach(function (v) { if (v >= 0) set.add(v); });
    return { kind: 'text', display: { text: text }, say: text, answer: ans, options: fillTo3(set, ans, 0, 150) };
  }

  gen.shopTwoStep200 = function () {
    const r = Math.random();
    if (r < 0.34) return threeSum200();
    if (r < 0.67) return twoStepSub200();
    return twoStepMix200();
  };

  // ── 二年級上學期 課7「乘法(一)」──────────────────────────
  // 課本這課只教 2、4、5、8 的乘法(3/6/7/9 留到課9),出題全部限制在這 4 個底數。
  const MUL1_BASES = [2, 4, 5, 8];

  // 7.1 幾的幾倍
  function timesOf200() {
    const a = pick(MUL1_BASES), b = ri(2, 6);
    const ans = a * b;
    const text = a + ' 的 ' + b + ' 倍是多少?';
    const set = new Set([ans]);
    [ans + a, ans - a, ans + 1].forEach(function (v) { if (v >= 0) set.add(v); });
    return { kind: 'text', display: { text: text }, say: text, answer: ans, options: fillTo3(set, ans, 0, 90) };
  }

  // 7.2+7.3+7.4:2、4、5、8 的乘法直接練習(九九乘法表格式)
  function mulDrill200() {
    const a = pick(MUL1_BASES), b = ri(1, 10);
    const ans = a * b;
    return {
      kind: 'number', display: { a: a, op: '×', b: b },
      say: numZh(a) + ' 乘 ' + numZh(b) + ',等於多少?',
      answer: ans, options: numOptions(ans, 1)
    };
  }

  // 7.5 乘法的應用
  const MUL_ITEMS = ['貼紙', '蘋果', '餅乾', '氣球', '鉛筆', '糖果'];
  function mulApply200() {
    const a = pick(MUL1_BASES), b = ri(2, 9);
    const ans = a * b;
    const text = '一盒有 ' + a + ' 個' + pick(MUL_ITEMS) + ',買了 ' + b + ' 盒,一共幾個?';
    const set = new Set([ans]);
    [ans + a, ans - a, ans + 1].forEach(function (v) { if (v >= 0) set.add(v); });
    return { kind: 'text', display: { text: text }, say: text, answer: ans, options: fillTo3(set, ans, 0, 90) };
  }

  gen.mult200 = function () {
    const r = Math.random();
    if (r < 0.25) return timesOf200();
    if (r < 0.75) return mulDrill200();
    return mulApply200();
  };

  // ── 二年級上學期 課8「時間」──────────────────────────────
  // 8.1 認識鐘面(整點)+ 8.2 幾時幾分(5分為單位)+ 8.3 經過的時間(整點推算,不畫鐘)
  function clockHour200() {
    const hour = ri(1, 12);
    const text = '現在鐘面上是幾點?';
    return {
      kind: 'text', display: { text: text }, visual: { kind: 'clock', hour: hour, minute: 0 },
      say: text, answer: hour, options: fillTo3(new Set([hour]), hour, 1, 12)
    };
  }

  function clockMinute200() {
    const hour = ri(1, 12);
    const minute = ri(1, 11) * 5;   // 5,10,...,55(以5分為單位)
    const text = '現在鐘面上是幾點幾分?';
    const ansStr = hour + ' 點 ' + minute + ' 分';
    const m2 = minute + 5 <= 55 ? minute + 5 : minute - 5;
    const h2 = (hour % 12) + 1;
    const options = shuffle([ansStr, hour + ' 點 ' + m2 + ' 分', h2 + ' 點 ' + minute + ' 分']);
    return {
      kind: 'text', display: { text: text }, visual: { kind: 'clock', hour: hour, minute: minute },
      say: text, answer: ansStr, options: options
    };
  }

  function elapsedTime200() {
    const startHour = ri(1, 8);
    const duration = ri(1, Math.min(4, 12 - startHour));   // 不跨過 12 點,避免早期階段就要處理環繞
    const endHour = startHour + duration;
    let text, ans;
    if (Math.random() < 0.5) {
      text = '現在是 ' + startHour + ' 點,再過 ' + duration + ' 小時是幾點?';
      ans = endHour;
    } else {
      text = '從 ' + startHour + ' 點到 ' + endHour + ' 點,經過了幾小時?';
      ans = duration;
    }
    return { kind: 'text', display: { text: text }, say: text, answer: ans, options: fillTo3(new Set([ans]), ans, 1, 12) };
  }

  gen.clockTime200 = function () {
    const r = Math.random();
    if (r < 0.34) return clockHour200();
    if (r < 0.67) return clockMinute200();
    return elapsedTime200();
  };

  // ── 二年級上學期 課9「乘法(二)」──────────────────────────
  // 承接課7,這課教 3、6、7、9 的乘法(課7的 2/4/5/8 不重複出現)。
  // 沒有「幾的幾倍」子題(那個概念課7已經教過),只有直接練習+應用題。
  const MUL2_BASES = [3, 6, 7, 9];
  function mulDrill2_200() {
    const a = pick(MUL2_BASES), b = ri(1, 10);
    const ans = a * b;
    return {
      kind: 'number', display: { a: a, op: '×', b: b },
      say: numZh(a) + ' 乘 ' + numZh(b) + ',等於多少?',
      answer: ans, options: numOptions(ans, 1)
    };
  }

  const MARKET_ITEMS = ['番茄', '紅蘿蔔', '馬鈴薯', '橘子', '雞蛋', '洋蔥'];
  function mulApply2_200() {
    const a = pick(MUL2_BASES), b = ri(2, 9);
    const ans = a * b;
    const text = '市場一籃有 ' + a + ' 個' + pick(MARKET_ITEMS) + ',買了 ' + b + ' 籃,一共幾個?';
    const set = new Set([ans]);
    [ans + a, ans - a, ans + 1].forEach(function (v) { if (v >= 0) set.add(v); });
    return { kind: 'text', display: { text: text }, say: text, answer: ans, options: fillTo3(set, ans, 0, 90) };
  }

  gen.mult2_200 = function () {
    return Math.random() < 0.72 ? mulDrill2_200() : mulApply2_200();
  };

  // ── 二年級上學期 課10「面的大小比較」──────────────────────
  // 10.1 直接比較 + 10.2 間接比較(方格法),都用同一套方格圖形視覺(rows×cols=面積)。
  function gridAreaCompare200() {
    const labels = ['甲', '乙', '丙'];
    const shapes = [];
    let guard = 0;
    while (shapes.length < 3 && guard++ < 40) {
      const rows = ri(2, 5), cols = ri(2, 6);
      const area = rows * cols;
      if (shapes.some(function (s) { return s.area === area; })) continue;
      shapes.push({ rows: rows, cols: cols, area: area });
    }
    while (shapes.length < 3) shapes.push({ rows: 2, cols: 2 + shapes.length, area: 2 * (2 + shapes.length) });
    const askBigger = Math.random() < 0.5;
    const areas = shapes.map(function (s) { return s.area; });
    const target = askBigger ? Math.max.apply(null, areas) : Math.min.apply(null, areas);
    const idx = areas.indexOf(target);
    const vShapes = shapes.map(function (s, i) { return { rows: s.rows, cols: s.cols, label: labels[i] }; });
    const text = '哪一個面積比較' + (askBigger ? '大' : '小') + '?';
    return {
      kind: 'text', display: { text: text }, visual: { kind: 'gridArea', shapes: vShapes },
      say: text, answer: labels[idx], options: shuffle(labels.slice())
    };
  }

  function gridCount200() {
    const rows = ri(2, 6), cols = ri(2, 7);
    const area = rows * cols;
    const text = '這個圖形用了幾個方格?';
    return {
      kind: 'text', display: { text: text }, visual: { kind: 'gridArea', shapes: [{ rows: rows, cols: cols, label: '' }] },
      say: text, answer: area, options: fillTo3(new Set([area]), area, 1, 42)
    };
  }

  function gridNumCompare200() {
    let a = ri(4, 30), b = ri(4, 30);
    const equal = Math.random() < 0.15;
    if (equal) b = a; else while (b === a) b = ri(4, 30);
    const text = '甲圖形用了 ' + a + ' 個方格,乙圖形用了 ' + b + ' 個方格,哪一個面積比較大?';
    const ans = a > b ? '甲' : (a < b ? '乙' : '一樣大');
    return { kind: 'text', display: { text: text }, say: text, answer: ans, options: shuffle(['甲', '乙', '一樣大']) };
  }

  gen.areaCompare200 = function () {
    const r = Math.random();
    if (r < 0.34) return gridAreaCompare200();
    if (r < 0.67) return gridCount200();
    return gridNumCompare200();
  };

  window.PLS_GEN = { gen: gen, numZh: numZh, ri: ri, pick: pick, shuffle: shuffle };
})();
