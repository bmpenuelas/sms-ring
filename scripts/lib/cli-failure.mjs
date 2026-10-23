import { writeSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { basename } from 'node:path'
import { stripVTControlCharacters } from 'node:util'

const border = '='.repeat(64)
let reported = false

export function supportsFailureColor(stream = process.stderr, env = process.env) {
  if (Object.hasOwn(env, 'NO_COLOR') || env.TERM === 'dumb' || env.FORCE_COLOR === '0') return false
  if (env.FORCE_COLOR) return true
  return Boolean(stream.isTTY && (stream.hasColors?.() ?? true))
}

export function formatBannerTimestamp(now = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()].map(pad).join(':')
  const date = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${String(now.getFullYear()).padStart(4, '0')}`
  return `${time} ${date}`
}

function formatBanner(message, heading, ansiColor, color, now) {
  // Prevent diagnostics from injecting terminal controls into the banner.
  const body = stripVTControlCharacters(String(message)).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/gu, '')
  const banner = `${border}\n${heading}\n${formatBannerTimestamp(now)}\n\n${body}\n${border}`
  return `\n\n${color ? `\u001b[1;${ansiColor}m${banner}\u001b[0m` : banner}\n\n`
}

export function formatFailure(message, { color = supportsFailureColor(), now = new Date() } = {}) {
  return formatBanner(message, '❌  FAILED', 31, color, now)
}

export function formatSuccess(message, { color = supportsFailureColor(), now = new Date() } = {}) {
  return formatBanner(message, '✅  SUCCESS', 32, color, now)
}

export function writeBannerSync(banner, {
  stream = process.stderr,
  platform = process.platform,
  write = writeSync,
  spawn = spawnSync,
} = {}) {
  if (platform === 'win32' && stream.isTTY) {
    // Raw fs writes use the Windows console code page, corrupting UTF-8 emoji.
    // Node's TTY stream uses Unicode console output, but may be asynchronous.
    // Wait for a small Node writer to drain normally, even inside an exit hook.
    // Payload stays on stdin, never in argv/shell commands; no code-page changes.
    const result = spawn(process.execPath, [
      '--input-type=commonjs', '--eval',
      "process.stderr.write(require('node:fs').readFileSync(0, 'utf8'))",
    ], {
      input: banner,
      encoding: 'utf8',
      stdio: ['pipe', 'ignore', stream.fd],
      shell: false,
      windowsHide: true,
      env: { ...process.env, SMSRING_BANNER_OWNER: '1' },
    })
    if (result.error || result.status !== 0) {
      // Output failure must not overwrite the original command's exit status.
      // This diagnostic is ASCII so it is readable on any console code page.
      write(stream.fd, '\n!!! TERMINAL BANNER OUTPUT ERROR !!!\nSee the command diagnostics above.\n')
    }
    return
  }
  // Files/pipes are UTF-8 byte streams. Keep exit-time writes synchronous.
  write(stream.fd, banner)
}

export function reportFailure(message) {
  writeBannerSync(formatFailure(message))
  reported = true
}

const ownsBanner = process.env.SMSRING_BANNER_OWNER !== '1'
if (ownsBanner) {
  process.on('exit', (code) => {
    if (reported) return
    // Never repeat command-line arguments or environment values (possibly secrets).
    const label = process.env.npm_lifecycle_event || basename(process.argv[1] || 'command')
    if (code === 0) {
      // Each wrapper covers one command, not necessarily the whole npm && chain.
      const scope = basename(process.argv[1] || '') === 'run-command.mjs' ? `${label}: command step` : label
      writeBannerSync(formatSuccess(`${scope} completed with exit code 0.`))
      return
    }
    reportFailure(`${label} exited with code ${code}.\nSee the diagnostics above. Do not continue until the failure is resolved.`)
  })
}
