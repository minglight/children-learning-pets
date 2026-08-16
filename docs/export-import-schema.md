# 匯出 / 匯入 JSON Schema 說明書

> 本檔是「家長備份檔（export/import）」的權威規格。
> **每次更新功能、只要動到儲存或匯出結構,就一定要更新本檔，並把 `version` +1。**
> 相關程式:`app/store.js`(`exportAll` / `importAll` / `migratePet`)、UI 在 `index.html`。

---

## 目前版本:`version = 12`（v12 難易度分級獎勵:過關次數上限依入門/進階分層,新增 advancedFrom;v11 好友雲端同步:小朋友暱稱進正式 schema;v10 配件可收集/換裝;v9 以小孩為存檔單位:選寵物 → 養大 → 畢業珍藏）

### 為什麼需要這份規格
本 App 是純前端單機程式,進度只存在瀏覽器 `localStorage`(cache),**隨時可能被瀏覽器清除**。
家長唯一的備份方式是「匯出進度」下載 JSON 檔,日後用「匯入進度」還原。
因此**新版程式必須永遠能匯入舊版的備份檔**(向後相容),不可因缺欄位而崩潰或清空進度。

### 頂層結構
```jsonc
{
  "app": "pls",                       // 固定字串;不是 "pls" 一律拒絕匯入
  "version": 12,                      // schema 版本(= store.js 的 SCHEMA_VERSION)
  "exportedAt": "2026-06-18T08:00:00.000Z", // ISO 時間,僅供參考
  "kidL": { /* 左邊小孩的進度,見下 */ },   // v9:存檔以小孩為單位(取代 rabbit)
  "kidR": { /* 右邊小孩的進度,見下 */ },   // v9:存檔以小孩為單位(取代 hamster)
  "prizes": [                         // v2:獎品目錄(全域,兩個小孩共用;家長在家長區編輯)
    { "id": "z8a3k1", "name": "看 30 分鐘卡通", "cost": 10 }
  ],
  "rewardsHidden": false              // v2:是否隱藏整個積分 / 獎品功能(全域)
}
```

| 欄位 | 型別 | 說明 |
|---|---|---|
| `app` | string | 必須為 `"pls"`,辨識備份檔 |
| `version` | number | schema 版本號 |
| `exportedAt` | string (ISO) | 匯出時間戳 |
| `kidL` / `kidR` | object | **v9**:左 / 右兩個小孩各自的進度(結構相同) |
| `rabbit` / `hamster` | object | **v8 以前**的舊欄位;匯入時 `rabbit → kidL`、`hamster → kidR`(兔兔→左、倉倉→右),`pet` 欄位轉成 `species` |
| `prizes` | array | **v2**:獎品目錄(全域)。每項 `{ id, name, cost }`;舊檔沒有此欄位時略過 |
| `rewardsHidden` | boolean | **v2**:隱藏積分 / 獎品功能(全域);舊檔沒有時略過 |

### 單一小孩資料結構（`kidL` / `kidR`）
> v9 前是「單一寵物」結構(鍵為 `rabbit`/`hamster`),v9 起是「單一小孩」:多了 `slot`/`species`/`collection`,寵物養大畢業後 `species` 會清空待重選,但金幣 / 圖鑑 / 背包 / 關卡紀錄留給小孩。
```jsonc
{
  "_v": 2,                    // schema 版本戳記(由 save() 寫入,migratePet() 用來判斷升級)
  "slot": "kidL",             // v9:儲存分割 = 小孩("kidL" | "kidR")
  "species": "elephant",      // v9:目前在養的物種(8 種之一;null = 尚未選 / 畢業後待重選)
  "collection": [             // v9:已畢業大寶清單(本小孩專屬,只增不減);deco 可在珍藏館換成已收集的款式(v10)
    { "species": "rabbit", "deco": 0, "name": "兔兔", "date": "2026-7-5" }
  ],
  "decoDex": {                // v10:配件圖鑑 {species:[5 bool]};養大寶抽到哪款就解鎖,珍藏館換裝只能用已解鎖的(本小孩獨立)
    "rabbit": [true, false, false, true, false],
    "tabby":  [true, true, false, false, false]
  },
  "pet": "elephant",          // 相容舊欄位:save() 會同步成 = species(舊讀者用)
  "name": null,               // 自訂暱稱;null = 用預設名
  "childNickname": null,      // v11:小朋友暱稱(好友辨識用身份錨點,獨立於寵物名字/種類;slot 不變就不變,不受換寵物/畢業影響)
  "giftsGiven": 0,            // v11:拜訪好友時分享食物/玩具的次數(小統計,不影響經驗值/點數)
  "advancedFrom": "m8",       // v12:這個小孩「進階關卡」從第幾關(id)開始算(家長區可個別調整;預設 'm8')
  "points": 12,               // v2:可兌換獎品的積分(本小孩獨立,畢業不歸零)
  "hwEarned": 8,              // v2:字母手寫練習累計已給的積分(上限 100)
  "hwRound": ["A", "b"],      // v3:本輪已描完的字母(大小寫各自獨立);描滿 52 個(A–Z+a–z)才 +1 分後清空
  "inv": {                    // v4:背包(過關賺到、餵食/陪玩消耗;key -> 數量,0 會直接刪 key)
    "foods": { "sushi": 3, "boba": 1 },
    "toys":  { "doll": 2 },
    "gold":  { "sushi": 1 }   // v7:金色食物(與 foods 同 key 空間、獨立計數;餵食成長值 ×2)
  },
  "growth": { "xp": 42, "deco": null, "grownAt": null },  // v4:成長值。v8:deco=升大寶隨機配件 index(0-4)。v9:grownAt=升大寶日期(滿 3 天可畢業;未到大寶為 null)
  "care": {                   // v4:今日照顧計數(跨日歸零)。v8:新增 xpToday=今日已累積成長值(平板時間煞車用)
    "date": "2026-7-6", "fed": 1, "played": 0, "xpToday": 8
  },
  "wish": {                   // v5:今日許願(null = 尚未產生;跨日由 getWish() 重新抽)
    "key": "sushi", "date": "2026-7-8", "done": false
  },
  "dex": {                    // v5:收集圖鑑(吃過的食物 / 玩過的玩具 key;只增不減)
    "foods": ["apple", "sushi"], "toys": ["doll"]
  },
  "levels": {                 // 關卡進度:levelId -> 紀錄
    "e2": {
      "attempts": 30,         // 累計作答題數
      "bestRate": 1,          // 最佳一次答對率(0~1)
      "cleared": true,        // 是否曾通關(≥ passRate)
      "plays": 4,             // 總遊玩次數
      "clears": 4,            // 通關次數(滿 deluxeAt 次送豪華版獎勵)
      "lastClearDate": "2026-6-18" // 最後一次正式通關日期(每關每天只能正式解一次)
    }
  },
  "daily": {                  // 每日作答計數(跨日自動歸零)
    "date": "2026-6-18",      // 注意:格式為 YYYY-M-D(月/日不補零),見 store.today()
    "math": 2,
    "english": 1,
    "hw": 1                   // v2:今日字母手寫練習已給分的「輪數」(每天上限 3;一輪 = 52 個字母)
  },
  "home": {                   // v6 起不再使用(佈置功能移除);欄位保留為空格結構以相容舊備份檔
    "foods": [ { "key": null, "deluxe": false, "date": null }, /* 共 3 格,v6 起永遠為空 */ ],
    "toys":  [ { "key": null, "deluxe": false, "date": null }, /* 共 3 格,v6 起永遠為空 */ ]
  }
}
```

**展示格(slot)欄位**:`key`(寶物 id,null=空格)、`deluxe`(是否豪華版)、`date`(最後更換日期)。
**注意**:v6 起 `home` 欄位不再使用(佈置/換擺設功能已移除)。欄位結構保留以相容舊版備份檔匯入;migration 會把舊檔 `home` 各格的 key 轉進 `inv` 背包(deluxe 格算 2 份)後清空格子。

---

## 版本與相容性原則

1. **只增不改**:盡量只「新增」欄位;避免改名/刪除。新增欄位要在 `migratePet()` 補安全預設值。
2. **migratePet 是唯一入口**:`load()`(讀本機 cache)與 `importAll()`(讀備份檔)都會把資料丟進 `migratePet()` 正規化。
   舊版資料(甚至沒有 `_v` / `version`)都能被補齊後正常使用;升級階梯寫在 `migratePet()` 內的 `if (from < N)` 區塊。
3. **較新版本的檔案**:`importAll` 採「盡力匯入已知欄位」,不直接拒絕(避免家長換裝置時匯不進)。
4. **每加一個會影響存檔的功能**:`SCHEMA_VERSION` +1 → 在 `migratePet()` 加對應升級 → 更新本檔的「版本歷史」與結構說明。

## 每次改動後的驗證清單（務必執行）
- [ ] 用**前一版本**匯出的 JSON 檔,在本版執行「匯入進度」→ 成功,且進度/展示/關卡正確。
- [ ] 用**沒有新欄位**的舊檔匯入 → 新欄位被補上預設值,App 不崩潰。
- [ ] 用**本版**匯出 → 再匯入回來 → 資料一致(round-trip)。
- [ ] 若改動的檔案在 `sw.js` 的 `ASSETS` 內 → 已把 `sw.js` 的 `VERSION` +1。

---

## 版本歷史

### v1（初版,2026-06）
- 頂層:`app` / `version` / `exportedAt` / `rabbit` / `hamster`。
- 寵物:`pet` / `name` / `levels` / `daily` / `home(foods[3], toys[3])`。
- `migratePet()` 已向後相容更早期、無版本號的 `home` 格式(`{item,type,date}`、`{food,toy}`)與缺少 `clears` 的舊 `levels`。

### v2（2026-06,新增「積分 / 獎品商店」)
- **寵物**新增:`points`(可兌換積分,預設 0)、`hwEarned`(手寫練習累計給分,預設 0);`daily` 新增 `hw`(今日手寫輪數,預設 0)。
- **頂層**新增(全域,非分寵物):`prizes`(獎品目錄 `[{id,name,cost}]`)、`rewardsHidden`(布林)。
- 給分規則:數學 / 英文每關過關 +1 分(同一關第 1~10 次給分,第 11 次起不給);字母手寫練習每天最多 3 輪、累計上限 100 分。
- `migratePet()` 對舊檔自動補 `points=0`、`hwEarned=0`、`daily.hw=0`,不影響既有進度。
- `importAll()`:`prizes` 是陣列才覆寫、`rewardsHidden` 是布林才覆寫;舊檔(v1,無此兩欄)直接略過、保留現有設定。

### v3（2026-06,手寫改為「描滿一輪才給分」)
- **寵物**新增:`hwRound`(陣列,預設 `[]`)— 本輪已描完的字母清單(大小寫各自獨立)。
- 給分規則變更:字母手寫練習由「描一個字母 +1 分」改為「**描滿一整輪**(A–Z 大寫 + a–z 小寫,共 52 個)才 +1 分」;每天仍最多 3 輪、累計上限 100 分。描滿一輪後 `hwRound` 清空、`daily.hw`+1、`hwEarned`+1、`points`+1(規則在 `store.submitHwLetter()`,沿用 `awardHandwriting()` 的每日 / 上限判斷)。
- `migratePet()` 對舊檔自動補 `hwRound=[]`,不影響既有進度;舊版備份檔(無此欄位)匯入後從空的一輪開始。
- `hwRound` 跨日**不**歸零(一輪可橫跨多天慢慢描);只有 `daily` 跨日歸零。

### v4（2026-07,電子雞化:背包 / 成長 / 照顧)
- **寵物**新增:
  - `inv`(物件 `{foods:{key:數量}, toys:{key:數量}}`,預設空)— 背包。數學過關 → 該關 feast 食物進 `foods`(一般 5 份、豪華 7 份);英文過關 → 玩具進 `toys`(豪華 ×2)。在房間餵食/陪玩會消耗(數量歸 0 直接刪 key)。
  - `growth`(物件 `{xp}`,預設 0)— 成長值。餵食 +2、陪玩 +3,每天第一次各多 +1。階段:xp<30 幼幼、<100 小寶、≥100 大寶(門檻在 `store.js` 的 `GROW`)。
  - `care`(物件 `{date, fed, played}`)— 今日照顧計數,跨日歸零(load 時處理),只用於「每日首次加成」判斷。
- **migratePet 對舊檔**:補空 `inv`、`care`;`growth.xp` 用「既有各關 clears 總和 × 2、封頂 99(小寶)」換算,老玩家升級後不會從幼幼重養。
- 相關 API:`addFoods / addToy / feed / playToy / invList / invTotal / stageOf / growthInfo`(見 `store.js`)。
- 匯出/匯入沿用整包寵物物件,無需另外處理;v3(含更舊)備份檔匯入後自動補齊。

### v5（2026-07,許願 / 收集圖鑑)
- **寵物**新增:
  - `wish`(`null` 或 `{key, date, done}`)— 寵物今日想吃的食物,由 `store.getWish()` 產生(跨日重抽;池子 = 前三關 + 已解過關卡的 feast 食物,確保拿得到)。餵中願望食物 → 該次餵食基礎成長值 ×2、`done=true`。
  - `dex`(`{foods:[key], toys:[key]}`,預設空)— 收集圖鑑;`feed()`/`playToy()` 自動點亮,只增不減。圖鑑畫面在 `app/dex.js`(房間點掛畫進入)。
- 其他新 API:`bonusXp(d, n)`(吃出幸運星等額外成長,約 1/8 機率在 room.js 觸發)。
- `migratePet()` 對舊檔補 `wish=null`、`dex={foods:[],toys:[]}`;v4(含更舊)備份檔匯入自動補齊。

### v6（2026-07,移除佈置/換擺設功能)
- **佈置功能移除**:`home` 欄位保留為空格結構(向後相容舊備份檔),但 v6 起 App 不再讀取或寫入任何展示格。
- **migration**:對 `_v < 6` 的舊資料,把 `home.foods` / `home.toys` 各格有 key 的項目轉進 `inv.foods` / `inv.toys` 背包(deluxe 格 +2 份、一般格 +1 份),轉完後將各格清空(`key=null, deluxe=false, date=null`)。
- **GROW 加重**:`FEED_XP` 2→4、`PLAY_XP` 3→6、`DAILY_BONUS` 1→2(食物變稀有,單次餵食/陪玩成長值加倍)。
- 相容性:v5(含更舊)備份檔匯入後自動執行上述 migration,進度不遺失;已清空的 home 欄位作為保留結構但不顯示。

### v7（2026-07,神秘金色食物)
- **寵物**新增:`inv.gold`(物件 `{key:數量}`,預設空)— 金色食物庫存,與 `inv.foods` 同 key 空間但獨立計數。
- 取得:數學過關時 **1/10 機率**整份食物獎勵變金色(`quiz.js advance()` 擲骰,`addFoods(d, keys, gold)` 收進 `inv.gold`);豐收畫面以金色渲染 + 「金色食物!」徽章。
- 消耗:房間食物托盤中金色食物排在一般食物後(金框格子),餵食走 `feed(d, key, gold=true)` → 基礎成長值 **×2**(與許願命中的 ×2 **可疊加**,即 ×4);圖鑑點亮同一個基礎 key,不另設金色圖鑑。
- `migratePet()` 對舊檔補 `inv.gold = {}`;v6(含更舊)備份檔匯入自動補齊,進度不受影響。

### v8（2026-07,成長節奏:每日成長上限 + 大寶隨機配件 + 備用物種)
- **寵物**新增:
  - `growth.deco`(number 或 null)— 升上大寶那一刻隨機抽的配件 index(0-4),固定戴到畢業;未到大寶為 null。每個物種各有 5 款配件(繪製在 `pets.js`)。
  - `care.xpToday`(number,預設 0,跨日歸零)— 今日已累積的成長值。
- **成長節奏**:`GROW` 新增 `DAILY_XP_CAP`(預設 15)= 每日成長值上限(平板時間煞車)。`gainXp()` 超過上限就不再加 xp(但餵食/陪玩的動畫、圖鑑點亮、積分照常);測試模式(`pls.testMode`)不受限。100xp ÷ 15 ≈ 7 天,最快一週長大。
- **備用物種**(`config.js` 的 `pets` 新增 `tabby`/`meerkat`/`capybara`/`husky`/`elephant`/`xmascat`)— 純繪製與主題色,不影響存檔結構;每個物種都吃 `growth.deco` 決定大寶配件。
- **migratePet 對舊檔**:補 `care.xpToday = 0`;`growth.deco` — 已是大寶(xp≥100)的舊資料補 0(第一款),否則 null。v7(含更舊)備份檔匯入自動補齊,進度不受影響。

### v9（2026-07,存檔改「以小孩為單位」+ 成長生命週期 + 珍藏館)
- **儲存分割改變**:localStorage 鍵從「以物種為單位」(`pls.rabbit`/`pls.hamster`)改成「以小孩為單位」(`pls.kidL`/`pls.kidR`)。匯出頂層 `rabbit`/`hamster` → `kidL`/`kidR`。
  - **搬遷**:首次讀取 `kidL`/`kidR` 若無資料,自動把舊的 `pls.rabbit → kidL`、`pls.hamster → kidR`(兔兔→左、倉倉→右),舊鍵保留當備份不刪。
  - **舊匯出檔**:`importAll` 仍接受舊檔的 `rabbit`/`hamster`,對應到 `kidL`/`kidR`;`migratePet` 把舊 `pet`(物種)轉成 `species`。
- **小孩**新增欄位:
  - `slot`(string)— `"kidL"` | `"kidR"`,儲存分割 id。
  - `species`(string 或 null)— 目前在養的物種(8 種之一);`null` = 尚未選 / 畢業後待重選(進 `pickpet` 畫面挑)。
  - `collection`(array)— 已畢業大寶清單,每項 `{ species, deco, name, date }`,本小孩專屬、只增不減。
  - `growth.grownAt`(string 或 null)— 升上大寶的日期(`YYYY-M-D`);大寶滿 `GRADUATE_DAYS`(3)天可畢業(測試模式即可)。
  - `pet`(舊欄位)由 `save()` 同步為 `= species`,供舊讀者相容。
- **生命週期**:`chooseSpecies(slot, species)` 從幼幼開始養(只重置 `species`/`growth`/`care`/`wish`,**保留** `points`/`prizes`/`dex`/`inv`/`levels`/`collection`);`graduate(slot)` 把 `{species,deco,name,date}` 推進 `collection`、`species` 清為 null;`canGraduate`/`graduateInfo` 判斷 3 天門檻。
- **英文玩具改全物種共用**:`config.js` 每個英文關卡新增 `toyU`(名稱)/ `toyArtU`(玩具 art key);獎勵與圖鑑改用共用玩具,不再分寵物(舊 `toy`/`toyArt` 的 rabbit/hamster 欄位保留,只為顯示舊背包既有玩具名稱)。**不影響存檔結構**。
- **新畫面**:`pickpet`(8 種選寵)、`graduate`(畢業慶祝)、`museum`(寵物珍藏館,左右兩小孩各自收藏)— 皆在 `app/lifecycle.js`。
- **migratePet 對舊檔**:補 `slot`;`species` 從舊 `pet` 推得(對不到已知物種則用預設 rabbit/hamster);補 `collection = []`;`growth.grownAt` — 已是大寶的舊資料用「今天」起算(公平),否則 null。v8(含更舊)備份檔匯入自動補齊,進度不受影響。

### v10（2026-07,配件可收集 / 珍藏館換裝)
- **小孩**新增欄位:
  - `decoDex`(object)— 配件圖鑑 `{ species: [5 個 bool] }`。每物種 5 款大寶配件,養大寶時抽到的那款會被標記為「已收集」(`true`);珍藏館換裝只能換成已收集的款式。本小孩獨立、只增不減。
- **收集/換裝規則**:
  - 升上大寶隨機抽 `growth.deco`(0-4)時,同步 `markDeco()` 解鎖 `decoDex[species][deco]`。
  - `setCollectionDeco(slot, index, decoIdx)` 換「已畢業珍藏大寶」的配件、`setCurrentDeco(slot, decoIdx)` 換「正在養大寶」的配件;兩者都只接受**已收集**的款式(`ownsDeco` 檢查),否則回 `false` 不動資料。
  - 相關 API:`decoOwned` / `ownsDeco` / `setCollectionDeco` / `setCurrentDeco` / 常數 `DECO_N`(=5)。
- **兔兔 / 倉倉補齊配件**:原本這兩隻只有 1 款大寶配件、且不吃 `growth.deco`;v10 各補到 **5 款**(`rabbitDeco` / `hamsterDeco` in `pets.js`,idx0 維持原本外觀相容舊大寶),8 種物種一致皆 5 款。
- **新畫面**:`dressup`(換裝,從珍藏館點寵物進入)— 在 `app/lifecycle.js`;珍藏館縮圖改為可點按鈕。
- **migratePet 對舊檔**:補 `decoDex = {}`;並把「目前大寶戴的配件」與「已畢業 collection 各項的配件」自動標記為已收集(idempotent,不會因升級而遺失已擁有的配件)。v9(含更舊)備份檔匯入自動補齊,進度不受影響。

### v11（2026-08,好友雲端同步 / 自動備份 — 選用附加功能)
- **小孩**新增欄位:
  - `childNickname`(string 或 null)— 好友辨識用暱稱(例如「小明」),身份錨點是**小孩(slot)**,不是寵物名字或物種:換寵物、畢業重選都不會變,好友還是認得同一個暱稱。未設定時為 `null`,好友功能會提示先請家長到家長區設定。
  - `giftsGiven`(number,預設 0)— 拜訪好友時分享食物/玩具的累計次數,純小統計,**不影響**經驗值/點數/背包。
- **本機以外的雲端資料**(選用,`app/cloud.js` + `firestore.rules`):Firestore 的 `players/{playerId}` 存一份唯讀快照(`species`/`childNickname`/`petName`/`friendCode`/`status`),供好友拜訪時顯示;**不是**本機 schema 的一部分,不進 export/import 檔,裝置本身沒網路/沒設定 `CFG.firebase` 完全不影響本機遊戲(fail-soft)。詳細集合結構見 `docs/cloud-friends-schema.md`。
- **不影響匯出/匯入邊界**:雲端功能全部透過 `slot`(`kidL`/`kidR`)存取本機資料,不新增任何本機儲存鍵、不改變既有欄位語意。
- `migratePet()` 對舊檔補 `childNickname = null`、`giftsGiven = 0`;v10(含更舊)備份檔匯入自動補齊,進度不受影響。

### v12（2026-08,難易度分級獎勵)
- **小孩**新增欄位:
  - `advancedFrom`(string,預設 `"m8"`)— 這個小孩「進階關卡」從 `config.js` `math` 陣列的哪一關(id)開始算;家長區可依小孩程度個別調整(左右小孩各自獨立)。
- **過關次數上限改分層**:同一關過關次數超過門檻就不再給點數/食物(仍可繼續玩、仍算過關)。門檻依關卡屬於「入門」(`advancedFrom` 之前)還是「進階」(`advancedFrom` 含之後)分兩組,各自預設 3 次 / 10 次,兩組門檻**全域共用**(不分小孩)、家長區可調,存在 `localStorage` 的 `pls.clearCapBasic` / `pls.clearCapAdvanced`(不進 export/import 檔,比照 `pls.dailyLimit`)。
  - 舊版只擋點數(硬寫死「過 10 次不再給點數」)、食物無上限;v12 起**同一個門檻同時擋點數與食物**。
  - 相關 API:`getClearCapBasic`/`setClearCapBasic`、`getClearCapAdvanced`/`setClearCapAdvanced`、`getAdvancedFrom`/`setAdvancedFrom`、`levelTier`、`clearCapFor`(見 `store.js`)。此變更只影響 `subject === 'math'` 的 `recordRun()`;英文關卡維持舊版「過 10 次不再給點數」規則不變。
- **`config.js` 的 `u6`–`u9` 取消 `alwaysOpen`**,恢復序列鎖(原本是期末考暫時開放),跟其他關卡一起照順序解鎖——不是存檔結構變更,但會影響「目前破到第幾關」的計算(見下一點)。
- **好友拜訪新增「獎盃」**(選用附加功能,見 `docs/cloud-friends-schema.md`):`app/cloud.js` 的 Firestore `status` 快照新增 `trophy` 欄位(數字,= 目前破到第幾關,由 `store.trophyNumber()` 計算),自己房間與好友拜訪畫面顯示同一個徽章。**不是**本機 schema 的一部分,不進 export/import 檔。
- `migratePet()` 對舊檔補 `advancedFrom = 'm8'`;v11(含更舊)備份檔匯入自動補齊,進度不受影響。
