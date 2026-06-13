// The page's headline number, top-right: photo views + review views combined.
// STATIC — it shows the real total from the last data build and does NOT grow on
// its own. It only changes when the scraper re-runs and rebuilds src/data.json
// (photo views update from Google; the review-views slice is a fixed constant —
// see build-data.mjs). No clock, no simulated tick. `updatedAt` = when the data was
// last refreshed (build-data stamps it on every `npm run refresh`).
export default function TotalViews({ photoViews, reviewViews, updatedAt }) {
  const total = (photoViews || 0) + (reviewViews || 0)
  const updated = updatedAt
    ? new Date(updatedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="text-left md:text-right shrink-0">
      <div className="flex items-center justify-start md:justify-end gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">
        <span className="inline-flex h-2 w-2 rounded-full bg-[var(--color-vermilion)]" />
        Total Views
      </div>
      <div className="font-display font-black tracking-tight text-[var(--color-vermilion)] tabular-nums leading-none text-5xl md:text-6xl">
        {total.toLocaleString('en-US')}
      </div>
      <div className="text-sm md:text-base font-medium text-[var(--color-ink-soft)] mt-1">photos + reviews</div>
      {updated && (
        <div className="text-sm md:text-base font-medium text-[var(--color-ink-soft)] mt-0.5 tabular-nums">Updated {updated}</div>
      )}
    </div>
  )
}
