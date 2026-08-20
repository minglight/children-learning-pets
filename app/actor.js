// actor.js — 寵物「演員」引擎(v13)
//
// 這一層存在的唯一理由:把「畫面想要什麼」跟「這隻動物怎麼表現」拆開。
//
//   畫面只說語意動作     actor.act('eat')        ← 不知道也不該知道狗怎麼吃
//   物種自己詮釋成造型   spec.draw(ctx, t, st)   ← 想低頭啃、想叼起來甩都行
//
// 跟舊的 app/pets.js 最大的差別:
//   - 舊制所有物種共用 face()/motion()/shadow() 三個模板 → 換誰來都是「同一具骨架換配色」。
//     新制**沒有任何共用造型函式**,每個物種自己畫自己的一切。重複的程式碼是刻意的:
//     哈士奇的腿跟小雞的腿本來就不該是同一段程式。
//   - 舊制動作只有 idle/chew/happy/sad 四種、視角只有 front/side/back 三種、
//     成長只有全域 ×0.85/×1.12。新制這些全部下放給物種自己定義。
//
// 引擎只管「所有動物都一樣的時基」:動作切換、持續時間、走路相位、擺尾相位、
// 傾斜緩動、自發行為排程。這些是數學,不是造型,共用才划算。
//
// 座標契約(新制,跟舊 pets.js 不同,務必看清楚):
//   原點 = 腳底中心,y 軸向上為負。角色往上長就是負值。
//   每個 spec 自己宣告 bounds,不再有全物種共用的 366 總高。
//
// 沒有用新制註冊的物種會自動走 legacy adapter(包一層舊的 PLS_PETS.draw),
// 輸出與改版前一致,所以可以一隻一隻慢慢搬,不用一次到齊。
(function () {
  const REG = {};

  // 標準動作詞彙:畫面只能講這些,物種各自詮釋。
  // 想加新動作就往這裡加,沒實作的物種會 fallback 回 idle,不會壞掉。
  const ACTIONS = ['idle', 'walk', 'eat', 'play', 'happy', 'sad', 'sleep', 'rest', 'stretch', 'greet'];

  // 引擎預設值。物種只要覆寫自己在意的欄位,其餘照這裡走。
  const DEF_LOCO = {
    speed: 55,        // 房間走位速度基準(單位/秒,房間會依深度縮放)
    legFreq: 5.5,     // 邁步相位頻率
    tailFreq: 2.4,    // 尾巴/翅膀相位頻率
    lean: 0.18,       // 走路時上重下輕的斜切量(0 = 不傾斜,例如小雞)
    leanEase: 5,      // 傾斜緩動速度
    ampEase: 6,       // 抬腳幅度緩動速度
    gait: 'walk'      // 步態提示,純粹給物種 draw 自己參考('walk'|'hop'|'waddle'|'trot'|'fly')
  };
  const DEF_AMBIENT = { min: 3, max: 7, pool: [] };
  const DEF_HOLDS = {
    happy: 2.4, eat: 2.6, play: 2.4, rest: 3.2,
    sleep: 4.6, stretch: 1.8, greet: 1.6, sad: 2.0
  };
  const DEF_BOUNDS = { top: -190, bottom: 10, halfWidth: 110 };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }

  function pickWeighted(pool) {
    let total = 0;
    for (let i = 0; i < pool.length; i++) total += (pool[i].weight || 1);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= (pool[i].weight || 1);
      if (r <= 0) return pool[i].action;
    }
    return pool[pool.length - 1].action;
  }

  // ── 註冊 ────────────────────────────────────────────────
  // spec = {
  //   draw(ctx, t, st)          必填,唯一的造型入口
  //   bounds  {top,bottom,halfWidth}
  //   stages  {baby:{scale,...}, kid:{...}, grown:{...}}   物種自己決定三階段怎麼變,
  //                                                        不再是全域 ×0.85/×1.12
  //   locomotion / ambient / holds                          覆寫上面的預設
  // }
  function define(species, spec) {
    if (!spec || typeof spec.draw !== 'function') {
      throw new Error('PLS_ACTOR.define: ' + species + ' 缺少 draw(ctx,t,st)');
    }
    REG[species] = {
      species: species,
      draw: spec.draw,
      // mirror:true = 這隻是「有方向的側身造型」,朝左時由引擎整隻鏡射。
      // 正面造型的物種不要開(會變成左右翻的娃娃),牠們自己用五官視差偏移表達方向。
      mirror: !!spec.mirror,
      bounds: Object.assign({}, DEF_BOUNDS, spec.bounds || {}),
      stages: spec.stages || null,
      locomotion: Object.assign({}, DEF_LOCO, spec.locomotion || {}),
      ambient: Object.assign({}, DEF_AMBIENT, spec.ambient || {}),
      holds: Object.assign({}, DEF_HOLDS, spec.holds || {}),
      legacy: false
    };
    return REG[species];
  }

  // ── legacy adapter ─────────────────────────────────────
  // 還沒搬到新制的物種,包一層舊的 PLS_PETS.draw,行為與改版前逐格相同。
  // 舊制原點在「角色中心」、腳底在 y=+146;新制原點在腳底,所以要先平移回去。
  const LEGACY_FOOT = 146;
  function legacySpec(species) {
    return {
      species: species,
      legacy: true,
      bounds: { top: -220, bottom: 0, halfWidth: 110 },   // 舊制的固定框:366 總高
      stages: null,
      locomotion: Object.assign({}, DEF_LOCO),
      ambient: Object.assign({}, DEF_AMBIENT),
      holds: Object.assign({}, DEF_HOLDS),
      draw: function (ctx, t, st) {
        const P = window.PLS_PETS;
        if (!P) return;
        // 語意動作 → 舊制的四種 mode
        const a = st.action;
        const mode = (a === 'happy' || a === 'greet') ? 'happy'
          : a === 'eat' ? 'chew'
            : a === 'sad' ? 'sad' : 'idle';
        // 舊制靠 dir 換視角;新制的 facing 只是左右,交給呼叫端鏡射
        const dir = st.dirHint || 'front';
        ctx.save();
        ctx.translate(0, -LEGACY_FOOT);
        P.draw(species, ctx, t, {
          mode: mode, dir: dir, stage: st.stage || 'kid', growDeco: st.deco | 0
        });
        ctx.restore();
      }
    };
  }

  function spec(species) {
    return REG[species] || (REG[species] = legacySpec(species));
  }
  function has(species) { return !!REG[species] && !REG[species].legacy; }
  function bounds(species) { return spec(species).bounds; }

  // ── Actor:一隻活著的寵物(房間裡用)────────────────────
  // 引擎維護時基與動作排程,位置(x/z)仍由房間決定 —— 房間才知道地板梯形長怎樣。
  // 房間每幀把移動狀態餵進來(setMoving),actor 換算成腿的相位與傾斜。
  function Actor(species, opts) {
    opts = opts || {};
    this.species = species;
    this.spec = spec(species);
    this.st = {
      action: 'idle',
      prevAction: null,
      facing: 1,           // 1 = 朝右,-1 = 朝左(物種自己決定要不要鏡射,或改畫五官偏移)
      dirHint: 'front',    // 只給 legacy 物種用的三視角提示
      moving: false,
      speedRatio: 0,       // 0~1,房間目前走多快(相對 locomotion.speed)
      legPhase: 0, legAmp: 0, tailPhase: 0,
      lean: 0, leanTarget: 0,
      t0: 0, elapsed: 0, settle: 0,
      stage: opts.stage || 'kid',
      deco: opts.deco | 0,
      gait: this.spec.locomotion.gait,
      loco: this.spec.locomotion
    };
    this._ambientT = this._rollAmbient();
    this._autoAmbient = opts.ambient !== false;   // 靜態場合可關掉自發行為
    this._lock = !!opts.lock;                     // true = 動作演完重播同一個,不回 idle(展示/預覽用)
  }

  Actor.prototype._rollAmbient = function () {
    const a = this.spec.ambient;
    return a.min + Math.random() * Math.max(0, a.max - a.min);
  };

  // 畫面唯一該呼叫的東西:講一個語意動作,不管牠怎麼演。
  Actor.prototype.act = function (action, o) {
    o = o || {};
    const st = this.st;
    if (ACTIONS.indexOf(action) < 0) action = 'idle';
    if (st.action !== action) { st.prevAction = st.action; st.t0 = null; }
    st.action = action;
    if (o.facing) st.facing = o.facing < 0 ? -1 : 1;
    if (o.stage) st.stage = o.stage;
    if (o.deco != null) st.deco = o.deco | 0;
    this._ambientT = this._rollAmbient();
    return this;
  };

  // 房間每幀回報:現在有沒有在走、往哪走、多快。
  Actor.prototype.setMoving = function (moving, o) {
    o = o || {};
    const st = this.st;
    st.moving = !!moving;
    if (o.facing) st.facing = o.facing < 0 ? -1 : 1;
    if (o.dirHint) st.dirHint = o.dirHint;
    if (o.speedRatio != null) st.speedRatio = clamp(o.speedRatio, 0, 1);
    if (moving && st.action !== 'walk') this.act('walk');
    else if (!moving && st.action === 'walk') this.act('idle');
    return this;
  };

  Actor.prototype.setStage = function (stage, deco) {
    this.st.stage = stage || 'kid';
    if (deco != null) this.st.deco = deco | 0;
    return this;
  };

  Actor.prototype.update = function (t, dt) {
    const st = this.st, L = this.spec.locomotion;
    if (st.t0 == null) st.t0 = t;
    st.elapsed = t - st.t0;
    dt = clamp(dt, 0, 0.05);

    const walking = st.action === 'walk' || st.moving;
    st.legAmp = lerp(st.legAmp, walking ? Math.max(0.35, st.speedRatio || 1) : 0, Math.min(1, dt * L.ampEase));
    st.legPhase += dt * L.legFreq * (walking ? 1 : 0);
    st.tailPhase += dt * L.tailFreq * (st.action === 'happy' ? 2.2 : 1);
    st.leanTarget = walking ? -L.lean * st.facing : 0;
    st.lean = lerp(st.lean, st.leanTarget, Math.min(1, dt * L.leanEase));
    // 趴下/睡著這類需要「慢慢沉下去」的動作,給物種一個 0→1 的安頓進度
    st.settle = clamp(st.elapsed / 0.4, 0, 1);

    // 動作演完自動回 idle(walk 由房間控制,不逾時)
    const hold = this.spec.holds[st.action];
    if (st.action !== 'walk' && st.action !== 'idle' && hold && st.elapsed > hold) {
      if (this._lock) { st.t0 = t; }      // 鎖定:重播同一個動作
      else { this.act('idle'); st.t0 = t; }
    }
    // 沒人理牠的時候自己找事做(伸懶腰、趴著、打盹)
    if (this._autoAmbient && st.action === 'idle' && !st.moving) {
      this._ambientT -= dt;
      const pool = this.spec.ambient.pool;
      if (this._ambientT <= 0 && pool && pool.length) {
        this.act(pickWeighted(pool));
        st.t0 = t;
      }
    }
    return this;
  };

  // 在目前的 ctx 原點(= 腳底)畫出來。縮放/位移由呼叫端負責。
  Actor.prototype.render = function (ctx, t) {
    const st = this.st;
    ctx.save();
    if (st.lean) ctx.transform(1, 0, st.lean, 1, 0, 0);   // 斜切:腳底不動,身體往行進方向靠
    if (this.spec.mirror && st.facing < 0) ctx.scale(-1, 1);
    this.spec.draw(ctx, t, st);
    ctx.restore();
    return this;
  };

  function create(species, opts) { return new Actor(species, opts); }

  // ── 靜態一張圖(圖鑑縮圖、結算畫面、選寵物格)─────────
  // 這些地方不需要狀態機,只要「擺一個 pose」。共用一個 scratch state,不配置物件。
  const SCRATCH = {
    action: 'idle', prevAction: null, facing: 1, dirHint: 'front', moving: false,
    speedRatio: 0, legPhase: 0, legAmp: 0, tailPhase: 0, lean: 0, leanTarget: 0,
    t0: 0, elapsed: 0, settle: 1, stage: 'kid', deco: 0, gait: 'walk', loco: DEF_LOCO
  };
  function pose(species, ctx, t, o) {
    o = o || {};
    const sp = spec(species), st = SCRATCH;
    st.action = ACTIONS.indexOf(o.action) >= 0 ? o.action : 'idle';
    st.facing = o.facing < 0 ? -1 : 1;
    st.dirHint = o.dirHint || 'front';
    st.stage = o.stage || 'kid';
    st.deco = o.deco | 0;
    st.moving = st.action === 'walk';
    st.speedRatio = st.moving ? 1 : 0;
    st.legAmp = st.moving ? 1 : 0;
    st.legPhase = st.moving ? t * sp.locomotion.legFreq : 0;
    st.tailPhase = t * sp.locomotion.tailFreq;
    st.lean = 0;
    st.elapsed = o.elapsed != null ? o.elapsed : 1.2;
    st.settle = 1;
    st.gait = sp.locomotion.gait;
    st.loco = sp.locomotion;
    ctx.save();
    if (sp.mirror && st.facing < 0) ctx.scale(-1, 1);
    sp.draw(ctx, t, st);
    ctx.restore();
  }

  // 縮圖用:給定一個框,回傳「整隻塞得進去」的縮放與腳底位置。
  // 舊制是全物種寫死 PET_SPAN=366 反推,新制每隻自己報自己的框。
  function fitScale(species, boxH, marginTop, marginBottom) {
    const b = bounds(species);
    const span = (b.bottom - b.top) || 1;
    return (boxH - (marginTop || 0) - (marginBottom || 0)) / span;
  }

  // ── 新舊制共用的靜態繪製入口 ───────────────────────────
  // 舊制角色固定 366 單位高、腳底在 y=+146;新制原點就在腳底、每隻自己報 bounds。
  // UNIT 是兩套座標的單位換算(366 / 哈士奇的 194 ≈ 1.9),不是「把每隻拉成一樣高」——
  // 所以體型差異會如實呈現。所有畫寵物的地方都該走這裡,不要各自 translate。
  const UNIT = 1.9;
  const LEGACY_SPAN = 366;

  function drawAt(ctx, species, t, cx, footY, s, o) {
    o = o || {};
    ctx.save();
    if (has(species)) {
      ctx.translate(cx, footY);
      ctx.scale(s * UNIT, s * UNIT);
      pose(species, ctx, t, {
        action: o.action || (o.mode === 'chew' ? 'eat' : o.mode === 'happy' ? 'happy' : 'idle'),
        facing: o.facing || o.face || 1,
        stage: o.stage,
        deco: o.deco != null ? o.deco : o.growDeco
      });
    } else {
      ctx.translate(cx, footY - LEGACY_FOOT * s);
      ctx.scale(s, s);
      const P = window.PLS_PETS;
      if (P) {
        P.draw(species, ctx, t, {
          mode: o.mode || 'idle', stage: o.stage, dir: o.dirHint || o.dir || 'front',
          growDeco: o.growDeco != null ? o.growDeco : o.deco
        });
      }
    }
    ctx.restore();
  }

  // 這隻在「舊制 366 尺度」下的總高。縮圖框反推縮放用,取代各檔案裡寫死的 PET_SPAN。
  function spanOf(species) {
    if (!has(species)) return LEGACY_SPAN;
    const b = bounds(species);
    return ((b.bottom - b.top) || 1) * UNIT;
  }

  window.PLS_ACTOR = {
    ACTIONS: ACTIONS, UNIT: UNIT,
    define: define, has: has, spec: spec, bounds: bounds,
    create: create, pose: pose, fitScale: fitScale,
    drawAt: drawAt, spanOf: spanOf,
    _reg: REG
  };
})();
