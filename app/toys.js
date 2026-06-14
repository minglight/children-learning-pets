// toys.js — 英文關卡的玩具獎勵繪製(柔和圓潤、與食物同一風格)
// 每個玩具函式以原點為中心繪製,大小約 ±42px,由 drawToy 統一縮放。
(function () {
  const A = window.PLS_ART;
  const rr = A.rr, el = A.el;

  const TOYS = {
    // ── 兔兔的玩具(扮家家酒系) ──────────────────────
    doll: function (ctx) { // 小娃娃
      ctx.fillStyle = '#F2A9B8';
      ctx.beginPath();
      ctx.moveTo(-12, -10); ctx.lineTo(12, -10); ctx.lineTo(26, 36); ctx.lineTo(-26, 36);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#F6C0CC'; rr(ctx, -8, -2, 16, 18, 6); ctx.fill(); // 圍兜
      ctx.fillStyle = '#F8D8B8'; el(ctx, 0, -32, 24, 24); ctx.fill();    // 臉
      ctx.fillStyle = '#8A5A3C';
      ctx.beginPath(); ctx.arc(0, -34, 25, Math.PI, 0); ctx.fill();      // 頭髮
      ctx.fillStyle = '#5A4636'; el(ctx, -8, -28, 2.6, 3); ctx.fill(); el(ctx, 8, -28, 2.6, 3); ctx.fill();
      ctx.strokeStyle = '#E08597'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, -23, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    },
    teaset: function (ctx) { // 茶具組(茶壺 + 杯)
      ctx.fillStyle = '#BCD8C8';
      el(ctx, -10, 6, 26, 22); ctx.fill();                              // 壺身
      ctx.beginPath(); ctx.moveTo(-30, 2); ctx.quadraticCurveTo(-44, 8, -34, 20); ctx.lineWidth = 5;
      ctx.strokeStyle = '#BCD8C8'; ctx.stroke();                        // 壺嘴
      ctx.fillStyle = '#A9CBB8'; rr(ctx, 8, -2, 14, 14, 5); ctx.fill(); // 把手底
      ctx.strokeStyle = '#A9CBB8'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(16, 6, 11, -1.2, 1.2); ctx.stroke();     // 把手
      ctx.fillStyle = '#F6C95E'; el(ctx, -10, -16, 7, 5); ctx.fill();   // 壺蓋鈕
      ctx.fillStyle = '#F8D8E0'; rr(ctx, 18, 24, 22, 16, 5); ctx.fill();// 杯
      ctx.fillStyle = '#F2BCCC'; el(ctx, 29, 24, 11, 4); ctx.fill();
    },
    kitchen: function (ctx) { // 玩具廚房
      ctx.fillStyle = '#F6C0CC'; rr(ctx, -34, -10, 68, 52, 10); ctx.fill();    // 櫃身
      ctx.fillStyle = '#FCEAF0'; rr(ctx, -34, -34, 68, 24, 10); ctx.fill();    // 後擋板
      ctx.fillStyle = '#E89BB0'; el(ctx, -16, -22, 8, 8); ctx.fill();          // 旋鈕
      ctx.fillStyle = '#E89BB0'; el(ctx, 2, -22, 8, 8); ctx.fill();
      ctx.fillStyle = '#C9DCE8'; el(ctx, -12, 6, 14, 5); ctx.fill();           // 爐口
      ctx.fillStyle = '#9FC3E8'; rr(ctx, 6, -4, 26, 22, 6); ctx.fill();        // 烤箱門
      ctx.fillStyle = '#FCEAF0'; rr(ctx, 11, 0, 16, 5, 2); ctx.fill();         // 門把
      ctx.fillStyle = '#BCE0C8'; el(ctx, -12, 0, 12, 9); ctx.fill();           // 小鍋
      ctx.fillStyle = '#A9D6C7'; rr(ctx, -2, -3, 12, 4, 2); ctx.fill();
    },
    dollbed: function (ctx) { // 娃娃床
      ctx.fillStyle = '#C9A06A'; rr(ctx, -38, -2, 76, 14, 6); ctx.fill();      // 床框
      ctx.fillStyle = '#B58A56'; rr(ctx, -40, -28, 10, 40, 4); ctx.fill();     // 床頭
      ctx.fillStyle = '#B58A56'; rr(ctx, 30, -16, 10, 28, 4); ctx.fill();      // 床尾
      ctx.fillStyle = '#F8C6C0'; rr(ctx, -30, -8, 60, 14, 6); ctx.fill();      // 被子
      ctx.fillStyle = '#FCEAEA'; rr(ctx, -30, 4, 60, 10, 5); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; el(ctx, -20, -8, 12, 8); ctx.fill();          // 枕頭
    },
    basket: function (ctx) { // 野餐籃
      ctx.fillStyle = '#D9B483'; rr(ctx, -32, -2, 64, 36, 8); ctx.fill();      // 籃身
      ctx.strokeStyle = '#B58A56'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, 30, Math.PI, 0); ctx.stroke();           // 提把
      ctx.fillStyle = '#F2A9B8'; rr(ctx, -32, -2, 64, 12, 6); ctx.fill();      // 格紋布
      ctx.fillStyle = '#FCEAF0';
      for (let i = -3; i <= 3; i++) { rr(ctx, i * 9 - 2, 0, 4, 8, 1); ctx.fill(); }
      ctx.fillStyle = '#C9A06A'; rr(ctx, -28, 30, 56, 6, 3); ctx.fill();
    },
    teddy: function (ctx) { // 布偶熊
      ctx.fillStyle = '#C9A06A';
      el(ctx, -22, -22, 11, 11); ctx.fill(); el(ctx, 22, -22, 11, 11); ctx.fill(); // 耳
      el(ctx, 0, -10, 28, 26); ctx.fill();                                    // 頭
      ctx.fillStyle = '#E0C49A'; el(ctx, 0, 0, 15, 12); ctx.fill();           // 口鼻
      ctx.fillStyle = '#5A4636'; el(ctx, -10, -12, 3, 3.5); ctx.fill(); el(ctx, 10, -12, 3, 3.5); ctx.fill();
      el(ctx, 0, -2, 3.5, 3); ctx.fill();                                     // 鼻
      ctx.fillStyle = '#C9A06A'; rr(ctx, -20, 14, 40, 28, 12); ctx.fill();    // 身體
      ctx.fillStyle = '#F2BCCC'; el(ctx, 0, 26, 9, 8); ctx.fill();            // 肚子愛心區
    },

    // ── 倉倉的玩具(機械 / 交通系) ──────────────────────
    car: function (ctx) { // 小汽車
      ctx.fillStyle = '#BCD8F2';
      ctx.beginPath(); ctx.arc(-2, -16, 24, Math.PI, 0); ctx.closePath(); ctx.fill(); // 車頂
      ctx.fillStyle = '#EAF3FB'; rr(ctx, -14, -34, 24, 16, 5); ctx.fill();    // 車窗
      ctx.fillStyle = '#9FC3E8'; rr(ctx, -46, -16, 92, 34, 16); ctx.fill();   // 車身
      ctx.fillStyle = '#F6C95E'; el(ctx, 44, -2, 5, 6); ctx.fill();           // 車燈
      ctx.fillStyle = '#5A6B7C'; el(ctx, -24, 18, 12, 12); ctx.fill(); el(ctx, 24, 18, 12, 12); ctx.fill();
      ctx.fillStyle = '#C9D6E2'; el(ctx, -24, 18, 5, 5); ctx.fill(); el(ctx, 24, 18, 5, 5); ctx.fill();
    },
    train: function (ctx) { // 小火車
      ctx.fillStyle = '#A9D6C7'; rr(ctx, -38, -8, 50, 32, 8); ctx.fill();     // 車身
      ctx.fillStyle = '#7FB8A6'; rr(ctx, -10, -28, 22, 22, 6); ctx.fill();    // 駕駛艙
      ctx.fillStyle = '#EAF6F1'; rr(ctx, -6, -24, 14, 12, 3); ctx.fill();     // 窗
      ctx.fillStyle = '#8FC9A8'; rr(ctx, -34, -28, 12, 14, 3); ctx.fill();    // 煙囪
      ctx.fillStyle = '#DCEFE7'; el(ctx, -28, -30, 9, 5); ctx.fill();         // 煙
      ctx.fillStyle = '#5A7A6E'; el(ctx, -24, 28, 11, 11); ctx.fill(); el(ctx, 4, 28, 11, 11); ctx.fill();
      ctx.fillStyle = '#C4E4D9'; el(ctx, -24, 28, 4, 4); ctx.fill(); el(ctx, 4, 28, 4, 4); ctx.fill();
      ctx.fillStyle = '#F6C95E'; el(ctx, 8, 4, 7, 7); ctx.fill();             // 前燈
    },
    digger: function (ctx) { // 挖土機
      ctx.fillStyle = '#F6C95E'; rr(ctx, -34, 4, 44, 22, 6); ctx.fill();      // 車身
      ctx.fillStyle = '#EBB94A'; rr(ctx, -26, -16, 24, 22, 6); ctx.fill();    // 駕駛艙
      ctx.fillStyle = '#FCEAC0'; rr(ctx, -22, -12, 15, 12, 3); ctx.fill();    // 窗
      ctx.strokeStyle = '#C99A2E'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(4, -4); ctx.lineTo(30, -22); ctx.lineTo(40, -2); ctx.stroke(); // 臂
      ctx.fillStyle = '#C99A2E';
      ctx.beginPath(); ctx.moveTo(34, -4); ctx.lineTo(48, -6); ctx.lineTo(44, 12); ctx.lineTo(34, 8); ctx.closePath(); ctx.fill(); // 鏟斗
      ctx.fillStyle = '#5A6B6B'; el(ctx, -22, 28, 12, 12); ctx.fill(); el(ctx, 2, 28, 12, 12); ctx.fill();
      ctx.fillStyle = '#C9D6D6'; el(ctx, -22, 28, 5, 5); ctx.fill(); el(ctx, 2, 28, 5, 5); ctx.fill();
    },
    rccar: function (ctx) { // 遙控車
      ctx.fillStyle = '#9FC3E8'; rr(ctx, -40, -6, 80, 26, 12); ctx.fill();    // 車身(流線)
      ctx.fillStyle = '#6E97C4';
      ctx.beginPath(); ctx.moveTo(-14, -6); ctx.quadraticCurveTo(0, -24, 22, -6); ctx.closePath(); ctx.fill(); // 擾流
      ctx.fillStyle = '#EAF3FB'; rr(ctx, -8, -16, 18, 12, 4); ctx.fill();
      ctx.fillStyle = '#5A6B7C'; el(ctx, -24, 20, 13, 13); ctx.fill(); el(ctx, 24, 20, 13, 13); ctx.fill();
      ctx.fillStyle = '#C9D6E2'; el(ctx, -24, 20, 5, 5); ctx.fill(); el(ctx, 24, 20, 5, 5); ctx.fill();
      ctx.strokeStyle = '#8AA8C8'; ctx.lineWidth = 3; ctx.lineCap = 'round';  // 天線
      ctx.beginPath(); ctx.moveTo(34, -6); ctx.lineTo(42, -26); ctx.stroke();
      ctx.fillStyle = '#F6C95E'; el(ctx, 42, -28, 4, 4); ctx.fill();
    },
    plane: function (ctx) { // 小飛機(側視)
      ctx.fillStyle = '#9FC3E8';                                             // 機翼(下方大三角)
      ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(34, 26); ctx.lineTo(-26, 22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#BCD8F2';                                             // 機身
      ctx.beginPath();
      ctx.moveTo(-40, 0); ctx.quadraticCurveTo(-34, -14, -6, -14);
      ctx.lineTo(30, -10); ctx.quadraticCurveTo(46, -6, 46, 2);
      ctx.quadraticCurveTo(40, 10, 24, 10); ctx.lineTo(-30, 10);
      ctx.quadraticCurveTo(-40, 8, -40, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7FA8D0';                                            // 尾翼(上)
      ctx.beginPath(); ctx.moveTo(-38, -6); ctx.lineTo(-46, -28); ctx.lineTo(-22, -10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#EAF3FB'; el(ctx, 8, -3, 8, 6); ctx.fill();           // 窗
      el(ctx, -10, -3, 7, 5); ctx.fill();
      ctx.fillStyle = '#F6C95E'; el(ctx, 45, 1, 4, 5); ctx.fill();          // 機鼻燈
    },
    robodog: function (ctx) { // 機器狗
      ctx.fillStyle = '#C4E4D9'; rr(ctx, -30, -6, 52, 26, 8); ctx.fill();     // 身體
      ctx.fillStyle = '#A9D6C7'; rr(ctx, 12, -26, 26, 24, 8); ctx.fill();     // 頭
      ctx.fillStyle = '#7FB8A6'; rr(ctx, 14, -30, 8, 8, 2); ctx.fill(); rr(ctx, 28, -30, 8, 8, 2); ctx.fill(); // 耳
      ctx.fillStyle = '#5A7A6E'; el(ctx, 20, -16, 3.5, 3.5); ctx.fill(); el(ctx, 30, -16, 3.5, 3.5); ctx.fill();
      ctx.fillStyle = '#F6C95E'; el(ctx, 38, -10, 3, 3); ctx.fill();          // 鼻燈
      ctx.fillStyle = '#8FC9A8'; rr(ctx, -26, 18, 8, 16, 3); ctx.fill(); rr(ctx, -8, 18, 8, 16, 3); ctx.fill();
      rr(ctx, 6, 18, 8, 16, 3); ctx.fill();                                   // 腿
      ctx.strokeStyle = '#7FB8A6'; ctx.lineWidth = 3; ctx.lineCap = 'round';  // 尾天線
      ctx.beginPath(); ctx.moveTo(-30, -2); ctx.lineTo(-42, -16); ctx.stroke();
      ctx.fillStyle = '#F6C95E'; el(ctx, -42, -18, 4, 4); ctx.fill();
    },

    // ── 進階單字關卡的玩具 ──────────────────────────────
    wand: function (ctx) { // 魔法棒(兔兔 e7b)
      ctx.strokeStyle = '#C9A06A'; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 38); ctx.lineTo(0, -10); ctx.stroke();
      ctx.fillStyle = '#F6C95E';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 9 : 22;
        const a = -Math.PI / 2 + i * Math.PI / 5;
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r - 18);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      [[16, -8], [20, -26], [-14, -22]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, Math.PI * 2); ctx.fill();
      });
    },
    rocket: function (ctx) { // 小火箭(倉倉 e7b)
      ctx.fillStyle = '#9FC3E8';
      ctx.beginPath(); ctx.moveTo(0, -40); ctx.quadraticCurveTo(17, -8, 14, 24); ctx.lineTo(-14, 24); ctx.quadraticCurveTo(-17, -8, 0, -40); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, -12, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#BCD8F2'; ctx.beginPath(); ctx.arc(0, -12, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6E97C4';
      ctx.beginPath(); ctx.moveTo(14, 18); ctx.lineTo(28, 34); ctx.lineTo(14, 34); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-14, 18); ctx.lineTo(-28, 34); ctx.lineTo(-14, 34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#F6C95E';
      ctx.beginPath(); ctx.moveTo(-8, 26); ctx.lineTo(0, 46); ctx.lineTo(8, 26); ctx.closePath(); ctx.fill();
    },
    dollhouse: function (ctx) { // 玩具屋(兔兔 e7)
      ctx.fillStyle = '#FCEAF0'; rr(ctx, -30, -6, 60, 44, 8); ctx.fill();      // 屋身
      ctx.fillStyle = '#F2A9B8';
      ctx.beginPath(); ctx.moveTo(-38, -4); ctx.lineTo(0, -40); ctx.lineTo(38, -4); ctx.closePath(); ctx.fill(); // 屋頂
      ctx.fillStyle = '#E08597'; rr(ctx, 16, -34, 9, 16, 2); ctx.fill();       // 煙囪
      ctx.fillStyle = '#E89BB0'; rr(ctx, -9, 12, 18, 26, 5); ctx.fill();       // 門
      ctx.fillStyle = '#F6C95E'; el(ctx, 4, 26, 2.6, 2.6); ctx.fill();         // 門把
      ctx.fillStyle = '#BCD8F2'; rr(ctx, -25, 2, 14, 14, 3); ctx.fill();       // 窗
      rr(ctx, 12, 2, 12, 12, 3); ctx.fill();
      ctx.strokeStyle = '#FCEAF0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-18, 2); ctx.lineTo(-18, 16); ctx.moveTo(-25, 9); ctx.lineTo(-11, 9); ctx.stroke();
    },
    robot: function (ctx) { // 小機器人(倉倉 e7)
      ctx.fillStyle = '#9FC3E8'; rr(ctx, -18, -34, 36, 30, 8); ctx.fill();     // 頭
      ctx.strokeStyle = '#7FA8D0'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(0, -46); ctx.stroke();   // 天線
      ctx.fillStyle = '#F6C95E'; el(ctx, 0, -48, 4, 4); ctx.fill();
      ctx.fillStyle = '#4E6B84'; el(ctx, -7, -20, 4, 4); ctx.fill(); el(ctx, 7, -20, 4, 4); ctx.fill(); // 眼
      ctx.strokeStyle = '#4E6B84'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(6, -10); ctx.stroke();  // 嘴
      ctx.fillStyle = '#BCD8F2'; rr(ctx, -22, -2, 44, 38, 8); ctx.fill();      // 身體
      ctx.fillStyle = '#EAF3FB'; rr(ctx, -12, 6, 24, 18, 4); ctx.fill();       // 胸前面板
      ctx.fillStyle = '#8FC9A8'; el(ctx, -5, 15, 3, 3); ctx.fill();
      ctx.fillStyle = '#F4A8A0'; el(ctx, 5, 15, 3, 3); ctx.fill();
      ctx.fillStyle = '#9FC3E8'; rr(ctx, -30, 0, 8, 24, 4); ctx.fill(); rr(ctx, 22, 0, 8, 24, 4); ctx.fill(); // 手
    },
    dress: function (ctx) { // 公主裙(兔兔 e8)
      ctx.fillStyle = '#E89BB0';
      ctx.beginPath(); ctx.moveTo(-12, -30); ctx.lineTo(12, -30); ctx.lineTo(8, -2); ctx.lineTo(-8, -2); ctx.closePath(); ctx.fill(); // 上身
      ctx.strokeStyle = '#E89BB0'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-9, -30); ctx.lineTo(-4, -40); ctx.moveTo(9, -30); ctx.lineTo(4, -40); ctx.stroke(); // 肩帶
      ctx.fillStyle = '#F2A9B8';
      ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(8, -2); ctx.lineTo(34, 38); ctx.quadraticCurveTo(0, 28, -34, 38); ctx.closePath(); ctx.fill(); // 裙
      ctx.fillStyle = '#C77B98'; rr(ctx, -9, -6, 18, 6, 2); ctx.fill();        // 腰帶
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      el(ctx, -10, 16, 2.6, 2.6); ctx.fill(); el(ctx, 9, 22, 2.6, 2.6); ctx.fill(); el(ctx, 0, 30, 2.6, 2.6); ctx.fill();
    },
    shuttle: function (ctx) { // 太空梭(倉倉 e8)
      ctx.fillStyle = '#EAF3FB';
      ctx.beginPath(); ctx.moveTo(0, -42); ctx.quadraticCurveTo(16, -10, 14, 30); ctx.lineTo(-14, 30); ctx.quadraticCurveTo(-16, -10, 0, -42); ctx.closePath(); ctx.fill(); // 機身
      ctx.fillStyle = '#F4A8A0';
      ctx.beginPath(); ctx.moveTo(0, -42); ctx.quadraticCurveTo(8, -26, 6, -18); ctx.lineTo(-6, -18); ctx.quadraticCurveTo(-8, -26, 0, -42); ctx.closePath(); ctx.fill(); // 機鼻
      ctx.fillStyle = '#6E97C4'; el(ctx, 0, -4, 7, 7); ctx.fill();             // 窗
      ctx.fillStyle = '#9FC3E8';
      ctx.beginPath(); ctx.moveTo(-14, 12); ctx.lineTo(-28, 34); ctx.lineTo(-14, 30); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(14, 12); ctx.lineTo(28, 34); ctx.lineTo(14, 30); ctx.closePath(); ctx.fill(); // 尾翼
      ctx.fillStyle = '#F6C95E';
      ctx.beginPath(); ctx.moveTo(-8, 30); ctx.lineTo(8, 30); ctx.lineTo(0, 46); ctx.closePath(); ctx.fill(); // 火焰
      ctx.fillStyle = '#F2A88C';
      ctx.beginPath(); ctx.moveTo(-4, 30); ctx.lineTo(4, 30); ctx.lineTo(0, 40); ctx.closePath(); ctx.fill();
    },
    carousel: function (ctx) { // 旋轉木馬(兔兔 e9)
      ctx.fillStyle = '#D9B483'; rr(ctx, -30, 30, 60, 8, 3); ctx.fill();       // 底座
      ctx.fillStyle = '#E0C49A'; rr(ctx, -3, -18, 6, 50, 2); ctx.fill();       // 中柱
      ctx.fillStyle = '#F2A9B8';
      ctx.beginPath(); ctx.moveTo(-34, -12); ctx.quadraticCurveTo(0, -46, 34, -12); ctx.closePath(); ctx.fill(); // 頂篷
      ctx.fillStyle = '#FCEAF0';
      ctx.beginPath(); ctx.moveTo(-20, -20); ctx.quadraticCurveTo(-13, -34, -6, -18); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6, -18); ctx.quadraticCurveTo(13, -34, 20, -20); ctx.closePath(); ctx.fill(); // 條紋
      ctx.fillStyle = '#F6C95E'; el(ctx, 0, -44, 5, 5); ctx.fill();            // 頂鈕
      ctx.fillStyle = '#FFFFFF'; rr(ctx, -19, 4, 22, 12, 5); ctx.fill();       // 木馬身
      ctx.beginPath(); ctx.moveTo(1, 6); ctx.lineTo(11, -3); ctx.lineTo(8, 8); ctx.closePath(); ctx.fill(); // 馬頭
      ctx.strokeStyle = '#E89BB0'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-12, 16); ctx.lineTo(-12, 24); ctx.moveTo(-2, 16); ctx.lineTo(-2, 24); ctx.stroke(); // 馬腳
      ctx.strokeStyle = '#C9A06A'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-9, -12); ctx.lineTo(-9, 4); ctx.stroke();   // 吊桿
    },
    bigrobot: function (ctx) { // 大機器人(倉倉 e9)
      ctx.fillStyle = '#9FC3E8'; rr(ctx, -26, -6, 52, 44, 10); ctx.fill();     // 身體
      ctx.fillStyle = '#EAF3FB'; rr(ctx, -16, 2, 32, 24, 5); ctx.fill();       // 胸面板
      ctx.fillStyle = '#8FC9A8'; el(ctx, -7, 10, 4, 4); ctx.fill();
      ctx.fillStyle = '#F4A8A0'; el(ctx, 7, 10, 4, 4); ctx.fill();
      ctx.fillStyle = '#F6C95E'; rr(ctx, -8, 18, 16, 4, 2); ctx.fill();
      ctx.fillStyle = '#BCD8F2'; rr(ctx, -16, -34, 32, 28, 8); ctx.fill();     // 頭
      ctx.fillStyle = '#4E6B84'; rr(ctx, -11, -26, 22, 9, 4); ctx.fill();      // 護目鏡
      ctx.fillStyle = '#A8D8E0'; el(ctx, -5, -21, 2.6, 2.6); ctx.fill(); el(ctx, 5, -21, 2.6, 2.6); ctx.fill();
      ctx.strokeStyle = '#7FA8D0'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-10, -34); ctx.lineTo(-14, -46); ctx.moveTo(10, -34); ctx.lineTo(14, -46); ctx.stroke();
      ctx.fillStyle = '#F6C95E'; el(ctx, -14, -48, 3.6, 3.6); ctx.fill(); el(ctx, 14, -48, 3.6, 3.6); ctx.fill();
      ctx.fillStyle = '#7FA8D0'; rr(ctx, -36, -2, 9, 30, 4); ctx.fill(); rr(ctx, 27, -2, 9, 30, 4); ctx.fill(); // 手
      rr(ctx, -16, 36, 12, 10, 3); ctx.fill(); rr(ctx, 4, 36, 12, 10, 3); ctx.fill();  // 腳
    }
  };

  function drawToy(ctx, key, x, y, s) {
    const fn = TOYS[key]; if (!fn) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
    fn(ctx);
    ctx.restore();
  }

  // ── 豪華版玩具:同一個玩具,但鍍上金光、加寶石(與普通版明顯不同)──
  // 用離屏 canvas 先把玩具畫好,再以 source-atop 疊金色漸層,只染玩具本體。
  // 結果快取起來(固定高解析度),之後用 drawImage 縮放,避免每幀重畫。
  const deluxeCache = {};
  function gilded(key) {
    if (deluxeCache[key] !== undefined) return deluxeCache[key];
    const fn = TOYS[key];
    if (!fn) { deluxeCache[key] = null; return null; }
    const S = 3, buf = 360;
    const oc = document.createElement('canvas');
    oc.width = buf; oc.height = buf;
    const o = oc.getContext('2d');
    o.save();
    o.translate(buf / 2, buf / 2); o.scale(S, S);
    fn(o);                                  // 普通版玩具
    o.globalCompositeOperation = 'source-atop';
    const g = o.createLinearGradient(0, -58, 0, 58);
    g.addColorStop(0, 'rgba(255,238,176,0.62)');
    g.addColorStop(0.5, 'rgba(246,196,74,0.50)');
    g.addColorStop(1, 'rgba(206,146,32,0.60)');
    o.fillStyle = g; o.fillRect(-buf / 2 / S, -buf / 2 / S, buf / S, buf / S);
    o.fillStyle = 'rgba(255,255,255,0.38)'; el(o, -12, -22, 17, 9); o.fill();  // 高光
    o.globalCompositeOperation = 'source-over';
    o.restore();
    deluxeCache[key] = { c: oc, S: S, buf: buf };
    return deluxeCache[key];
  }
  function drawToyDeluxe(ctx, key, x, y, s) {
    s = s || 1;
    const g = gilded(key);
    if (!g) { drawToy(ctx, key, x, y, s); return; }
    const dw = g.buf * s / g.S;
    ctx.save();
    ctx.shadowColor = 'rgba(246,196,74,0.55)'; ctx.shadowBlur = 26 * s;
    ctx.drawImage(g.c, x - dw / 2, y - dw / 2, dw, dw);
    ctx.restore();
    const gems = [[-58, -28, 7], [60, -16, 8], [-50, 34, 6], [54, 40, 7], [2, -64, 6]];
    gems.forEach(function (p) {
      A.sparkle(ctx, x + p[0] * s, y + p[1] * s, p[2] * s, '#FFFFFF', 0.92);
      A.sparkle(ctx, x + p[0] * s, y + p[1] * s, p[2] * s * 0.6, '#F6C44A', 0.92);
    });
  }

  // 統一入口:寶物(食物或玩具)
  function drawTreasure(ctx, key, type, x, y, s) {
    if (type === 'toy') drawToy(ctx, key, x, y, s);
    else A.drawFood(ctx, key, x, y, s);
  }

  window.PLS_TOY = { TOYS: TOYS, drawToy: drawToy, drawToyDeluxe: drawToyDeluxe, drawTreasure: drawTreasure };
})();
