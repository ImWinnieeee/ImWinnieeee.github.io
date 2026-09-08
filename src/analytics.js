// Reporting access is controlled in GA; this public measurement ID grants no access.
const MEASUREMENT_ID = 'G-5K0P5MP0RY'
const PAGE_NAMES = { 'food-map': 'Food Map', activities: 'Community & Activities', work: 'Work & Education' }
let enabled = false
let page = null
let project = null
let startedAt = null

export function trackEvent(name, parameters = {}) {
  if (enabled) window.gtag('event', name, { section_name: PAGE_NAMES[page], ...parameters })
}

function flushTime() {
  if (startedAt === null) return
  const duration = Math.round(performance.now() - startedAt)
  startedAt = null
  if (duration < 1) return
  trackEvent('content_engagement', {
    content_type: project ? 'project' : 'section',
    content_name: project || PAGE_NAMES[page],
    duration_seconds: duration / 1000,
  })
}

function resumeTime() {
  if (page && document.visibilityState === 'visible' && document.hasFocus() && startedAt === null) {
    startedAt = performance.now()
  }
}

export function trackPage(nextPage) {
  if (page === nextPage) return
  flushTime()
  page = nextPage
  project = null
  // GA enhanced measurement handles page_view. This separate event labels hash routes.
  trackEvent('section_view', { content_name: PAGE_NAMES[page] })
  resumeTime()
}

export function trackProject(title) {
  if (project === title) return
  flushTime()
  project = title
  if (title) trackEvent('project_open', { project_name: title })
  resumeTime()
}

export function initAnalytics() {
  // Local previews never send data. The owner can also opt out in this browser.
  if (enabled || window.location.hostname !== 'imwinnieeee.github.io') return
  try { if (localStorage.getItem('analytics-opt-out') === 'true') return } catch { /* Storage may be unavailable. */ }
  enabled = true
  window.dataLayer = window.dataLayer || []
  window.gtag = function () { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  window.gtag('config', MEASUREMENT_ID, { allow_google_signals: false, allow_ad_personalization_signals: false })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
  document.head.appendChild(script)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushTime()
    else resumeTime()
  })
  window.addEventListener('blur', flushTime)
  window.addEventListener('focus', resumeTime)
  window.addEventListener('pagehide', flushTime)
  window.addEventListener('pageshow', resumeTime)
  // Send incremental time, so a later close does not count the same seconds twice.
  window.setInterval(() => { flushTime(); resumeTime() }, 15000)
  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href]')
    if (!link) return
    const url = new URL(link.href, window.location.href)
    if (!['https:', 'http:'].includes(url.protocol) || url.origin === window.location.origin) return
    trackEvent('external_link_click', {
      link_url: url.origin + url.pathname,
      link_text: (link.textContent || link.getAttribute('aria-label') || '').trim().slice(0, 100),
      ...(project ? { project_name: project } : {}),
    })
  })
}
