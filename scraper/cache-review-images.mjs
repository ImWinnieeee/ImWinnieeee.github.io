import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const dataUrl = new URL('../src/data.json', import.meta.url)
const picksUrl = new URL('./review-image-picks.json', import.meta.url)
const data = JSON.parse(fs.readFileSync(dataUrl))
const picks = JSON.parse(fs.readFileSync(picksUrl))
const reviews = JSON.parse(fs.readFileSync(new URL('./output/reviews-parsed.json', import.meta.url)))
const directory = new URL('../public/review-images/', import.meta.url)
fs.mkdirSync(directory, { recursive: true })
let failed = 0
for (const card of [...data.mostViewed, ...data.mostReacted]) {
  const review = reviews.find(r => picks[r.id]?.place === card.place || r.place === card.place)
  if (!review) { console.error('Review not found:', card.place); failed++; continue }
  const filename = createHash('sha256').update(review.id).digest('hex').slice(0, 20) + '.jpg'
  const target = new URL(filename, directory)
  const local = '/review-images/' + filename
  if (!fs.existsSync(target)) {
    const candidates = [...new Set([picks[review.id]?.url, card.img,
      ...(review.images || []).filter(u => /=w\d{3,}-h\d{3,}-p-k-no$/.test(u) && !u.includes('-rp-')).map(u => u.split('=')[0] + '=w600')])]
      .filter(u => u?.startsWith('https://lh'))
    for (const url of candidates) {
      const temporary = target.pathname + '.tmp'
      try {
        execFileSync('curl', ['-sS', '-L', '--fail', '--max-time', '20', '-o', temporary, url], { stdio: 'pipe' })
        const bytes = fs.readFileSync(temporary)
        if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Not a JPEG')
        fs.renameSync(temporary, target)
        picks[review.id] = { ...picks[review.id], place: card.place, url }
        break
      } catch { if (fs.existsSync(temporary)) fs.unlinkSync(temporary) }
    }
  }
  if (fs.existsSync(target)) {
    picks[review.id] = { ...picks[review.id], local }
    card.img = local
    console.log('Saved:', card.place)
  } else { console.error('No accessible photo:', card.place); failed++ }
}
fs.writeFileSync(picksUrl, JSON.stringify(picks, null, 2) + '\n')
fs.writeFileSync(dataUrl, JSON.stringify(data, null, 2) + '\n')
if (failed) process.exitCode = 1
