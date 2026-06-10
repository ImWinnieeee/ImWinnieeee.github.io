#!/usr/bin/env bash
#
# 純更新「數據」：登入 → 抓 Google Maps 資料 → 重建 src/data.json
#                → 只 commit src/data.json → push。
#
# 跟 update.sh 的差別：
#   - 只動 src/data.json（瀏覽數、各種數量等純資料），
#     不會把其他改動（元件、樣式、腳本…）一起 commit 上去。
#   - commit 訊息固定為「<日期> data update」。
#
# 用法（在專案根目錄）：
#     npm run refresh
#   或
#     bash scraper/refresh.sh

set -euo pipefail

# 不論從哪裡呼叫，都切到專案根目錄（本檔的上一層）
cd "$(dirname "$0")/.."

PORT=9222

echo "──────────────────────────────────────────────"
echo " 🍣 Winnie's Food Map — 純更新數據"
echo "──────────────────────────────────────────────"

# 1) 確認「已登入的 Chrome」正在偵錯埠上跑；沒有的話就開一個讓你登入
if curl -s "http://localhost:${PORT}/json/version" >/dev/null 2>&1; then
  echo "✅ 已連到你登入中的 Chrome（埠 ${PORT}）"
else
  echo "🌐 找不到登入中的 Chrome，正在幫你開啟一個..."
  npm run login
  # 等 Chrome 把偵錯埠開起來（最多等 ~30 秒）
  for _ in $(seq 1 30); do
    if curl -s "http://localhost:${PORT}/json/version" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  echo
  echo "👉 如果還沒登入，請在剛開的 Chrome 視窗登入 Google，"
  echo "   並確認你看得到自己的『貢獻』頁（評論＋相片）。"
  read -r -p "   準備好了就按 Enter 繼續（Ctrl+C 取消）..." _
fi

# 2) 抓資料 → 解析 → 重建 src/data.json
#    （任何一步失敗就停，不會用半套資料覆蓋掉好的 data.json）
echo
echo "🔄 開始抓資料並重建 src/data.json..."
npm run scrape
npm run parse
npm run build:data

# 3) 只 commit src/data.json（其他改動一律不碰）
echo
if git diff --quiet -- src/data.json && git diff --cached --quiet -- src/data.json; then
  echo "ℹ️  src/data.json 沒有變動，不需要 commit / push。"
  exit 0
fi

git add src/data.json
git commit -m "$(date '+%Y-%m-%d') data update"
git push

echo
echo "🚀 已推送到 GitHub，Actions 會自動部署。"
echo "   過幾分鐘到 https://imwinnieeee.github.io/ 看更新結果。"
