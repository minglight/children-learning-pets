// letters.js — 可重複使用的英文字母「筆順」描寫引擎
// ─────────────────────────────────────────────────────────────
// 設計理念(why):
//  • 每個字母 = 數條「中心線」筆畫(stroke),用 SVG path 描述骨架。
//  • canvas 以「圓頭粗線」描出骨架 → 跟課本的描寫體一樣(不是字型字形,完全自控)。
//  • 自動算出每筆的「起點」(標筆順數字①②③)與「終點方向」(畫箭頭)。
//  • 與字型無關,所以能精準做出:正常的 G、有頂橫的 J、單層 g…等課本字形。
//
// 座標系(normalized,y 向下):
//  CAP=0(大寫頂/上伸部) ‧ XTOP=50(小寫 x-height 頂) ‧ BASE=100(基線) ‧ 下伸部≈128
//  以「cap height = 100 單位」為縮放基準,所以大小寫比例會自動正確。
//
// 用法:
//  PLS_LETTERS.has('G')                  // 是否已定義此字母
//  PLS_LETTERS.draw(ctx, 'G', {          // 在 canvas 畫出
//     cx, cy,        // 置中錨點(像素)
//     h,             // cap height(像素)
//     color,         // 骨架顏色(描底用淡色)
//     width,         // 線寬(像素,預設 0.16*h)
//     showOrder      // true = 疊上筆順數字徽章 + 方向箭頭
//  })  → 回傳 true 表示有畫;false 表示此字母尚未定義(呼叫端可 fallback 用字型)
//
// ⚠ 新增/修改字母只要改 GLYPHS 這張表即可,render 不用動 → 這就是「可重複使用」。
(function () {
  'use strict';

  // ── 字母骨架資料表:ch -> [筆畫 d(SVG path), 依筆順排列] ──────────────
  // 已定義者顯示筆順引導;未定義者由呼叫端 fallback。先做大寫全套 + 關鍵小寫。
  const GLYPHS = {
    // 大寫 ────────────────────────────────────────────────
    A: ['M46 4 L16 100', 'M46 4 L76 100', 'M27 66 L65 66'],
    B: ['M24 8 L24 100', 'M24 8 L52 8 A21 21 0 0 1 52 50 L24 50', 'M24 50 L56 50 A25 25 0 0 1 56 100 L24 100'],
    C: ['M78 26 A34 37 0 1 0 78 74'],
    D: ['M24 8 L24 100', 'M24 8 L40 8 A40 46 0 0 1 40 100 L24 100'],
    E: ['M26 8 L26 100', 'M26 8 L74 8', 'M26 54 L64 54', 'M26 100 L76 100'],
    F: ['M28 8 L28 100', 'M28 8 L76 8', 'M28 54 L66 54'],
    // G:① 大 C 弧 ② 內折橫桿(右側往上再往內)→ 正常的 G,不是怪 G
    G: ['M80 28 A33 36 0 1 0 80 80', 'M80 80 L80 56 L58 56'],
    H: ['M24 8 L24 100', 'M74 8 L74 100', 'M24 54 L74 54'],
    I: ['M46 8 L46 100', 'M30 8 L62 8', 'M30 100 L62 100'],
    // J:① 頂橫 ② 直豎 + 底鉤(課本就是有頂橫的 J)
    J: ['M38 8 L80 8', 'M62 8 L62 72 A22 22 0 0 1 20 70'],
    K: ['M22 8 L22 100', 'M74 8 L34 52', 'M34 52 L78 100'],
    L: ['M26 8 L26 100', 'M26 100 L72 100'],
    M: ['M18 100 L18 12 L46 62 L74 12 L74 100'],
    N: ['M22 100 L22 12 L74 88 L74 12'],
    O: ['M46 6 A33 44 0 1 0 46 94 A33 44 0 1 0 46 6'],
    P: ['M24 8 L24 100', 'M24 8 L52 8 A22 24 0 0 1 52 56 L24 56'],
    Q: ['M46 6 A33 44 0 1 0 46 94 A33 44 0 1 0 46 6', 'M54 72 L82 104'],
    R: ['M24 8 L24 100', 'M24 8 L52 8 A22 24 0 0 1 52 56 L24 56', 'M44 56 L78 100'],
    S: ['M76 30 C60 8 32 12 32 36 C32 58 70 54 68 78 C66 100 38 100 24 82'],
    // T:① 頂橫(左→右) ② 中豎(上→下)
    T: ['M16 12 L78 12', 'M47 12 L47 100'],
    U: ['M22 8 L22 70 A24 26 0 0 0 70 70 L70 8'],
    V: ['M18 10 L46 98 L74 10'],
    W: ['M14 10 L30 100 L46 42 L62 100 L78 10'],
    X: ['M20 10 L74 100', 'M74 10 L20 100'],
    // Y:① 左斜 ② 右斜 ③ 中豎(同課本)
    Y: ['M16 10 L46 54', 'M76 10 L46 54', 'M46 54 L46 100'],
    Z: ['M18 10 L76 10 L20 100 L78 100'],

    // 小寫 ────────────────────────────────────────────────
    // x-height(50)~baseline(100);上伸部到 8;下伸部到 ~128
    // 單層 a:① 圓圈(c 形開口朝右) ② 右側直豎(上端略凸出)
    a: ['M58 60 A19 19 0 1 0 58 88', 'M60 54 L60 100'],
    b: ['M28 8 L28 100', 'M28 56 C52 56 66 64 66 78 C66 92 52 100 28 100'],
    c: ['M70 60 A20 20 0 1 0 70 88'],
    d: ['M64 56 C40 56 26 64 26 78 C26 92 40 100 64 100', 'M64 8 L64 100'],
    e: ['M32 73 L64 73 C66 60 56 52 44 52 C30 52 22 64 22 76 C22 90 33 98 47 98 C55 98 61 95 64 90'],
    f: ['M62 26 A16 14 0 0 0 40 30 L40 100', 'M24 56 L60 56'],
    // 單層 g:① 圓圈 ② 右側直豎下伸 + 左鉤(課本的 g)
    g: ['M38 52 A22 22 0 1 0 38 96 A22 22 0 1 0 38 52', 'M60 53 L60 110 A17 15 0 0 1 32 116'],
    h: ['M28 8 L28 100', 'M28 64 A20 18 0 0 1 66 64 L66 100'],
    i: ['M46 52 L46 100', 'M46 26 L46 31'],
    // 小寫 j:① 直豎 + 底鉤 ② 上面的點
    j: ['M56 52 L56 110 A18 16 0 0 1 28 112', 'M56 26 L56 31'],
    k: ['M28 8 L28 100', 'M62 56 L34 76', 'M34 76 L64 100'],
    l: ['M48 8 L48 100'],
    m: ['M24 54 L24 100', 'M24 64 A15 14 0 0 1 52 64 L52 100', 'M52 64 A15 14 0 0 1 80 64 L80 100'],
    n: ['M28 54 L28 100', 'M28 64 A20 18 0 0 1 66 64 L66 100'],
    o: ['M45 53 A22 23 0 1 0 45 99 A22 23 0 1 0 45 53'],
    p: ['M28 52 L28 128', 'M28 56 C52 56 66 64 66 78 C66 92 52 100 28 100'],
    q: ['M64 56 C40 56 26 64 26 78 C26 92 40 100 64 100', 'M64 52 L64 128'],
    // r:① 直豎 ② 肩膀(頭往上凸並往右伸)
    r: ['M30 52 L30 100', 'M30 62 C40 52 58 52 64 64'],
    s: ['M62 60 C52 52 34 54 34 66 C34 76 58 76 58 88 C58 98 40 98 30 90'],
    t: ['M50 22 L50 90 A16 14 0 0 0 74 86', 'M32 52 L68 52'],
    u: ['M28 52 L28 86 A20 20 0 0 0 66 86 L66 52', 'M66 52 L66 100'],
    v: ['M22 52 L46 98 L70 52'],
    w: ['M18 52 L32 98 L46 60 L60 98 L74 52'],
    x: ['M26 52 L66 100', 'M66 52 L26 100'],
    y: ['M26 52 L48 90', 'M72 52 L34 128'],
    z: ['M26 52 L66 52 L28 100 L70 100']
  };

  // ── 幾何量測(取每筆起點/終點/終點方向 + 整體 bbox)──────────────────
  const NS = 'http://www.w3.org/2000/svg';
  let _probe = null;
  function probe() {
    if (_probe) return _probe;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden';
    _probe = document.createElementNS(NS, 'path');
    svg.appendChild(_probe);
    (document.body || document.documentElement).appendChild(svg);
    return _probe;
  }

  const _cache = {};
  function measure(ch) {
    if (_cache[ch] !== undefined) return _cache[ch];
    const g = GLYPHS[ch];
    if (!g) { _cache[ch] = null; return null; }
    const p = probe();
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    let total = 0;
    const strokes = g.map(function (d) {
      p.setAttribute('d', d);
      let len = 0; try { len = p.getTotalLength(); } catch (e) { len = 0; }
      const N = Math.max(6, Math.min(90, Math.round(len / 2)));
      const pts = [];                          // 沿筆畫等距取樣的點(動畫逐筆顯示用)
      for (let i = 0; i <= N; i++) {
        const q = p.getPointAtLength(len * i / N);
        pts.push({ x: q.x, y: q.y });
        if (q.x < minx) minx = q.x; if (q.x > maxx) maxx = q.x;
        if (q.y < miny) miny = q.y; if (q.y > maxy) maxy = q.y;
      }
      const s0 = pts[0] || { x: 0, y: 0 };
      const e0 = pts[pts.length - 1] || s0;
      const ePrev = pts[pts.length - 2] || s0;
      total += len;
      return { d: d, start: s0, end: e0, endDir: Math.atan2(e0.y - ePrev.y, e0.x - ePrev.x), len: len, pts: pts };
    });
    const m = { strokes: strokes, bbox: { x: minx, y: miny, w: maxx - minx, h: maxy - miny }, total: total };
    _cache[ch] = m; return m;
  }

  function arrow(ctx, x, y, ang, size, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(2, 0); ctx.lineTo(-size, -size * 0.6); ctx.lineTo(-size, size * 0.6); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function draw(ctx, ch, opts) {
    const m = measure(ch);
    if (!m) return false;
    opts = opts || {};
    const h = opts.h || 200;
    const s = h / 100;                       // 100 normalized 單位 = cap height
    const bw = m.bbox.w * s;
    const cx = (opts.cx != null ? opts.cx : 0), cy = (opts.cy != null ? opts.cy : 0);
    // 水平:用字母實際 bbox 置中。垂直:按四線格基線定位 ——
    //   把「字母帶」中線(y=50,即 x-height 線)對到 cy;於是 cap(0)在上、baseline(100)在下,
    //   小寫(50~100)自然落在 x-height 與基線之間,上伸/下伸部正確超出。
    const ox = cx - (m.bbox.x * s + bw / 2);
    const oy = cy - 50 * s;
    const P = function (nx, ny) { return { x: ox + nx * s, y: oy + ny * s }; };
    const lw = opts.width || h * 0.16;

    // 1) 描骨架(圓頭粗線)
    ctx.save();
    ctx.translate(ox, oy); ctx.scale(s, s);
    ctx.lineWidth = lw / s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = opts.color || '#E6DEC9';
    m.strokes.forEach(function (st) { ctx.stroke(new Path2D(st.d)); });
    ctx.restore();

    // 1.5) 筆順動畫:依筆順累計畫到 reveal(0~1)的長度,並在筆尖畫圓點
    if (opts.reveal != null && m.total > 0) {
      const target = Math.max(0, Math.min(1, opts.reveal)) * m.total;
      let acc = 0, pen = null;
      ctx.save();
      ctx.translate(ox, oy); ctx.scale(s, s);
      ctx.lineWidth = lw / s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = opts.penColor || '#F0A24E';
      m.strokes.forEach(function (st) {
        if (acc >= target || st.len <= 0) { acc += st.len; return; }
        const want = target - acc;                 // 這一筆要畫多長
        const frac = Math.min(1, want / st.len);
        const fi = frac * (st.pts.length - 1);
        const last = Math.floor(fi);
        ctx.beginPath();
        ctx.moveTo(st.pts[0].x, st.pts[0].y);
        for (let i = 1; i <= last; i++) ctx.lineTo(st.pts[i].x, st.pts[i].y);
        let px = st.pts[last].x, py = st.pts[last].y;
        if (last < st.pts.length - 1) {            // 內插到精確筆尖位置
          const f2 = fi - last, n = st.pts[last + 1];
          px += (n.x - px) * f2; py += (n.y - py) * f2;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
        pen = { x: px, y: py };
        acc += st.len;
      });
      ctx.restore();
      if (pen) {                                   // 筆尖圓點(螢幕座標)
        const sp = P(pen.x, pen.y);
        ctx.beginPath(); ctx.arc(sp.x, sp.y, lw * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = opts.penColor || '#F0A24E'; ctx.fill();
      }
    }

    // 2) 筆順引導:每筆起點數字徽章 + 終點方向箭頭
    if (opts.showOrder) {
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const r = Math.max(10, h * 0.085);
      m.strokes.forEach(function (st, i) {
        const e = P(st.end.x, st.end.y);
        arrow(ctx, e.x, e.y, st.endDir, Math.max(10, h * 0.07), opts.arrowColor || '#B7A98C');
      });
      m.strokes.forEach(function (st, i) {
        const a = P(st.start.x, st.start.y);
        ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
        ctx.fillStyle = opts.badgeColor || '#7FB08E'; ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.font = '700 ' + Math.round(r * 1.3) + 'px sans-serif';
        ctx.fillText(String(i + 1), a.x, a.y + 1);
      });
      ctx.restore();
    }
    return true;
  }

  window.PLS_LETTERS = {
    has: function (ch) { return !!GLYPHS[ch]; },
    strokeCount: function (ch) { return GLYPHS[ch] ? GLYPHS[ch].length : 0; },
    draw: draw,
    _glyphs: GLYPHS   // 方便除錯/擴充
  };
})();
