import { CATEGORY_META, COUNTRY_META } from '../lib.js'
import Marquee from './Marquee.jsx'

function ReplyCard({ r }) {
  const meta = CATEGORY_META[r.category] || CATEGORY_META['Taiwanese & Chinese']
  const country = COUNTRY_META[r.country]
  return (
    <a href={r.url} target="_blank" rel="noreferrer"
      className="group block w-[min(34rem,calc(100vw-5rem))] min-h-44 rounded-2xl p-4 transition hover:bg-[var(--color-paper)] ring-1 ring-[var(--color-line)]">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="text-base">{meta.emoji}</span>
        <span className="font-semibold text-sm md:text-base">{r.place}</span>
        {country && <span className="text-xs text-[var(--color-ink-soft)] ml-auto shrink-0">{country.flag} {r.region}</span>}
      </div>
      <p className="text-sm leading-relaxed pl-3 border-l-2" style={{ borderColor: meta.color }}>
        <span className="text-[var(--color-ink-soft)]">“</span>{r.reply}<span className="text-[var(--color-ink-soft)]">”</span>
      </p>
    </a>
  )
}

// Businesses that personally replied to my reviews — chosen for long, genuine,
// non-canned responses. A different kind of impact: the owners read and cared.
export default function OwnerReplies({ replies }) {
  return (
    <div className="card p-6 h-full">
      <h2 className="font-display text-lg md:text-3xl font-bold flex items-center gap-2">
        <span className="text-lg md:text-3xl">💬</span> Businesses Replied To
      </h2>
      <p className="text-lg md:text-xl font-semibold text-[var(--color-ink)]/85 mt-2 mb-4">Even the owners write back to thank me for providing useful info to foodies and travelers!</p>

      <Marquee items={replies} autoSpeed={0.15} renderItem={(r) => <ReplyCard r={r} />} />
    </div>
  )
}
