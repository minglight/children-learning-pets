# 寵物小學堂 — 專案 AI 規則

> 本檔為「修改本專案前必讀」的事項。每次動到資料/功能都要回來對照這份規則。

## 專案性質
- **純前端、單機 App**（HTML + Canvas + 原生 JS，PWA / 可離線）。
- **核心進度沒有後端、沒有伺服器、沒有帳號**。所有學習進度只存在裝置本機，這條原則不變。
- **例外**：有一組「好友雲端同步 / 自動備份」的選用附加功能會用到 Firebase（Firestore + 匿名登入），
  見下方「好友雲端同步 / 自動備份」一節。這組功能離線或未設定時完全不啟用，不影響上面這條原則的精神——
  本機 `localStorage` 永遠是唯一權威來源，雲端只是鏡射備份，不是取代。

## 資料儲存（最重要）
- 進度與設定**只能存在瀏覽器 cache**（`localStorage`，鍵名 `pls.*`，見 `app/store.js`）。
  - 雙寵物各自獨立：`pls.rabbit`、`pls.hamster`；另有 `pls.dailyLimit`、`pls.testMode`。
  - 每筆寵物資料都帶 `_v`（schema 版本戳記），由 `save()` 寫入、`migratePet()` 讀取。
- **持久化（當成 iPad App、永遠不要被清掉）**：
  - `app/store.js` 啟動時呼叫 `navigator.storage.persist()` 申請持久化儲存。
  - Service Worker 為 **cache-first**（`sw.js`），沒更新時一律吃本機快取、可離線、不重抓。
  - **不可**寫任何「定時清快取 / 清 localStorage」的邏輯。SW 的 `activate` 只清「舊版本的 asset 快取」，**絕不可動 localStorage**（使用者資料）。
- **備份**：cache 仍可能被使用者手動清除或系統極端回收，所以家長可**匯出 JSON 檔**（家長區「匯出進度」）保險，日後「匯入進度」還原。邏輯在 `exportAll()` / `importAll()`，UI 在 `index.html`。

## 向前 / 向後相容（硬性要求）
- **App 更新時要能 migrate 本來的 cache**：`load()` 每次讀取都會把本機 `localStorage` 資料丟進 `migratePet()` 升級到目前結構（缺欄位補預設、舊結構轉新結構），使用者進度不會因改版而遺失或歸零。
- **cache 結構與 import 一定要做成可向前相容的版本**：
  - 新版程式讀到**舊版**的 localStorage 資料或**舊版**匯出檔時，**必須能正常載入、不可崩潰、不可清空使用者進度**。
  - 缺少的新欄位要用安全預設值補上（參考 `migrateHome()`、`recordRun()` 補欄位的做法）。
- 任何會改變儲存結構的修改（新增/改名/刪欄位、改 slot 數量、改鍵名…）都要：
  1. 在 `app/store.js` 增加對應的 **migration**（依 `version` 升級舊資料）。
  2. **更新 `docs/export-import-schema.md`**（schema 說明書），並把 `version` +1。
  3. **驗證舊版匯出檔可匯入本版**（見下方檢查清單）。

## 每次「更新功能」後的必做清單
1. ☐ 是否動到 localStorage 或匯出/匯入結構？若有 → 走上面的相容流程。
2. ☐ 已更新 `docs/export-import-schema.md`（含新版本號與欄位說明、migration 說明）。
3. ☐ 已用**前一版本的 export 檔**實測 `importAll()`，確認能成功匯入且資料正確。
4. ☐ 動到任何被 `sw.js` 快取的檔案（含 `index.html`、`app/*.js`）→ **把 `sw.js` 的 `VERSION` +1**，否則使用者會拿到舊快取。

## 字體 / 英文字母字形
- 英文字母字形用 **Andika**（識字教學字體，單層 a/g），中文 fallback 到 **Huninn**。字體堆疊：`"Andika","Huninn","Baloo 2",sans-serif`（見 `app/art.js`、`scenes.js`、`index.html`）。
- 字母是用 **canvas `ctx.fillText`** 繪製，**無法套用 OpenType 替代字**（`font-feature-settings` 對 canvas 無效）；UI 文字用 Andika 字型即可。
- **筆順字母引擎：`app/letters.js`（`window.PLS_LETTERS`）**。用「中心線 SVG path 骨架」自繪字母,圓頭粗線=課本描寫體,並自動標筆順數字徽章＋方向箭頭。字形完全自控(正常 G、有頂橫 J、單層 g)。
  - 新增/修改字母只改 `GLYPHS` 那張表(座標系:CAP=0 / x-height頂=50 / baseline=100 / 下伸部≈128),render 不用動。
  - `trace`(描寫)模式已接上:`q.letter` 有定義就用骨架+筆順引導,沒定義 fallback 回字型。目前**大寫 A–Z + 小寫 a–z 全套已做**(曲線字母如 a b d e f p q r s 為手調座標,字形要微調就改 `GLYPHS`)。
  - 描寫卡有**四線格**(cap / x-height / baseline / descender),字母按基線定位(引擎以 y=50 的 x-height 線對到傳入的 cy)。
  - **筆順動畫**:`draw()` 傳 `opts.reveal`(0~1)即依筆順累計畫出該比例 + 筆尖圓點(`penColor`)。描寫關卡新字母會自動示範一次,並有「看筆順」鈕重播(`startDemo()`)。`letters-preview.html` 也有「▶ 播放筆順動畫」可預覽。
  - **字母手寫練習**:首頁 `emenu`(A–Z 字母格)→ 描寫頁 `epractice`(`app/english.js`),房間左欄「字母手寫練習」卡(在「換擺設」上面,`app/room.js`)進入。可切大小寫、上一個/下一個字母、清除、看筆順。**描滿一整輪(A–Z 大寫 + a–z 小寫共 52 個)才 +1 分**(本輪進度存 `pet.hwRound`,規則在 `store.submitHwLetter()`);隱藏獎品功能時無「寫好了」鈕、純自由練習。`emenu`/`epractice` 都顯示本輪進度,已描完的字母打勾。描寫卡渲染由共用函式 `renderTraceCard()` 處理(關卡與練習共用,字形/版面一致)。

## 積分 / 獎品商店（`app/points.js`）
- **積分本寵物獨立**：存在 `pet.points`（schema v2）。給分集中在 `store.recordRun()`（數學/英文過關 +1,同一關第 1~10 次給分,第 11 次起不給）與 `store.submitHwLetter()`（字母手寫練習:**描滿一整輪 A–Z 大寫 + a–z 小寫共 52 個才 +1 分**,不是寫一個就一分;本輪進度存 `pet.hwRound`,描滿後清空並沿用 `awardHandwriting()` 的「每天 3 輪、累計上限 100 分」規則,計數 `pet.daily.hw` / `pet.hwEarned`)。
- **獎品目錄與隱藏開關是全域**（不分寵物,類似 `pls.dailyLimit`）：`pls.prizes`(`[{id,name,cost}]`)、`pls.rewardsHidden`。家長區（`index.html`）可編輯目錄與切換隱藏。
- **全域積分 HUD**：`window.PLS_POINTS`,在 `main.js` 主迴圈最上層每幀繪製(右上角,`quiz`/`eplay`/`epractice` 會往左讓位避開既有控制鈕),讀 `PLS.activePet`(由 `PLS.go` 維護;首頁為 null → 不顯示);分數變動時播 +N / −N 飄字。**點金幣 HUD 直接進獎品商店**(`main.js` 的 pointer 事件優先 `PLS_POINTS.hitTest` → `tap()`;房間沒有獨立的「獎品商店」卡)。隱藏功能(`rewardsHidden`)時 HUD 與手寫「寫好了」鈕(`english.js` epractice)都不出現,自然也就沒有進商店的入口。
- 兌換在 `shop` 畫面(`points.js`),`store.redeem()` 扣本寵物點數;手寫過關小慶祝在 `hwpass` 畫面。
- 動到 `pet.points` / `daily.hw` / `hwEarned` / `hwRound` / `prizes` / `rewardsHidden` → 已是 schema **v3**(v3 新增 `pet.hwRound`),migration 與匯出入相容見 `store.js` 與 `docs/export-import-schema.md`。

## 好友雲端同步 / 自動備份（例外於「沒有後端」原則）
> 完整資料結構/權限規則見 `docs/cloud-friends-schema.md` 與 `firestore.rules`；程式在 `app/cloud.js`。

- **定位**：這是附加在本機優先架構之上的**選用**擴充，不是取代。核心學習進度（關卡/積分/手寫/擺設）
  的權威來源永遠是本機 `localStorage`，`SCHEMA_VERSION` / `migratePet()` / 匯出匯入邏輯完全不受影響。
  雲端只多做三件事：讓小朋友被朋友認出來（暱稱 + 好友代碼）、背景定時把完整進度鏡射備份到雲端、
  朋友之間唯讀互訪一天一次。
- **後端**：Firebase Firestore + **匿名登入**（Anonymous Auth），停留在 **Spark 免費方案**（不綁信用卡、
  不會被扣費，額度用完只是功能暫時不可用）。不用 Cloud Functions，所有存取控制都在 `firestore.rules`。
- **只在客戶端載入 SDK，不是換託管**：`index.html` 用 `<script>` 標籤載入 Firebase compat SDK 當成
  一個雲端資料庫在用，網站本身照舊放 GitHub Pages（或任何靜態託管），**不需要、也沒有用** Firebase Hosting。
- **哪些留在本機（不進雲端）**：所有學習進度（`pet.*`schema）、家長 PIN 鎖、每日關卡上限、獎品目錄——
  完全比照既有規則，不受這組功能影響。
- **哪些額外同步到 Firebase**：小朋友暱稱(`childNickname`)、好友代碼、還原碼、房間擺設 + 積分的唯讀快照
  (`status`)、完整進度的定時備份(`backups/{restoreCode}.snapshot`)。其中 `childNickname` 存在本機獨立的
  `pls.cloud.<petId>`（不是 `pls.<petId>`），刻意不進 `SCHEMA_VERSION`、不進匯出檔——換裝置用匯入還原後
  暱稱要重新輸入,新裝置的好友代碼也會是全新的一組,這是已知、可接受的限制。
- **兩種代碼**：6 碼**好友代碼**（小孩用,給同學交換,顯示在好友面板）與 10 碼**還原碼**（家長專用,
  只在家長區出現,救回完整進度用）刻意分開,避免分享好友代碼時連帶洩漏還原碼。
- **離線降級**：`app/cloud.js` 對「SDK 載入失敗 / `CFG.firebase` 未設定 / 離線」全部 fail-soft——安靜地
  不做事、回傳可辨識的失敗物件,絕不丟例外炸掉呼叫端,絕不影響數學/英文/手寫/積分/家長區等既有功能。
- **管理員後台**：`admin.html` + `app/admin.js`,獨立頁面,**不放進 `sw.js` 的 `ASSETS`**、不從任何小孩
  看得到的畫面連結過去。用 Firebase **Email/Password** 登入（跟小孩的匿名登入是不同帳號系統），
  權限邊界寫死在 `firestore.rules` 的 `isAdmin()`（比對管理員 email）。Admin 只能看總人數統計 / 最近活躍
  清單 / 用好友代碼查還原碼轉交家長,**看不到**任何關卡答題細節,也**看不到** `backups` 的實際備份內容。
- **XSS 防護**：`childNickname`/`petName` 等是跨使用者輸入的內容,`#friends-overlay` 與 `admin.html`
  渲染任何雲端拿回來的字串一律用 `textContent`,絕不用 `innerHTML`。
- 這組功能改動 Firestore 集合結構時,要更新 `docs/cloud-friends-schema.md`（不是 `docs/export-import-schema.md`——
  那份只管本機 schema/匯出檔,兩份文件的職責不同,不要混著改）。

## 其他
- 遵循 `~/.claude/CLAUDE.md` 全域規則（繁中、簡潔、破壞性操作需核准等）。
- 讀檔用 `Read`、搜尋用 `Grep`/`Glob`、改檔用 `Edit`/`Write`。
