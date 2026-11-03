#!/usr/bin/env node
// Propagates the package.json version to the Android and iOS projects.
// Marketing version = package.json version; base build = major*1e6 + minor*1e3 + patch.
// iOS builds can advance independently and must never be reset by a later sync.
import './lib/cli-failure.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const packageJsonPath = resolve('package.json')
const androidBuildGradlePath = resolve('android/app/build.gradle')
const iosXcodeProjectPath = resolve('ios/App/App.xcodeproj/project.pbxproj')

const args = process.argv.slice(2)
if (args.length > 1 || (args.length === 1 && args[0] !== '--bump-ios-build')) {
  throw new Error('Usage: node scripts/sync-native-versions.mjs [--bump-ios-build]')
}
const bumpIosBuild = args[0] === '--bump-ios-build'

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
const iosProject = readFileSync(iosXcodeProjectPath, 'utf8')
const iosBuildValues = [...iosProject.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/gu)].map((entry) => entry[1].trim())
if (!iosBuildValues.length || iosBuildValues.some((value) => !/^\d+$/u.test(value))) {
  throw new Error('Expected integer CURRENT_PROJECT_VERSION settings in the iOS project')
}
const iosBuildNumber = Math.max(buildNumber, ...iosBuildValues.map(Number)) + (bumpIosBuild ? 1 : 0)
if (!Number.isSafeInteger(iosBuildNumber)) {
  throw new Error('Native build number exceeds the supported integer range')
}

if (!bumpIosBuild) {
  updateFile(androidBuildGradlePath, (text) =>
    text
      .replace(/versionCode\s+\d+/u, `versionCode ${buildNumber}`)
      .replace(/versionName\s+"[^"]+"/u, `versionName "${marketingVersion}"`),
  )
}
updateFile(iosXcodeProjectPath, (text) =>
  text
    .replace(/MARKETING_VERSION = [^;]+;/gu, `MARKETING_VERSION = ${marketingVersion};`)
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/gu, `CURRENT_PROJECT_VERSION = ${iosBuildNumber};`),
)

console.log(bumpIosBuild
  ? `Bumped iOS build to ${iosBuildNumber}; marketing version remains ${marketingVersion}`
  : `Synced native versions from package.json ${rawVersion}: marketing ${marketingVersion}, Android build ${buildNumber}, iOS build ${iosBuildNumber}`)

function updateFile(path, transform) {
  const before = readFileSync(path, 'utf8')
  const after = transform(before)
  if (after !== before) writeFileSync(path, after)
}
