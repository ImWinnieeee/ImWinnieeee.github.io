// Capture an actual FRAME from each hand-supplied video (not the place's photo).
// Every Share link below points to Winnie's exact Google Maps video contribution.
// The redirected viewer identifies that exact video with a "/grass-cs/" frame;
// we screenshot its dedicated viewer into public/video-thumbnails so expiring
// Google image URLs can never fall back to a place or another user's photo.
// output/video-frames.json remains the label → thumbnail lookup consumed by
// build-data.mjs, but now contains stable local asset paths.
//
// Run with:  npm run scrape:videoframes   (needs `npm run login` Chrome open)
import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'output', 'video-frames.json')
const THUMB_DIR = path.join(__dirname, '..', 'public', 'video-thumbnails')
const PORT = 9222

// label MUST match the VIDEOS list in build-data.mjs. Each URL is the permalink
// for that exact contribution, so same-place videos remain independently mapped.
const LINKS = [
  { label: '田中雞卵', file: 'tanaka-keiran.jpg', url: 'https://maps.app.goo.gl/tCnWNtfzkVZVfWSB8' },
  { label: 'Patisserie TEN& · counter', file: 'patisserie-ten-counter.jpg', url: 'https://maps.app.goo.gl/A4b15Z4hWHRcDViZ8' },
  { label: 'Patisserie TEN& · how to find it', file: 'patisserie-ten-directions.jpg', url: 'https://maps.app.goo.gl/MP8qk1A51KipQodw5' },
  { label: '瑪黑家紅茶 Marais', file: 'marais.jpg', url: 'https://maps.app.goo.gl/opAD5Ca5XFnuAt3z5' },
  { label: '長白小館', file: 'chang-bai.jpg', url: 'https://maps.app.goo.gl/VPnwiw634j3TwWzT6' },
  { label: 'Pu-Jei 葡吉 · the queue', file: 'pu-jei-queue.jpg', url: 'https://maps.app.goo.gl/JFf8VLwvZoB1fDdE9' },
  { label: 'Pu-Jei 葡吉 · the sign', file: 'pu-jei-sign.jpg', url: 'https://maps.app.goo.gl/v1HraqCjJgR9t1Uc6' },
  { label: 'La Mole Taipei', file: 'la-mole.jpg', url: 'https://maps.app.goo.gl/xgiPmsA5Qw1QfEE16' },
]

function sharedVideoFrameUrl(viewerUrl) {
  // The redirected URL embeds the exact shared contribution's own frame in
  // `!6s...!7i`. Reading this is more precise than choosing among the related
  // video thumbnails Google also renders elsewhere on the viewer page.
  const match = viewerUrl.match(/!6s(https:[^!]+)!7i/)
  if (!match) return null
  const frameUrl = decodeURIComponent(match[1])
  return frameUrl.includes('/grass-cs/') ? frameUrl : null
}

const browser = await chromium.connectOverCDP(`http://localhost:${PORT}`)
const page = browser.contexts()[0].pages()[0]
await page.bringToFront()
await fs.mkdir(THUMB_DIR, { recursive: true })
let previous = {}
try { previous = JSON.parse(await fs.readFile(OUT, 'utf8')) } catch {}

const out = {}
for (const { label, file, url } of LINKS) {
  const publicPath = `/video-thumbnails/${file}`
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    if (!sharedVideoFrameUrl(page.url())) {
      throw new Error('exact video frame was not present in the contribution URL')
    }
    // Google renders the exact shared contribution inside this dedicated viewer
    // iframe. Capturing its pixels avoids both expiring CDN URLs and the row of
    // related place videos elsewhere in the page.
    const viewer = page.locator('iframe.widget-scene-imagery-iframe').first()
    await viewer.waitFor({ state: 'visible', timeout: 10000 })
    await page.waitForTimeout(3000)
    const box = await viewer.boundingBox()
    if (!box) throw new Error('video viewer had no visible bounds')
    // Save a clean square from the top of the actual video viewport. Google's
    // playback controls sit lower in the portrait viewer, outside this crop.
    const size = Math.min(box.width, box.height)
    await page.screenshot({
      path: path.join(THUMB_DIR, file), type: 'jpeg', quality: 88,
      clip: { x: box.x, y: box.y, width: size, height: size },
    })
    out[label] = publicPath
    console.log(`✅ ${label} → ${publicPath}`)
  } catch (e) {
    // Preserve only a previously captured LOCAL frame. Never retain a temporary
    // Google URL and never substitute a place/review photo.
    const old = previous[label]
    out[label] = typeof old === 'string' && old.startsWith('/video-thumbnails/')
      ? old
      : '/video-thumbnail-placeholder.svg'
    console.log(`⚠️  ${label}: ${e.message} → ${out[label]}`)
  }
}
await fs.writeFile(OUT, JSON.stringify(out, null, 2))
console.log('\nsaved → scraper/output/video-frames.json')
// Do not close the logged-in Chrome: refresh.sh uses the same session for the
// contribution scrape immediately after this capture step. The live CDP socket
// otherwise keeps Node's event loop open forever, so explicitly end only this
// helper process after every pending file write above has completed.
process.exit(0)
