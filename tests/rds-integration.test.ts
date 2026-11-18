import assert from 'node:assert/strict'
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import config from '../reusable-dev-scripts.config.mjs'
import { LANGUAGES } from '../src/i18n/languages.ts'
import { runCli } from 'reusable-dev-scripts'
import { existsSync } from 'node:fs'
import { androidSteps, releaseSteps } from '../scripts/native-workflow.mjs'
import { cli } from './rds-support.ts'

const root = fileURLToPath(new URL('../', import.meta.url))

test('the toolkit dependency and store adapter follow the integration configuration', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  assert.ok(['0.3.0', 'file:../dev-scripts'].includes(pkg.devDependencies['reusable-dev-scripts']))
  assert.equal(config.store.allowExternalCredentials, true)
  assert.deepEqual(config.store.locales, LANGUAGES.map(language => ({ app: language.code, android: language.play, ios: language.appStore })))
  assert.deepEqual(config.capacitor.prepare, [['node', 'scripts/generate-app-assets.mjs', '--check']])
  assert.equal(config.capacitor.build, undefined)
  assert.deepEqual(config.capacitor.afterBuild, [['node', 'scripts/generate-native-locales.mjs']])
  assert.equal(pkg.scripts.store, 'rds store run --')
  assert.deepEqual(config.store.hooks.beforeUpload, [['node', 'scripts/verify-offline.mjs']])
})

test('release recipes retain both-platform version ownership and offline verification before Gradle', () => {
  const release = releaseSteps('ios', ['--dry-run', '--open'])
  assert.deepEqual(release[0], ['capacitor', 'versions', '--bump', 'patch', '--dry-run'])
  assert.deepEqual(release[1], ['capacitor', 'sync', '--platform', 'ios', '--dry-run', '--open'])
  for (const kind of ['aab', 'apk']) {
    const steps = androidSteps(kind, ['--dry-run'])
    assert.deepEqual(steps[0], releaseSteps('android', ['--dry-run'])[0])
    const gate = steps.findIndex(step => step.includes('scripts/verify-offline.mjs'))
    const build = steps.findIndex(step => step[0] === 'android' && step[1] === 'build')
    assert.ok(gate > 0 && gate < build)
    assert.ok(steps.every(step => step.includes('--dry-run')))
  }
  assert.ok(!androidSteps('debug').flat().includes('--bump'))
  assert.ok(!androidSteps('install').flat().includes('--replace'))
  const selected = androidSteps('install', ['--device', 'fixture-device', '--replace']).at(-1)
  assert.deepEqual(selected, ['android', 'install', '--physical', '--device', 'fixture-device', '--replace'])
})

test('configured sync/install/release plans cannot change package versions or native projects', async () => {
  const files = ['package.json', 'package-lock.json', 'android/app/build.gradle', 'ios/App/App.xcodeproj/project.pbxproj']
  const snapshot = () => Promise.all(files.map(file => readFile(new URL(`../${file}`, import.meta.url), 'utf8')))
  const before = await snapshot()
  for (const args of [
    ['capacitor', 'sync', '--platform', 'android', '--dry-run'],
    ['capacitor', 'versions', '--bump', 'patch', '--dry-run'],
    ['android', 'build', '--configuration', 'release', '--format', 'aab', '--dry-run'],
    ['android', 'install', '--physical', '--dry-run'],
    ['android', 'start-adb', '--dry-run'],
    ['store', 'run', '--dry-run', '--', 'android', 'listing'],
  ]) {
    const result = cli(args, root)
    assert.equal(result.status, 0, result.stderr)
  }
  assert.deepEqual(await snapshot(), before)
})

test('rds rejects old store-validation bypasses before contacting stores', () => {
  for (const option of ['skip_check:true', 'strict:false']) {
    const result = cli(['store', 'run', '--dry-run', '--', 'android', 'listing', option], root)
    assert.equal(result.status, 1)
    assert.match(result.stderr, /cannot be bypassed/)
  }
})

test('native resource generation follows the web build without a local build/runner shim', async () => {
  const calls: { command: string; args: string[] }[] = []
  const code = await runCli(['capacitor', 'sync', '--platform', 'android', '--cwd', root, '--no-banner'], {
    log: () => {}, error: () => {},
    runner: async step => { calls.push(step); return { stdout: '', stderr: '' } },
  })
  assert.equal(code, 0)
  assert.deepEqual(calls.map(step => step.command), ['node', 'vue-tsc', 'vite', 'node', 'cap'])
  assert.deepEqual(calls[3].args, ['scripts/generate-native-locales.mjs'])
  for (const path of ['scripts/build-native.mjs', 'scripts/lib/rds.mjs', 'scripts/lib/cli-failure.mjs']) assert.equal(existsSync(new URL('../' + path, import.meta.url)), false)
})

test('product generators no longer import the removed compatibility reporter', async () => {
  for (const name of ['generate-app-assets', 'generate-native-locales', 'generate-ios-setup-images', 'generate-ringtone', 'verify-offline']) {
    const source = await readFile(new URL('../scripts/' + name + '.mjs', import.meta.url), 'utf8')
    assert.ok(!source.includes('cli-failure.mjs'), name)
  }
})

test('ADB startup uses the typed installed command without selecting or installing a device', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(pkg.scripts['android:start-adb'], 'rds android start-adb')
  const help = cli(['android', 'start-adb', '--help'], root)
  assert.equal(help.status, 0, help.stderr)
  assert.match(help.stdout, /^rds android start-adb\r?\n/u)

  const calls: { command: string; args: string[]; capture?: boolean }[] = []
  const errors: string[] = []
  const output = {
    env: {}, log: () => {}, error: (message: string) => errors.push(message),
    runner: async (step: { command: string; args: string[]; capture?: boolean }) => {
      calls.push(step)
      return { stdout: '', stderr: '' }
    },
  }
  const args = ['android', 'start-adb', '--cwd', root, '--no-banner']
  // Inspect the actual app's resolved plan with a fake runner: no ADB daemon is started.
  assert.equal(await runCli(args, output), 0)
  assert.equal(calls.length, 1)
  assert.match(calls[0].command.split(/[\\/]/u).at(-1)!, /^adb(?:\.exe)?$/u)
  assert.deepEqual(calls[0].args, ['start-server'])
  assert.equal(calls[0].capture, false)

  calls.length = 0
  assert.equal(await runCli([...args, '--dry-run'], output), 0)
  assert.equal(calls.length, 0)
  assert.equal(await runCli([...args, '--env', 'production'], output), 1)
  assert.equal(calls.length, 0)
  assert.match(errors.join('\n'), /requires --allow-production/u)
})

test('debug install verification and explicit replacement never target the release package', async t => {
  const parent = resolve(tmpdir()), directory = await mkdtemp(join(parent, 'rds-debug-install-'))
  t.after(async () => {
    assert.equal(dirname(resolve(directory)), parent)
    await rm(directory, { recursive: true, force: true })
  })
  const debugId = 'com.logicedge.smsring.debug'
  const releaseId = 'com.logicedge.smsring'
  assert.equal(config.android.appId, debugId)
  await writeFile(join(directory, 'reusable-dev-scripts.config.json'), JSON.stringify({ version: 1, android: { appId: config.android.appId } }))
  const output = join(directory, 'android/app/build/outputs/apk/debug')
  await mkdir(output, { recursive: true })
  await writeFile(join(output, 'app-debug.apk'), 'synthetic APK, never installed')
  for (const replace of [false, true]) {
    const calls: { args: string[] }[] = []
    const code = await runCli(['android', 'install', '--cwd', directory, '--physical', '--no-banner', ...(replace ? ['--replace'] : [])], {
      env: {}, log: () => {}, error: () => {},
      runner: async step => {
        calls.push(step)
        assert.ok(!step.args.includes(releaseId), 'no command can address the release/store package')
        if (step.args[0] === 'devices') return { stdout: 'fixture-device\tdevice\n', stderr: '' }
        if (step.args.includes('path')) {
          assert.equal(step.args.at(-1), debugId)
          return { stdout: 'package:/fixture/base.apk\n', stderr: '' }
        }
        return { stdout: 'Success\n', stderr: '' }
      },
    })
    assert.equal(code, 0)
    assert.equal(calls.length, replace ? 5 : 3)
    const removals = calls.filter(step => step.args.includes('uninstall'))
    assert.equal(removals.length, replace ? 1 : 0)
    if (replace) assert.equal(removals[0].args.at(-1), debugId)
    assert.deepEqual(calls.at(-1)!.args.slice(-4), ['shell', 'pm', 'path', debugId])
  }
})
