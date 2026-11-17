// make test-rules — 在 Firestore 模擬器上驗證 firestore.rules 的家庭同步權限(SEC-380)。
import test, { before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
const EXP = () => Timestamp.fromMillis(Date.now() + 30 * 86400000);

const ADMIN_EMAIL = 'minglight0811@gmail.com';
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-pets',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8085 }
  });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const db = (uid) => env.authenticatedContext(uid).firestore();
const adminDb = () => env.authenticatedContext('admin-uid', { email: ADMIN_EMAIL }).firestore();
const CODE = 'ABCDEFGH23';

// 照 app/family.js 的順序建立一個家庭:family → 自己成為成員 → 配對碼 → 兩個小孩 rev 1
async function makeFamily(uid, fid = 'fam1', code = CODE) {
  const d = db(uid);
  await assertSucceeds(setDoc(doc(d, 'families', fid), { ownerUid: uid, pairCode: code, createdAt: 1 }));
  await assertSucceeds(setDoc(doc(d, 'families', fid, 'members', uid), { code, joinedAt: 1, lastSeenAt: 1, label: 'iPad' }));
  await assertSucceeds(setDoc(doc(d, 'familyCodes', code), { familyId: fid }));
  await assertSucceeds(setDoc(doc(d, 'families', fid, 'kids', 'kidL'), { data: { points: 1 }, rev: 1, updatedAt: 1, by: uid }));
  return d;
}

test('建立者可以建家庭、加自己、登記配對碼、上傳小孩', async () => {
  await makeFamily('alice');
});

test('配對碼對 → 可以加入並讀寫小孩;配對碼錯 → 不行', async () => {
  await makeFamily('alice');
  const bob = db('bob');
  await assertFails(setDoc(doc(bob, 'families', 'fam1', 'members', 'bob'), { code: 'ZZZZZZZZZZ', joinedAt: 1 }));
  await assertFails(getDoc(doc(bob, 'families', 'fam1', 'kids', 'kidL')));
  const code = (await getDoc(doc(bob, 'familyCodes', CODE))).data();
  assert(code.familyId === 'fam1');
  await assertSucceeds(setDoc(doc(bob, 'families', 'fam1', 'members', 'bob'), { code: CODE, joinedAt: 1, lastSeenAt: 1 }));
  await assertSucceeds(getDoc(doc(bob, 'families', 'fam1', 'kids', 'kidL')));
  await assertSucceeds(updateDoc(doc(bob, 'families', 'fam1', 'kids', 'kidL'), { data: { points: 2 }, rev: 2, by: 'bob' }));
});

test('不能幫別人加入、不能把配對碼指到別的家庭', async () => {
  await makeFamily('alice');
  const bob = db('bob');
  await assertFails(setDoc(doc(bob, 'families', 'fam1', 'members', 'carol'), { code: CODE, joinedAt: 1 }));
  await assertSucceeds(setDoc(doc(bob, 'families', 'fam2'), { ownerUid: 'bob', pairCode: 'QQQQQQQQQQ', createdAt: 1 }));
  await assertSucceeds(setDoc(doc(bob, 'families', 'fam2', 'members', 'bob'), { code: 'QQQQQQQQQQ', joinedAt: 1 }));
  // bob 想把 alice 家的配對碼搶過來指到自己家:已存在 → create 失敗;拿別的碼也不行(pairCode 不符)
  await assertFails(setDoc(doc(bob, 'familyCodes', CODE), { familyId: 'fam2' }));
  await assertFails(setDoc(doc(bob, 'familyCodes', 'WWWWWWWWWW'), { familyId: 'fam2' }));
});

test('非成員讀不到家庭、小孩、歷史、設定,也不能 list 配對碼', async () => {
  await makeFamily('alice');
  const eve = db('eve');
  await assertFails(getDoc(doc(eve, 'families', 'fam1')));
  await assertFails(getDoc(doc(eve, 'families', 'fam1', 'kids', 'kidL')));
  await assertFails(getDocs(collection(eve, 'families', 'fam1', 'kids', 'kidL', 'history')));
  await assertFails(getDoc(doc(eve, 'families', 'fam1', 'settings', 'main')));
  await assertFails(getDocs(collection(eve, 'familyCodes')));
  await assertFails(getDocs(collection(eve, 'families')));
});

test('rev 只能 +1:舊資料不能覆蓋新資料', async () => {
  const d = await makeFamily('alice');
  const ref = doc(d, 'families', 'fam1', 'kids', 'kidL');
  await assertFails(updateDoc(ref, { data: { points: 9 }, rev: 1 }));
  await assertFails(updateDoc(ref, { data: { points: 9 }, rev: 3 }));
  await assertSucceeds(updateDoc(ref, { data: { points: 9 }, rev: 2 }));
  await assertFails(setDoc(doc(d, 'families', 'fam1', 'kids', 'kidX'), { data: {}, rev: 1 }));
  await assertFails(updateDoc(ref, { data: { points: 9 }, rev: 3, hacked: true }));
});

test('歷史只能新增,成員不能改不能刪;admin 可以刪', async () => {
  const d = await makeFamily('alice');
  const hist = collection(d, 'families', 'fam1', 'kids', 'kidL', 'history');
  const ref = await assertSucceeds(addDoc(hist, { rev: 1, data: { points: 1 }, at: 1, by: 'alice', reason: 'hourly', expireAt: EXP() }));
  await assertFails(updateDoc(doc(d, ref.path), { reason: 'x' }));
  await assertFails(deleteDoc(doc(d, ref.path)));
  await assertSucceeds(deleteDoc(doc(adminDb(), ref.path)));
});

test('設定:成員可建可改(rev+1),非成員不行', async () => {
  const d = await makeFamily('alice');
  const ref = doc(d, 'families', 'fam1', 'settings', 'main');
  await assertSucceeds(setDoc(ref, { data: { prizes: [] }, rev: 1, updatedAt: 1, by: 'alice' }));
  await assertSucceeds(updateDoc(ref, { data: { prizes: [{ name: 'x', cost: 1 }] }, rev: 2 }));
  await assertFails(updateDoc(doc(db('eve'), ref.path), { data: {}, rev: 3 }));
});

test('admin 可以列出家庭、讀小孩與歷史、寫入還原', async () => {
  await makeFamily('alice');
  const a = adminDb();
  await assertSucceeds(getDocs(collection(a, 'families')));
  await assertSucceeds(getDocs(collection(a, 'families', 'fam1', 'members')));
  await assertSucceeds(getDoc(doc(a, 'families', 'fam1', 'kids', 'kidL')));
  await assertSucceeds(addDoc(collection(a, 'families', 'fam1', 'kids', 'kidL', 'history'), { rev: 1, data: {}, at: 1, by: 'admin', reason: 'before-restore', expireAt: EXP() }));
  await assertSucceeds(updateDoc(doc(a, 'families', 'fam1', 'kids', 'kidL'), { data: { points: 0 }, rev: 2, restoredAt: 5, by: 'admin', wids: [] }));
});

// ── players(好友身份)在家庭裡共用 ──
async function makePlayer(uid, pid = 'p1', extra = {}) {
  await assertSucceeds(setDoc(doc(db(uid), 'players', pid), Object.assign({
    ownerUid: uid, species: 'rabbit', childNickname: '小明', petName: '白白', friendCode: 'ABC234', status: {}, createdAt: 1
  }, extra)));
}

test('舊版 App 建 players(沒有 familyId)照常可以', async () => {
  await makePlayer('alice');
});

test('建立者把 player 掛到自己的家庭後,同家庭的成員可以更新狀態、讀好友清單', async () => {
  await makeFamily('alice');
  await makePlayer('alice');
  const bob = db('bob');
  await assertSucceeds(setDoc(doc(bob, 'families', 'fam1', 'members', 'bob'), { code: CODE, joinedAt: 1 }));
  await assertFails(updateDoc(doc(bob, 'players', 'p1'), { status: { points: 3 } }));       // 還沒掛家庭
  await assertSucceeds(updateDoc(doc(db('alice'), 'players', 'p1'), { familyId: 'fam1' }));
  await assertSucceeds(updateDoc(doc(bob, 'players', 'p1'), { status: { points: 3 } }));
  await assertSucceeds(getDocs(collection(bob, 'players', 'p1', 'friends')));
  await assertFails(updateDoc(doc(bob, 'players', 'p1'), { familyId: 'fam2' }));           // 成員不能把它搬走
  await assertFails(updateDoc(doc(db('eve'), 'players', 'p1'), { status: {} }));
});

test('不能把 player 掛到自己不是成員的家庭', async () => {
  await makeFamily('alice');
  await makePlayer('eve', 'p2');
  await assertFails(updateDoc(doc(db('eve'), 'players', 'p2'), { familyId: 'fam1' }));
  await assertFails(setDoc(doc(db('eve'), 'players', 'p3'), {
    ownerUid: 'eve', species: 'rabbit', childNickname: 'x', petName: 'y', friendCode: 'ABC235', status: {}, familyId: 'fam1'
  }));
});

function assert(c) { if (!c) throw new Error('assertion failed'); }

test('by 不能冒名、歷史一定要有 expireAt;wids 可以寫(最多 10 筆)', async () => {
  const d = await makeFamily('alice');
  const kid = doc(d, 'families', 'fam1', 'kids', 'kidL');
  await assertFails(updateDoc(kid, { data: { points: 2 }, rev: 2, by: 'bob' }));
  await assertFails(updateDoc(kid, { data: { points: 2 }, rev: 2, by: 'admin' }));
  await assertSucceeds(updateDoc(kid, { data: { points: 2 }, rev: 2, by: 'alice', wids: ['alice-XYZ'] }));
  await assertFails(updateDoc(kid, { data: { points: 3 }, rev: 3, by: 'alice', wids: Array(11).fill('x') }));
  const hist = collection(d, 'families', 'fam1', 'kids', 'kidL', 'history');
  await assertFails(addDoc(hist, { rev: 1, data: {}, at: 1, by: 'alice', reason: 'hourly' }));
  await assertFails(addDoc(hist, { rev: 1, data: {}, at: 1, by: 'mallory', reason: 'hourly', expireAt: EXP() }));
});

test('裝置名稱最多 20 字', async () => {
  const d = await makeFamily('alice');
  await assertFails(updateDoc(doc(d, 'families', 'fam1', 'members', 'alice'), { label: 'x'.repeat(21) }));
  await assertSucceeds(updateDoc(doc(d, 'families', 'fam1', 'members', 'alice'), { label: 'iPad' }));
});
