# 寵物小學堂 — 專案 AI 規則

> 本檔為「修改本專案前必讀」的事項。每次動到資料/功能都要回來對照這份規則。

## 協作 / Git（開工前必讀）
- **此 repo 兩邊共用**：多台機器 / 多帳號都會開發並 push 同一個遠端。
- **開始開發前一定要先 `git pull`**，避免分叉與衝突；收工 commit 後記得 push，讓另一邊拿得到最新版。
- 預設分支是 **`master`**（不是 `main`）。

## 專案性質
- **純前端、單機 App**（HTML + Canvas + 原生 JS，PWA / 可離線）。
- **核心玩法沒有後端、沒有伺服器、沒有帳號**。所有使用者資料的**權威來源永遠是裝置本機**（`localStorage`）。
- **例外(v11,選用附加功能)**：好友雲端同步 / 自動備份 / 維運後台(`app/cloud.js`、`firestore.rules`、`admin.html`)是額外疊加的一層,詳見下方「好友雲端同步」章節。這層**完全 fail-soft**——沒設定 `CFG.firebase` 或離線時安靜不做事,絕不影響數學/英文/手寫/積分/電子雞養成等既有功能,也不改變上面「權威來源是本機」這條原則。

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
- **10 種可養物種**（`config.js PLS_CONFIG.pets`）：rabbit 兔兔、hamster 倉倉、tabby 斑斑、meerkat 蒙蒙、capybara 豚豚、husky 哈哈、elephant 象象、xmascat 橘橘、chick 小雞、owl 貓頭鷹（後兩隻 v12 新增，幼幼從蛋孵化）。
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
- **佈置(換擺設)已移除**(v6):`app/shelf.js` 已刪除(但 `shelf` 畫面本身仍定義並註冊在 `app/screens.js`,尚未清乾淨);`pet.home` 欄位保留 `{foods:[3], toys:[3]}` 空格結構(各格 `{key, deluxe, date}`),`migrateHome()`／`setHomeItem()` 都還健在,v6 migration 會把舊檔擺出的食物/玩具轉進背包(deluxe 算 2 份)。**現階段不要讓任何畫面讀寫 `home` 的格子**——這組結構是「展示櫃」功能的預留地(見 `docs/design-brief.md` 相關計畫),要動之前先確認範圍。
- **老玩家補償**:`migratePet()` 對無 `growth` 的舊資料,用「各關 clears 總和 × 2、封頂 99」換算初始 xp。
- **許願(v5)**:`pet.wish` 每天由 `store.getWish()` 抽一個「拿得到的」食物(池 = 前三關 + 已解過關卡的 feast 食物);房間寵物旁有許願泡泡(點了提示去哪一關賺),餵中 → 成長加倍 + `wishGranted` 慶祝。
- **吃完隨機小反應(v5)**:room.js `startFeed()` 抽 burp / spin(轉圈) / hops / hearts,1/8 出「幸運星」→ `store.bonusXp(d,1)`;語錄在 `config.talkCare`。
- **雙寵物互訪(無 schema 變更)**:每次進房 **1/3 機率**(測試版必來),另一隻寵物過 6~14 秒從房間邊緣走進來作客(`room.js` 的 `this._visit` 狀態機:wait→in→stay→join→leave,`updateVisit()`)。作客期間在地板漫遊(與主寵物共用 `wanderStep()`)、**餵食時走到食物墊右側一起咀嚼**(主寵物站 -64、訪客站 +64)、陪玩時在旁邊蹦跳加油、可以點牠摸摸;約 45 秒後道別走出房間。**純演出,不讀寫任何存檔**(訪客外觀 stage 進房時讀一次)。語錄在 `config.talkCare.visit*`(`{name}` 會代換成訪客名);訪客有自己的泡泡(`sayG()`/`gBubble`),兩隻寵物繪製依 z 深度排序(遠的先畫)。
- **收集圖鑑(v5)**:`pet.dex`(吃過/玩過自動點亮,`feed()`/`playToy()` 寫入),畫面在 `app/dex.js`(房間點掛畫進入)。**新增畫面檔要同時加進 `index.html` 的 script 與 `sw.js` 的 ASSETS。**
- **答題遊戲感**:quiz/eplay 有連對 combo 徽章(streak≥2)、同一題錯 2 次給提示並重唸、最後一題答對加大慶祝。
- 動到 `inv` / `growth` / `care` / `wish` / `dex` / `home` / `species` / `slot` / `collection` / `decoDex` → 已是 schema **v10**(v6 移除佈置、home 轉背包、GROW 加重;v7 新增 `inv.gold` 金色食物;v8 加 `care.xpToday` + `DAILY_XP_CAP` 每日成長上限;**v9 改以小孩為單位**:鍵改 `pls.kidL`/`pls.kidR`、新增 `species`/`slot`/`collection`/`growth.grownAt`/`growth.deco`,舊 rabbit/hamster 鍵與匯出檔自動搬遷;**v10 配件可收集**:新增 `decoDex` 配件圖鑑、兔兔/倉倉補到 5 款、珍藏館可換裝),migration 與匯出入相容見 `store.js` 與 `docs/export-import-schema.md`。目前整體 schema 是 **v13**(v11 疊加「好友雲端同步」章節的 `childNickname`/`giftsGiven`;v12 新增小雞/貓頭鷹 2 物種 + 過關獎勵依難易度分級 + 破關獎盃 + 好友圖鑑/珍藏館瀏覽;**v13 新增 `memo` 聊天記憶 + `lastSeen`**,見「寵物聊天系統」章節),電子雞化本身的欄位在 v10 就已經穩定。

## 過關獎勵的次數上限與豪華版(v12)
- **過關次數上限依難易度分層**:`clearCapBasic`(入門關,預設 3)／`clearCapAdvanced`(進階關,預設 10),存在 `pls.clearCapBasic`／`pls.clearCapAdvanced`(全域,家長區可改,需密碼);「進階關卡從第幾關開始算」兩個小孩可各自設定。超過上限後仍可繼續玩,只是不再給點數/食物。
- **豪華版獎勵**:`CFG.deluxeAt = 10` — 同一關正式解滿 10 次後改送豪華版(`FOODS_DELUXE` / `drawToyDeluxe`)。
- ⚠️ **已知問題**:`deluxeAt`(10) 與 `clearCapBasic`(3) 互相打架 → **入門關卡的豪華獎勵事實上永遠觸發不到**,進階關卡也剛好卡在 10 的邊界。14 個豪華食物 + 10 個豪華玩具的美術幾乎沒有曝光機會。要動獎勵給予邏輯時請一併考慮這件事。
- **破關獎盃**:房間右上角 `trophyBadge()`(`app/room.js`)顯示數學/英文各自「目前破到第幾關」,自己房間與好友拜訪畫面共用同一個繪製。

## 寵物聊天系統(v13,`app/config.js` talkCare + `app/room.js` 聊天引擎)
- **起因**:小朋友回饋「寵物跟主人說話太少了,要有聊天的感覺」。舊版只有事件回應(餵食/陪玩/摸摸/升階/訪客)加兩句撒嬌,而且撒嬌條件是 `care.fed === 0` —— **餵過之後整天再也不說話**,進房間也不打招呼。完整企劃見 `docs/pet-chat-design.md`。
- **說什麼(素材三層,全部集中在 `config.js` 的 `talkCare`)**:
  - `memo` **記憶** — 寵物記得發生過的事(去誰家玩、誰來過、上次哪一關全對、吃過什麼、誰送了什麼)。這層才是「聊天感」的來源:對方記得你。
  - `state` **現況** — 此刻的存檔數字(金幣、圖鑑種類數、成長階段)。
  - `chatIdle` / `chatAsk` **閒聊** — 罐頭陳述句,以及**會等主人回答的問句**。
  - 另有 `greet` / `greetMorning` / `greetNoon` / `greetEvening` / `greetBack` 進門招呼。
- **何時說**:`room.chatTick()`,每 12~20 秒一句(有訪客在場時 ×1.6 拉長,免得兩隻寵物的泡泡一直撞在一起)。撒嬌機率刻意壓低(沒餵 35% / 沒玩 20%),其餘時間都拿來聊天。`pickLine()` 會避開「剛剛才講過的那一句」——素材再多,連著講兩次一樣的話就整個破功。
- **回話(一來一往)**:`chatAsk` 的問句會在**房間下緣中央**排一列選項鈕(`drawAsk()`,跟食物籃/玩具箱同一排),點了寵物再回一句。**鈕不跟著泡泡走**——泡泡在寵物頭上會飄,鈕會壓到寵物的臉和地墊標籤;固定在下緣不擋任何東西、位置穩定、小手好點。命中判定在 `tap()`,用上一幀 `drawAsk` 記下的 `_askRects`(同 `_wishRect` 的模式)。
- **可點的邀請**:`clear` 記憶有一半機率不是誇獎,而是真的邀主人再去一次(`clearAsk`),選項「🚀 走!」直接 `PLS.go('quiz'/'eplay', {levelIdx, practice})` 跳進那一關。跳關前會用 `levelJump()` 檢查關卡沒被鎖,`practice` 判斷跟 `screens.js tapNode` 同一套規則。
- **泡泡是單行不換行**(`art.js bubble` 寬度隨字數線性長)→ **台詞一律控制在 16 字以內,最長不超過 20 字**;含 `{who}`/`{item}` 佔位符的模板要用「代換後」的長度算。
- **`pet.memo` 的容量規則**(`store.js`):總筆數 `MEMO_MAX = 20`,另有每種事件各自的 `MEMO_KIND_MAX`(`clear` 4、`favFood` 2、`grow` 1…),**免得餵食這種高頻事件把拜訪/過關這種難得的回憶洗掉**。`pushMemo(d, ev, dedupeField)` 帶 dedupe 時,同一關/同一種食物/同一位朋友只留最新一筆。
- **不回填歷史**:migration 只補 `memo = []`,**不**從既有 `levels`/`dex` 反推假的回憶——不能讓寵物說得像它記得沒發生過的事。
- **記憶寫入點**:`store.js` 的 `recordRun`(過關)/ `feed`(食物、金色食物)/ `gainXp`(長大、抽到配件)/ `submitHwLetter`(描滿一輪)/ `redeem`(換獎品,多一個選填的 `name` 參數)/ `graduate`(畢業);`room.js` 的 `updateVisit` leave(誰來作客)與 `checkVisitLog`(收到誰的分享);`visit.js` 的 `enter`/`confirmShare`(去誰家玩、送了什麼)。**新增記憶種類要同時加 `MEMO_KIND_MAX` 與 `talkCare.memo` 的台詞模板。**
- **改台詞不用動 schema**:台詞在 `config.js`,不是存檔結構。動到 `pet.memo`/`lastSeen` 的**結構**才要走 migration + `docs/export-import-schema.md`(目前 schema **v13**)。

## 寵物 actor 架構(v13,新制 — 新增/重做寵物一律走這條)
- **問題背景**:舊制 `app/pets.js` 所有物種共用 `face()`／`motion()`／`shadow()` 三個模板,動作只有 `idle/chew/happy/sad`、視角只有 `front/side/back`、成長只有全域 ×0.85／×1.12。結果每隻都是「同一具骨架換配色」——哈士奇畫不出狗該有的桶身、長吻、四肢。`docs/design-brief.md` 舊版 C1 還明文要求設計端「造型要是一團可以被壓扁拉長的結構,不要有依賴精確比例才成立的細節」,等於從 prompt 端就把物種特徵封死。
- **新制拆法**:`app/actor.js`(`window.PLS_ACTOR`)只管**所有動物都一樣的時基**(動作切換、持續時間、走路/擺尾相位、傾斜緩動、自發行為排程);**造型與動作表現 100% 下放給物種自己**,每隻一個檔案 `app/actors/<species>.js`。
  - **物種之間不共用任何造型函式,重複的程式碼是刻意的。** 哈士奇的腿跟小雞的腿本來就不該是同一段程式。要抄可以抄,但不要抽共用。
  - 座標契約:**原點 = 腳底中心,y 向上為負**(跟舊制的「中心原點 + 腳底 y=146」不同)。每隻自己報 `bounds {top,bottom,halfWidth}`,沒有全物種共用的 366 總高。
  - 語意動作 10 個:`idle/walk/eat/play/happy/sad/sleep/rest/stretch/greet`。**畫面只講語意,不講怎麼演。**
  - `spec` 欄位:`draw(ctx,t,st)`、`bounds`、`stages`(各階段**比例差異**,不是等比縮放)、`locomotion{speed,legFreq,tailFreq,lean,gait}`、`ambient{min,max,pool}`、`holds`。
- **已搬家**:`husky`、`chick`。**其餘 8 隻自動走 legacy adapter**(包一層舊 `PLS_PETS.draw`,輸出與改版前逐格相同),可以一隻一隻慢慢搬,不用一次到齊。
- **畫寵物的統一入口**:`PLS_ACTOR.drawAt(ctx, species, t, cx, footY, s, o)`(靜態一張圖)與 `PLS_ACTOR.create(species)`→`actor.act()/update()/render()`(房間裡活的)。縮圖反推縮放用 `PLS_ACTOR.spanOf(species)`,**不要再寫死 `PET_SPAN = 366`**。房間走位在 `app/room.js` 的 `petAt()`／`wanderStep()`,走多快由 `locomotion.speed` 決定(每隻不同)。
- **新舊座標換算常數 `PLS_ACTOR.UNIT = 1.9`**(舊制 366 ÷ 哈士奇 194)。這是**單位換算**不是「把每隻拉成一樣高」——所以小雞就是比哈士奇小一半,體型差異會如實呈現。
- 預覽頁 `actor-preview.html`(10 個動作 × 走路 × 三階段 × 配件,含 legacy 對照組),跟 `debug.html` 一樣**不進 `sw.js` 的 ASSETS**。
- 新增一隻物種要動的地方:`app/actors/<species>.js`(新檔)＋ `config.js PLS_CONFIG.pets`(名字/主題色)＋ `index.html` script ＋ `sw.js` ASSETS 與 `VERSION` +1。

## 視覺 / 美術升級
- 要外包設計（新寵物、新房間場景、新獎品道具、UI 改版）一律走 **`docs/design-brief.md`** 的 prompt 模板,不要臨時發明說法。裡面有各類資產的座標系、必要變體、回傳格式與驗收清單。
- **`Path2D` 可以直接吃 SVG path 字串畫進 canvas**,`app/letters.js:169` 已經在用(`ctx.stroke(new Path2D(st.d))`)。所以可交付的視覺範圍不限於實色+圓角,任何向量圖形都行。
- **點陣 sprite 實質上不可行**:寵物有 3 視角 × 3 成長階段 × 10 物種,外加 10 個 `xxxDeco()` × 5 款 = 50 組寫死的配件座標,且 sprite 無法套用 `motion()` 的擠壓拉伸。要換媒材只能走 SVG path + 維持既有的程序化變形。
- **寵物的美術升級走上面的「寵物 actor 架構」章節**,`design-brief.md` 的 C1 模板已同步改寫成「交一組動作表 + 節奏參數 + 自己的 bounds」,不再要求三視角與固定外框。

## 好友雲端同步 / 自動備份(選用附加功能,v11,`app/cloud.js`)
- **身份錨點是「小孩存檔 slot」（`kidL`/`kidR`），不是物種**:物種(`species`)是小孩底下會換的屬性(換寵物/畢業都會變),雲端好友代碼/還原碼/暱稱一律跟著 slot 走,不跟著物種走。所有 `app/cloud.js` 的方法第一個參數都是 `slot`。
- **小朋友暱稱**:`pet.childNickname`(schema v11,好友辨識用,獨立於寵物名字/種類;換寵物/畢業都不變)是本機 schema 的正式欄位,會隨「匯出進度」/「匯入進度」/還原碼一起搬家。`pet.giftsGiven` 是拜訪分享次數的小統計,不影響經驗值/點數。
- **Firestore 集合**(`players`/`friendCodes`/`friends`/`visits`/`visitLog`/`backups`)的完整結構、權限規則、節流節奏見 **`docs/cloud-friends-schema.md`**(權威規格)與 `firestore.rules`。**Firestore 端不是進度的權威來源**,只是鏡射備份 + 唯讀拜訪快照,本機 `localStorage` 才是。
- **拜訪好友是互動式的**(`app/room.js` 房間左欄「好友」卡 → `window.PLS_FRIENDS.open(slot)` → `app/visit.js`):帶著自己的寵物走進朋友房間(重用 `app/room.js` 匯出的 `window.PLS_ROOM2` 共用繪製元件,不另外重畫一套房間美術),可以從自己背包(`inv.foods`/`inv.gold`/`inv.toys`)挑一項分享給朋友,**一次拜訪限分享一次**。分享寫入只會落在朋友的 `visitLog` 子集合,結構上(Firestore 規則層級)就不可能碰到朋友的 `status`/`points`/成長進度。
- **主人端通知**:小孩下次打開房間(`room.js enter()`)會呼叫 `PLS_CLOUD.checkVisitLog(slot)`,把新的分享紀錄疊成可點掉的橫幅「🎁 OO的OO 拜訪過你,分享了『XX』」。已讀游標純本機判斷,不寫回 Firestore。
- **維運後台**(`admin.html`+`app/admin.js`,Email/Password 登入,跟小孩的匿名登入是不同帳號系統):**只有 `firestore.rules` 裡 `isAdmin()` 寫死的單一 email 能登入看到資料**,不是「每個家長都有 admin 權限」;一般家長全程匿名登入,不會意外拿到後台存取權。`admin.html`/`app/admin.js` 刻意不進 `sw.js` 的 `ASSETS`(不支援離線,後台本來就要即時連網)。
- **改動這組功能的檢查清單**:動到 Firestore 欄位/集合 → 同步更新 `docs/cloud-friends-schema.md` 與 `firestore.rules`;動到本機 `childNickname`/`giftsGiven` 欄位結構 → 照最上面「向前/向後相容」章節走 `store.js` migration + `docs/export-import-schema.md`。

## QA 測試工具(`debug.html`)
- **獨立頁面,刻意不進 `sw.js` 的 `ASSETS`**(跟 `admin.html` 同套模式,不支援離線),給 QA/開發用來一鍵灌測試資料(物種/成長階段/積分/背包/圖鑑/配件圖鑑/畢業珍藏/暱稱/關卡進度/測試模式)、跳進 App 內特定畫面、測試好友拜訪與來訪通知流程。
- **跳畫面機制**:寫一個一次性標記到 `localStorage`(`pls.debug.jump = {screen, params}`)後導向 `index.html`;`index.html` 開機跑完 `PLS.go('home')` 後會檢查這個 key,讀到就 `PLS.go(screen, params)` 並立刻刪掉。一般玩家永遠不會有這個 key,對正常流程零影響。
- **雲端環境隔離(重要)**:`debug.html` 在載入 `app/cloud.js` 之前,用行內 `<script>` 把 `window.PLS_CONFIG.firebase` 覆寫成獨立的 **`children-pet-dev`** 測試專案,不是正式的 `children-pet`。**切換環境的機制是「開哪個 html 檔案」,不是 runtime 開關**——`index.html` 永遠讀 `app/config.js` 原本的正式設定,`debug.html` 永遠覆寫成測試專案,沒有中間狀態、也沒有頁面內按鈕可以切換。
  - `app/cloud.js` 的本機連結快取(`pls.cloud.*`,存 playerId/好友代碼/還原碼)依 `CFG.firebase.projectId` 分 key(`localKey()`),避免 `debug.html` 跟 `index.html` 同源共用 `localStorage` 時,測試環境誤用到正式的 playerId(或反過來)。正式環境(`children-pet`)第一次讀取時,會自動把舊版無命名空間的鍵搬進新鍵(舊鍵保留當備份),不影響既有好友代碼——這個搬遷邏輯**只認 `projectId === 'children-pet'`**,新增/更換測試專案不會誤觸發。
  - `children-pet-dev` 專案(Firestore + 匿名登入 + `firestore.rules`)要在 Firebase Console 手動建立/維護,跟正式專案一樣沒有 CLI 存取權;規則內容應與這個 repo 的 `firestore.rules` 保持一致,改動時兩邊都要更新。
- **本機小孩存檔(`pls.kidL`/`pls.kidR`)沒有做環境隔離,仍然是同一份**:`debug.html` 本質上就是要讀寫「這個瀏覽器」的真實存檔來灌測試資料,跟 `index.html` 完全共用 `localStorage`。**絕對不要在小孩實際在用的裝置/瀏覽器上開 `debug.html`**,否則會直接覆蓋小孩的真實進度。
- **登入門檻(email/password)**:`debug.html` 全頁工具(含本機存檔按鈕)預設隱藏在 `#qa-body`,要先用 Firebase **Email/Password** 登入通過才顯示——帳號建立在 `children-pet-dev` 專案的 Authentication(手動建立,跟正式帳號系統無關)。實作用「第二個具名 app」(`firebase.initializeApp(CFG.firebase, 'debugGate')`)單純驗證登入者,**不影響**下方雲端模擬功能用的預設 app / 匿名登入(`app/cloud.js` 的 `init()`),兩者互不干擾。`admin.html` 本來就有等價的 Email/Password 登入(`app/admin.js`,權限邊界在 `firestore.rules` 的 `isAdmin()`)。**因為兩頁都有登入門檻,`.github/workflows/static.yml` 才放心整包(`path: '.'`)部署到 GitHub Pages,不用特別排除 `debug.html`/`admin.html`。**

## 本機開發
- `make start` / `make stop` / `make status`:背景啟動/停止靜態伺服器(`python3 -m http.server`),PID 記在 `.server.pid`(已加進 `.gitignore`)。**故意不用 80xx 系列 port**(容易跟其他專案的伺服器搞混)，改用 `4173`。
- `make debug` / `make admin` / `make open`:啟動後直接用預設瀏覽器開對應頁面。
- `make serve`:前景啟動(看得到 log,Ctrl+C 結束),不透過 PID 檔案管理。

## 其他
- 遵循 `~/.claude/CLAUDE.md` 全域規則（繁中、簡潔、破壞性操作需核准等）。
- 讀檔用 `Read`、搜尋用 `Grep`/`Glob`、改檔用 `Edit`/`Write`。
