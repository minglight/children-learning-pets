# 寵物小學堂 — 專案 AI 規則

> 本檔為「修改本專案前必讀」的事項。每次動到資料/功能都要回來對照這份規則。

## 協作 / Git（開工前必讀）
- **此 repo 兩邊共用**：多台機器 / 多帳號都會開發並 push 同一個遠端。
- **開始開發前一定要先 `git pull`**，避免分叉與衝突；收工 commit 後記得 push，讓另一邊拿得到最新版。
- 預設分支是 **`master`**（不是 `main`）。

## 專案性質
- **純前端、單機 App**（HTML + Canvas + 原生 JS，PWA / 可離線）。
- **沒有後端、沒有伺服器、沒有帳號**。所有使用者資料只存在裝置本機。

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
  - **字母手寫練習**:首頁 `emenu`(A–Z 字母格)→ 描寫頁 `epractice`(`app/english.js`),房間左欄「字母手寫練習」卡(`app/room.js`)進入。可切大小寫、上一個/下一個字母、清除、看筆順。**描滿一整輪(A–Z 大寫 + a–z 小寫共 52 個)才 +1 分**(本輪進度存 `pet.hwRound`,規則在 `store.submitHwLetter()`);隱藏獎品功能時無「寫好了」鈕、純自由練習。`emenu`/`epractice` 都顯示本輪進度,已描完的字母打勾。描寫卡渲染由共用函式 `renderTraceCard()` 處理(關卡與練習共用,字形/版面一致)。

## 積分 / 獎品商店（`app/points.js`）
- **積分本寵物獨立**：存在 `pet.points`（schema v2）。給分集中在 `store.recordRun()`（數學/英文過關 +1,同一關第 1~10 次給分,第 11 次起不給）與 `store.submitHwLetter()`（字母手寫練習:**描滿一整輪 A–Z 大寫 + a–z 小寫共 52 個才 +1 分**,不是寫一個就一分;本輪進度存 `pet.hwRound`,描滿後清空並沿用 `awardHandwriting()` 的「每天 3 輪、累計上限 100 分」規則,計數 `pet.daily.hw` / `pet.hwEarned`)。
- **獎品目錄與隱藏開關是全域**（不分寵物,類似 `pls.dailyLimit`）：`pls.prizes`(`[{id,name,cost}]`)、`pls.rewardsHidden`。家長區（`index.html`）可編輯目錄與切換隱藏。
- **全域積分 HUD**：`window.PLS_POINTS`,在 `main.js` 主迴圈最上層每幀繪製(右上角,`quiz`/`eplay`/`epractice` 會往左讓位避開既有控制鈕),讀 `PLS.activePet`(由 `PLS.go` 維護;首頁為 null → 不顯示);分數變動時播 +N / −N 飄字。**點金幣 HUD 直接進獎品商店**(`main.js` 的 pointer 事件優先 `PLS_POINTS.hitTest` → `tap()`;房間沒有獨立的「獎品商店」卡)。隱藏功能(`rewardsHidden`)時 HUD 與手寫「寫好了」鈕(`english.js` epractice)都不出現,自然也就沒有進商店的入口。
- 兌換在 `shop` 畫面(`points.js`),`store.redeem()` 扣本寵物點數;手寫過關小慶祝在 `hwpass` 畫面。
- 動到 `pet.points` / `daily.hw` / `hwEarned` / `hwRound` / `prizes` / `rewardsHidden` → 已是 schema **v3**(v3 新增 `pet.hwRound`),migration 與匯出入相容見 `store.js` 與 `docs/export-import-schema.md`。

## 電子雞化:背包 / 餵食 / 成長(schema v4,v6 調整)
- **背包本寵物獨立**:`pet.inv = {foods:{key:數量}, toys:{key:數量}}`。**v6 起獎勵一次只給 1 個**:數學過關 → 從該關 `feast.items` 抽 **1 個**食物進 `foods`(**滿分(10 題第一次全對)或豪華(第 10 次通關)→ 2 個**;若寵物今日許願食物在這關且未完成,優先給它 — 邏輯在 `quiz.js advance()`);英文過關 → 玩具 1 個進 `toys`(豪華 ×2,`english.js advance()`)。豐收畫面(`feast`)以 `params.items` 顯示實拿的 1–2 個,滿分標題「滿分收穫!」+ ×2 徽章(徽章在標題右側,W/2,252 有寵物對話泡泡別壓到)。
- **餵食 / 陪玩在房間**(`app/room.js`):點房間前緣的「食物籃 / 玩具箱」開背包托盤 → 點一個道具 → 寵物走過去吃(三口吃完)/ 玩(玩具彈跳),**消耗 1 個**。資料在點下去那一刻就由 `store.feed()` / `store.playToy()` 扣掉,動畫只是演出。點寵物本體 = 摸摸牠(純互動)。
- **房間是 2.5D**(v6):寵物在整片地板漫遊(`room.js updateWander`,狀態存 `this._wander`),z=0 靠牆 ~ z=1 前緣,`scAt(z)` 近大遠小,**點地板可叫牠走過去**。**視角**:`pets.js draw()` 的 `o.dir`('front'|'side'|'back') — 走遠看到背面(屁股尾巴/耳背/無臉),橫走看到 3/4 側面(五官前移、兔耳後倒、露尾巴;預設朝右,`petAt` 只在 side 時用 `face=-1` 翻面朝左),停下/吃玩回正面;方向由 `room.js dirOf()`(移動向量縱橫比)決定。其他畫面不傳 `dir` = 正面,不受影響。食物墊/遊戲墊(`station()`)只是餵食/陪玩定點(`matZ=0.34`);畫在寵物頭上的東西(照顧圖示/許願泡泡/對話泡泡)都要用 `_petX`/`_petY`/`_petS` 隨深度縮放定位。
- **成長**:`pet.growth.xp`(v6:餵食 +4、陪玩 +6、每天第一次各多 +2,計數在 `pet.care`,跨日歸零)。階段門檻在 `store.js` 的 `GROW`:<30 幼幼(0.85×+呆毛)、<100 小寶、≥100 大寶(1.12×+兔兔蝴蝶結/倉倉領巾)。外觀由 `pets.js` 的 `draw(petId, ctx, t, {stage})` 處理,**所有畫寵物的地方都要帶 stage**(用 `store.growthInfo(d).stage`)。升階時房間會播全螢幕慶祝(`room.js drawGrow`)。
- **佈置(換擺設)已移除**(v6):`app/shelf.js` 已刪除;`pet.home` 欄位保留空格結構純為相容舊備份檔,v6 migration 會把舊檔擺出的食物/玩具轉進背包(deluxe 算 2 份)。**不要再讓任何畫面讀寫 `home` 的格子**。
- **老玩家補償**:`migratePet()` 對無 `growth` 的舊資料,用「各關 clears 總和 × 2、封頂 99」換算初始 xp。
- **許願(v5)**:`pet.wish` 每天由 `store.getWish()` 抽一個「拿得到的」食物(池 = 前三關 + 已解過關卡的 feast 食物);房間寵物旁有許願泡泡(點了提示去哪一關賺),餵中 → 成長加倍 + `wishGranted` 慶祝。
- **吃完隨機小反應(v5)**:room.js `startFeed()` 抽 burp / spin(轉圈) / hops / hearts,1/8 出「幸運星」→ `store.bonusXp(d,1)`;語錄在 `config.talkCare`。
- **收集圖鑑(v5)**:`pet.dex`(吃過/玩過自動點亮,`feed()`/`playToy()` 寫入),畫面在 `app/dex.js`(房間點掛畫進入)。**新增畫面檔要同時加進 `index.html` 的 script 與 `sw.js` 的 ASSETS。**
- **答題遊戲感**:quiz/eplay 有連對 combo 徽章(streak≥2)、同一題錯 2 次給提示並重唸、最後一題答對加大慶祝。
- 動到 `inv` / `growth` / `care` / `wish` / `dex` / `home` → 已是 schema **v6**(v6 移除佈置、home 轉背包、GROW 加重),migration 與匯出入相容見 `store.js` 與 `docs/export-import-schema.md`。

## 其他
- 遵循 `~/.claude/CLAUDE.md` 全域規則（繁中、簡潔、破壞性操作需核准等）。
- 讀檔用 `Read`、搜尋用 `Grep`/`Glob`、改檔用 `Edit`/`Write`。
