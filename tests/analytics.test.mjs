import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
const source = readFileSync(new URL('../src/analytics.js', import.meta.url), 'utf8').replaceAll('export function', 'function')
function setup(host = 'imwinnieeee.github.io') {
  let now = 0
  const events = {}, scripts = []
  const doc = { visibilityState: 'visible', hasFocus: () => true, createElement: () => ({}), head: { appendChild: s => scripts.push(s) }, addEventListener: (k, f) => { events[k] = f } }
  const win = { location: { hostname: host, origin: `https://${host}`, href: `https://${host}/#/work` }, addEventListener: (k, f) => { events[k] = f }, setInterval: f => { events.tick = f } }
  const context = vm.createContext({ window: win, document: doc, localStorage: { getItem: () => null }, performance: { now: () => now }, Date, URL })
  vm.runInContext(source, context)
  return { run: code => vm.runInContext(code, context), advance: ms => { now += ms }, events, doc, scripts, hits: () => (win.dataLayer || []).map(x => Array.from(x)).filter(x => x[0] === 'event') }
}
test('preview sends no tracking scripts or events', () => {
  const s = setup('localhost'); s.run("initAnalytics(); trackPage('work')")
  assert.equal(s.scripts.length, 0); assert.equal(s.hits().length, 0)
})
test('deduplicates pages and attributes only incremental foreground time', () => {
  const s = setup(); s.run("initAnalytics(); initAnalytics(); trackPage('work'); trackPage('work')")
  assert.equal(s.scripts.length, 1)
  assert.equal(s.hits().filter(x => x[1] === 'section_view').length, 1)
  s.advance(2000); s.run("trackProject('Laurier')")
  s.advance(3000); s.events.tick()
  s.advance(1000); s.doc.visibilityState = 'hidden'; s.events.visibilitychange()
  s.advance(10000); s.events.tick()
  s.doc.visibilityState = 'visible'; s.events.visibilitychange()
  s.advance(2000); s.run('trackProject(null)')
  const time = s.hits().filter(x => x[1] === 'content_engagement').map(x => [x[2].content_type, x[2].duration_seconds])
  assert.deepEqual(JSON.parse(JSON.stringify(time)), [['section', 2], ['project', 3], ['project', 1], ['project', 2]])
})
test('outbound links exclude query parameters and include project context', () => {
  const s = setup(); s.run("initAnalytics(); trackPage('work'); trackProject('Seed Project')")
  s.events.click({target: {closest: () => ({href: 'https://example.com/news?private=value', textContent: 'News'})}})
  const hit = s.hits().at(-1)
  assert.equal(hit[1], 'external_link_click'); assert.equal(hit[2].link_url, 'https://example.com/news'); assert.equal(hit[2].project_name, 'Seed Project')
})
