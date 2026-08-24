// The page's headline number: photo views + review views combined.
// STATIC — it shows the real total from the last data build and does NOT grow on
// its own. It only changes when the scraper re-runs and rebuilds src/data.json
// (photo views update from Google; the review-views slice is a fixed constant —
// see build-data.mjs). No clock, no simulated tick. `updatedAt` = when the data was
// last refreshed (build-data stamps it on every `npm run refresh`).
export default function TotalViews({ photoViews, reviewViews, dateFrom, updatedAt }) {
  const total = (photoViews || 0) + (reviewViews || 0)
  const startYear = Number.parseInt(dateFrom, 10)
  const updatedYear = updatedAt ? new Date(updatedAt).getFullYear() : new Date().getFullYear()
  const years = Number.isFinite(startYear) ? Math.max(1, updatedYear - startYear) : 8

  return (
    <div className="grid w-full items-center gap-2 text-[var(--color-vermilion)] md:grid-cols-[1fr_auto_1fr] md:gap-5">
      <div className="text-sm sm:text-base md:justify-self-end md:whitespace-nowrap md:text-right md:text-base lg:text-lg font-bold leading-tight">
        My Google reviews got
      </div>
      <div className="font-display font-black tracking-[-0.055em] tabular-nums leading-none text-[clamp(3.3rem,9vw,6.7rem)]">
        {total.toLocaleString('en-US')}
      </div>
      <div className="text-sm sm:text-base md:justify-self-start md:whitespace-nowrap md:text-left md:text-base lg:text-lg font-bold leading-tight">
        views in the past {years} years
      </div>
    </div>
  )
}
