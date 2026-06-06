// Photos-only scrape: re-harvest the Photos tab and write photos-raw.json with
// EVERY photo tile (with OR without a view count), so the photo COUNT includes
// shots that don't have views yet.
//
// The Photos grid is virtualized + lazy-loaded, so a single downward sweep loses
// tiles that get recycled before their image URL loads (we were ~168 short of
// Google's real count). Fix: harvest in ALTERNATING passes (down, up, down, …)
// with a longer per-step pause and smaller scroll steps so lazy images resolve,
// and re-render tiles missed on the previous direction. Stop when a whole pass
// adds nothing new.
//
// Run with:  npm run scrape:photos   (needs `npm run login` Chrome open)
import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, 'output')
const CONTRIB_ID = '101678781544711902540'
const PORT = 9222

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

// Multi-pass harvest. acc keyed by photo url; we upgrade a view-less entry once
// its view count appears. A pass scrolls one direction to its end (stops after
// `stableNeeded` no-new steps); we alternate directions until a full pass adds 0.
async function harvestPhotos(page, { anchor, harvest, maxPasses = 10, stepWheel = 1000, pauseMs = 1000, stableNeeded = 8 }) {
  const acc = new Map()
  const merge = (batch) => {
    let added = 0
    for (const item of batch) {
      if (!item || item.key == null) continue
      const ex = acc.get(item.key)
      if (!ex) { acc.set(item.key, item); added++ }
      else if (ex.views == null && item.views != null) acc.set(item.key, item)
    }
    return added
  }
  const step = async (dir) => {
    await page.evaluate(({ anchor, dir }) => {
      const els = document.querySelectorAll(anchor)
      if (!els.length) return
      const target = dir === 'down' ? els[els.length - 1] : els[0]
      target.scrollIntoView({ block: dir === 'down' ? 'end' : 'start', behavior: 'instant' })
    }, { anchor, dir })
    await page.mouse.move(220, 480)
    await page.mouse.wheel(0, dir === 'down' ? stepWheel : -stepWheel)
    await page.waitForTimeout(pauseMs) // let lazy images resolve before harvesting
    return merge(await page.evaluate(harvest))
  }
  for (let pass = 0; pass < maxPasses; pass++) {
    const dir = pass % 2 === 0 ? 'down' : 'up'
    let stable = 0, passAdded = 0
    for (let i = 0; i < 800; i++) {
      const added = await step(dir)
      passAdded += added
      if (added === 0) { if (++stable >= stableNeeded) break } else stable = 0
      if (i % 8 === 0) console.log(`   …pass ${pass + 1} (${dir}): ${acc.size} total (+${added})`)
    }
    console.log(`   ↕ pass ${pass + 1} (${dir}) done: +${passAdded} new → ${acc.size} total`)
    if (pass > 0 && passAdded === 0) break // a whole pass found nothing new → converged
  }
  return [...acc.values()]
}

const photoHarvest = () => {
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
    const labels = [root.getAttribute('aria-label') || '',
      ...[...root.querySelectorAll('[aria-label]')].map((n) => n.getAttribute('aria-label') || '')]
    for (const al of labels) {
      const m = al.match(/·\s*([\d,]+)\s*views?/i)
      if (m) return { views: parseInt(m[1].replace(/,/g, '')), label: al }
    }
    return { views: null, label: labels.find(Boolean) || '' }
  }
  const consider = (root) => {
    const url = imgUrl(root)
    if (!url) return
    const { views, label } = viewsOf(root)
    const prev = byUrl.get(url)
    if (!prev || (prev.views == null && views != null)) byUrl.set(url, { key: url, url, views, label })
  }
  for (const a of document.querySelectorAll('a[href*="/photo"]')) consider(a)
  for (const el of document.querySelectorAll('[aria-label*="view" i]')) consider(el)
  return [...byUrl.values()]
}

let browser
try {
  browser = await chromium.connectOverCDP(`http://localhost:${PORT}`)
} catch (e) {
  console.error('\n❌ Could not connect to your Chrome on port ' + PORT + '. Run `npm run login` first.\n')
  process.exit(1)
}
await fs.mkdir(OUT_DIR, { recursive: true })
const ctx = browser.contexts()[0]
const page = ctx.pages().find((p) => p.url().includes('/maps/contrib/')) || ctx.pages()[0] || (await ctx.newPage())
await page.bringToFront()
await page.goto(`https://www.google.com/maps/contrib/${CONTRIB_ID}/`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)

console.log('\n📂 Photos — multi-pass harvest (down/up, lazy-load aware)…')
await openTab(page, 'photos')
await page.waitForTimeout(2500)
const photoItems = await harvestPhotos(page, { anchor: 'a[href*="/photo"], [aria-label*="views"]', harvest: photoHarvest })

// Google's own header stats: "9,174,842 views" and "1,674 photos". The photo
// COUNT here is authoritative (photos + videos) — the desktop grid only renders
// a subset of tiles, so we trust this number over the count of harvested tiles.
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

const withViews = photoItems.filter((p) => p.views != null).length
const photos = { total: totalPhotoViews, headerCount: headerStats.count, count: photoItems.length, items: photoItems }
await fs.writeFile(path.join(OUT_DIR, 'photos-raw.json'), JSON.stringify(photos, null, 2))
console.log(`\n✅ Photos: header says ${headerStats.count} photos+videos | harvested ${photoItems.length} tiles (${withViews} with views) | total views ${totalPhotoViews}`)
console.log('   saved → scraper/output/photos-raw.json — run `npm run build:data` next.')
await browser.close()
