# 新增寵物物種(actor 架構)— 檢查清單

> 本檔是「寫程式接一隻新寵物」的 SOP,不是設計端的 prompt 模板 —— 那份是 `docs/design-brief.md` 的 C1 章節,
> 兩份文件分工不同:**design-brief.md 給外部設計師/自己發想造型時用**(要交出什麼動作表、節奏參數、bounds);
> **這份給拿到造型設定之後,真的要寫 `app/actors/<species>.js` 的人用**(欄位怎麼填、引擎會幫你檢查什麼、常見誤區)。
> 相關程式:`app/actor.js`(引擎,`window.PLS_ACTOR`)、`app/actors/*.js`(各物種)、`app/actors/_template.js`(複製起點)、
> `actor-preview.html`(視覺化預覽,不進 `sw.js` 的 `ASSETS`)。

---

## 為什麼需要這份清單

`app/actor.js` 的 `define()` 過去只檢查 `draw` 是不是函式,其餘欄位(`bounds`/`locomotion`/`holds`/`ambient`)寫錯、漏寫、打錯字都不會有任何提示 —— 只會安靜套用預設值,或是在畫面上長成很奇怪的樣子才被發現。而且過去 `husky.js`/`chick.js` 兩個範例檔都在傳給 `define()` 的 spec 裡塞了一個 `stages: STAGES`,結果**引擎從來沒有讀過這個欄位**——三個成長階段的比例其實是兩個檔案各自在 `draw()` 內部讀自己的局部 `STAGES` 常數做的,跟傳進 `define()` 的那個欄位完全無關。這種「看起來是契約,其實是死欄位」的落差,新物種抄舊檔案的寫法就會一路複製下去。

現在 `define()` 已經加了執行期檢查(見下方),但檢查只能抓「型別錯」「打錯字」這種機械性問題,抓不出「這隻動物看起來不像那種動物」——那部分要靠人眼配合 `actor-preview.html` 判斷。

---

## 一、新增一隻物種,照這個順序做

1. **複製樣板**:`cp app/actors/_template.js app/actors/<species>.js`,改寫成這隻動物真正的樣子。
   **不要抽共用造型函式出去**——重複的程式碼是刻意的,哈士奇的腿跟小雞的腿本來就不該是同一段程式(見 `app/actor.js` 開頭的架構說明)。
2. **接進 `index.html`**:在 `<script>` 清單裡加一行 `<script src="app/actors/<species>.js"></script>`,位置放在 `app/actor.js` 之後。
3. **接進 `sw.js` 的 `ASSETS`**,並把 `VERSION` +1(否則玩家吃舊快取看不到新檔案)。
4. **加進 `config.js` 的 `PLS_CONFIG.pets`**:名字、主題色、幼幼選寵物格會用到。
5. **(選用)接進 `actor-preview.html`**:加一行 `<script src="app/actors/<species>.js"></script>` + 一個 `panel('<species>', ...)` 呼叫,方便單獨盯著這隻動物調整,不用整個 App 一起跑。
6. **對照下面的「驗收清單」跑一遍**,再合併。

---

## 二、`A.define(species, spec)` 的欄位表

| 欄位 | 必填 | 說明 |
|---|---|---|
| `draw(ctx, t, st)` | ✅ | 唯一的造型入口。缺這個 `define()` 會直接 `throw`(這是唯一會中斷載入的錯誤,因為連跑都跑不起來)。 |
| `bounds` | 建議填 | `{top, bottom, halfWidth}`。原點 = 腳底中心,y 向上為負;`top` 是最高點(負值)、`bottom` 是影子/腳掌最低點(通常是小正數)、`halfWidth` 是最寬處的一半。**沒有統一外框**,每隻自己報自己的框,縮圖/圖鑑靠這個反推縮放(`PLS_ACTOR.spanOf`/`fitScale`)。 |
| `mirror` | 否(預設 `false`) | `true` = 有方向的側身造型,朝左時引擎會整隻鏡射。正面呆呆、走路只靠五官視差偏移表達方向的物種(小雞這種)**不要開**,開了會變成左右翻的娃娃。 |
| `locomotion` | 否(有預設值) | `{speed, legFreq, tailFreq, lean, gait, leanEase, ampEase}`。走路多快、邁步/擺尾頻率、走路時前傾多少。`gait` 只是給自己 `draw()` 讀的提示字串,引擎不解讀。 |
| `ambient` | 否(有預設值) | `{min, max, pool:[{action, weight}]}`。沒人理牠時多久做一次自發行為、從哪些語意動作裡抽。 |
| `holds` | 否(有預設值) | 每個語意動作演多久自動回到 `idle`(`walk` 不受限,由房間的移動狀態控制)。 |

**沒有 `stages` 欄位。** 三個成長階段(`baby`/`kid`/`grown`)的比例差異是每個物種自己的事 —— 請在檔案內部自己定義一個局部 `STAGES` 常數,`draw(ctx, t, st)` 裡用 `STAGES[st.stage] || STAGES.kid` 自己讀,不要傳進 `spec.stages`。傳了會被 `console.error` 提醒(不會擋載入,只是提醒你這欄位沒用)。

---

## 三、執行期驗證會抓什麼、不會抓什麼

`define()` 現在會在**每次載入時**(不分開發/正式環境,所有玩家都會跑到)做這些檢查,**檢查不通過只印 `console.error` 警告、不會中斷 App 載入**——跟這個專案一貫的 fail-soft 原則一致,一隻新物種寫錯一個欄位不該讓所有小孩的 App 直接白屏:

- `bounds.top`/`bounds.bottom`/`bounds.halfWidth` 是不是數字。
- `bounds.top < bounds.bottom`(方向沒有搞反 —— 常見誤區,見下一節)。
- `bounds.halfWidth` 是不是正數。
- `holds` 的 key 是不是引擎認得的 10 個語意動作之一(抓打錯字,例如寫成 `hapy`)。
- `ambient.pool` 裡每個 `action` 是不是合法語意動作。
- 有沒有誤傳 `stages` 欄位(上一節說的死欄位)。

**驗證抓不到、要靠人眼看 `actor-preview.html` 判斷的**:造型像不像那種動物、動作幅度合不合理、配件掛載座標準不準、幼幼/大寶比例差異夠不夠明顯。這些是設計判斷,不是型別檢查能解決的。

---

## 四、常見誤區

- **`bounds.top`/`bounds.bottom` 方向搞反**:原點在腳底、y 向上為負,所以 `top` 必須是負值(或至少小於 `bottom`)。搞反的話縮圖會整隻切一半或留超大空白。現在 `define()` 會在這種情況印警告,但邏輯上仍然是「用預設值頂著」在跑,不會自動幫你修正方向。
- **`mirror:true` 用在正面造型的物種上**:會讓朝左變成整隻鏡射的娃娃臉,而不是自然轉身。只有真的畫了「有明確朝向的側身造型」才該開。
- **把 `stages` 塞進 `A.define()` 的 spec**:如上,引擎不讀,寫了也沒用,只會被提醒。
- **抽共用造型函式**:這是刻意不允許的架構決策(見 `app/actor.js` 開頭),不要因為兩隻動物剛好都有四條腿就抽一個 `drawLeg()` 共用 —— 之後兩隻動物想長得不一樣時,共用函式會變成拖累。
- **忘記三個畫面接線**:目前 `room.js`/`dex.js`/`lifecycle.js`/`screens.js`/`quiz.js`/`points.js`/`english.js` 全部都已經走 `PLS_ACTOR.drawAt()`/`create()`,新物種只要註冊好 `define()` 就會在所有畫面自動生效,**不需要**額外去改這些呼叫端。如果之後又新增一個會畫寵物的畫面,務必也走 `PLS_ACTOR`,不要直接呼叫 `window.PLS_PETS.draw()`(那是舊制,只有還沒搬家的 8 隻物種在用)。

---

## 五、驗收清單(合併前勾一遍)

- [ ] `app/actors/<species>.js` 複製自 `_template.js`,沒有共用其他物種的造型函式。
- [ ] `A.define()` 的 spec 沒有傳 `stages`,成長階段比例在檔案內部自己的 `STAGES` 常數處理。
- [ ] 載入 `actor-preview.html`(或整個 App)時,console 沒有這隻物種的 `[PLS_ACTOR]` 警告。
- [ ] 10 個語意動作都在 `actor-preview.html` 點過一輪,沒有動作演出來是空白/報錯。
- [ ] 走路(往左/往右)看起來自然,`legFreq`/`tailFreq`/`lean` 的節奏跟這種動物的真實感覺相符。
- [ ] 幼幼/小寶/大寶三階段比例有明顯差異,不是整隻等比縮放。
- [ ] 大寶配件 5 款都畫出來、掛載座標沒有跑位或被身體擋住。
- [ ] `index.html` 的 `<script>` 清單、`sw.js` 的 `ASSETS` 都加了這個新檔案,`sw.js` 的 `VERSION` +1。
- [ ] `config.js` 的 `PLS_CONFIG.pets` 加了這隻物種的名字與主題色。
- [ ] 縮圖/圖鑑(`dex.js`)、選寵物格(`screens.js`)、房間(`room.js`)、畢業/答題/積分/英文各畫面(`lifecycle.js`/`quiz.js`/`points.js`/`english.js`)實機點過一輪,沒有裁切或比例跑掉。
