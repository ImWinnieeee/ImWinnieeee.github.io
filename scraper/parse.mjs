// Build step (no network): turn scraper/output/reviews-raw.json into clean,
// structured records — place, address, country, region, star rating, date,
// my review text, owner reply, photos — plus a best-guess food category.
// Writes scraper/output/reviews-parsed.json and prints distributions so we can
// sanity-check the auto-categorization before assembling src/data.json.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'output')
const raw = JSON.parse(fs.readFileSync(path.join(OUT, 'reviews-raw.json'), 'utf8'))

const NOW = new Date('2026-06-03')
function relToDate(s) {
  if (!s) return null
  const m = s.match(/(\d+|a|an)\s+(hour|day|week|month|year)/i)
  if (!m) return null
  const n = m[1] === 'a' || m[1] === 'an' ? 1 : parseInt(m[1])
  const unit = { hour: 0, day: 1, week: 7, month: 30, year: 365 }[m[2].toLowerCase()]
  const d = new Date(NOW)
  d.setDate(d.getDate() - n * unit)
  return d.toISOString().slice(0, 10)
}

function countryRegion(addr) {
  const a = addr || ''
  if (/Thailand|Bangkok|Krung Thep|Khwaeng|Khet /i.test(a)) return ['Thailand', 'Bangkok']
  if (/Italy|Italia|\bRM\b|Roma|Firenze|\bFI\b|Venezia|Venice|\bVE\b|Milano|\bMI\b/i.test(a)) {
    const r = /Roma|\bRM\b/i.test(a) ? 'Rome' : /Firenze|\bFI\b/i.test(a) ? 'Florence'
      : /Venez|Venice|\bVE\b/i.test(a) ? 'Venice' : /Milano|\bMI\b/i.test(a) ? 'Milan' : 'Italy'
    return ['Italy', r]
  }
  if (/Japan|〒\d|Ward,|Tokyo|Kyoto|Osaka|Kobe|Nara/i.test(a)) {
    const r = /Kyoto/i.test(a) ? 'Kyoto' : /Kobe/i.test(a) ? 'Kobe'
      : /Osaka|Namba|Dotonbori|Shinsaibashi/i.test(a) ? 'Osaka'
      : /Tokyo|Shibuya|Shinjuku|Harajuku|Ikebukuro|Akihabara|Ginza|Asakusa/i.test(a) ? 'Tokyo'
      : /Nara/i.test(a) ? 'Nara' : 'Japan'
    return ['Japan', r]
  }
  // default Taiwan
  const r = /New Taipei|新北/i.test(a) ? 'New Taipei' : /Taipei|台北/i.test(a) ? 'Taipei'
    : /Taichung|台中/i.test(a) ? 'Taichung' : /Kaohsiung|高雄/i.test(a) ? 'Kaohsiung'
    : /Tainan|台南/i.test(a) ? 'Tainan' : /Hsinchu|新竹/i.test(a) ? 'Hsinchu'
    : /Taoyuan|桃園/i.test(a) ? 'Taoyuan' : 'Taiwan'
  return ['Taiwan', r]
}

// best-guess food category. Strategy: look at the PLACE NAME (signboard) first
// — the Chinese review body pollutes keyword matching (飯/麵/炒 appear even for
// Japanese/Italian places) — then fall back to the COUNTRY as a prior.
function categorize(place, text, country) {
  const name = place.toLowerCase()
  const nameHas = (...kw) => kw.some((k) => name.includes(k.toLowerCase()))

  // 0) non-food: sights vs. other (hotels/clinics/shops) — kept out of food cats
  if (nameHas('tower', 'colosseum', 'shrine', 'temple', 'museum', 'teatro', 'fontana', 'fountain', 'castle', 'palazzo', 'duomo', 'basilica', 'cathedral', 'church', '大教堂', '教堂', '堂', 'embassy', '大使館', 'piazza', 'garden', 'old street', '稻荷', '神社', '寺', '老街', '博物館', '公園', '歌劇', '劇院', 'park', 'historical', 'relic')) return 'Attraction'
  if (nameHas('hotel', 'apartment', 'clinic', '診所', '營養', 'cofit', 'leather', 'pelletterie', '選品', '香氛', 'salon', 'medical', 'prescription', 'cloud nine')) return 'Other'

  // 1) strong NAME signals (brand / dish) — these override location
  if (nameHas('gong cha', '貢茶', 'koi', 'milk shop', 'milk tea', 'bubble', 'boba', 'thé', '手搖', '奶茶', 'touch tea')) return 'Drinks'
  if (nameHas('coffee', '咖啡', 'café', 'cafe', 'latte', 'blue bottle', 'espresso', 'caffe', 'tazza', ' tea', 'tea·', '茶')) return 'Drinks'
  if (nameHas('gelat', 'ice cream', 'nice cream', 'cremeria', 'donut', 'taiyaki', '鯛魚燒', '大福', 'daifuku', 'bakery', '麵包', 'bread', 'celebread', 'tart', '蛋糕', 'cake', 'pastry', 'crepe', '可麗餅', 'pancake', 'souffle', '舒芙蕾', '巧克力', 'chocolate', '甜點', 'dessert', '布丁', 'pudding', 'ringo', 'flor', 'vero', 'suso', 'crem', 'ponpie', '水果', 'fruit', 'pie')) return 'Dessert'
  if (nameHas('pizza', 'pasta', 'trattoria', 'ristorante', 'pizzeria', 'osteria', 'lasagna', 'risotto', 'spontini', 'italiane', 'pinseria', 'nerbone', 'botega', 'gira', 'rosmarino', 'miscusi', 'spaghett', 'gnocch')) return 'Italian'
  if (nameHas('ramen', '拉麵', 'sushi', '壽司', '鰻', 'unagi', '丼', 'udon', 'うどん', 'tempura', '天婦羅', 'yakitori', '燒肉', '串燒', 'sukiyaki', '壽喜', 'sashimi', '刺身', 'menya', 'men-ya', '麵屋', 'soba', '蕎麦', 'izakaya', '居酒屋', 'tonkatsu', '豬排', 'shabu', '和牛', 'kobe beef', 'wagyu', 'ishida', 'mishima', 'donburi', 'teishoku', '定食')) return 'Japanese'
  if (nameHas('thai', '泰', 'pad', '船麵', 'tom yum', 'kanokwan', '越南', 'pho', 'phở', 'vietnam', 'indian', '印度', 'naan', 'kashmir', 'halal', 'curry', 'mexico', '墨西哥', 'turkish', '土耳其')) return 'Southeast Asian'
  if (nameHas('dumpling', '水餃', '小籠包', '湯包', '蛋餅', '地瓜', '粥', '牛肉麵', 'beef noodle', '滷', 'xiao long', 'xinjiang', '新疆', 'san tung', '廣東', '滷味', '鹽酥', '蔥油餅', '魯肉', '臭豆腐')) return 'Taiwanese & Chinese'

  // 2) fall back to COUNTRY prior
  if (country === 'Italy') return 'Italian'
  if (country === 'Japan') return 'Japanese'
  if (country === 'Thailand') return 'Southeast Asian'
  return 'Taiwanese & Chinese'
}

const parsed = raw.map((r) => {
  const lines = (r.text || '').split('\n').map((l) => l.trim())
  const place = lines[0] || ''
  const address = lines[1] || ''
  const [country, region] = countryRegion(address)
  const ratingAria = (r.ariaLabels || []).find((a) => /^\d+ stars?$/i.test(a))
  const rating = ratingAria ? parseInt(ratingAria) : null
  const dateLine = lines.find((l) => /\bago\b/i.test(l))
  const date = relToDate(dateLine)
  // my review text: lines after date until a stop word
  let text = ''
  if (dateLine) {
    const di = lines.indexOf(dateLine)
    const body = []
    for (let i = di + 1; i < lines.length; i++) {
      const l = lines[i]
      if (/^(Like|Share|More|Response from the owner|Translated by Google|\d+)$/i.test(l)) break
      if (l === '… More' || l === '') continue
      body.push(l.replace(/… More$/, '').trim())
    }
    text = body.join(' ').trim()
  }
  // owner reply preview
  let ownerReply = ''
  const oi = (r.text || '').search(/Response from the owner/i)
  if (oi >= 0) {
    ownerReply = (r.text || '').slice(oi).replace(/Response from the owner[^\n]*\n/i, '')
      .replace(/Translated by Google.*$/is, '').replace(/… More/g, '').replace(/\s+/g, ' ').trim()
  }
  const photoCount = (r.ariaLabels || []).filter((a) => /^Photo \d+ on /i.test(a)).length
  const category = categorize(place, text, country)
  return { id: r.id, place, address, country, region, category, rating, date, text, ownerReply, photoCount, images: r.imgs || [] }
})

fs.writeFileSync(path.join(OUT, 'reviews-parsed.json'), JSON.stringify(parsed, null, 2))

// ---- report ----
const by = (arr, k) => arr.reduce((m, x) => ((m[x[k]] = (m[x[k]] || 0) + 1), m), {})
console.log('解析完成:', parsed.length, '則\n')
console.log('=== 國家分布 ===')
console.log(by(parsed, 'country'))
console.log('\n=== 分類分布 ===')
console.log(by(parsed, 'category'))
console.log('\n=== 每類抽 6 間看看準不準 ===')
const cats = [...new Set(parsed.map((p) => p.category))]
for (const c of cats) {
  const items = parsed.filter((p) => p.category === c).slice(0, 6).map((p) => p.place)
  console.log(`\n[${c}]`)
  items.forEach((p) => console.log('  · ' + p))
}
console.log('\n沒星等的:', parsed.filter((p) => p.rating == null).length, '則  沒日期的:', parsed.filter((p) => !p.date).length, '則')
