// Renders the store artwork for every language and writes it where fastlane expects it.
//   node design/store-screenshots/build.mjs [android|ios|promo] [en,es,...]
// Needs caps/<lang>/ from capture.mjs. Network access is needed for Google Fonts.
//
//   Google Play  store/fastlane/metadata/android/<locale>/images/phoneScreenshots/1..8.png  1080×1920
//                store/fastlane/metadata/android/<locale>/images/featureGraphic.png          1024×500
//   App Store    store/fastlane/screenshots/<locale>/1..8_iphone63.png                     1206×2622
//                store/artwork/ios/<locale>/header.png (3840×1646), search-results.png (3840×2560)
// A contact sheet per language and platform goes to design/store-screenshots/out/.
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'
import { launch, sleep } from './cdp.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '../..')
const STORE = join(ROOT, 'store')
const { LANGUAGES } = await import(pathToFileURL(join(ROOT, 'src/i18n/languages.ts')).href)

const targets = process.argv[2] ? process.argv[2].split(',') : ['android', 'ios', 'promo']
const codes = process.argv[3] ? process.argv[3].split(',') : LANGUAGES.map((l) => l.code)

const b = await launch()

/** Opens an artwork page at a viewport size and returns the PNG once it is laid out. */
async function render(page, query, width, height) {
  await b.viewport(width, height)
  await b.navigate(`${pathToFileURL(join(HERE, page)).href}?${new URLSearchParams(query)}`)
  for (let i = 0; i < 200 && (await b.evaluate('document.body?.dataset.ready')) !== '1'; i++) await sleep(100)
  await sleep(300)
  return b.screenshot()
}

/** Cuts a panorama into panels, resized to the store size. */
async function slice(full, panels, pw, ph, size) {
  return Promise.all(Array.from({ length: panels }, (_, i) =>
    sharp(full).extract({ left: i * pw, top: 0, width: pw, height: ph })
      .resize(size[0], size[1], { fit: 'cover', kernel: 'lanczos3' }).png().toBuffer()))
}

async function sheet(images, out) {
  const h = 900
  const thumbs = await Promise.all(images.map((img) => sharp(img).resize({ height: h }).png().toBuffer()))
  const w = (await sharp(thumbs[0]).metadata()).width
  const gap = 30
  mkdirSync(dirname(out), { recursive: true })
  await sharp({ create: { width: thumbs.length * (w + gap) + gap, height: h + 2 * gap, channels: 3, background: '#e9eaee' } })
    .composite(thumbs.map((input, i) => ({ input, left: gap + i * (w + gap), top: gap })))
    .png().toFile(out)
}

// App Store creative assets can't have an alpha channel, so none of the images keep one.
const write = async (buffer, path) => {
  mkdirSync(dirname(path), { recursive: true })
  await sharp(buffer).removeAlpha().png({ compressionLevel: 9 }).toFile(path)
}

for (const lang of LANGUAGES.filter((l) => codes.includes(l.code))) {
  if (targets.includes('android')) {
    const full = await render('base.html', { lang: lang.code, platform: 'android' }, 1290 * 8, 2294)
    const shots = await slice(full, 8, 1290, 2294, [1080, 1920])
    const dir = join(STORE, 'fastlane/metadata/android', lang.play, 'images/phoneScreenshots')
    rmSync(dir, { recursive: true, force: true })
    for (const [i, shot] of shots.entries()) await write(shot, join(dir, `${i + 1}.png`))
    await sheet(shots, join(HERE, 'out/android', `${lang.code}.png`))
  }
  if (targets.includes('ios')) {
    const full = await render('base.html', { lang: lang.code, platform: 'ios' }, 1290 * 8, 2796)
    const shots = await slice(full, 8, 1290, 2796, [1206, 2622])
    const dir = join(STORE, 'fastlane/screenshots', lang.appStore)
    rmSync(dir, { recursive: true, force: true })
    for (const [i, shot] of shots.entries()) await write(shot, join(dir, `${i + 1}_iphone63.png`))
    await sheet(shots, join(HERE, 'out/ios', `${lang.code}.png`))
  }
  if (targets.includes('promo')) {
    const feature = await render('promo.html', { lang: lang.code, kind: 'feature' }, 2048, 1000)
    const out = join(STORE, 'fastlane/metadata/android', lang.play, 'images/featureGraphic.png')
    await write(await sharp(feature).resize(1024, 500, { kernel: 'lanczos3' }).png().toBuffer(), out)
    await write(feature, join(HERE, 'out/feature', `${lang.code}.png`))
    for (const [kind, name, w, h] of [['header', 'header', 3840, 1646], ['search', 'search-results', 3840, 2560]]) {
      const png = await render('promo.html', { lang: lang.code, kind }, w, h)
      await write(png, join(STORE, 'artwork/ios', lang.appStore, `${name}.png`))
      await write(await sharp(png).resize({ width: 1600 }).png().toBuffer(), join(HERE, 'out', kind, `${lang.code}.png`))
    }
  }
  console.log(`${lang.code}: ${targets.join(', ')}`)
}

await b.close()
process.exit(0)
