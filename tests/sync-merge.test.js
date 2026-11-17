// node --test tests/ — 多裝置同步三方合併的行為測試(app/sync-merge.js)。
const test = require('node:test');
const assert = require('node:assert/strict');
const { merge3 } = require('../app/sync-merge.js');

function kid(over) {
  return Object.assign({
    _v: 15, slot: 'kidL', species: 'rabbit', name: '小白', points: 10,
    levels: { m1: { attempts: 2, bestRate: 0.8, cleared: true, clears: 2 } },
    daily: { date: '2026-11-18', math: 1, english: 0, hw: 0 },
    care: { date: '2026-11-18', fed: 1, played: 0, xpToday: 5, careXp: 1 },
    inv: { foods: { apple: 2 }, toys: {}, gold: {} },
    growth: { xp: 40, deco: null, grownAt: null },
    decoDex: { rabbit: [true, false, false, false, false] },
    dex: { foods: ['apple'], toys: [] },
    collection: [], memo: [], hwRound: [],
    home: { foods: [{ key: null, deluxe: false, date: null }], toys: [] }
  }, over || {});
}
const clone = (v) => JSON.parse(JSON.stringify(v));

test('只有一邊改過就取那邊', () => {
  const base = kid();
  const local = clone(base); local.points = 12;
  assert.equal(merge3(base, local, clone(base)).points, 12);
  const remote = clone(base); remote.name = '大白';
  assert.equal(merge3(base, clone(base), remote).name, '大白');
});

test('點數兩邊都賺:加差值,不會被吃掉', () => {
  const base = kid();
  const local = clone(base); local.points = 13;     // 這台 +3
  const remote = clone(base); remote.points = 15;   // 那台 +5
  assert.equal(merge3(base, local, remote).points, 18);
});

test('一邊兌換一邊賺:兩邊都算,最小 0', () => {
  const base = kid({ points: 10 });
  const local = clone(base); local.points = 2;      // 兌換 -8
  const remote = clone(base); remote.points = 13;   // 賺 +3
  assert.equal(merge3(base, local, remote).points, 5);
  const r2 = clone(base); r2.points = 1;            // 那台也兌換 -9
  assert.equal(merge3(base, local, r2).points, 0);
});

test('過關次數加總、最佳答對率取大', () => {
  const base = kid();
  const local = clone(base); local.levels.m1.clears = 3; local.levels.m1.bestRate = 0.9; local.levels.m1.attempts = 3;
  const remote = clone(base); remote.levels.m1.clears = 4; remote.levels.m1.bestRate = 1; remote.levels.m1.attempts = 4;
  const m = merge3(base, local, remote);
  assert.equal(m.levels.m1.clears, 5);
  assert.equal(m.levels.m1.attempts, 5);
  assert.equal(m.levels.m1.bestRate, 1);
});

test('兩邊都新增同一關:從 0 加總', () => {
  const base = kid();
  const local = clone(base); local.levels.m2 = { attempts: 1, bestRate: 0.5, cleared: false, clears: 0 };
  const remote = clone(base); remote.levels.m2 = { attempts: 2, bestRate: 1, cleared: true, clears: 1 };
  const m = merge3(base, local, remote);
  assert.deepEqual(m.levels.m2, { attempts: 3, bestRate: 1, cleared: true, clears: 1 });
});

test('背包新食物兩邊各加', () => {
  const base = kid();
  const local = clone(base); local.inv.foods.apple = 1; local.inv.foods.cake = 1;   // 吃掉 1 個蘋果、拿到蛋糕
  const remote = clone(base); remote.inv.foods.apple = 4;                            // 拿到 2 個蘋果
  const m = merge3(base, local, remote);
  assert.equal(m.inv.foods.apple, 3);
  assert.equal(m.inv.foods.cake, 1);
});

test('每日計數:日期不同整份取新的,日期相同加總', () => {
  const base = kid();
  const local = clone(base); local.daily = { date: '2026-11-19', math: 1, english: 0, hw: 0 };
  const remote = clone(base); remote.daily.math = 3;
  assert.deepEqual(merge3(base, local, remote).daily, { date: '2026-11-19', math: 1, english: 0, hw: 0 });
  const l2 = clone(base); l2.daily.math = 2;
  assert.equal(merge3(base, l2, remote).daily.math, 4);
});

test('配件圖鑑逐格 OR、圖鑑與珍藏取聯集', () => {
  const base = kid();
  const local = clone(base); local.decoDex.rabbit[2] = true; local.dex.foods.push('cake');
  local.collection.push({ species: 'rabbit', deco: 2, name: '小白', date: '2026-11-18' });
  const remote = clone(base); remote.decoDex.rabbit[4] = true; remote.dex.foods.push('fish');
  const m = merge3(base, local, remote);
  assert.deepEqual(m.decoDex.rabbit, [true, false, true, false, true]);
  assert.deepEqual(m.dex.foods, ['apple', 'cake', 'fish']);
  assert.equal(m.collection.length, 1);
});

test('memo 取聯集後只留最後 20 筆', () => {
  const base = kid();
  const local = clone(base); const remote = clone(base);
  for (let i = 0; i < 15; i++) { local.memo.push({ k: 'clear', i }); remote.memo.push({ k: 'feed', i }); }
  const m = merge3(base, local, remote);
  assert.equal(m.memo.length, 20);
  assert.deepEqual(m.memo[19], { k: 'feed', i: 14 });
});

test('配件 index 不加總,取本機;字串衝突取本機', () => {
  const base = kid({ growth: { xp: 90, deco: 0, grownAt: null } });
  const local = clone(base); local.growth.deco = 2; local.name = '本機';
  const remote = clone(base); remote.growth.deco = 3; remote.name = '遠端';
  const m = merge3(base, local, remote);
  assert.equal(m.growth.deco, 2);
  assert.equal(m.name, '本機');
});

test('固定長度的物件陣列逐格合併,不會變長', () => {
  const base = kid();
  const local = clone(base); local.home.foods[0].key = 'apple';
  const remote = clone(base); remote.home.foods[0].deluxe = true;
  const m = merge3(base, local, remote);
  assert.equal(m.home.foods.length, 1);
  assert.deepEqual(m.home.foods[0], { key: 'apple', deluxe: true, date: null });
});

test('遠端刪掉、本機沒動的欄位跟著刪;本機改過就保留', () => {
  const base = kid({ extra: 1 });
  const local = clone(base);
  const remote = clone(base); delete remote.extra;
  assert.equal('extra' in merge3(base, local, remote), false);
  local.extra = 2;
  assert.equal(merge3(base, local, remote).extra, 2);
});

test('沒有 base(第一次)時:兩邊都有就加總計數', () => {
  const local = kid({ points: 3 });
  const remote = kid({ points: 4 });
  assert.equal(merge3(null, local, remote).points, 7);
});

test('不會改到輸入', () => {
  const base = kid(); const local = clone(base); local.points = 20; const remote = clone(base); remote.points = 30;
  const snap = JSON.stringify([base, local, remote]);
  merge3(base, local, remote);
  assert.equal(JSON.stringify([base, local, remote]), snap);
});

test('欄位順序不同視為沒改過', () => {
  const { equal } = require('../app/sync-merge.js');
  assert.equal(equal({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 }), true);
  const base = kid();
  const local = {}; Object.keys(base).reverse().forEach((k) => { local[k] = clone(base[k]); });
  assert.equal(equal(base, local), true);
  const remote = clone(base); remote.points = 99;
  assert.equal(merge3(base, local, remote).points, 99);
});

test('兩台做了一樣的改動(各 +1)要算兩次', () => {
  const base = kid();
  const local = clone(base); local.points = 11; local.levels.m1.clears = 3;
  const remote = clone(base); remote.points = 11; remote.levels.m1.clears = 3;
  const m = merge3(base, local, remote);
  assert.equal(m.points, 12);
  assert.equal(m.levels.m1.clears, 4);
  local.name = 'x'; remote.name = 'x';
  assert.equal(merge3(base, local, remote).name, 'x');
});

test('跨日後第一次合併:今天的計數兩邊相加,不會被昨天的 base 扣成 0', () => {
  const base = kid(); base.daily = { date: '2026-11-17', math: 3, english: 1, hw: 0 };
  const local = clone(base); local.daily = { date: '2026-11-18', math: 0, english: 0, hw: 0 };
  const remote = clone(base); remote.daily = { date: '2026-11-18', math: 2, english: 0, hw: 0 };
  local.points += 1;
  assert.equal(merge3(base, local, remote).daily.math, 2);
});

test('日期當數字比:11-10 比 11-9 新', () => {
  const base = kid(); base.daily = { date: '2026-11-9', math: 1, english: 0, hw: 0 };
  const local = clone(base); local.daily = { date: '2026-11-9', math: 3, english: 0, hw: 0 };
  const remote = clone(base); remote.daily = { date: '2026-11-10', math: 1, english: 0, hw: 0 };
  assert.equal(merge3(base, local, remote).daily.date, '2026-11-10');
  assert.equal(merge3(base, remote, local).daily.date, '2026-11-10');
});

test('hwRound 一台描滿一輪重置了,另一台的舊字母不會加回來;新描的字母保留', () => {
  const base = kid(); base.hwRound = ['A', 'B', 'C'];
  const local = clone(base); local.hwRound = ['x'];               // 描滿重置後又描了 x
  const remote = clone(base); remote.hwRound = ['A', 'B', 'C', 'D'];
  assert.deepEqual(merge3(base, local, remote).hwRound.sort(), ['D', 'x'].sort());
});

test('珍藏:一台換配件、另一台同時畢業 → 不會多出重複的珍藏', () => {
  const base = kid(); base.collection = [{ species: 'rabbit', deco: 1, date: '2026-11-1' }];
  const local = clone(base); local.collection[0].deco = 2;
  const remote = clone(base); remote.collection.push({ species: 'owl', deco: 0, date: '2026-11-18' });
  const c = merge3(base, local, remote).collection;
  assert.equal(c.length, 2);
  assert.equal(c[0].deco, 2);
  assert.equal(c[1].species, 'owl');
});
