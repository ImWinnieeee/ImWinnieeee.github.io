// Build step (network): turn each review's captured Share permalink
// (review-urls.json, written by scrape.mjs) into ACCURATE Google coordinates.
//
// The maps.app.goo.gl short links redirect to a full Google Maps URL that embeds
// the place's real coordinates (…/@lat,lng,zoom/… or …!3dlat!4dlng…). We follow the
// redirect and parse those out — far more precise than geocoding the address text.
//
// Results are written into geocode-cache.json with approx:false, so build-data.mjs
// picks them up with no further changes. Links that won't resolve keep whatever
// geocode.mjs already produced (Nominatim / city fallback). Cached + resumable.
//
// Run with:  npm run resolve:coords   (after scrape, before build:data)
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'output')
const URLS = path.join(OUT, 'review-urls.json')
const CACHE = path.join(OUT, 'geocode-cache.json')

if (!fs.existsSync(URLS)) {
  console.error('❌ No review-urls.json found — run `npm run scrape` first.')
  process.exit(1)
}
const reviewUrls = JSON.parse(fs.readFileSync(URLS, 'utf8'))
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Pull lat/lng out of a resolved Google Maps URL. Prefer the !3d!4d data params
// (the place's true marker) over the @lat,lng viewport centre.
function coordsFromUrl(u) {
  let m = u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (m) return [parseFloat(m[1]), parseFloat(m[2])]
  m = u.match(/[@?&](?:ll|q)=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (m) return [parseFloat(m[1]), parseFloat(m[2])]
  m = u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (m) return [parseFloat(m[1]), parseFloat(m[2])]
  return null
}

async function resolve(shortUrl) {
  // Follow redirects; hl=en + a CONSENT cookie dodge the EU consent interstitial.
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    Cookie: 'CONSENT=YES+',
  }
  try {
    const res = await fetch(shortUrl, { headers, redirect: 'follow' })
    // coords may live in the final URL or in the returned HTML body
    let coord = coordsFromUrl(res.url || '')
    if (!coord) {
      const body = await res.text()
      coord = coordsFromUrl(body)
    }
    return coord
  } catch (e) {
    return null
  }
}

const ids = Object.keys(reviewUrls).filter((id) => reviewUrls[id])
console.log(`resolving ${ids.length} share links → coordinates…`)
let resolved = 0, kept = 0, done = 0
for (const id of ids) {
  // skip ones we've already pinned accurately on a previous run
  if (cache[id] && cache[id].approx === false && cache[id].fromLink) { done++; continue }
  const coord = await resolve(reviewUrls[id])
  if (coord) {
    cache[id] = { lat: coord[0], lng: coord[1], approx: false, fromLink: true }
    resolved++
  } else {
    kept++ // leave any existing geocode.mjs value in place
  }
  done++
  if (done % 20 === 0) {
    fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2))
    console.log(`   …${done}/${ids.length}  (resolved ${resolved}, kept-fallback ${kept})`)
  }
  await sleep(400)
}
fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2))
console.log(`✅ done: ${resolved} resolved from links, ${kept} kept existing → geocode-cache.json`)
