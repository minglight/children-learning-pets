# 匯出 / 匯入 JSON Schema 說明書

> 本檔是「家長備份檔（export/import）」的權威規格。
> **每次更新功能、只要動到儲存或匯出結構,就一定要更新本檔，並把 `version` +1。**
> 相關程式:`app/store.js`(`exportAll` / `importAll` / `migratePet`)、UI 在 `index.html`。

---

## 目前版本:`version = 1`

### 為什麼需要這份規格
本 App 是純前端單機程式,進度只存在瀏覽器 `localStorage`(cache),**隨時可能被瀏覽器清除**。
家長唯一的備份方式是「匯出進度」下載 JSON 檔,日後用「匯入進度」還原。
因此**新版程式必須永遠能匯入舊版的備份檔**(向後相容),不可因缺欄位而崩潰或清空進度。

### 頂層結構
```jsonc
{
  "app": "pls",                       // 固定字串;不是 "pls" 一律拒絕匯入
  "version": 1,                       // schema 版本(= store.js 的 SCHEMA_VERSION)
  "exportedAt": "2026-06-18T08:00:00.000Z", // ISO 時間,僅供參考
  "rabbit": { /* 寵物資料,見下 */ },
  "hamster": { /* 寵物資料,見下 */ }
}
```

| 欄位 | 型別 | 說明 |
|---|---|---|
| `app` | string | 必須為 `"pls"`,辨識備份檔 |
| `version` | number | schema 版本號 |
| `exportedAt` | string (ISO) | 匯出時間戳 |
| `rabbit` / `hamster` | object | 兩隻寵物各自的進度(結構相同) |

### 單一寵物資料結構（`rabbit` / `hamster`）
```jsonc
{
  "_v": 1,                    // schema 版本戳記(由 save() 寫入,migratePet() 用來判斷升級)
  "pet": "rabbit",            // 寵物 id:"rabbit" | "hamster"
  "name": null,               // 自訂暱稱;null = 用預設名
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
    "english": 1
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

<!-- 新版本請依此格式往上加:
### v2（YYYY-MM,變更摘要）
- 新增欄位 X(預設值 …);migratePet 對舊檔補 X。
-->
