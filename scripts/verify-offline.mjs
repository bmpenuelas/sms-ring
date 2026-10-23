#!/usr/bin/env node
// Verifies the "offline by design" promise. Anyone can run it on a checkout:
//
//   npm run build && npm run verify:offline
//
// 1. Our own code (web + native plugin + iOS app) uses no networking API.
// 2. The production web build ships a Content-Security-Policy with connect-src 'none'.
// 3. The Android manifests strip INTERNET, and the built APK (if present) declares no
//    INTERNET permission (checked with the SDK's aapt).
import './lib/cli-failure.mjs'
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const failures = []
const notes = []

function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, exts, out)
    else if (exts.some((e) => p.endsWith(e))) out.push(p)
  }
  return out
}

// ---- 1. No networking APIs in our code ----
const FORBIDDEN = [
  { re: /\bfetch\s*\(/, what: 'fetch()' },
  { re: /\bXMLHttpRequest\b/, what: 'XMLHttpRequest' },
  { re: /\bnew\s+WebSocket\b/, what: 'WebSocket' },
  { re: /\bsendBeacon\b/, what: 'navigator.sendBeacon' },
  { re: /\bEventSource\b/, what: 'EventSource' },
  { re: /\bHttpURLConnection\b|\bjava\.net\.(URL|Socket)\b|\bokhttp3\b/, what: 'Java networking' },
  { re: /\bURLSession\b|\bNWConnection\b|\bCFNetwork\b/, what: 'Swift networking' },
]
const sources = [
  ...walk(join(root, 'src'), ['.ts', '.vue']),
  ...walk(join(root, 'plugins/remote-ring/src'), ['.ts']),
  ...walk(join(root, 'plugins/remote-ring/android/src/main'), ['.java']),
  ...walk(join(root, 'plugins/remote-ring/ios/Sources'), ['.swift']),
  ...walk(join(root, 'ios/App/App'), ['.swift']),
]
for (const file of sources) {
  const text = readFileSync(file, 'utf8')
  for (const { re, what } of FORBIDDEN) {
    if (re.test(text)) failures.push(`${relative(root, file)} uses ${what}`)
  }
}
notes.push(`scanned ${sources.length} source files for networking APIs`)

// ---- 2. CSP in the production build ----
const indexHtml = join(root, 'dist/index.html')
if (existsSync(indexHtml)) {
  const html = readFileSync(indexHtml, 'utf8')
  if (!/Content-Security-Policy[^>]+connect-src 'none'/.test(html)) failures.push("dist/index.html lacks a CSP with connect-src 'none'")
  else notes.push("dist/index.html: CSP blocks all connections (connect-src 'none')")
} else {
  notes.push('dist/ missing: run `npm run build` to check the CSP')
}

// ---- 3. Android: no INTERNET permission ----
for (const manifest of ['android/app/src/main/AndroidManifest.xml', 'plugins/remote-ring/android/src/main/AndroidManifest.xml']) {
  const text = readFileSync(join(root, manifest), 'utf8')
  if (!/android\.permission\.INTERNET"\s+tools:node="remove"/.test(text)) failures.push(`${manifest} does not remove INTERNET`)
}
const apkDir = join(root, 'android/app/build/outputs/apk')
const apks = walk(apkDir, ['.apk'])
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
if (apks.length && sdk && existsSync(join(sdk, 'build-tools'))) {
  const versions = readdirSync(join(sdk, 'build-tools')).sort()
  const tools = join(sdk, 'build-tools', versions[versions.length - 1])
  const aapt = ['aapt.exe', 'aapt'].map((n) => join(tools, n)).find(existsSync)
  if (aapt) {
    for (const apk of apks) {
      const out = execFileSync(aapt, ['dump', 'permissions', apk], { encoding: 'utf8' })
      if (/android\.permission\.INTERNET'/.test(out)) failures.push(`${relative(root, apk)} declares INTERNET`)
      else notes.push(`${relative(root, apk)}: no INTERNET permission (aapt)`)
    }
  }
} else {
  notes.push('no built APK found: run `npm run android:debug` to check the APK itself')
}

for (const n of notes) console.log(`  ✓ ${n}`)
if (failures.length) {
  for (const f of failures) console.error(`  ✗ ${f}`)
  process.exit(1)
}
console.log('Offline by design: verified.')
