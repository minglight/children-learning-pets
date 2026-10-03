// lessons.js — 「先教再考」上課腳本(資料驅動:key = 關卡 id,關卡 config 不用改)
// 每段課 = steps 陣列,三種步驟:
//   { t:'show', text, say?, visual?, hl? }          寵物老師講解,小朋友按「下一步」
//   { t:'ask',  text, say?, visual?, hl?, options:[3 個字串], answer, hint, ok? }   一起做:答錯給提示、不計分
//   (最後自動補一頁「上完課囉」→ 開始考試)
// visual 沿用 visuals.js 的格式(clock / groups …);clock 可加 hl:'hour'|'min' 讓那根針變亮。
// 規則:每段課控制在 1 分鐘內;上過一次之後,點關卡直接考試,想複習在答題畫面按 📖。
(function () {
  const L = {};

  // ── 二上 課8 時間 ──
  L.g2c8 = {
    title: '認識時間',
    steps: [
      { t: 'show', text: '先看短針。短針指著 3。', say: '先看短針。短針指著 3。', visual: { kind: 'clock', hour: 3, minute: 0 }, hl: 'hour' },
      { t: 'show', text: '再看長針。長針指著 12,就是整點,所以是 3 點。', say: '再看長針。長針指著 12,就是整點,所以現在是 3 點。', visual: { kind: 'clock', hour: 3, minute: 0 }, hl: 'min' },
      { t: 'ask', text: '短針指著 8,長針指著 12,現在是幾點?', visual: { kind: 'clock', hour: 8, minute: 0 },
        options: ['7 點', '8 點', '9 點'], answer: '8 點', hint: '先看短針,短針指著 8。長針指 12 就是整點。' },
      { t: 'show', text: '長針每走一格是 5 分鐘。指著 6,走了 6 個 5 分,就是 30 分。', say: '長針每走一格是 5 分鐘。指著 6,走了 6 個 5 分鐘,就是 30 分。', visual: { kind: 'clock', hour: 3, minute: 30 }, hl: 'min' },
      { t: 'show', text: '短針在 3 和 4 中間,看已經走過的 3。合起來是 3 點 30 分。', say: '短針在 3 和 4 中間,看已經走過的 3。合起來是 3 點 30 分。', visual: { kind: 'clock', hour: 3, minute: 30 }, hl: 'hour' },
      { t: 'ask', text: '長針指著 6,是幾分?', visual: { kind: 'clock', hour: 7, minute: 30 }, hl: 'min',
        options: ['6 分', '30 分', '60 分'], answer: '30 分', hint: '長針每一格是 5 分鐘,指著 6,就是 6 個 5 分。' },
      { t: 'ask', text: '現在鐘面上是幾點幾分?', visual: { kind: 'clock', hour: 9, minute: 15 },
        options: ['9 點 3 分', '9 點 15 分', '3 點 9 分'], answer: '9 點 15 分', hint: '短針在 9,長針指著 3,3 個 5 分就是 15 分。' },
      { t: 'show', text: '算經過的時間:從 2 點到 5 點,往後數 3、4、5,走了 3 小時。', say: '算經過的時間。從 2 點到 5 點,往後數 3、4、5,經過了 3 小時。' },
      { t: 'ask', text: '從 3 點到 6 點,經過了幾小時?',
        options: ['2 小時', '3 小時', '4 小時'], answer: '3 小時', hint: '從 3 往後數:4、5、6,數了幾次?' }
    ]
  };

  // ── 二上 課7 乘法(一) ──
  function grp(n, count) { const g = []; for (let i = 0; i < count; i++) g.push({ n: n, icon: '圓', color: '紅' }); return g; }
  L.g2c7 = {
    title: '認識乘法',
    steps: [
      { t: 'show', text: '這裡有 3 堆,每堆 2 個。', visual: { kind: 'groups', groups: [{ n: 2, icon: '圓', color: '紅' }, { n: 2, icon: '圓', color: '黃' }, { n: 2, icon: '圓', color: '藍' }] } },
      { t: 'show', text: '每堆 2 個,有 3 堆,就是 2 的 3 倍。一堆一堆加:2 + 2 + 2 = 6。', say: '每堆 2 個,有 3 堆,就是 2 的 3 倍。一堆一堆加,2 加 2 加 2,等於 6。', visual: { kind: 'groups', groups: [{ n: 2, icon: '圓', color: '紅' }, { n: 2, icon: '圓', color: '黃' }, { n: 2, icon: '圓', color: '藍' }] } },
      { t: 'show', text: '寫成乘法:2 × 3 = 6,讀作「2 乘 3 等於 6」。', say: '寫成乘法,2 乘 3 等於 6。' },
      { t: 'ask', text: '5 的 3 倍是多少?', visual: { kind: 'groups', groups: [{ n: 5, icon: '星', color: '黃' }, { n: 5, icon: '星', color: '橘' }, { n: 5, icon: '星', color: '粉' }] },
        options: ['10', '15', '20'], answer: '15', hint: '一堆 5 個,有 3 堆:5 + 5 + 5。' },
      { t: 'show', text: '2 的乘法,每多一堆就多 2:2、4、6、8、10…', say: '2 的乘法,每多一堆就多 2。2、4、6、8、10。' },
      { t: 'ask', text: '2 × 4 = ?', options: ['6', '8', '10'], answer: '8', hint: '2、4、6、8,數四次。' },
      { t: 'show', text: '5 的乘法,每次多 5:5、10、15、20…個位數不是 5 就是 0。', say: '5 的乘法,每次多 5。5、10、15、20。個位數不是 5 就是 0。' },
      { t: 'ask', text: '一盒有 5 個餅乾,買了 3 盒,一共幾個?', options: ['10 個', '15 個', '20 個'], answer: '15 個', hint: '一盒 5 個,3 盒:5 × 3。' }
    ]
  };

  window.PLS_LESSONS = L;
})();
