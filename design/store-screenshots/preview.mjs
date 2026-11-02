// Records the App Store app preview from the real app on an Android phone over adb, driven
// by a script, with style B captions drawn into the app's WebView. The phone's own screen
// recorder captures it at up to 120 fps, so motion is as smooth as on the device.
//   node design/store-screenshots/preview.mjs [lang]
// Needs a phone with USB or wireless debugging, the debug build installed
// (com.logicedge.smsring.debug, which sits next to the store app), adb and ffmpeg.
// Writes store/fastlane/previews/<locale>/app-preview_iphone_67.mp4: 886×1920, H.264, 30 fps,
// with a silent stereo AAC track (App Store Connect expects audio).
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { sleep } from './cdp.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '../..')
const PKG = 'com.logicedge.smsring.debug'
const FPS = 30
const W = 886, H = 1920
const code = process.argv[2] ?? 'en'

const load = async (path) => (await import(pathToFileURL(join(ROOT, path)).href)).default
const { LANGUAGES } = await import(pathToFileURL(join(ROOT, 'src/i18n/languages.ts')).href)
const lang = LANGUAGES.find((l) => l.code === code)
const m = (await load(`src/i18n/locales/${code}.ts`)).app
const words = await load(`src/i18n/words/${code}.ts`)
const english = await load('src/i18n/words/en.ts')
const passphrase = ['daisy', 'meadow', 'rocket'].map((w) => words[english.indexOf(w)]).join(' ')
const SENDER = '+1 415 555 0132'

// Captions, per language (falls back to English).
const CAPTIONS = {
  en: {
    text: 'Text your secret.', rings: 'Your phone\nrings out loud.', silent: 'Even on silent.',
    private: 'Fully private.\nNo account, no login.', try: 'Try it before\nyou need it.', end: 'No internet needed.\nJust signal.',
  },
}
const cap = { ...CAPTIONS.en, ...CAPTIONS[code] }

// The overlay layer: caption band, tap marks and the incoming text banner. Pointer
// events pass through so the script's clicks reach the app.
const OVERLAY = `(() => {
  const css = document.createElement('style')
  css.textContent = \`
    #pv { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; font-family: 'Inter Tight Variable', sans-serif; }
    #pv .band { position: absolute; left: 0; right: 0; bottom: 0; height: 168px; background: #ffc21a; border-top: 4px solid #14161f;
      display: grid; place-items: center; text-align: center; transition: transform .4s cubic-bezier(.3, .8, .3, 1); }
    #pv .band.top { bottom: auto; top: 0; border-top: 0; border-bottom: 4px solid #14161f; }
    #pv .cap { font: 900 25px/1.1 'Unbounded Variable', sans-serif; letter-spacing: -0.03em; color: #14161f; white-space: pre; transition: opacity .25s, transform .25s; }
    #pv .cap.out { opacity: 0; transform: translateY(14px); }
    #pv .tap { position: absolute; width: 64px; height: 64px; margin: -32px; border-radius: 50%; border: 4px solid #14161f;
      background: rgba(255, 194, 26, .55); animation: tap .55s ease-out forwards; }
    @keyframes tap { from { transform: scale(.4); opacity: 1 } to { transform: scale(1.3); opacity: 0 } }
    #pv .note { position: absolute; left: 12px; right: 12px; top: 14px; display: flex; gap: 12px; align-items: center; padding: 14px 16px;
      border-radius: 24px; background: rgba(250, 250, 252, .97); border: 3px solid #14161f; box-shadow: 6px 6px 0 #14161f;
      transform: translateY(-160%); transition: transform .45s cubic-bezier(.2, .9, .25, 1.15); }
    #pv .note.in { transform: none; }
    #pv .note i { flex: none; width: 46px; height: 46px; border-radius: 12px; background: #2bd96b; border: 3px solid #14161f; display: grid; place-items: center; }
    #pv .note b { display: block; font: 700 16px/1.2 'Inter Tight Variable'; color: #14161f; }
    #pv .note span { display: block; margin-top: 2px; font: 900 22px/1 'Inter Tight Variable'; letter-spacing: .12em; color: #14161f; }
  \`
  document.head.append(css)
  const pv = document.createElement('div')
  pv.id = 'pv'
  pv.innerHTML = \`
    <div class="note"><i><svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" stroke="#14161f" stroke-width="1.6"><path d="M12 3C6.5 3 2 6.6 2 11c0 2.4 1.3 4.6 3.5 6.1L5 21l4.2-2.3c.9.2 1.8.3 2.8.3 5.5 0 10-3.6 10-8S17.5 3 12 3Z"/></svg></i>
      <div><b>${SENDER}</b><span>✱✱✱✱ ✱✱✱✱✱✱</span></div></div>
    <div class="band"><p class="cap out"></p></div>\`
  document.body.append(pv)
  window.pv = {
    caption(text) {
      const c = pv.querySelector('.cap')
      c.classList.add('out')
      setTimeout(() => { c.textContent = text; c.classList.remove('out') }, 260)
    },
    banner(show) { pv.querySelector('.note').classList.toggle('in', show) },
    // Moves the caption band to the top or bottom edge, sliding out and back in.
    place(edge) {
      const band = pv.querySelector('.band')
      band.style.transform = band.classList.contains('top') ? 'translateY(-100%)' : 'translateY(100%)'
      setTimeout(() => {
        band.style.transition = 'none'
        band.classList.toggle('top', edge === 'top')
        band.style.transform = edge === 'top' ? 'translateY(-100%)' : 'translateY(100%)'
        void band.offsetHeight
        band.style.transition = ''
        band.style.transform = ''
      }, 400)
    },
    tap(el) {
      const r = el.getBoundingClientRect()
      const t = document.createElement('i')
      t.className = 'tap'
      t.style.left = r.left + r.width / 2 + 'px'
      t.style.top = r.top + r.height / 2 + 'px'
      pv.append(t)
      setTimeout(() => t.remove(), 700)
    },
  }
})()`

const q = (sel) => `document.querySelector(${JSON.stringify(sel)})`
const tapThen = (sel, after = '') => `pv.tap(${q(sel)}); setTimeout(() => { ${q(sel)}.click(); ${after} }, 180)`

// [seconds, script]: the page runs each one on its own clock, so adb latency never shifts them.
const SCRIPT = [
  [0.2, `pv.caption(${JSON.stringify(cap.text)})`],
  [1.0, `pv.banner(true)`],
  [3.0, `pv.banner(false)`],
  [3.4, `${q('.test')}.click()`],
  [3.6, `${q('.overlay .sub')}.textContent = ${JSON.stringify(m.ringing.from(SENDER))}; pv.caption(${JSON.stringify(cap.rings)})`],
  [6.6, `pv.caption(${JSON.stringify(cap.silent)})`],
  [9.2, tapThen('.overlay .stop')],
  [10.2, `pv.caption(${JSON.stringify(cap.private)})`],
  [10.6, tapThen('.top-actions button:first-child', `setTimeout(() => {
    const note = ${q('.check .note')}; if (note) note.textContent = ${JSON.stringify(m.privacy.iosNote)};
    const os = ${q('.check header .ui-muted')}; if (os) os.textContent = 'iOS 18' }, 60)`)],
  [14.4, `${q('.sheet .close')}?.click()`],
  // The simulator's verdict sits low on the screen, so the captions move up for it.
  [14.6, `pv.place('top')`],
  [15.0, `pv.caption(${JSON.stringify(cap.try)})`],
  [15.4, `${q('.step.last button.round')}.click()`],
  [16.4, `(() => {
    const box = ${q('.sheet textarea')}
    if (!box) return
    box.value = ''; box.dispatchEvent(new Event('input', { bubbles: true }))
    const text = ${JSON.stringify(passphrase)}
    let i = 0
    const type = () => { box.value = text.slice(0, ++i); box.dispatchEvent(new Event('input', { bubbles: true })); if (i < text.length) setTimeout(type, 70) }
    type()
  })()`],
  [20.4, `${q('.sheet .close')}?.click()`],
  [20.6, `pv.place('bottom')`],
  [20.8, `pv.caption(${JSON.stringify(cap.end)})`],
]
const DURATION = 24
// The caption band appears at t = 0; this spot is yellow from then on and never before,
// so it marks where the footage starts. Device pixels, inside the band, clear of the text.
const MARK = { x: 1062, y: 2318, size: 12 }

const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8' }).trim()

// Start the app and reach its WebView's DevTools socket.
adb('shell', 'am', 'force-stop', PKG)
adb('shell', 'am', 'start', '-n', `${PKG}/com.logicedge.smsring.MainActivity`)
let pid
for (let i = 0; i < 50 && !pid; i++) {
  await sleep(200)
  const id = adb('shell', `pidof ${PKG} || true`)
  if (id && adb('shell', 'cat /proc/net/unix').includes(`webview_devtools_remote_${id}`)) pid = id
}
if (!pid) throw new Error(`${PKG} did not start; install it with: cd android && gradlew assembleDebug installDebug`)
const port = adb('forward', 'tcp:0', `localabstract:webview_devtools_remote_${pid}`)
const page = async () => {
  for (let i = 0; i < 50; i++) {
    const found = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page')
    if (found) return found
    await sleep(200)
  }
  throw new Error('no WebView page')
}

let ws, seq = 0
const pending = new Map()
const connect = async () => {
  ws = new WebSocket((await page()).webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r))
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data)
    pending.get(msg.id)?.(msg)
    pending.delete(msg.id)
  })
}
const evaluate = (expression) => new Promise((resolve, reject) => {
  const id = ++seq
  pending.set(id, (msg) => {
    const r = msg.result
    if (msg.error || r.exceptionDetails) reject(new Error(JSON.stringify(msg.error ?? r.exceptionDetails.exception?.description)))
    else resolve(r.result?.value)
  })
  ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }))
})

// Set the passphrase, light theme and language, then reload so the app starts fresh with them.
await connect()
await evaluate(`(async () => {
  const p = Capacitor.Plugins.RemoteRing
  const { config } = await p.getConfig()
  await p.setConfig({ config: { ...config, armed: true, passphrase: ${JSON.stringify(passphrase)}, senders: [], durationSeconds: 60, volume: 20 } })
  localStorage.setItem('smsRing.prefs', JSON.stringify({ theme: 'light', wordCount: 3 }))
  localStorage.setItem('smsRing.language', ${JSON.stringify(code)})
  setTimeout(() => location.reload(), 50)
})()`)
await sleep(500)
ws.close()
await connect()
for (let i = 0; i < 50 && !(await evaluate(`!!document.querySelector('.test') && document.fonts.status === 'loaded'`).catch(() => false)); i++) await sleep(200)
await evaluate(`Capacitor.Plugins.SystemBars.hide({})`)
await sleep(1500)
await evaluate(`scrollTo(0, 0); ${OVERLAY};
  const band = document.querySelector('#pv .band')
  band.style.transition = 'none'
  band.style.transform = 'translateY(100%)'`)
await sleep(1000)

// The ring's notification would pop up over the footage; snoozing it the moment it is posted keeps it away.
const uid = adb('shell', 'cmd', 'package', 'list', 'packages', '-U', PKG).match(/uid:(\d+)/)[1]
const key = `0|${PKG}|7301|null|${uid}`
const ringAt = SCRIPT.find(([, s]) => s.includes('".test"'))[0]

const remote = '/sdcard/sms-ring-preview.mp4'
const recorder = spawn('adb', ['shell', 'screenrecord', '--bit-rate', '40000000', '--time-limit', String(DURATION + 4), remote], { stdio: 'ignore' })
await sleep(1200)
await evaluate(`(() => {
  const band = document.querySelector('#pv .band')
  band.style.transform = ''
  void band.offsetHeight
  band.style.transition = ''
  ${SCRIPT.map(([t, s]) => `setTimeout(() => { ${s} }, ${Math.round(t * 1000)})`).join('\n  ')}
})()`)
const started = Date.now()
const snoozes = []
while (Date.now() - started < (ringAt + 1.2) * 1000) {
  if (Date.now() - started > (ringAt - 0.05) * 1000) snoozes.push(new Promise((r) => spawn('adb', ['shell', 'cmd', 'notification', 'snooze', '--for', '120000', `'${key}'`], { stdio: 'ignore' }).on('exit', r)))
  await sleep(40)
}
await Promise.all(snoozes)
console.log('recording…')
await new Promise((r) => recorder.on('exit', r))
await evaluate(`Capacitor.Plugins.RemoteRing.stopRinging()`).catch(() => {})
ws.close()

const work = join(tmpdir(), `preview-${process.pid}`)
mkdirSync(work, { recursive: true })
const raw = join(work, 'raw.mp4')
adb('pull', remote, raw)
adb('shell', 'rm', remote)
adb('forward', '--remove', `tcp:${port}`)

// Find the frame where the caption band appears: the mark turns yellow (low blue chroma).
const probe = execFileSync('ffprobe', ['-v', 'error', '-f', 'lavfi', '-i',
  `movie=raw.mp4,crop=${MARK.size}:${MARK.size}:${MARK.x}:${MARK.y},signalstats`,
  '-show_entries', 'frame=pts_time:frame_tags=lavfi.signalstats.UAVG', '-of', 'csv=p=0'], { encoding: 'utf8', cwd: work })
const start = probe.trim().split('\n').map((l) => l.split(',').map(Number)).find(([, u]) => u < 80)?.[0]
if (start === undefined) throw new Error('caption band never appeared in the footage')
console.log(`footage starts at ${start.toFixed(3)} s`)

// Screen recordings have a variable frame rate (up to 120 fps here); take the frame due at each
// 1/30 s step, as a normal screen recording would. Blending frames leaves double images on slides.
const out = join(ROOT, 'store/fastlane/previews', lang.appStore, 'app-preview_iphone_67.mp4')
mkdirSync(dirname(out), { recursive: true })
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error', '-ss', start.toFixed(3), '-i', raw,
  '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
  '-map', '0:v', '-map', '1:a',
  '-vf', `fps=${FPS},scale=${W}:${H}:flags=lanczos,format=yuv420p`, '-t', String(DURATION),
  '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0', '-preset', 'slow', '-crf', '16', '-r', String(FPS),
  '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out,
], { stdio: 'inherit' })
rmSync(work, { recursive: true, force: true })
console.log(`wrote ${out}`)
