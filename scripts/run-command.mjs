#!/usr/bin/env node

import './lib/cli-failure.mjs'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { constants } from 'node:os'
import { dirname, join, resolve } from 'node:path'

// npm scripts wrap each command separately, leaving && and pipes to npm's shell.
// All received arguments stay argv elements; never concatenate them into a shell.
export function resolveCommand(command, args, { cwd = process.cwd(), env = process.env } = {}) {
  if (command === 'node') return [process.execPath, args]
  if (command === 'npm') {
    const npmCli = env.npm_execpath || join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
    if (!existsSync(npmCli)) throw new Error('Cannot locate npm CLI. Run this command through npm.')
    return [process.execPath, [npmCli, ...args]]
  }
  // Resolve workspace JS tools without executing Windows .cmd shims via a shell.
  const packages = { vite: 'vite', 'vue-tsc': 'vue-tsc', tsc: 'typescript', cap: '@capacitor/cli' }
  if (Object.hasOwn(packages, command)) {
    let directory = resolve(cwd)
    while (true) {
      const packageDirectory = join(directory, 'node_modules', packages[command])
      const manifestPath = join(packageDirectory, 'package.json')
      if (existsSync(manifestPath)) {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
        const bin = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.[command]
        if (!bin) throw new Error(`No executable defined for ${command}.`)
        return [process.execPath, [resolve(packageDirectory, bin), ...args]]
      }
      const parent = dirname(directory)
      if (parent === directory) break
      directory = parent
    }
    throw new Error(`Cannot locate ${command}. Install workspace dependencies first.`)
  }
  return [command, args]
}

async function main() {
  const [separator, command, ...args] = process.argv.slice(2)
  if (separator !== '--' || !command) throw new Error('Usage: node scripts/run-command.mjs -- <command> [arguments]')
  const [executable, argv] = resolveCommand(command, args)
  const child = spawn(executable, argv, {
    shell: false,
    stdio: 'inherit',
    env: { ...process.env, SMSRING_BANNER_OWNER: '1' },
  })
  const forwardSignal = (signal) => child.kill(signal)
  const onInterrupt = () => forwardSignal('SIGINT')
  const onTerminate = () => forwardSignal('SIGTERM')
  process.on('SIGINT', onInterrupt)
  process.on('SIGTERM', onTerminate)
  try {
    process.exitCode = await new Promise((resolveExit, reject) => {
      child.once('error', reject)
      child.once('exit', (code, signal) => resolveExit(code ?? (128 + (constants.signals[signal] || 1))))
    })
  } finally {
    process.off('SIGINT', onInterrupt)
    process.off('SIGTERM', onTerminate)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main().catch(() => {
    // Do not echo argv or spawn error objects: they may contain secret arguments.
    console.error('Unable to start the requested command. Check the executable and workspace dependencies.')
    process.exitCode = 1
  })
}
