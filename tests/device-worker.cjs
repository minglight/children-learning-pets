// 一台模擬裝置(worker thread):自己一份 localStorage、自己的 Firebase 匿名登入,載入 App 真的
// config.js / sync-merge.js / store.js / cloud.js / family.js(或 admin-family.js),連 Firebase 模擬器。
// 主執行緒用 {id, code} 叫它執行一段 async 程式碼,回傳結果。
const { parentPort, workerData } = require('node:worker_threads');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const firebase = require('firebase/compat/app').default;
require('firebase/compat/auth');
require('firebase/compat/firestore');
const g = globalThis;
const origInit = firebase.initializeApp.bind(firebase);
firebase.initializeApp = function (cfg, name) {
  const app = origInit(Object.assign({}, cfg, { projectId: 'demo-pets' }), name);
  app.firestore().useEmulator('127.0.0.1', 8085);
  // compat Auth 建立時看到 window 會走瀏覽器的登入彈窗流程(Node 沒有)→ 建立那一刻先把 window 藏起來
  const w = g.window; delete g.window;
  try { app.auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true }); } finally { g.window = w; }
  return app;
};
g.firebase = firebase;

// 假的瀏覽器環境要在載入 Firebase 之後才放:Firebase Auth 看到 window 會以為在瀏覽器,改用瀏覽器的儲存方式而失敗
g.window = g;
const store = new Map();
g.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
  _dump: () => Object.fromEntries(store)
};
Object.defineProperty(g, 'navigator', { value: { userAgent: workerData.ua || 'Mozilla/5.0 (iPad)', maxTouchPoints: 5 }, configurable: true });
g.document = { visibilityState: 'visible', addEventListener() {} };


function load(rel) { vm.runInThisContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), { filename: rel }); }
load('app/config.js');
g.PLS_CONFIG.firebase = Object.assign({}, g.PLS_CONFIG.firebase, { projectId: 'demo-pets', apiKey: g.PLS_CONFIG.firebase.apiKey || 'fake' });
for (const f of workerData.scripts) load(f);

const AsyncFunction = (async () => {}).constructor;
parentPort.on('message', async ({ id, code }) => {
  try {
    const value = await new AsyncFunction(code)();
    parentPort.postMessage({ id, value: value === undefined ? null : JSON.parse(JSON.stringify(value)) });
  } catch (e) {
    parentPort.postMessage({ id, error: (e && e.stack) || String(e) });
  }
});
parentPort.postMessage({ ready: true });
