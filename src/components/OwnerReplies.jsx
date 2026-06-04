import { CATEGORY_META, COUNTRY_META } from '../lib.js'

// Businesses that personally replied to my reviews — chosen for long, genuine,
// non-canned responses. A different kind of impact: the owners read and cared.
export default function OwnerReplies({ replies }) {
  return (
    <div className="card p-6 h-full">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <span className="text-2xl">💬</span> Businesses Replied To
      </h2>
      <p className="text-sm text-[var(--color-ink-soft)] mt-1 mb-4">Owners who wrote back — in their own words.</p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {replies.map((r) => {
          const meta = CATEGORY_META[r.category] || CATEGORY_META['Taiwanese & Chinese']
          const country = COUNTRY_META[r.country]
          return (
            <a key={r.place} href={r.url} target="_blank" rel="noreferrer"
              className="group block rounded-2xl p-2.5 -m-0.5 transition hover:bg-[var(--color-paper)] ring-1 ring-[var(--color-line)]">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="text-sm">{meta.emoji}</span>
                <span className="font-semibold text-sm truncate">{r.place}</span>
                {country && <span className="text-[11px] text-[var(--color-ink-soft)] ml-auto shrink-0">{country.flag} {r.region}</span>}
              </div>
              <p className="text-xs leading-snug pl-2 border-l-2" style={{ borderColor: meta.color }}>
                <span className="text-[var(--color-ink-soft)]">“</span>{r.reply}<span className="text-[var(--color-ink-soft)]">”</span>
              </p>
            </a>
          )
        })}
      </div>
    </div>
  )
}
