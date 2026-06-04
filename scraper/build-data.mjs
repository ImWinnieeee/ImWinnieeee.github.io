// Final build step: assemble src/data.json from the scraped + parsed data.
//  - featured blocks (most viewed / most reacted / owner replies) with bilingual
//    text (English I authored + her original Chinese)
//  - top photos by view count
//  - every review (with category, country/region, geocoded lat/lng) for the map
//  - real headline stats
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'output')
const SRC = path.join(__dirname, '..', 'src')
const L = (f) => JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'))

const parsed = L('reviews-parsed.json')
const photos = L('photos-raw.json')
const geo = fs.existsSync(path.join(OUT, 'geocode-cache.json')) ? L('geocode-cache.json') : {}
// per-review Share permalinks captured by scrape.mjs ({ [reviewId]: url|null })
const reviewUrls = fs.existsSync(path.join(OUT, 'review-urls.json')) ? L('review-urls.json') : {}
const PROFILE_URL = 'https://maps.app.goo.gl/e9HggWQj89SQqdSd8'

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

// ---- top photos (15) ----
const seen = new Set()
const topPhotos = [...photos.items]
  .filter((p) => p.url && p.url.includes('googleusercontent'))
  .sort((a, b) => b.views - a.views)
  .filter((p) => { const k = big(p.url); if (seen.has(k)) return false; seen.add(k); return true })
  .slice(0, 15)
  .map((p, i) => ({ id: 'ph' + i, url: big(p.url), link: p.url.replace(/=w\d+.*$/, '=w1600'), views: p.views }))

// ---- all reviews for the map (+ favorites) ----
const CITY = {
  Taipei: [25.0375, 121.5637], 'New Taipei': [25.0169, 121.4628], Taichung: [24.1477, 120.6736],
  Kaohsiung: [22.6273, 120.3014], Tainan: [22.9999, 120.2269], Hsinchu: [24.8138, 120.9675],
  Taoyuan: [24.9936, 121.301], Taiwan: [23.7, 120.96], Kyoto: [35.0116, 135.7681],
  Tokyo: [35.6762, 139.6503], Osaka: [34.6937, 135.5023], Kobe: [34.69, 135.1956],
  Nara: [34.6851, 135.8048], Japan: [35.6, 138.0], Rome: [41.9028, 12.4964],
  Florence: [43.7696, 11.2558], Venice: [45.4408, 12.3155], Milan: [45.4642, 9.19],
  Italy: [42.5, 12.5], Bangkok: [13.7563, 100.5018], Thailand: [13.75, 100.5],
}
const jitter = (id) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return [((h % 1000) / 1000 - 0.5) * 0.04, (((h >> 10) % 1000) / 1000 - 0.5) * 0.04] }
const blurb = (t) => { const s = zhClean(t).replace(/^我是台灣.*?(到訪|來訪|份到訪)\s*/, ''); return s.slice(0, 22) }

const reviews = parsed.map((r) => {
  let lat, lng
  if (geo[r.id]) { lat = geo[r.id].lat; lng = geo[r.id].lng } else {
    const c = CITY[r.region] || CITY[r.country] || CITY.Taiwan; const [dy, dx] = jitter(r.id)
    lat = c[0] + dy; lng = c[1] + dx
  }
  // only attach a deep-link when we have a real per-review permalink — a bare
  // place-name search isn't worth making the map pins clickable for
  const url = URL_OVERRIDE[r.place] || reviewUrls[r.id] || null
  return {
    id: r.id, place: disp(r.place), category: fixCat(r.place, r.category), country: r.country,
    region: r.region, rating: r.rating, date: r.date, blurb: blurb(r.text),
    photoCount: r.photoCount, lat: +lat.toFixed(5), lng: +lng.toFixed(5),
    ...(url ? { url } : {}),
  }
})

const photoCount = new Set(photos.items.filter((p) => p.url).map((p) => big(p.url))).size
const allDates = parsed.map((r) => r.date).filter(Boolean).sort()
const dateFrom = allDates[0] ? allDates[0].slice(0, 7) : ''
const dateTo = allDates[allDates.length - 1] ? allDates[allDates.length - 1].slice(0, 7) : ''

const data = {
  profile: { name: "Winnie's Food Map", level: 'Local Guide · Level 8', points: 16991, profileUrl: PROFILE_URL },
  stats: {
    totalReviews: parsed.length, ratingsOnly: 21, totalPhotoViews: photos.total || 9140043,
    photoCount, points: 16991, level: 8, dateFrom, dateTo, lastUpdated: '2026-06-04', isMockData: false,
  },
  topPhotos, mostViewed, mostReacted, ownerReplies, reviews,
}

fs.writeFileSync(path.join(SRC, 'data.json'), JSON.stringify(data, null, 2))
console.log('✅ wrote src/data.json')
console.log(`   reviews ${reviews.length} | topPhotos ${topPhotos.length} | viewed ${mostViewed.length} | reacted ${mostReacted.length} | replies ${ownerReplies.length}`)
console.log(`   stats: ${data.stats.totalReviews} reviews, ${data.stats.totalPhotoViews.toLocaleString()} photo views, ${photoCount} photos`)
