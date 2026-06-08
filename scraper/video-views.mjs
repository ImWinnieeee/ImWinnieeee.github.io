// Scrape per-VIDEO view counts off the Photos grid.
//
// Google doesn't put a video's view count in an accessible aria-label (only
// photos get "· N views"), but the grid DOES render it visually in a badge:
//   <div class="WqkvRc …"><span class="…NhBTye">👁</span><div class="HtPsUd">95</div></div>
// A grid tile is a VIDEO iff it shows a duration (e.g. "0:07"). We sweep the
// whole grid, harvest every video tile as { id (its googleusercontent photo id),
// views }, and write output/video-views.json. build-data.mjs pins each featured
// video to its `gpsId` and reads the live count from here (fallback: its baked-in
// value). The id never changes across re-scrapes, so the match is stable.
//
// NOTE: the grid is virtualized AND its markup shifts (currently tiles are
// `button.xUc6Hf`, not `a[href*="/photo"]`). If a future run finds 0 videos,
// re-check the tile selector + the `.HtPsUd` badge class below.
//
// Run with:  npm run scrape:videoviews   (needs `npm run login` Chrome open)
import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'output', 'video-views.json')
const PORT = 9222
const CONTRIB_ID = '101678781544711902540'

const harvest = () => {
  const out = []
  for (const tile of document.querySelectorAll('div.WY21Hc, button.xUc6Hf')) {
    const badge = tile.querySelector('.HtPsUd')
    if (!badge) continue
    const dur = ((tile.innerText || '').match(/\b\d+:\d{2}\b/) || [])[0] || null
    if (!dur) continue // videos only (photos have no duration overlay)
    let img = null
    const im = tile.querySelector('img')
    if (im && im.src && im.src.includes('googleusercontent')) img = im.src
    if (!img) {
      const bg = tile.querySelector('[style*="background-image"]')
      const m = bg && (bg.getAttribute('style') || '').match(/url\("?(.*?)"?\)/)
      if (m && m[1].includes('googleusercontent')) img = m[1]
    }
    const id = img ? (img.split('/').pop().match(/^[A-Za-z0-9_-]+/) || [])[0] : null
    const views = parseInt(badge.textContent.replace(/[^\d]/g, '')) || 0
    if (id) out.push({ id, views, dur })
  }
  return out
}

let browser
try {
  browser = await chromium.connectOverCDP(`http://localhost:${PORT}`)
} catch (e) {
  console.error('\n❌ Could not connect to your Chrome on port ' + PORT + '. Run `npm run login` first.\n')
  process.exit(1)
}
const ctx = browser.contexts()[0]
const page = ctx.pages().find((p) => p.url().includes('/maps/contrib/')) || ctx.pages()[0] || (await ctx.newPage())
await page.bringToFront()
await page.goto(`https://www.google.com/maps/contrib/${CONTRIB_ID}/`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)
for (const l of ['Photos', '相片', '照片']) {
  const btn = page.getByRole('tab', { name: l }).first()
  if (await btn.count().catch(() => 0)) { await btn.click().catch(() => {}); await page.waitForTimeout(1800); break }
}
await page.waitForTimeout(2500)

console.log('\n📹 Video views — sweeping the photo grid for video tiles…')
const acc = new Map() // id -> max views seen
for (let pass = 0; pass < 4; pass++) {
  let added = 0
  for (let i = 0; i < 70; i++) {
    for (const o of await page.evaluate(harvest)) {
      const e = acc.get(o.id)
      if (!e || o.views > e.views) { if (!e) added++; acc.set(o.id, o) }
    }
    await page.evaluate(() => { const t = document.querySelectorAll('div.WY21Hc, button.xUc6Hf'); if (t.length) t[t.length - 1].scrollIntoView({ block: 'end' }) })
    await page.mouse.move(220, 480)
    await page.mouse.wheel(0, 1400)
    await page.waitForTimeout(420)
  }
  console.log(`   pass ${pass + 1}: ${acc.size} videos collected`)
  // back to top so the next pass re-renders any tiles missed mid-recycle
  await page.evaluate(() => { const t = document.querySelectorAll('div.WY21Hc, button.xUc6Hf'); if (t.length) t[0].scrollIntoView({ block: 'start' }) })
  await page.waitForTimeout(800)
}

const items = [...acc.values()].sort((a, b) => b.views - a.views)
await fs.writeFile(OUT, JSON.stringify({ count: items.length, items }, null, 2))
console.log(`\n✅ ${items.length} video tiles → scraper/output/video-views.json`)
console.log('   top 8:')
for (const v of items.slice(0, 8)) console.log(`     ${String(v.views).padStart(7)}  ${v.dur}  ${v.id.slice(0, 24)}`)
console.log('   run `npm run build:data` next.')
await browser.close()
