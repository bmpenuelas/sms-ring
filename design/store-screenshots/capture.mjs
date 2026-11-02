// Captures the real app screens shown inside the store artwork, in every language.
// Needs the web preview running (npm run dev). The web build simulates the native
// plugin with localStorage, so each screen is set up by seeding that state.
//   node design/store-screenshots/capture.mjs [en,es,...]
// Writes caps/<code>/<screen>.png at 1179×2556 (393×852 points at 3x).
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { launch, sleep } from './cdp.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '../..')
const APP = process.env.APP_URL ?? 'http://localhost:5180'
const SENDERS = ['+1 415 555 0132', '+1 628 555 0177']

const { LANGUAGES } = await import(pathToFileURL(join(ROOT, 'src/i18n/languages.ts')).href)
const codes = process.argv[2] ? process.argv[2].split(',') : LANGUAGES.map((l) => l.code)
const load = async (path) => (await import(pathToFileURL(join(ROOT, path)).href)).default
const english = await load('src/i18n/words/en.ts')
// The same three list positions as "daisy meadow rocket" in English.
const PICKS = ['daisy', 'meadow', 'rocket'].map((w) => english.indexOf(w))

const wait = (ms) => `await new Promise((r) => setTimeout(r, ${ms}));`
const openSettings = `document.querySelector('.top-actions button:last-child').click(); ${wait(1200)}`
const scrollToEnd = (from) => `{
  let el = document.querySelector(${JSON.stringify(from)});
  while (el && !/auto|scroll/.test(getComputedStyle(el).overflowY)) el = el.parentElement;
  (el ?? document.scrollingElement).scrollTop = 1e6; ${wait(500)} }`

function screens(m) {
  const t = m.app
  const privacy = JSON.stringify({ verified: t.privacy.androidVerified, list: t.privacy.permissionsList })
  return {
    home: '',
    'home-low': scrollToEnd('.steps'),
    ring: `document.querySelector('.test').click(); ${wait(1600)}
      document.querySelector('.overlay .sub').textContent = ${JSON.stringify(t.ringing.from(SENDERS[0]))};`,
    // The web build has no OS permission list, so show what the Android build reports.
    privacy: `document.querySelector('.top-actions button:first-child').click(); ${wait(1200)}
      const s = ${privacy};
      const note = document.querySelector('.check .note');
      const v = [...note.attributes].find((a) => a.name.startsWith('data-v')).name;
      const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; e.setAttribute(v, ''); e.innerHTML = html; return e };
      const ok = mk('p', 'verdict', "<svg width=18 height=18 viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'><path d='M5 12.5l4.5 4.5L19 7.5'/></svg> ");
      ok.append(s.verified);
      const label = mk('p', 'ui-label', ''); label.textContent = s.list;
      const perms = ['RECEIVE_SMS', 'POST_NOTIFICATIONS', 'USE_FULL_SCREEN_INTENT', 'VIBRATE', 'WAKE_LOCK'];
      const ul = mk('ul', 'perms', perms.map((p) => '<li ' + v + '>' + p + '</li>').join('') + '<li class="absent" ' + v + '>INTERNET</li>');
      note.replaceWith(ok, label, ul);
      document.querySelector('.check header .ui-muted').textContent = 'Android 15';
      document.querySelector('.check').classList.add('done');`,
    'settings-low': openSettings + scrollToEnd('.sheet .rows'),
    language: openSettings + `document.querySelector('.sheet ul.rows').querySelectorAll('button.row')[6].click(); ${wait(1300)}`,
    try: `document.querySelector('.step.last button.round').click(); ${wait(1300)}`,
  }
}

// Parts of a screen the artwork outlines, measured in CSS pixels (393 wide) because
// their position changes with the language.
const box = (expr) => `(() => { const rs = (${expr}).map((e) => e.getBoundingClientRect());
  const x = Math.min(...rs.map((r) => r.left)), y = Math.min(...rs.map((r) => r.top));
  return { x, y, w: Math.max(...rs.map((r) => r.right)) - x, h: Math.max(...rs.map((r) => r.bottom)) - y } })()`
const FOCUS = {
  'home-low': { key: 'who', rect: box("[document.querySelectorAll('.steps .step')[1]]") },
  'settings-low': { key: 'rules', rect: box("(() => { const li = document.querySelector('.sheet .setting-link').closest('li'); return [li, li.nextElementSibling] })()") },
}

const b = await launch()
await b.viewport(393, 852, 3, true)
await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })

for (const code of codes) {
  const m = await load(`src/i18n/locales/${code}.ts`)
  const words = await load(`src/i18n/words/${code}.ts`)
  const storage = {
    'remoteRing.web.capabilities': Object.fromEntries(
      ['sms', 'notifications', 'fullScreen', 'battery', 'dnd', 'unusedApps', 'autostart', 'notificationAccess'].map((k) => [k, 'granted'])),
    'remoteRing.web.config': {
      version: 1, armed: true, passphrase: PICKS.map((i) => words[i]).join(' '), senders: SENDERS, durationSeconds: 60,
      vibrate: true, vibrateOnlyEnabled: true, vibrateOnlyPhrase: m.app.vibrateOnly.defaultPhrase, overrideDnd: true,
      tone: 'classic', volume: 100, chatApps: true,
    },
    'smsRing.language': code,
    'smsRing.prefs': { theme: 'light', wordCount: 3 },
  }
  const meta = {}
  for (const [name, js] of Object.entries(screens(m))) {
    await b.navigate(`${APP}/__blank__`)
    // The simulator in "Try a message" only says it would ring when anyone may ring.
    const seeded = name === 'try'
      ? { ...storage, 'remoteRing.web.config': { ...storage['remoteRing.web.config'], senders: [] } }
      : storage
    await b.evaluate(`localStorage.clear(); ${Object.entries(seeded).map(([k, v]) =>
      `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(typeof v === 'string' ? v : JSON.stringify(v))});`).join('')}`)
    await b.navigate(`${APP}/`)
    await b.evaluate('document.fonts.ready.then(() => true)')
    await sleep(1800)
    if (js) await b.evaluate(`(async () => { ${js} })()`)
    await sleep(500)
    const out = join(HERE, 'caps', code, `${name}.png`)
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, await b.screenshot())
    if (FOCUS[name]) meta[FOCUS[name].key] = await b.evaluate(FOCUS[name].rect)
  }
  writeFileSync(join(HERE, 'caps', code, 'meta.js'), `window.CAPMETA = ${JSON.stringify(meta)}
`)
  console.log(`${code}: captured`)
}
await b.close()
process.exit(0)
