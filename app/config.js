// config.js — 關卡與內容設定(資料驅動:之後加關卡只改這裡)
window.PLS_CONFIG = {
  appName: '寵物小學堂',
  dailyLimit: 3,        // 每科每天可「正式」過幾關
  questionsPerLevel: 10,
  passRate: 0.9,        // 首次答對率 >= 90% 才能吃大餐
  deluxeAt: 10,         // 同一關正式解滿幾次就改送「豪華版」獎勵(每關一天只能解一次)

  pets: {
    rabbit: {
      id: 'rabbit', name: '兔兔',
      theme: { wall: '#FBE8E4', dot: 'rgba(238,170,170,0.25)', accent: '#B97A82', deep: '#8A5560' }
    },
    hamster: {
      id: 'hamster', name: '倉倉',
      theme: { wall: '#E6EFF5', dot: 'rgba(140,175,205,0.22)', accent: '#6E8BA4', deep: '#4E6B84' }
    }
  },

  // ── 數學關卡 ──────────────────────────────────────────
  // gen: gen.js 裡的出題函式名稱
  // bite: 每答對一題吃的小點心(art.js drawFood 的 key)
  // feast: 大餐(name + items 食物 key 陣列)
  math: [
    { id: 'm1', name: '數一數', sub: '圖案相加', gen: 'visualAdd', icon: 'apple',
      bite: 'eggcake', feast: { name: '台灣夜市大餐', items: ['boba', 'eggcake', 'eggcake', 'boba', 'eggcake'] } },
    { id: 'a10', name: '加法', sub: '10 以內', gen: 'addWithin10', icon: 'plus',
      bite: 'apple', feast: { name: '繽紛水果籃', items: ['apple', 'orange', 'strawberry', 'banana', 'apple'] } },
    { id: 's10', name: '減法', sub: '10 以內', gen: 'subWithin10', icon: 'minus',
      bite: 'strawberry', feast: { name: '草莓點心盤', items: ['strawberry', 'cake', 'strawberry', 'cake', 'strawberry'] } },
    { id: 'a20', name: '加法', sub: '20 以內', gen: 'addWithin20', icon: 'plus',
      bite: 'orange', feast: { name: '果園豐收餐', items: ['orange', 'apple', 'orange', 'strawberry', 'orange'] } },
    { id: 'm2', name: '加法', sub: '兩位數不進位', gen: 'addNoCarry', icon: 'plus',
      bite: 'sushi', feast: { name: '日本壽司大餐', items: ['sushi', 'sushi', 'sushi', 'sushi', 'sushi'] } },
    // 教學順序:先把「進位加法」學會,再進入會退位的減法
    { id: 'm3', name: '加法', sub: '進位', gen: 'addCarry', icon: 'plus',
      bite: 'pizza', feast: { name: '義大利披薩派對', items: ['pizza', 'pizza', 'pizza', 'pizza', 'pizza'] } },
    { id: 'm5', name: '減法', sub: '減兩位數', gen: 'subTwo', icon: 'minus',
      bite: 'fries', feast: { name: '美式漢堡大餐', items: ['burger', 'fries', 'burger', 'fries', 'burger'] } },
    { id: 'm4', name: '減法', sub: '減一位數(會借位)', gen: 'subOne', icon: 'minus',
      bite: 'bao', feast: { name: '小籠包蒸籠宴', items: ['bao', 'bao', 'bao', 'bao', 'bao'] } },
    { id: 'm6', name: '形狀小偵探', sub: '認識圖形', gen: 'shapeFind', icon: 'shape',
      bite: 'scoop', feast: { name: '冰淇淋聖代塔', items: ['sundae', 'scoop', 'scoop', 'sundae', 'scoop'] } },
    { id: 'm7', name: '形狀拼拼樂', sub: '圖形拼補', gen: 'shapeCompose', icon: 'puzzle',
      bite: 'strawberry', feast: { name: '草莓蛋糕塔', items: ['cake', 'strawberry', 'cake', 'strawberry', 'cake'] } },
    // ── 課本單元 6–9(題庫來自 questions/*.xml,可由家長編輯;不上鎖)──
    { id: 'u6', name: '課6 買東西', sub: '認識錢', bank: 'unit6', icon: 'coin', alwaysOpen: true,
      bite: 'boba', feast: { name: '夜市點心大餐', items: ['boba', 'eggcake', 'boba', 'eggcake', 'boba'] } },
    { id: 'u7', name: '課7 看月曆', sub: '日期星期', bank: 'unit7', icon: 'calendar', alwaysOpen: true,
      bite: 'orange', feast: { name: '繽紛水果盤', items: ['orange', 'apple', 'banana', 'strawberry', 'orange'] } },
    { id: 'u8', name: '課8 兩位數加減', sub: '直式計算', bank: 'unit8', icon: 'plus', alwaysOpen: true,
      bite: 'sushi', feast: { name: '日本壽司全餐', items: ['sushi', 'sushi', 'sushi', 'sushi', 'sushi'] } },
    { id: 'u9', name: '課9 分類整理', sub: '數一數比一比', bank: 'unit9', icon: 'sort', alwaysOpen: true,
      bite: 'pizza', feast: { name: '披薩薯條派對', items: ['pizza', 'fries', 'pizza', 'fries', 'pizza'] } },
    // 小二進階(完整內容,照進度逐關解鎖)
    { id: 'm8', name: '加法', sub: '兩位數+兩位數', gen: 'addBig', icon: 'plus',
      bite: 'banana', feast: { name: '繽紛水果大餐', items: ['banana', 'apple', 'orange', 'strawberry', 'banana'] } },
    { id: 'm9', name: '減法', sub: '退位減法', gen: 'subBorrow', icon: 'minus',
      bite: 'cake', feast: { name: '幸福下午茶', items: ['cake', 'boba', 'eggcake', 'scoop', 'cake'] } },
    { id: 'mb', name: '幾個幾', sub: '同數連加', gen: 'mulBridge', icon: 'plus',
      bite: 'banana', feast: { name: '香蕉水果盤', items: ['banana', 'apple', 'banana', 'orange', 'banana'] } },
    { id: 'm10', name: '乘法', sub: '初體驗', gen: 'mulIntro', icon: 'times',
      bite: 'pizza', feast: { name: '乘法派對餐', items: ['pizza', 'burger', 'sushi', 'fries', 'bao'] } }
  ],

  // ── 英文關卡(階梯,難度非常緩慢遞增)──────────────────
  // 英文獎勵是「玩具」:兔兔 = 扮家家酒/娃娃,倉倉 = 機器人/汽車
  // play: pick(聽音/看字選) | match(大小寫配對) | trace(描寫) | write(自己寫)
  // cs: upper|lower(字母大小寫)  toyArt: 對應 toys.js 的玩具 key
  // count: 本關題數(描寫/手寫較花時間,題數少一點)
  english: [
    { id: 'e1', name: '聽音選字母', sub: '大寫 A–Z', play: 'pick', cs: 'upper', count: 10,
      toy: { rabbit: '小娃娃', hamster: '小汽車' }, toyArt: { rabbit: 'doll', hamster: 'car' } },
    { id: 'e2', name: '描寫大寫', sub: '描著寫', play: 'trace', cs: 'upper', count: 10,
      toy: { rabbit: '茶具組', hamster: '小火車' }, toyArt: { rabbit: 'teaset', hamster: 'train' } },
    { id: 'e3', name: '大寫手寫', sub: '自己寫', play: 'write', cs: 'upper', count: 10, boxes: 6,
      toy: { rabbit: '玩具廚房', hamster: '挖土機' }, toyArt: { rabbit: 'kitchen', hamster: 'digger' } },
    { id: 'e4', name: '大小寫配對', sub: 'A→a', play: 'match', cs: 'lower', count: 10,
      toy: { rabbit: '娃娃床', hamster: '遙控車' }, toyArt: { rabbit: 'dollbed', hamster: 'rccar' } },
    { id: 'e5', name: '描寫小寫', sub: '描著寫', play: 'trace', cs: 'lower', count: 10,
      toy: { rabbit: '野餐籃', hamster: '小飛機' }, toyArt: { rabbit: 'basket', hamster: 'plane' } },
    { id: 'e6', name: '小寫手寫', sub: '自己寫', play: 'write', cs: 'lower', count: 10, boxes: 6,
      toy: { rabbit: '布偶熊', hamster: '機器狗' }, toyArt: { rabbit: 'teddy', hamster: 'robodog' } },
    { id: 'e7', name: '聽音選單字', sub: '純CVC短母音', play: 'wpick', cs: 'lower', count: 8, wordPool: 'cvc',
      toy: { rabbit: '玩具屋', hamster: '小機器人' }, toyArt: { rabbit: 'dollhouse', hamster: 'robot' } },
    { id: 'e7b', name: '長母音單字', sub: 'magic-e 拼音', play: 'wpick', cs: 'lower', count: 8, wordPool: 'magic_e',
      toy: { rabbit: '魔法棒', hamster: '小火箭' }, toyArt: { rabbit: 'wand', hamster: 'rocket' } },
    { id: 'e8', name: '拼拼單字', sub: '三個字母', play: 'spell', cs: 'lower', count: 6, wordPool: 'cvc',
      toy: { rabbit: '公主裙', hamster: '太空梭' }, toyArt: { rabbit: 'dress', hamster: 'shuttle' } },
    { id: 'e9', name: '單字手寫', sub: '寫出單字', play: 'wword', cs: 'lower', count: 5,
      toy: { rabbit: '旋轉木馬', hamster: '大機器人' }, toyArt: { rabbit: 'carousel', hamster: 'bigrobot' } }
  ],

  // 寵物的話(對話泡泡,安靜不出聲)
  talk: {
    welcome: ['今天也一起加油!', '主人來了,好開心!', '我們來解題吧!'],
    correct: ['好吃!', '主人好棒!', '謝謝主人!', '又香又甜~', '嗯~好滿足!'],
    wrong: ['沒關係,再試一次', '慢慢想,不用急', '再看一次題目喔'],
    practice: ['練習也很棒喔!', '越練越厲害!', '我陪你一起練習~'],
    practiceCorrect: ['答對了!', '好厲害!', '就是這樣!'],
    feast: ['哇!是大餐!謝謝主人!', '我吃得好飽好幸福~'],
    feastDeluxe: ['哇——是豪華大餐!我超級超級喜歡!謝謝主人!', '這是我吃過最棒的一餓!主人你最好了。。。我好感動!', '哇嗚嗚!黃金大餐耀!我會好好記住這一天,謝謝你主人~'],
    full: ['今天吃飽飽了,明天見!', '謝謝主人,明天再來喔!'],
    almost: ['好可惜,差一點點!', '再練習一下,明天一定行!']
  },

  // 英文遊戲間的話(玩具情境,溫和不出聲)
  talkEng: {
    welcome: ['我們來玩英文!', '今天學什麼字母呢?', '一起念念看吧!'],
    correct: ['答對了!', '好厲害!', '就是這個!', '你好棒~'],
    wrong: ['再聽一次看看', '沒關係,慢慢來', '再看一下喔'],
    trace: ['沿著線描描看~', '慢慢描,很好看!', '描完按「完成」喔'],
    write: ['自己寫寫看!', '寫好按「完成」', '你寫得真用心~'],
    nice: ['寫得真棒!', '好工整喔!', '完成囉!'],
    reward: ['哇!新玩具!謝謝主人!', '我好喜歡這個玩具~'],
    rewardDeluxe: ['哇——豪華版玩具!我好喜歡好喜歡!謝謝主人!', '這是最特別的礼物!我會好好珍惜。。。主人你最好了!', '閃闃闃的豪華玩具!我超愛的,謝謝你主人~'],
    full: ['今天玩具拿夠囉,明天見!', '謝謝主人,明天再來玩!']
  }
};
