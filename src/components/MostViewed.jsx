import Marquee from './Marquee.jsx'
import { formatInt, CATEGORY_META, COUNTRY_META } from '../lib.js'

// Most viewed reviews, shown as a continuously scrolling marquee. Per-review
// view counts aren't on Google's web page (mobile app only), so these were read
// off the app by hand for the top reviews. English + the original Chinese.
function Card({ r, i }) {
  const meta = CATEGORY_META[r.category] || CATEGORY_META['Other']
  const country = COUNTRY_META[r.country]
  return (
    <a href={r.url} target="_blank" rel="noreferrer"
      className="relative block w-72 card p-4 transition hover:-translate-y-1">
      <span className="absolute -top-2 -left-2 z-10 h-8 min-w-8 px-1.5 grid place-items-center rounded-full
        bg-[var(--color-vermilion)] text-white font-display text-sm font-black shadow-md">#{i + 1}</span>
      <div className="flex gap-3">
        {r.img && <img src={r.img} alt={r.place} loading="lazy"
          className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-[var(--color-line)]" />}
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm truncate">{r.place}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] px-1.5 py-0.5 rounded-full"
              style={{ background: meta.color + '1f', color: meta.color }}>{meta.emoji} {r.category}</span>
            {country && <span className="text-[11px] text-[var(--color-ink-soft)]">{country.flag}</span>}
          </div>
          <div className="mt-1 font-display text-lg font-black text-[var(--color-vermilion)]">👁 {formatInt(r.views)}</div>
        </div>
      </div>
      <p className="text-xs mt-2 leading-snug line-clamp-3">{r.en}</p>
      {r.zh && <p className="text-[11px] text-[var(--color-ink-soft)] mt-1 leading-snug line-clamp-2">{r.zh}</p>}
    </a>
  )
}

export default function MostViewed({ reviews }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <span className="text-2xl">👀</span> Most Viewed Reviews
        </h2>
        <p className="text-sm text-[var(--color-ink-soft)] mt-1">The reviews people read the most, they are reading my words!</p>
      </div>
      <Marquee items={reviews} duration={55} renderItem={(r, i) => <Card r={r} i={i} />} />
    </div>
  )
}
