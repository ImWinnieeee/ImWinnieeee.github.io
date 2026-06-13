import { useState } from 'react'

// The footnote about where the site's data comes from. Collapsed to a small,
// underlined "(Data Source)" to keep the header light; the full sentence + a link
// to Winnie's Google Maps profile appear in a popover on hover (desktop) or tap
// (mobile).
export default function DataSource({ profileUrl }) {
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
        <a href={profileUrl} target="_blank" rel="noreferrer"
          className="mt-2 inline-block text-xs font-semibold text-[var(--color-vermilion)] hover:underline">
          → Go to Winnie’s Google Maps profile
        </a>
      </span>
    </span>
  )
}
