// chinese.js — 國語關卡(cn1~cn5)的出題器與資料表。部首、選字都是「選擇題」一種題型,資料在這個檔案,加字只改表。
// 出題器註冊到 PLS_GEN.gen(config.js chinese[].gen 用名字找),回傳格式同 gen.js:
//   { kind:'text', display:{text}, visual?, say, answer, options:[3 個字串], big:true(選項放大), hint, dedupKey }
// 目前是通用二年級內容,沒有照課本;之後拍課本生字頁再補「課本生字」關卡(新的 gen + 資料表)。
(function () {
  const G = window.PLS_GEN;
  const gen = G.gen, shuffle = G.shuffle, pick = G.pick;

  // ── 部首表:id = 畫面上的部首字、name = 唸法(TTS 用)、mean = 跟什麼有關、chars = 屬於這個部首的字 ──
  // 每個字只出現在一個部首底下;字要選「小二看得懂、字形清楚歸得進這個部首」的。
  const RADICALS = {
    '氵': { name: '三點水', mean: '水', chars: '河海洗湖清游洋汗流液池' },
    '扌': { name: '提手旁', mean: '手', chars: '打拉提推抱拍找抓接指擦' },
    '口': { name: '口字旁', mean: '嘴巴', chars: '吃喝叫吵唱吹吸吐哭' },
    '木': { name: '木字旁', mean: '樹木', chars: '桌樹林椅桃板校梨橋' },
    '艹': { name: '草字頭', mean: '花草', chars: '花草菜苦茶葉藥芽' },
    '日': { name: '日字旁', mean: '太陽', chars: '晴明星時晚早暗' },
    '言': { name: '言字旁', mean: '說話', chars: '說請話語謝讀認誰課' },
    '足': { name: '足字旁', mean: '腳', chars: '跑跳路踢踩跟' },
    '女': { name: '女字旁', mean: '女生', chars: '媽姐妹好奶姓她' },
    '忄': { name: '豎心旁', mean: '心情', chars: '怕忙快慢情' },
    '糸': { name: '絞絲旁', mean: '線', chars: '紅紙線綠細結給' },
    '金': { name: '金字旁', mean: '金屬', chars: '錢鐘針鐵銀' },
    '火': { name: '火字旁', mean: '火', chars: '燈燒烤煙' },
    '竹': { name: '竹字頭', mean: '竹子', chars: '筆笑第等筷' },
    '雨': { name: '雨字頭', mean: '下雨', chars: '雲雪電雷零' }
  };
  const GROUP1 = ['氵', '扌', '口', '木', '艹', '日'];
  const GROUP2 = ['言', '足', '女', '忄', '糸', '金', '火', '竹', '雨'];

  function charsOf(group) {
    const out = [];
    group.forEach(function (r) { RADICALS[r].chars.split('').forEach(function (c) { out.push({ c: c, r: r }); }); });
    return out;
  }
  function three(ans, pool) {   // 答案 + 從 pool 挑 2 個不同的 → 洗牌
    const others = shuffle(pool.filter(function (x) { return x !== ans; })).slice(0, 2);
    return shuffle([ans].concat(others));
  }

  // 一題部首:兩種問法各 50%
  //   正向:大字「河」→「這個字的部首是什麼?」選 氵 / 扌 / 口
  //   反向:大字「氵」→「哪一個字的部首是它?」選 河 / 打 / 吃
  function radicalGen(group) {
    const list = charsOf(group);
    return function () {
      const it = pick(list);
      const R = RADICALS[it.r];
      if (Math.random() < 0.5) {
        const text = '這個字的部首是什麼?';
        return {
          kind: 'text', display: { text: text }, visual: { kind: 'bigchar', text: it.c },
          say: '「' + it.c + '」的部首是什麼?', answer: it.r, options: three(it.r, group), big: true,
          hint: '「' + it.c + '」跟' + R.mean + '有關', dedupKey: 'f' + it.c
        };
      }
      const wrongChars = list.filter(function (x) { return x.r !== it.r; }).map(function (x) { return x.c; });
      const text = '哪一個字的部首是' + R.name + '?';
      return {
        kind: 'text', display: { text: text }, visual: { kind: 'bigchar', text: it.r, sub: R.name },
        say: '哪一個字的部首是' + R.name + '?', answer: it.c, options: three(it.c, shuffle(wrongChars).slice(0, 8).concat([it.c])), big: true,
        hint: R.name + '的字,都跟' + R.mean + '有關', dedupKey: 'r' + it.c
      };
    };
  }
  gen.cnRadical1 = radicalGen(GROUP1);
  gen.cnRadical2 = radicalGen(GROUP2);

  // 部首猜意思:「跑」的部首跟什麼有關?(腳 / 水 / 手)
  gen.cnRadicalMeaning = function () {
    const it = pick(charsOf(GROUP1.concat(GROUP2)));
    const R = RADICALS[it.r];
    const means = [];
    Object.keys(RADICALS).forEach(function (k) { if (means.indexOf(RADICALS[k].mean) < 0) means.push(RADICALS[k].mean); });
    return {
      kind: 'text', display: { text: '「' + it.c + '」跟什麼有關?' }, visual: { kind: 'bigchar', text: it.c },
      say: '「' + it.c + '」跟什麼有關?', answer: R.mean, options: three(R.mean, means), big: true,
      hint: '看看它的部首「' + it.r + '」(' + R.name + ')', dedupKey: 'm' + it.c
    };
  };

  // ── 選字(一):同音字/形近字,句子挖一個空 ──
  // [句子(＿ 是空格), 答案, [干擾 1, 干擾 2]]。干擾字要「看起來像、但放進去不通」,同一句只能有一個答案。
  const SEL = [
    ['今天天氣很＿朗', '晴', ['清', '請']], ['河水很＿澈', '清', ['晴', '情']], ['＿你坐下', '請', ['清', '晴']],
    ['我今天心＿很好', '情', ['晴', '清']], ['媽媽＿著小寶寶', '抱', ['跑', '泡']], ['小狗＿得很快', '跑', ['抱', '飽']],
    ['我吃得很＿', '飽', ['抱', '跑']], ['＿一杯熱茶', '泡', ['抱', '跑']], ['＿蟻在搬食物', '螞', ['馬', '媽']],
    ['草地上有一匹＿', '馬', ['媽', '螞']], ['不可以＿人', '罵', ['馬', '媽']], ['爸爸＿山', '爬', ['吧', '巴']],
    ['請你＿門打開', '把', ['爸', '吧']], ['我們走＿', '吧', ['把', '爸']], ['我會做＿課', '功', ['工', '攻']],
    ['＿業要寫完', '作', ['昨', '做']], ['＿天下雨了', '昨', ['作', '炸']], ['這題要＿麼算', '怎', ['作', '昨']],
    ['媽媽在＿菜', '炒', ['吵', '抄']], ['弟弟在＿架', '吵', ['炒', '抄']], ['＿寫生字', '抄', ['吵', '炒']],
    ['海邊有細細的＿子', '沙', ['少', '抄']], ['蛋糕只剩下很＿', '少', ['沙', '吵']], ['小鳥在天上＿', '飛', ['非', '肥']],
    ['我很＿念外婆', '想', ['相', '箱']], ['一個大＿子', '箱', ['想', '相']], ['要＿信自己', '相', ['想', '箱']],
    ['老師講了一個故＿', '事', ['是', '市']], ['山＿裡很暗', '洞', ['同', '筒']], ['這是一個＿板', '銅', ['同', '洞']],
    ['文具盒裡有一個筆＿', '筒', ['同', '洞']], ['我們在＿一個班', '同', ['洞', '銅']], ['＿學回家了', '放', ['房', '方']],
    ['我的＿間很乾淨', '房', ['放', '方']], ['這個＿向走', '方', ['放', '房']], ['房間＿面很亮', '裡', ['理', '里']],
    ['你說得有道＿', '理', ['裡', '里']], ['我喜歡吃白＿', '飯', ['板', '返']], ['黑＿上有字', '板', ['飯', '反']],
    ['＿園裡有操場', '校', ['交', '較']], ['月亮是＿的', '圓', ['園', '遠']], ['學校離家很＿', '遠', ['園', '圓']],
    ['功課做＿了', '完', ['院', '元']], ['天氣很＿', '冷', ['令', '領']], ['下課＿響了', '鈴', ['冷', '領']],
    ['他穿了一件有衣＿的衣服', '領', ['冷', '鈴']], ['大海有很多＿浪', '波', ['皮', '被']], ['蘋果＿很紅', '皮', ['波', '被']],
    ['天冷了要蓋＿子', '被', ['皮', '波']], ['山＿上有小花', '坡', ['皮', '被']], ['我買了一＿報紙', '份', ['分', '粉']],
    ['＿紅色的花很漂亮', '粉', ['分', '份']], ['時間過了一＿鐘', '分', ['粉', '份']], ['這個＿瓜有點苦', '苦', ['古', '姑']],
    ['老師講＿事', '故', ['古', '苦']], ['他會＿高', '跳', ['桃', '挑']], ['＿子很甜', '桃', ['跳', '挑']],
    ['請你＿選一個禮物', '挑', ['跳', '桃']]
  ];
  gen.cnPickChar = function () {
    const it = pick(SEL);
    return {
      kind: 'text', display: { text: it[0] }, say: it[0].replace('＿', '，空格，') + '。哪一個字放進去最好?',
      answer: it[1], options: shuffle([it[1]].concat(it[2])), big: true,
      hint: '把每個字放進去唸唸看,哪一個通順?', dedupKey: 's' + it[0]
    };
  };

  // ── 選字(二):量詞 ──
  // [名詞, 量詞, [干擾 1, 干擾 2]]。干擾量詞要確定「放進去不通順」。
  const MEASURE = [
    ['魚', '條', ['張', '本']], ['紙', '張', ['條', '隻']], ['貓', '隻', ['條', '張']], ['狗', '隻', ['張', '本']],
    ['鳥', '隻', ['條', '把']], ['書', '本', ['張', '隻']], ['鉛筆', '枝', ['本', '張']], ['雨傘', '把', ['張', '隻']],
    ['花', '朵', ['隻', '本']], ['樹', '棵', ['朵', '本']], ['汽車', '輛', ['隻', '條']], ['房子', '間', ['張', '隻']],
    ['水', '杯', ['隻', '條']], ['飯', '碗', ['張', '隻']], ['衣服', '件', ['隻', '張']], ['鞋子', '雙', ['張', '本']],
    ['帽子', '頂', ['張', '本']], ['糖果', '顆', ['張', '本']], ['葉子', '片', ['隻', '本']], ['山', '座', ['隻', '張']],
    ['雲', '朵', ['隻', '本']], ['葡萄', '串', ['張', '隻']], ['燈', '盞', ['隻', '本']], ['門', '扇', ['隻', '本']],
    ['飛機', '架', ['隻', '本']], ['船', '艘', ['本', '張']], ['蛋糕', '塊', ['隻', '本']], ['馬', '匹', ['張', '本']],
    ['牛', '頭', ['張', '本']], ['眼鏡', '副', ['隻', '張']], ['報紙', '份', ['隻', '條']], ['牛奶', '瓶', ['隻', '本']],
    ['桌子', '張', ['隻', '條']], ['剪刀', '把', ['隻', '本']], ['蘋果', '顆', ['張', '本']], ['雞蛋', '顆', ['隻', '張']],
    ['星星', '顆', ['隻', '本']], ['河', '條', ['張', '座']], ['路', '條', ['張', '本']], ['褲子', '條', ['隻', '本']],
    ['書包', '個', ['條', '隻']], ['電視', '台', ['隻', '本']], ['腳踏車', '輛', ['隻', '朵']], ['麵包', '個', ['張', '隻']],
    ['球', '個', ['條', '張']], ['日記', '本', ['張', '隻']]
  ];
  const NUMS = ['一', '一', '兩', '三', '四', '五'];
  const FRAMES = ['{n}＿{w}', '桌上有{n}＿{w}', '媽媽買了{n}＿{w}', '小明看到{n}＿{w}'];
  gen.cnMeasure = function () {
    const it = pick(MEASURE);
    const text = pick(FRAMES).replace('{n}', pick(NUMS)).replace('{w}', it[0]);
    return {
      kind: 'text', display: { text: text }, say: text.replace('＿', '，空格，') + '。哪一個字放進去最好?',
      answer: it[1], options: shuffle([it[1]].concat(it[2])), big: true,
      hint: '「' + it[0] + '」要用哪一個字來數?唸唸看', dedupKey: 'q' + text
    };
  };

  // 開發用:題庫大小(console 看 PLS_CHINESE.sizes())
  window.PLS_CHINESE = {
    RADICALS: RADICALS, GROUP1: GROUP1, GROUP2: GROUP2,
    sizes: function () {
      return { radical1: charsOf(GROUP1).length * 2, radical2: charsOf(GROUP2).length * 2, meaning: charsOf(GROUP1.concat(GROUP2)).length,
        pickChar: SEL.length, measure: MEASURE.length * NUMS.length * FRAMES.length };
    }
  };
})();
