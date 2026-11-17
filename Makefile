# 寵物小學堂 — 本機開發用 Makefile(純靜態站,python http.server 就夠)
# Port 刻意避開 80xx(常跟其他專案/系統服務混在一起)。

PORT := 4173
PIDFILE := .server.pid
URL := http://localhost:$(PORT)

.PHONY: start stop restart status serve open debug admin

## 背景啟動 server(重跑不會重複開)
start:
	@if [ -f $(PIDFILE) ] && kill -0 $$(cat $(PIDFILE)) 2>/dev/null; then \
		echo "已在跑了 → $(URL) (PID $$(cat $(PIDFILE)))"; \
	else \
		python3 -m http.server $(PORT) > /dev/null 2>&1 & echo $$! > $(PIDFILE); \
		sleep 0.3; \
		echo "已啟動 → $(URL) (PID $$(cat $(PIDFILE)))"; \
	fi

## 停止背景 server
stop:
	@if [ -f $(PIDFILE) ]; then \
		kill $$(cat $(PIDFILE)) 2>/dev/null || true; \
		rm -f $(PIDFILE); \
		echo "已停止"; \
	else \
		echo "目前沒有在跑"; \
	fi

restart: stop start

status:
	@if [ -f $(PIDFILE) ] && kill -0 $$(cat $(PIDFILE)) 2>/dev/null; then \
		echo "運行中 → $(URL) (PID $$(cat $(PIDFILE)))"; \
	else \
		echo "沒有在跑"; \
	fi

## 前景啟動(看得到 log,Ctrl+C 結束)
serve:
	python3 -m http.server $(PORT)

## 啟動 + 用預設瀏覽器打開對應頁面(macOS)
open: start
	open "$(URL)"

debug: start
	open "$(URL)/debug.html"

admin: start
	open "$(URL)/admin.html"

## ── 測試(SEC-380 多裝置同步)──
## 第一次要先裝測試工具:cd tests && npm install(需要 Java 跑 Firebase 模擬器)
FB := tests/node_modules/.bin/firebase
.PHONY: test test-unit test-rules test-sync
test: test-unit test-rules test-sync

## 純函式單元測試(合併規則)
test-unit:
	node --test tests/*.test.js

## Firestore 規則(模擬器)
test-rules:
	$(FB) emulators:exec --only firestore --project demo-pets "node --test tests/rules.test.mjs"

## 兩台模擬裝置跑真的 store.js / cloud.js / family.js(模擬器)
test-sync:
	$(FB) emulators:exec --only firestore,auth --project demo-pets "node --test tests/sync.test.mjs"
