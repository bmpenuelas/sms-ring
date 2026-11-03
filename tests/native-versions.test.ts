import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, type TestContext } from 'node:test'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('../scripts/sync-native-versions.mjs', import.meta.url))
const projectFile = 'ios/App/App.xcodeproj/project.pbxproj'
const androidFile = 'android/app/build.gradle'

async function fixture(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), 'sms-ring-versions-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const files = {
    'package.json': JSON.stringify({ version: '1.0.0' }),
    [projectFile]: (await readFile(new URL(`../${projectFile}`, import.meta.url), 'utf8'))
      .replace(/CURRENT_PROJECT_VERSION = [^;]+;/gu, 'CURRENT_PROJECT_VERSION = 1000000;')
      .replace(/MARKETING_VERSION = [^;]+;/gu, 'MARKETING_VERSION = 1.0.0;'),
    [androidFile]: 'versionCode 1000000\nversionName "1.0.0"\n',
  }
  for (const [relative, contents] of Object.entries(files)) {
    await mkdir(join(directory, relative, '..'), { recursive: true })
    await writeFile(join(directory, relative), contents)
  }
  const run = (...args: string[]) => spawnSync(process.execPath, [script, ...args], { cwd: directory, encoding: 'utf8' })
  const read = (relative: string) => readFile(join(directory, relative), 'utf8')
  return { directory, run, read }
}

test('iOS build bumps update every configuration and survive native version sync', async (t) => {
  const { directory, run, read } = await fixture(t)
  const manifest = await read('package.json')
  const android = await read(androidFile)
  const project = await read(projectFile)
  // A higher build uploaded from one configuration must also advance the others.
  await writeFile(join(directory, projectFile), project.replace(/CURRENT_PROJECT_VERSION = [^;]+;/u, 'CURRENT_PROJECT_VERSION = 1000042;'))

  for (const expected of [1000043, 1000044]) {
    const result = run('--bump-ios-build')
    assert.equal(result.status, 0, result.stderr)
    const updated = await read(projectFile)
    assert.deepEqual([...updated.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/gu)].map((entry) => entry[1]), [String(expected), String(expected)])
    assert.equal(updated.replace(/CURRENT_PROJECT_VERSION = [^;]+;/gu, 'BUILD'), project.replace(/CURRENT_PROJECT_VERSION = [^;]+;/gu, 'BUILD'))
    assert.equal(await read('package.json'), manifest)
    assert.equal(await read(androidFile), android)
  }

  const bumped = await read(projectFile)
  const sync = run()
  assert.equal(sync.status, 0, sync.stderr)
  assert.equal(await read(projectFile), bumped)

  // A later marketing release still syncs both platforms without lowering iOS.
  await writeFile(join(directory, 'package.json'), JSON.stringify({ version: '1.0.1' }))
  const release = run()
  assert.equal(release.status, 0, release.stderr)
  assert.match(await read(projectFile), /MARKETING_VERSION = 1\.0\.1;/u)
  assert.match(await read(projectFile), /CURRENT_PROJECT_VERSION = 1000044;/u)
  assert.match(await read(androidFile), /versionCode 1000001/u)
  assert.match(await read(androidFile), /versionName "1\.0\.1"/u)
})

test('invalid iOS build settings fail before modifying native files', async (t) => {
  const { directory, run, read } = await fixture(t)
  const invalid = (await read(projectFile)).replace(/CURRENT_PROJECT_VERSION = [^;]+;/u, 'CURRENT_PROJECT_VERSION = 1.2.3;')
  await writeFile(join(directory, projectFile), invalid)
  const android = await read(androidFile)
  const result = run('--bump-ios-build')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Expected integer CURRENT_PROJECT_VERSION/u)
  assert.equal(await read(projectFile), invalid)
  assert.equal(await read(androidFile), android)
})
