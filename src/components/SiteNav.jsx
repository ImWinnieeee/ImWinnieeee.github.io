const TABS = [
  { id: 'food-map', label: "Winnie's Food Map" },
  { id: 'activities', label: 'Community & Activities' },
  { id: 'work', label: 'Work & Education' },
]

export default function SiteNav({ active, onChange }) {
  return (
    <div className="site-nav-wrap">
      <nav className="site-nav" aria-label="Portfolio sections">
        <div className="site-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={active === tab.id ? 'is-current' : ''}
              onClick={() => onChange(tab.id)}
              aria-current={active === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
