import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
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
  assert.ok(['0.1.2', 'file:../dev-scripts'].includes(pkg.devDependencies['reusable-dev-scripts']))
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
