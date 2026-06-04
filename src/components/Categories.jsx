import { FAVORITE_CARDS, formatInt } from '../lib.js'

// Feature 5: my six favorite categories. Each place shows a one-line note
// plus its Google rating (review count), e.g. 4.7 (534).
export default function Categories({ reviews }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold mb-1 flex items-center gap-2">
        <span>🍽️</span> My Top Favorites
      </h2>
      <p className="text-sm text-[var(--color-ink-soft)] mb-5">
        The six kinds of places I review the most — each card shows my most-photographed spots, with a quick note.
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {FAVORITE_CARDS.map((card) => {
          const all = reviews.filter((r) => card.cats.includes(r.category))
          const items = [...all].sort((a, b) => (b.photoCount || 0) - (a.photoCount || 0)).slice(0, 5)
          return (
            <div key={card.label} className="card p-6" style={{ borderTop: `3px solid ${card.color}` }}>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl">{card.emoji}</span>
                <h3 className="font-display text-lg font-bold" style={{ color: card.color }}>{card.label}</h3>
                <span className="text-xs text-[var(--color-ink-soft)] ml-auto">{all.length} places</span>
              </div>
              <ul className="space-y-3">
                {items.map((r) => (
                  <li key={r.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium truncate">{r.place}</span>
                      <span className="shrink-0 text-xs whitespace-nowrap" style={{ color: card.color }}>
                        {'★'.repeat(r.rating || 0)}
                      </span>
                    </div>
                    {r.blurb && <p className="text-xs text-[var(--color-ink-soft)] mt-0.5 line-clamp-1">{r.blurb}</p>}
                  </li>
                ))}
                {items.length === 0 && <li className="text-sm text-[var(--color-ink-soft)]">No reviews yet</li>}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
