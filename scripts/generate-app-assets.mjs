#!/usr/bin/env node
// Generates every app icon and splash screen from the vector sources in assets/:
//
//   assets/icon.svg             the full icon (artwork on its background)
//   assets/icon-foreground.svg  the artwork alone, on transparent
//   assets/icon-background.svg  the background alone
//
//   npm run assets          everything below
//   npm run assets:web      only step 3 (no native files)
//   npm run assets:check    exit 1 if anything is missing or older than its sources
//
// 1. Renders the base PNGs @capacitor/assets expects into assets/:
//      icon-only.png  icon-foreground.png  icon-background.png  splash.png
// 2. Runs @capacitor/assets to write the Android mipmaps, adaptive icons and
//    splash drawables and the iOS AppIcon and Splash image sets. Then redraws
//    every splash (light and dark) at its own size so the gradient fills it edge
//    to edge, and recompresses the PNGs.
// 3. Writes the web icons (favicon.svg, apple-touch-icon.png) for the app (public/)
//    and the GitHub Pages site (site/).
// 4. Records a hash of the sources in assets/.generated.json for assets:check.
//
// Commit the sources, the base PNGs and the native files together.
import './lib/cli-failure.mjs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const assets = join(root, 'assets')
const pub = join(root, 'public')
const site = join(root, 'site')
const stampPath = join(assets, '.generated.json')

const SOURCES = ['icon.svg', 'icon-foreground.svg', 'icon-background.svg']
const ICON = 1024
const SPLASH = 2732
/** Background colour behind anything a platform can't fill with the image (first gradient stop). */
const BG = '#2b63f0'
/**
 * Adaptive icons: @capacitor/assets insets the foreground 16.7% per side, which
 * maps this image onto the visible launcher area. The artwork is full-bleed for
 * square masks; 0.88 keeps the bubble tail and rays inside round masks too.
 */
const FOREGROUND_SCALE = 0.88
/** The artwork's width on the splash screen, as a share of the shorter side. */
const SPLASH_MARK = 0.34

/** Generated files assets:check expects to exist. */
const OUTPUTS = [
  'assets/icon-only.png',
  'assets/icon-foreground.png',
  'assets/icon-background.png',
  'assets/splash.png',
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png',
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png',
  'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
  'android/app/src/main/res/drawable/splash.png',
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
  'ios/App/App/Assets.xcassets/Splash.imageset/Default@2x~universal~anyany.png',
  'public/favicon.svg',
  'public/apple-touch-icon.png',
  'site/favicon.svg',
  'site/apple-touch-icon.png',
]
/** Folders whose PNGs come from @capacitor/assets (recompressed after generation). */
const NATIVE_PNG_ROOTS = ['android/app/src/main/res', 'ios/App/App/Assets.xcassets']

const sha = (buf) => createHash('sha256').update(buf).digest('hex')

/** Hash of everything the outputs depend on: the sources and this script. */
function fingerprint() {
  const files = [...SOURCES.map((f) => join(assets, f)), fileURLToPath(import.meta.url)]
  return Object.fromEntries(files.map((f) => [relative(root, f).replaceAll('\\', '/'), sha(readFileSync(f))]))
}

function check() {
  const problems = []
  for (const out of OUTPUTS) if (!existsSync(join(root, out))) problems.push(`missing ${out}`)
  const stamp = existsSync(stampPath) ? JSON.parse(readFileSync(stampPath, 'utf8')) : {}
  const now = fingerprint()
  for (const [file, hash] of Object.entries(now)) if (stamp[file] !== hash) problems.push(`${file} changed since the last generation`)
  if (problems.length) {
    console.error(`App assets are out of date:\n  ${problems.join('\n  ')}\nRun: npm run assets`)
    process.exit(1)
  }
  console.log('App assets are up to date.')
}

async function main() {
  if (process.argv.includes('--check')) return check()
  const { default: sharp } = await import('sharp')

  /** An SVG source rasterised directly at `size` px (no upscaling). */
  const render = (name, size) =>
    sharp(readFileSync(join(assets, name)), { density: (72 * size) / ICON })
      .resize(size, size, { kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer()
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 }
  const canvas = (size, background = transparent) => sharp({ create: { width: size, height: size, channels: 4, background } })
  const centred = async (size, input) => {
    const { width } = await sharp(input).metadata()
    const at = Math.round((size - width) / 2)
    return { input, left: at, top: at }
  }
  const png = (img) => img.png({ compressionLevel: 9, adaptiveFiltering: true })

  /** A splash at any size: the gradient edge to edge, the artwork centred. */
  async function splashAt(width, height) {
    const side = Math.max(width, height)
    const backdrop = await sharp(await render('icon-background.svg', side)).resize(width, height, { fit: 'cover' }).toBuffer()
    const mark = await render('icon-foreground.svg', Math.round(Math.min(width, height) * SPLASH_MARK))
    const { width: m } = await sharp(mark).metadata()
    return png(sharp(backdrop).composite([{ input: mark, left: Math.round((width - m) / 2), top: Math.round((height - m) / 2) }]))
  }

  async function webIcons() {
    // Favicon: the icon with rounded corners, as browsers show it square.
    const icon = readFileSync(join(assets, 'icon.svg'), 'utf8')
    const favicon = icon
      .replace(/<!--[\s\S]*?-->\n?/, '<!-- Generated by scripts/generate-app-assets.mjs from assets/icon.svg -->\n')
      .replace(/(<svg[^>]*>)/, '$1<clipPath id="favicon-corners"><rect width="100" height="100" rx="22"/></clipPath><g clip-path="url(#favicon-corners)">')
      .replace(/<\/svg>\s*$/, '</g></svg>\n')
    // Home-screen icon: square, iOS rounds the corners itself.
    const touch = await png(sharp(await render('icon.svg', 180))).toBuffer()
    for (const dir of [pub, site]) {
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'favicon.svg'), favicon)
      writeFileSync(join(dir, 'apple-touch-icon.png'), touch)
    }
    console.log('Wrote favicon.svg and apple-touch-icon.png to public/ and site/')
  }

  async function basePngs() {
    await png(sharp(await render('icon.svg', ICON))).toFile(join(assets, 'icon-only.png'))
    await png(sharp(await render('icon-background.svg', ICON))).toFile(join(assets, 'icon-background.png'))
    const fg = await render('icon-foreground.svg', Math.round(ICON * FOREGROUND_SCALE))
    await png(canvas(ICON).composite([await centred(ICON, fg)])).toFile(join(assets, 'icon-foreground.png'))
    await (await splashAt(SPLASH, SPLASH)).toFile(join(assets, 'splash.png'))
    console.log('Rendered assets/icon-only.png, icon-foreground.png, icon-background.png, splash.png')
  }

  function capacitorAssets() {
    const cli = join(root, 'node_modules/@capacitor/assets/bin/capacitor-assets')
    if (!existsSync(cli)) throw new Error('@capacitor/assets is not installed: run npm install')
    execFileSync(
      process.execPath,
      [cli, 'generate', '--android', '--ios', '--assetPath', 'assets',
        '--iconBackgroundColor', BG, '--iconBackgroundColorDark', BG,
        '--splashBackgroundColor', BG, '--splashBackgroundColorDark', BG],
      { cwd: root, stdio: 'inherit' },
    )
  }

  async function recompressNativePngs() {
    const pngs = []
    const walk = (dir) => {
      if (!existsSync(dir)) return
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name)
        if (e.isDirectory()) walk(p)
        else if (e.name.toLowerCase().endsWith('.png')) pngs.push(p)
      }
    }
    NATIVE_PNG_ROOTS.forEach((r) => walk(join(root, r)))
    for (const file of pngs) {
      await png(sharp(file, { failOn: 'none' })).toFile(`${file}.tmp`)
      renameSync(`${file}.tmp`, file)
    }
    console.log(`Recompressed ${pngs.length} native PNGs`)
  }

  /**
   * @capacitor/assets fits the square splash into each size and pads the rest with
   * a flat colour (and does so for every dark variant). Redraw each splash file at
   * its real size instead, so the gradient always fills the whole screen.
   */
  async function redrawSplashes() {
    const files = []
    const res = join(root, 'android/app/src/main/res')
    if (existsSync(res)) {
      for (const dir of readdirSync(res)) if (dir.startsWith('drawable') && existsSync(join(res, dir, 'splash.png'))) files.push(join(res, dir, 'splash.png'))
    }
    const ios = join(root, 'ios/App/App/Assets.xcassets/Splash.imageset')
    if (existsSync(ios)) for (const f of readdirSync(ios)) if (f.toLowerCase().endsWith('.png')) files.push(join(ios, f))
    for (const file of files) {
      const { width, height } = await sharp(file).metadata()
      await (await splashAt(width, height)).toFile(`${file}.tmp`)
      renameSync(`${file}.tmp`, file)
    }
    console.log(`Redrew ${files.length} splash images edge to edge`)
  }

  /** Drops images an iOS asset set no longer lists (e.g. Capacitor's template splash files). */
  function pruneIosAssetSets() {
    const xcassets = join(root, 'ios/App/App/Assets.xcassets')
    if (!existsSync(xcassets)) return
    let removed = 0
    for (const set of readdirSync(xcassets, { withFileTypes: true })) {
      const dir = join(xcassets, set.name)
      const contents = join(dir, 'Contents.json')
      if (!set.isDirectory() || !existsSync(contents)) continue
      const listed = new Set((JSON.parse(readFileSync(contents, 'utf8')).images ?? []).map((i) => i.filename).filter(Boolean))
      for (const f of readdirSync(dir)) {
        if (f.toLowerCase().endsWith('.png') && !listed.has(f)) {
          rmSync(join(dir, f))
          removed++
        }
      }
    }
    if (removed) console.log(`Removed ${removed} unlisted images from the iOS asset catalog`)
  }

  await webIcons()
  if (process.argv.includes('--web')) return
  await basePngs()
  capacitorAssets()
  pruneIosAssetSets()
  await redrawSplashes()
  await recompressNativePngs()
  // Only a full run vouches for every output.
  writeFileSync(stampPath, `${JSON.stringify(fingerprint(), null, 2)}\n`)
  console.log('Recorded source hashes in assets/.generated.json')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
