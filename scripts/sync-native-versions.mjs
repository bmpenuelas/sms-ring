#!/usr/bin/env node
// Propagates the package.json version to the Android and iOS projects.
// marketing version = package.json version; build number = major*1e6 + minor*1e3 + patch.
import './lib/cli-failure.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const packageJsonPath = resolve('package.json')
const androidBuildGradlePath = resolve('android/app/build.gradle')
const iosXcodeProjectPath = resolve('ios/App/App.xcodeproj/project.pbxproj')

const rawVersion = JSON.parse(readFileSync(packageJsonPath, 'utf8')).version ?? '0.0.0'
const match = rawVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/u)

if (!match) {
  console.error(`package.json version '${rawVersion}' is not valid semver`)
  process.exit(1)
}

const [major, minor, patch] = match.slice(1).map((part) => Number.parseInt(part, 10))

if (minor > 999 || patch > 999) {
  console.error(`package.json version '${rawVersion}' exceeds the supported minor/patch range for native build numbers`)
  process.exit(1)
}

const marketingVersion = `${major}.${minor}.${patch}`
const buildNumber = Math.max(1, major * 1000000 + minor * 1000 + patch)

updateFile(androidBuildGradlePath, (text) =>
  text
    .replace(/versionCode\s+\d+/u, `versionCode ${buildNumber}`)
    .replace(/versionName\s+"[^"]+"/u, `versionName "${marketingVersion}"`),
)
updateFile(iosXcodeProjectPath, (text) =>
  text
    .replace(/MARKETING_VERSION = [^;]+;/gu, `MARKETING_VERSION = ${marketingVersion};`)
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/gu, `CURRENT_PROJECT_VERSION = ${buildNumber};`),
)

console.log(`Synced native versions from package.json ${rawVersion}: marketing ${marketingVersion}, build ${buildNumber}`)

function updateFile(path, transform) {
  const before = readFileSync(path, 'utf8')
  const after = transform(before)
  if (after !== before) writeFileSync(path, after)
}
