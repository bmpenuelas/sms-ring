#!/usr/bin/env node
// Builds the debug APK and installs it on a connected physical Android device.
//   node scripts/android-install.mjs [--build-script=cap:sync:android]
import { reportFailure } from './lib/cli-failure.mjs'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { platform } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildAndroidEnv, gradleCommand } from './lib/android-env.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const androidDir = join(repoRoot, 'android')
const appId = 'app.smsring'
const debugApkPath = join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
const env = buildAndroidEnv()

function fail(message, code = 1) {
  reportFailure(message)
  process.exit(code)
}

function run(description, command, args, cwd = repoRoot) {
  console.log(`\n[${description}]`)
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false, cwd, env })

  if (result.error) fail(`Android step ${description}: failed to run ${command}.\n${result.error.message}`)
  if (result.status !== 0) {
    fail(`Android step ${description} failed (${result.signal || `exit code ${result.status}`}).`, result.status ?? 1)
  }
}

function adb(args, description, serial) {
  const result = spawnSync('adb', serial ? ['-s', serial, ...args] : args, { encoding: 'utf-8', cwd: repoRoot, env })

  if (result.error?.code === 'ENOENT') {
    fail('adb not found. Ensure the Android SDK platform-tools are in your PATH.')
  }
  if (result.error || result.status !== 0) {
    fail(`${description} failed: ${result.error?.message || result.stderr?.trim() || 'unknown adb failure'}`, result.status ?? 1)
  }
  return result.stdout
}

function findPhysicalDevice() {
  const deviceLines = adb(['devices'], 'List Android devices')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('List') && !line.startsWith('*'))
    .filter((line) => /\sdevice$/u.test(line))

  if (deviceLines.length === 0) {
    fail('No Android devices or emulators found.\nConnect a device via USB or wireless ADB and try again.')
  }

  const physical = deviceLines.filter((line) => !line.startsWith('emulator-'))
  const emulators = deviceLines.length - physical.length

  if (physical.length === 0) {
    fail(`Only ${emulators} emulator(s) found, no physical device detected.\nConnect a physical Android device and try again.`)
  }

  const serial = physical[0].split(/\s+/u)[0]
  console.log(`\nFound ${physical.length} physical device(s), ${emulators} emulator(s).\nUsing: ${serial}`)
  return serial
}

// A Play Store install is signed with a different key, so it must go before a debug build can replace it.
function removePlayStoreInstallIfPresent(serial) {
  const info = adb(['shell', 'dumpsys', 'package', appId], 'Inspect installed Android package', serial)
  if (!/installerPackageName=com\.android\.vending/u.test(info)) return

  console.log(`\nRemoving the Play Store installation of ${appId} so the locally signed debug build can be installed. This clears that app's local data.`)
  const output = adb(['uninstall', appId], 'Remove Play Store app', serial)
  if (!/^Success\s*$/mu.test(output)) fail(`Remove Play Store app failed: ${output.trim() || 'unexpected adb response'}`)
}

const buildArg = process.argv.find((arg) => arg.startsWith('--build-script='))
const buildScript = buildArg ? buildArg.split('=')[1] : 'cap:sync:android'

const npmRunner = process.env.npm_execpath
  ? { command: process.execPath, args: [process.env.npm_execpath] }
  : platform() === 'win32'
    ? { command: process.env.ComSpec || 'cmd.exe', args: ['/d', '/s', '/c', 'npm'] }
    : { command: 'npm', args: [] }

run('1/3', npmRunner.command, [...npmRunner.args, 'run', buildScript])
const serial = findPhysicalDevice()

const gradle = gradleCommand(['assembleDebug'])
run('2/3', gradle.command, gradle.args, androidDir)

if (!existsSync(debugApkPath)) fail(`Android build completed without producing ${debugApkPath}.`)

removePlayStoreInstallIfPresent(serial)
console.log(`\n[3/3] Installing ${debugApkPath} on ${serial}`)
const installOutput = adb(['install', '-r', debugApkPath], 'Install local debug APK', serial)
if (!/^Success\s*$/mu.test(installOutput)) fail(`Install local debug APK failed: ${installOutput.trim() || 'unexpected adb response'}`)

if (!/^package:/mu.test(adb(['shell', 'pm', 'path', appId], 'Verify Android installation', serial))) {
  fail(`Install completed without ${appId} on ${serial}.`)
}
console.log(`Verified ${appId} is installed on ${serial}.`)
