// Minimal headless Chrome/Edge driver over the Chrome DevTools Protocol, shared by
// capture.mjs (app screens) and build.mjs (store artwork). No dependencies.
import { spawn } from 'node:child_process'
import { mkdtempSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
]

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function launch() {
  const path = BROWSERS.find((p) => existsSync(p))
  if (!path) throw new Error('No Edge or Chrome found')
  // Port 0: the browser picks a free port and writes it to DevToolsActivePort in its profile.
  const profile = mkdtempSync(join(tmpdir(), 'shots-'))
  const proc = spawn(path, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--hide-scrollbars', '--force-color-profile=srgb', '--allow-file-access-from-files', 'about:blank',
  ], { stdio: 'ignore' })
  let endpoint
  for (let i = 0; i < 100 && !endpoint; i++) {
    try {
      const [port, path] = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').trim().split('\n')
      if (path) endpoint = `ws://127.0.0.1:${port}${path}`
    } catch { await sleep(100) }
  }
  if (!endpoint) throw new Error('browser did not start')

  // Talks to the browser and addresses the page through a session.
  const ws = new WebSocket(endpoint)
  await new Promise((r) => ws.addEventListener('open', r))
  let seq = 0
  const pending = new Map()
  const waiters = []
  const listeners = []
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
    } else if (msg.method) {
      for (const w of [...waiters]) if (w.method === msg.method) { waiters.splice(waiters.indexOf(w), 1); w.resolve(msg.params) }
      for (const l of listeners) if (l.method === msg.method) l.handler(msg.params)
    }
  })
  const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++seq
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params, sessionId }))
  })
  const { targetId } = await call('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true })

  const send = (method, params = {}) => call(method, params, sessionId)
  /** Calls handler for every event of this method. */
  const on = (method, handler) => listeners.push({ method, handler })
  const once = (method, timeout = 15000) => new Promise((resolve) => {
    waiters.push({ method, resolve })
    if (timeout) setTimeout(resolve, timeout)
  })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result?.value
  }
  const viewport = (width, height, deviceScaleFactor = 1, mobile = false) =>
    send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor, mobile })
  const screenshot = async () =>
    Buffer.from((await send('Page.captureScreenshot', { format: 'png', fromSurface: true })).data, 'base64')
  /** Navigates and waits for the page to load. */
  const navigate = async (url) => {
    const loaded = once('Page.loadEventFired')
    await send('Page.navigate', { url })
    return loaded
  }

  await send('Page.enable')
  await send('Runtime.enable')
  // Ask the browser to quit (so its helper processes go too), then make sure.
  const close = async () => {
    await Promise.race([call('Browser.close').catch(() => {}), sleep(1500)])
    ws.close()
    proc.kill()
  }
  return { send, on, evaluate, navigate, viewport, screenshot, close }
}
