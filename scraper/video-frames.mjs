// Pull an actual FRAME from each hand-supplied video (not the place's photo).
// A video's Share link opens the Maps video viewer, which paints frames as
// background-images with a "/grass-cs/" url (photos use "/gps-cs-s/"). For a
// place with several videos the viewer shows them all, so we collect ALL frames
// per link and then assign a DISTINCT frame to each video (same-place videos
// otherwise duplicate). Keyed by the label used in build-data's VIDEOS list →
// output video-frames.json { [label]: frameUrl }.
//
// Run with:  npm run scrape:videoframes   (needs `npm run login` Chrome open)
import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'output', 'video-frames.json')
const PORT = 9222

// label MUST match the VIDEOS list in build-data.mjs. Order matters: when two
// videos share a place, the earlier one claims the cover, the next a distinct frame.
const LINKS = [
  { label: '田中雞卵', url: 'https://maps.app.goo.gl/tCnWNtfzkVZVfWSB8' },
  { label: 'Patisserie TEN& · counter', url: 'https://maps.app.goo.gl/A4b15Z4hWHRcDViZ8' },
  { label: 'Patisserie TEN& · how to find it', url: 'https://maps.app.goo.gl/MP8qk1A51KipQodw5' },
  { label: '瑪黑家紅茶 Marais', url: 'https://maps.app.goo.gl/opAD5Ca5XFnuAt3z5' },
  { label: '長白小館', url: 'https://maps.app.goo.gl/VPnwiw634j3TwWzT6' },
  { label: 'Pu-Jei 葡吉 · the queue', url: 'https://maps.app.goo.gl/JFf8VLwvZoB1fDdE9' },
  { label: 'Pu-Jei 葡吉 · the sign', url: 'https://maps.app.goo.gl/v1HraqCjJgR9t1Uc6' },
  { label: 'La Mole Taipei', url: 'https://maps.app.goo.gl/xgiPmsA5Qw1QfEE16' },
]

function collectFrames() {
  const map = new Map() // url -> max area seen
  for (const el of document.querySelectorAll('[style*="background-image"]')) {
    const m = (el.getAttribute('style') || '').match(/url\("?(.*?)"?\)/)
    if (m && m[1].includes('/grass-cs/')) {
      const r = el.getBoundingClientRect()
      const area = r.width * r.height
      if (!map.has(m[1]) || area > map.get(m[1])) map.set(m[1], area)
    }
  }
  return { frames: [...map.entries()].sort((a, b) => b[1] - a[1]).map(([url]) => url), h1: document.querySelector('h1')?.innerText || null }
}

const browser = await chromium.connectOverCDP(`http://localhost:${PORT}`)
const page = browser.contexts()[0].pages()[0]
await page.bringToFront()

const perLink = []
for (const { label, url } of LINKS) {
  let frames = [], h1 = null
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(4000)
    let r = await page.evaluate(collectFrames)
    // wait a bit more and merge — the grid of all the place's videos loads lazily
    await page.waitForTimeout(2500)
    const r2 = await page.evaluate(collectFrames)
    const seen = new Set(); frames = [...r.frames, ...r2.frames].filter((u) => !seen.has(u) && seen.add(u))
    h1 = r2.h1 || r.h1
  } catch (e) { console.log(`❌ ${label}: ${e.message}`) }
  perLink.push({ label, frames, h1 })
  console.log(`${frames.length ? '✅' : '⚠️ '} ${label}  → "${h1}"  (${frames.length} frame[s])`)
}

// assign distinct frames (earlier same-place video keeps the cover)
const used = new Set(); const out = {}
for (const { label, frames } of perLink) {
  const pick = frames.find((u) => !used.has(u)) || frames[0] || null
  if (pick) used.add(pick)
  out[label] = pick ? pick.replace(/=w\d+.*$/, '=w600') : null
}
await fs.writeFile(OUT, JSON.stringify(out, null, 2))
console.log('\nsaved → scraper/output/video-frames.json')
for (const [k, v] of Object.entries(out)) console.log(`  ${k}: ${v ? v.slice(50, 78) : '(none)'}`)
await browser.close()
