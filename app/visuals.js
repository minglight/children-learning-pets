// visuals.js — 題庫「圖案」繪製(<圖> 元素)
// 支援種類:數數(水果)、錢、月曆、直式、分類
// 規則:圖案 10 個一排,超過就換行。
(function () {
  const A = window.PLS_ART;
  const FONT = A.FONT;
  const el = A.el, rr = A.rr;

  // ── 錢幣(台灣硬幣風格:1 銅、5/10 銀、50 金)──────────
  const COIN = {
    1:  { ring: '#E2B98A', face: '#CC9560', text: '#7A4A24', r: 0.80 },
    5:  { ring: '#D2D8DE', face: '#AEB6BE', text: '#4A555F', r: 0.88 },
    10: { ring: '#CBD2D8', face: '#9AA3AC', text: '#3C454E', r: 1.00 },
    50: { ring: '#EBD487', face: '#D6B14C', text: '#6B5214', r: 1.04 }
  };
  function drawCoin(ctx, denom, x, y, s) {
    s = s || 1;
    const st = COIN[denom] || COIN[1];
    const r = 26 * st.r * s;
    ctx.save();
    ctx.shadowColor = 'rgba(120,90,50,0.28)'; ctx.shadowBlur = 5 * s; ctx.shadowOffsetY = 2.5 * s;
    ctx.fillStyle = st.ring; el(ctx, x, y, r, r); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = st.face; el(ctx, x, y, r * 0.80, r * 0.80); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = r * 0.07;
    el(ctx, x, y, r * 0.80, r * 0.80); ctx.stroke();
    ctx.fillStyle = st.text;
    ctx.font = 'bold ' + (r * 0.84) + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(denom), x, y + r * 0.04);
    ctx.restore();
  }

  // ── 紙鈔(目前只有 100 元,台幣百元鈔是紅色系)──────────
  const BILL = {
    100: { face: '#D6555A', edge: '#B23A40', text: '#FFF3E0', frame: 'rgba(255,255,255,0.55)' }
  };
  function drawBill(ctx, denom, x, y, s) {
    s = s || 1;
    const st = BILL[denom] || BILL[100];
    const w = 78 * s, h = 42 * s;
    ctx.save();
    ctx.shadowColor = 'rgba(120,40,40,0.28)'; ctx.shadowBlur = 5 * s; ctx.shadowOffsetY = 2.5 * s;
    ctx.fillStyle = st.edge; rr(ctx, x - w / 2, y - h / 2, w, h, 8 * s); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = st.face; rr(ctx, x - w / 2 + 2 * s, y - h / 2 + 2 * s, w - 4 * s, h - 4 * s, 7 * s); ctx.fill();
    ctx.strokeStyle = st.frame; ctx.lineWidth = Math.max(1.4, 2.2 * s);
    rr(ctx, x - w / 2 + 6 * s, y - h / 2 + 6 * s, w - 12 * s, h - 12 * s, 4 * s); ctx.stroke();
    ctx.fillStyle = st.text;
    ctx.font = 'bold ' + (h * 0.4) + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(denom), x, y + h * 0.02);
    ctx.restore();
  }

  // ── 排版小工具:把 n 個項目以每排 perRow 個畫成幾排 ──
  // drawItem(x, y, cell) 每格回呼;回傳所佔排數
  function rows(n, perRow) { return Math.max(1, Math.ceil(n / perRow)); }

  // ════════════════════════════════════════════════════
  // 數數(水果相加)
  // ════════════════════════════════════════════════════
  function drawCount(ctx, v, box) {
    const nums = v.numbers || [], fruits = v.fruits || [];
    const per = 10;
    let totalRows = 0;
    nums.forEach(function (n) { totalRows += rows(n, per); });
    const ops = Math.max(0, nums.length - 1);
    let cell = Math.min(54, (box.w - 16) / per);
    let opH = cell * 0.7;
    let contentH = totalRows * cell + ops * opH;
    const sc = contentH > box.h ? box.h / contentH : 1;
    cell *= sc; opH *= sc;
    contentH = totalRows * cell + ops * opH;
    const cx = box.x + box.w / 2;
    let y = box.y + (box.h - contentH) / 2 + cell / 2;
    const fScale = cell / 60;
    for (let gi = 0; gi < nums.length; gi++) {
      let left = nums[gi];
      const fruit = fruits[gi] || 'apple';
      while (left > 0) {
        const cnt = Math.min(per, left);
        let x = cx - (cnt * cell) / 2 + cell / 2;
        for (let k = 0; k < cnt; k++) { A.drawFood(ctx, fruit, x, y, fScale * 0.95); x += cell; }
        left -= cnt; y += cell;
      }
      if (gi < nums.length - 1) {
        ctx.fillStyle = '#D79B53';
        ctx.font = 'bold ' + (opH * 0.96) + 'px ' + FONT;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(v.op || '+', cx, y - cell / 2 + opH / 2);
        y += opH;
      }
    }
  }

  // ════════════════════════════════════════════════════
  // 錢(硬幣)
  // ════════════════════════════════════════════════════
  function drawMoney(ctx, v, box) {
    const all = (v.coins || []).filter(function (c) { return c.n > 0; })
      .slice().sort(function (a, b) { return b.d - a.d; });
    const bills = all.filter(function (c) { return !!BILL[c.d]; });
    const coins = all.filter(function (c) { return !BILL[c.d]; });
    const perCoin = 10, perBill = 6;
    let coinRows = 0, billRows = 0;
    coins.forEach(function (c) { coinRows += rows(c.n, perCoin); });
    bills.forEach(function (c) { billRows += rows(c.n, perBill); });
    let cell = Math.min(60, (box.w - 16) / perCoin);
    let billH = cell * 0.78;
    let contentH = billRows * billH + coinRows * cell;
    const sc = contentH > box.h ? box.h / contentH : 1;
    cell *= sc; billH *= sc; contentH = billRows * billH + coinRows * cell;
    const cx = box.x + box.w / 2;
    let y = box.y + (box.h - contentH) / 2;
    if (bills.length) {
      y += billH / 2;
      bills.forEach(function (c) {
        let left = c.n;
        while (left > 0) {
          const cnt = Math.min(perBill, left);
          let x = cx - (cnt * cell) / 2 + cell / 2;
          for (let k = 0; k < cnt; k++) { drawBill(ctx, c.d, x, y, cell / 60); x += cell; }
          left -= cnt; y += billH;
        }
      });
      y += cell / 2 - billH / 2;
    } else {
      y += cell / 2;
    }
    coins.forEach(function (c) {
      let left = c.n;
      while (left > 0) {
        const cnt = Math.min(perCoin, left);
        let x = cx - (cnt * cell) / 2 + cell / 2;
        for (let k = 0; k < cnt; k++) { drawCoin(ctx, c.d, x, y, cell / 60); x += cell; }
        left -= cnt; y += cell;
      }
    });
  }

  // ════════════════════════════════════════════════════
  // 月曆
  // ════════════════════════════════════════════════════
  const WK = { '日': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 };
  const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function drawCalendar(ctx, v, box) {
    const month = v.month || 6;
    const days = MDAYS[((month - 1) % 12 + 12) % 12];
    let startCol = 0;
    if (v.circle && v.weekday && WK[v.weekday] != null) {
      startCol = (((WK[v.weekday] - (v.circle - 1)) % 7) + 7) % 7;
    }
    const weeks = Math.ceil((startCol + days) / 7);
    let cw = Math.min(60, box.w / 7);
    let titleH = cw * 0.7, headH = cw * 0.62;
    let needed = titleH + headH + weeks * cw;
    const sc = needed > box.h ? box.h / needed : 1;
    cw *= sc; titleH *= sc; headH *= sc;
    needed = titleH + headH + weeks * cw;
    const gridW = cw * 7;
    const x0 = box.x + (box.w - gridW) / 2;
    let y = box.y + (box.h - needed) / 2;
    // 月份標題
    ctx.fillStyle = '#B98A4F';
    ctx.font = 'bold ' + (titleH * 0.62) + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(month + ' 月', box.x + box.w / 2, y + titleH / 2);
    y += titleH;
    // 星期表頭
    const names = ['日', '一', '二', '三', '四', '五', '六'];
    ctx.font = (headH * 0.5) + 'px ' + FONT;
    for (let c = 0; c < 7; c++) {
      ctx.fillStyle = (c === 0 || c === 6) ? '#E08A5E' : '#A8927A';
      ctx.fillText(names[c], x0 + c * cw + cw / 2, y + headH / 2);
    }
    y += headH;
    // 日期格
    ctx.font = (cw * 0.42) + 'px ' + FONT;
    for (let d = 1; d <= days; d++) {
      const idx = startCol + d - 1;
      const r = Math.floor(idx / 7), c = idx % 7;
      const px = x0 + c * cw + cw / 2, py = y + r * cw + cw / 2;
      if (d === v.circle) {
        ctx.fillStyle = '#F2B96B'; el(ctx, px, py, cw * 0.42, cw * 0.42); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
      } else {
        ctx.fillStyle = (c === 0 || c === 6) ? '#E08A5E' : '#6B5848';
      }
      ctx.fillText(String(d), px, py);
    }
  }

  // ════════════════════════════════════════════════════
  // 直式(兩位數加減)
  // ════════════════════════════════════════════════════
  function drawVertical(ctx, v, box) {
    const a = v.numbers[0] != null ? v.numbers[0] : 0;
    const b = v.numbers[1] != null ? v.numbers[1] : 0;
    const op = v.op || '+';
    const sA = String(a), sB = String(b);
    const digits = Math.max(sA.length, sB.length);
    let fs = Math.min(104, box.h / 3.1, box.w / (digits + 2.2));
    const colW = fs * 0.62;
    const cx = box.x + box.w / 2;
    const rightX = cx + colW * (digits / 2);
    const rowA = box.y + box.h / 2 - fs * 0.62;
    const rowB = box.y + box.h / 2 + fs * 0.28;
    const lineY = rowB + fs * 0.62;
    ctx.fillStyle = '#5E4A36';
    ctx.font = 'bold ' + fs + 'px ' + FONT;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(sA, rightX, rowA);
    ctx.fillText(sB, rightX, rowB);
    // 運算符號
    ctx.fillStyle = '#D79B53'; ctx.textAlign = 'left';
    ctx.fillText(op, rightX - colW * (digits + 0.9), rowB);
    // 橫線
    ctx.strokeStyle = '#8A6242'; ctx.lineWidth = Math.max(3, fs * 0.055);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rightX - colW * (digits + 1.1), lineY);
    ctx.lineTo(rightX + colW * 0.15, lineY);
    ctx.stroke();
    // 答案問號
    ctx.fillStyle = '#C9A06A'; ctx.textAlign = 'right';
    ctx.fillText('?', rightX, lineY + fs * 0.78);
  }

  // ════════════════════════════════════════════════════
  // 分類(不同顏色/形狀的物件)
  // ════════════════════════════════════════════════════
  const GC = {
    '紅': '#E8625D', '红': '#E8625D', '藍': '#6E9BD8', '蓝': '#6E9BD8',
    '黃': '#F0C24A', '黄': '#F0C24A', '綠': '#7FBE72', '绿': '#7FBE72',
    '紫': '#B79BDB', '橘': '#F0A04B', '粉': '#F4A8C0'
  };
  function star(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr2 = i % 2 ? r * 0.45 : r;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
    }
    ctx.closePath(); ctx.fill();
  }
  function drawMini(ctx, icon, color, x, y, r) {
    ctx.fillStyle = color;
    if (/車|车|car/i.test(icon)) {
      rr(ctx, x - r, y - r * 0.45, r * 2, r, r * 0.35); ctx.fill();
      rr(ctx, x - r * 0.6, y - r, r * 1.2, r * 0.62, r * 0.28); ctx.fill();
      ctx.fillStyle = '#4F4034';
      el(ctx, x - r * 0.5, y + r * 0.55, r * 0.3, r * 0.3); ctx.fill();
      el(ctx, x + r * 0.5, y + r * 0.55, r * 0.3, r * 0.3); ctx.fill();
    } else if (/圓|圆|circle/i.test(icon)) {
      el(ctx, x, y, r, r); ctx.fill();
    } else if (/三角|triangle/i.test(icon)) {
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r * 0.85); ctx.lineTo(x - r, y + r * 0.85); ctx.closePath(); ctx.fill();
    } else if (/星|star/i.test(icon)) {
      star(ctx, x, y, r);
    } else if (/長方|长方|rect/i.test(icon)) {
      rr(ctx, x - r * 1.1, y - r * 0.62, r * 2.2, r * 1.24, r * 0.22); ctx.fill();
    } else { // 方形 / 正方形 / 預設
      rr(ctx, x - r * 0.92, y - r * 0.92, r * 1.84, r * 1.84, r * 0.26); ctx.fill();
    }
  }
  function drawGroups(ctx, v, box) {
    const groups = v.groups || [];
    const per = 10;
    let totalRows = 0;
    groups.forEach(function (g) { totalRows += rows(g.n, per); });
    const gaps = Math.max(0, groups.length - 1);
    let cell = Math.min(50, (box.w - 20) / per);
    let gap = cell * 0.36;
    let contentH = totalRows * cell + gaps * gap;
    const sc = contentH > box.h ? box.h / contentH : 1;
    cell *= sc; gap *= sc; contentH = totalRows * cell + gaps * gap;
    const cx = box.x + box.w / 2;
    let y = box.y + (box.h - contentH) / 2 + cell / 2;
    groups.forEach(function (g) {
      const col = GC[g.color] || '#E8625D';
      let left = g.n;
      while (left > 0) {
        const cnt = Math.min(per, left);
        let x = cx - (cnt * cell) / 2 + cell / 2;
        for (let k = 0; k < cnt; k++) { drawMini(ctx, g.icon || '方', col, x, y, cell * 0.4); x += cell; }
        left -= cnt; y += cell;
      }
      y += gap;
    });
  }

  // ════════════════════════════════════════════════════
  // 直尺(公分刻度 + 一條要量的色條,從 0 對齊)
  // ════════════════════════════════════════════════════
  function drawRuler(ctx, v, box) {
    const cm = v.cm || 15;
    const bar = v.bar;
    const marginX = 24;
    const rulerW = Math.min(box.w - marginX * 2, cm * 34);
    const px = rulerW / cm;
    const x0 = box.x + (box.w - rulerW) / 2;
    const rulerY = box.y + box.h * 0.6;
    if (bar != null) {
      ctx.fillStyle = '#8FBF8A';
      rr(ctx, x0, rulerY - px * 0.55 - 22, px * bar, 18, 7);
      ctx.fill();
    }
    ctx.fillStyle = '#FFF7EA';
    rr(ctx, x0, rulerY, rulerW, 34, 4); ctx.fill();
    ctx.strokeStyle = '#C9A06A'; ctx.lineWidth = 2;
    rr(ctx, x0, rulerY, rulerW, 34, 4); ctx.stroke();
    ctx.strokeStyle = '#8A6242'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.font = Math.max(12, Math.min(20, px * 0.5)) + 'px ' + FONT;
    ctx.fillStyle = '#8A6242'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = 0; i <= cm; i++) {
      const x = x0 + i * px;
      const tall = i % 5 === 0;
      ctx.beginPath();
      ctx.moveTo(x, rulerY); ctx.lineTo(x, rulerY + (tall ? 22 : 12)); ctx.stroke();
      if (tall) ctx.fillText(String(i), x, rulerY + 26);
    }
  }

  // ════════════════════════════════════════════════════
  // 長度比較(2~3 條不帶刻度的色條,標籤甲/乙/丙)
  // ════════════════════════════════════════════════════
  function drawLenCompare(ctx, v, box) {
    const bars = v.bars || [];
    const maxCm = Math.max.apply(null, bars.map(function (b) { return b.cm; }).concat([1]));
    const marginX = 24;
    const w = box.w - marginX * 2;
    const px = w / (maxCm + 3);
    const x0 = box.x + marginX;
    const rowH = Math.min(50, box.h / bars.length);
    let y = box.y + (box.h - rowH * bars.length) / 2 + rowH / 2;
    const colors = ['#8FBF8A', '#7FA8D8', '#E8A85C'];
    bars.forEach(function (b, i) {
      ctx.fillStyle = colors[i % colors.length];
      rr(ctx, x0, y - 13, px * b.cm, 26, 9); ctx.fill();
      ctx.fillStyle = '#5E4A36'; ctx.font = 'bold 24px ' + FONT;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(b.label || '', x0 + px * b.cm + 12, y);
      y += rowH;
    });
  }

  // ════════════════════════════════════════════════════
  // 容量比較(2~3 個梯形容器,高度∝容量,底部對齊,標籤甲/乙/丙)
  // ════════════════════════════════════════════════════
  function drawCapCompare(ctx, v, box) {
    const containers = v.containers || [];
    const n = containers.length || 1;
    const maxVol = Math.max.apply(null, containers.map(function (c) { return c.vol; }).concat([1]));
    const gap = 28;
    const cellW = Math.min(76, (box.w - gap * (n - 1)) / n);
    const totalW = cellW * n + gap * (n - 1);
    const x0 = box.x + (box.w - totalW) / 2;
    const baseY = box.y + box.h - 34;
    const maxH = box.h - 60;
    const colors = ['#7FA8D8', '#8FBF8A', '#E8A85C'];
    containers.forEach(function (c, i) {
      const h = Math.max(22, (c.vol / maxVol) * maxH);
      const x = x0 + i * (cellW + gap);
      const w = cellW * 0.82;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(x + w * 0.08, baseY - h);
      ctx.lineTo(x + w * 0.92, baseY - h);
      ctx.lineTo(x + w, baseY);
      ctx.lineTo(x, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#5E4A36'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#5E4A36'; ctx.font = 'bold 24px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(c.label || '', x + w / 2, baseY + 8);
    });
  }

  // ════════════════════════════════════════════════════
  // 時鐘(圓形錶面 + 12 時標 + 時針分針)
  // ════════════════════════════════════════════════════
  function drawClock(ctx, v, box) {
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    const r = Math.min(box.w, box.h) / 2 - 10;
    ctx.fillStyle = '#FFF7EA';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#C9A06A'; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = '#5E4A36';
    ctx.font = 'bold ' + Math.max(14, r * 0.17) + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.strokeStyle = '#C9A06A'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10));
      ctx.lineTo(cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3));
      ctx.stroke();
      ctx.fillText(String(i), cx + Math.cos(a) * (r - 26), cy + Math.sin(a) * (r - 26));
    }
    const hour = (v.hour || 12) % 12, minute = v.minute || 0;
    const hourAngle = ((hour + minute / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    const minAngle = (minute / 60) * Math.PI * 2 - Math.PI / 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#5E4A36'; ctx.lineWidth = Math.max(4, r * 0.07);
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(hourAngle) * r * 0.5, cy + Math.sin(hourAngle) * r * 0.5); ctx.stroke();
    ctx.strokeStyle = '#D79B53'; ctx.lineWidth = Math.max(3, r * 0.045);
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(minAngle) * r * 0.75, cy + Math.sin(minAngle) * r * 0.75); ctx.stroke();
    ctx.fillStyle = '#5E4A36';
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(3, r * 0.05), 0, Math.PI * 2); ctx.fill();
  }

  // ════════════════════════════════════════════════════
  // 方格面積(2~3 個方格圖形,rows×cols 決定面積,標籤甲/乙/丙)
  // ════════════════════════════════════════════════════
  function drawGridArea(ctx, v, box) {
    const shapes = v.shapes || [];
    const n = shapes.length || 1;
    const gap = 30;
    let cell = 24;
    shapes.forEach(function (s) {
      cell = Math.min(cell, (box.w - gap * (n - 1)) / n / s.cols, (box.h - 44) / s.rows);
    });
    cell = Math.max(cell, 8);
    const totalW = shapes.reduce(function (sum, s) { return sum + s.cols * cell; }, 0) + gap * (n - 1);
    let x = box.x + (box.w - totalW) / 2;
    const colors = ['#7FA8D8', '#8FBF8A', '#E8A85C'];
    shapes.forEach(function (s, i) {
      const w = s.cols * cell, h = s.rows * cell;
      const y = box.y + (box.h - h) / 2 - 14;
      for (let r = 0; r < s.rows; r++) {
        for (let c = 0; c < s.cols; c++) {
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = colors[i % colors.length];
          rr(ctx, x + c * cell + 1, y + r * cell + 1, cell - 2, cell - 2, 3); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#5E4A36'; ctx.lineWidth = 1;
          rr(ctx, x + c * cell + 1, y + r * cell + 1, cell - 2, cell - 2, 3); ctx.stroke();
        }
      }
      if (s.label) {
        ctx.fillStyle = '#5E4A36'; ctx.font = 'bold 22px ' + FONT;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(s.label, x + w / 2, y + h + 8);
      }
      x += w + gap;
    });
  }

  // ── 派發 ──────────────────────────────────────────────
  function draw(ctx, v, box) {
    if (!v) return;
    ctx.save();
    if (v.kind === 'count') drawCount(ctx, v, box);
    else if (v.kind === 'money') drawMoney(ctx, v, box);
    else if (v.kind === 'capCompare') drawCapCompare(ctx, v, box);
    else if (v.kind === 'ruler') drawRuler(ctx, v, box);
    else if (v.kind === 'lenCompare') drawLenCompare(ctx, v, box);
    else if (v.kind === 'clock') drawClock(ctx, v, box);
    else if (v.kind === 'gridArea') drawGridArea(ctx, v, box);
    else if (v.kind === 'calendar') drawCalendar(ctx, v, box);
    else if (v.kind === 'vertical') drawVertical(ctx, v, box);
    else if (v.kind === 'groups') drawGroups(ctx, v, box);
    ctx.restore();
  }

  // ── 把題庫模板「實例化」:固定隨機(水果)避免每幀亂跳 ──
  const FRUITS = ['apple', 'orange', 'strawberry', 'banana'];
  function instantiate(v) {
    const out = JSON.parse(JSON.stringify(v));
    if (out.kind === 'count') {
      const nums = out.numbers || [];
      let prev = -1;
      out.fruits = nums.map(function () {
        let f = Math.floor(Math.random() * FRUITS.length);
        if (nums.length > 1 && f === prev) f = (f + 1) % FRUITS.length;
        prev = f; return FRUITS[f];
      });
    }
    return out;
  }

  window.PLS_VIS = { draw: draw, instantiate: instantiate, drawCoin: drawCoin, drawBill: drawBill };
})();
