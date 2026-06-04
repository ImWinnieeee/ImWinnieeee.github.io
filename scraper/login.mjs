// Step 1: open your REAL Chrome (the one Google trusts) so you can log in.
//
// Google blocks sign-in inside Playwright's own browser because it flags it as
// automation. To get around that we launch your normal Chrome with a debugging
// port open + a dedicated profile folder. You log in here like you always do,
// then the scraper simply *connects* to this already-logged-in Chrome — no
// automated login, so nothing gets blocked.
//
// Run with:  npm run login
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROFILE_DIR = path.join(__dirname, '.chrome-profile')
const CONTRIB_ID = '101678781544711902540'
const PORT = 9222
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const child = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    `https://www.google.com/maps/contrib/${CONTRIB_ID}/`,
  ],
  { detached: true, stdio: 'ignore' }
)
child.unref()

console.log('\n🌐  Your real Chrome just opened (debugging port ' + PORT + ').')
console.log('   1) Sign in to your Google account — it should work normally now.')
console.log('   2) Make sure you can see YOUR contributions page (reviews & photos).')
console.log('   3) Keep this Chrome window OPEN.')
console.log('\n   Then run:  npm run scrape\n')
console.log('   (The scraper will connect to this same window and read your data.)\n')

// Let node exit; Chrome keeps running on its own.
process.exit(0)
