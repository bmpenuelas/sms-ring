#!/usr/bin/env node
// Runs `bundle exec fastlane <args>` inside store/, installing the gems on first use.
//   npm run store -- android listing validate:true
// Ruby 3.3 and Bundler are the only requirements (see docs/DEVELOPMENT.md).
import './lib/cli-failure.mjs'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const storeDir = fileURLToPath(new URL('../store/', import.meta.url))
const args = process.argv.slice(2)

if (!args.length) {
  console.error(
    'Usage: npm run store -- <android|ios> <lane> [key:value ...]\n       npm run store -- lanes',
  )
  process.exit(2)
}

// `ruby -S bundle` finds Bundler on every OS without a shell (bundle is a .bat file on Windows).
function ruby(rubyArgs) {
  const result = spawnSync('ruby', ['-S', ...rubyArgs], {
    cwd: storeDir,
    stdio: 'inherit',
    env: {
      BUNDLE_PATH: 'vendor/bundle',
      FASTLANE_SKIP_UPDATE_CHECK: '1',
      FASTLANE_OPT_OUT_USAGE: '1',
      FASTLANE_OPT_OUT_CRASH_REPORTING: '1',
      ...process.env,
    },
  })
  if (result.error) {
    console.error(
      result.error.code === 'ENOENT'
        ? 'Ruby was not found. Install Ruby 3.3 (winget install RubyInstallerTeam.RubyWithDevKit.3.3 on Windows).'
        : result.error.message,
    )
    process.exit(1)
  }
  return result.status ?? 1
}

if (!existsSync(join(storeDir, 'vendor/bundle'))) {
  console.log('Installing fastlane into store/vendor/bundle (first run only)...')
  if (ruby(['bundle', 'install'])) {
    console.error(
      '\nbundle install failed. On "certificate verify failed" (antivirus HTTPS scanning), set SSL_CERT_FILE to a PEM bundle with Ruby\'s ssl/cert.pem plus the antivirus root certificate.',
    )
    process.exit(1)
  }
}

process.exit(ruby(['bundle', 'exec', 'fastlane', ...args]))
