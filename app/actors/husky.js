// actors/husky.js — 哈士奇「哈哈」(新制 actor,v13;v3 造型:3/4 側身幼犬)
//
// 這一版是照著「CG 幼犬參考圖」重畫的,不是把舊版微調。
//
// v3 修掉 v2 的四個毛病:
//   1. 肚子的白毛原本是「另外畫一團」→ 浮在身體上像貼了一朵雲,而且會超出輪廓。
//      改成先畫整個身體,再用**身體輪廓 clip**,在裡面填白色下腹 —— 白毛永遠貼合身形。
//   2. 腿原本是矩形柱 → 改成大腿粗、膝蓋收窄、腳掌外擴的貝茲曲線,腿根藏進身體裡。
//   3. 頸毛原本畫成一整圈 → 變成獅子鬃毛。改成只畫頭與身體交界的那一段弧。
//   4. 嘴原本是倒 V + 兩條下垂線 = 生氣臉 → 改成上揚的微笑。
//   另外身體縮短、輪廓加毛簇,讓比例回到幼犬的緊湊圓潤。
//
// 做得到 / 做不到(講清楚,免得下次又拿 3D 圖來對):
//   做不到 —— 逐根毛髮、次表面散射、環境光遮蔽。canvas 2D 沒有 shader。
//   做得到 —— 姿態、比例、蓬鬆的毛簇輪廓、多層漸層塑形、大眼多層高光。
//              結果是「同一隻狗的向量插畫版」,不是照片。
//
// 座標:原點 = 腳底中心,y 向上為負。造型**面向右**,朝左由引擎鏡射(spec.mirror = true)。
(function () {
  const TAU = Math.PI * 2;
  const A = window.PLS_ACTOR;

  const C = {
    dark:   '#6B625A',
    mid:    '#8B8178',
    lite:   '#A79D93',
    hi:     '#BDB3A8',
    white:  '#F7F4F0',
    white2: '#E6DED6',
    nose:   '#2A2724',
    eye:    '#26313D',
    eyeRim: '#1A1F26',
    inner:  '#D9A9AE',
    tongue: '#E28A96',
    shadow: 'rgba(92,78,64,0.18)'
  };

  // 三階段:比例差異,不是等比縮放。
  const STAGES = {
    baby:  { s: 0.78, head: 1.16, muzzle: 0.80, leg: 0.74, body: 0.90, ear: 0.86, sprout: true },
    kid:   { s: 1.00, head: 1.00, muzzle: 1.00, leg: 1.00, body: 1.00, ear: 1.00 },
    grown: { s: 1.10, head: 0.90, muzzle: 1.12, leg: 1.14, body: 1.10, ear: 1.06, deco: true }
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
    const p = 3.6, ph = (t + 0.7) % p;
    return ph < 0.12 ? 1 - Math.sin((ph / 0.12) * Math.PI) : 1;
  }
  // 沿一條直線長毛簇(用在背線、腹線這種「邊」上,不是繞一圈)
  function furEdge(ctx, x0, y0, x1, y1, n, len, phase) {
    for (let i = 0; i < n; i++) {
      const k0 = i / n, k1 = (i + 1) / n, km = (k0 + k1) / 2;
      const ax = x0 + (x1 - x0) * k0, ay = y0 + (y1 - y0) * k0;
      const bx = x0 + (x1 - x0) * k1, by = y0 + (y1 - y0) * k1;
      const mx = x0 + (x1 - x0) * km, my = y0 + (y1 - y0) * km;
      const dx = (y1 - y0), dy = -(x1 - x0);
      const dl = Math.hypot(dx, dy) || 1;
      const w = len * (0.65 + 0.35 * Math.sin(i * 2.3 + (phase || 0)));
      if (i === 0) ctx.lineTo(ax, ay);
      ctx.quadraticCurveTo(mx + dx / dl * w, my + dy / dl * w, bx, by);
    }
  }
  function zzz(ctx, x, y, t) {
    for (let i = 0; i < 3; i++) {
      const ph = ((t * 0.5) + i * 0.33) % 1;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.75;
      ctx.fillStyle = '#9A8E80';
      ctx.font = (11 + i * 5) + 'px "Andika","Huninn","Baloo 2",sans-serif';
      ctx.fillText('z', x + i * 8, y - ph * 40);
    }
    ctx.globalAlpha = 1;
  }

  // 沿骨架點生成「有粗細變化的肢體輪廓」。pts = [[x, y, 半寬], ...]
  // 尾巴、前腿、後腿都用它 —— 等寬的帶子看起來就是塑膠管,粗細變化才有肉感。
  // (跨物種不共用造型函式是原則;同一隻動物內部的幾何工具當然可以共用)
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
    // 末端半圓收頭
    ctx.quadraticCurveTo(pts[last][0] + (L[last][0] - pts[last][0]) * 0.4 + (pts[last][0] - pts[last - 1][0]) * 0.5,
      pts[last][1] + (L[last][1] - pts[last][1]) * 0.4 + (pts[last][1] - pts[last - 1][1]) * 0.5,
      R[last][0], R[last][1]);
    for (let i = R.length - 2; i >= 0; i--) {
      const mx = (R[i + 1][0] + R[i][0]) / 2, my = (R[i + 1][1] + R[i][1]) / 2;
      ctx.quadraticCurveTo(R[i + 1][0], R[i + 1][1], mx, my);
    }
    ctx.lineTo(R[0][0], R[0][1]);
    ctx.closePath();
  }

  // 腳掌:橢圓 + 三根腳趾的分隔,遠比一顆橢圓有精神
  function paw(ctx, x, y, w, shade) {
    ctx.fillStyle = shade ? C.white2 : C.white;
    el(ctx, x, y, w, w * 0.62); ctx.fill();
    ctx.strokeStyle = shade ? 'rgba(190,180,170,0.7)' : 'rgba(196,186,176,0.85)';
    ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    [-0.42, 0, 0.42].forEach(function (k) {
      ctx.beginPath();
      ctx.moveTo(x + w * k * 0.9, y - w * 0.1);
      ctx.lineTo(x + w * k * 1.05, y + w * 0.42);
      ctx.stroke();
    });
  }

  // 大寶配件 5 款(頭部座標系:頭中心 0,0;頭頂約 -40)
  function deco(ctx, idx) {
    ctx.save();
    if (idx === 0) {
      ctx.fillStyle = '#3A6B8C';
      ctx.beginPath(); ctx.moveTo(-40, -26); ctx.quadraticCurveTo(-6, -80, 34, -30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4E8AAE'; el(ctx, -3, -26, 42, 10, -0.08); ctx.fill();
      ctx.fillStyle = C.white; el(ctx, -6, -74, 10, 10); ctx.fill();
    } else if (idx === 1) {
      ctx.translate(-26, -34); ctx.rotate(-0.25);
      ctx.fillStyle = '#C9566A';
      [-1, 1].forEach(function (k) {
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(k * 18, -14, k * 24, -3);
        ctx.quadraticCurveTo(k * 22, 9, 0, 0);
        ctx.closePath(); ctx.fill();
      });
      ctx.fillStyle = '#98374A'; el(ctx, 0, 0, 6, 6); ctx.fill();
    } else if (idx === 2) {
      ctx.fillStyle = '#C9566A'; el(ctx, -14, 34, 40, 13, 0.12); ctx.fill();
      ctx.fillStyle = '#98374A';
      ctx.beginPath(); ctx.moveTo(-38, 34); ctx.lineTo(-20, 40); ctx.lineTo(-34, 66); ctx.closePath(); ctx.fill();
    } else if (idx === 3) {
      ctx.fillStyle = '#EFA0B4';
      for (let k = 0; k < 6; k++) {
        const a = Math.PI + k / 5 * Math.PI;
        el(ctx, -4 + Math.cos(a) * 30, -30 + Math.sin(a) * 16, 7, 7); ctx.fill();
      }
      ctx.fillStyle = '#F6D06A'; el(ctx, -34, -30, 5, 5); ctx.fill();
    } else {
      ctx.fillStyle = '#3F9E8C'; el(ctx, -12, 32, 36, 10, 0.12); ctx.fill();
      ctx.fillStyle = '#F4C64E'; el(ctx, -14, 42, 9, 9); ctx.fill();
      ctx.fillStyle = '#C9962E'; el(ctx, -14, 44, 3, 3); ctx.fill();
    }
    ctx.restore();
  }

  // ── 身體輪廓:fill 與 clip 共用同一條 path,白肚子才不會跑出身體外 ──
  // 面向右:前胸在 +,臀部在 -。背線與腹線帶毛簇。
  function bodyPath(ctx, B) {
    ctx.beginPath();
    ctx.moveTo(62 * B, -142 * B);                                   // 頸根(前上)
    // 背線:肩 → 腰 → 臀,毛簇朝上
    furEdge(ctx, 62 * B, -142 * B, -18 * B, -150 * B, 4, 3.5, 0.4);
    ctx.quadraticCurveTo(-58 * B, -150 * B, -72 * B, -122 * B);     // 臀部圓弧
    ctx.quadraticCurveTo(-84 * B, -96 * B, -66 * B, -80 * B);       // 後大腿外緣
    // 腹線:往前,毛簇朝下
    furEdge(ctx, -66 * B, -80 * B, 20 * B, -72 * B, 4, 4, 1.1);
    ctx.quadraticCurveTo(48 * B, -70 * B, 60 * B, -92 * B);         // 前胸下緣
    ctx.quadraticCurveTo(70 * B, -118 * B, 62 * B, -142 * B);       // 前胸 → 回頸根
    ctx.closePath();
  }

  function mix(a, b, k) {
    const o = [];
    for (let i = 0; i < a.length; i++) {
      o.push([a[i][0] + (b[i][0] - a[i][0]) * k, a[i][1] + (b[i][1] - a[i][1]) * k, a[i][2]]);
    }
    return o;
  }

  // 前腿:肩 → 肘 → 腕 → 掌。fold = 往前平伸(趴著/伸懶腰時)。
  function frontLeg(ctx, x, topY, len, w, swing, lift, shade, S, fold) {
    fold = fold || 0;
    // 摺起來的腿「站立高度」會變矮 —— 不縮短的話身體一沉,腳就穿到地板下面去了
    const L = len * S.leg * (1 - fold * 0.5) - lift;
    ctx.save();
    ctx.translate(x, topY);
    ctx.rotate(swing * (1 - fold));
    const stand = [
      [0, -16, w * 1.15],          // 肩(埋在身體裡)
      [1, L * 0.32, w * 0.95],     // 上臂
      [2, L * 0.62, w * 0.72],     // 肘下收窄
      [1, L * 0.86, w * 0.6],      // 腕
      [0, L, w * 0.58]
    ];
    const flat = [                 // 往前平伸:趴著時前腳伸在身體前方
      [0, -16, w * 1.15],
      [8, L * 0.26, w * 0.95],
      [26, L * 0.42, w * 0.72],
      [46, L * 0.5, w * 0.6],
      [64, L * 0.52, w * 0.58]
    ];
    const pts = mix(stand, flat, fold);
    ctx.fillStyle = shade ? lg(ctx, 0, 0, 0, L, '#7A7168', '#8E8479')
      : lg(ctx, -w, 0, w, 0, C.mid, C.lite);
    limbPath(ctx, pts); ctx.fill();
    // 白襪(裁在腿內,毛簇分界)
    const tip = pts[pts.length - 1];
    ctx.save(); limbPath(ctx, pts); ctx.clip();
    ctx.fillStyle = shade ? C.white2 : C.white;
    ctx.beginPath();
    ctx.moveTo(tip[0] - w * 2 - fold * 26, tip[1] - L * 0.44 * (1 - fold) - w * fold);
    furEdge(ctx, tip[0] - w * 2 - fold * 26, tip[1] - L * 0.44 * (1 - fold) - w * fold,
      tip[0] + w * 2, tip[1] - L * 0.48 * (1 - fold) - w * fold, 3, 3.5, 0.9);
    ctx.lineTo(tip[0] + w * 2, tip[1] + w * 2); ctx.lineTo(tip[0] - w * 2 - fold * 26, tip[1] + w * 2);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    paw(ctx, tip[0], tip[1], w * 0.72, shade);
    ctx.restore();
  }

  // 後腿:髖 → 膝(往前突)→ 跗關節(往後折)→ 掌。這個 Z 字是狗腿最好認的特徵,
  // 前後腿共用同一個函式就是把這件事抹平的元凶。
  function backLeg(ctx, x, topY, len, w, swing, lift, shade, S, fold) {
    fold = fold || 0;
    // 後腿摺得比前腿多(坐下時整條小腿貼地)
    const L = len * S.leg * (1 - fold * 0.78) - lift;
    ctx.save();
    ctx.translate(x, topY);
    ctx.rotate(swing * 0.7 * (1 - fold));
    const stand = [
      [-2, -18, w * 1.5],          // 髖(大腿最粗,埋在身體裡)
      [4, L * 0.3, w * 1.25],      // 大腿
      [7, L * 0.52, w * 0.8],      // 膝:往前
      [-2, L * 0.74, w * 0.58],    // 跗關節:往後折
      [1, L * 0.92, w * 0.55],
      [2, L, w * 0.55]
    ];
    const folded = [               // 坐下:膝完全折起,小腿往前貼地,腳掌落在身體前方
      [-2, -18, w * 1.5],
      [-2, L * 0.2, w * 1.3],
      [8, L * 0.4, w * 0.95],
      [26, L * 0.5, w * 0.66],
      [42, L * 0.54, w * 0.58],
      [52, L * 0.55, w * 0.55]
    ];
    const pts = mix(stand, folded, fold);
    ctx.fillStyle = shade ? lg(ctx, 0, 0, 0, L, '#7A7168', '#8E8479')
      : lg(ctx, -w, 0, w * 1.4, 0, C.mid, C.lite);
    limbPath(ctx, pts); ctx.fill();
    const tipB = pts[pts.length - 1];
    ctx.save(); limbPath(ctx, pts); ctx.clip();
    ctx.fillStyle = shade ? C.white2 : C.white;
    ctx.beginPath();
    ctx.moveTo(tipB[0] - w * 2.4 - fold * 22, tipB[1] - L * 0.3 * (1 - fold) - w * fold);
    furEdge(ctx, tipB[0] - w * 2.4 - fold * 22, tipB[1] - L * 0.3 * (1 - fold) - w * fold,
      tipB[0] + w * 2.4, tipB[1] - L * 0.34 * (1 - fold) - w * fold, 3, 3.5, 2.2);
    ctx.lineTo(tipB[0] + w * 2.4, tipB[1] + w * 2.4); ctx.lineTo(tipB[0] - w * 2.4 - fold * 22, tipB[1] + w * 2.4);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    paw(ctx, tipB[0], tipB[1], w * 0.7, shade);
    ctx.restore();
  }

  // 坐姿的後腿:大腿從臀部往前下方、膝在前、小腿垂直落地。
  // 這組骨架跟站姿完全不同 —— 用站姿骨架去插值只會得到一條變短的直腿(看起來只是矮了)。
  function sitBackLeg(ctx, x, y, w, shade, S) {
    ctx.save();
    ctx.translate(x, y);
    const pts = [
      [0, -14, w * 1.6],       // 髖(埋在身體裡)
      [14, 10, w * 1.4],       // 大腿往前下方
      [32, 30, w * 1.0],       // 膝:整條大腿幾乎貼地
      [37, 50, w * 0.66],      // 小腿垂直
      [36, 64, w * 0.6]
    ];
    ctx.fillStyle = shade ? lg(ctx, 0, 0, 0, 64, '#7A7168', '#8E8479')
      : lg(ctx, -w, 0, w * 1.6, 0, C.mid, C.lite);
    limbPath(ctx, pts); ctx.fill();
    ctx.save(); limbPath(ctx, pts); ctx.clip();
    ctx.fillStyle = shade ? C.white2 : C.white;
    ctx.beginPath();
    ctx.moveTo(10, 46); furEdge(ctx, 10, 46, 60, 42, 3, 3.5, 1.2);
    ctx.lineTo(60, 90); ctx.lineTo(10, 90); ctx.closePath(); ctx.fill();
    ctx.restore();
    paw(ctx, 36, 68, w * 0.72, shade);
    ctx.restore();
  }

  // 趴姿的後腿:整條摺在身側,只露出膝與腳掌
  function lieBackLeg(ctx, x, y, w, shade, S) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = shade ? '#7A7168' : lg(ctx, -w, -10, w * 2, 14, C.mid, C.lite);
    ctx.beginPath();
    ctx.moveTo(-16, -20);
    ctx.quadraticCurveTo(28, -22, 40, -2);
    ctx.quadraticCurveTo(46, 12, 22, 16);
    ctx.quadraticCurveTo(-4, 18, -18, 6);
    ctx.closePath(); ctx.fill();
    paw(ctx, 34, 12, w * 0.66, shade);
    ctx.restore();
  }

  // 趴姿的前腿:往前平伸,肘著地
  function lieFrontLeg(ctx, x, y, w, shade, S, reach) {
    ctx.save();
    ctx.translate(x, y);
    const pts = [
      [0, -16, w * 1.1],
      [10, 0, w * 0.95],
      [28, 10, w * 0.78],
      [reach * 0.6, 15, w * 0.68],
      [reach, 16, w * 0.62]
    ];
    ctx.fillStyle = shade ? lg(ctx, 0, 0, reach, 0, '#7A7168', '#8E8479')
      : lg(ctx, 0, -10, 0, 18, C.lite, C.mid);
    limbPath(ctx, pts); ctx.fill();
    ctx.save(); limbPath(ctx, pts); ctx.clip();
    ctx.fillStyle = shade ? C.white2 : C.white;
    ctx.beginPath();
    ctx.moveTo(reach * 0.45, -14); furEdge(ctx, reach * 0.45, -14, reach * 0.5, 30, 3, 3.5, 0.5);
    ctx.lineTo(reach + 30, 30); ctx.lineTo(reach + 30, -14); ctx.closePath(); ctx.fill();
    ctx.restore();
    paw(ctx, reach, 16, w * 0.7, shade);
    ctx.restore();
  }

  function draw(ctx, t, st) {
    const S = STAGES[st.stage] || STAGES.kid;
    const B = S.body;
    const act = st.action;
    const walk = st.legAmp;
    const ph = st.legPhase;
    const e = st.elapsed;

    // ── 姿態變數 ──
    const settleK = (act === 'rest' || act === 'sleep' || act === 'greet') ? st.settle : 0;
    const sit   = (act === 'rest' || act === 'greet') ? settleK : 0;
    const lie   = act === 'sleep' ? settleK : 0;
    const bow   = act === 'stretch' ? Math.sin(Math.min(e, 1.8) / 1.8 * Math.PI)
      : act === 'play' ? 0.55 + 0.45 * Math.sin(t * 3.2) : 0;
    const droop = act === 'sad' ? Math.min(1, e / 0.5) : 0;
    const hop   = act === 'happy' ? Math.abs(Math.sin(t * 7.5)) : 0;
    const eatK  = act === 'eat' ? 1 : 0;

    // ── 三種基本姿態,各有各的腿 ─────────────────────────
    // stand(含走/跳/吃/play bow)、sit(坐)、lie(趴)。
    // 坐與趴**不是**把站姿的腿插值變短 —— 那只會得到一隻矮的站狗。
    const posture = lie > 0.5 ? 'lie' : sit > 0.5 ? 'sit' : 'stand';
    const breathe = Math.sin(t * 1.7) * 1.6 * (1 - lie * 0.6);
    // 坐下**不用平移**:平移會把前胸一起壓下去,那是「蹲」不是「坐」。
    // 坐姿全靠以前胸為支點的旋轉 —— 臀部沉下去、前胸維持高度。
    const bodyY   = -(20 * hop) + sit * 20 + lie * 74 + breathe;
    const frontY  = -(22 * hop) - bow * 40 + lie * 66 + sit * 6;
    const bodyRot = bow * 0.26 - sit * 0.30 - lie * 0.05;
    const headExtra = eatK * 46 + droop * 18 - hop * 6 - sit * 6 - bow * 6;
    const frontFold = bow * 0.5;       // play/stretch:前腿肘著地(站姿的變形,插值 OK)

    ctx.save();
    ctx.scale(S.s, S.s);

    ctx.fillStyle = C.shadow;
    el(ctx, -4 + lie * 14, -4, (74 + lie * 30 - sit * 6) * B, 12 - lie * 4); ctx.fill();

    // ═══ 遠側兩條腿(壓暗 = 景深)═══
    const hipY = -84 * B;
    const swA = Math.sin(ph) * 0.32 * walk, swB = Math.sin(ph + Math.PI) * 0.32 * walk;
    const liftA = Math.max(0, Math.sin(ph)) * 9 * walk, liftB = Math.max(0, Math.sin(ph + Math.PI)) * 9 * walk;
    if (posture === 'lie') {
      lieBackLeg(ctx, -52 * B, -30, 11, true, S);
      lieFrontLeg(ctx, 34 * B, -26, 10.5, true, S, 46);
    } else if (posture === 'sit') {
      sitBackLeg(ctx, -50 * B, -58, 11, true, S);
      frontLeg(ctx, 38 * B, hipY + frontY, 80, 10.5, 0.03, liftA, true, S, 0);
    } else {
      backLeg(ctx, -48 * B, hipY + bodyY, 80, 11, swB * 0.8, liftB, true, S, 0);
      frontLeg(ctx, 30 * B, hipY + frontY, 80, 10.5, swA * 0.8 - bow * 0.3, liftA, true, S, frontFold);
    }

    // ═══ 尾巴:捲尾 + 白尾尖 ═══
    const tailWag = Math.sin(st.tailPhase) *
      (act === 'happy' || act === 'greet' ? 0.5 : act === 'play' ? 0.42
        : act === 'sleep' ? 0.03 : act === 'rest' ? 0.1 : act === 'sad' ? 0.02 : 0.2);
    ctx.save();
    ctx.translate(-70 * B, -126 * B + bodyY);
    ctx.rotate(-0.2 + tailWag + droop * 1.5 + lie * 0.9);
    // 捲尾:往後上方彎、尾尖朝前捲回來的 C 形。用骨架 + 變寬度畫,
    // 根部細、中段最蓬、尖端收窄 —— 等寬的帶子看起來就是一根棉花棒。
    const tailPts = [
      [14, 8, 9],
      [-10, -6, 15],
      [-30, -26, 19],
      [-34, -52, 18],
      [-20, -74, 15],
      [2, -80, 12],
      [18, -70, 8.5],
      [24, -56, 5]
    ];
    ctx.fillStyle = lg(ctx, -34, -70, 10, -6, C.hi, C.mid);
    limbPath(ctx, tailPts); ctx.fill();
    // 外緣毛簇:沿著尾巴外側再長一圈短毛
    ctx.fillStyle = C.lite;
    ctx.beginPath();
    ctx.moveTo(6, 12);
    furEdge(ctx, 6, 12, -34, -20, 3, 5.5, 0.3);
    furEdge(ctx, -34, -20, -40, -56, 3, 6.5, 1.5);
    furEdge(ctx, -40, -56, -14, -84, 3, 5.5, 2.6);
    ctx.lineTo(-10, -66); ctx.lineTo(-16, -30); ctx.lineTo(2, -2);
    ctx.closePath(); ctx.fill();
    // 白尾尖:只在最後捲起來那一段,裁在尾巴輪廓內
    ctx.save();
    limbPath(ctx, tailPts); ctx.clip();
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.moveTo(-14, -92);
    ctx.quadraticCurveTo(16, -92, 30, -70);
    ctx.quadraticCurveTo(36, -50, 22, -44);
    ctx.quadraticCurveTo(14, -66, -6, -70);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // 內側陰影:讓捲曲有前後關係
    ctx.save();
    limbPath(ctx, tailPts); ctx.clip();
    const tsh = ctx.createLinearGradient(-6, -40, 22, -52);
    tsh.addColorStop(0, 'rgba(107,98,90,0)');
    tsh.addColorStop(1, 'rgba(107,98,90,0.3)');
    ctx.fillStyle = tsh;
    ctx.fillRect(-40, -90, 70, 100);
    ctx.restore();
    ctx.restore();

    // ═══ 身體 ═══════════════════════════════════════════
    ctx.save();
    ctx.translate(0, bodyY);
    // 旋轉支點放在前胸:坐下時是「屁股沉下去、前身撐著」,不是整塊平移
    ctx.translate(48 * B, -110 * B); ctx.rotate(bodyRot); ctx.translate(-48 * B, 110 * B);

    ctx.fillStyle = lg(ctx, 0, -155 * B, 0, -68 * B, C.lite, C.mid);
    bodyPath(ctx, B); ctx.fill();

    // 以下全部裁在身體輪廓內 —— 白肚子不會再變成一朵浮在身上的雲
    ctx.save();
    bodyPath(ctx, B); ctx.clip();

    // 白色下腹:哈士奇的白肚子要看得出來,所以用實色 + 毛簇上緣(柔漸層會糊掉,失去特徵)。
    // 裁在身體輪廓內,所以怎麼畫都不會跑出身形外。
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.moveTo(72 * B, -60 * B);
    ctx.lineTo(72 * B, -104 * B);
    furEdge(ctx, 72 * B, -104 * B, 4 * B, -96 * B, 4, 6, 0.8);
    furEdge(ctx, 4 * B, -96 * B, -62 * B, -88 * B, 4, 5, 2.1);
    ctx.lineTo(-90 * B, -60 * B);
    ctx.closePath(); ctx.fill();
    // 白毛在腹部下緣的一點陰影,免得整片死白
    const bg2 = ctx.createLinearGradient(0, -78 * B, 0, -62 * B);
    bg2.addColorStop(0, 'rgba(230,222,214,0)');
    bg2.addColorStop(1, 'rgba(200,190,180,0.5)');
    ctx.fillStyle = bg2;
    ctx.fillRect(-90 * B, -80 * B, 170 * B, 22 * B);

    // 背線暗部:上緣加深,做出圓筒的量感
    const dg = ctx.createLinearGradient(0, -152 * B, 0, -112 * B);
    dg.addColorStop(0, 'rgba(107,98,90,0.55)');
    dg.addColorStop(1, 'rgba(107,98,90,0)');
    ctx.fillStyle = dg;
    ctx.fillRect(-90 * B, -155 * B, 170 * B, 46 * B);

    // 後大腿:用徑向漸層暗示轉折,不要硬邊圓塊(會看成一個貼上去的補丁)
    const tg = ctx.createRadialGradient(-46 * B, -104 * B, 4 * B, -46 * B, -104 * B, 34 * B);
    tg.addColorStop(0, 'rgba(107,98,90,0.26)');
    tg.addColorStop(1, 'rgba(107,98,90,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(-88 * B, -140 * B, 84 * B, 80 * B);
    ctx.restore();

    ctx.restore(); // 身體

    // ═══ 近側兩條腿 ═══
    if (posture === 'lie') lieBackLeg(ctx, -38 * B, -24, 12.5, false, S);
    else if (posture === 'sit') sitBackLeg(ctx, -36 * B, -54, 12.5, false, S);
    else backLeg(ctx, -36 * B, hipY + bodyY, 82, 12.5, swA, liftA, false, S, 0);
    // greet 的抬手:近側前腿舉起來揮
    const wave = act === 'greet' ? Math.min(1, e / 0.4) : 0;
    if (wave > 0) {
      ctx.save();
      ctx.translate(48 * B, hipY + frontY + 6);
      ctx.rotate(-1.15 + Math.sin(t * 7) * 0.4);
      const L2 = 78 * S.leg;
      ctx.fillStyle = lg(ctx, -12, 0, 12, 0, C.mid, C.lite);
      limbPath(ctx, [[0, -14, 13.5], [2, L2 * 0.35, 11], [3, L2 * 0.65, 8.4], [2, L2 * 0.9, 7], [0, L2, 6.8]]);
      ctx.fill();
      paw(ctx, 0, L2, 8.6, false);
      ctx.restore();
    } else if (posture === 'lie') {
      lieFrontLeg(ctx, 46 * B, -20, 12, false, S, 52);
    } else {
      frontLeg(ctx, 44 * B, hipY + frontY, 82, 12, swB - bow * 0.5 - hop * 0.3,
        liftB + hop * 14, false, S, frontFold);
    }

    // ═══ 頭 ═══════════════════════════════════════════════
    ctx.save();
    ctx.translate(58 * B, -158 * B + bodyY * 0.5 + frontY * 0.7 + headExtra);
    ctx.rotate(droop * 0.3 + eatK * 0.34 + lie * 0.12 - hop * 0.08);
    ctx.scale(S.head, S.head);

    // 頸毛:只畫頭與身體交界的那一段弧(整圈會變成獅子鬃毛)
    ctx.save();
    ctx.fillStyle = lg(ctx, 0, 10, 0, 60, C.hi, C.mid);
    ctx.beginPath();
    ctx.moveTo(-44, 6);
    furEdge(ctx, -44, 6, -22, 44, 3, 5, 0.3);
    ctx.quadraticCurveTo(6, 58, 34, 40);
    furEdge(ctx, 34, 40, 44, 4, 3, 4, 1.4);
    ctx.quadraticCurveTo(0, 24, -44, 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // 耳朵(遠耳先畫)
    const earRot = act === 'happy' || act === 'greet' ? -0.08
      : act === 'sad' ? 0.5 : act === 'sleep' ? 0.34 : act === 'rest' ? 0.2 : 0.02;
    function ear(ctx, x, y, sc, shade) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(earRot * (x < 0 ? -1 : 1) + (x < 0 ? -0.18 : 0.16));
      ctx.scale(sc * S.ear, sc * S.ear);
      ctx.fillStyle = shade ? C.dark : lg(ctx, 0, -44, 0, 8, C.mid, C.dark);
      ctx.beginPath();
      ctx.moveTo(-15, 12);
      ctx.quadraticCurveTo(-13, -30, 0, -46);
      ctx.quadraticCurveTo(14, -28, 16, 12);
      ctx.quadraticCurveTo(0, 20, -15, 12);
      ctx.closePath(); ctx.fill();
      if (!shade) {
        ctx.fillStyle = C.inner;
        ctx.beginPath();
        ctx.moveTo(-8, 8); ctx.quadraticCurveTo(-6, -18, 0, -32);
        ctx.quadraticCurveTo(8, -16, 9, 8);
        ctx.quadraticCurveTo(0, 13, -8, 8);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    ear(ctx, 26, -34, 0.92, true);
    ear(ctx, -22, -32, 1.0, false);

    // 頭骨
    ctx.fillStyle = lg(ctx, 0, -46, 0, 34, C.lite, C.mid);
    el(ctx, 0, -2, 44, 41); ctx.fill();

    // 灰面具:柔化成貼合頭型的弧,不再是硬邊 V 字貼紙
    ctx.save();
    el(ctx, 0, -2, 44, 41); ctx.clip();
    ctx.fillStyle = 'rgba(107,98,90,0.5)';
    ctx.beginPath();
    ctx.moveTo(-48, -46); ctx.lineTo(-8, -46);
    ctx.quadraticCurveTo(-20, -18, -18, 12);
    ctx.quadraticCurveTo(-34, 4, -48, 8);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(46, -46); ctx.lineTo(10, -46);
    ctx.quadraticCurveTo(20, -18, 20, 10);
    ctx.quadraticCurveTo(34, 2, 46, 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // 吻部
    ctx.save(); ctx.scale(S.muzzle, 1);
    ctx.fillStyle = lg(ctx, 0, 0, 0, 36, C.white, C.white2);
    el(ctx, 4, 16, 31, 23); ctx.fill();
    el(ctx, 0, 2, 27, 20); ctx.fill();
    ctx.restore();

    // 眼睛
    const open = act === 'sleep' ? 0 : act === 'rest' ? 0.34 : blink(t);
    [[-19, -8, 1], [17, -9, 0.92]].forEach(function (p) {
      const ex = p[0], ey = p[1], es = p[2];
      if (open <= 0.06) {
        ctx.strokeStyle = C.eyeRim; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(ex - 8 * es, ey); ctx.quadraticCurveTo(ex, ey + 5, ex + 8 * es, ey); ctx.stroke();
        return;
      }
      if (act === 'happy' || act === 'greet') {
        ctx.strokeStyle = C.eyeRim; ctx.lineWidth = 3.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(ex, ey + 1, 9 * es, 1.06 * Math.PI, 1.94 * Math.PI); ctx.stroke();
        return;
      }
      ctx.fillStyle = C.white; el(ctx, ex, ey, 11 * es, 11.5 * es * open); ctx.fill();
      ctx.fillStyle = C.eye; el(ctx, ex + 1.5, ey, 8.4 * es, 8.8 * es * open); ctx.fill();
      ctx.fillStyle = C.eyeRim; el(ctx, ex + 1.5, ey + 1, 4.4 * es, 4.8 * es * open); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      el(ctx, ex - 2.6, ey - 4 * open, 3.6 * es, 3.8 * es * open); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      el(ctx, ex + 4.4, ey + 3 * open, 1.9 * es, 2 * es * open); ctx.fill();
      if (act === 'sad') {
        ctx.fillStyle = C.mid;
        ctx.beginPath();
        ctx.moveTo(ex - 12 * es, ey - 12); ctx.lineTo(ex + 12 * es, ey - 12);
        ctx.lineTo(ex + 12 * es, ey - 3); ctx.quadraticCurveTo(ex, ey - 9, ex - 12 * es, ey - 1);
        ctx.closePath(); ctx.fill();
      }
    });

    // 鼻子(帶高光)
    ctx.fillStyle = C.nose;
    ctx.beginPath();
    ctx.moveTo(-9, 10); ctx.quadraticCurveTo(0, 4, 9, 10);
    ctx.quadraticCurveTo(6, 19, 0, 19); ctx.quadraticCurveTo(-6, 19, -9, 10);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; el(ctx, -3, 10, 2.6, 2); ctx.fill();

    // 嘴:預設是**上揚的微笑**(v2 的倒 V 看起來在生氣)
    ctx.strokeStyle = C.nose; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    if (act === 'eat') {
      const chew = 0.5 + 0.5 * Math.sin(t * 13);
      ctx.fillStyle = C.nose;
      ctx.beginPath(); ctx.moveTo(-11, 24); ctx.quadraticCurveTo(0, 26 + chew * 9, 11, 24);
      ctx.quadraticCurveTo(0, 30 + chew * 12, -11, 24); ctx.closePath(); ctx.fill();
    } else if (act === 'happy' || act === 'greet' || act === 'play') {
      ctx.beginPath(); ctx.moveTo(-13, 23); ctx.quadraticCurveTo(0, 35, 13, 23); ctx.stroke();
      ctx.fillStyle = C.tongue;
      ctx.beginPath(); ctx.moveTo(-7, 27); ctx.quadraticCurveTo(0, 46, 7, 27);
      ctx.quadraticCurveTo(0, 33, -7, 27); ctx.closePath(); ctx.fill();
    } else if (act === 'sad') {
      ctx.beginPath(); ctx.moveTo(-9, 28); ctx.quadraticCurveTo(0, 23, 9, 28); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(0, 19); ctx.lineTo(0, 23); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-12, 21); ctx.quadraticCurveTo(-6, 29, 0, 23); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, 21); ctx.quadraticCurveTo(6, 29, 0, 23); ctx.stroke();
    }

    if (S.sprout) {
      ctx.strokeStyle = C.hi; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-4, -42); ctx.quadraticCurveTo(-2, -60, 10, -62); ctx.stroke();
    }
    if (S.deco) deco(ctx, st.deco | 0);
    ctx.restore(); // 頭

    if (act === 'sleep') zzz(ctx, 96 * B, -80, t);
    if (act === 'eat') {
      ctx.fillStyle = '#B9834C'; el(ctx, 104 * B, -12, 32, 10); ctx.fill();
      ctx.fillStyle = '#E8B57A'; el(ctx, 104 * B, -18, 27, 8); ctx.fill();
    }
    if (act === 'play') {
      ctx.save(); ctx.translate(112 * B + Math.sin(t * 3) * 6, -16 + Math.abs(Math.sin(t * 3)) * -10);
      ctx.fillStyle = '#E4728A'; el(ctx, 0, 0, 15, 15); ctx.fill();
      ctx.strokeStyle = '#B8506A'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.moveTo(0, -15); ctx.lineTo(0, 15); ctx.stroke();
      ctx.restore();
    }
    ctx.restore(); // stage scale
  }

  A.define('husky', {
    draw: draw,
    mirror: true,
    bounds: { top: -210, bottom: 6, halfWidth: 120 },
    locomotion: { speed: 62, legFreq: 5.2, tailFreq: 2.4, lean: 0.06, gait: 'trot' },
    holds: { happy: 2.6, eat: 2.8, play: 2.8, rest: 3.4, sleep: 5.0, stretch: 1.8, greet: 2.0 },
    ambient: {
      min: 3, max: 7,
      pool: [{ action: 'stretch', weight: 3 }, { action: 'rest', weight: 3 }, { action: 'sleep', weight: 2 }]
    }
  });
})();
