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
3. 讓朋友之間唯讀互訪一次/天。

離線或 `app/config.js` 的 `CFG.firebase` 未設定時,`app/cloud.js` 的所有方法都安靜地不做事、
回傳可辨識的失敗物件,絕不影響數學/英文/手寫/積分/家長區等既有功能。

---

## Firestore 集合結構

```jsonc
players/{playerId}                  // playerId = Firestore 自動 ID
{
  ownerUid: "abc123...",            // 這台裝置的匿名登入 uid
  petKind: "rabbit",                // "rabbit" | "hamster"。目前只是顯示屬性,不是識別單位(見下方說明)
  childNickname: "小明",             // 同步自 app/store.js pet blob 的 childNickname(schema v4 起),獨立於 pet.name
  petName: "阿福",                   // 同步自 pet.name(可能是 null → 存空字串),顯示房間標題用
  friendCode: "K7M2Q9",             // 6 碼好友代碼
  status: {                         // 拜訪時看到的唯讀快照(節流上傳,不是即時)
    points: 12,
    hwEarned: 8,
    home: { foods: [...3 格...], toys: [...3 格...] },
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

players/{playerId}/friends/{friendPlayerId}   // 單向好友清單,只有擁有者能讀寫
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
  fromPetKind: "hamster",
  fromPetName: "球球",
  gift: { type: "food", key: "apple", label: "蘋果" },
  at: <serverTimestamp>
}

backups/{restoreCode}               // doc ID 就是 10 碼還原碼本身,不放在 players 底下
{
  playerId: "players/{id}",
  snapshot: { ...完整一隻寵物的資料,結構同 store.js 的 pet blob(levels/daily/points/hwEarned/hwRound/home/name) },
  updatedAt: <serverTimestamp>
}
```

### 本機快取(不是 Firestore,是瀏覽器 `localStorage`)

`pls.cloud.<petId>`(例:`pls.cloud.rabbit`)存放這台裝置「這隻寵物」的雲端連結資訊:

```jsonc
{
  "playerId": "...",
  "friendCode": "K7M2Q9",
  "restoreCode": "K7M2Q9XYZ1",
  "lastBackupAt": 1750000000000,       // epoch ms,家長區「上次雲端備份」顯示用
  "lastVisitLogCheckAt": 1750000000000 // epoch ms,見下方「拜訪分享」——本機游標,判斷哪些 visitLog 是新的
}
```

**v4 變更(重要)**:`childNickname`(小朋友暱稱)**不再存在這裡**——原本是這個 key 的一個欄位,獨立於
`pls.<petId>`(pet 本身的 schema)之外,不進 `SCHEMA_VERSION`、不進「匯出進度」JSON 檔,這是換裝置匯入/還原後
暱稱會消失的根源,也是「用寵物種類當識別單位」這個設計誤區的本機根源。**schema v4 起,`childNickname` 已經是
`app/store.js` pet blob 的正式欄位**(見 `docs/export-import-schema.md` v4),`app/cloud.js` 每次要上傳/顯示暱稱
一律直接 `ST.load(petId).childNickname` 讀取,不再自己維護一份會失步的副本。實際影響:
- 換裝置用「匯入進度」或還原碼救回進度,**小朋友暱稱會跟著進度一起回來**,不用重新輸入。
- 這台新裝置仍然會拿到**全新的好友代碼/還原碼**(不延續原本的雲端好友清單)——這點沒變,雲端身份本身
  (`playerId`/`friendCode`)還是跟著裝置走,只是識別用的暱稱不會再失去。

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

**還原流程是兩步驟確認**(`app/cloud.js` 的 `lookupRestoreCode` + `restoreFromCode`):家長先輸入還原碼查詢,
系統查 `backups/{code}` → `players/{playerId}` 帶出「這組還原碼是哪個小朋友、哪種寵物的進度」給家長看過,
家長確認內容無誤後,才選要蓋掉本機哪一格(本機仍是固定的兔兔/倉鼠兩格,這一步無法省略,但不再是家長憑印象
瞎選物種、選錯了才發現)。

---

## 自動備份的節流節奏

- `app/store.js` 的 `save(d)`(所有本機寫入的唯一入口)每次存檔都呼叫 `PLS_CLOUD.markDirty(petId)`,
  只是標記「這隻寵物有未上傳的變更」,不會立刻打 Firestore。
- `app/cloud.js` 內部每 **90 秒**跑一次定時器,把有變更的寵物完整快照寫進 `backups/{restoreCode}.snapshot`,
  同時更新 `players/{id}.status` 與 `private/meta.lastSeenAt`。多次快速的本機 `save()`
  (例如寫一整輪手寫練習觸發十幾次存檔)會被合併成下一次 tick 的**一次**雲端寫入。
- 額外掛 `visibilitychange`:分頁切到背景時盡力再 flush 一次,降低「剛好在兩次定時備份中間關掉 App」漏存的機率。
- 失敗(離線/規則拒絕等)會把該寵物留在「未上傳」狀態,等下一次 tick 自動重試,不會丟例外、不會卡住 UI。

## 拜訪的每日限制

`players/{id}/visits/{friendPlayerId}_{today}` 只允許 **create、不允許 update**(見 `firestore.rules`)。
doc 已存在時 `create` 規則天然不適用,等於「今天已經拜訪過這位朋友就寫不進去」的原子日限制,不需要
額外的伺服器端邏輯或時間戳比對。限制是「每位朋友每天一次」,不是「每天只能拜訪任何一位朋友」——
今天拜訪過 A,仍可以在同一天拜訪 B。

## 拜訪分享(帶自己的寵物、送食物/玩具給對方)

- `visitFriend` 成功後,`app/visit.js` 讓訪客帶著自己的寵物一起出現在對方房間(純本機畫面,重用
  `app/room.js` 的 `drawScene`/`petAt`,不動 Firestore),並可以從自己目前裝備的 `home.foods`/`home.toys`
  裡挑一項分享給主人——**一次拜訪限分享一次**,沿用既有「每位朋友每天一次」的拜訪鎖,不用另外做分享次數的鎖。
- 分享動作呼叫 `app/cloud.js` 的 `shareGift(petId, friendId, gift)`,只會在主人的 `players/{hostId}/visitLog`
  底下 **新增一筆**(create-only,見 `firestore.rules`)。這個集合跟 `players/{hostId}` 本身的
  `status`/`levels`/`points` 完全無關——**從架構上就不可能碰到主人寵物的經驗值/點數/進度**,不是靠應用層
  小心檢查,而是訪客的寫入權限本來就只到 `visitLog`,連 `players/{hostId}` 的其他欄位都寫不到(`firestore.rules`
  的 `players/{playerId}` `update` 規則限定只有擁有者能改,`visitLog` 是獨立的子集合、獨立的規則)。
- 訪客這端會 `pet.giftsGiven++` 後 `ST.save(d)`(schema v4 新欄位,小統計,不影響經驗值/點數)——這是「跟寵物
  互動玩也要存檔」的落地。
- 主人這端沒有即時通知(沒有 push,純前端單機 App 沒有背景常駐),而是在小朋友下次打開房間(`app/room.js`
  的 `enter()`,自然的「回來上線」時機)時呼叫 `checkVisitLog(petId)`,讀 `visitLog` 裡 `at` 晚於本機游標
  (`pls.cloud.<petId>.lastVisitLogCheckAt`)的紀錄,疊一張可點掉的橫幅通知「🎁 OO的OO 拜訪過你,分享了
  『XX』!」。點掉時只更新本機游標,**不寫回 Firestore**——`visitLog` 的 entry 本身永遠不會被 update/delete,
  「已讀」純粹是本機狀態。

---

## 維運後台(`admin.html` + `app/admin.js`)的權限邊界

- 登入方式是 Firebase **Email/Password**,跟小朋友用的**匿名登入**是完全不同的帳號系統,兩者互不相通。
- 誰是 admin 由 `firestore.rules` 寫死判斷:
  ```
  function isAdmin() {
    return request.auth != null && request.auth.token.email == '<你的管理員 email>';
  }
  ```
  只有 Firebase Console → Authentication → Users 裡手動建立、email 完全相符的那一個帳號,才會通過
  `isAdmin()`。一般家長全程用匿名登入,不會、也不需要建立 Email/Password 帳號,所以不會意外拿到 admin 權限。
- `admin.html` 這個頁面本身**刻意不加密網址、不做混淆路徑**——真正的防線是上面這條 Firestore 規則,
  不是網址保密。就算有人挖到網址,沒有這組帳密登入,Firestore 會直接拒絕所有 `list` 與
  `private/meta` 讀取。
- **admin 能看到什麼**:`players` 集合的 `list`(總人數統計、依 `status.updatedAt` 排序的最近活躍清單:
  暱稱/寵物種類/好友代碼/最後同步時間)、`private/meta`(查還原碼轉交家長用)。
- **admin 看不到什麼(刻意排除)**:`backups/{restoreCode}` 的內容(`firestore.rules` 完全沒有給
  admin 讀取權限,只有本人裝置能讀寫自己的備份)、任何關卡/答題等學習細節(`status` 快照只有
  `points`/`hwEarned`/`home`,不含 `levels`)。admin 的還原流程是「查到還原碼 → 轉交家長 → 家長自己在
  App 的家長區輸入還原碼」,維運者本人不會經手小孩的實際進度內容。
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
- [ ] 離線測試:好友面板顯示「無法連線」、家長區雲端備份顯示「尚未備份」,其餘功能不受影響。
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
- `players/{id}.childNickname` 改成同步自 `app/store.js` pet blob 的正式欄位(見 `docs/export-import-schema.md`
  v4),不再由 `app/cloud.js` 自己維護一份只存在 `pls.cloud.<petId>` 的側寫副本——換裝置匯入/還原後暱稱不再消失。
- 還原流程改成兩步驟確認:`lookupRestoreCode` 先查代碼帶出「哪個小朋友、哪種寵物」給家長確認,家長看過內容
  才選要蓋掉本機哪一格,不再是瞎猜物種。
- 新增 `players/{id}/visitLog/{entryId}` 集合(create-only 訪客留言簿):拜訪好友時可以帶自己的寵物、分享
  自己裝備的食物/玩具給對方,寫入只會落在這個獨立集合,結構上不可能影響主人的 `status`/`levels`/`points`。
  主人下次開房間會看到「OO的OO 拜訪過你,分享了『XX』」的橫幅通知(純本機游標判斷已讀,不寫回 Firestore)。
- 寵物 blob 新增 `giftsGiven`(分享次數小統計),分享動作會觸發一次 `ST.save()`。

<!-- 新版本請依此格式往上加:
### v3(YYYY-MM,變更摘要)
- 新增/變更欄位 X;同步更新 firestore.rules 與相關程式。
-->
