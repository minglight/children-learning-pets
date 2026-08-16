# 好友雲端同步 / 自動備份 — Firestore 資料結構說明書

> 本檔是「好友(暱稱/加好友/串門子)+ 自動備份 + 維運後台」這組雲端功能的權威規格。
> **每次更新這組功能、只要動到 Firestore 集合結構,就一定要更新本檔。**
> 相關程式:`app/cloud.js`(所有讀寫邏輯)、`index.html` 的 `#friends-overlay` 與家長區「雲端備份」小節、
> `app/room.js` / `app/visit.js`(串門子畫面)、`admin.html` + `app/admin.js`(維運後台)、`firestore.rules`(安全規則)。

---

## 這組功能是「附加」不是「取代」

`CLAUDE.md` 的核心原則沒有變:**本機 `localStorage` 永遠是進度的權威來源**,`app/store.js` 的
`SCHEMA_VERSION` / `migratePet()` / 匯出匯入邏輯完全不受這裡影響。雲端只多做三件事:
1. 讓小朋友能被朋友認出來(暱稱 + 好友代碼)。
2. 背景定時把完整進度**鏡射**一份到雲端(不是取代本機存檔,是多一層異地備份)。
3. 讓朋友之間帶自己的寵物互訪一次/天,並能分享食物/玩具給對方。

離線或 `app/config.js` 的 `CFG.firebase` 未設定時,`app/cloud.js` 的所有方法都安靜地不做事、
回傳可辨識的失敗物件,絕不影響數學/英文/手寫/積分/家長區/電子雞養成等既有功能。

**身份錨點是「小孩存檔 slot」,不是物種**:`app/store.js`(v9 起)本來就是以 `kidL`/`kidR` 兩個小孩
分割存檔,物種(`species`)只是小孩底下會換的屬性(換寵物、畢業重選都會改變 `species`,但 `slot` 不變)。
雲端身份完全比照這個設計:`app/cloud.js` 所有方法都以 `slot` 為主參數,Firestore 的 `players/{id}.species`
是**可變更**欄位(換寵物/畢業時會同步更新),不是像早期草案那樣把物種當成不可變的識別單位。

---

## Firestore 集合結構

```jsonc
players/{playerId}                  // playerId = Firestore 自動 ID
{
  ownerUid: "abc123...",            // 這台裝置的匿名登入 uid
  species: "elephant",              // 8 種可養物種之一;會隨換寵物/畢業改變,不是識別單位(識別單位是 slot,見上)
  childNickname: "小明",             // 同步自 app/store.js pet blob 的 childNickname(schema v11 起),獨立於寵物名字/種類
  petName: "阿福",                   // 同步自 pet.name(可能是 null → 存空字串),顯示房間標題用
  friendCode: "K7M2Q9",             // 6 碼好友代碼
  status: {                         // 拜訪時看到的唯讀快照(節流上傳,不是即時)。不含背包目前庫存數量/關卡明細/
                                     // 答對率等學習細節——trophy(v12)、dex/decoDex/collection(v13)是刻意放行的
                                     // 例外,都是「收集了什麼」而不是「現在還剩多少/答得好不好」。
    species: "elephant",
    name: "阿福",
    stage: "grown",                 // "baby" | "kid" | "grown"(見 store.js STAGE_NAMES)
    growDeco: 2,                    // 大寶配件款式 index(0-4)
    points: 12,
    trophy: 8,                      // v12:數學破到第幾關(store.js trophyNumber()),拜訪畫面的「獎盃」亮點,
                                     // 自己房間與好友拜訪畫面顯示同一個徽章(app/room.js trophyBadge,PLS_ROOM2 匯出)
    trophyEn: 5,                    // v13:英文破到第幾關(store.js trophyNumberEnglish()),跟 trophy 同一顆徽章元件、
                                     // 疊在數學獎盃上方顯示(app/room.js/app/visit.js 各呼叫兩次 trophyBadge)
    dex: {                          // v13:收集圖鑑(同步自 pet.dex,只有 key 清單,沒有數量)
      foods: ["apple", "eggcake"],
      toys: ["car", "train"]
    },
    decoDex: { "elephant": [true, false, true, false, false] },   // v13:配件圖鑑,同步自 pet.decoDex
    collection: [                   // v13:珍藏館(畢業寶貝牆),同步自 pet.collection,最多留最近 40 筆
      { species: "rabbit", deco: 1, name: "阿白", date: "2026-3-1" }
    ],
    updatedAt: <serverTimestamp>
  },
  createdAt: <serverTimestamp>
}

players/{playerId}/private/meta     // 只有本人裝置 + admin 能讀
{
  restoreCode: "K7M2Q9XYZ1",        // 10 碼還原碼(建立後不可變更)
  lastSeenAt: <serverTimestamp>     // 每次自動備份 flush 都會更新,admin 用來判斷活躍度
}

friendCodes/{code}                  // doc ID 就是 6 碼好友代碼本身 → 天然保證唯一
{
  playerId: "players/{id}"
}

players/{playerId}/friends/{friendPlayerId}   // 雙向好友清單(v4 起):加好友時同時寫入雙方各自
                                                // 清單下代表對方的那一筆,只有清單擁有者能讀
{
  addedAt: <serverTimestamp>
}

players/{playerId}/visits/{friendPlayerId}_{YYYY-M-D}   // 每日一次的拜訪紀錄(create-only)
{
  at: <serverTimestamp>
}

players/{playerId}/visitLog/{entryId}   // 訪客留給主人的分享紀錄,只進不出(create-only,見下方「拜訪分享」)
{
  fromNickname: "小華",
  fromSpecies: "husky",
  fromPetName: "球球",
  gift: { type: "food", key: "apple", label: "蘋果" },
  at: <serverTimestamp>
}

backups/{restoreCode}               // doc ID 就是 10 碼還原碼本身,不放在 players 底下
{
  playerId: "players/{id}",
  snapshot: { ...完整一個小孩存檔的資料,結構同 store.js 的 pet blob(slot/species/levels/daily/points/inv/growth/collection/childNickname...) },
  updatedAt: <serverTimestamp>
}
```

### 本機快取(不是 Firestore,是瀏覽器 `localStorage`)

`pls.cloud.<slot>`(例:`pls.cloud.kidL`)存放這台裝置「這個小孩」的雲端連結資訊:

```jsonc
{
  "playerId": "...",
  "friendCode": "K7M2Q9",
  "restoreCode": "K7M2Q9XYZ1",
  "lastBackupAt": 1750000000000,       // epoch ms,家長區「上次雲端備份」顯示用
  "lastVisitLogCheckAt": 1750000000000 // epoch ms,見下方「拜訪分享」——本機游標,判斷哪些 visitLog 是新的
}
```

**小朋友暱稱不存在這裡**:`childNickname` 是 `app/store.js` pet blob 的正式欄位(schema v11,見
`docs/export-import-schema.md`),`app/cloud.js` 每次要上傳/顯示暱稱一律直接 `ST.load(slot).childNickname`
讀取,不自己維護一份會失步的副本。換裝置用「匯入進度」或還原碼救回進度,**小朋友暱稱會跟著進度一起回來**,
不用重新輸入;這台新裝置仍然會拿到**全新的好友代碼/還原碼**(不延續原本的雲端好友清單)。

---

## 兩種代碼、為什麼分開

| | 好友代碼 friendCode | 還原碼 restoreCode |
|---|---|---|
| 長度 | 6 碼 | 10 碼 |
| 字元集 | `ABCDEFGHJKMNPQRSTUVWXYZ23456789`(排除易混淆的 `0/O/1/I/L`) | 同左 |
| 存放位置 | `players/{id}.friendCode`(公開欄位) | `players/{id}/private/meta.restoreCode`(私有子文件) |
| 誰看得到 | 小朋友自己的「好友」面板,設計上就是要念給同學聽、拿去交換的 | **只出現在家長區**,不在好友面板露出;家長弄丟了可請維運者用好友代碼查回 |
| 用途 | 加好友 | 家長在新裝置/App 被清掉後,救回完整進度 |
| 對應 Firestore doc | `friendCodes/{code}` → `playerId` | `backups/{restoreCode}` → `playerId` + `snapshot` |

兩者長度與出現位置刻意不同,避免小孩隨手分享好友代碼時,連帶洩漏了「能讀回完整進度備份」的還原碼。

**加好友是雙向的(v4)**:輸入對方的好友代碼加好友時,`app/cloud.js` 的 `addFriendByCode` 一次 batch
寫入兩筆 `friends` 文件——自己清單下代表對方的一筆、對方清單下代表自己的一筆——對方完全不用再輸入一次
代碼,下次打開好友面板就會自動看到我。`firestore.rules` 允許「建立自己清單裡的一筆」或「在任何人的
清單裡建立代表自己的一筆」,所以沒有人能幫別人偽造好友關係(最多只能把自己加進別人的清單,而對方本來
就是因為分享了代碼才會被加)。

**好友清單只顯示小朋友暱稱,不顯示目前養的物種**:物種是小孩底下會換的屬性(換寵物/畢業都會變),
用「暱稱的物種」當好友的顯示名稱容易讓人誤以為加的是某一隻特定寵物,所以 `index.html` 的好友清單
(`renderFriendList`)與加好友確認文字一律只顯示 `childNickname`。

**還原流程是兩步驟確認**(`app/cloud.js` 的 `lookupRestoreCode` + `restoreFromCode`):家長先輸入還原碼查詢,
系統查 `backups/{code}` → `players/{playerId}` 帶出「這組還原碼是哪個小朋友、養哪種寵物的進度」給家長看過,
家長確認內容無誤後,才選要蓋掉本機哪一個小孩(`kidL` 左邊格 / `kidR` 右邊格,這一步無法省略,但不再是家長
憑印象瞎選,而是看過還原碼實際內容之後的知情選擇)。

---

## 自動備份的節流節奏

- `app/store.js` 的 `save(d)`(所有本機寫入的唯一入口)每次存檔都呼叫 `PLS_CLOUD.markDirty(d.slot)`,
  只是標記「這個小孩有未上傳的變更」,不會立刻打 Firestore。
- `app/cloud.js` 內部每 **90 秒**跑一次定時器,把有變更的小孩完整快照寫進 `backups/{restoreCode}.snapshot`,
  同時更新 `players/{id}.status`(含目前 `species`)與 `private/meta.lastSeenAt`。多次快速的本機 `save()`
  (例如寫一整輪手寫練習、或連續餵食/陪玩觸發十幾次存檔)會被合併成下一次 tick 的**一次**雲端寫入。
- 額外掛 `visibilitychange`:分頁切到背景時盡力再 flush 一次,降低「剛好在兩次定時備份中間關掉 App」漏存的機率。
- 失敗(離線/規則拒絕等)會把該小孩留在「未上傳」狀態,等下一次 tick 自動重試,不會丟例外、不會卡住 UI。

## 拜訪的每日限制

`players/{id}/visits/{friendPlayerId}_{today}` 只允許 **create、不允許 update**(見 `firestore.rules`)。
doc 已存在時 `create` 規則天然不適用,等於「今天已經拜訪過這位朋友就寫不進去」的原子日限制,不需要
額外的伺服器端邏輯或時間戳比對。限制是「每位朋友每天一次」,不是「每天只能拜訪任何一位朋友」——
今天拜訪過 A,仍可以在同一天拜訪 B。

## 拜訪分享(帶自己的寵物、送食物/玩具給對方)

- `visitFriend` 成功後,`app/visit.js` 讓訪客帶著自己的寵物一起走進對方房間(純本機畫面,重用
  `app/room.js` 匯出的 `window.PLS_ROOM2` 共用繪製元件——屋頂厚木框、地板、寵物定位/走位——不動
  Firestore),並可以從自己背包(`inv.foods` / `inv.gold` / `inv.toys`,跟餵食/陪玩同一個背包)裡挑一項
  分享給主人——**一次拜訪限分享一次**,沿用既有「每位朋友每天一次」的拜訪鎖,不用另外做分享次數的鎖。
- 分享動作呼叫 `app/cloud.js` 的 `shareGift(slot, friendId, gift)`,只會在主人的 `players/{hostId}/visitLog`
  底下 **新增一筆**(create-only,見 `firestore.rules`)。這個集合跟 `players/{hostId}` 本身的
  `status`/`points` 完全無關——**從架構上就不可能碰到主人寵物的成長值/點數/背包/關卡進度**,不是靠應用層
  小心檢查,而是訪客的寫入權限本來就只到 `visitLog`,連 `players/{hostId}` 的其他欄位都寫不到(`firestore.rules`
  的 `players/{playerId}` `update` 規則限定只有擁有者能改,`visitLog` 是獨立的子集合、獨立的規則)。
- 訪客這端會 `pet.giftsGiven++` 後 `ST.save(d)`(schema v11 新欄位,小統計,不影響經驗值/點數)。
- 主人這端沒有即時通知(沒有 push,純前端單機 App 沒有背景常駐),而是在小朋友下次打開房間(`app/room.js`
  的 `enter()`,自然的「回來上線」時機)時呼叫 `checkVisitLog(slot)`,讀 `visitLog` 裡 `at` 晚於本機游標
  (`pls.cloud.<slot>.lastVisitLogCheckAt`)的紀錄,疊一張可點掉的橫幅通知「🎁 OO的OO 拜訪過你,分享了
  『XX』!」。點掉時只更新本機游標,**不寫回 Firestore**——`visitLog` 的 entry 本身永遠不會被 update/delete,
  「已讀」純粹是本機狀態。

## 好友隨機來家裡玩(被動來訪,v4)

- 跟上面「拜訪好友」(小朋友主動點「拜訪」去對方家)不同方向:這是**朋友偶爾主動來我家玩**,純演出、
  不需要對方裝置同時在線(不是 realtime)。`app/room.js` 的 `enter()` 本來就有「雙寵物互訪」——每次
  進房 1/3 機率讓另一個小孩(手足)的寵物走進來作客——這次是幫同一套演出(`this._visit` / `updateVisit`)
  多接一個訪客來源:**只有這次進房手足沒被抽到時**,才會非同步呼叫 `listFriends(slot)`,從好友清單裡
  (用上次同步到的 `status` 快照,不是即時資料)過濾出有 `species`/`status` 的朋友,以同樣 1/3 機率
  隨機抽一位走進來,`this._visit.name` 用朋友的 `childNickname`(不是物種名),其餘走位/一起吃點心/
  可以摸摸/道別離開的邏輯完全共用,不用另外寫一套。
- **沒有任何 Firestore 寫入**:純粹讀 `listFriends` 已有的唯讀快照決定要不要來,不記錄「來訪過」、
  不影響 `visits`(每日拜訪鎖)或 `visitLog`(拜訪分享)——那兩個是「主動拜訪」流程專屬的資料。
- 手足互訪與好友互訪互斥(同一次進房最多一位訪客),避免小房間同時塞三隻寵物。

---

## 維運後台(`admin.html` + `app/admin.js`)的權限邊界

- 登入方式是 Firebase **Email/Password**,跟小朋友用的**匿名登入**是完全不同的帳號系統,兩者互不相通。
- **誰是 admin 由 `firestore.rules` 寫死判斷,不是「每個家長都能開後台」**:
  ```
  function isAdmin() {
    return request.auth != null && request.auth.token.email == 'minglight0811@gmail.com';
  }
  ```
  只有 Firebase Console → Authentication → Users 裡手動建立、email 完全相符的那一個帳號,才會通過
  `isAdmin()`。一般家長全程用匿名登入,不會、也不需要建立 Email/Password 帳號,所以不會意外拿到 admin 權限;
  之後要加第二個管理員,就把這裡改成 `request.auth.token.email in [...]` 的清單比對。
- `admin.html` 這個頁面本身**刻意不加密網址、不做混淆路徑**——真正的防線是上面這條 Firestore 規則,
  不是網址保密。就算有人挖到網址,沒有這組帳密登入,Firestore 會直接拒絕所有 `list` 與
  `private/meta` 讀取。
- **admin 能看到什麼**:`players` 集合的 `list`(依物種分類的總人數統計——8 種各自的 player 數,不再只有
  兔兔/倉鼠兩欄——與依 `status.updatedAt` 排序的最近活躍清單:暱稱/物種/好友代碼/最後同步時間)、
  `private/meta`(查還原碼轉交家長用)。
- **admin 看不到什麼(刻意排除)**:`backups/{restoreCode}` 的內容(`firestore.rules` 完全沒有給
  admin 讀取權限,只有本人裝置能讀寫自己的備份)、任何關卡/答題等學習細節(`status` 快照只有
  `species`/`name`/`stage`/`growDeco`/`points`,不含 `levels`/`inv`)。admin 的還原流程是「查到還原碼 →
  轉交家長 → 家長自己在 App 的家長區輸入還原碼」,維運者本人不會經手小孩的實際進度內容。
- `admin.html` / `app/admin.js` **不放進 `sw.js` 的 `ASSETS`**,不支援離線,也不從任何小孩看得到的畫面
  連結過去——後台本來就需要即時連網查詢最新資料。

---

## XSS 防護(所有跨使用者內容一律 `textContent`)

`childNickname`、`petName`、`visitLog` 裡的 `fromNickname`/`gift.label` 等欄位是「別人輸入、顯示在我的裝置上」的
跨使用者內容,理論上可以繞過遊戲 UI 直接呼叫 Firestore API 塞入異常字串。`firestore.rules` 在寫入端限制了型別
與長度,但顯示端仍要防守:`index.html` 的 `#friends-overlay`、`app/visit.js`、`app/room.js` 的拜訪通知橫幅、
`admin.html` 渲染任何從 Firestore 拿回來的字串,一律用 `textContent` / `createTextNode`(canvas 畫面則用
`ctx.fillText`,同樣不經過任何會解析 HTML 的路徑),**絕不用 `innerHTML`**。

---

## 每次改動這組功能後的驗證清單

- [ ] 動到 `players` / `friendCodes` / `friends` / `visits` / `visitLog` / `backups` 任一集合的欄位 → 已同步更新本檔的結構說明。
- [ ] 動到欄位存取權限 → 已同步更新 `firestore.rules`,並重新檢查 `isOwner()` 的 `get()` 有沒有踩到
      「同一個 batch 裡的 get() 看不到同批次其他文件」這個限制(見 `firestore.rules` 檔頭註解)。
- [ ] 用一份雲端功能上線前的舊版「匯出進度」JSON 檔測試匯入 → 應該完全正常(雲端連結資訊不在匯出檔裡)。
- [ ] 離線測試:好友面板顯示「無法連線」、家長區雲端備份顯示「尚未產生(需連網)」,其餘功能不受影響。
- [ ] 動到的檔案若在 `sw.js` 的 `ASSETS` 內(`app/cloud.js`、`app/visit.js` 等)→ `sw.js` 的 `VERSION` 已 +1;
      `admin.html` / `app/admin.js` 則刻意不用管這條(不在 `ASSETS` 內)。

---

## 版本歷史

### v1(2026-08,初版)
- 建立 `players` / `players/private/meta` / `friendCodes` / `players/friends` / `players/visits` / `backups`
  六個集合;好友代碼(6 碼)與還原碼(10 碼)分開存放;自動備份每 90 秒節流一次;拜訪每日一次
  (create-only 原子鎖);維運後台 Email/Password 登入 + `isAdmin()` 權限邊界。

### v2(2026-08,小朋友身份重構 + 互動式拜訪)
- **修正設計誤區**:雲端身份/備份/還原原本容易被誤認成是「綁在寵物種類上」(還原 UI 曾經是先選物種下拉選單、
  才輸入還原碼);正確階層是「小朋友(暱稱)→ 目前寵物(種類+名字)」,暱稱才是身份錨點。
- `players/{id}.childNickname` 改成同步自 `app/store.js` pet blob 的正式欄位,不再由 `app/cloud.js` 自己
  維護一份只存在本機快取的側寫副本——換裝置匯入/還原後暱稱不再消失。
- 還原流程改成兩步驟確認:`lookupRestoreCode` 先查代碼帶出「哪個小朋友、哪種寵物」給家長確認,家長看過內容
  才選要蓋掉本機哪一格,不再是瞎猜物種。
- 新增 `players/{id}/visitLog/{entryId}` 集合(create-only 訪客留言簿):拜訪好友時可以帶自己的寵物、分享
  自己裝備的食物/玩具給對方,寫入只會落在這個獨立集合,結構上不可能影響主人的核心進度欄位。主人下次開房間
  會看到「OO的OO 拜訪過你,分享了『XX』」的橫幅通知(純本機游標判斷已讀,不寫回 Firestore)。
- 寵物 blob 新增 `giftsGiven`(分享次數小統計),分享動作會觸發一次 `ST.save()`。

### v3(2026-08,對齊「以小孩為單位」的電子雞化架構)
> 這次是**整合**,不是重新設計:本機遊戲另一條開發線(`app/store.js` schema v9/v10)獨立把存檔單位從
> 「物種」改成「小孩(slot)」、拿掉了佈置(`home`)功能、換成背包(`inv`)經濟,並且物種變成小孩底下
> 可以換的屬性(換寵物/畢業)。這組雲端功能原本就把「暱稱/小孩」當身份錨點(見 v2),理念完全一致,
> 這次只是把實作對齊過去。
- **識別單位不變(仍是小孩),但參數名稱從 `petId` 改成 `slot`**:`app/cloud.js` 所有方法(`ensureLinked`/
  `createPlayer`/`flushPet`/`restoreFromCode`/`addFriendByCode`/`listFriends`/`visitFriend`/`shareGift`/
  `checkVisitLog`...)一律以 `slot`(`kidL`/`kidR`)為主參數;本機快取鍵從 `pls.cloud.<petId>` 改成
  `pls.cloud.<slot>`。
- **`petKind` 欄位改名為 `species`,且從「不可變更」改成「可變更」**:舊版把物種寫死成建立後不可改的欄位
  (`petKind in ['rabbit','hamster']`);新架構下小孩會換寵物、大寶會畢業重選,物種不再是穩定值,所以
  `firestore.rules` 的 `players/{id}` `update` 規則**移除了物種不可變的限制**,改成一般型別/長度驗證
  (字串、1–20 字,不再寫死只能是兔兔/倉鼠兩選一——現在有 8 種可養物種)。`visitLog` 的 `fromPetKind`
  同步改名 `fromSpecies`。
- **`status` 快照改版**(因為 `home` 佈置功能已經拿掉、`hwEarned` 不再是拜訪時該露出的資訊):
  舊 `{ points, hwEarned, home }` → 新 `{ species, name, stage, growDeco, points }`(`stage`/`growDeco`
  取自 `ST.growthInfo()`,拜訪畫面靠這兩個欄位正確畫出朋友寵物目前的成長階段與配件款式)。
- **拜訪分享的物品來源改變**:佈置功能(`home.foods`/`home.toys`,固定 3+3 格)已整個移除,`app/visit.js`
  改成讀訪客自己的背包(`ST.invList(d,'foods'|'gold'|'toys')`,跟餵食/陪玩同一份庫存)當作可分享清單。
- **`app/visit.js` 畫面重畫**:不再呼叫已經不存在的 `PLS_ROOM2.drawScene`,改用 `app/room.js` 匯出的
  `window.PLS_ROOM2`(`roofFrame`/`roomInterior`/`petAt`/`wanderStep`/`walkStep`...)組出朋友房間,並讓
  訪客自己的寵物用 `walkStep` 從畫面邊緣走進來,朋友的寵物用 `wanderStep` 在房間裡逛——視覺語言跟自己
  房間(`app/room.js`)一致,不是另一套獨立美術。
- **維運後台總覽改成 8 種物種各自計數**(`countByKind('rabbit')`/`countByKind('hamster')` 兩欄 →
  依 `CFG.pets` 動態列出每個物種各自的 player 數),其餘 admin 權限邊界不變。
- **本機 schema 版本號同步**:`app/store.js` 的 `SCHEMA_VERSION` 因為這次整合(疊加在電子雞化 v10 之上)
  變成 **v11**,詳見 `docs/export-import-schema.md`「v11」段落——`childNickname`/`giftsGiven` 欄位本身
  沒有變(仍是 v2 就有的欄位),只是版本號因為疊加在新的本機 schema 基準上而順移。

### v4(2026-08,雙向好友 + 好友隨機來訪 + 好友代碼複製)
- **加好友改成雙向**:`addFriendByCode` 一次 batch 寫入雙方各自清單下代表對方的一筆,`firestore.rules`
  的 `friends` create 規則放寬成「建自己清單裡的一筆」或「在任何人清單裡建代表自己的一筆」,對方不用
  再輸入一次代碼就會自動看到我(見上方「兩種代碼、為什麼分開」節)。
- **好友清單顯示改成只顯示小朋友暱稱**,不再是「暱稱的物種」——物種會隨換寵物/畢業改變,不該當成好友
  的識別名稱(`index.html` 的 `renderFriendList` 與加好友確認文字)。
- **新增「好友隨機來家裡玩」的被動來訪**(純演出,無新的 Firestore 寫入):見上方「好友隨機來家裡玩」節,
  跟既有的雙寵物互訪共用同一套 `app/room.js` 演出邏輯。
- **好友代碼加上一鍵複製按鈕**(`index.html` 的 `#copy-code-btn`),純前端 UI 改動,無資料結構變更。

### v5(2026-08,拜訪「獎盃」— 難易度分級獎勵疊加功能)
- **`status` 新增 `trophy`**(number,= 目前破到第幾關,`store.js trophyNumber()` 計算)——拜訪好友時的
  新亮點,讓小朋友看到「哇,他解到第 N 關了!」。刻意只給一個數字,不給關卡明細/答對率/背包內容,維持
  `status` 原本「不含學習細節」的邊界(見上方 `status` 註解)。
- **`firestore.rules` 不用改**:`status` 一直只驗證 `is map`(未對內部欄位 `.hasOnly()`),新增欄位天然合法。
- **前置條件**:`config.js` 的 `u6`–`u9` 取消 `alwaysOpen`,恢復序列鎖(本機 schema 變更,見
  `docs/export-import-schema.md`「v12」段落),讓「破到第幾關」對所有關卡都是單純的序列位置,不用另外
  處理「常開關卡插隊」的情況。
- 同一批(v12)還疊加了「難易度分級獎勵」(過關次數上限依入門/進階分層、家長區可調),那部分是純本機
  `store.js`/`config.js` 變更,不影響這份雲端 schema,詳見 `docs/export-import-schema.md`。

### v6(2026-08,拜訪時可以看朋友的收集圖鑑/珍藏館/配件圖鑑 + 英文獎盃)
- **`status` 新增四個欄位**(`app/cloud.js` `statusSnapshot()`):`dex`(收集圖鑑,同步自 `pet.dex.foods`/`toys`
  的 key 清單,各裁到最多 60 筆)、`decoDex`(配件圖鑑,同步自 `pet.decoDex`)、`collection`(珍藏館畢業寶貝牆,
  同步自 `pet.collection`,只留最近 40 筆、每筆 `name` 裁到 12 字)、`trophyEn`(英文破到第幾關,`store.js`
  新增的 `trophyNumberEnglish()`,算法跟既有的 `trophyNumber()` 共用同一個 `trophyNumberFor(d, list)`,只是
  換成走 `CFG.english` 序列)。刻意排除 `inv`(背包目前庫存數量)與 `levels`(關卡明細/答對率)——dex/collection
  只回答「曾經收集過什麼」,不會洩漏「現在還剩多少/答得好不好」,維持 `status` 原本的隱私邊界(見上方 `status`
  註解)。拜訪畫面 `app/visit.js` 跟自己房間 `app/room.js` 一樣,`trophyBadge` 現在呼叫兩次疊在一起(數學🧮
  在下、英文🔤在上),讓拜訪者同時看到朋友兩科各解到第幾關。
- **`firestore.rules` 不用改**:跟 v5 的 `trophy` 一樣,`status` 一直只驗證 `is map`(未對內部欄位
  `.hasOnly()`),新增欄位天然合法。
- **`app/dex.js` 新增「朋友模式」**:`enter()` 多接受 `params.friendView`(好友的唯讀物件,含上面的
  `status`),食物/玩具圖鑑改讀這份快照而不是 `ST.load()`;多兩個唯讀區塊——珍藏館縮圖牆(用
  `window.PLS_PETS.draw` 畫,不能點進去換裝)、配件圖鑑(借用 `ST.decoOwned()` 邏輯,每物種一排 5 個點)。
  朋友模式的返回鈕回 `visit` 畫面,不是 `room`。
- **`app/dex.js` 同時補了「哪一關拿到的」hover 提示**(自己/朋友的收集圖鑑都有):純靜態算法,依
  `config.js` 的 `math`/`english` 關卡順序找「第一個給這個 key 的關卡」當來源標籤,不需要另外存檔記錄——
  沒有新增本機 schema 欄位,`app/store.js` 的 `SCHEMA_VERSION` 不受影響。
- **`app/visit.js` 新增「看圖鑑」按鈕**,導去 `dex` 畫面的朋友模式。

<!-- 新版本請依此格式往上加:
### v7(YYYY-MM,變更摘要)
- 新增/變更欄位 X;同步更新 firestore.rules 與相關程式。
-->
