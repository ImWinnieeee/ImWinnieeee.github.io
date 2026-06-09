#!/usr/bin/env bash
#
# 一鍵更新整個網站：登入 → 抓資料 → 重建 src/data.json → commit → push。
# push 到 main 後，GitHub Actions 會自動把網站部署上線。
#
# 用法（在專案根目錄）：
#     npm run update:site
#   或
#     bash scraper/update.sh
#
# 第一次跑、或 Google 登入過期時：腳本會自動開啟你的 Chrome，
# 你在那個視窗登入 Google（看得到自己的貢獻頁）後，回來按 Enter 就會繼續。
# 之後只要那個 Chrome 的登入還有效，整個流程都不用手動。

set -euo pipefail

# 不論從哪裡呼叫，都切到專案根目錄（本檔的上一層）
cd "$(dirname "$0")/.."

PORT=9222

echo "──────────────────────────────────────────────"
echo " 🍣 Winnie's Food Map — 一鍵更新"
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

# 2) 抓資料 → 解析 → 組 src/data.json → build
#    （refresh = scrape && parse && build:data && build，任何一步失敗就停，
#     不會用半套資料覆蓋掉好的 data.json）
echo
echo "🔄 開始抓資料並重建網站資料..."
npm run refresh

# 3) commit & push（沒有變動就不 commit）
echo
if [ -z "$(git status --porcelain)" ]; then
  echo "ℹ️  資料沒有變動，不需要 commit / push。"
  exit 0
fi

git add -A
git commit -m "更新網站資料 $(date '+%Y-%m-%d %H:%M')"
git push

echo
echo "🚀 已推送到 GitHub，Actions 會自動部署。"
echo "   過幾分鐘到 https://imwinnieeee.github.io/ 看更新結果。"
