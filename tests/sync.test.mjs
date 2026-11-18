// make test-sync — 兩台模擬裝置 + 管理員,在 Firebase 模擬器上跑真的 store.js / cloud.js / family.js / admin-family.js。
// 情境照 SEC-380:配對碼綁定、兩個小孩各用一台、同一個小孩兩台都玩(合併)、不在首頁時延後、舊物件保護、管理員還原。
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';

const PROJECT = 'demo-pets';
const ADMIN = { email: 'minglight0811@gmail.com', password: 'test-only-123' };
const APP = ['app/sync-merge.js', 'app/store.js', 'app/cloud.js', 'app/family.js'];

function device(scripts, ua) {
  const w = new Worker(new URL('./device-worker.cjs', import.meta.url), { workerData: { scripts, ua } });
  let seq = 0;
  const pending = new Map();
  const ready = new Promise((resolve, reject) => {
    w.on('message', (m) => {
      if (m.ready) return resolve();
      const p = pending.get(m.id); pending.delete(m.id);
      if (m.error) p.reject(new Error(m.error)); else p.resolve(m.value);
    });
    w.on('error', reject);
  });
  const run = async (code) => { await ready; const id = ++seq; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); w.postMessage({ id, code }); }); };
  return { run, stop: () => w.terminate() };
}

// 在裝置上:改某個小孩的存檔並推上去
const play = (slot, body) => `{ const ST = PLS_STORE; const d = ST.load('${slot}'); ${body}; ST.save(d); await PLS_FAMILY.flush(); await PLS_FAMILY._idle(); }`;
const sync = `await PLS_FAMILY.safePoint(); await PLS_FAMILY._idle();`;
const kid = (slot) => `return PLS_STORE.load('${slot}');`;

let A, B, ADM;
before(async () => {
  await fetch(`http://127.0.0.1:8085/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ returnSecureToken: true }, ADMIN))
  });
  A = device(APP, 'Mozilla/5.0 (iPad)');
  B = device(APP, 'Mozilla/5.0 (Windows NT 10.0)');
  ADM = device(['app/admin-family.js']);
  await ADM.run(`firebase.initializeApp(PLS_CONFIG.firebase); await firebase.auth().signInWithEmailAndPassword('${ADMIN.email}', '${ADMIN.password}'); globalThis.db = firebase.firestore();`);
});
after(async () => { await A.stop(); await B.stop(); await ADM.stop(); });

let pairCode;

test('A(原本就有進度)第一次連上雲端:自動建家庭,進度與設定上傳', async () => {
  await A.run(play('kidL', `d.species = 'rabbit'; d.points = 5; d.childNickname = '小明'; d.levels.m1 = { attempts: 1, bestRate: 1, cleared: true, clears: 1 }`)
    + ` PLS_STORE.setPrizes([{ id: 'p1', name: '冰淇淋', cost: 3 }]);`);
  await A.run(`await PLS_FAMILY.start(); await PLS_FAMILY._idle();`);
  const info = await A.run(`return PLS_FAMILY.info();`);
  assert.match(info.pairCode, /^[A-Z2-9]{10}$/);
  assert.ok(info.familyId);
  pairCode = info.pairCode;
});

test('B(自己也玩過)輸入配對碼加入:左邊小孩換成 A 的,右邊小孩 A 沒玩過就保留 B 的;設定跟著家庭', async () => {
  await B.run(play('kidL', `d.species = 'hamster'; d.points = 2`) + play('kidR', `d.species = 'owl'; d.points = 4; d.childNickname = '小美'`));
  await B.run(`await PLS_FAMILY.start(); await PLS_FAMILY._idle();`);
  const res = await B.run(`return await PLS_FAMILY.join('${pairCode.toLowerCase()}');`);
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.deepEqual(res.kept, ['kidR']);
  const bL = await B.run(kid('kidL'));
  assert.equal(bL.species, 'rabbit');
  assert.equal(bL.points, 5);
  assert.equal((await B.run(kid('kidR'))).species, 'owl');
  assert.deepEqual((await B.run(`return PLS_STORE.getPrizes();`)).map((p) => p.name), ['冰淇淋']);
  assert.equal((await B.run(`return PLS_FAMILY.info();`)).pairCode, pairCode);
  // A 回首頁就拿到右邊小孩
  await A.run(sync);
  assert.equal((await A.run(kid('kidR'))).species, 'owl');
});

test('配對碼錯 → 不能加入', async () => {
  const res = await B.run(`return await PLS_FAMILY.join('ZZZZZZZZZZ');`);
  assert.equal(res.reason, 'not_found');
});

test('兩個小孩各用一台:各自的進度都到另一台', async () => {
  await A.run(play('kidL', `d.points += 3`));
  await B.run(play('kidR', `d.points += 4`));
  await A.run(sync); await B.run(sync);
  for (const D of [A, B]) {
    assert.equal((await D.run(kid('kidL'))).points, 8);
    assert.equal((await D.run(kid('kidR'))).points, 8);
  }
});

test('同一個小孩兩台都玩:點數、過關次數加總,不會被吃掉', async () => {
  await A.run(play('kidL', `d.points += 2; d.levels.m1.clears += 1`));
  await B.run(play('kidL', `d.points += 10; d.levels.m1.clears += 2`));   // B 推的時候 rev 已經被 A 推過 → 在首頁就合併
  await A.run(sync); await B.run(sync);
  for (const D of [A, B]) {
    const k = await D.run(kid('kidL'));
    assert.equal(k.points, 20);
    assert.equal(k.levels.m1.clears, 4);
  }
});

test('不在首頁時不合併,回首頁才合併', async () => {
  await B.run(`globalThis.PLS = { currentName: 'room' };`);
  await A.run(play('kidL', `d.points += 1`));
  await B.run(play('kidL', `d.points += 1`));
  assert.equal((await B.run(kid('kidL'))).points, 21);           // 還沒合併
  await B.run(`PLS.currentName = 'home';` + sync);
  await A.run(sync);
  assert.equal((await B.run(kid('kidL'))).points, 22);
  assert.equal((await A.run(kid('kidL'))).points, 22);
});

test('舊物件保護:同步換掉存檔後,畫面手上的舊物件存檔不會蓋掉雲端進度', async () => {
  await B.run(`globalThis.held = PLS_STORE.load('kidL'); held.points += 1; PLS_STORE.save(held); await PLS_FAMILY.flush(); await PLS_FAMILY._idle();`);   // 畫面拿著、先存過一次:23
  await A.run(play('kidL', `d.points += 5`));                        // A 加 5
  await B.run(sync);                                                 // B 換成 28
  await B.run(`held.points += 1; PLS_STORE.save(held); held.points += 1; PLS_STORE.save(held); await PLS_FAMILY.flush(); await PLS_FAMILY._idle();`);
  assert.equal((await B.run(kid('kidL'))).points, 30);               // 28 + 2(先前存過的 +1 不會再加一次)
  await A.run(sync);
  assert.equal((await A.run(kid('kidL'))).points, 30);
});

test('推送其實成功、只是沒收到回應(切背景被凍結):下次同步不會把點數加兩次', async () => {
  await A.run(sync); await B.run(sync);
  // A 推送時,寫入 id 先記下了,但交易之後的同步紀錄沒存進去(模擬頁面被凍結)
  await A.run(`const SK = 'pls.sync.demo-pets.kidL'; let n = 0; const orig = localStorage.setItem;
    localStorage.setItem = (k, v) => { if (k === SK && n++ > 0) return; orig(k, v); };
    { const d = PLS_STORE.load('kidL'); d.points += 3; PLS_STORE.save(d); }
    await PLS_FAMILY.flush(); await PLS_FAMILY._idle(); localStorage.setItem = orig;`);
  await B.run(play('kidL', `d.points += 1`));
  await A.run(play('kidL', `d.points += 1`)); await A.run(sync); await B.run(sync);
  assert.equal((await A.run(kid('kidL'))).points, 35);
  assert.equal((await B.run(kid('kidL'))).points, 35);
});

test('全家設定:B 改每日上限,A 同步後一樣;沒有 id 的獎品不會讓兩台互相蓋', async () => {
  await A.run(`PLS_STORE.setPrizes([{ name: '貼紙', cost: 2 }]); await PLS_FAMILY.flush(); await PLS_FAMILY._idle();`);
  assert.equal(await A.run(`return PLS_MERGE.equal(PLS_STORE.getSettings(), PLS_STORE.getSettings());`), true);
  await B.run(sync);
  await B.run(`PLS_STORE.setDailyLimit(7); await PLS_FAMILY.flush(); await PLS_FAMILY._idle();`);
  await A.run(sync); await B.run(sync);
  assert.equal(await A.run(`return PLS_STORE.getDailyLimit();`), 7);
  assert.equal(await B.run(`return PLS_STORE.getDailyLimit();`), 7);
  assert.deepEqual((await B.run(`return PLS_STORE.getPrizes();`)).map((p) => p.name), ['貼紙']);
});

test('管理員用好友代碼找到家庭、看歷史、還原;兩台下次同步都變成那一版', async () => {
  // 只存檔一次:cloud.js 建好好友身份後會自己通知家庭同步掛上 familyId,不靠之後再存檔
  let link = null;
  await A.run(play('kidL', `d.name = '白白'`));
  for (let i = 0; i < 30 && !(link && link.familyId); i++) {
    const l = await A.run(`return PLS_CLOUD.getLink('kidL');`);
    if (l) link = (await ADM.run(`return await PLS_ADMIN_FAMILY.findPlayers(db, '${l.friendCode}');`))[0] || null;
    if (!(link && link.familyId)) await new Promise((r) => setTimeout(r, 500));
  }
  assert.ok(link && link.familyId, '找不到掛在家庭上的 player');
  const fam = await ADM.run(`return await PLS_ADMIN_FAMILY.loadFamily(db, '${link.familyId}');`);
  assert.equal(fam.pairCode, pairCode);
  assert.equal(fam.members.length, 2);
  const hist = await ADM.run(`return await PLS_ADMIN_FAMILY.loadHistory(db, '${link.familyId}', 'kidL');`);
  const first = hist[hist.length - 1];                               // 最早那筆:建家庭時 points 5
  assert.equal(first.summary.points, 5);
  await ADM.run(`return await PLS_ADMIN_FAMILY.restore(db, '${link.familyId}', 'kidL', '${first.id}');`);
  // A 正在房間玩:推送照常,但還原不會在玩到一半換掉
  await A.run(`globalThis.PLS = { currentName: 'room' };` + play('kidL', `d.points += 1`));
  assert.notEqual((await A.run(kid('kidL'))).points, 5);
  await A.run(`PLS.currentName = 'home';` + sync); await B.run(sync);
  assert.equal((await A.run(kid('kidL'))).points, 5);
  assert.equal((await B.run(kid('kidL'))).points, 5);
  // 還原後照常同步
  await A.run(play('kidL', `d.points += 1`));
  await B.run(sync);
  assert.equal((await B.run(kid('kidL'))).points, 6);
  const after = await ADM.run(`return await PLS_ADMIN_FAMILY.loadHistory(db, '${link.familyId}', 'kidL');`);
  assert.ok(after.some((h) => h.reason === 'before-restore'));
  assert.ok(after.some((h) => h.reason === 'restore-replaced'));   // A 玩到一半那份,還原前先留下
  // 過期歷史:後台看歷史時清掉,沒過期的留著
  await ADM.run(`await db.collection('families').doc('${link.familyId}').collection('kids').doc('kidL').collection('history')
    .add({ rev: 1, data: {}, at: 1, by: 'admin', reason: 'old', expireAt: firebase.firestore.Timestamp.fromMillis(Date.now() - 1000) });`);
  assert.equal(await ADM.run(`return await PLS_ADMIN_FAMILY.pruneExpired(db, '${link.familyId}', 'kidL');`), 1);
  const pruned = await ADM.run(`return await PLS_ADMIN_FAMILY.loadHistory(db, '${link.familyId}', 'kidL');`);
  assert.equal(pruned.length, after.length);
  assert.ok(!pruned.some((h) => h.reason === 'old'));
});
