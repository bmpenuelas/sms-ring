// Only this application's release/install recipes live here. rds owns process
// execution, versions, Gradle, ADB, store tooling and result banners.
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runSteps } from 'reusable-dev-scripts'

const root = fileURLToPath(new URL('../', import.meta.url))

function options(args, install = false) {
  const common = [], device = []
  let open = false
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (['--dry-run', '--banner', '--no-banner'].includes(arg)) common.push(arg)
    else if (arg === '--open' && !install) open = true
    else if (arg === '--replace' && install) device.push(arg)
    else if (arg === '--device' && install && args[index + 1] && !args[index + 1].startsWith('--')) device.push(arg, args[++index])
    else if (arg.startsWith('--device=') && install && arg.length > '--device='.length) device.push(arg)
    else throw new Error('Unsupported recipe option. Use --dry-run, --banner/--no-banner, --open (prepare), or --device/--replace (install).')
  }
  return { common, device, open }
}

export function releaseSteps(platform, args = []) {
  if (!['android', 'ios'].includes(platform)) throw new Error('Release preparation needs android or ios.')
  const { common, open } = options(args)
  return [
    // Deliberately sync BOTH native projects when the package version changes.
    ['capacitor', 'versions', '--bump', 'patch', ...common],
    ['capacitor', 'sync', '--platform', platform, ...common, ...(open ? ['--open'] : [])],
  ]
}

export function androidSteps(kind, args = []) {
  if (!['debug', 'aab', 'apk', 'install'].includes(kind)) throw new Error('Android recipe needs debug, aab, apk or install.')
  const { common, device, open } = options(args, kind === 'install')
  if (open) throw new Error('--open is only supported by release preparation.')
  const release = kind === 'aab' || kind === 'apk'
  return [
    ...(release ? releaseSteps('android', common) : [['capacitor', 'sync', '--platform', 'android', ...common]]),
    ...(release ? [['exec', ...common, '--', 'node', 'scripts/verify-offline.mjs']] : []),
    ['android', 'build', '--configuration', release ? 'release' : 'debug', '--format', kind === 'aab' ? 'aab' : 'apk', ...common, ...(release ? ['--reveal'] : [])],
    ...(kind === 'install' ? [['android', 'install', '--physical', ...common, ...device]] : []),
  ]
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [family, target, ...args] = process.argv.slice(2)
    if (!['release', 'android'].includes(family)) throw new Error('Usage: node scripts/native-workflow.mjs <release|android> <recipe> [options]')
    process.exitCode = await runSteps(family === 'release' ? releaseSteps(target, args) : androidSteps(target, args), { cwd: root })
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
