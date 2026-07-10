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
  - **存檔以「小孩」為單位（v9）**：兩個小孩各自獨立 → `pls.kidL`（左邊小孩）、`pls.kidR`（右邊小孩）；另有 `pls.dailyLimit`、`pls.testMode`。**鍵名代表「哪個小孩的存檔槽（slot）」，不是物種**；小孩正在養的物種存在該筆的 `species` 欄位。
  - 舊版鍵 `pls.rabbit`／`pls.hamster` 仍相容：首次載入時 `load('kidL')` 會自動認領 `pls.rabbit`（`pls.hamster`→`kidR`）搬進新鍵，舊鍵保留當備份（`LEGACY_SLOT` 映射）。**新程式不要再讀寫 `pls.rabbit`／`pls.hamster`。**
  - 每筆存檔都帶 `_v`（schema 版本戳記），由 `save()` 寫入、`migratePet()` 讀取。
- **持久化（當成 iPad App、永遠不要被清掉）**：
  - `app/store.js` 啟動時呼叫 `navigator.storage.persist()` 申請持久化儲存。
  - Service Worker 為 **cache-first**（`sw.js`），沒更新時一律吃本機快取、可離線、不重抓。
  - **不可**寫任何「定時清快取 / 清 localStorage」的邏輯。SW 的 `activate` 只清「舊版本的 asset 快取」，**絕不可動 localStorage**（使用者資料）。
- **備份**：cache 仍可能被使用者手動清除或系統極端回收，所以家長可**匯出 JSON 檔**（家長區「匯出進度」）保險，日後「匯入進度」還原。邏輯在 `exportAll()` / `importAll()`，UI 在 `index.html`。

## 以「小孩」為單位的存檔 + 寵物生命週期（v9，`app/lifecycle.js`）
- **核心概念:一個小孩(slot)＝一個存檔;物種(species)只是這個存檔目前養的外觀。** 過去 `petId` 一詞同時代表「存檔鍵＋物種外觀＋玩具組」三種身分,v9 已拆開:
  - 各畫面裡 `this.petId` = **slot**（`'kidL'`／`'kidR'`,拿去 `ST.load(slot)`／存檔）。
  - `this.species` = **外觀**（`ST.load(slot).species`,拿去 `P.draw(species, ...)`、查物種名）。**畫寵物一律用 species,不要再用 slot/petId 當物種。**
- **8 種可養物種**（`config.js PLS_CONFIG.pets`）：rabbit 兔兔、hamster 倉倉、tabby 斑斑、meerkat 蒙蒙、capybara 豚豚、husky 哈哈、elephant 象象、xmascat 橘橘。
- **生命週期**（三個畫面都在 `app/lifecycle.js`）：
  1. `pickpet`（選寵物）：空的小孩卡點「＋ 選寵物」進來,4×2 顯示 8 種幼幼 → 點一隻 → `ST.chooseSpecies(slot, species)` → 進房間從幼幼養起。`chooseSpecies` **只重置 species/growth/care/wish**,**保留** points/dex/inv/各關 clears/collection（金幣圖鑑背包全留給小孩）。
  2. 養大到大寶（`growth.xp ≥ 100`），記 `growth.grownAt`（升上大寶那天）。
  3. `graduate`（畢業）：大寶滿 `GRADUATE_DAYS`（3 天,測試版即可）後,房間出金色「🎓 讓牠畢業」鈕 → 慶祝畫面 → `ST.graduate(slot)` 把 `{species, deco, name, date}` 推進該小孩的 `collection[]`、species 歸 null → 回去 `pickpet` 再選新的一隻。
  4. `museum`（珍藏館）：首頁左下角「🏅 寵物珍藏館」進入,左右兩欄各一小孩,上「正在養」+ 成長條,下「已畢業珍藏」大寶牆（含當初配件/暱稱/日期）。
- **成長速度煞車**：`GROW.DAILY_XP_CAP = 15`（每日成長值上限,記在 `care.xpToday`,跨日歸零）→ 100xp ÷ 15 ≈ **最快一週長大**（平板時間煞車;測試模式不限）。
- **長大配件**：每物種 5 款（`growth.deco` 0–4,升上大寶時隨機抽一款,由 `P.draw` 的 `o.growDeco` 畫出;各物種的 `xxxDeco(ctx, i, fx)` 在 `pets.js`,**8 隻都有 5 款**,兔兔/倉倉的是 `rabbitDeco`/`hamsterDeco`)。
- **配件可收集/換裝(v10)**：每小孩有 `pet.decoDex = {species:[5 bool]}` 配件圖鑑;養大寶抽到哪款就**解鎖**那款(`gainXp` 抽 deco 時 `markDeco`)。**珍藏館(museum)點寵物 → `dressup` 換裝畫面**,只能換成「已收集」的款式(`ST.setCollectionDeco`/`setCurrentDeco`,內部 `ownsDeco` 檢查;未收集顯示 🔒)。API:`decoOwned`/`ownsDeco`/`setCollectionDeco`/`setCurrentDeco`/`DECO_N`。**畫珍藏縮圖/換裝格用 `PET_SPAN`(≈366,含最高兔耳)反推縮放,避免頭被 clip 切掉。**
- **英文玩具改全物種共用一套**（v9）：6 個新物種沒有專屬玩具美術 → 10 個英文關卡各自的 `toyU`／`toyArtU`（`config.js`）為**共用玩具**,`english.js`／`dex.js`／`screens.js` 玩具查詢都走 `toyU`／`toyArtU`;舊的物種專屬玩具名保留純為相容顯示。
- **`store.js` 相關 API**：`SLOTS`／`SLOT_NAMES`／`LEGACY_SLOT`、`speciesOf(slot)`、`chooseSpecies(slot, species)`、`graduateInfo(d)`／`canGraduate(d)`、`graduate(slot)`、`collectionOf(slot)`。

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
- **積分本小孩獨立**：存在該小孩存檔的 `pet.points`（schema v2；v9 起「本寵物」＝「本小孩」，畢業重選寵物時**保留**）。給分集中在 `store.recordRun()`（數學/英文過關 +1,同一關第 1~10 次給分,第 11 次起不給）與 `store.submitHwLetter()`（字母手寫練習:**描滿一整輪 A–Z 大寫 + a–z 小寫共 52 個才 +1 分**,不是寫一個就一分;本輪進度存 `pet.hwRound`,描滿後清空並沿用 `awardHandwriting()` 的「每天 3 輪、累計上限 100 分」規則,計數 `pet.daily.hw` / `pet.hwEarned`)。
- **獎品目錄與隱藏開關是全域**（不分寵物,類似 `pls.dailyLimit`）：`pls.prizes`(`[{id,name,cost}]`)、`pls.rewardsHidden`。家長區（`index.html`）可編輯目錄與切換隱藏。
- **全域積分 HUD**：`window.PLS_POINTS`,在 `main.js` 主迴圈最上層每幀繪製(右上角,`quiz`/`eplay`/`epractice` 會往左讓位避開既有控制鈕),讀 `PLS.activePet`(由 `PLS.go` 維護;首頁為 null → 不顯示);分數變動時播 +N / −N 飄字。**點金幣 HUD 直接進獎品商店**(`main.js` 的 pointer 事件優先 `PLS_POINTS.hitTest` → `tap()`;房間沒有獨立的「獎品商店」卡)。隱藏功能(`rewardsHidden`)時 HUD 與手寫「寫好了」鈕(`english.js` epractice)都不出現,自然也就沒有進商店的入口。
- 兌換在 `shop` 畫面(`points.js`),`store.redeem()` 扣本寵物點數;手寫過關小慶祝在 `hwpass` 畫面。
- 動到 `pet.points` / `daily.hw` / `hwEarned` / `hwRound` / `prizes` / `rewardsHidden` → 已是 schema **v3**(v3 新增 `pet.hwRound`),migration 與匯出入相容見 `store.js` 與 `docs/export-import-schema.md`。

## 電子雞化:背包 / 餵食 / 成長(schema v4,v6/v8/v9 調整;v9 起「本寵物」欄位＝掛在「本小孩」存檔下)
- **背包本小孩獨立**(v9 起「本寵物」＝「本小孩」,畢業重選寵物時保留):`pet.inv = {foods:{key:數量}, toys:{key:數量}, gold:{key:數量}}`。**v6 起獎勵一次只給 1 個**:數學過關 → 從該關 `feast.items` 抽 **1 個**食物進 `foods`(**滿分(10 題第一次全對)或豪華(第 10 次通關)→ 2 個**;若寵物今日許願食物在這關且未完成,優先給它 — 邏輯在 `quiz.js advance()`);英文過關 → 玩具 1 個進 `toys`(豪華 ×2,`english.js advance()`)。豐收畫面(`feast`)以 `params.items` 顯示實拿的 1–2 個,滿分標題「滿分收穫!」+ ×2 徽章(徽章在標題右側,W/2,252 有寵物對話泡泡別壓到)。
- **神秘金色食物(v7)**:數學過關 **1/10 機率**整份食物獎勵變金色(`quiz.js advance()` 擲骰 → `store.addFoods(d, keys, gold)` 進 `inv.gold`,與 `foods` 同 key 空間、獨立計數)。餵金色食物 `store.feed(d, key, gold=true)` → 基礎成長值 **×2**(與許願命中 ×2 **可疊 ×4**),圖鑑點亮同一基礎 key。渲染用 `art.js drawFoodGold`(離屏 source-atop 鍍金 + 閃星,做法同 `toys.js` 豪華玩具);豐收畫面金色徽章在標題**左**側(右側是 ×2 徽章),房間托盤金色食物排在一般食物後、金框格子,開吃語錄 `config.talkCare.goldFood`。
- **餵食 / 陪玩在房間**(`app/room.js`):點房間前緣的「食物籃 / 玩具箱」開背包托盤 → 點一個道具 → 寵物走過去吃(三口吃完)/ 玩(玩具彈跳),**消耗 1 個**。資料在點下去那一刻就由 `store.feed()` / `store.playToy()` 扣掉,動畫只是演出。點寵物本體 = 摸摸牠(純互動)。
- **房間是 2.5D**(v6):寵物在整片地板漫遊(`room.js updateWander`,狀態存 `this._wander`),z=0 靠牆 ~ z=1 前緣,`scAt(z)` 近大遠小,**點地板可叫牠走過去**。**視角**:`pets.js draw()` 的 `o.dir`('front'|'side'|'back') — 走遠看到背面(屁股尾巴/耳背/無臉),橫走看到 3/4 側面(五官前移、兔耳後倒、露尾巴;預設朝右,`petAt` 只在 side 時用 `face=-1` 翻面朝左),停下/吃玩回正面;方向由 `room.js dirOf()`(移動向量縱橫比)決定。其他畫面不傳 `dir` = 正面,不受影響。食物墊/遊戲墊(`station()`)只是餵食/陪玩定點(`matZ=0.34`);畫在寵物頭上的東西(照顧圖示/許願泡泡/對話泡泡)都要用 `_petX`/`_petY`/`_petS` 隨深度縮放定位。
- **成長**:`pet.growth.xp`(v6:餵食 +4、陪玩 +6、每天第一次各多 +2,計數在 `pet.care`,跨日歸零)。**v8 加每日成長上限 `GROW.DAILY_XP_CAP = 15`**(記在 `care.xpToday`,跨日歸零;100xp÷15≈最快一週長大,測試模式不限)。階段門檻在 `store.js` 的 `GROW`:<30 幼幼(0.85×+呆毛)、<100 小寶、≥100 大寶(1.12×+每物種 5 款配件其一)。**大寶配件 `growth.deco`(0–4)升上大寶時決定並固定**。外觀由 `pets.js` 的 `draw(species, ctx, t, {stage, dir, growDeco})` 處理,**所有畫寵物的地方都要帶 species(不是 slot)+ stage + growDeco**(stage 用 `store.growthInfo(d).stage`、growDeco 用 `d.growth.deco`)。升階時房間會播全螢幕慶祝(`room.js drawGrow`)。
- **佈置(換擺設)已移除**(v6):`app/shelf.js` 已刪除;`pet.home` 欄位保留空格結構純為相容舊備份檔,v6 migration 會把舊檔擺出的食物/玩具轉進背包(deluxe 算 2 份)。**不要再讓任何畫面讀寫 `home` 的格子**。
- **老玩家補償**:`migratePet()` 對無 `growth` 的舊資料,用「各關 clears 總和 × 2、封頂 99」換算初始 xp。
- **許願(v5)**:`pet.wish` 每天由 `store.getWish()` 抽一個「拿得到的」食物(池 = 前三關 + 已解過關卡的 feast 食物);房間寵物旁有許願泡泡(點了提示去哪一關賺),餵中 → 成長加倍 + `wishGranted` 慶祝。
- **吃完隨機小反應(v5)**:room.js `startFeed()` 抽 burp / spin(轉圈) / hops / hearts,1/8 出「幸運星」→ `store.bonusXp(d,1)`;語錄在 `config.talkCare`。
- **雙寵物互訪(無 schema 變更)**:每次進房 **1/3 機率**(測試版必來),另一隻寵物過 6~14 秒從房間邊緣走進來作客(`room.js` 的 `this._visit` 狀態機:wait→in→stay→join→leave,`updateVisit()`)。作客期間在地板漫遊(與主寵物共用 `wanderStep()`)、**餵食時走到食物墊右側一起咀嚼**(主寵物站 -64、訪客站 +64)、陪玩時在旁邊蹦跳加油、可以點牠摸摸;約 45 秒後道別走出房間。**純演出,不讀寫任何存檔**(訪客外觀 stage 進房時讀一次)。語錄在 `config.talkCare.visit*`(`{name}` 會代換成訪客名);訪客有自己的泡泡(`sayG()`/`gBubble`),兩隻寵物繪製依 z 深度排序(遠的先畫)。
- **收集圖鑑(v5)**:`pet.dex`(吃過/玩過自動點亮,`feed()`/`playToy()` 寫入),畫面在 `app/dex.js`(房間點掛畫進入)。**新增畫面檔要同時加進 `index.html` 的 script 與 `sw.js` 的 ASSETS。**
- **答題遊戲感**:quiz/eplay 有連對 combo 徽章(streak≥2)、同一題錯 2 次給提示並重唸、最後一題答對加大慶祝。
- 動到 `inv` / `growth` / `care` / `wish` / `dex` / `home` / `species` / `slot` / `collection` / `decoDex` → 已是 schema **v10**(v6 移除佈置、home 轉背包、GROW 加重;v7 新增 `inv.gold` 金色食物;v8 加 `care.xpToday` + `DAILY_XP_CAP` 每日成長上限;**v9 改以小孩為單位**:鍵改 `pls.kidL`/`pls.kidR`、新增 `species`/`slot`/`collection`/`growth.grownAt`/`growth.deco`,舊 rabbit/hamster 鍵與匯出檔自動搬遷;**v10 配件可收集**:新增 `decoDex` 配件圖鑑、兔兔/倉倉補到 5 款、珍藏館可換裝),migration 與匯出入相容見 `store.js` 與 `docs/export-import-schema.md`。

## 其他
- 遵循 `~/.claude/CLAUDE.md` 全域規則（繁中、簡潔、破壞性操作需核准等）。
- 讀檔用 `Read`、搜尋用 `Grep`/`Glob`、改檔用 `Edit`/`Write`。
