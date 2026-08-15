# 匯出 / 匯入 JSON Schema 說明書

> 本檔是「家長備份檔（export/import）」的權威規格。
> **每次更新功能、只要動到儲存或匯出結構,就一定要更新本檔，並把 `version` +1。**
> 相關程式:`app/store.js`(`exportAll` / `importAll` / `migratePet`)、UI 在 `index.html`。

---

## 目前版本:`version = 4`（v4 小朋友暱稱進正式 schema)

### 為什麼需要這份規格
本 App 是純前端單機程式,進度只存在瀏覽器 `localStorage`(cache),**隨時可能被瀏覽器清除**。
家長唯一的備份方式是「匯出進度」下載 JSON 檔,日後用「匯入進度」還原。
因此**新版程式必須永遠能匯入舊版的備份檔**(向後相容),不可因缺欄位而崩潰或清空進度。

### 頂層結構
```jsonc
{
  "app": "pls",                       // 固定字串;不是 "pls" 一律拒絕匯入
  "version": 3,                       // schema 版本(= store.js 的 SCHEMA_VERSION)
  "exportedAt": "2026-06-18T08:00:00.000Z", // ISO 時間,僅供參考
  "rabbit": { /* 寵物資料,見下 */ },
  "hamster": { /* 寵物資料,見下 */ },
  "prizes": [                         // v2:獎品目錄(全域,兩隻寵物共用;家長在家長區編輯)
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
| `rabbit` / `hamster` | object | 兩隻寵物各自的進度(結構相同) |
| `prizes` | array | **v2**:獎品目錄(全域)。每項 `{ id, name, cost }`;舊檔沒有此欄位時略過 |
| `rewardsHidden` | boolean | **v2**:隱藏積分 / 獎品功能(全域);舊檔沒有時略過 |

### 單一寵物資料結構（`rabbit` / `hamster`）
```jsonc
{
  "_v": 4,                    // schema 版本戳記(由 save() 寫入,migratePet() 用來判斷升級)
  "pet": "rabbit",            // 寵物 id:"rabbit" | "hamster"
  "name": null,               // 寵物自訂暱稱;null = 用預設名
  "childNickname": null,      // v4:小朋友暱稱(身份錨點,獨立於寵物名字/種類);null = 尚未設定
  "giftsGiven": 0,            // v4:拜訪好友時分享食物/玩具給對方的次數(小統計,不影響經驗值/點數)
  "points": 12,               // v2:可兌換獎品的積分(本寵物獨立)
  "hwEarned": 8,              // v2:字母手寫練習累計已給的積分(上限 100)
  "hwRound": ["A", "b"],      // v3:本輪已描完的字母(大小寫各自獨立);描滿 52 個(A–Z+a–z)才 +1 分後清空
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
  "home": {                   // 家裡展示:食物 3 格 + 玩具 3 格,各格每天可換一次
    "foods": [ { "key": null, "deluxe": false, "date": null }, /* 共 3 格 */ ],
    "toys":  [ { "key": null, "deluxe": false, "date": null }, /* 共 3 格 */ ]
  }
}
```

**展示格(slot)欄位**:`key`(寶物 id,null=空格)、`deluxe`(是否豪華版)、`date`(最後更換日期,用來限制每天一次)。

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

### v4（2026-08,小朋友暱稱進正式 schema)
- **背景**:小朋友暱稱原本只存在 `app/cloud.js` 額外維護的 `localStorage['pls.cloud.<petId>']` 快取裡,
  **不是**本機 schema 的一部分,也**不進**匯出檔 —— 這是為什麼換裝置用「匯入進度」或「還原碼」救回進度後,
  暱稱會不見、家長要重新輸入。更深一層的問題是:雲端好友/備份/還原原本用「寵物種類(兔兔/倉鼠)」當識別單位,
  但寵物名字、小朋友暱稱都可以改,寵物種類本質上也不該被當成身份錨點——正確的階層應該是「小朋友 → 目前寵物」。
- **寵物**新增:`childNickname`(字串或 `null`,身份錨點,預設 `null`)、`giftsGiven`(數字,拜訪好友分享次數小統計,預設 `0`,
  不影響經驗值/點數)。
- `migratePet()` 對舊檔(v3 以下):`giftsGiven` 缺就補 `0`;`childNickname` 缺就**盡力回填一次**舊版
  `localStorage['pls.cloud.<petId>'].childNickname`(讀不到就是 `null`,不拋例外、不影響其餘欄位)——
  只在本機遷移時讀取這個舊快取,匯入「別的裝置匯出的 JSON 檔」時沒有這個本機快取可讀,`childNickname` 會是 `null`,
  家長要重新輸入一次(跟目前換裝置的已知限制一致)。
- 家長區「小主人暱稱」輸入框改成直接寫回寵物資料本身(`d.childNickname`,經 `ST.save()`),不再透過
  `app/cloud.js` 的側寫路徑;雲端同步時 `app/cloud.js` 直接讀 `ST.load(petId).childNickname` 上傳,不再自己
  維護一份獨立快取。
- 這個欄位現在會隨「匯出進度」/「匯入進度」/ 雲端「還原碼」一起走,不再是換裝置後必定遺失的資訊。

<!-- 新版本請依此格式往上加:
### v5（YYYY-MM,變更摘要）
- 新增欄位 X(預設值 …);migratePet 對舊檔補 X。
-->
