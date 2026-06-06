// Fetch each favorite restaurant's LIVE Google Maps rating + review count.
//
// Reuses the logged-in real Chrome from `npm run login` (connect over CDP on
// port 9222) — same trick as scrape.mjs — so Google serves the real Maps page
// instead of blocking us as automation. For each store we open a Maps search,
// land on the place panel, and read the rating + review count straight off the
// listing (NOT from blogs/aggregators).
//
// Run with:  npm run scrape:ratings
import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, 'output')
const OUT_FILE = path.join(OUT_DIR, 'place-ratings.json')
const PORT = 9222

// The 30 favorites (5 per category). `q` is the Maps search query (name + city).
const PLACES = [
  // Taiwanese & Chinese
  { name: '醇涎坊古早味鍋燒意麵', category: 'Taiwanese & Chinese', q: '醇涎坊古早味鍋燒意麵 台南' },
  { name: '秦味館', category: 'Taiwanese & Chinese', q: '秦味館 台北' },
  { name: '犁園湯包館', category: 'Taiwanese & Chinese', q: '犁園湯包館 台北' },
  { name: '長白小館', category: 'Taiwanese & Chinese', q: '長白小館 台北' },
  { name: '寶杏堂 手切滷肉飯 溫補羊肉湯', category: 'Taiwanese & Chinese', q: '寶杏堂 手切滷肉飯 溫補羊肉湯 台北' },
  // Japanese
  { name: '肉料理荒川', category: 'Japanese', q: '肉料理荒川 京都' },
  { name: '河村食堂', category: 'Japanese', q: '河村食堂 京都' },
  { name: 'どろまみれ 四谷本店', category: 'Japanese', q: 'どろまみれ 四谷本店 東京' },
  { name: '寶來軒', category: 'Japanese', q: '寶來軒 台南' },
  { name: '壽壽木 炸豬排', category: 'Japanese', q: 'すずき とんかつ 東京' },
  // Italian
  { name: '培皮諾小館', category: 'Italian', q: '培皮諾小館 Peppino 台北' },
  { name: 'Trattoria Zaza', category: 'Italian', q: 'Trattoria ZaZa Firenze' },
  { name: '千層吧', category: 'Italian', q: '千層吧 台北' },
  { name: 'Ristorante "Dallo Zio" San Marco', category: 'Italian', q: 'Ristorante Dallo Zio San Marco Venezia' },
  { name: 'La Mole', category: 'Italian', q: 'La Mole 台北' },
  // Dessert
  { name: 'VERO ~ Gelateria Cremeria', category: 'Dessert', q: 'VERO Gelateria Cremeria Milano' },
  { name: 'Regoli Pasticceria', category: 'Dessert', q: 'Regoli Pasticceria Roma' },
  { name: 'CREM 奶油甜點專賣店', category: 'Dessert', q: 'CREM 奶油甜點專賣店 台北' },
  { name: '中村藤吉平等院店', category: 'Dessert', q: '中村藤吉 平等院店 宇治' },
  { name: 'David la Gelateria', category: 'Dessert', q: 'David la Gelateria Firenze' },
  // Drinks
  { name: '坪林手', category: 'Drinks', q: '坪林手 台北' },
  { name: '60+ Tea Shop 中山店', category: 'Drinks', q: '60+ Tea Shop 中山店 台北' },
  { name: 'Karun Thai Tea Central wOrld ชาไทยการัน', category: 'Drinks', q: 'Karun Thai Tea CentralwOrld Bangkok' },
  { name: 'Barista Ray', category: 'Drinks', q: 'Barista Ray 台南' },
  { name: 'MILK SHOP LUCK 酪 秋葉原店 ミルクショップ酪 秋葉原店', category: 'Drinks', q: 'ミルクショップ酪 秋葉原店' },
  // Other
  { name: '印度料理 Mumbai', category: 'Other', q: '印度料理 Mumbai 九段 東京' },
  { name: 'イタリアンバル 食堂チャコ', category: 'Other', q: 'イタリアンバル 食堂チャコ 大阪' },
  { name: '通庵 熟成咖哩', category: 'Other', q: '通庵 熟成咖哩 台北' },
  { name: '鐵 F.f 小餐廳 (無菜單1F)', category: 'Other', q: '鐵 F.f 小餐廳 台中' },
  { name: 'HI MATE!', category: 'Other', q: 'HI MATE! 台北' },
]

// Read rating + review count from whatever Maps is currently showing — either the
// place panel (single result) or the first card of a results list. Multilingual:
// English / 繁中 / 日本語 / ไทย / italiano review-count wording.
function extract() {
  const result = { rating: null, reviews: null, title: null, debug: null }

  const parseCount = (s) => {
    if (!s) return null
    // strip thousands separators (",", "." in some locales, "," ) then digits
    const m = s.replace(/[,、]/g, '').match(/([\d]+(?:\.\d+)?[KkMm]?)/)
    if (!m) return null
    let v = m[1]
    if (/[Kk]$/.test(v)) return Math.round(parseFloat(v) * 1000)
    if (/[Mm]$/.test(v)) return Math.round(parseFloat(v) * 1e6)
    return parseInt(v, 10)
  }

  // Strategy 1: the place-panel header block ".F7nice" holds rating + count.
  const f7 = document.querySelector('.F7nice')
  if (f7) {
    const txt = f7.innerText || ''
    const rm = txt.match(/(\d+[.,]\d)/)
    if (rm) result.rating = parseFloat(rm[1].replace(',', '.'))
    // review count is usually parenthesized, e.g. "(1,234)" or aria-label "1,234 reviews"
    const aria = [...f7.querySelectorAll('[aria-label]')].map((n) => n.getAttribute('aria-label'))
    const countAria = aria.find((a) => /review|則|クチコミ|口コ미|รีวิว|recension/i.test(a || ''))
    const paren = txt.match(/\(([\d.,]+[KkMm]?)\)/)
    if (countAria) result.reviews = parseCount(countAria)
    else if (paren) result.reviews = parseCount(paren[1])
    result.debug = 'F7nice:' + txt.replace(/\s+/g, ' ').slice(0, 60)
  }

  // Strategy 2: aria-labels anywhere — "4.5 stars" and "1,234 reviews".
  if (result.rating == null) {
    for (const el of document.querySelectorAll('[aria-label]')) {
      const a = el.getAttribute('aria-label') || ''
      const m = a.match(/^(\d+[.,]\d)\s*(stars?|顆星|つ星|ดาว|stelle)/i)
      if (m) { result.rating = parseFloat(m[1].replace(',', '.')); break }
    }
  }
  if (result.reviews == null) {
    for (const el of document.querySelectorAll('[aria-label]')) {
      const a = el.getAttribute('aria-label') || ''
      const m = a.match(/([\d.,]+[KkMm]?)\s*(reviews?|則評論|件のクチコミ|クチコミ|รีวิว|recensioni)/i)
      if (m) { result.reviews = parseCount(m[1]); break }
    }
  }

  // Title of the resolved place (so we can sanity-check the match).
  const h1 = document.querySelector('h1')
  if (h1) result.title = h1.innerText.trim()
  if (!result.title) {
    const dt = document.title.replace(/ - Google Maps.*/, '').trim()
    if (dt) result.title = dt
  }
  return result
}

// ---- connect ---------------------------------------------------------------
let browser
try {
  browser = await chromium.connectOverCDP(`http://localhost:${PORT}`)
} catch (e) {
  console.error('\n❌ Could not connect to your Chrome on port ' + PORT + '.')
  console.error('   Run `npm run login` first and leave that Chrome window open.\n')
  process.exit(1)
}
await fs.mkdir(OUT_DIR, { recursive: true })
const ctx = browser.contexts()[0]
const page = ctx.pages()[0] || (await ctx.newPage())
await page.bringToFront()

const out = []
for (let i = 0; i < PLACES.length; i++) {
  const p = PLACES[i]
  const url = `https://www.google.com/maps/search/${encodeURIComponent(p.q)}?hl=en`
  let rec = { name: p.name, category: p.category, rating: null, reviews: null, title: null, matchedUrl: null }
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    // wait for either the place panel (.F7nice) or a results list to render
    await page.waitForSelector('.F7nice, [role="article"]', { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(1500)

    // If we landed on a results LIST (no place panel yet), click the first card.
    if (!(await page.locator('.F7nice').count().catch(() => 0))) {
      const first = page.locator('[role="article"]').first()
      if (await first.count().catch(() => 0)) {
        await first.click({ timeout: 4000 }).catch(() => {})
        await page.waitForSelector('.F7nice', { timeout: 8000 }).catch(() => {})
        await page.waitForTimeout(1200)
      }
    }

    const data = await page.evaluate(extract)
    rec.rating = data.rating
    rec.reviews = data.reviews
    rec.title = data.title
    rec.matchedUrl = page.url()
  } catch (e) {
    rec.error = e.message
  }
  out.push(rec)
  const ok = rec.rating != null && rec.reviews != null ? '✅' : '⚠️ '
  console.log(`${ok} [${i + 1}/${PLACES.length}] ${p.name}`)
  console.log(`      → matched: ${rec.title || '(?)'}  |  ${rec.rating ?? '?'} ★  ·  ${rec.reviews ?? '?'} reviews`)
  await fs.writeFile(OUT_FILE, JSON.stringify(out, null, 2))
}

console.log(`\n✅ Done — saved ${out.length} places → scraper/output/place-ratings.json`)
const missing = out.filter((r) => r.rating == null || r.reviews == null)
if (missing.length) {
  console.log(`\n⚠️  ${missing.length} need a manual look (rating or count missing):`)
  for (const m of missing) console.log(`   - ${m.name}  (matched: ${m.title || '?'})`)
}

await browser.close()
