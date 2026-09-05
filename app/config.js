// config.js — 關卡與內容設定(資料驅動:之後加關卡只改這裡)
window.PLS_CONFIG = {
  appName: '寵物小學堂',
  dailyLimit: 10,       // 每科每天可「正式」過幾關(預設；可在家長區調整)
  questionsPerLevel: 10,
  passRate: 0.9,        // 首次答對率 >= 90% 才能吃大餐
  deluxeAt: 10,         // 同一關正式解滿幾次就改送「豪華版」獎勵(每關一天只能解一次)
  // v12:難度分級獎勵 — 同一關過關次數超過門檻就不再給點數/食物(仍可繼續玩,只是沒獎勵)。
  // 「入門」= advancedFrom 之前的關卡,「進階」= advancedFrom(含)之後;兩個門檻家長區可調(全域共用)。
  clearCapBasic: 3,      // 入門關卡:過幾次後不再給獎勵(預設；可在家長區調整)
  clearCapAdvanced: 10,  // 進階關卡:過幾次後不再給獎勵(預設；可在家長區調整)

  // v11:好友雲端同步(選用附加功能,見 app/cloud.js)— 純前端 SDK 金鑰,安全邊界在 firestore.rules,不是這裡。
  firebase: {
    apiKey: 'AIzaSyDks91uInPevDI2VkFXHq9SZS13Yp4VYYg',
    authDomain: 'children-pet.firebaseapp.com',
    projectId: 'children-pet',
    storageBucket: 'children-pet.firebasestorage.app',
    messagingSenderId: '242093609222',
    appId: '1:242093609222:web:913e9cd6f59aead08bce87'
  },

  pets: {
    rabbit: {
      id: 'rabbit', name: '兔兔',
      theme: { wall: '#FBE8E4', dot: 'rgba(238,170,170,0.25)', accent: '#B97A82', deep: '#8A5560' }
    },
    hamster: {
      id: 'hamster', name: '倉倉',
      theme: { wall: '#E6EFF5', dot: 'rgba(140,175,205,0.22)', accent: '#6E8BA4', deep: '#4E6B84' }
    },
    // 備用物種(可從首頁選來養;繪製在 pets.js,大寶配件各 5 款由 growth.deco 隨機決定)
    tabby: {
      id: 'tabby', name: '斑斑',
      theme: { wall: '#FBEEDD', dot: 'rgba(230,170,110,0.22)', accent: '#C58A4E', deep: '#8A5A2E' }
    },
    meerkat: {
      id: 'meerkat', name: '蒙蒙',
      theme: { wall: '#F0E4CD', dot: 'rgba(190,150,95,0.20)', accent: '#B26A3C', deep: '#7A4526' }
    },
    capybara: {
      id: 'capybara', name: '豚豚',
      theme: { wall: '#DCE8E0', dot: 'rgba(120,160,140,0.20)', accent: '#5E8A72', deep: '#3E5F4E' }
    },
    husky: {
      id: 'husky', name: '哈哈',
      theme: { wall: '#E2E9F2', dot: 'rgba(120,150,190,0.20)', accent: '#3E9E8E', deep: '#33506E' }
    },
    // 大象 — 向日葵花園場景(房間背景另繪,見 screens.js SCENE_ROOM.elephant)
    elephant: {
      id: 'elephant', name: '象象',
      theme: { wall: '#CFE9E1', dot: 'rgba(110,175,155,0.20)', accent: '#3F9E8C', deep: '#2E6E60' }
    },
    // 橘白貓 — 聖誕冬青金星場景(房間背景另繪,見 screens.js SCENE_ROOM.xmascat)
    xmascat: {
      id: 'xmascat', name: '橘橘',
      theme: { wall: '#C24E5A', dot: 'rgba(244,198,78,0.22)', accent: '#2E7D46', deep: '#7A2530' }
    },
    // 小雞 — 稻草農場場景(蛋孵化幼幼;房間背景見 screens.js SCENE_ROOM.chick)
    chick: {
      id: 'chick', name: '小雞',
      theme: { wall: '#F6E9CC', dot: 'rgba(211,166,63,0.18)', accent: '#C99A4E', deep: '#8A6242' }
    },
    // 貓頭鷹 — 黃昏森林場景(蛋孵化幼幼;房間背景見 screens.js SCENE_ROOM.owl)
    owl: {
      id: 'owl', name: '貓頭鷹',
      theme: { wall: '#E3E1EF', dot: 'rgba(91,107,166,0.18)', accent: '#5B6BA6', deep: '#3E3A66' }
    },
    // 長頸鹿 — 莎凡納草原場景(第 11 隻,actor 架構;房間背景見 screens.js SCENE_ROOM.giraffe)
    giraffe: {
      id: 'giraffe', name: '長頸鹿',
      theme: { wall: '#FBEAC8', dot: 'rgba(184,122,62,0.22)', accent: '#C9853E', deep: '#8A5A2E' }
    }
  },

  // ── 數學關卡 ──────────────────────────────────────────
  // gen: gen.js 裡的出題函式名稱
  // bite: 每答對一題吃的小點心(art.js drawFood 的 key)
  // feast: 大餐(name + items 食物 key 陣列)
  math: [
    { id: 'm1', name: '數一數', sub: '圖案相加', gen: 'visualAdd', icon: 'apple',
      bite: 'eggcake', feast: { name: '台灣夜市大餐', basicName: '一份雞蛋糕', deluxeName: '夜市大餐全套', items: ['boba', 'eggcake', 'eggcake', 'boba', 'eggcake'] } },
    { id: 'a10', name: '加法', sub: '10 以內', gen: 'addWithin10', icon: 'plus',
      bite: 'apple', feast: { name: '繽紛水果籃', basicName: '一籃水果', deluxeName: '豐盛水果大禮籃', items: ['apple', 'orange', 'strawberry', 'banana', 'apple'] } },
    { id: 's10', name: '減法', sub: '10 以內', gen: 'subWithin10', icon: 'minus',
      bite: 'strawberry', feast: { name: '草莓點心盤', basicName: '一盤草莓點心', deluxeName: '草莓點心豪華盤', items: ['strawberry', 'cake', 'strawberry', 'cake', 'strawberry'] } },
    { id: 'a20', name: '加法', sub: '20 以內', gen: 'addWithin20', icon: 'plus',
      bite: 'orange', feast: { name: '果園豐收餐', basicName: '一籃橘子水果', deluxeName: '果園豐收大禮盤', items: ['orange', 'apple', 'orange', 'strawberry', 'orange'] } },
    { id: 'm2', name: '加法', sub: '兩位數不進位', gen: 'addNoCarry', icon: 'plus',
      bite: 'sushi', feast: { name: '日本壽司大餐', basicName: '一盤壽司', deluxeName: '壽司豪華全餐', items: ['sushi', 'sushi', 'sushi', 'sushi', 'sushi'] } },
    // 教學順序:先把「進位加法」學會,再進入會退位的減法
    { id: 'm3', name: '加法', sub: '進位', gen: 'addCarry', icon: 'plus',
      bite: 'pizza', feast: { name: '義大利披薩派對', basicName: '一塊披薩', deluxeName: '披薩豪華全份', items: ['pizza', 'pizza', 'pizza', 'pizza', 'pizza'] } },
    { id: 'm5', name: '減法', sub: '減兩位數', gen: 'subTwo', icon: 'minus',
      bite: 'fries', feast: { name: '美式漢堡大餐', basicName: '小漢堡薯條', deluxeName: '大麥克豪華餐', items: ['burger', 'fries', 'burger', 'fries', 'burger'] } },
    { id: 'm4', name: '減法', sub: '減一位數(會借位)', gen: 'subOne', icon: 'minus',
      bite: 'bao', feast: { name: '小籠包蒸籠宴', basicName: '一籠小籠包', deluxeName: '小籠包豪華全席', items: ['bao', 'bao', 'bao', 'bao', 'bao'] } },
    { id: 'm6', name: '形狀小偵探', sub: '認識圖形', gen: 'shapeFind', icon: 'shape',
      bite: 'scoop', feast: { name: '冰淇淋聖代塔', basicName: '一球冰淇淋', deluxeName: '聖代冰淇淋豪華塔', items: ['sundae', 'scoop', 'scoop', 'sundae', 'scoop'] } },
    { id: 'm7', name: '形狀拼拼樂', sub: '圖形拼補', gen: 'shapeCompose', icon: 'puzzle',
      bite: 'strawberry', feast: { name: '草莓蛋糕塔', basicName: '一塊草莓蛋糕', deluxeName: '草莓蛋糕豪華塔', items: ['cake', 'strawberry', 'cake', 'strawberry', 'cake'] } },
    // ── 課本單元 6–9(題庫來自 questions/*.xml,可由家長編輯)──
    // v12:取消 alwaysOpen(原為期末考暫時開放),恢復序列鎖,跟其他關卡一起照順序解鎖。
    { id: 'u6', name: '課6 買東西', sub: '認識錢', bank: 'unit6', icon: 'coin',
      bite: 'boba', feast: { name: '夜市點心大餐', basicName: '一份夜市點心', deluxeName: '夜市豪華全套', items: ['boba', 'eggcake', 'boba', 'eggcake', 'boba'] } },
    { id: 'u7', name: '課7 看月曆', sub: '日期星期', bank: 'unit7', icon: 'calendar',
      bite: 'orange', feast: { name: '繽紛水果盤', basicName: '一盤繽紛水果', deluxeName: '繽紛水果豐收大盤', items: ['orange', 'apple', 'banana', 'strawberry', 'orange'] } },
    { id: 'u8', name: '課8 兩位數加減', sub: '直式計算', bank: 'unit8', icon: 'plus',
      bite: 'sushi', feast: { name: '日本壽司全餐', basicName: '一盤壽司', deluxeName: '壽司豪華全餐', items: ['sushi', 'sushi', 'sushi', 'sushi', 'sushi'] } },
    { id: 'u9', name: '課9 分類整理', sub: '數一數比一比', bank: 'unit9', icon: 'sort',
      bite: 'pizza', feast: { name: '披薩薯條派對', basicName: '一塊披薩薯條', deluxeName: '披薩薯條豪華全套', items: ['pizza', 'fries', 'pizza', 'fries', 'pizza'] } },
    // 小二進階(完整內容,照進度逐關解鎖)
    { id: 'm8', name: '加法', sub: '兩位數+兩位數', gen: 'addBig', icon: 'plus',
      bite: 'banana', feast: { name: '繽紛水果大餐', basicName: '一籃繽紛水果', deluxeName: '繽紛水果大禮籃', items: ['banana', 'apple', 'orange', 'strawberry', 'banana'] } },
    { id: 'm9', name: '減法', sub: '退位減法', gen: 'subBorrow', icon: 'minus',
      bite: 'cake', feast: { name: '幸福下午茶', basicName: '一份下午茶', deluxeName: '幸福下午茶豪華版', items: ['cake', 'boba', 'eggcake', 'scoop', 'cake'] } },
    { id: 'mb', name: '幾個幾', sub: '同數連加', gen: 'mulBridge', icon: 'plus',
      bite: 'banana', feast: { name: '香蕉水果盤', basicName: '一盤水果', deluxeName: '香蕉水果豪華盤', items: ['banana', 'apple', 'banana', 'orange', 'banana'] } },
    { id: 'm10', name: '乘法', sub: '初體驗', gen: 'mulIntro', icon: 'times',
      bite: 'pizza', feast: { name: '乘法派對餐', basicName: '一份派對美食', deluxeName: '乘法派對豪華全餐', items: ['pizza', 'burger', 'sushi', 'fries', 'bao'] } }
  ],

  // ── 二年級上學期課本(獨立關卡池,見「分級挑戰」章節)──────
  // 跟 math 是完全分開的陣列,不影響 math 原本的解鎖鏈;第一關(idx 0)照 levelState 規則永遠開放,
  // 不需要先破完 math 才能玩。房間「數學餐廳」卡進 tierPick 畫面選要玩哪一池,再進同一套 map/quiz 畫面
  // (map/quiz 用 params.tier 決定讀 CFG.math 還是 CFG.math2)。
  // v14:食物全部換成 10 種新設計(onigiri~potsticker),跟一年級的 14 種區隔開,
  // 課本進度前進了、獎勵也該有新鮮感,不要每次都吃一樣的東西。
  math2: [
    { id: 'g2c1', name: '課1 200以內的數', sub: '跳數‧位值‧付錢‧比大小', gen: 'hundredsTo200', icon: 'coin',
      bite: 'onigiri', feast: { name: '飯糰野餐盒', basicName: '一顆飯糰', deluxeName: '飯糰野餐豪華盒', items: ['onigiri', 'onigiri', 'onigiri', 'onigiri', 'onigiri'] } },
    { id: 'g2c2', name: '課2 二位數的加減法', sub: '進位加法‧退位減法‧比大小', gen: 'addSubCompare200', icon: 'plus',
      bite: 'mango', feast: { name: '芒果冰品攤', basicName: '一顆芒果', deluxeName: '芒果冰品豪華攤', items: ['mango', 'mango', 'mango', 'mango', 'mango'] } },
    { id: 'g2c3', name: '課3 認識公分', sub: '讀尺‧長度比較‧公分加減', gen: 'cmLength200', icon: 'shape',
      bite: 'taiyaki', feast: { name: '鯛魚燒攤', basicName: '一份鯛魚燒', deluxeName: '鯛魚燒豪華全份', items: ['taiyaki', 'taiyaki', 'taiyaki', 'taiyaki', 'taiyaki'] } },
    { id: 'g2c4', name: '課4 加減應用', sub: '加減互逆‧應用題‧驗算', gen: 'addSubApply200', icon: 'plus',
      bite: 'hotdog', feast: { name: '熱狗攤', basicName: '一份熱狗', deluxeName: '熱狗豪華全份', items: ['hotdog', 'hotdog', 'hotdog', 'hotdog', 'hotdog'] } },
    { id: 'g2c5', name: '課5 容量', sub: '容器容量比較‧裝水杯數比較', gen: 'capacity200', icon: 'shape',
      bite: 'watermelon', feast: { name: '消暑西瓜攤', basicName: '一片西瓜', deluxeName: '消暑西瓜豪華攤', items: ['watermelon', 'watermelon', 'watermelon', 'watermelon', 'watermelon'] } },
    { id: 'g2c6', name: '課6 加減的商店', sub: '三數相加‧兩步驟減法‧加減兩步驟', gen: 'shopTwoStep200', icon: 'coin',
      bite: 'donut', feast: { name: '甜甜圈鋪', basicName: '一個甜甜圈', deluxeName: '甜甜圈豪華全盒', items: ['donut', 'donut', 'donut', 'donut', 'donut'] } },
    { id: 'g2c7', name: '課7 乘法(一)', sub: '幾的幾倍‧2‧4‧5‧8的乘法', gen: 'mult200', icon: 'times',
      bite: 'popcorn', feast: { name: '電影爆米花', basicName: '一桶爆米花', deluxeName: '爆米花豪華加大桶', items: ['popcorn', 'popcorn', 'popcorn', 'popcorn', 'popcorn'] } },
    { id: 'g2c8', name: '課8 時間', sub: '認識鐘面‧幾時幾分‧經過的時間', gen: 'clockTime200', icon: 'calendar',
      bite: 'macaron', feast: { name: '馬卡龍禮盒', basicName: '一顆馬卡龍', deluxeName: '馬卡龍豪華禮盒', items: ['macaron', 'macaron', 'macaron', 'macaron', 'macaron'] } },
    { id: 'g2c9', name: '課9 乘法(二)', sub: '3‧6‧7‧9的乘法‧乘法應用', gen: 'mult2_200', icon: 'times',
      bite: 'mochi', feast: { name: '大福和菓子', basicName: '一顆大福', deluxeName: '大福和菓子豪華盒', items: ['mochi', 'mochi', 'mochi', 'mochi', 'mochi'] } },
    { id: 'g2c10', name: '課10 面的大小比較', sub: '直接比較‧方格法間接比較', gen: 'areaCompare200', icon: 'shape',
      bite: 'potsticker', feast: { name: '煎餃小吃攤', basicName: '一份煎餃', deluxeName: '煎餃豪華全份', items: ['potsticker', 'potsticker', 'potsticker', 'potsticker', 'potsticker'] } }
  ],

  // ── 英文關卡(階梯,難度非常緩慢遞增)──────────────────
  // 英文獎勵是「玩具」。v9:全物種共用一套玩具(toyU / toyArtU),不再分寵物;
  //   舊欄位 toy/toyArt(rabbit/hamster)保留純為顯示舊背包裡既有的玩具名稱。
  // play: pick(聽音/看字選) | match(大小寫配對) | trace(描寫) | write(自己寫)
  // cs: upper|lower(字母大小寫)  toyArtU: 對應 toys.js 的玩具 key
  // count: 本關題數(描寫/手寫較花時間,題數少一點)
  english: [
    { id: 'e1', name: '聽音選字母', sub: '大寫 A–Z', play: 'pick', cs: 'upper', count: 10,
      toyU: '小汽車', toyArtU: 'car',
      toy: { rabbit: '小娃娃', hamster: '小汽車' }, toyArt: { rabbit: 'doll', hamster: 'car' } },
    { id: 'e2', name: '描寫大寫', sub: '描著寫', play: 'trace', cs: 'upper', count: 10,
      toyU: '小火車', toyArtU: 'train',
      toy: { rabbit: '茶具組', hamster: '小火車' }, toyArt: { rabbit: 'teaset', hamster: 'train' } },
    { id: 'e3', name: '大寫手寫', sub: '自己寫', play: 'write', cs: 'upper', count: 10, boxes: 6,
      toyU: '玩具廚房', toyArtU: 'kitchen',
      toy: { rabbit: '玩具廚房', hamster: '挖土機' }, toyArt: { rabbit: 'kitchen', hamster: 'digger' } },
    { id: 'e4', name: '大小寫配對', sub: 'A→a', play: 'match', cs: 'lower', count: 10,
      toyU: '遙控車', toyArtU: 'rccar',
      toy: { rabbit: '娃娃床', hamster: '遙控車' }, toyArt: { rabbit: 'dollbed', hamster: 'rccar' } },
    { id: 'e5', name: '描寫小寫', sub: '描著寫', play: 'trace', cs: 'lower', count: 10,
      toyU: '小飛機', toyArtU: 'plane',
      toy: { rabbit: '野餐籃', hamster: '小飛機' }, toyArt: { rabbit: 'basket', hamster: 'plane' } },
    { id: 'e6', name: '小寫手寫', sub: '自己寫', play: 'write', cs: 'lower', count: 10, boxes: 6,
      toyU: '布偶熊', toyArtU: 'teddy',
      toy: { rabbit: '布偶熊', hamster: '機器狗' }, toyArt: { rabbit: 'teddy', hamster: 'robodog' } },
    { id: 'e7', name: '聽音選單字', sub: '純CVC短母音', play: 'wpick', cs: 'lower', count: 8, wordPool: 'cvc',
      toyU: '小機器人', toyArtU: 'robot',
      toy: { rabbit: '玩具屋', hamster: '小機器人' }, toyArt: { rabbit: 'dollhouse', hamster: 'robot' } },
    { id: 'e7b', name: '長母音單字', sub: 'magic-e 拼音', play: 'wpick', cs: 'lower', count: 8, wordPool: 'magic_e',
      toyU: '小火箭', toyArtU: 'rocket',
      toy: { rabbit: '魔法棒', hamster: '小火箭' }, toyArt: { rabbit: 'wand', hamster: 'rocket' } },
    { id: 'e8', name: '拼拼單字', sub: '三個字母', play: 'spell', cs: 'lower', count: 6, wordPool: 'cvc',
      toyU: '玩具屋', toyArtU: 'dollhouse',
      toy: { rabbit: '公主裙', hamster: '太空梭' }, toyArt: { rabbit: 'dress', hamster: 'shuttle' } },
    { id: 'e9', name: '單字手寫', sub: '寫出單字', play: 'wword', cs: 'lower', count: 5,
      toyU: '旋轉木馬', toyArtU: 'carousel',
      toy: { rabbit: '旋轉木馬', hamster: '大機器人' }, toyArt: { rabbit: 'carousel', hamster: 'bigrobot' } }
  ],

  // ── 英文 · 二年級上學期(獨立關卡池,對照課本 Starter/Unit1-4/My School Bag/Halloween)────
  // 跟 english 是完全分開的陣列,不影響 english 原本的解鎖鏈(字母拼讀是通用讀寫能力,
  // 跟課本進度是兩件事);房間「英文遊戲間」卡進 tierPick 畫面選要玩哪一池。
  // play:'qa'(句型/單字問答)— eplay 依 bank 隨機挑一筆,方向 hear(聽英文選中文)或
  // say(看中文選英文,選對後複誦英文加深印象),干擾選項從同一 bank 其他筆抽,見 english.js next()。
  // bank 每筆 {en, zh, color?} — color 是選填的色塊提示(目前只有 Unit4 顏色單字用到)。
  // v14:每課 count 盡量貼齊 bank 大小,避免同一輪就強迫重複(見 e2c1_出題樣本 的討論)。
  // 用故事裡本來就有的多個角色(Abu/Edison/Rocky/Amber/Mia)代入同一句型,或把該課已教過的
  // 數字/顏色/文具單字套進已教過的句型,是課本原本就有的操練方式(仿寫/代換),不算超出範圍。
  // 玩具沿用 doll/teaset/dollbed/basket/digger/dress/wand(2026-06-14 專案初版就有的舊圖,
  // 原本是兔兔/倉倉各自專屬玩具,v9 全物種共用一套後就沒關卡在用了,english2 新增時撿回來用)。
  // 曾經照課本主題重新設計過一批(numberblocks/nametag/birthdaycake/pencilcase/crayonbox/
  // backpack/pumpkinlamp,見 app/toys.js),討論後決定先不換,新設計保留在 toys.js 沒有刪掉,
  // 也列在 assets-preview.html 的 TRIAL_TOY_KEYS 裡,之後要用隨時可以把下面 toyArtU 換過去。
  english2: [
    { id: 'e2c1', name: 'Starter 打招呼', sub: 'Hi/Hello‧數字1-5', play: 'qa', count: 10,
      toyU: '小娃娃', toyArtU: 'doll',
      bank: [
        { en: 'Hi!', zh: '嗨!' },
        { en: 'Hello!', zh: '你好!' },
        { en: "Hi, I'm Abu.", zh: '嗨,我是Abu。' },
        { en: "Hi, I'm Amber.", zh: '嗨,我是Amber。' },
        { en: "Hi, I'm Edison.", zh: '嗨,我是Edison。' },
        { en: "Hi, I'm Mia.", zh: '嗨,我是Mia。' },
        { en: "Hi, I'm Rocky.", zh: '嗨,我是Rocky。' },
        { en: "Hi, I'm Teddy.", zh: '嗨,我是Teddy。' },
        { en: 'one', zh: '1' },
        { en: 'two', zh: '2' },
        { en: 'three', zh: '3' },
        { en: 'four', zh: '4' },
        { en: 'five', zh: '5' }
      ] },
    { id: 'e2c2', name: 'Unit1 你叫什麼名字?', sub: "What's Your Name?", play: 'qa', count: 10,
      toyU: '茶具組', toyArtU: 'teaset',
      // 句子題之外,額外補 6 個「單字題」(裸名字,zh 跟 en 同形)——純考「聽音辨字」
      // (聽到 Edison 要能認出 Edison,不是跟其他名字搞混),跟基礎挑戰 pick 模式練字母是同一種能力。
      bank: [
        { en: "What's your name?", zh: '你叫什麼名字?' },
        { en: 'My name is Abu.', zh: '我的名字是Abu。' },
        { en: 'My name is Amber.', zh: '我的名字是Amber。' },
        { en: 'My name is Edison.', zh: '我的名字是Edison。' },
        { en: 'My name is Mia.', zh: '我的名字是Mia。' },
        { en: 'My name is Rocky.', zh: '我的名字是Rocky。' },
        { en: 'My name is Teddy.', zh: '我的名字是Teddy。' },
        { en: 'Are you OK?', zh: '你還好嗎?' },
        { en: 'How are you?', zh: '你好嗎?' },
        { en: 'Fine, thank you.', zh: '很好,謝謝。' },
        { en: "I'm fine, thank you.", zh: '我很好,謝謝。' },
        { en: 'Abu', zh: 'Abu' },
        { en: 'Amber', zh: 'Amber' },
        { en: 'Edison', zh: 'Edison' },
        { en: 'Mia', zh: 'Mia' },
        { en: 'Rocky', zh: 'Rocky' },
        { en: 'Teddy', zh: 'Teddy' }
      ] },
    { id: 'e2c3', name: 'Unit2 你幾歲?', sub: 'How Old Are You?‧數字6-10', play: 'qa', count: 10,
      toyU: '娃娃床', toyArtU: 'dollbed',
      bank: [
        { en: 'How old are you?', zh: '你幾歲?' },
        { en: "I'm six years old.", zh: '我六歲。' },
        { en: "I'm seven years old.", zh: '我七歲。' },
        { en: "I'm eight years old.", zh: '我八歲。' },
        { en: "I'm nine years old.", zh: '我九歲。' },
        { en: "I'm ten years old.", zh: '我十歲。' },
        { en: 'Thank you.', zh: '謝謝你。' },
        { en: "You're welcome.", zh: '不客氣。' },
        { en: 'six', zh: '6' },
        { en: 'seven', zh: '7' },
        { en: 'eight', zh: '8' },
        { en: 'nine', zh: '9' },
        { en: 'ten', zh: '10' }
      ] },
    { id: 'e2c4', name: 'Unit3 這是什麼?', sub: "What's This?‧文具", play: 'qa', count: 10,
      toyU: '野餐籃', toyArtU: 'basket',
      // 這課本身的新單字(文具)只有 6 個,課本就是教這 6 個,不再多加;
      // 「It's a/an ___.」句型不變,xxx 額外代入英文遊戲間「基礎挑戰」CVC 單字庫裡已經教過的
      // 動物+物品單字(app/english.js WORDS_CVC)當延伸練習,維持同一個句型,只換名詞。
      bank: [
        { en: "What's this?", zh: '這是什麼?' },
        { en: "What's that?", zh: '那是什麼?' },
        { en: "It's a book.", zh: '這是一本書。' },
        { en: "It's a pen.", zh: '這是一枝筆。' },
        { en: "It's a pencil.", zh: '這是一枝鉛筆。' },
        { en: "It's an eraser.", zh: '這是一個橡皮擦。' },
        { en: "It's a ruler.", zh: '這是一把尺。' },
        { en: "It's a marker.", zh: '這是一枝彩色筆。' },
        { en: 'book', zh: '書' },
        { en: 'pen', zh: '筆' },
        { en: 'pencil', zh: '鉛筆' },
        { en: 'eraser', zh: '橡皮擦' },
        { en: 'ruler', zh: '尺' },
        { en: 'marker', zh: '彩色筆' },
        { en: "It's a cat.", zh: '這是一隻貓。' },
        { en: "It's a dog.", zh: '這是一隻狗。' },
        { en: "It's a pig.", zh: '這是一隻豬。' },
        { en: "It's a fox.", zh: '這是一隻狐狸。' },
        { en: "It's a hen.", zh: '這是一隻母雞。' },
        { en: "It's a cow.", zh: '這是一隻牛。' },
        { en: "It's an owl.", zh: '這是一隻貓頭鷹。' },
        { en: "It's a bee.", zh: '這是一隻蜜蜂。' },
        { en: "It's a hat.", zh: '這是一頂帽子。' },
        { en: "It's a cup.", zh: '這是一個杯子。' },
        { en: "It's a bus.", zh: '這是一輛公車。' },
        { en: "It's a bed.", zh: '這是一張床。' },
        { en: "It's a box.", zh: '這是一個盒子。' },
        { en: "It's a bag.", zh: '這是一個袋子。' },
        { en: "It's an egg.", zh: '這是一顆蛋。' },
        { en: "It's a map.", zh: '這是一張地圖。' },
        { en: "It's a van.", zh: '這是一輛廂型車。' },
        { en: "It's a jet.", zh: '這是一架噴射機。' }
      ] },
    { id: 'e2c5', name: 'Unit4 這是什麼顏色?', sub: 'What Color Is It?‧顏色', play: 'qa', count: 10,
      toyU: '挖土機', toyArtU: 'digger',
      // 這課本身的新顏色單字只有 6 個(課本就是教這 6 個,不再多加);
      // 額外用「My School Bag」已經用過的同一種句型「[名詞] is [顏色].」(例如
      // My school bag is red.)套進 Unit3 教過的文具名詞,同句型換名詞,呼應同一個文法概念。
      bank: [
        { en: 'What color is it?', zh: '這是什麼顏色?' },
        { en: "It's red.", zh: '是紅色。', color: '#E4574B' },
        { en: "It's blue.", zh: '是藍色。', color: '#4A7FC1' },
        { en: "It's green.", zh: '是綠色。', color: '#4F9E5C' },
        { en: "It's yellow.", zh: '是黃色。', color: '#E8C13B' },
        { en: "It's black.", zh: '是黑色。', color: '#3A3A3A' },
        { en: "It's white.", zh: '是白色。', color: '#F2F2ED' },
        { en: 'red', zh: '紅色', color: '#E4574B' },
        { en: 'blue', zh: '藍色', color: '#4A7FC1' },
        { en: 'green', zh: '綠色', color: '#4F9E5C' },
        { en: 'yellow', zh: '黃色', color: '#E8C13B' },
        { en: 'black', zh: '黑色', color: '#3A3A3A' },
        { en: 'white', zh: '白色', color: '#F2F2ED' },
        { en: 'Good morning.', zh: '早安。' },
        { en: 'Good afternoon.', zh: '午安。' },
        { en: 'The pencil is red.', zh: '鉛筆是紅色的。', color: '#E4574B' },
        { en: 'The eraser is blue.', zh: '橡皮擦是藍色的。', color: '#4A7FC1' },
        { en: 'The ruler is green.', zh: '尺是綠色的。', color: '#4F9E5C' },
        { en: 'The book is yellow.', zh: '書是黃色的。', color: '#E8C13B' },
        { en: 'The pen is black.', zh: '筆是黑色的。', color: '#3A3A3A' },
        { en: 'The marker is white.', zh: '彩色筆是白色的。', color: '#F2F2ED' }
      ] },
    { id: 'e2c6', name: 'My School Bag 我的書包', sub: '介紹書包裡的文具', play: 'qa', count: 10,
      toyU: '公主裙', toyArtU: 'dress',
      bank: [
        { en: 'This is my school bag.', zh: '這是我的書包。' },
        { en: 'My school bag is red.', zh: '我的書包是紅色的。', color: '#E4574B' },
        { en: 'My school bag is blue.', zh: '我的書包是藍色的。', color: '#4A7FC1' },
        { en: 'My school bag is green.', zh: '我的書包是綠色的。', color: '#4F9E5C' },
        { en: 'My school bag is yellow.', zh: '我的書包是黃色的。', color: '#E8C13B' },
        { en: "It's red and blue.", zh: '它是紅色和藍色。' },
        { en: "It's green and yellow.", zh: '它是綠色和黃色。' },
        { en: 'I have a book.', zh: '我有一本書。' },
        { en: 'I have a pen.', zh: '我有一枝筆。' },
        { en: 'I have a pencil.', zh: '我有一枝鉛筆。' },
        { en: 'I have an eraser.', zh: '我有一個橡皮擦。' },
        { en: 'I have a ruler.', zh: '我有一把尺。' },
        { en: 'I have a marker.', zh: '我有一枝彩色筆。' }
      ] },
    { id: 'e2c7', name: 'Halloween 萬聖節', sub: '萬聖節單字‧不給糖就搗蛋', play: 'qa', count: 10,
      toyU: '魔法棒', toyArtU: 'wand',
      bank: [
        { en: 'Happy Halloween!', zh: '萬聖節快樂!' },
        { en: 'Trick or treat!', zh: '不給糖就搗蛋!' },
        { en: "I'm a bat.", zh: '我是一隻蝙蝠。' },
        { en: "I'm a ghost.", zh: '我是一個幽靈。' },
        { en: "I'm a pumpkin.", zh: '我是一個南瓜。' },
        { en: "I'm a spider.", zh: '我是一隻蜘蛛。' },
        { en: "I'm a vampire.", zh: '我是一個吸血鬼。' },
        { en: "I'm a witch.", zh: '我是一個女巫。' },
        { en: 'bat', zh: '蝙蝠' },
        { en: 'ghost', zh: '幽靈' },
        { en: 'pumpkin', zh: '南瓜' },
        { en: 'spider', zh: '蜘蛛' },
        { en: 'vampire', zh: '吸血鬼' },
        { en: 'witch', zh: '女巫' }
      ] }
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
    almost: ['好可惜,差一點點!', '再練習一下,明天一定行!'],
    // v4 電子雞化:收穫(過關食物進背包)
    harvest: ['哇!好多好吃的,先收起來~', '收穫滿滿!回家再慢慢吃', '謝謝主人!我把點心收進背包囉'],
    harvestDeluxe: ['豪華大豐收!背包裝得滿滿的~', '哇——這麼多!我們發財了主人!']
  },
  // v4 電子雞化:房間互動的話
  // v4 電子雞化:房間互動的話
  // ⚠ 泡泡(art.js bubble)是單行不換行,台詞請控制在 16 字以內,最長不超過 20 字。
  talkCare: {
    feedStart: ['開動囉~', '看起來好好吃!', '啊姆啊姆~', '哇~我最愛吃飯了!', '聞起來好香喔!',
      '我開動囉,你看我!', '這個我等好久了~', '嘿嘿,先聞一下下'],
    feedDone: ['好好吃,謝謝主人!', '嗝~好滿足!', '肚子暖暖的,最喜歡主人了!', '再吃一個也可以喔?',
      '這個我要記住!', '主人挑東西好厲害~', '下次還要吃這個!', '我的肚子在唱歌耶', '吃飽飽,力氣變大了!'],
    playStart: ['耶!來玩吧!', '這個我最喜歡了!', '一起玩~', '準備好了嗎?', '這個我玩過!',
      '看我的厲害!', '我要開始囉!'],
    playDone: ['好好玩!玩具先休息囉~', '呼~玩得好開心!', '謝謝主人陪我玩!', '好累~但好開心!',
      '下次還要玩喔!', '我們是最強搭檔!', '我剛剛跳得好高對不對?'],
    grow: ['我長大了!謝謝主人把我養得這麼好!', '登登——我升級了!'],
    noFood: ['背包裡沒有食物了,去數學餐廳解題就能賺到喔!'],
    noToy: ['玩具箱空空的,去英文遊戲間過關就能拿玩具喔!'],
    // v5:吃完的隨機小反應(對應 room.js 的 reaction 種類)
    burp: ['嗝~好滿足!', '嗝!吃得好飽~'],
    spin: ['開心到轉圈圈~', '耶——轉圈圈!'],
    hops: ['太好吃了,忍不住跳起來!', '蹦蹦蹦~好開心!'],
    star: ['哇!吃出一顆小星星!成長 +1!', '亮晶晶!是幸運星耶!成長 +1!'],
    // v7:金色食物(開吃時說,成長值 ×2)
    goldFood: ['哇!金色的耶,亮晶晶!', '是金色食物!感覺會長超快!', '閃閃發光~我要開動囉!'],
    // v5:今天還沒被照顧的撒嬌(不催促、不負面)
    hungryNag: ['我肚子有點餓了~', '今天還沒吃東西呢…', '好想吃點心喔~'],
    playNag: ['陪我玩一下好不好?', '玩具箱在等我們喔~'],
    // v5:許願
    wish: ['我今天好想吃'],                        // + 食物名(泡泡裡直接畫食物圖)
    wishGranted: ['就是這個!是我許願的!成長加倍!', '願望成真了!謝謝主人!超級好吃!'],
    // 雙寵物互訪(另一隻寵物來作客;{name} 會被換成訪客名字)
    visitArrive: ['叩叩叩~我來作客囉!', '嗨嗨!我來找你玩~'],
    visitHost: ['耶!{name}來了!', '{name}來玩,好開心!'],
    visitEat: ['看起來好好吃,我也要吃一口~', '一起吃點心囉!'],
    visitThanks: ['謝謝招待,好好吃~', '跟你們一起吃最幸福了!'],
    visitPat: ['嘿嘿,你好呀~', '我也好喜歡摸摸!'],
    visitLeave: ['我要回家囉,下次見~', '今天玩得好開心,掰掰!'],

    // ── v13:聊天系統 ──────────────────────────────────
    // 進房打招呼(room.js enter() 挑一句;久沒來優先用 greetBack,其餘依時段)
    greet: ['你來啦!我等你好久~', '主人~今天過得好嗎?', '嘿嘿,我聞到你的味道了!',
      '我一直在看門口耶~', '你來了,我好開心!', '嗨嗨!我在這裡!'],
    greetMorning: ['早安~我剛剛還在睡耶', '早安!今天想做什麼?', '早上的太陽好舒服喔'],
    greetNoon: ['午安!你吃飽了嗎?', '下午好~陽光暖暖的', '午安~我剛剛在曬太陽'],
    greetEvening: ['晚上好~我在等你回來', '今天的星星好亮喔', '睡覺前再陪我一下下~'],
    greetBack: ['好久不見~我有乖乖等你喔', '你回來了!我剛剛在數雲朵',
      '我把最好的位子留給你了!', '你回來了~我好想你'],

    // 閒聊(閒置時每 12~20 秒隨機一句;純陳述,不等回答)
    chatIdle: ['今天的雲長得像棉花糖', '窗外有小鳥飛過去了!', '我剛剛好像聽到什麼聲音…',
      '你有沒有覺得今天香香的?', '我發現地上有一根我的毛…', '這裡的陽光剛剛好耶',
      '今天心情亮晶晶的!', '跟你在一起最開心了', '我剛剛做了一個好長的夢',
      '我夢到我變成一朵雲', '我有點想睡…但我想陪你', '我今天覺得自己變勇敢了!',
      '可以再摸摸我嗎?', '我可以靠著你一下下嗎?', '你不要走太遠喔',
      '你在的時候房間都變亮了', '你知道嗎?我打噴嚏會轉圈!', '我可以看你看很久很久',
      '我剛剛偷偷練習跳高', '我的耳朵今天特別靈!', '我把最好吃的留到最後才吃',
      '我剛剛數了地板的格子', '你今天看起來特別好看耶'],

    // 會等主人回答的話(泡泡下方浮出選項鈕,點了寵物再回一句)
    chatAsk: [
      { q: '你今天過得好嗎?', a: [
        { label: '😄 超開心', r: '耶!那我也超開心~' },
        { label: '😪 有點累', r: '那我陪你休息一下下' },
        { label: '😐 普普通通', r: '那我們做點好玩的事!' } ] },
      { q: '你最喜歡我哪裡?', a: [
        { label: '👂 耳朵', r: '嘿嘿,我每天都有洗喔' },
        { label: '🥰 很可愛', r: '你才可愛啦!' },
        { label: '💯 全部', r: '哇……我要感動哭了' } ] },
      { q: '你想不想聽我的夢?', a: [
        { label: '想聽!', r: '我夢到我們飛到雲上吃棉花糖' },
        { label: '等一下', r: '好~我先記著,不會忘記' } ] },
      { q: '你今天在學校開心嗎?', a: [
        { label: '很開心!', r: '太好了!說給我聽好不好~' },
        { label: '還好耶', r: '沒關係,回家有我陪你' } ] },
      { q: '你會不會怕黑?', a: [
        { label: '會一點點', r: '那我晚上陪你,不要怕' },
        { label: '不會!', r: '哇,你好勇敢!我要學你' } ] },
      { q: '如果我會飛,你想去哪?', a: [
        { label: '☁️ 雲上面', r: '好!我們去雲上面滾一滾' },
        { label: '🌊 海邊', r: '海邊耶!我要撿貝殼給你' },
        { label: '🏠 待家裡', r: '嘿嘿,我也覺得家裡最好' } ] },
      { q: '你有沒有偷偷想我?', a: [
        { label: '有啊!', r: '嘿嘿……我也一直在想你' },
        { label: '祕密~', r: '好吧,那我自己偷偷想你' } ] },
      { q: '等一下要做什麼呢?', a: [
        { label: '🍚 餵你吃飯', r: '耶!我肚子剛好在叫' },
        { label: '🧸 陪你玩', r: '好耶!我去把玩具搬出來' },
        { label: '💤 休息一下', r: '好~我們一起發呆' } ] },
      { q: '我今天乖不乖?', a: [
        { label: '超乖的!', r: '嘿嘿,我有努力當好孩子' },
        { label: '有一點皮', r: '被發現了……我下次改進!' } ] },
      { q: '你喜歡什麼顏色?', a: [
        { label: '🔵 藍色', r: '藍色像天空,好漂亮!' },
        { label: '🩷 粉紅色', r: '粉紅色!跟我的鼻子一樣~' },
        { label: '🟡 黃色', r: '黃色暖暖的,像小太陽!' } ] }
    ],

    // 記憶台詞(寵物記得發生過的事;{who}/{item}/{name} 由 room.js 代換)
    // key 對應 store.js 的 memo 事件 kind,見 docs/pet-chat-design.md
    memo: {
      visitOut: ['上次我們去{who}家,好好玩!', '{who}家好漂亮,你記得嗎?',
        '我還想再去找{who}玩~', '去{who}家那天我好開心'],
      visitOutGift: ['我送{who}{item},他超開心!', '送{who}{item},我好得意~'],
      visitIn: ['{who}上次來我們家耶!', '{who}什麼時候會再來呀?',
        '我有點想{who}了…', '上次{who}來,好熱鬧喔'],
      visitInAte: ['我跟{who}一起吃點心,好幸福~', '{who}上次跟我搶點心,好好笑'],
      giftGot: ['{who}偷偷留了{item}給我!', '我把{who}送的收好了,捨不得吃', '{who}對我好好喔~'],
      clear: ['你上次{name}全對耶!好厲害!', '{name}那關你好快,我看呆了',
        '我還想看你解{name}!', '你{name}破關的時候好帥'],
      clearAsk: ['要不要再去{name}玩一次?', '我們再去{name}一次好不好?', '好想再看你解{name}一次!'],
      // clearAsk 的回答選項:選「走!」直接跳進那一關(room.js memoLine 組裝)
      clearGoLabel: '🚀 走!',
      clearLaterLabel: '待會兒',
      clearLaterReply: ['好~我等你準備好', '沒關係,我先自己玩一下', '那我等你喔!'],
      favFood: ['我最喜歡{item}了,你記得嗎?', '想到{item}我就流口水…', '{item}是我心中第一名!'],
      goldFood: ['上次那個金色的{item},好懷念…', '金色的{item}真的好好吃!'],
      grow: ['我好像又長大一點點對不對?', '我長大那天你有拍手耶!', '我會越來越大隻喔~'],
      newDeco: ['你看我這個,長大那天拿到的!', '我的新造型好看嗎?'],
      hwRound: ['你把 A 到 Z 都寫完了!超厲害', '你寫的字好漂亮喔~'],
      redeem: ['你上次換了{item},開心嗎?', '{item}是你自己賺來的耶!'],
      graduate: ['{name}以前也住這裡喔', '{name}現在在珍藏館,過得很好', '我聽過{name}的故事!']
    },

    // 讀存檔「現況」的話(不是事件記憶,是此刻的狀態;{n} 代換數字)
    state: {
      points: ['我們已經存了{n}個金幣了!', '{n}個金幣耶,好厲害~'],
      dexFoods: ['我吃過{n}種東西了耶!', '圖鑑上有{n}種食物了~'],
      stageBaby: ['我還小小的,你要牽我喔', '我會慢慢長大,你等我~'],
      stageKid: ['我好像變重了一點點?', '我快要變成大寶了!'],
      stageGrown: ['我現在可以保護你了!', '長大以後還是最喜歡你']
    }
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
