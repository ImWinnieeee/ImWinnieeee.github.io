import { useState } from 'react'
import { formatViews, CATEGORY_META } from '../lib.js'

// Feature 1: most-viewed reviews, with a rounded Top 5 / Top 10 toggle
export default function TopReviews({ reviews }) {
  const [limit, setLimit] = useState(5)
  const top = [...reviews].sort((a, b) => b.views - a.views).slice(0, limit)

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <span className="text-xl">👀</span>
          Most Viewed Reviews
        </h2>
        <div className="flex gap-2">
          {[5, 10].map((n) => (
            <button key={n} onClick={() => setLimit(n)}
              className={`btn-round text-sm !py-1 !px-3.5 ${limit === n ? 'is-active' : ''}`}>
              Top {n}
            </button>
          ))}
        </div>
      </div>

      <ol className="space-y-3.5">
        {top.map((r, i) => {
          const meta = CATEGORY_META[r.category] || CATEGORY_META['Other']
          return (
            <li key={r.id} className="flex items-start gap-3">
              <span className="font-display text-2xl font-black w-8 shrink-0 text-[var(--color-ink-soft)]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{r.place}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full shrink-0"
                    style={{ background: meta.color + '1f', color: meta.color }}>
                    {meta.emoji} {r.category}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-ink-soft)] line-clamp-2 mt-0.5">{r.text}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display font-bold text-[var(--color-vermilion)]">{formatViews(r.views)}</div>
                <div className="text-xs text-[var(--color-ink-soft)]">views</div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
