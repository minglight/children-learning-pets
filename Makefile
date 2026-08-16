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
