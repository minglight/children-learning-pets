# 匯出 / 匯入 JSON Schema 說明書

> 本檔是「家長備份檔（export/import）」的權威規格。
> **每次更新功能、只要動到儲存或匯出結構,就一定要更新本檔，並把 `version` +1。**
> 相關程式:`app/store.js`(`exportAll` / `importAll` / `migratePet`)、UI 在 `index.html`。

---

## 目前版本:`version = 2`（v2 新增「積分 / 獎品」)

### 為什麼需要這份規格
本 App 是純前端單機程式,進度只存在瀏覽器 `localStorage`(cache),**隨時可能被瀏覽器清除**。
家長唯一的備份方式是「匯出進度」下載 JSON 檔,日後用「匯入進度」還原。
因此**新版程式必須永遠能匯入舊版的備份檔**(向後相容),不可因缺欄位而崩潰或清空進度。

### 頂層結構
```jsonc
{
  "app": "pls",                       // 固定字串;不是 "pls" 一律拒絕匯入
  "version": 2,                       // schema 版本(= store.js 的 SCHEMA_VERSION)
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
  "_v": 2,                    // schema 版本戳記(由 save() 寫入,migratePet() 用來判斷升級)
  "pet": "rabbit",            // 寵物 id:"rabbit" | "hamster"
  "name": null,               // 自訂暱稱;null = 用預設名
  "points": 12,               // v2:可兌換獎品的積分(本寵物獨立)
  "hwEarned": 8,              // v2:字母手寫練習累計已給的積分(上限 100)
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
    "hw": 1                   // v2:今日字母手寫練習已給分的輪數(每天上限 3)
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

<!-- 新版本請依此格式往上加:
### v3（YYYY-MM,變更摘要）
- 新增欄位 X(預設值 …);migratePet 對舊檔補 X。
-->
