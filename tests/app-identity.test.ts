import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { test } from 'node:test'

const appId = 'com.logicedge.smsring'
const pluginNamespace = `${appId}.remotering`
const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('Capacitor, native projects, generated resources and installer use the same app identifier', async () => {
  assert.ok((await read('capacitor.config.ts')).includes(`appId: '${appId}'`))
  const gradle = await read('android/app/build.gradle')
  assert.ok(gradle.includes(`applicationId "${appId}"`))
  assert.ok(gradle.includes(`namespace = "${appId}"`))
  const bundleIds = [...(await read('ios/App/App.xcodeproj/project.pbxproj'))
    .matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/gu)].map((match) => match[1])
  assert.ok(bundleIds.length >= 2, 'both debug and release configure the bundle identifier')
  assert.ok(bundleIds.every((id) => id === appId))
  const resources = await read('android/app/src/main/res/values/strings.xml')
  for (const name of ['package_name', 'custom_url_scheme']) {
    assert.ok(resources.includes(`<string name="${name}">${appId}</string>`))
  }
  assert.ok((await read('scripts/android-install.mjs')).includes(`const appId = '${appId}'`))
  assert.ok((await read('plugins/remote-ring/android/build.gradle')).includes(`namespace = "${pluginNamespace}"`))
  assert.ok((await read('plugins/remote-ring/android/src/main/AndroidManifest.xml'))
    .includes(`android:taskAffinity="${appId}.ring"`))
})

test('Android app and plugin Java packages match their namespaces and directory layout', async () => {
  for (const [root, namespace] of [
    ['android/app/src/main/java/', appId],
    ['plugins/remote-ring/android/src/main/java/', pluginNamespace],
    ['plugins/remote-ring/android/src/test/java/', pluginNamespace],
  ]) {
    const files = (await readdir(new URL(`../${root}`, import.meta.url), { recursive: true }))
      .filter((file) => file.endsWith('.java'))
    assert.ok(files.length > 0, `Java sources exist in ${root}`)
    for (const file of files) {
      const source = await read(`${root}${file}`)
      assert.equal(source.match(/^package ([\w.]+);/mu)?.[1], namespace, file)
      assert.ok(file.replaceAll('\\', '/').startsWith(`${namespace.replaceAll('.', '/')}/`), file)
    }
  }
})

test('public Play Store links use the configured Android app identifier', async () => {
  for (const path of ['README.md', 'site/index.html']) {
    const links = [...(await read(path)).matchAll(/https:\/\/play\.google\.com\/store\/apps\/details\?id=([^\s"<)]+)/gu)]
    assert.ok(links.length > 0, path)
    for (const link of links) assert.equal(link[1], appId, path)
  }
})
