import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { formatBannerTimestamp, formatFailure, formatSuccess, supportsFailureColor, writeBannerSync } from '../scripts/lib/cli-failure.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const runner = resolve(root, 'scripts/run-command.mjs')
const reporter = new URL('../scripts/lib/cli-failure.mjs', import.meta.url).href
const ansi = /\u001b\[/u
const border = '='.repeat(64)
const timestamp = /\d{2}:\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}/u

function environment(extra: Record<string, string> = {}) {
  const env: Record<string, string | undefined> = { ...process.env }
  for (const key of ['SMSRING_BANNER_OWNER', 'NO_COLOR', 'FORCE_COLOR', 'TERM', 'npm_lifecycle_event']) delete env[key]
  return { ...env, ...extra }
}

function node(args: string[], options: Record<string, unknown> = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: root, env: environment(), encoding: 'utf8', timeout: 30_000, ...options,
  })
  assert.ifError(result.error)
  return result
}

test('failure banners use blank lines, emoji, symbols and optional bold red', () => {
  const plain = formatFailure('No Android devices or emulators found.', { color: false, now: new Date(2026, 9, 18, 9, 5, 7) })
  assert.ok(plain.startsWith(`\n\n${border}\n❌  FAILED\n09:05:07 18/10/2026\n\n`))
  assert.ok(plain.endsWith(`${border}\n\n`))
  assert.doesNotMatch(plain, ansi)
  assert.match(formatFailure('failure', { color: true }), /\u001b\[1;31m[\s\S]*\u001b\[0m/u)
  const sanitized = formatFailure('\u001b[2Jinjected\u001b]0;title\u0007\u0008\u0000', { color: false })
  assert.doesNotMatch(sanitized, ansi)
  assert.doesNotMatch(sanitized, /[\u0000\u0007\u0008]/u)
})

test('success banners match the failure style with a checkmark and optional bold green', () => {
  const plain = formatSuccess('Command completed.', { color: false, now: new Date(2026, 9, 18, 9, 5, 7) })
  assert.ok(plain.startsWith(`\n\n${border}\n✅  SUCCESS\n09:05:07 18/10/2026\n\n`))
  assert.ok(plain.endsWith(`${border}\n\n`))
  assert.doesNotMatch(plain, ansi)
  assert.match(formatSuccess('Command completed.', { color: true }), /\u001b\[1;32m[\s\S]*\u001b\[0m/u)
})

test('banners show zero-padded local time before date', () => {
  assert.equal(formatBannerTimestamp(new Date(2026, 9, 18, 9, 5, 7)), '09:05:07 18/10/2026')
  assert.equal(formatBannerTimestamp(new Date(2027, 0, 1, 0, 0, 0)), '00:00:00 01/01/2027')
  assert.match(formatBannerTimestamp(), new RegExp(`^${timestamp.source}$`, 'u'))
})

test('stderr terminal capability, NO_COLOR, FORCE_COLOR and TERM=dumb control color', () => {
  const tty = { isTTY: true, hasColors: () => true }
  assert.equal(supportsFailureColor(tty as never, {}), true)
  assert.equal(supportsFailureColor({ isTTY: false } as never, {}), false)
  assert.equal(supportsFailureColor(tty as never, { FORCE_COLOR: '0' }), false)
  assert.equal(supportsFailureColor({ isTTY: false } as never, { FORCE_COLOR: '1' }), true)
  assert.equal(supportsFailureColor(tty as never, { NO_COLOR: '', FORCE_COLOR: '1' }), false)
  assert.equal(supportsFailureColor(tty as never, { TERM: 'dumb', FORCE_COLOR: '1' }), false)
})

test('Windows console banners use Node Unicode TTY output; redirected output stays UTF-8', () => {
  const banner = formatFailure('PRIVATE_DIAGNOSTIC', { color: true })
  let completed = false
  writeBannerSync(banner, {
    platform: 'win32', stream: { isTTY: true, fd: 2 } as never,
    write: () => assert.fail('Do not send UTF-8 bytes directly to a Windows console'),
    spawn: ((executable: string, argv: string[], options: Record<string, never>) => {
      assert.equal(executable, process.execPath)
      assert.doesNotMatch(argv.join(' '), /PRIVATE_DIAGNOSTIC|chcp|powershell|cmd\.exe/)
      assert.equal(options.input, banner)
      assert.equal(options.shell, false)
      completed = true
      return { status: 0 }
    }) as never,
  })
  assert.equal(completed, true)

  let written = ''
  writeBannerSync(banner, {
    platform: 'win32', stream: { isTTY: false, fd: 2 } as never,
    write: ((fd: number, text: string) => { assert.equal(fd, 2); written = text }) as never,
    spawn: (() => assert.fail('No output helper needed for this stream')) as never,
  })
  assert.equal(written, banner)
})

test('successful commands report one green step banner on stderr, without changing stdout', () => {
  const result = node([runner, '--', 'node', runner, '--', 'node', '-e', 'console.log("payload")', 'SECRET_ARGUMENT'], {
    env: environment({ FORCE_COLOR: '1', npm_lifecycle_event: 'test:synthetic', PRIVATE_VALUE: 'SECRET_ENVIRONMENT' }),
  })
  assert.equal(result.status, 0)
  assert.equal(result.stdout.trim(), 'payload')
  assert.match(result.stderr, /\u001b\[1;32m/u)
  assert.match(result.stderr, /test:synthetic: command step completed with exit code 0/)
  assert.equal(result.stderr.split('✅  SUCCESS').length - 1, 1)
  assert.doesNotMatch(result.stderr, /SECRET_ARGUMENT|SECRET_ENVIRONMENT|❌  FAILED/)
})

test('failures keep their exit status and diagnostics, never echo argv, and never emit success', () => {
  const result = node([runner, '--', 'node', '-e', "console.error('original diagnostic'); process.exit(23)", 'SECRET_ARGUMENT'], {
    env: environment({ npm_lifecycle_event: 'test:synthetic' }),
  })
  assert.equal(result.status, 23)
  assert.match(result.stderr, /original diagnostic[\s\S]*❌  FAILED[\s\S]*test:synthetic exited with code 23/)
  assert.doesNotMatch(result.stderr, /SECRET_ARGUMENT|✅  SUCCESS/)
  assert.doesNotMatch(result.stderr, ansi)

  const missing = node([runner, '--', 'smsring-nonexistent-command', 'PRIVATE_ARGUMENT'])
  assert.equal(missing.status, 1)
  assert.match(missing.stderr, /❌  FAILED/)
  assert.doesNotMatch(missing.stderr, /PRIVATE_ARGUMENT/)
})

test('nested wrappers produce one generic banner and preserve failure status', () => {
  const result = node([runner, '--', 'node', runner, '--', 'node', '-e', 'process.exit(17)'])
  assert.equal(result.status, 17)
  assert.equal(result.stderr.split('❌  FAILED').length - 1, 1)
})

test('direct custom scripts report explicit exits, uncaught errors and rejections; warnings stay nonfatal', () => {
  for (const code of ['process.exit(7)', 'process.exitCode = 7', 'throw new Error("synthetic error")', 'await Promise.reject(new Error("synthetic rejection"))']) {
    const result = node(['--input-type=module', '-e', `import ${JSON.stringify(reporter)}; ${code}`])
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /❌  FAILED/)
  }
  const ok = node(['--input-type=module', '-e', `import ${JSON.stringify(reporter)}; console.error('nonfatal warning')`])
  assert.equal(ok.status, 0)
  assert.match(ok.stderr, /nonfatal warning[\s\S]*✅  SUCCESS/)
  const explicit = node(['--input-type=module', '-e', `import { reportFailure } from ${JSON.stringify(reporter)}; reportFailure('Failed check'); process.exit(0)`])
  assert.equal(explicit.status, 0)
  assert.doesNotMatch(explicit.stderr, /✅  SUCCESS/)
})

test('signal termination remains a failure instead of an apparent success', () => {
  const result = node([runner, '--', 'node', '-e', 'process.kill(process.pid, "SIGTERM")'])
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /❌  FAILED/)
})

test('every npm command and custom Node script is covered by the banners', () => {
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  for (const [name, command] of Object.entries<string>(pkg.scripts)) {
    if (name === 'prepare') continue
    for (const segment of command.split(' && ')) {
      const direct = /^node scripts\/[\w-]+\.mjs\b/.test(segment) // imports the reporter itself
      assert.ok(segment.startsWith('node scripts/run-command.mjs -- ') || direct, `${name}: ${segment}`)
    }
  }
  for (const file of readdirSync(resolve(root, 'scripts')).filter((entry) => entry.endsWith('.mjs'))) {
    assert.match(readFileSync(resolve(root, 'scripts', file), 'utf8'), /import .*['"]\.\/lib\/cli-failure\.mjs['"]/, file)
  }
})
