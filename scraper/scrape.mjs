// Step 2: scrape ALL your Google Maps contributions into clean JSON.
//
// Reuses the logged-in Chrome from `npm run login` (connect over CDP).
//
// IMPORTANT: Google's contribution feed is VIRTUALIZED — it keeps only ~10-20
// cards in the page at once and recycles them as you scroll. So we can't wait
// until the count "stops growing"; instead we harvest the visible cards on
// EVERY scroll step and accumulate them into a Map keyed by a stable id,
// stopping only when several scroll steps in a row reveal nothing new.
//
// Run with:  npm run scrape
import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'
import { existsSync as fsExists } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, 'output')
const CONTRIB_ID = '101678781544711902540'
const PORT = 9222
const URLS_FILE = path.join(OUT_DIR, 'review-urls.json')
const SITE_DATA_FILE = path.join(__dirname, '..', 'src', 'data.json')
const CONTRIB_URL = `https://www.google.com/maps/contrib/${CONTRIB_ID}`

async function openTab(page, name) {
  // Direct routes are more reliable than Google's frequently-changing tab markup.
  const directUrl = `${CONTRIB_URL}/${name}/`
  await page.goto(directUrl, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForTimeout(1800)
  if (page.url().includes(`/${name}`)) return true

  // Fallback for locales/accounts that redirect the direct contribution routes.
  const labels = { reviews: ['Reviews', '評論'], photos: ['Photos', '相片', '照片'] }[name]
  for (const l of labels) {
    const btn = page.getByRole('tab', { name: l }).first()
    if (await btn.count().catch(() => 0)) {
      await btn.click().catch(() => {})
      await page.waitForTimeout(1800)
      return true
    }
  }
  return false
}

// Generic "harvest while scrolling" loop for a virtualized feed.
//   harvestSel : CSS the scrollable container is found from (the anchor)
//   harvest()  : runs in the page, returns an array of {key, ...} for visible items
// We accumulate by key until `stableNeeded` consecutive steps add nothing new.
async function harvestWhileScrolling(page, { anchor, harvest, label, onBatch, maxRounds = 600, pauseMs = 650, stableNeeded = 12 }) {
  const acc = new Map()
  let stable = 0
  for (let i = 0; i < maxRounds; i++) {
    const batch = await page.evaluate(harvest)
    let added = 0
    const fresh = []
    for (const item of batch) {
      if (!item || item.key == null) continue
      const existing = acc.get(item.key)
      if (!existing) { acc.set(item.key, item); added++; fresh.push(item) }
      // A tile may first render before its view-count overlay loads. If we cached
      // a view-less entry, upgrade it once the count appears (doesn't count as
      // "added", so the stable-step counter still converges).
      else if (existing.views == null && item.views != null) acc.set(item.key, item)
    }
    // Optional per-step hook: interact with the cards while they're still on screen
    // (e.g. open each visible review's Share dialog) BEFORE we scroll them away.
    // Gets ALL currently-visible items (not just new ones) so failed captures can
    // be retried as cards re-render across scroll steps.
    if (onBatch) await onBatch(batch, fresh)
    // Advance the virtualized feed. `scrollBy` on a guessed container proved
    // unreliable, so we (1) pull the LAST rendered card into view — this makes
    // the native scroller move and forces the next batch to render — and
    // (2) fire a real mouse-wheel over the left panel as a backstop.
    await page.evaluate((anchor) => {
      const els = document.querySelectorAll(anchor)
      if (els.length) els[els.length - 1].scrollIntoView({ block: 'end', behavior: 'instant' })
    }, anchor)
    await page.mouse.move(220, 480)
    await page.mouse.wheel(0, 1600)
    if (added === 0) { if (++stable >= stableNeeded) break } else stable = 0
    if (i % 8 === 0) console.log(`   …${label}: ${acc.size} collected (+${added} this step)`)
    await page.waitForTimeout(pauseMs)
  }
  console.log(`   ✅ ${label}: ${acc.size} total`)
  return [...acc.values()]
}

// Read a STORE's aggregate Google rating + total review count off the place page
// (NOT Winnie's own stars). Runs in the page. Multilingual: en / 繁中 / 日本語 /
// ไทย / italiano. The header block ".F7nice" holds both; aria-labels are backup.
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
const page = ctx.pages().find((p) => p.url().includes('/maps/contrib/')) || ctx.pages()[0] || (await ctx.newPage())
await page.bringToFront()
await page.goto(`${CONTRIB_URL}/reviews/`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)

// ---- header stats ----------------------------------------------------------
const stats = await page.evaluate(() => {
  const body = document.body.innerText
  const grab = (rx) => { const m = body.match(rx); return m ? m[1] : null }
  return {
    level: grab(/Level (\d+)/i),
    // accept both "18,029 / 20,000 points" and a bare "18,029 points"
    points: grab(/([\d,]+)\s*(?:\/\s*[\d,]+\s*)?points/i),
  }
})

// ---- per-review Share permalinks -------------------------------------------
// For each NEW review card (while it's still on screen), open its Share dialog and
// read the public maps.app.goo.gl link to Winnie's own review. Slow (one dialog per
// review) but the only way to a real per-review permalink. Resumable: we load any
// previously-captured links and skip those ids, and persist as we go.
const reviewUrls = fsExists(URLS_FILE) ? JSON.parse(await fs.readFile(URLS_FILE, 'utf8')) : {}
// Google occasionally regenerates every review ID. Reuse already-published
// permalinks by place name so an ID rotation does not open ~400 Share dialogs;
// genuinely new places still go through the Share flow below.
const publishedData = fsExists(SITE_DATA_FILE) ? JSON.parse(await fs.readFile(SITE_DATA_FILE, 'utf8')) : {}
const publishedReviewByPlace = new Map(
  (publishedData.reviews || [])
    .filter((review) => review.place)
    .map((review) => [review.place.trim(), review])
)
const publishedUrlByPlace = new Map(
  [...publishedReviewByPlace]
    .filter(([, review]) => review.url)
    .map(([place, review]) => [place, review.url])
)
const urlAttempts = new Map()           // id -> attempt count (this run), for bounded retries
const MAX_ATTEMPTS = 3
let urlCaptured = 0, urlLogged = 0
async function saveUrls() { await fs.writeFile(URLS_FILE, JSON.stringify(reviewUrls, null, 2)) }
const haveUrl = (id) => typeof reviewUrls[id] === 'string' && reviewUrls[id]

// Google changes both the Copy-link and close-button markup frequently. The last
// visible dialog is the one just opened from the current review card.
const shareModal = () => page.locator('[role="dialog"]:visible').last()
async function closeShareModals() {
  // A new ShareKit dialog can sit on top of an older Maps dialog. Close from the
  // top down and re-query after every click; a dynamic `.last()` locator can
  // otherwise jump to the dialog underneath and make a successful close look stuck.
  for (let attempt = 0; attempt < 6; attempt++) {
    const dialogs = page.locator('[role="dialog"]:visible')
    if (await dialogs.count().catch(() => 0) === 0) return
    const modal = dialogs.last()
    const closeButtons = [
      modal.locator('#header-close-button').first(),
      modal.getByRole('button', { name: /^(close|關閉|关闭|閉じる)$/i }).first(),
      modal.locator('button[jsaction*="modal.close"]').first(),
      modal.locator('button[aria-label*="close" i], button[aria-label*="關閉"], button[aria-label*="关闭"]').first(),
    ]
    let clicked = false
    for (const button of closeButtons) {
      if (await button.isVisible().catch(() => false)) {
        clicked = await button.click({ timeout: 2500 }).then(() => true).catch(() => false)
        if (clicked) break
      }
    }
    if (!clicked) await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(350)
  }
  if (await page.locator('[role="dialog"]:visible').count().catch(() => 0)) {
    throw new Error('Share 視窗無法完全關閉，已停止抓取以避免卡住或寫入不完整資料。')
  }
}

// Open ONE review's Share dialog and read its maps.app.goo.gl permalink. Returns
// true on success. Failures are retried on later passes (the card re-renders as the
// virtualized feed scrolls) up to MAX_ATTEMPTS; we never permanently mark a miss.
async function captureShareLink(id) {
  if (haveUrl(id)) return true
  const n = (urlAttempts.get(id) || 0) + 1
  urlAttempts.set(id, n)
  if (n > MAX_ATTEMPTS) return false

  // The card container is the div.jftiEf carrying the id (its action buttons also
  // carry the same id, so we anchor on the card div to find the right Share button).
  const shareBtn = page.locator(`div.jftiEf[data-review-id="${id}"] button[jsaction*="review.share"]`).first()
  if (!(await shareBtn.count().catch(() => 0))) return false

  await closeShareModals()
  await shareBtn.scrollIntoViewIfNeeded().catch(() => {})
  await shareBtn.click({ timeout: 4000 }).catch(() => {})

  const m = shareModal()
  await m.waitFor({ state: 'visible', timeout: 5000 })
  let link = (await m.locator('input').first().inputValue().catch(() => '')) || null
  if (!link) {
    // New ShareKit UI hides the URL behind a real "Copy Link" control.
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://www.google.com' }).catch(() => {})
    const copyLink = m.locator('#app-container-Copy\\ Link, [role="button"]:has-text("Copy Link")').first()
    if (await copyLink.isVisible().catch(() => false)) {
      await copyLink.click({ timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(250)
      link = await page.evaluate(() => navigator.clipboard.readText()).catch(() => null)
    }
  }
  if (!link) { // fall back to scraping any maps link from the modal text
    const txt = (await m.innerText().catch(() => '')) || ''
    const mm = txt.match(/https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.com\/maps)\/\S+/)
    if (mm) link = mm[0]
  }
  await closeShareModals()

  if (link && /^https?:\/\//.test(link)) {
    reviewUrls[id] = link.trim()
    urlCaptured++
    if (urlLogged < 5) { console.log(`   🔗 share link #${urlCaptured}: ${link.trim()}`); urlLogged++ }
    return true
  }
  return false
}

// ---- reviews ---------------------------------------------------------------
console.log('\n📂 Reviews — harvesting while scrolling (will take a few minutes for 359)…')
console.log('   (capturing missing Share permalinks; each dialog must close before scrolling continues)')
await openTab(page, 'reviews')
// Wait until the review cards actually render. The contributions page sometimes
// hasn't finished loading when we get here (then [data-review-id] is briefly 0,
// the harvest scrolls past empty, and we'd "find" 0 reviews). Poll + re-open the
// tab a few times before giving up, so a slow load doesn't yield an empty scrape.
let reviewCardCount = 0
for (let attempt = 0; attempt < 6; attempt++) {
  await page.waitForSelector('[data-review-id]', { timeout: 8000 }).catch(() => {})
  reviewCardCount = await page.evaluate(() => document.querySelectorAll('[data-review-id]').length)
  if (reviewCardCount > 0) break
  console.log(`   …reviews not rendered yet (attempt ${attempt + 1}/6) — waiting & re-opening tab`)
  await page.waitForTimeout(2500)
  await openTab(page, 'reviews')
}
console.log(`   reviews tab ready: ${reviewCardCount} [data-review-id] nodes visible`)
const reviews = await harvestWhileScrolling(page, {
  label: 'reviews',
  anchor: '[data-review-id]',
  onBatch: async (batch) => {
    // batch has ~10 nested nodes per review (same id repeated) — visit each once
    const cards = [...new Map(batch.map((item) => [item.id, item])).values()]
    for (const card of cards) {
      const id = card.id
      if (haveUrl(id)) continue
      const place = (card.text || '').split('\n')[0].trim()
      const publishedUrl = publishedUrlByPlace.get(place)
      if (publishedUrl) {
        reviewUrls[id] = publishedUrl
        continue
      }
      const before = urlCaptured
      await captureShareLink(id)
      if (urlCaptured > before && urlCaptured % 10 === 0) await saveUrls()
    }
  },
  harvest: () => {
    const out = []
    for (const el of document.querySelectorAll('[data-review-id]')) {
      const id = el.getAttribute('data-review-id')
      if (!id) continue
      const ariaLabels = [...el.querySelectorAll('[aria-label]')].map((n) => n.getAttribute('aria-label')).filter(Boolean)
      const hrefs = [...el.querySelectorAll('a[href]')].map((a) => a.href)
      const imgs = []
      for (const im of el.querySelectorAll('img')) if (im.src && im.src.includes('googleusercontent')) imgs.push(im.src)
      for (const d of el.querySelectorAll('[style*="background-image"]')) {
        const m = (d.getAttribute('style') || '').match(/url\("?(.*?)"?\)/)
        if (m && m[1].includes('googleusercontent')) imgs.push(m[1])
      }
      out.push({ key: id, id, text: el.innerText, ariaLabels, hrefs, imgs: [...new Set(imgs)] })
    }
    return out
  },
})

// ---- photos (+ video view counts in the same sweep) ------------------------
// The grid no longer uses `a[href*="/photo"]` anchors — each tile is a
// `button.xUc6Hf` inside `div.WY21Hc`, and the view count lives in a VISUAL badge
//   <div class="WqkvRc …"><span>👁</span><div class="HtPsUd">25</div></div>
// (photos also expose "· N views" in an aria-label; videos do NOT — their count is
// ONLY in .HtPsUd, which is why videos used to come back view-less). A tile is a
// VIDEO iff it shows a duration ("0:07"). We harvest every tile once, then split:
// photos → photos-raw.json, videos → video-views.json (keyed by photo id).
console.log('\n📂 Photos + video views — harvesting while scrolling…')
await openTab(page, 'photos')
await page.waitForTimeout(2500)
const gridItems = await harvestWhileScrolling(page, {
  label: 'photos',
  anchor: 'div.WY21Hc',
  harvest: () => {
    const byUrl = new Map()
    const imgUrl = (root) => {
      const im = root.querySelector('img')
      if (im && im.src && im.src.includes('googleusercontent')) return im.src
      const bg = root.querySelector('[style*="background-image"]')
      const sm = bg && (bg.getAttribute('style') || '').match(/url\("?(.*?)"?\)/)
      if (sm && sm[1].includes('googleusercontent')) return sm[1]
      return ''
    }
    const viewsOf = (root) => {
      // prefer the visual .HtPsUd badge (works for BOTH photos and videos)
      const badge = root.querySelector('.HtPsUd')
      if (badge) { const n = parseInt(badge.textContent.replace(/[^\d]/g, '')); if (!isNaN(n)) return n }
      // fall back to a photo's "· N views" aria-label
      const labels = [root.getAttribute('aria-label') || '',
        ...[...root.querySelectorAll('[aria-label]')].map((n) => n.getAttribute('aria-label') || '')]
      for (const al of labels) { const m = al.match(/·\s*([\d,]+)\s*views?/i); if (m) return parseInt(m[1].replace(/,/g, '')) }
      return null
    }
    const consider = (root) => {
      const url = imgUrl(root)
      if (!url) return
      const views = viewsOf(root)
      const video = /\b\d+:\d{2}\b/.test(root.innerText || '') // duration overlay → it's a video
      const prev = byUrl.get(url)
      if (!prev || (prev.views == null && views != null)) byUrl.set(url, { key: url, url, views, video })
    }
    // div.WY21Hc is the tile container; button.xUc6Hf is a safety net for markup drift
    for (const el of document.querySelectorAll('div.WY21Hc, button.xUc6Hf')) consider(el)
    return [...byUrl.values()]
  },
})
const photoItems = gridItems.filter((t) => !t.video)
const videoItems = gridItems.filter((t) => t.video)
// Google's own header stats: grand total views ("9,140,043 views") and the
// authoritative photo+video count ("1,674 photos"). We trust the header count
// over the harvested tile count (the desktop grid only renders a subset).
const headerStats = await page.evaluate(() => {
  let views = null, count = null
  for (const el of document.querySelectorAll('[aria-label]')) {
    const a = el.getAttribute('aria-label') || ''
    let m = a.match(/^([\d,]+)\s+views$/i); if (m && views == null) views = parseInt(m[1].replace(/,/g, ''))
    m = a.match(/^([\d,]+)\s+photos$/i); if (m && count == null) count = parseInt(m[1].replace(/,/g, ''))
  }
  return { views, count }
})
const totalPhotoViews = headerStats.views
const photoHeaderCount = headerStats.count

// ---- per-store Google rating + review count --------------------------------
// For EVERY reviewed store, read the STORE's AGGREGATE Google rating + total
// review count (NOT Winnie's own review). A review's Share permalink only opens
// her personal review page (no store rating), but it redirects to a URL that
// embeds the store's CID (…!1s0x<cell>:0x<CID>…). We extract that CID and open
// the STORE's own page (…?cid=<decimal>), which DOES show the rating + count.
// Resumable: skip ids already captured, persist as we go.
const RATINGS_FILE = path.join(OUT_DIR, 'store-ratings.json')
const storeRatings = fsExists(RATINGS_FILE) ? JSON.parse(await fs.readFile(RATINGS_FILE, 'utf8')) : {}
const saveRatings = () => fs.writeFile(RATINGS_FILE, JSON.stringify(storeRatings, null, 2))
const resolveCid = async (shortUrl) => {
  try {
    const res = await fetch(shortUrl, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } })
    const finalUrl = res.url || ''
    try { await res.body?.cancel?.() } catch {}
    const m = finalUrl.match(/!1s0x[0-9a-f]+:0x([0-9a-f]+)/i)
    return m ? m[1] : null
  } catch { return null }
}

console.log('\n📂 Store ratings — opening each STORE page (via CID) for its Google rating + review count…')
// Review IDs can rotate even though the stores have not changed. Carry published
// ratings forward by place name so only genuinely new stores require navigation.
for (const review of reviews) {
  if (storeRatings[review.id]?.rating != null) continue
  const place = (review.text || '').split('\n')[0].trim()
  const published = publishedReviewByPlace.get(place)
  if (published?.googleRating != null) {
    storeRatings[review.id] = {
      rating: published.googleRating,
      reviews: published.googleReviews ?? null,
      title: place,
      migratedByPlace: true,
    }
  }
}
let rDone = 0, rOk = 0
for (const rv of reviews) {
  const id = rv.id
  if (storeRatings[id] && storeRatings[id].rating != null) { rOk++; continue }
  if (!reviewUrls[id]) continue
  const cidHex = await resolveCid(reviewUrls[id])
  if (!cidHex) { storeRatings[id] = { rating: null, reviews: null, error: 'no-cid' }; continue }
  const cid = BigInt('0x' + cidHex).toString()
  try {
    await page.goto(`https://www.google.com/maps?cid=${cid}&hl=en`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.F7nice', { timeout: 12000 }).catch(() => {})
    await page.waitForTimeout(700)
    const d = await page.evaluate(extractStoreRating)
    storeRatings[id] = { rating: d.rating, reviews: d.reviews, title: d.title, cid }
    if (d.rating != null) rOk++
  } catch (e) {
    storeRatings[id] = { rating: null, reviews: null, error: e.message, cid }
  }
  if (++rDone % 10 === 0) { console.log(`   …ratings ${rDone}/${reviews.length} (ok ${rOk})`); await saveRatings() }
}
await saveRatings()
console.log(`   ✅ store ratings: ${rOk}/${reviews.length} captured → store-ratings.json`)

// ---- save ------------------------------------------------------------------
await saveUrls()
const photos = { total: totalPhotoViews, headerCount: photoHeaderCount, count: photoItems.length, items: photoItems }
// GUARD: never overwrite reviews-raw.json with an empty harvest (a slow page load
// or a DOM change can yield 0 cards). Preserve the previous file and fail the run
// so the refresh chain stops before build:data — better a stale scrape than a
// wiped site. Photo data still saves below (it scraped fine).
const reviewsEmpty = reviews.length === 0
if (reviewsEmpty) {
  console.log('\n   ⚠️  0 reviews harvested — NOT overwriting reviews-raw.json (keeping the previous one).')
  console.log('      The Reviews tab likely failed to render this run. Re-run `npm run scrape`.')
} else {
  await fs.writeFile(path.join(OUT_DIR, 'reviews-raw.json'), JSON.stringify(reviews, null, 2))
}
await fs.writeFile(path.join(OUT_DIR, 'photos-raw.json'), JSON.stringify(photos, null, 2))
await fs.writeFile(path.join(OUT_DIR, 'stats.json'), JSON.stringify(stats, null, 2))
// per-video view counts (keyed by photo id) for build-data's featured videos
const videoViews = videoItems
  .map((t) => ({ id: (t.url.split('/').pop().match(/^[A-Za-z0-9_-]+/) || [])[0], views: t.views }))
  .filter((v) => v.id && v.views != null)
  .sort((a, b) => b.views - a.views)
await fs.writeFile(path.join(OUT_DIR, 'video-views.json'), JSON.stringify({ count: videoViews.length, items: videoViews }, null, 2))

const urlOk = Object.values(reviewUrls).filter(Boolean).length
const photosWithViews = photoItems.filter((p) => p.views != null).length
console.log('\n✅ Done!')
console.log(`   reviews: ${reviews.length}  |  photos: ${photos.count} (${photosWithViews} with views)  |  videos: ${videoViews.length}  |  total photo views: ${photos.total}`)
if (photos.count === 0) {
  console.log('\n   ⚠️  0 photos captured but the page reports ' + (photos.total ?? '—') + ' total views.')
  console.log('      The photo grid probably did not render this run — DO NOT build, or you will')
  console.log('      overwrite the good photo data with 0. Re-run `npm run scrape`.')
}
console.log(`   share links: ${urlOk}/${reviews.length} captured → review-urls.json`)
console.log(`   level: ${stats.level}  points: ${stats.points}`)
console.log('   saved → scraper/output/' + (reviewsEmpty ? '(reviews kept) ' : 'reviews-raw.json, ') + 'photos-raw.json, video-views.json, stats.json, review-urls.json')
console.log('\nTell Claude it finished so it can build the real src/data.json.\n')

await browser.close()
// non-zero exit on an empty reviews harvest so `npm run refresh` halts before build:data
if (reviewsEmpty) process.exit(1)
