#!/usr/bin/env node
// Release preparation: bump the patch version, propagate it to the Android/iOS
// build numbers, then build and `cap sync` the chosen platform.
import './lib/cli-failure.mjs'
import { spawnSync } from 'node:child_process'

const [platform, openFlag] = process.argv.slice(2)
const shouldOpen = openFlag === '--open'

if (!['android', 'ios'].includes(platform) || (openFlag && !shouldOpen)) {
  console.error('Usage: node scripts/release-prepare-native.mjs <android|ios> [--open]')
  process.exit(1)
}

const npm = resolveNpmRunner()

run(npm.command, [...npm.args, 'version', 'patch', '--no-git-tag-version'])
run(process.execPath, ['./scripts/sync-native-versions.mjs'])
run(npm.command, [...npm.args, 'run', `cap:sync:${platform}`])
if (shouldOpen) run(npm.command, [...npm.args, 'run', `cap:open:${platform}`])

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false })

  if (result.error) {
    console.error(
      result.error.code === 'ENOENT'
        ? `[release-prepare-native] Could not find executable: ${command}`
        : result.error.message,
    )
    process.exit(1)
  }
  if (typeof result.status === 'number' && result.status !== 0) process.exit(result.status)
}

function resolveNpmRunner() {
  if (process.env.npm_execpath) return { command: process.execPath, args: [process.env.npm_execpath] }
  if (process.platform === 'win32') return { command: process.env.ComSpec || 'cmd.exe', args: ['/d', '/s', '/c', 'npm'] }
  return { command: 'npm', args: [] }
}
