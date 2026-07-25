import { useState } from 'react'

// Deep-link to the Photos tab of Winnie's Google Maps contributions (looks more
// impressive than the plain profile). Used for the "Go to…" link in the popover.
const PROFILE_PHOTOS_URL =
  'https://www.google.com/maps/contrib/101678781544711902540/photos/@25.0428416,121.5383948,15z/data=!3m1!4b1!4m3!8m2!3m1!1e1?entry=ttu&g_ep=EgoyMDI2MDYxMC4wIKXMDSoASAFQAw%3D%3D'

// The footnote about where the site's data comes from. Collapsed to a small,
// underlined "(Data Source)" to keep the header light; the full sentence + a link
// to Winnie's Google Maps profile appear in a popover on hover (desktop) or tap
// (mobile).
export default function DataSource() {
  const [open, setOpen] = useState(false)
  return (
    <span className="group relative inline-block mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium text-[var(--color-ink-soft)] underline underline-offset-2 decoration-dotted hover:text-[var(--color-ink)]">
        (Data Source)
      </button>
      <span
        className={`card absolute left-0 top-full z-30 mt-2 w-72 p-3 text-left
          ${open ? 'block' : 'hidden'} group-hover:block`}>
        <span className="block text-xs leading-snug text-[var(--color-ink)]/85">
          The data on this site comes from Winnie’s personal Google Maps profile, built
          into this website by Winnie and her Claude Code.
        </span>
        <a href={PROFILE_PHOTOS_URL} target="_blank" rel="noreferrer"
          className="mt-2 inline-block text-xs font-semibold text-[var(--color-vermilion)] hover:underline">
          → See my photos on Google Maps
        </a>
      </span>
    </span>
  )
}
