// actors/giraffe.js — 長頸鹿(新制 actor,實驗)
//
// 這隻是拿來驗證「零件會不會看起來是分開黏上去的」的實驗品,重點練脖子怎麼接。
// 沿用 husky.js 已經驗證過的三招(身體先畫成一條連續輪廓、四肢骨架點漸變粗細、
// 交界處用鬃毛/毛簇蓋住接縫),但長頸鹿的脖子是全新的挑戰:
//   - 脖子的骨架起點刻意埋進身體輪廓裡(跟腿根同一招),半寬夠寬蓋住縫,
//     再沿頸脊補一排鬃毛短刺蓋住那條線 —— 兩層保險。
//   - 花紋(patch)用「沿脊椎骨架點內插」的方式貼在身體/脖子表面,不是畫在固定世界座標,
//     脖子彎曲時花紋跟著表面走,而不是脖子動了、花紋留在原地穿幫。
//
// 做得到 / 做不到:
//   做不到 —— 真實長頸鹿的骨感比例(這裡刻意壓縮,頭放大、腿不拉到誇張細長,走可愛路線)。
//   做得到 —— 一條連續肩→頸→頭的輪廓、可彎的頸部姿態(低頭吃草/仰頭/趴著捲頸睡)。
//
// 座標:原點 = 腳底中心,y 向上為負。造型面向右,朝左由引擎鏡射(mirror = true)。
(function () {
  const TAU = Math.PI * 2;
  const A = window.PLS_ACTOR;

  const C = {
    body: '#F0CE93', bodyLite: '#F7E1B3', belly: '#FCF3DD',
    patch: '#B97A3E', patchDeep: '#9C632E',
    mane: '#C98F4E', hoof: '#6B5138',
    ossicone: '#E3B370', ossiconeTip: '#8A5A34',
    eye: '#2E2119', eyeRim: '#1A1310', nose: '#6B5138',
    tongue: '#D98C93', shadow: 'rgba(120,90,50,0.18)'
  };

  // 三階段比例差異(不是等比縮放):幼幼頭大、脖子相對短、骨突還沒立起來。
  const STAGES = {
    baby:  { s: 0.80, head: 1.30, neck: 0.62, leg: 0.74, body: 0.96, ossicone: 0.45 },
    kid:   { s: 1.00, head: 1.00, neck: 1.00, leg: 1.00, body: 1.00, ossicone: 1.00 },
    grown: { s: 1.05, head: 0.92, neck: 1.22, leg: 1.08, body: 1.05, ossicone: 1.15, deco: true }
  };

  function el(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.01, Math.abs(rx)), Math.max(0.01, Math.abs(ry)), rot || 0, 0, TAU);
  }
  function lg(ctx, x0, y0, x1, y1, c0, c1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    return g;
  }
  function blink(t) {
    const p = 3.4, ph = (t + 1.1) % p;
    return ph < 0.12 ? 1 - Math.sin((ph / 0.12) * Math.PI) : 1;
  }

  // 沿骨架點(x,y,半寬)生成漸變粗細的肢體輪廓 —— 脖子、腿、尾巴共用同一招。
  function limbPath(ctx, pts) {
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const dl = Math.hypot(dx, dy) || 1;
      dx /= dl; dy /= dl;
      const nx = -dy, ny = dx;
      L.push([p[0] + nx * p[2], p[1] + ny * p[2]]);
      R.push([p[0] - nx * p[2], p[1] - ny * p[2]]);
    }
    const last = pts.length - 1;
    ctx.beginPath();
    ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < L.length; i++) {
      const mx = (L[i - 1][0] + L[i][0]) / 2, my = (L[i - 1][1] + L[i][1]) / 2;
      ctx.quadraticCurveTo(L[i - 1][0], L[i - 1][1], mx, my);
    }
    ctx.lineTo(L[last][0], L[last][1]);
    ctx.quadraticCurveTo(pts[last][0] + (L[last][0] - pts[last][0]) * 0.4,
      pts[last][1] + (L[last][1] - pts[last][1]) * 0.4, R[last][0], R[last][1]);
    for (let i = R.length - 2; i >= 0; i--) {
      const mx = (R[i + 1][0] + R[i][0]) / 2, my = (R[i + 1][1] + R[i][1]) / 2;
      ctx.quadraticCurveTo(R[i + 1][0], R[i + 1][1], mx, my);
    }
    ctx.lineTo(R[0][0], R[0][1]);
    ctx.closePath();
  }

  // 沿一串骨架點(limbPath 用的那種)內插出 k(0~1)處、往法線方向偏移 lateral*半寬 的一點。
  // 花紋貼在脖子表面就是靠這個 —— 脖子怎麼彎,花紋跟著怎麼走,不會脫離表面。
  function alongLimb(pts, k, lateral) {
    const n = pts.length - 1;
    const f = Math.max(0, Math.min(0.999, k)) * n;
    const i = Math.floor(f), frac = f - i;
    const a = pts[i], b = pts[Math.min(n, i + 1)];
    const x = a[0] + (b[0] - a[0]) * frac, y = a[1] + (b[1] - a[1]) * frac;
    const w = a[2] + (b[2] - a[2]) * frac;
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    const nx = -dy, ny = dx;
    return [x + nx * w * lateral, y + ny * w * lateral, w];
  }

  // ── 身體輪廓:肩高臀低(長頸鹿最明顯的體型特徵),fill 與 clip 共用同一條 path。
  function bodyPath(ctx, B) {
    ctx.beginPath();
    ctx.moveTo(38 * B, -148 * B);                                  // 頸根上緣
    ctx.quadraticCurveTo(58 * B, -156 * B, 52 * B, -172 * B);       // 肩峰(全身最高點)
    ctx.quadraticCurveTo(18 * B, -182 * B, -22 * B, -172 * B);      // 背線斜斜往後下降到臀
    ctx.quadraticCurveTo(-54 * B, -164 * B, -60 * B, -140 * B);     // 臀部圓弧
    ctx.quadraticCurveTo(-64 * B, -118 * B, -48 * B, -104 * B);     // 後大腿外緣
    ctx.quadraticCurveTo(-16 * B, -92 * B, 12 * B, -96 * B);        // 腹線(白肚子會 clip 在這一段)
    ctx.quadraticCurveTo(38 * B, -100 * B, 48 * B, -120 * B);       // 前胸下緣(深胸)
    ctx.quadraticCurveTo(54 * B, -138 * B, 38 * B, -148 * B);       // 回到頸根
    ctx.closePath();
  }

  // 脖子骨架:base 埋進身體輪廓裡,angle(整體前後傾)+ curl(S 型弧度)+ reach(往前extra,
  // 給吃草/打招呼用)三個參數就能表現所有動作,不用每個動作各存一組座標。
  function neckPts(baseX, baseY, len, w, angle, curl, reach) {
    const n = 5, pts = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const bend = angle * k * k + curl * Math.sin(k * Math.PI);
      const segLen = len * k;
      const x = baseX + Math.sin(bend) * segLen + reach * k * k;
      const y = baseY - Math.cos(bend) * segLen;
      pts.push([x, y, w * (1 - k * 0.5)]);
    }
    return pts;
  }

  function hoof(ctx, x, y, w) {
    ctx.fillStyle = C.hoof;
    el(ctx, x, y, w, w * 0.6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y - w * 0.5); ctx.lineTo(x, y + w * 0.5); ctx.stroke();
  }

  function leg(ctx, x, topY, len, w, swing, lift, shade, S) {
    ctx.save();
    ctx.translate(x, topY);
    ctx.rotate(swing);
    const pts = [
      [0, -14, w * 1.2],
      [1, len * 0.3, w * 0.66],
      [-1, len * 0.6, w * 0.42],
      [2, len * 0.85 - lift, w * 0.36],
      [3, len - lift, w * 0.34]
    ];
    ctx.fillStyle = shade ? lg(ctx, 0, 0, 0, len, '#C9A468', '#D9B67B')
      : lg(ctx, -w, 0, w, 0, C.body, C.bodyLite);
    limbPath(ctx, pts); ctx.fill();
    // 膝下淡淡花斑一小塊,呼應身體圖案,不會腿是純色一根棍子
    ctx.save(); limbPath(ctx, pts); ctx.clip();
    ctx.fillStyle = shade ? 'rgba(156,99,46,0.25)' : 'rgba(156,99,46,0.4)';
    el(ctx, 1, len * 0.62, w * 0.9, w * 0.7); ctx.fill();
    ctx.restore();
    const tip = pts[pts.length - 1];
    hoof(ctx, tip[0], tip[1], w * 0.5);
    ctx.restore();
  }

  // 鬃毛短刺:沿一串骨架點的「背側」冒出一排小三角,蓋住頸根與身體的接縫,
  // 也是長頸鹿真實的特徵(不是憑空加裝飾)。
  function mane(ctx, pts) {
    ctx.fillStyle = C.mane;
    for (let k = 0.04; k <= 0.98; k += 0.09) {
      const p = alongLimb(pts, k, -1.15);
      const p2 = alongLimb(pts, Math.min(0.999, k + 0.05), -1.15);
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo((p[0] + p2[0]) / 2 + (p2[1] - p[1]) * 0.14, (p[1] + p2[1]) / 2 - (p2[0] - p[0]) * 0.14);
      ctx.lineTo(p2[0], p2[1]);
      ctx.closePath(); ctx.fill();
    }
  }

  // 花紋清單:k 沿身體→脖子的共同骨架內插,body 的骨架點另外在 draw() 裡用同一支
  // alongLimb 對 bodySpine 取樣,脖子則直接對 neckPts 取樣 —— 兩段用同一份清單分兩次貼,
  // 交界處的花紋因此連得起來,不會「脖子一塊、身體一塊各自對不上」。
  const PATCHES = [
    { k: 0.06, lat: 0.5, r: 13 }, { k: 0.06, lat: -0.55, r: 11 },
    { k: 0.22, lat: 0.6, r: 15 }, { k: 0.22, lat: -0.5, r: 12 },
    { k: 0.40, lat: 0.55, r: 14 }, { k: 0.40, lat: -0.6, r: 12 },
    { k: 0.58, lat: 0.5, r: 12 }, { k: 0.58, lat: -0.5, r: 11 },
    { k: 0.74, lat: 0.55, r: 11 }, { k: 0.74, lat: -0.45, r: 9 },
    { k: 0.88, lat: 0.5, r: 9 }, { k: 0.88, lat: -0.45, r: 8 }
  ];
  function drawPatches(ctx, pts, scale) {
    ctx.fillStyle = C.patch;
    PATCHES.forEach(function (p) {
      const q = alongLimb(pts, p.k, p.lat);
      el(ctx, q[0], q[1], p.r * (scale || 1), p.r * 0.86 * (scale || 1));
      ctx.fill();
    });
  }

  // 開心/打招呼時頭頂冒的小星星(比照 husky/chick 既有慣例:happy/greet 除了表情,
  // 額外加一個小特效才有「情緒被看見」的感覺,不是只有骨架動作)。
  function sparkle(ctx, t) {
    [[-16, -42, 0], [12, -50, 1.4]].forEach(function (p) {
      const bob = Math.abs(Math.sin(t * 8 + p[2])) * 6;
      ctx.save();
      ctx.translate(p[0], p[1] - bob);
      ctx.rotate(t * 3 + p[2]);
      ctx.fillStyle = '#F6C95E';
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const a = k / 4 * TAU;
        ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6);
        ctx.lineTo(Math.cos(a + Math.PI / 4) * 2.2, Math.sin(a + Math.PI / 4) * 2.2);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    });
  }

  // 頭:骨突(ossicone)、耳、大眼睛、口鼻。頭部座標系:頸頂端點為原點,面向右。
  function head(ctx, S, act, e, eatK, t) {
    const oh = 22 * S.ossicone;
    // 骨突(兩根,幼幼是圓滾滾的小絨球,大寶尖一點)
    [-9, 9].forEach(function (dx) {
      ctx.strokeStyle = C.ossicone; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(dx, -6); ctx.lineTo(dx * 1.1, -6 - oh); ctx.stroke();
      ctx.fillStyle = C.ossiconeTip; el(ctx, dx * 1.1, -6 - oh, 5.5, 5.5); ctx.fill();
    });
    // 耳朵(左右各一,微微外張;跟頭同色系但加一圈邊線,不然貼在頭上會分不出輪廓)
    [-1, 1].forEach(function (k) {
      ctx.save(); ctx.translate(k * 18, -18); ctx.rotate(k * 0.5);
      ctx.fillStyle = C.bodyLite;
      ctx.strokeStyle = 'rgba(156,99,46,0.55)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(k * 20, -6, k * 24, 6); ctx.quadraticCurveTo(k * 14, 14, 0, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(156,99,46,0.35)';
      ctx.beginPath(); ctx.moveTo(k * 4, 0); ctx.quadraticCurveTo(k * 18, -4, k * 20, 5); ctx.quadraticCurveTo(k * 13, 10, k * 4, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
    });
    // 頭骨主體(圓潤,幼幼更圓)
    ctx.fillStyle = lg(ctx, -20, -10, 24, 10, C.bodyLite, C.body);
    ctx.beginPath();
    ctx.moveTo(-16, -8);
    ctx.quadraticCurveTo(-20, -26, 0, -28);
    ctx.quadraticCurveTo(20, -26, 22, -6);
    ctx.quadraticCurveTo(24 + 14 * (act === 'eat' ? 0.4 : 1), 4, 26, 12);   // 口鼻往前突
    ctx.quadraticCurveTo(20, 20, 4, 18);
    ctx.quadraticCurveTo(-14, 16, -16, -8);
    ctx.closePath(); ctx.fill();
    // 口鼻淺色
    ctx.fillStyle = C.belly;
    el(ctx, 20, 11, 9, 7); ctx.fill();
    ctx.fillStyle = C.nose;
    el(ctx, 25, 9, 2.6, 2); ctx.fill();
    if (eatK > 0.3) {
      ctx.fillStyle = C.tongue;
      ctx.beginPath(); ctx.moveTo(20, 16); ctx.quadraticCurveTo(26, 20 + eatK * 4, 30, 15); ctx.quadraticCurveTo(25, 22, 18, 19); ctx.closePath(); ctx.fill();
    }
    // 嘴:預設是一條淺淺的閉嘴線;開心/打招呼/玩耍咧嘴笑(舌尖露出來)才看得出情緒,
    // 不然光靠骨架動作沒有表情,笑不笑得出來全靠這幾筆。
    ctx.strokeStyle = C.nose; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    if (act === 'happy' || act === 'greet' || act === 'play') {
      ctx.beginPath(); ctx.moveTo(14, 15); ctx.quadraticCurveTo(23, 25, 30, 14); ctx.stroke();
      ctx.fillStyle = C.tongue;
      ctx.beginPath(); ctx.moveTo(19, 17); ctx.quadraticCurveTo(23, 27, 27, 16); ctx.quadraticCurveTo(23, 21, 19, 17); ctx.closePath(); ctx.fill();
    } else if (act === 'sad') {
      ctx.beginPath(); ctx.moveTo(15, 19); ctx.quadraticCurveTo(23, 14, 29, 18); ctx.stroke();
    } else if (eatK <= 0.3) {
      ctx.beginPath(); ctx.moveTo(16, 17); ctx.quadraticCurveTo(23, 19, 28, 16); ctx.stroke();
    }
    if (act === 'happy' || act === 'greet') sparkle(ctx, t);
    // 大眼睛(閉眼/瞇眼由 act 控制)
    const bl = act === 'sleep' ? 0.1 : blink(e);
    const sq = act === 'happy' || act === 'greet' ? 0.55 : 1;
    ctx.save(); ctx.translate(2, -8); ctx.scale(1, bl * sq);
    ctx.fillStyle = '#FFFFFF'; el(ctx, 0, 0, 8, 8.6); ctx.fill();
    ctx.fillStyle = C.eyeRim; el(ctx, 0, 0, 7, 7.4); ctx.fill();
    ctx.fillStyle = C.eye; el(ctx, 1.4, 1, 5, 5.4); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; el(ctx, -1.4, -1.6, 2.2, 2.2); ctx.fill();
    ctx.restore();
    if (act === 'sad') {
      ctx.strokeStyle = C.eyeRim; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-6, -18); ctx.lineTo(0, -15); ctx.stroke();
    }
  }

  function zzz(ctx, x, y, t) {
    for (let i = 0; i < 3; i++) {
      const ph = ((t * 0.5) + i * 0.33) % 1;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.75;
      ctx.fillStyle = '#B08850';
      ctx.font = (11 + i * 5) + 'px "Andika","Huninn","Baloo 2",sans-serif';
      ctx.fillText('z', x + i * 8, y - ph * 40);
    }
    ctx.globalAlpha = 1;
  }

  // 大寶配件 5 款(戴在骨突/頭頂,座標相對頸頂端點,同 head() 座標系)
  function deco(ctx, idx) {
    ctx.save();
    if (idx === 0) {
      ctx.fillStyle = '#3A6B8C';
      ctx.beginPath(); ctx.moveTo(-16, -30); ctx.quadraticCurveTo(2, -58, 20, -30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.eye; el(ctx, 4, -50, 4, 4); ctx.fill();
    } else if (idx === 1) {
      ctx.translate(0, -34);
      ['#C9566A', '#C9566A'].forEach(function (c, i) {
        const k = i ? 1 : -1;
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(k * 16, -12, k * 20, -2); ctx.quadraticCurveTo(k * 18, 8, 0, 0); ctx.closePath(); ctx.fill();
      });
      ctx.fillStyle = '#98374A'; el(ctx, 0, -2, 5, 5); ctx.fill();
    } else if (idx === 2) {
      ctx.strokeStyle = '#7AA7D9'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-14, -8); ctx.quadraticCurveTo(4, -20, 20, -6); ctx.stroke();
      ctx.fillStyle = '#F4C64E'; el(ctx, 20, -6, 4, 4); ctx.fill();
    } else if (idx === 3) {
      ctx.fillStyle = '#EFA0B4';
      for (let k = 0; k < 5; k++) {
        const a = Math.PI + k / 4 * Math.PI;
        el(ctx, 2 + Math.cos(a) * 22, -30 + Math.sin(a) * 12, 6, 6); ctx.fill();
      }
      ctx.fillStyle = '#F6D06A'; el(ctx, -18, -30, 4, 4); ctx.fill();
    } else {
      ctx.fillStyle = '#3F9E8C'; el(ctx, 2, -32, 24, 8, 0.1); ctx.fill();
      ctx.fillStyle = '#F4C64E'; el(ctx, 0, -22, 7, 7); ctx.fill();
    }
    ctx.restore();
  }

  function draw(ctx, t, st) {
    const S = STAGES[st.stage] || STAGES.kid;
    const B = S.body;
    const act = st.action;
    const walk = st.legAmp;
    const ph = st.legPhase;
    const e = st.elapsed;

    // ── 姿態變數(全部用連續參數表現,不用每個動作各存一組寫死座標)──
    const eatK = act === 'eat' ? Math.min(1, e / 0.6) : 0;
    const droop = act === 'sad' ? Math.min(1, e / 0.5) : 0;
    const stretchK = act === 'stretch' ? Math.sin(Math.min(e, 1.6) / 1.6 * Math.PI) : 0;
    const sleepK = act === 'sleep' ? st.settle : 0;
    const restK = act === 'rest' ? st.settle : 0;
    const greetK = act === 'greet' ? Math.min(1, e / 0.25) : 0;
    const playK = act === 'play' ? 1 : 0;
    const idleSway = Math.sin(t * 0.9) * 0.05;
    // happy 跟 greet 都要有彈跳,但 greet 是「歡迎你來!」的點頭雀躍,
    // 不是 happy 那種過關的大幅度慶祝,彈跳/點頭都做得比較小一點區別出來。
    const hop = act === 'happy' ? Math.abs(Math.sin(t * 7)) : act === 'greet' ? Math.abs(Math.sin(t * 6.5)) * 0.55 : 0;

    // 脖子姿態:angle(整體前傾/後仰)+ curl(閒晃時的 S 型)+ reach(伸長)
    let neckAngle = idleSway, neckCurl = Math.sin(t * 0.6) * 0.06, neckReach = 0;
    if (act === 'walk') { neckAngle = -0.06 + Math.sin(ph) * 0.05 * walk; neckCurl = 0.04; }
    if (eatK > 0) { neckAngle = 1.05 * eatK; neckReach = 26 * eatK; neckCurl = -0.1 * eatK; }
    if (act === 'happy') { neckAngle = -0.34 - hop * 0.06; neckCurl = Math.sin(t * 6) * 0.08; }
    if (stretchK > 0) { neckAngle = -0.5 * stretchK; neckReach = -6 * stretchK; }
    if (droop > 0) { neckAngle = 0.62 * droop; neckCurl = 0.16 * droop; }
    if (sleepK > 0) { neckAngle = 1.55 * sleepK; neckCurl = -0.55 * sleepK; neckReach = -34 * sleepK; }
    if (restK > 0) { neckAngle = 0.32 * restK; neckCurl = -0.08 * restK; }
    // greet:頭反覆點下去又抬起來(像在說「哈囉哈囉!」),不是單次緩緩傾斜一下就定住
    if (greetK > 0) { neckAngle = 0.44 + Math.sin(t * 6.5) * 0.22 * greetK; neckCurl = Math.sin(t * 6.5 + 1) * 0.1 * greetK; }
    if (playK > 0) { neckAngle = -0.1 + Math.sin(t * 4.5) * 0.18; neckCurl = Math.sin(t * 3.1) * 0.1; }

    const bounce = act === 'happy' ? hop * 16 : act === 'greet' ? hop * 9 : 0;
    const bodyY = -bounce + Math.sin(t * 1.4) * 1.6 * (1 - sleepK * 0.5);

    ctx.save();
    ctx.scale(S.s, S.s);

    // 影子
    ctx.fillStyle = C.shadow;
    el(ctx, -6, 4, 56, 10); ctx.fill();

    // ═══ 遠側兩條腿(壓暗做景深)═══
    const swA = Math.sin(ph) * 0.22 * walk, swB = Math.sin(ph + Math.PI) * 0.22 * walk;
    const liftA = Math.max(0, Math.sin(ph)) * 7 * walk, liftB = Math.max(0, Math.sin(ph + Math.PI)) * 7 * walk;
    leg(ctx, -44 * B, -104 * B + bodyY, 108, 9.5, swB, liftB, true, S);
    leg(ctx, 36 * B, -122 * B + bodyY, 118, 9, swA, liftA, true, S);

    // ═══ 尾巴:根部埋進臀部輪廓裡(跟腿根同一招),往下垂 + 深色尾刷收尾 ═══
    const tailWag = Math.sin(st.tailPhase) * (act === 'happy' || act === 'greet' ? 0.45 : act === 'sleep' ? 0.03 : 0.14);
    ctx.save();
    ctx.translate(-52 * B, -132 * B + bodyY);
    ctx.rotate(0.16 + tailWag + droop * 0.5 + sleepK * 0.3);
    const tailPts = [[-1, -14, 9], [0, 16, 6.5], [1, 42, 5], [0, 64, 4], [2, 80, 3.4]];
    ctx.fillStyle = lg(ctx, 0, -14, 0, 80, C.body, C.bodyLite);
    limbPath(ctx, tailPts); ctx.fill();
    ctx.fillStyle = C.mane;
    el(ctx, 2, 84, 7, 10); ctx.fill();
    ctx.restore();

    // ═══ 身體(單一連續輪廓) ═══
    ctx.save();
    ctx.translate(0, bodyY);
    bodyPath(ctx, B); ctx.fillStyle = lg(ctx, -40, -180, 40, -100, C.bodyLite, C.body); ctx.fill();
    // 花紋:對「身體骨架」取樣(從臀到頸根一條假想骨架,跟脖子取樣用同一支函式);
    // 白肚子最後才蓋上去,免得花紋把肚子蓋成一整片棕色,看不出身體輪廓
    const bodySpine = [[-52 * B, -150 * B, 26 * B], [-10 * B, -160 * B, 30 * B], [24 * B, -150 * B, 26 * B], [40 * B, -142 * B, 18 * B]];
    ctx.save(); bodyPath(ctx, B); ctx.clip();
    drawPatches(ctx, bodySpine, B * 0.82);
    ctx.restore();
    ctx.save(); bodyPath(ctx, B); ctx.clip();
    ctx.fillStyle = C.belly;
    el(ctx, -6 * B, -96 * B, 44 * B, 20 * B); ctx.fill();
    ctx.restore();
    ctx.restore(); // body translate

    // ═══ 脖子(骨架起點埋進身體輪廓裡)═══
    const neckBaseX = 34 * B, neckBaseY = -150 * B + bodyY;
    const nPts = neckPts(neckBaseX, neckBaseY, 132 * S.neck, 15 * B, neckAngle, neckCurl, neckReach);
    ctx.save();
    ctx.fillStyle = lg(ctx, neckBaseX, neckBaseY, nPts[5][0], nPts[5][1], C.body, C.bodyLite);
    limbPath(ctx, nPts); ctx.fill();
    ctx.save(); limbPath(ctx, nPts); ctx.clip();
    drawPatches(ctx, nPts, 1);
    mane(ctx, nPts);
    ctx.restore();
    ctx.restore();

    // ═══ 頭(在脖子頂端)═══
    const tip = nPts[5];
    const prev = nPts[4];
    const headAngle = Math.atan2(tip[0] - prev[0], -(tip[1] - prev[1]));
    ctx.save();
    ctx.translate(tip[0], tip[1]);
    ctx.rotate(headAngle * 0.6);
    ctx.scale(S.head, S.head);
    head(ctx, S, act, e, eatK, t);
    if (S.deco) deco(ctx, st.deco | 0);
    ctx.restore();

    if (sleepK > 0.6) zzz(ctx, tip[0] + 20, tip[1] - 30, t);

    // ═══ 近側兩條腿(蓋在身體前面) ═══
    leg(ctx, -46 * B, -100 * B + bodyY, 106, 10.5, swB * 0.9, liftA, false, S);
    leg(ctx, 40 * B, -118 * B + bodyY, 116, 10, swA * 0.9, liftB, false, S);

    ctx.restore(); // stage scale
  }

  A.define('giraffe', {
    draw: draw,
    mirror: true,
    // 長頸鹿刻意比其他物種高得多(脖子是賣點),但體型(halfWidth)反而比中型犬窄。
    bounds: { top: -330, bottom: 8, halfWidth: 78 },
    // 長腿但步頻放慢(悠哉感);真實長頸鹿走路是同側前後腳一起動的「側對步」,
    // 這裡先用一般四足對角步態近似,先求好看,不強求生物力學精確。
    locomotion: { speed: 48, legFreq: 3.4, tailFreq: 1.6, lean: 0.08, gait: 'pace' },
    holds: { happy: 2.6, eat: 3.2, play: 2.6, rest: 3.4, sleep: 5.2, stretch: 2.2, greet: 1.8, sad: 2.2 },
    ambient: {
      min: 3, max: 7,
      pool: [{ action: 'stretch', weight: 3 }, { action: 'rest', weight: 3 }, { action: 'sleep', weight: 2 }]
    }
  });
})();
