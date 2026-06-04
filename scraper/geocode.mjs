// Build step (network): turn each review's address into lat/lng for the map,
// using OpenStreetMap's free Nominatim geocoder (max 1 req/sec per their policy).
// Results are cached to geocode-cache.json so re-runs are instant. If a lookup
// fails or gets rate-limited, we fall back to the region's city centre plus a
// small deterministic offset so every pin still lands in the right city.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'output')
const CACHE = path.join(OUT, 'geocode-cache.json')
const reviews = JSON.parse(fs.readFileSync(path.join(OUT, 'reviews-parsed.json'), 'utf8'))
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {}

const CITY = {
  Taipei: [25.0375, 121.5637], 'New Taipei': [25.0169, 121.4628], Taichung: [24.1477, 120.6736],
  Kaohsiung: [22.6273, 120.3014], Tainan: [22.9999, 120.2269], Hsinchu: [24.8138, 120.9675],
  Taoyuan: [24.9936, 121.301], Taiwan: [23.7, 120.96],
  Kyoto: [35.0116, 135.7681], Tokyo: [35.6762, 139.6503], Osaka: [34.6937, 135.5023],
  Kobe: [34.69, 135.1956], Nara: [34.6851, 135.8048], Japan: [35.6, 138.0],
  Rome: [41.9028, 12.4964], Florence: [43.7696, 11.2558], Venice: [45.4408, 12.3155],
  Milan: [45.4642, 9.19], Italy: [42.5, 12.5], Bangkok: [13.7563, 100.5018], Thailand: [13.75, 100.5],
}
// deterministic small offset from an id so same-city pins don't stack
function jitter(id) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return [((h % 1000) / 1000 - 0.5) * 0.04, (((h >> 10) % 1000) / 1000 - 0.5) * 0.04]
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function geocode(q) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'winnie-food-map/1.0 (personal project)' } })
    if (!res.ok) return null
    const j = await res.json()
    if (j[0]) return [parseFloat(j[0].lat), parseFloat(j[0].lon)]
  } catch (e) {}
  return null
}

let hits = 0, fallbacks = 0, done = 0
for (const r of reviews) {
  if (cache[r.id]) { done++; continue }
  // query: place name + a trimmed address (drop postal noise)
  const q = `${r.place}, ${r.address}`.replace(/〒\d{3}-?\d{4}/g, '').replace(/\s+/g, ' ').trim()
  let coord = await geocode(q)
  const geocoded = !!coord
  if (coord) { hits++ } else {
    const c = CITY[r.region] || CITY[r.country] || CITY.Taiwan
    const [dy, dx] = jitter(r.id)
    coord = [c[0] + dy, c[1] + dx]
    fallbacks++
  }
  // approx = we couldn't geocode and fell back to the city centre + jitter
  cache[r.id] = { lat: coord[0], lng: coord[1], approx: !geocoded }
  done++
  if (done % 20 === 0) {
    fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2))
    console.log(`   …${done}/${reviews.length}  (geocoded ${hits}, fallback ${fallbacks})`)
  }
  await sleep(1100) // be polite to Nominatim
}
fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2))
console.log(`✅ done: ${done} total, ${hits} geocoded, ${fallbacks} city-fallback → geocode-cache.json`)
