// Final build step: assemble src/data.json from the scraped + parsed data.
//  - featured blocks (most viewed / most reacted / owner replies) with bilingual
//    text (English I authored + her original Chinese)
//  - top photos by view count
//  - every review (with category, country/region, geocoded lat/lng) for the map
//  - real headline stats
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'output')
const SRC = path.join(__dirname, '..', 'src')
const L = (f) => JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'))

function parsePhoneTotal(value) {
  if (!value) return null
  let text = String(value).trim().toLowerCase().replace(/[,_\s]/g, '')
  text = text.replace(/(?:瀏覽)?次(?:數)?$/, '').replace(/views?$/, '')
  let multiplier = 1
  if (/[萬万]$/.test(text)) { multiplier = 1e4; text = text.slice(0, -1) }
  else if (text.endsWith('m')) { multiplier = 1e6; text = text.slice(0, -1) }
  else if (text.endsWith('k')) { multiplier = 1e3; text = text.slice(0, -1) }
  const number = Number(text)
  return Number.isFinite(number) && number > 0 ? Math.round(number * multiplier) : null
}

function askGrandTotal(photoViews) {
  if (process.env.PHONE_TOTAL_VIEWS) {
    return Promise.resolve(parsePhoneTotal(process.env.PHONE_TOTAL_VIEWS))
  }
  if (!process.stdin.isTTY) return Promise.resolve(null)
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(
      `\n📱 本次照片＋影片瀏覽數：${photoViews.toLocaleString()}\n   手機目前顯示的約略總瀏覽數是多少？（例如：1278萬；直接 Enter 則不更新明天的評論瀏覽基準）：`,
      (answer) => { rl.close(); resolve(parsePhoneTotal(answer)) }
    )
  })
}

const previousDataPath = path.join(SRC, 'data.json')
let previousData = null
try {
  if (fs.existsSync(previousDataPath)) {
    previousData = JSON.parse(fs.readFileSync(previousDataPath, 'utf8'))
  }
} catch { /* use built-in baseline only if the previous file cannot be read */ }

const parsed = L('reviews-parsed.json')
const previousReviewCount = previousData?.reviews?.length
  ?? previousData?.stats?.totalReviews
  ?? 0
const minimumReviewCount = previousReviewCount > 0
  ? Math.max(1, Math.floor(previousReviewCount * 0.8))
  : 1
if (!Array.isArray(parsed) || parsed.length < minimumReviewCount) {
  console.error(`\n❌ 評論抓取不完整：只抓到 ${Array.isArray(parsed) ? parsed.length : 0} 筆；上次 ${previousReviewCount} 筆，本次至少需 ${minimumReviewCount} 筆。`)
  console.error('   已中止：不改寫 src/data.json，也不會 commit / push。\n')
  process.exit(1)
}
const photos = L('photos-raw.json')
if (!Number.isFinite(photos?.total) || photos.total <= 0) {
  console.error(`\n❌ 照片總瀏覽數抓取失敗：total = ${JSON.stringify(photos?.total)}。`)
  console.error('   已中止：不使用舊 fallback，不改寫 src/data.json，也不會 commit / push。\n')
  process.exit(1)
}
const geo = fs.existsSync(path.join(OUT, 'geocode-cache.json')) ? L('geocode-cache.json') : {}
// per-review Share permalinks captured by scrape.mjs ({ [reviewId]: url|null })
const reviewUrls = fs.existsSync(path.join(OUT, 'review-urls.json')) ? L('review-urls.json') : {}
const PROFILE_URL = 'https://maps.app.goo.gl/e9HggWQj89SQqdSd8'

// --- live Local Guide level + contribution points, scraped from the contributions
// header by scrape.mjs → stats.json ({ level: "8", points: "18,029" }). We parse the
// digits out (points come as a comma-grouped string). If a scrape misses them (header
// DOM change), fall back to the last known values so the headline never zeroes out. ---
const FALLBACK_POINTS = 16991
const FALLBACK_LEVEL = 8
const liveStats = fs.existsSync(path.join(OUT, 'stats.json')) ? L('stats.json') : {}
const num = (v) => { const n = parseInt(String(v ?? '').replace(/[^\d]/g, ''), 10); return Number.isFinite(n) && n > 0 ? n : null }
const points = num(liveStats.points) ?? FALLBACK_POINTS
const level = num(liveStats.level) ?? FALLBACK_LEVEL
if (num(liveStats.points) == null) console.log(`   ⚠️  no scraped points in stats.json — using fallback ${FALLBACK_POINTS}`)
else console.log(`   level ${level} · points ${points.toLocaleString()} (from stats.json)`)

// --- the hand-entered view/reaction counts: pick the NEWEST views_and_reactions*.csv ---
const csvFile = fs.readdirSync(OUT)
  .filter((f) => /^views_and_reactions.*\.csv$/i.test(f))
  .map((f) => ({ f, t: fs.statSync(path.join(OUT, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t)[0]?.f
if (!csvFile) throw new Error('No views_and_reactions*.csv found in scraper/output/')
console.log('using CSV:', csvFile)
const csvRows = fs.readFileSync(path.join(OUT, csvFile), 'utf8').trim().split('\n').slice(1)
const viewsCsv = [], reactsCsv = []
for (const line of csvRows) {
  const c = line.split(',')
  if (c[0] && c[1] && !isNaN(+c[1])) viewsCsv.push([c[0].trim(), +c[1]])
  if (c[3] && c[4] && !isNaN(+c[4])) reactsCsv.push([c[3].trim(), +c[4]])
}
viewsCsv.sort((a, b) => b[1] - a[1])
reactsCsv.sort((a, b) => b[1] - a[1])

// match a CSV store name to a scraped review
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9一-鿿]/g, '')
const findReview = (name) => {
  const t = norm(name)
  return parsed.find((x) => norm(x.place) === t)
    || parsed.find((x) => norm(x.place) && (norm(x.place).includes(t) || t.includes(norm(x.place))) && Math.min(norm(x.place).length, t.length) > 4)
    || null
}
// the 5 hand-picked businesses-replied-to reviews (long, genuine, non-canned)
const REPLY_PICKS = ['Barroccino', 'Dallo Zio', 'Pelletterie', 'Gonnaeat', 'Ishida', 'EDW yellow']

// exact review permalinks Winnie supplied by hand — highest priority, then the
// per-review Share link captured during scraping, then a place-name search.
const URL_OVERRIDE = {
  'FP Pelletterie - Flavio Leather Shop': 'https://maps.app.goo.gl/cxW5HhWgef6woVno7?g_st=il',
  // scraped Share link pointed at the wrong place; this is Winnie's actual review permalink
  'Men-ya Inoichi': 'https://maps.app.goo.gl/4P4nLdCUKAoDfd2aA?g_st=ic',
  // correct Google Maps links Winnie supplied (pins were misplaced under Fukuoka)
  'Wakamatsuya': 'https://maps.app.goo.gl/NPR83mtWKGQAGSAn8?g_st=ic',
  'Yufu Mabushi "Shin" Yufuin Ekimae Branch': 'https://maps.app.goo.gl/zeGx6NzX72vZVEfk8?g_st=ic',
}
// pass the matched parsed review (has .id and .place)
const reviewUrl = (r) => {
  const rawPlace = r && r.place
  return URL_OVERRIDE[rawPlace]
    || (r && reviewUrls[r.id])
    || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawPlace || '')}`
}

// upsize Google thumbnail urls (…=w72-h72-…) to something crisp
const big = (u) => (u ? u.replace(/=w\d+.*$/, '=w600') : u)
// tidy the scraped Chinese body (drop trailing photo/video markers)
const zhClean = (t) => (t || '').replace(/\s*(\+\d+|\d:\d\d|-)\s*$/g, '').replace(/\s+/g, ' ').trim()

// fix a few obvious auto-category misses on featured items
const CATFIX = { 'Bao Lai Xuan': 'Japanese', Tuga: 'Other', 'Li Jia Restaurant': 'Other', 'PATISSERIE TEN&': 'Dessert' }
// cleaner display names for messy ones
const NAMEFIX = {
  'CREM奶油甜點專門店 ( 週一至週日468吋蛋糕均可取貨 )': 'CREM 奶油甜點專門店',
  '福太郎本店': '福太郎本店 Fukutaro',
}
const disp = (p) => NAMEFIX[p] || p
const fixCat = (p, c) => CATFIX[p] || c

// ---- English translations I authored for the featured reviews ----
const EN = {
  Celebread: 'Snagged the very last miso-edamame sourdough loaf. Genuinely sour with every bite, with a bread aroma that lingers after you swallow. Pricey but worth it — a true sourdough institution.',
  'CREM奶油甜點專門店 ( 週一至週日468吋蛋糕均可取貨 )': "Ordered a (very pricey) cake for a coworker's birthday. From service to packaging to the cake itself, everything was in a class of its own — even ten stainless-steel cutlery sets and a custom photo card.",
  'Botega del Vin': 'Lives up to the unanimous praise. Today I especially loved the mixed antipasti and the lasagna. About NT$2,200 for two (a starter, two mains, a dessert, a latte).',
  'Kanokwan Thai Noodle': 'The Pad Thai is a must-order (add meat for +NT$60) — absolutely delicious. The hot-and-sour rice-noodle soup is great too.',
  'Li Yuan': "Said to be a Jensen Huang favorite — always packed, you'll share tables at peak hours. Must-order: the scallion pancake and radish cake. The pancake is hand-rolled to order, so worth the wait.",
  'Li Jia Restaurant': 'Really tasty, run by a Korean owner. If you like miso, go for the pork-bone potato soup; the pork soup-rice is great too. NT$520 for two is a bargain.',
  Tuga: 'A lovely Portuguese restaurant — on the pricier side but genuinely good, with some delightful surprises. Great for seafood lovers. NT$2,900 for two including service.',
  'Bao Lai Xuan': 'A huge variety of ramen. For a first visit go for the Hakata tonkotsu and the char siu rice. Around NT$200-250 a head — worth it for any ramen hunter.',
  Gonnaeat: 'The quintessential Taipei brunch spot — big windows, roomy comfy seats, and a generous plate of bacon, sausage, egg and toast. Reserve at least a day ahead for the brunch slot.',
  '福太郎本店': 'Mysteriously popular with Taiwanese and Korean visitors. Not many Japanese diners the day I went, but my Japanese companion said it was delicious.',
  'Kobe Port Tower': "There wasn't much information online, so here's my own little guide to visiting.",
  'Milk Shop Luck Akihabara': 'A huge range of different milks — I drank three bottles and every one was genuinely distinct! Tip: the ranking board is on the station wall to the left of the shop, not the tags at the entrance. The glass bottles are deposit-return — finish at the door and put them back.',
  'Da Nerbone': 'Get there before the beef sandwiches sell out — at 2:30pm the most famous ones were gone and the rest felt ordinary. I came back at 11am, queued 30 minutes for the beef sandwich, and it was excellent.',
  'Men-ya Inoichi': "A Kyoto-ramen hyakumeiten (top-100 shop) that turns up in every search, and a Michelin Bib Gourmand pick. There are branches near the main shop and in Uji — all with queues.",
  'Spontini Cascade Harajuku': 'The only overseas branch of the famous Milan pizzeria. Food critics rave about it, so I came to try it myself — genuinely good 🍕.',
  'Ristorante "Dallo Zio" San Marco': 'Excellent and worth it — NT$2,000 for two, better than the other Venice restaurants I tried. We had the squid ink risotto and the zucchini-and-shrimp tagliatelle, both superb.',
  'Barroccino - L’ora del Gelato': 'Had the vanilla crème and a citrus flavor — the crème was the better of the two, with visible vanilla seeds.',
  'Kobe Beef Steak Ishida.Main-Shop': 'Booked the lunch set on Tabelog — ¥16,500 for two. Everything was delicious, though the meat portion runs a little small (as Tabelog also notes).',
  'EDW yellow Shibuya': "A trendy, much-hyped spot that genuinely delivers. It opens at 11:00 — if you don't want to wait too long, get in line before 10:45.",
  'Pu-Jei': 'The Russian (borscht) bread comes out of the oven around 2pm but selling starts ~1:40. Fresh out, it\'s piping hot with a crisp shell — rich, buttery and incredibly fragrant, with a fluffy crumb. Glorious freshly-baked carbs 💓',
  'M One Cafe Daan': 'The turkey-and-mushroom omelette set (NT$400) comes with the omelette, hash browns, yogurt, your pick of five breads, a juice, and free-refill coffee or tea. A pretty, generous brunch — reportedly a favorite of TV host Dee Hsu.',
  'Qin Wei Guan': 'A well-known Shaanxi restaurant — delicious! Six of us ordered ten dishes for under NT$600 a head. For a Saturday dinner we booked about four days ahead and still nearly missed out on a table.',
  'PATISSERIE TEN&': 'Recommended by podcaster Ken (Bailingguo) as the best cream puff he\'s had — so plenty of Taiwanese visitors go now. We had the cream puff and the canelé, and both were excellent!',
  '長白小館': 'A classic pickled-cabbage-and-pork hotpot institution. The sour-cabbage broth is the most sour I\'ve ever had — your throat tightens from the punch. A must for sour-lovers; everyone else should wait through a few rounds of added broth.',
  'Cloud Nine (Medical Prescriptions)': 'Cannabis cookies, ฿450 for three. A friend\'s recommendation — lots of Westerners and tourists. The staff member who walked us through everything spoke the best English I met on my entire Bangkok trip, and was happy to answer anything.',
  'Toritsune Shizendo': 'A spot lots of YouTubers recommend. We arrived ~10 minutes after opening and it was already 80% full but with no queue yet — mostly Japanese diners, and locals were lining up by the time we left. It\'s tucked in a residential-looking area about a 5-minute walk from the Akihabara bustle.',
  Giolitti: 'Honestly, just okay — there are far better gelato spots in Italy than this famous one.',
  'FP Pelletterie - Flavio Leather Shop': 'A leather shop run by a lovely husband-and-wife — everything handmade by their family, and it is all so charming! Backpacks and shoulder bags of every size, wallets, cardholders, book covers, charms, keyrings, belts, even golf bags. Go browse!',
  "La Casa del Caffè Tazza d'Oro": 'Got there at 8:30am — no queue at all, only about ten people inside. Had the cappuccino and the macchiato (both excellent) plus a cream bun, and liked the coffee enough to buy beans to take home.',
}

const imgOf = (r) => big((r.images || [])[0] || null)

// ---- most viewed (top 10) ----
const mostViewed = viewsCsv.map(([name, v]) => { const r = findReview(name); return r ? [r, v] : null })
  .filter(Boolean).slice(0, 10).map(([r, views]) => ({
    place: disp(r.place), category: fixCat(r.place, r.category), country: r.country, region: r.region,
    rating: r.rating, views, img: imgOf(r), url: reviewUrl(r), en: EN[r.place] || '', zh: zhClean(r.text),
  }))

// why each most-reacted review resonated — what useful thing it gave readers
const WHY = {
  'PATISSERIE TEN&': 'Names exactly what to order — the cream puff and the canelé — at a spot Taiwanese travelers were already buzzing about.',
  'Kobe Port Tower': 'There were almost no guides online, so she wrote the one visitors were missing.',
  'Milk Shop Luck Akihabara': 'Insider mechanics most people miss — where the real ranking board is, and how the bottle-deposit system works.',
  'Da Nerbone': 'Saves a wasted trip: the exact time to arrive before the famous beef sandwich sells out.',
  'Men-ya Inoichi': 'Reassures it’s worth the queue — a Michelin Bib, top-100 ramen — and flags where the branches are.',
  'Men-ya Inoichi (Original)': 'Reassures it’s worth the queue — a Michelin Bib, top-100 ramen — and flags where the branches are.',
  'Spontini Cascade Harajuku': 'Settles the question — the famous Milan pizzeria’s only overseas branch genuinely lives up to the hype.',
  'Cloud Nine (Medical Prescriptions)': 'A candid, practical take on a curiosity-driven spot — the price, what you get, and that the staff actually speak great English.',
  'Toritsune Shizendo': 'The one tip that matters: arrive right at opening to beat the queue at this locals’ favorite — plus how to find the hidden entrance.',
  'Pu-Jei': 'Exact timing intel for a queue-heavy bakery — when the Russian bread comes out, and that it keeps coming so latecomers still get some.',
  Giolitti: 'A rare honest “it’s overhyped” verdict on a famous tourist gelateria — people value the contrarian heads-up.',
  "La Casa del Caffè Tazza d'Oro": 'Beats the crowds at one of Rome’s most famous coffee bars — arrive by 8:30am for no queue, and the tip that the beans are worth taking home.',
}

// ---- most reacted (top 5) ----
const mostReacted = reactsCsv.map(([name, v]) => { const r = findReview(name); return r ? [r, v] : null })
  .filter(Boolean).slice(0, 10).map(([r, reactions]) => ({
    place: disp(r.place), category: fixCat(r.place, r.category), country: r.country,
    reactions, img: imgOf(r), url: reviewUrl(r), en: EN[r.place] || '', zh: zhClean(r.text),
    why: WHY[r.place] || '',
  }))

// ---- businesses replied to (5 hand-picked) ----
const ownerReplies = REPLY_PICKS.map((name) => findReview(name)).filter(Boolean).map((r) => ({
  place: disp(r.place), category: fixCat(r.place, r.category), country: r.country, region: r.region,
  img: imgOf(r), url: reviewUrl(r), en: EN[r.place] || '', zh: zhClean(r.text),
  reply: (r.ownerReply || '').replace(/\s+/g, ' ').trim().slice(0, 260),
}))

// ---- top photos ----
// Manually dropped from the hero (Winnie's call — too-similar/duplicate shots):
// Celebread's 2nd photo (~79.7K) and a Pu-Jei photo (~54.6K). Matched by a stable
// url fragment so it survives re-scrapes.
const PHOTO_EXCLUDE = ['6gO5RaoBYhqKmOUng_-iTYeRwH0Kx1TN_z9', 'uoDh5buhlEdelk0bKvvYYuLRxlsqK0WKp3x']
const seen = new Set()
const topPhotos = [...photos.items]
  .filter((p) => p.url && p.url.includes('googleusercontent'))
  .filter((p) => !PHOTO_EXCLUDE.some((k) => p.url.includes(k)))
  .sort((a, b) => b.views - a.views)
  .filter((p) => { const k = big(p.url); if (seen.has(k)) return false; seen.add(k); return true })
  .slice(0, 18)
  .map((p, i) => ({ id: 'ph' + i, url: big(p.url), link: p.url.replace(/=w\d+.*$/, '=w1600'), views: p.views ?? 0 }))

// ---- top videos ----
// Per-VIDEO view counts ARE scrapable from the photo grid's visual 👁 badge (a
// video tile = one showing a duration like "0:07"); video-views.mjs harvests them
// keyed by each video's stable googleusercontent photo id → output/video-views.json.
// Each entry below is pinned to that id via `gpsId`, so `views` auto-updates on
// every scrape; the baked-in number is just a fallback if the live scrape misses.
// `match` finds the review (for a still + her permalink); `url` = the video's Share
// link (click-through); thumbnails are real video stills scraped by video-frames.mjs
// → video-frames.json keyed by `label` (we fall back to a place photo if missing).
const VIDEOS = [
  { match: 'Tanaka Keiran', label: '田中雞卵', views: 195738, gpsId: 'ACgwaOuENoYztoiV1MF8n7f7nzFY', url: 'https://maps.app.goo.gl/tCnWNtfzkVZVfWSB8' },
  { match: 'PATISSERIE TEN&', label: 'Patisserie TEN& · counter', views: 158291, gpsId: 'ACgwaOsxjBNzbsUesnyMAF4AAghe', url: 'https://maps.app.goo.gl/A4b15Z4hWHRcDViZ8' },
  { match: '瑪黑家紅茶', label: '瑪黑家紅茶 Marais', views: 151584, gpsId: 'ACgwaOunYAMAQ9E6qM9a8haABXFv', url: 'https://maps.app.goo.gl/opAD5Ca5XFnuAt3z5' },
  { match: '長白小館', label: '長白小館', views: 107482, gpsId: 'ACgwaOvADcQ0WmKRhhdqb_ls10rC', url: 'https://maps.app.goo.gl/VPnwiw634j3TwWzT6' },
  { match: 'Pu-Jei', label: 'Pu-Jei 葡吉 · the queue', views: 102199, gpsId: 'ACgwaOvIn1s5Efg0ofdDvtuLePXA', url: 'https://maps.app.goo.gl/JFf8VLwvZoB1fDdE9' },
  { match: 'Pu-Jei', label: 'Pu-Jei 葡吉 · the sign', views: 93540, gpsId: 'ACgwaOtnxifcqvNrccb4KebIjvPV', url: 'https://maps.app.goo.gl/v1HraqCjJgR9t1Uc6' },
  { match: 'La Mole', label: 'La Mole Taipei', views: 55356, gpsId: 'ACgwaOsPRA5JyTZcWItw7FLd4-3w', url: 'https://maps.app.goo.gl/xgiPmsA5Qw1QfEE16' },
  { match: 'PATISSERIE TEN&', label: 'Patisserie TEN& · how to find it', views: 41556, gpsId: 'ACgwaOtjNhca4l3MCb1zEEoWddo-', url: 'https://maps.app.goo.gl/MP8qk1A51KipQodw5' },
]
const videoFrames = fs.existsSync(path.join(OUT, 'video-frames.json')) ? L('video-frames.json') : {}
// live view counts scraped from the grid; match a video's gpsId to a scraped tile
// id (prefix match — the stored gpsId is a stable leading slice of the full id).
const videoViews = fs.existsSync(path.join(OUT, 'video-views.json')) ? L('video-views.json').items || [] : []
const liveViews = (gpsId) => {
  if (!gpsId) return null
  const hit = videoViews.find((v) => v.id && v.id.startsWith(gpsId))
  return hit ? hit.views : null
}
const topVideos = VIDEOS.map((v, i) => {
  const r = findReview(v.match)
  if (!r) console.log(`   ⚠️  no review match for video: ${v.match}`)
  const imgs = (r?.images || []).map(big)
  const live = liveViews(v.gpsId)
  if (live == null) console.log(`   ⚠️  no live view count for video "${v.label}" — using baked-in ${v.views}`)
  return {
    id: 'vid' + i, place: v.label, views: live ?? v.views,
    img: videoFrames[v.label] || imgs[0] || null,
    // Google video-frame (`grass-cs`) URLs expire more often than ordinary
    // contribution photos. Keep a place photo as a durable fallback so the
    // hero never ends up with a blank tile after a data refresh.
    fallbackImg: imgs.find((img) => img !== videoFrames[v.label]) || null,
    link: v.url || (r && reviewUrls[r.id]) || null,
  }
}).filter((v) => v.img)

// ---- all reviews for the map (+ favorites) ----
const CITY = {
  Taipei: [25.0375, 121.5637], 'New Taipei': [25.0169, 121.4628], Taichung: [24.1477, 120.6736],
  Kaohsiung: [22.6273, 120.3014], Tainan: [22.9999, 120.2269], Hsinchu: [24.8138, 120.9675],
  Taoyuan: [24.9936, 121.301], Taiwan: [23.7, 120.96], Kyoto: [35.0116, 135.7681],
  Tokyo: [35.6762, 139.6503], Osaka: [34.6937, 135.5023], Kobe: [34.69, 135.1956],
  Nara: [34.6851, 135.8048], Kamakura: [35.3192, 139.5469], Fukuoka: [33.5902, 130.4017],
  Japan: [35.6, 138.0], Rome: [41.9028, 12.4964], Florence: [43.7696, 11.2558],
  Venice: [45.4408, 12.3155], Milan: [45.4642, 9.19], Napoli: [40.8518, 14.2681],
  Vatican: [41.9029, 12.4534], 'Vatican City': [41.9029, 12.4534], Italy: [42.5, 12.5], Chiayi: [23.4801, 120.4491],
  Bangkok: [13.7563, 100.5018], Thailand: [13.75, 100.5],
}
// Manual country/region fixes for reviews the address-based auto-classifier left
// in the generic "<country> / <country>" bucket (matched by a substring of the
// place name). Each → { country, region }; coords then follow the new region.
const GEOFIX = [
  ['Vatican Museums', 'Vatican', 'Vatican City'],   // its own country, not under Italy
  ['Saint Peter', 'Vatican', 'Vatican City'],       // Saint Peter’s Basilica — same trip
  ['Ginza Kagari', 'Japan', 'Tokyo'],           // Narita Airport branch
  ['Enoshima Koya', 'Japan', 'Kamakura'],
  ['Giraffa Curry Pan', 'Japan', 'Kamakura'],
  ['Tomoya Kamakura', 'Japan', 'Kamakura'],     // Tomoya Kamakura Komachi — clearly Kamakura
  ['Wakamatsuya', 'Japan', 'Fukuoka'],
  ['Yufu Mabushi', 'Japan', 'Fukuoka'],         // Yufuin (grouped under Fukuoka per Winnie)
  ['Sole Mio', 'Italy', 'Napoli'],              // O’ Sole Mio Pizza & More
  ['Duli Pizza', 'Taiwan', 'Chiayi'],
  ['Chiayi City Historical', 'Taiwan', 'Chiayi'],
  ['大麦小麦', 'Taiwan', 'Chiayi'],
  ['Democracy Turkey', 'Taiwan', 'Chiayi'],
  ['桃城豆花', 'Taiwan', 'Chiayi'],
]
const geofix = (place) => {
  for (const [m, country, region] of GEOFIX) if (place && place.includes(m)) return { country, region }
  return null
}
// exact pin coordinates for places the geocoder/city-fallback misplaced (matched by
// a substring of the place name). Resolved from Winnie's own Google Maps links.
const COORDS_OVERRIDE = [
  ['Wakamatsuya', 33.1584458, 130.3960606],   // 若松屋 — Yanagawa (was stuck at Fukuoka city centre)
  ['Yufu Mabushi', 33.2629646, 131.3556746],  // 由布まぶし「心」— Yufuin station front
]
const coordsfix = (place) => {
  for (const [m, lat, lng] of COORDS_OVERRIDE) if (place && place.includes(m)) return [lat, lng]
  return null
}
// per-store Google rating + review count scraped by scrape.mjs ({ [id]: {rating, reviews, title} })
const storeRatings = fs.existsSync(path.join(OUT, 'store-ratings.json')) ? L('store-ratings.json') : {}
const jitter = (id) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return [((h % 1000) / 1000 - 0.5) * 0.04, (((h >> 10) % 1000) / 1000 - 0.5) * 0.04] }
const blurb = (t) => { const s = zhClean(t).replace(/^我是台灣.*?(到訪|來訪|份到訪)\s*/, ''); return s.slice(0, 22) }

const reviews = parsed.map((r) => {
  const fx = geofix(r.place)
  const country = fx ? fx.country : r.country
  let region = fx ? fx.region : r.region
  // places that fell back to "<country>/<country>" couldn't be geolocated — they're
  // gone from Maps (defunct). Label that bucket clearly instead of a vague repeat.
  if (region === country) region = 'Permanently closed'
  let lat, lng
  const cfix = coordsfix(r.place)
  // a manual fix re-homes the pin to the new region (the old geocode/fallback was
  // for the wrong place); otherwise keep the real geocoded point when we have one
  if (cfix) { [lat, lng] = cfix } else if (geo[r.id] && !fx) { lat = geo[r.id].lat; lng = geo[r.id].lng } else {
    const c = CITY[region] || CITY[country] || CITY.Taiwan; const [dy, dx] = jitter(r.id)
    lat = c[0] + dy; lng = c[1] + dx
  }
  // only attach a deep-link when we have a real per-review permalink — a bare
  // place-name search isn't worth making the map pins clickable for
  const url = URL_OVERRIDE[r.place] || reviewUrls[r.id] || null
  const gr = storeRatings[r.id] || {}
  return {
    id: r.id, place: disp(r.place), category: fixCat(r.place, r.category), country,
    region, rating: r.rating, date: r.date, blurb: blurb(r.text),
    photoCount: r.photoCount, lat: +lat.toFixed(5), lng: +lng.toFixed(5),
    googleRating: gr.rating ?? null, googleReviews: gr.reviews ?? null,
    ...(url ? { url } : {}),
  }
})

// ---- favorites: 5 curated picks per category (NO ranking order) -------------
// Each store carries its LIVE Google Maps rating + review count, scraped straight
// off Maps by place-ratings.mjs (`npm run scrape:ratings` → place-ratings.json).
const placeRatings = fs.existsSync(path.join(OUT, 'place-ratings.json')) ? L('place-ratings.json') : []
const ratingByName = Object.fromEntries(placeRatings.map((p) => [p.name, p]))
// [category, scrape-key (matches place-ratings.json .name), display name, country]
// country drives the flag shown before the name (see COUNTRY_META in src/lib.js).
const FAV_LIST = [
  ['Taiwanese & Chinese', '醇涎坊古早味鍋燒意麵', '醇涎坊 古早味鍋燒意麵', 'Taiwan'],
  ['Taiwanese & Chinese', '秦味館', '秦味館 Qin Wei Guan', 'Taiwan'],
  ['Taiwanese & Chinese', '犁園湯包館', '犁園湯包館 Li Yuan', 'Taiwan'],
  ['Taiwanese & Chinese', '長白小館', '長白小館', 'Taiwan'],
  ['Taiwanese & Chinese', '寶杏堂 手切滷肉飯 溫補羊肉湯', '寶杏堂 手切滷肉飯', 'Taiwan'],
  ['Japanese', '肉料理荒川', '肉料理荒川 Arakawa', 'Japan'],
  ['Japanese', '河村食堂', '河村食堂 Kawamura', 'Japan'],
  ['Japanese', 'どろまみれ 四谷本店', 'どろまみれ 四谷本店', 'Japan'],
  ['Japanese', '寶來軒', '寶來軒 Bao Lai Xuan', 'Taiwan'],
  ['Japanese', '壽壽木 炸豬排', '壽壽木 とんかつ', 'Japan'],
  ['Italian', '培皮諾小館', 'PEPPINO 培皮諾小館', 'Taiwan'],
  ['Italian', 'Trattoria Zaza', 'Trattoria ZàZà', 'Italy'],
  ['Italian', '千層吧', '千層吧 The Lasagna Bar', 'Taiwan'],
  ['Italian', 'Ristorante "Dallo Zio" San Marco', 'Ristorante "Dallo Zio"', 'Italy'],
  ['Italian', 'La Mole', 'La Mole', 'Taiwan'],
  ['Dessert', 'VERO ~ Gelateria Cremeria', 'VERO Gelateria Cremeria', 'Italy'],
  ['Dessert', 'Regoli Pasticceria', 'Regoli Pasticceria', 'Italy'],
  ['Dessert', 'CREM 奶油甜點專賣店', 'CREM 奶油甜點', 'Taiwan'],
  ['Dessert', '中村藤吉平等院店', '中村藤吉 平等院店', 'Japan'],
  ['Dessert', 'David la Gelateria', 'David la Gelateria', 'Italy'],
  ['Drinks', '坪林手', '坪林手 Pina tshiu', 'Taiwan'],
  ['Drinks', '60+ Tea Shop 中山店', '60+ Tea Shop 中山店', 'Taiwan'],
  ['Drinks', 'Karun Thai Tea Central wOrld ชาไทยการัน', 'Karun Thai Tea (CentralwOrld)', 'Thailand'],
  ['Drinks', 'Barista Ray', 'Barista Ray', 'Taiwan'],
  ['Drinks', 'MILK SHOP LUCK 酪 秋葉原店 ミルクショップ酪 秋葉原店', 'Milk Shop 酪 (Akihabara)', 'Japan'],
  ['Other', 'MOKSHAA', 'MOKSHAA 莫夏印度餐廳 (大安)', 'Taiwan'],
  ['Other', 'イタリアンバル 食堂チャコ', '食堂チャコ', 'Japan'],
  ['Other', '通庵 熟成咖哩', '通庵 熟成咖哩', 'Taiwan'],
  ['Other', '鐵 F.f 小餐廳 (無菜單1F)', '鐵 F.f 小餐廳 (1F無菜單)', 'Taiwan'],
  ['Other', 'HI MATE!', 'HI MATE!', 'Taiwan'],
]
// Winnie's short recommendation for each favorite (what to order + her verdict),
// distilled from her own reviews. Keyed by the display name above. Shown as a
// hover/tap tooltip on the store name in the "My Top Favorites" cards. A few
// places have no usable review text yet, so their note is empty (no tooltip).
const FAV_NOTES = {
  '秦味館 Qin Wei Guan': "A well-known Shaanxi restaurant, and it's delicious. Six of us ordered ten dishes for under NT$600 each. Book ahead: even reserving about 4 days out for a Saturday dinner, we nearly missed a table.",
  '犁園湯包館 Li Yuan': "Reportedly a Jensen Huang favorite, and always packed, so expect to share tables at peak times. Must-order: the scallion pancake and the radish cake. The pancake is hand-rolled to order, so it's worth the wait.",
  '長白小館': "A classic pickled-cabbage-and-pork hotpot spot. The sour-cabbage broth is the most sour I've ever had; it almost makes your throat tighten. A must for sour lovers; everyone else should let it mellow over a few broth refills.",
  '肉料理荒川 Arakawa': "Tabelog's #1 yakiniku in Kyoto, and it lives up to it. Lots of cuts, almost all Japanese diners, and genuinely delicious. The owner is lovely too.",
  '河村食堂 Kawamura': "Cheap and seriously good: the hamburg steak, fried shrimp, croquette and omurice are all winners. It's tucked deep in a residential alley, with almost only Japanese locals eating there.",
  '寶來軒 Bao Lai Xuan': "A huge variety of ramen. For a first visit, order the Hakata tonkotsu and the char siu rice. Around NT$200 to 250 a head, and worth it for any ramen hunter.",
  'PEPPINO 培皮諾小館': "Friends who'd just been to Italy say this is the closest to real Italian pizza, and it's genuinely fantastic. Two of us had a starter, pizza, a meat main, dessert and a drink for NT$2,266 incl. service. Easier to book on weeknights.",
  'Trattoria ZàZà': "A hugely famous spot that's surprisingly good value, with big portions for relatively little. Book ahead and come for the pasta; well worth it.",
  '千層吧 The Lasagna Bar': "Tastes properly Italian, especially close to Roman flavors, and a few dishes even beat what I ate in Italy. Book at least a day ahead; no reservation, no seat.",
  'Ristorante "Dallo Zio"': "Excellent and worth it: NT$2,000 for two, better than the other Venice restaurants I tried. The squid-ink risotto and the zucchini-and-shrimp tagliatelle were both superb.",
  'La Mole': "Perfect for a date or a special dinner. An authentic Italian spot recommended by Italian influencers, and almost everything is great. The today's-special antipasto (cured ham with creamy burrata) was generous and full of texture.",
  'VERO Gelateria Cremeria': "Out of 16 gelatos across four cities on my Italy trip, this was my number one. So good I immediately bought a second scoop on the spot; don't miss it.",
  'Regoli Pasticceria': "The best cream-filled maritozzo of my whole Italy trip, even better than Gold Cup's, with cream that's among the best I've ever had. Go early; they can sell out.",
  'CREM 奶油甜點': "I ordered a (pricey) birthday cake and everything was in a class of its own: service, packaging and the cake itself. It even came with stainless-steel cutlery sets and a custom photo card (send your custom print to their LINE in advance).",
  'David la Gelateria': "The affogato is so good. It's quite different from the ones I've seen in Taiwan, but delicious.",
  '坪林手 Pina tshiu': "For anyone who loves unsweetened tea and a clean, natural tea aroma, please come. The Four Seasons Spring (NT$60, large) is fresh, light and exactly how it should taste; happily worth the price.",
  'Karun Thai Tea (CentralwOrld)': "I had more than one Thai tea a day in Bangkok, and this Thai-tea slush really stood out. Find it on the 3rd floor behind the escalator at Gaysorn Centre, next to CentralWorld.",
  'Barista Ray': "My beloved spot from Tainan: I've had their guava coffee 10+ times and it beats every other guava coffee I've tried. So happy they opened in Taipei; even on a busy Saturday the queue moved in under 10 minutes.",
  'Milk Shop 酪 (Akihabara)': "A huge range of different milks; I drank three and every one was genuinely distinct. Tip: the ranking board is on the station wall to the left of the shop (not the tags at the door), and the glass bottles are deposit-return, so finish at the door and put them back.",
  '食堂チャコ': "Really delicious and worth it, with layered flavors full of pleasant surprises. We booked the course on Tabelog (¥5,500pp) and highly recommend it: lots of dishes plus free-flow drinks, so satisfying.",
  'HI MATE!': "So good, and worth the slight wait. Having this in the morning puts me in a great mood all day. Not the cheapest, but compared with other Taipei spots at the same price it's far more generous and tastier, with rich, ample portions.",
  // extracted from Winnie's own reviews (pending her accuracy check)
  'どろまみれ 四谷本店': "A top-100 yakitori spot recommended by a Taiwanese friend who's lived in Japan for six years. Bottom line: everything is delicious, not a single miss — though it's more fun if someone in your group speaks Japanese.",
  '壽壽木 とんかつ': "Tucked in the basement of Tokyo Station, right next to Kiwamiya. I arrived around 5:30pm with 3–4 groups ahead of me and waited about 20–30 minutes to get in.",
  '通庵 熟成咖哩': "Opens at 11:30 — on a holiday I arrived at 11:40 to seven people already ahead and waited 25 minutes. To make the first seating, it's best to get there before it opens.",
}
const favorites = FAV_LIST.map(([category, key, display, country]) => {
  const g = ratingByName[key] || {}
  if (g.rating == null) console.log(`   ⚠️  no Google rating for favorite: ${key}`)
  return { category, name: display, country, googleRating: g.rating ?? null, googleReviews: g.reviews ?? null, url: g.matchedUrl || null, note: FAV_NOTES[display] || '' }
})

// Prefer Google's own header count ("1,674 photos" = photos + videos) — it's the
// authoritative total. The desktop grid only renders a subset of tiles, so the
// harvested-tile count undershoots; fall back to it only if the header is missing.
let photoCount = photos.headerCount ?? new Set(photos.items.filter((p) => p.url).map((p) => big(p.url))).size

// Guard: a partial scrape can leave photos-raw.json with only `total` and no
// `items`. Don't clobber a previously-built topPhotos/photoCount in that case —
// keep whatever the existing src/data.json already has.
let topPhotosOut = topPhotos
if (topPhotosOut.length === 0 && fs.existsSync(path.join(SRC, 'data.json'))) {
  const prev = JSON.parse(fs.readFileSync(path.join(SRC, 'data.json'), 'utf8'))
  if (prev.topPhotos && prev.topPhotos.length) {
    topPhotosOut = prev.topPhotos
    if (photos.headerCount == null) photoCount = prev.stats?.photoCount || photoCount
    console.log('   ⚠️  photos-raw.json had no items — kept previous topPhotos' + (photos.headerCount == null ? '/photoCount' : ''))
  }
}
const allDates = parsed.map((r) => r.date).filter(Boolean).sort()
const dateFrom = allDates[0] ? allDates[0].slice(0, 7) : ''
const dateTo = allDates[allDates.length - 1] ? allDates[allDates.length - 1].slice(0, 7) : ''

// Google desktop only exposes photo/video views; the phone's grand total is
// rounded and therefore must never become today's headline verbatim.
//
// Today's headline uses the review-view baseline saved by the PREVIOUS refresh:
//   today's headline = today's exact photo/video views + previous review baseline
//
// If Winnie supplies today's rounded phone total, use it only to prepare the
// review slice for the NEXT refresh:
//   next review baseline = today's phone total - today's photo/video views
const totalPhotoViews = photos.total
const totalReviewViews = Number.isFinite(previousData?.stats?.reviewViewsBaseline)
  ? previousData.stats.reviewViewsBaseline
  : Number.isFinite(previousData?.stats?.totalReviewViews)
    ? previousData.stats.totalReviewViews
    : 0
const phoneGrandTotal = await askGrandTotal(totalPhotoViews)
let reviewViewsBaseline = totalReviewViews
if (phoneGrandTotal != null && phoneGrandTotal > totalPhotoViews) {
  reviewViewsBaseline = phoneGrandTotal - totalPhotoViews
  console.log(`📱 已保存明天使用的評論瀏覽數下限：${reviewViewsBaseline.toLocaleString()}（今天手機約略總數 − 今天照片影片瀏覽數）`)
} else if (phoneGrandTotal != null) {
  console.warn(`⚠️  手機總數 ${phoneGrandTotal.toLocaleString()} 不大於照片影片瀏覽數，已忽略；明天仍沿用 ${reviewViewsBaseline.toLocaleString()}。`)
} else {
  console.log(`📱 今天未提供手機約略總數；明天仍沿用評論瀏覽數 ${reviewViewsBaseline.toLocaleString()}。`)
}
console.log(`🌐 今天網站總數：${totalPhotoViews.toLocaleString()} + 昨天保存的評論瀏覽數 ${totalReviewViews.toLocaleString()} = ${(totalPhotoViews + totalReviewViews).toLocaleString()}`)

const data = {
  profile: { name: "Winnie's Food Map", level: `Local Guide · Level ${level}`, points, profileUrl: PROFILE_URL },
  stats: {
    totalReviews: parsed.length, ratingsOnly: 21, totalPhotoViews,
    totalReviewViews, reviewViewsBaseline, photoCount, points, level, dateFrom, dateTo,
    isMockData: false,
    // when this data was last (re)built — i.e. the last `npm run refresh` (or any
    // future automated update). Shown under the Total Views headline.
    updatedAt: new Date().toISOString(),
  },
  topPhotos: topPhotosOut, topVideos, mostViewed, mostReacted, ownerReplies, reviews, favorites,
}

fs.writeFileSync(path.join(SRC, 'data.json'), JSON.stringify(data, null, 2))
console.log('✅ wrote src/data.json')
console.log(`   reviews ${reviews.length} | topPhotos ${topPhotos.length} | viewed ${mostViewed.length} | reacted ${mostReacted.length} | replies ${ownerReplies.length}`)
console.log(`   stats: ${data.stats.totalReviews} reviews, ${data.stats.totalPhotoViews.toLocaleString()} photo views, ${photoCount} photos`)
