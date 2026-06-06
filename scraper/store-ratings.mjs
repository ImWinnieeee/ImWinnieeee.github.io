// Per-store Google rating + review count for EVERY reviewed store — the STORE's
// own aggregate numbers, NOT Winnie's personal review.
//
// Key trick: a review's Share permalink (maps.app.goo.gl/…) only opens Winnie's
// OWN review page, which has no store rating/count. But that permalink redirects
// to a URL that embeds the store's CID (…!1s0x<cell>:0x<CID>…). We extract that
// CID (cheap HTTP redirect-follow, no browser) and open the STORE's own page at
// https://www.google.com/maps?cid=<decimal> — which DOES show the rating + count.
//
// Resumable: CIDs cached in store-cids.json, ratings in store-ratings.json; we
// skip ids already done and persist as we go.
//
// Run with:  npm run scrape:ratings:all   (needs `npm run login` Chrome open)
import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'
import { existsSync as fsExists } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'output')
const PORT = 9222
const CIDS_FILE = path.join(OUT, 'store-cids.json')
const RATINGS_FILE = path.join(OUT, 'store-ratings.json')

// ---- read the STORE rating/count off the place panel (runs in the page) -----
function extractStoreRating() {
  const out = { rating: null, reviews: null, title: null }
  const parseCount = (s) => {
    if (!s) return null
    const m = s.replace(/[,、]/g, '').match(/([\d]+(?:\.\d+)?[KkMm]?)/)
    if (!m) return null
    const v = m[1]
    if (/[Kk]$/.test(v)) return Math.round(parseFloat(v) * 1e3)
    if (/[Mm]$/.test(v)) return Math.round(parseFloat(v) * 1e6)
    return parseInt(v, 10)
  }
  const f7 = document.querySelector('.F7nice')
  if (f7) {
    const txt = f7.innerText || ''
    const rm = txt.match(/(\d+[.,]\d)/)
    if (rm) out.rating = parseFloat(rm[1].replace(',', '.'))
    const aria = [...f7.querySelectorAll('[aria-label]')].map((n) => n.getAttribute('aria-label'))
    const cAria = aria.find((a) => /review|則|クチコミ|รีวิว|recension/i.test(a || ''))
    const paren = txt.match(/\(([\d.,]+[KkMm]?)\)/)
    if (cAria) out.reviews = parseCount(cAria)
    else if (paren) out.reviews = parseCount(paren[1])
  }
  if (out.rating == null) {
    for (const el of document.querySelectorAll('[aria-label]')) {
      const a = el.getAttribute('aria-label') || ''
      const m = a.match(/^(\d+[.,]\d)\s*(stars?|顆星|つ星|ดาว|stelle)/i)
      if (m) { out.rating = parseFloat(m[1].replace(',', '.')); break }
    }
  }
  if (out.reviews == null) {
    for (const el of document.querySelectorAll('[aria-label]')) {
      const a = el.getAttribute('aria-label') || ''
      const m = a.match(/([\d.,]+[KkMm]?)\s*(reviews?|則評論|件のクチコミ|クチコミ|รีวิว|recensioni)/i)
      if (m) { out.reviews = parseCount(m[1]); break }
    }
  }
  const h1 = document.querySelector('h1')
  if (h1) out.title = h1.innerText.trim()
  return out
}

// ---- resolve a permalink to the store CID via HTTP redirect (no browser) -----
async function resolveCid(shortUrl) {
  try {
    const res = await fetch(shortUrl, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } })
    const finalUrl = res.url || ''
    try { await res.body?.cancel?.() } catch {}
    const m = finalUrl.match(/!1s0x[0-9a-f]+:0x([0-9a-f]+)/i)
    return m ? m[1] : null
  } catch {
    return null
  }
}

const parsed = JSON.parse(await fs.readFile(path.join(OUT, 'reviews-parsed.json'), 'utf8'))
const reviewUrls = fsExists(path.join(OUT, 'review-urls.json'))
  ? JSON.parse(await fs.readFile(path.join(OUT, 'review-urls.json'), 'utf8')) : {}
const cids = fsExists(CIDS_FILE) ? JSON.parse(await fs.readFile(CIDS_FILE, 'utf8')) : {}
const storeRatings = fsExists(RATINGS_FILE) ? JSON.parse(await fs.readFile(RATINGS_FILE, 'utf8')) : {}
const saveCids = () => fs.writeFile(CIDS_FILE, JSON.stringify(cids, null, 2))
const saveRatings = () => fs.writeFile(RATINGS_FILE, JSON.stringify(storeRatings, null, 2))

// ---- Phase 1: resolve CIDs (parallel pool, cheap HTTP) ----------------------
const needCid = parsed.filter((r) => reviewUrls[r.id] && cids[r.id] === undefined)
console.log(`🔗 Resolving store CIDs from permalinks — ${needCid.length} to do (cached ${Object.keys(cids).length})…`)
let ci = 0
const POOL = 10
async function worker() {
  while (ci < needCid.length) {
    const r = needCid[ci++]
    cids[r.id] = await resolveCid(reviewUrls[r.id]) // hex string or null
    if (ci % 25 === 0) { console.log(`   …cids ${ci}/${needCid.length}`); await saveCids() }
  }
}
await Promise.all(Array.from({ length: POOL }, worker))
await saveCids()
const cidOk = Object.values(cids).filter(Boolean).length
console.log(`   ✅ CIDs resolved: ${cidOk} (of ${Object.keys(cids).length} permalinks)`)

// ---- Phase 2: open each STORE page by CID and read rating + count ------------
let browser
try {
  browser = await chromium.connectOverCDP(`http://localhost:${PORT}`)
} catch (e) {
  console.error('\n❌ Could not connect to your Chrome on port ' + PORT + '. Run `npm run login` first.\n')
  process.exit(1)
}
const ctx = browser.contexts()[0]
const page = ctx.pages()[0] || (await ctx.newPage())
await page.bringToFront()

const todo = parsed.filter((r) => cids[r.id] && !(storeRatings[r.id] && storeRatings[r.id].rating != null))
console.log(`\n📂 Store ratings — visiting ${todo.length} store pages (by CID)…`)
let done = 0, ok = Object.values(storeRatings).filter((s) => s && s.rating != null).length
for (const r of todo) {
  const cid = BigInt('0x' + cids[r.id]).toString()
  try {
    await page.goto(`https://www.google.com/maps?cid=${cid}&hl=en`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.F7nice', { timeout: 12000 }).catch(() => {})
    await page.waitForTimeout(700)
    const d = await page.evaluate(extractStoreRating)
    storeRatings[r.id] = { rating: d.rating, reviews: d.reviews, title: d.title, cid }
    if (d.rating != null) ok++
  } catch (e) {
    storeRatings[r.id] = { rating: null, reviews: null, error: e.message, cid }
  }
  if (++done % 10 === 0) { console.log(`   …ratings ${done}/${todo.length} (ok ${ok})`); await saveRatings() }
}
await saveRatings()
console.log(`\n✅ Done — ${ok} stores with a Google rating → store-ratings.json`)
console.log('   Run `npm run build:data` to fold googleRating/googleReviews into src/data.json.')
await browser.close()
