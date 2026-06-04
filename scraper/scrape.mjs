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

async function openTab(page, name) {
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
      if (item && item.key != null && !acc.has(item.key)) { acc.set(item.key, item); added++; fresh.push(item) }
    }
    // Optional per-step hook: interact with the cards while they're still on screen
    // (e.g. open each new review's Share dialog) BEFORE we scroll them out of view.
    if (onBatch && fresh.length) { try { await onBatch(fresh) } catch (e) { console.log('   onBatch error:', e.message) } }
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
await page.goto(`https://www.google.com/maps/contrib/${CONTRIB_ID}/`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)

// ---- header stats ----------------------------------------------------------
const stats = await page.evaluate(() => {
  const body = document.body.innerText
  const grab = (rx) => { const m = body.match(rx); return m ? m[1] : null }
  return {
    level: grab(/Level (\d+)/i),
    points: grab(/([\d,]+) ?\/ ?[\d,]+ points/i),
  }
})

// ---- per-review Share permalinks -------------------------------------------
// For each NEW review card (while it's still on screen), open its Share dialog and
// read the public maps.app.goo.gl link to Winnie's own review. Slow (one dialog per
// review) but the only way to a real per-review permalink. Resumable: we load any
// previously-captured links and skip those ids, and persist as we go.
const reviewUrls = fsExists(URLS_FILE) ? JSON.parse(await fs.readFile(URLS_FILE, 'utf8')) : {}
let urlCaptured = 0, urlMissed = 0, urlLogged = 0
async function saveUrls() { await fs.writeFile(URLS_FILE, JSON.stringify(reviewUrls, null, 2)) }

async function captureShareLink(id) {
  if (reviewUrls[id]) return // already have it (resume)
  const card = page.locator(`[data-review-id="${id}"]`).first()
  const shareBtn = card.getByRole('button', { name: /share|分享/i }).first()
  if (!(await shareBtn.count().catch(() => 0))) { reviewUrls[id] = null; urlMissed++; return }
  await shareBtn.scrollIntoViewIfNeeded().catch(() => {})
  await shareBtn.click({ timeout: 4000 }).catch(() => {})
  // The share dialog exposes the link in a text input; fall back to scraping any
  // maps.app.goo.gl text in the dialog if the input shape differs.
  let link = null
  const input = page.locator('[role="dialog"] input, [role="dialog"] textarea').first()
  if (await input.count().catch(() => 0)) {
    await input.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {})
    link = (await input.inputValue().catch(() => '')) || null
  }
  if (!link) {
    const dlg = page.locator('[role="dialog"]').first()
    const txt = (await dlg.innerText().catch(() => '')) || ''
    const m = txt.match(/https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.com\/maps)\/\S+/)
    if (m) link = m[0]
  }
  await page.keyboard.press('Escape').catch(() => {})
  await page.waitForTimeout(250)
  if (link && /^https?:\/\//.test(link)) {
    reviewUrls[id] = link.trim()
    urlCaptured++
    if (urlLogged < 5) { console.log(`   🔗 share link: ${link.trim()}`); urlLogged++ }
  } else { reviewUrls[id] = null; urlMissed++ }
}

// ---- reviews ---------------------------------------------------------------
console.log('\n📂 Reviews — harvesting while scrolling (will take a few minutes for 359)…')
console.log('   (also capturing each review\'s Share permalink — this makes it slower)')
await openTab(page, 'reviews')
await page.waitForSelector('[data-review-id]', { timeout: 15000 }).catch(() => {})
const reviews = await harvestWhileScrolling(page, {
  label: 'reviews',
  anchor: '[data-review-id]',
  onBatch: async (fresh) => {
    for (const item of fresh) {
      await captureShareLink(item.id)
      if ((urlCaptured + urlMissed) % 10 === 0) await saveUrls()
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

// ---- photos ----------------------------------------------------------------
console.log('\n📂 Photos — harvesting while scrolling…')
await openTab(page, 'photos')
await page.waitForTimeout(2500)
const photoItems = await harvestWhileScrolling(page, {
  label: 'photos',
  anchor: 'a[href*="/photo"], [aria-label*="views"]',
  harvest: () => {
    const out = []
    for (const el of document.querySelectorAll('[aria-label]')) {
      const al = el.getAttribute('aria-label') || ''
      const m = al.match(/·\s*([\d,]+)\s*views?/i)
      if (!m) continue
      let url = ''
      const im = el.querySelector('img')
      if (im && im.src) url = im.src
      if (!url) {
        const bg = el.querySelector('[style*="background-image"]')
        const sm = bg && (bg.getAttribute('style') || '').match(/url\("?(.*?)"?\)/)
        if (sm) url = sm[1]
      }
      out.push({ key: url || al, views: parseInt(m[1].replace(/,/g, '')), label: al, url })
    }
    return out
  },
})
// grand total photo views (its own aria-label like "9,140,043 views")
const totalPhotoViews = await page.evaluate(() => {
  for (const el of document.querySelectorAll('[aria-label]')) {
    const m = (el.getAttribute('aria-label') || '').match(/^([\d,]+) views$/i)
    if (m) return parseInt(m[1].replace(/,/g, ''))
  }
  return null
})

// ---- save ------------------------------------------------------------------
await saveUrls()
const photos = { total: totalPhotoViews, count: photoItems.length, items: photoItems }
await fs.writeFile(path.join(OUT_DIR, 'reviews-raw.json'), JSON.stringify(reviews, null, 2))
await fs.writeFile(path.join(OUT_DIR, 'photos-raw.json'), JSON.stringify(photos, null, 2))
await fs.writeFile(path.join(OUT_DIR, 'stats.json'), JSON.stringify(stats, null, 2))

const urlOk = Object.values(reviewUrls).filter(Boolean).length
console.log('\n✅ Done!')
console.log(`   reviews: ${reviews.length}  |  photos: ${photos.count}  |  total photo views: ${photos.total}`)
console.log(`   share links: ${urlOk} captured (${urlMissed} missed) → review-urls.json`)
console.log(`   level: ${stats.level}  points: ${stats.points}`)
console.log('   saved → scraper/output/reviews-raw.json, photos-raw.json, stats.json, review-urls.json')
console.log('\nTell Claude it finished so it can build the real src/data.json.\n')

await browser.close()
