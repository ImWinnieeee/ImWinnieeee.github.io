// Build step (browser): turn each review's captured Share permalink
// (review-urls.json) into ACCURATE Google coordinates.
//
// The maps.app.goo.gl links are Firebase Dynamic Links that resolve CLIENT-SIDE to
// a /maps/reviews/@lat,lng,17z/… URL — a plain fetch can't follow them. So we open
// each in a headless browser and read the @lat,lng the map settles on. Far more
// precise than geocoding the address, and (being its own headless browser) this
// needs NO login and doesn't disturb your Chrome. Several tabs run in parallel.
//
// Results go into geocode-cache.json with approx:false + fromLink:true, so
// build-data.mjs picks them up unchanged. Unresolved links keep whatever
// geocode.mjs already produced (Nominatim / city fallback). Cached + resumable.
//
// Run:  npm run resolve:coords   (after scrape, before build:data)
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'output')
const URLS = path.join(OUT, 'review-urls.json')
const CACHE = path.join(OUT, 'geocode-cache.json')
const CONCURRENCY = 4

if (!fs.existsSync(URLS)) {
  console.error('❌ No review-urls.json found — run `npm run scrape` first.')
  process.exit(1)
}
const reviewUrls = JSON.parse(fs.readFileSync(URLS, 'utf8'))
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {}

const coordsFromUrl = (u) => {
  const m = u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null
}

// open one link and poll the URL until the map settles on @lat,lng (up to ~9s)
async function resolveOn(page, link) {
  await page.goto(link, { waitUntil: 'commit', timeout: 15000 }).catch(() => {})
  for (let i = 0; i < 22; i++) {
    await page.waitForTimeout(400)
    const c = coordsFromUrl(page.url())
    if (c) return c
  }
  return null
}

// resume: skip links we've already pinned from a link on a previous run
const todo = Object.keys(reviewUrls).filter((id) => reviewUrls[id] && !(cache[id] && cache[id].fromLink))
const already = Object.values(cache).filter((v) => v.fromLink).length
console.log(`resolving ${todo.length} share links → coordinates (${CONCURRENCY} parallel headless tabs)…`)
if (already) console.log(`   (${already} already resolved on a previous run — skipping)`)

const browser = await chromium.launch({ headless: true })
let resolved = 0, kept = 0, done = 0
let cursor = 0
function save() { fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2)) }

async function worker(n) {
  const page = await browser.newPage()
  while (cursor < todo.length) {
    const id = todo[cursor++]
    const coord = await resolveOn(page, reviewUrls[id]).catch(() => null)
    if (coord) { cache[id] = { lat: coord[0], lng: coord[1], approx: false, fromLink: true }; resolved++ }
    else kept++
    done++
    if (done % 10 === 0) { save(); console.log(`   …${done}/${todo.length}  (resolved ${resolved}, kept-fallback ${kept})`) }
  }
  await page.close().catch(() => {})
}

await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)))
save()
await browser.close().catch(() => {})
console.log(`✅ done: ${resolved} resolved from links, ${kept} kept existing → geocode-cache.json`)
