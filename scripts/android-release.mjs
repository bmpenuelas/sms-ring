#!/usr/bin/env node
// Runs Gradle tasks in android/ and reports the release artifacts they produce.
//   node scripts/android-release.mjs bundleRelease
// Release tasks run `verify:offline` first, so a build that breaks the
// "offline by design" promise never reaches the store.
import './lib/cli-failure.mjs'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { platform } from 'node:os'
import { dirname, resolve } from 'node:path'
import { buildAndroidEnv, gradleCommand } from './lib/android-env.mjs'

const gradleTasks = process.argv.slice(2)

if (gradleTasks.length === 0) {
  console.error('Usage: node scripts/android-release.mjs <gradle tasks...>')
  process.exit(1)
}

const androidDir = resolve('android')

const releaseBuild = gradleTasks.some((task) => /release/i.test(task))
if (releaseBuild) {
  run(process.execPath, [resolve('scripts/verify-offline.mjs')])
}

const gradle = gradleCommand(gradleTasks)
run(gradle.command, gradle.args, { cwd: androidDir, env: buildAndroidEnv() })

const outputs = resolve('android/app/build/outputs')
const appBundle = logIfExists('Android App Bundle', `${outputs}/bundle/release/app-release.aab`)
const apk = logIfExists('Android APK', `${outputs}/apk/release/app-release.apk`)
logIfExists('R8 mapping file', `${outputs}/mapping/release/mapping.txt`)
logIfExists('Native debug symbols', `${outputs}/native-debug-symbols/release/native-debug-symbols.zip`)

const wants = (name) => gradleTasks.some((task) => task.toLowerCase().includes(name.toLowerCase()))
const requested = [wants('bundleRelease') && appBundle, wants('assembleRelease') && apk].filter(Boolean)
for (const artifact of requested.length > 0 ? requested : releaseBuild ? [appBundle, apk].filter(Boolean) : []) {
  revealArtifact(artifact)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false, ...options })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }
  if (typeof result.status === 'number' && result.status !== 0) process.exit(result.status)
}

function logIfExists(label, filePath) {
  if (!existsSync(filePath)) return undefined
  console.log(`${label}: ${filePath}`)
  return filePath
}

function revealArtifact(filePath) {
  const os = platform()
  const [command, args] =
    os === 'win32' ? ['cmd.exe', ['/c', 'start', '', dirname(filePath)]]
    : os === 'darwin' ? ['open', ['-R', filePath]]
    : os === 'linux' ? ['xdg-open', [dirname(filePath)]]
    : []

  if (!command) return

  const result = spawnSync(command, args, { stdio: 'ignore', shell: false, windowsHide: true })
  if (result.error) {
    console.warn(`Built artifact, but could not open destination folder: ${result.error.message}`)
  } else if (typeof result.status === 'number' && result.status !== 0) {
    console.warn(`Built artifact, but could not open destination folder. Exit code: ${result.status}`)
  }
}
