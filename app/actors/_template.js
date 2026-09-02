// actors/_template.js — 新增寵物物種的複製起點(v13 actor 架構)
//
// 用法:複製這個檔案成 app/actors/<species>.js,把下面的 TODO 全部換成這隻動物真正的樣子。
// 完整規則與檢查清單見 docs/actor-schema.md,這裡只放「跑得動的最小骨架」。
//
// 這隻動物是一個獨立的「演員」:不跟任何其他物種共用造型結構。
// 重複別人的程式碼是刻意的,不要抽共用函式出去 —— 詳見 docs/actor-schema.md 的說明。
//
// 座標契約:原點 = 腳底中心(站立的地面),y 軸向上為負,角色往上長就是負值。
(function () {
  const TAU = Math.PI * 2;
  const A = window.PLS_ACTOR;

  // TODO:換成這隻動物真正的配色。
  const C = {
    body: '#C7A98A', accent: '#8FC9A8', eye: '#2E2119'
  };

  // TODO:三個成長階段的「比例差異」,不是等比縮放 ——
  // 幼幼通常頭大腿短、大寶身長腿長。這個常數只有這個檔案自己讀(見 draw() 裡的 STAGES[st.stage]),
  // 不要傳進 A.define() 的 spec —— 引擎不讀那個欄位,傳了會被 console.error 提醒。
  const STAGES = {
    baby: { s: 0.82 },
    kid: { s: 1.00 },
    grown: { s: 1.12, deco: true }
  };

  function el(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.01, Math.abs(rx)), Math.max(0.01, Math.abs(ry)), rot || 0, 0, TAU);
  }

  // 大寶配件 5 款(戴在頭部/頸部,座標相對頭部中心)。TODO:換成真正的 5 款設計。
  function deco(ctx, idx) {
    ctx.save();
    ctx.fillStyle = ['#F4728A', '#F6C63E', '#8FC9A8', '#7AA7D9', '#C79ADB'][idx % 5];
    el(ctx, 0, -60, 14, 10); ctx.fill();
    ctx.restore();
  }

  // 引擎只會對這隻動物下 10 個語意動作,怎麼演完全是這個函式的事:
  // idle/walk/eat/play/happy/sad/sleep/rest/stretch/greet。
  // st 裡可用的欄位(引擎每幀算好餵進來,不用自己維護時基):
  //   st.action    目前的語意動作
  //   st.elapsed   這個動作已經演了幾秒(拿來做「演到某個時間點才怎樣」的節奏)
  //   st.legPhase  邁步相位(0 起算持續累加,走路時用 Math.sin(legPhase) 之類的算抬腳)
  //   st.legAmp    抬腳幅度 0~1(緩動過的,停下來會退回 0,不用自己判斷 moving)
  //   st.tailPhase 尾巴/翅膀擺動相位
  //   st.facing    1=朝右、-1=朝左(mirror:true 的物種引擎會自動整隻鏡射,不需要自己處理)
  //   st.settle    0→1,給「慢慢趴下/沉下去」這類動作用(sleep/rest 常用)
  //   st.stage     'baby'|'kid'|'grown'
  //   st.deco      大寶配件 index(0~4)
  function draw(ctx, t, st) {
    const S = STAGES[st.stage] || STAGES.kid;
    const act = st.action;
    const walk = st.legAmp;

    ctx.save();
    ctx.scale(S.s, S.s);

    // 影子
    ctx.fillStyle = 'rgba(90,70,50,0.16)';
    el(ctx, 0, 4, 40, 8); ctx.fill();

    // TODO:身體。這裡先放一個最小的圓身頂替,證明骨架能動。
    const bob = act === 'walk' ? Math.sin(st.legPhase) * 3 * walk : 0;
    ctx.save(); ctx.translate(0, bob);
    ctx.fillStyle = C.body;
    el(ctx, 0, -40, 36, 40); ctx.fill();

    // TODO:眼睛/表情隨 act 變化(sleep 閉眼、sad 垂下、happy 瞇成笑臉…)。
    ctx.fillStyle = C.eye;
    el(ctx, -10, -46, 4, 4); ctx.fill();
    el(ctx, 10, -46, 4, 4); ctx.fill();
    ctx.restore();

    if (S.deco) deco(ctx, st.deco | 0);
    ctx.restore(); // stage scale

    // TODO:各動作專屬的額外演出(eat 掉食物屑、play 冒玩具、sleep 冒 zzz…)。
  }

  A.define('_template', {
    draw: draw,
    // mirror:true = 引擎自動幫這隻做左右鏡射(側身造型適用)。
    // 正面呆呆、走路靠五官視差偏移表達方向的物種(像小雞)不要開這個。
    mirror: false,
    // TODO:回報這隻動物自己的框——沒有統一外框,多大由你決定。
    //   top       最高點(含耳朵/角/冠毛,負值)
    //   bottom    影子/腳掌最低點(通常是個小正數)
    //   halfWidth 最寬處的一半(含尾巴)
    bounds: { top: -100, bottom: 8, halfWidth: 48 },
    // TODO:走路節奏。四足中型動物參考 speed 55~65 / legFreq 5~6,
    // 小型碎步動物 speed 70+ / legFreq 8+。gait 純粹是給自己 draw() 讀的提示字串。
    locomotion: { speed: 55, legFreq: 5.5, tailFreq: 2, lean: 0.15, gait: 'walk' },
    // TODO:每個動作演多久回到 idle(walk 不受這個限制,由房間控制)。
    holds: { happy: 2.4, eat: 2.6, play: 2.4, rest: 3.2, sleep: 4.6, stretch: 1.8, greet: 1.6, sad: 2.0 },
    // TODO:沒人理牠的時候自己排的行為(伸懶腰/趴著/打盹),action 只能是上面 10 個語意動作。
    ambient: {
      min: 3, max: 7,
      pool: [{ action: 'stretch', weight: 3 }, { action: 'rest', weight: 3 }, { action: 'sleep', weight: 2 }]
    }
  });
})();
