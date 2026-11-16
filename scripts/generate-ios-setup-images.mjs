// Turns raw iPhone Simulator screenshots of the finished Shortcuts automation into the
// images shown at the end of the iPhone setup guide: public/ios-setup/<language>.webp
// (588 px wide, rounded like the phone's screen, about 30 KB each).
//
// Usage: npm run ios:setup-images -- <folder with raw-<code>.png files>
//
// Capture one raw screenshot per app language (see docs/IOS.md): set the simulator language,
// open the Shortcuts automation editor, `xcrun simctl io booted screenshot raw-<code>.png`.
import { mkdirSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

import sharp from 'sharp'

import './lib/cli-failure.mjs'

const source = resolve(process.argv[2] ?? '')
const out = resolve(import.meta.dirname, '../public/ios-setup')
const W = 588
const H = 1278
const RADIUS = 84

mkdirSync(out, { recursive: true })
const mask = Buffer.from(`<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="${RADIUS}" ry="${RADIUS}"/></svg>`)
const files = readdirSync(source).filter((f) => /^raw-.+\.png$/.test(f))
if (!files.length) throw new Error(`No raw-<code>.png files in ${source}`)

for (const file of files) {
  const code = file.slice(4, -4)
  await sharp(join(source, file))
    .resize(W, H, { fit: 'fill', kernel: 'lanczos3' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .webp({ quality: 78, effort: 6, alphaQuality: 80 })
    .toFile(join(out, `${code}.webp`))
  console.log(`${code}.webp`)
}
