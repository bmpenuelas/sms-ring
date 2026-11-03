#!/usr/bin/env node
// Store listing checks for the fastlane tree in store/fastlane (see docs/DEVELOPMENT.md).
//
//   check       Validate text limits, media sizes and counts, fastlane's folder naming.
//   changelog   Write Google Play changelogs for a versionCode.
//
// Run with `node scripts/store-metadata.mjs <command> [options]`, or the `store:*` npm scripts.
import './lib/cli-failure.mjs'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ANDROID_CHANGELOG_MAX,
  ANDROID_MEDIA,
  ANDROID_TEXT,
  DEFAULT_LOCALE,
  IOS_DEVICE_SETS,
  IOS_DISPLAY_TYPES,
  IOS_PREVIEW,
  IOS_PREVIEW_TYPES,
  IOS_REQUIRED_TYPES,
  IOS_REVIEW_TEXT,
  IOS_ROOT_TEXT,
  IOS_SCREENSHOT,
  IOS_TEXT,
  LOCALES,
} from './lib/store-specs.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg']
const BOM = String.fromCharCode(0xfeff)
const stripBom = (text) => (text.startsWith(BOM) ? text.slice(1) : text)

// ---------------------------------------------------------------------------------------------
// Arguments and paths

function parseArgs(argv) {
  const [command, ...rest] = argv
  const options = {}
  const positional = []
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index]
    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }
    const [name, inline] = arg.slice(2).split('=', 2)
    if (inline !== undefined) options[name] = inline
    else if (rest[index + 1] !== undefined && !rest[index + 1].startsWith('--'))
      options[name] = rest[++index]
    else options[name] = true
  }
  return { command, options, positional }
}

export function createPaths(storeDir) {
  const fastlane = join(storeDir, 'fastlane')
  return {
    fastlane,
    android: join(fastlane, 'metadata/android'),
    ios: join(fastlane, 'metadata/ios'),
    screenshots: join(fastlane, 'screenshots'),
    previews: join(fastlane, 'previews'),
  }
}

const shown = (path) => relative(root, path).replaceAll('\\', '/') || '.'
const pathExists = (path) => existsSync(path)

async function listDir(path) {
  try {
    return await readdir(path, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function listFiles(path, extensions) {
  const entries = (await listDir(path)) ?? []
  return entries
    .filter((entry) => entry.isFile() && extensions.includes(extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
}

/** Writes `text` plus one final newline, creating folders; returns false if it would overwrite
 * copy. */
async function writeText(path, text, { force = false } = {}) {
  if (!force && pathExists(path) && (await stat(path)).size > 0) return false
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, `${text.replace(/\r\n?/g, '\n').trim()}${text.trim() ? '\n' : ''}`, 'utf8')
  return true
}

// ---------------------------------------------------------------------------------------------
// Findings

export class Report {
  constructor(strict) {
    this.strict = strict
    this.items = []
  }

  /** error: breaks an upload. warn: should be looked at. todo: content that is not there yet. */
  add(level, where, message) {
    this.items.push({ level: level === 'todo' && this.strict ? 'error' : level, where, message })
  }

  count(level) {
    return this.items.filter((item) => item.level === level).length
  }

  print() {
    const labels = { error: '✖ error', warn: '▲ warn ', todo: '○ todo ' }
    for (const level of ['error', 'warn', 'todo']) {
      for (const item of this.items.filter((candidate) => candidate.level === level)) {
        console.log(`${labels[level]}  ${item.where}: ${item.message}`)
      }
    }
    const summary = ['error', 'warn', 'todo'].map((level) => `${this.count(level)} ${level}`)
    console.log(`\n${summary.join(', ')}`)
  }
}

// ---------------------------------------------------------------------------------------------
// Text

/** Reads a listing file, or null when missing. One final newline is not part of the copy. */
async function readListing(path, report, where) {
  let raw
  try {
    raw = await readFile(path, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
  if (raw.startsWith(BOM))
    report.add('error', where, 'starts with a byte order mark; save as UTF-8 without BOM')
  if (raw.includes('\r')) report.add('warn', where, 'has CRLF line endings; use LF')
  const text = stripBom(raw).replace(/\r\n?/g, '\n').replace(/\n$/u, '')
  if (text !== text.trim()) report.add('warn', where, 'has leading or trailing whitespace')
  return text
}

const URL_PATTERN = /^https:\/\/[^\s/$.?#][^\s]*$/u
const YOUTUBE_PATTERN = /^https:\/\/(www\.youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{6,}/u

function checkKind(kind, text, report, where) {
  if (kind === 'url' && !URL_PATTERN.test(text))
    report.add('error', where, 'must be a full https:// URL')
  if (kind === 'youtube' && !YOUTUBE_PATTERN.test(text))
    report.add('error', where, 'must be a YouTube watch or youtu.be URL')
  if (kind === 'keywords') {
    const words = text.split(',')
    if (text.includes(', ') || text.includes(' ,'))
      report.add('warn', where, 'has spaces around commas; they count against the 100 bytes')
    if (words.some((word) => !word.trim())) report.add('warn', where, 'has an empty keyword')
    const lowered = words.map((word) => word.trim().toLowerCase())
    const duplicates = lowered.filter((word, index) => word && lowered.indexOf(word) !== index)
    if (duplicates.length)
      report.add('warn', where, `repeats ${[...new Set(duplicates)].join(', ')}`)
  }
}

async function checkFields(report, directory, fields, label) {
  const unfilled = []
  const suggested = []
  for (const field of fields) {
    const where = `${label}/${field.file}`
    const text = await readListing(join(directory, field.file), report, where)
    if (!text) {
      // One finding per folder: a missing and an empty file both mean the copy is not there yet.
      const name = field.file.replace(/\.txt$/u, '')
      if (field.required) unfilled.push(name)
      else if (field.recommended) suggested.push(name)
      continue
    }
    const length = (field.measure ?? ((value) => [...value].length))(text)
    if (length > field.max) {
      report.add(
        'error',
        where,
        `${field.label} is ${length} ${field.measure ? 'bytes' : 'characters'}, limit ${field.max}`,
      )
    }
    checkKind(field.kind, text, report, where)
  }
  if (unfilled.length) report.add('todo', label, `no copy yet for ${unfilled.join(', ')}`)
  if (suggested.length)
    report.add(
      'warn',
      label,
      `no copy yet for ${suggested.join(', ')} (optional, but worth filling)`,
    )
}

async function checkStrayFolders(report, directory, known, label, ignore = []) {
  for (const entry of (await listDir(directory)) ?? []) {
    if (entry.isDirectory() && !known.includes(entry.name) && !ignore.includes(entry.name)) {
      report.add(
        'warn',
        `${label}/${entry.name}`,
        'is not one of the supported store languages; fastlane would create it as a new localization',
      )
    }
  }
}

async function checkAndroidText(report, paths) {
  const known = LOCALES.map((locale) => locale.play)
  await checkStrayFolders(report, paths.android, known, shown(paths.android))
  for (const code of known) {
    const directory = join(paths.android, code)
    const label = `android/${code}`
    if (!pathExists(directory)) {
      report.add('todo', label, 'language folder missing; run npm run locales')
      continue
    }
    await checkFields(report, directory, ANDROID_TEXT, label)
    const changelogs = await listFiles(join(directory, 'changelogs'), ['.txt'])
    for (const file of changelogs) {
      const where = `${label}/changelogs/${file}`
      if (!/^(\d+|default)\.txt$/u.test(file)) {
        report.add(
          'warn',
          where,
          'is not named <versionCode>.txt or default.txt, so Google Play never uses it',
        )
        continue
      }
      const text = await readListing(join(directory, 'changelogs', file), report, where)
      if (text && [...text].length > ANDROID_CHANGELOG_MAX) {
        report.add(
          'error',
          where,
          `release notes are ${[...text].length} characters, limit ${ANDROID_CHANGELOG_MAX}`,
        )
      }
    }
  }
}

async function checkIosText(report, paths) {
  const known = LOCALES.map((locale) => locale.apple)
  await checkStrayFolders(report, paths.ios, known, shown(paths.ios), [
    'review_information',
    'trade_representative_contact_information',
    'app_clip_review_information',
  ])
  for (const code of known) {
    const directory = join(paths.ios, code)
    if (!pathExists(directory)) {
      report.add('todo', `ios/${code}`, 'language folder missing; run npm run locales')
      continue
    }
    await checkFields(report, directory, IOS_TEXT, `ios/${code}`)
  }
  await checkFields(report, paths.ios, IOS_ROOT_TEXT, 'ios')
  await checkFields(
    report,
    join(paths.ios, 'review_information'),
    IOS_REVIEW_TEXT,
    'ios/review_information',
  )
}

// ---------------------------------------------------------------------------------------------
// Images and video

let sharpModule
async function readImage(path) {
  sharpModule ??= (await import('sharp')).default
  try {
    const image = sharpModule(path)
    const [{ width, height, hasAlpha, format }, { size }] = await Promise.all([
      image.metadata(),
      stat(path),
    ])
    const opaque = hasAlpha ? (await image.stats()).isOpaque : true
    return { width, height, hasAlpha, opaque, format, size }
  } catch (error) {
    return { error: error.message }
  }
}

const megabytes = (value) => `${(value / 2 ** 20).toFixed(1)} MB`

/** Checks what every store requires of a picture; `alpha` is 'ok', 'warn' or 'forbid' for transparency. */
function checkImageCommon(report, where, info, { alpha, maxBytes }) {
  if (info.error) {
    report.add('error', where, `cannot be read as an image (${info.error})`)
    return false
  }
  if (info.size > maxBytes)
    report.add('error', where, `is ${megabytes(info.size)}, limit ${megabytes(maxBytes)}`)
  if (!info.hasAlpha || alpha === 'ok') return true
  if (!info.opaque) {
    report.add(
      alpha === 'forbid' ? 'error' : 'warn',
      where,
      'has transparent pixels; export it flattened (24-bit, no alpha)',
    )
  } else if (alpha === 'forbid') {
    report.add(
      'warn',
      where,
      'has an unused alpha channel; flatten it if the store rejects the upload',
    )
  }
  return true
}

async function checkAndroidMedia(report, paths, { allLocales }) {
  for (const locale of LOCALES) {
    const code = locale.play
    const isDefault = code === DEFAULT_LOCALE.android
    const needed = isDefault || allLocales
    const base = join(paths.android, code)
    const label = `android/${code}`

    for (const spec of Object.values(ANDROID_MEDIA)) {
      if (spec.name) {
        const files = await listFiles(join(base, spec.dir), IMAGE_EXTENSIONS)
        const file = files.find(
          (candidate) =>
            basename(candidate, extname(candidate)).toLowerCase() === spec.name.toLowerCase(),
        )
        const where = `${label}/${spec.dir}/${spec.name}`
        if (!file) {
          // Play falls back to the default language's graphics; the icon is only ever set there.
          if (spec.required && (spec.defaultOnly ? isDefault : needed))
            report.add('todo', where, `missing (${spec.width}×${spec.height})`)
          continue
        }
        const info = await readImage(join(base, spec.dir, file))
        if (!checkImageCommon(report, `${label}/${spec.dir}/${file}`, info, spec)) continue
        if (info.width !== spec.width || info.height !== spec.height) {
          report.add(
            'error',
            `${label}/${spec.dir}/${file}`,
            `is ${info.width}×${info.height}, must be exactly ${spec.width}×${spec.height}`,
          )
        }
        continue
      }

      const files = await listFiles(join(base, spec.dir), IMAGE_EXTENSIONS)
      const where = `${label}/${spec.dir}`
      if (!files.length) {
        if (spec.required && needed)
          report.add('todo', where, `${spec.label}: add ${spec.min} to ${spec.max}`)
        continue
      }
      if (files.length < spec.min)
        report.add(
          'error',
          where,
          `${spec.label}: ${files.length} file, Google Play needs at least ${spec.min}`,
        )
      if (files.length > spec.max)
        report.add(
          'error',
          where,
          `${spec.label}: ${files.length} files, Google Play keeps at most ${spec.max}`,
        )
      for (const file of files) {
        const info = await readImage(join(base, spec.dir, file))
        const fileWhere = `${where}/${file}`
        if (
          !checkImageCommon(report, fileWhere, info, { alpha: 'forbid', maxBytes: spec.maxBytes })
        )
          continue
        const [short, long] = [Math.min(info.width, info.height), Math.max(info.width, info.height)]
        if (short < spec.minSide || long > spec.maxSide) {
          report.add(
            'error',
            fileWhere,
            `is ${info.width}×${info.height}; each side must be ${spec.minSide}–${spec.maxSide} px`,
          )
        } else if (long > short * spec.maxRatio) {
          report.add(
            'error',
            fileWhere,
            `is ${info.width}×${info.height}; the long side may be at most ${spec.maxRatio}× the short side`,
          )
        }
      }
    }
  }
}

function displayTypeFor(width, height) {
  return Object.entries(IOS_DISPLAY_TYPES).find(([, type]) =>
    type.sizes.some(([w, h]) => w === width && h === height),
  )?.[0]
}

async function checkIosScreenshots(report, paths, { allLocales }) {
  const known = LOCALES.map((locale) => locale.apple)
  await checkStrayFolders(report, paths.screenshots, known, shown(paths.screenshots), [
    'default',
    'appleTV',
    'iMessage',
    'fonts',
  ])
  for (const code of known) {
    const needed = code === DEFAULT_LOCALE.ios || allLocales
    const directory = join(paths.screenshots, code)
    const label = `ios/screenshots/${code}`
    const entries = (await listDir(directory)) ?? []
    for (const entry of entries) {
      if (
        entry.isFile() &&
        !IMAGE_EXTENSIONS.includes(extname(entry.name).toLowerCase()) &&
        entry.name !== '.gitkeep'
      ) {
        report.add('warn', `${label}/${entry.name}`, 'is not a PNG or JPEG, fastlane ignores it')
      }
    }
    const sets = new Map()
    for (const file of await listFiles(directory, IMAGE_EXTENSIONS)) {
      const where = `${label}/${file}`
      const info = await readImage(join(directory, file))
      if (
        !checkImageCommon(report, where, info, { alpha: 'warn', maxBytes: IOS_SCREENSHOT.maxBytes })
      )
        continue
      const type = displayTypeFor(info.width, info.height)
      if (!type) {
        report.add(
          'error',
          where,
          `${info.width}×${info.height} matches no App Store screenshot size; fastlane skips it`,
        )
        continue
      }
      sets.set(type, [...(sets.get(type) ?? []), file])
    }
    for (const [type, files] of sets) {
      if (files.length > IOS_SCREENSHOT.max) {
        report.add(
          'error',
          label,
          `${IOS_DISPLAY_TYPES[type].label}: ${files.length} screenshots, App Store Connect keeps at most ${IOS_SCREENSHOT.max}`,
        )
      }
    }
    if (!needed) continue
    for (const [group, enabled] of Object.entries(IOS_DEVICE_SETS)) {
      if (!enabled) continue
      const accepted = IOS_REQUIRED_TYPES[group]
      if (accepted.some((type) => sets.has(type))) continue
      const labels = accepted.map((type) => {
        const [width, height] = IOS_DISPLAY_TYPES[type].sizes.filter(([w, h]) => w < h).at(-1)
        return `${IOS_DISPLAY_TYPES[type].label} (${width}×${height})`
      })
      const needs = `${group}: needs one of ${labels.join(' or ')}`
      // Screenshots of another size are not "not there yet", and Apple's rule may have moved on,
      // so that is only a warning; nothing at all for the group is a todo.
      if ([...sets.keys()].some((type) => IOS_DISPLAY_TYPES[type].group === group)) {
        report.add(
          'warn',
          label,
          `${needs} (other sizes found: check App Store Connect accepts them)`,
        )
      } else report.add('todo', label, needs)
    }
  }
}

function probeVideo(path) {
  const result = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height:format=duration',
      '-of',
      'json',
      path,
    ],
    { encoding: 'utf8' },
  )
  if (result.error || result.status !== 0)
    return { unavailable: result.error?.code === 'ENOENT', error: result.stderr?.trim() }
  const data = JSON.parse(result.stdout)
  const stream = data.streams?.[0] ?? {}
  return { width: stream.width, height: stream.height, seconds: Number(data.format?.duration) }
}

async function checkIosPreviews(report, paths) {
  const known = LOCALES.map((locale) => locale.apple)
  await checkStrayFolders(report, paths.previews, known, shown(paths.previews), ['default'])
  let warnedNoProbe = false
  for (const code of known) {
    const directory = join(paths.previews, code)
    const label = `ios/previews/${code}`
    const perType = new Map()
    for (const file of await listFiles(directory, IOS_PREVIEW.extensions)) {
      const where = `${label}/${file}`
      const type = Object.keys(IOS_PREVIEW_TYPES).find((candidate) =>
        file.toUpperCase().includes(candidate),
      )
      if (!type) {
        report.add(
          'error',
          where,
          `file name must contain a preview type (${Object.keys(IOS_PREVIEW_TYPES).join(', ').toLowerCase()}); fastlane skips it`,
        )
        continue
      }
      perType.set(type, (perType.get(type) ?? 0) + 1)
      const { size } = await stat(join(directory, file))
      if (size > IOS_PREVIEW.maxBytes)
        report.add(
          'error',
          where,
          `is ${megabytes(size)}, limit ${megabytes(IOS_PREVIEW.maxBytes)}`,
        )
      const probe = probeVideo(join(directory, file))
      if (probe.unavailable) {
        if (!warnedNoProbe)
          report.add(
            'warn',
            'ios/previews',
            'ffprobe not found: preview size and duration are not checked',
          )
        warnedNoProbe = true
        continue
      }
      if (probe.error) {
        report.add('error', where, `cannot be read as a video (${probe.error})`)
        continue
      }
      const [short, long] = [
        Math.min(probe.width, probe.height),
        Math.max(probe.width, probe.height),
      ]
      if (!IOS_PREVIEW_TYPES[type].sizes.some(([w, h]) => w === short && h === long)) {
        const wanted = IOS_PREVIEW_TYPES[type].sizes.map(([w, h]) => `${w}×${h}`).join(' or ')
        report.add(
          'error',
          where,
          `is ${probe.width}×${probe.height}; ${type.toLowerCase()} previews must be ${wanted}`,
        )
      }
      if (probe.seconds < IOS_PREVIEW.minSeconds || probe.seconds > IOS_PREVIEW.maxSeconds) {
        report.add(
          'error',
          where,
          `lasts ${probe.seconds.toFixed(1)} s; App Store previews run ${IOS_PREVIEW.minSeconds}–${IOS_PREVIEW.maxSeconds} s`,
        )
      }
    }
    for (const [type, count] of perType) {
      if (count > IOS_PREVIEW.maxPerType)
        report.add(
          'error',
          label,
          `${count} ${type.toLowerCase()} previews, App Store Connect keeps at most ${IOS_PREVIEW.maxPerType}`,
        )
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Commands

/** Runs the checks the options ask for and returns the findings. */
export async function runCheck(options, paths) {
  const scope = options.scope ?? 'all'
  const platform = options.platform ?? 'all'
  if (!['all', 'text', 'media'].includes(scope))
    throw new Error('--scope must be all, text or media')
  if (!['all', 'android', 'ios'].includes(platform))
    throw new Error('--platform must be all, android or ios')
  const report = new Report(Boolean(options.strict))
  const withText = scope !== 'media'
  const withMedia = scope !== 'text'
  const mediaOptions = { allLocales: Boolean(options['all-locales']) }

  if (platform !== 'ios') {
    if (withText) await checkAndroidText(report, paths)
    if (withMedia) await checkAndroidMedia(report, paths, mediaOptions)
  }
  if (platform !== 'android') {
    if (withText) await checkIosText(report, paths)
    if (withMedia) {
      await checkIosScreenshots(report, paths, mediaOptions)
      await checkIosPreviews(report, paths)
    }
  }
  return report
}

async function check(options, paths) {
  const report = await runCheck(options, paths)
  report.print()
  if (report.count('error')) process.exitCode = 1
}

/** Same formula as android/app/build.gradle: major * 1,000,000 + minor * 1,000 + patch. */
export async function packageVersionCode() {
  const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  const match = /^(\d+)\.(\d+)\.(\d+)/u.exec(version ?? '')
  if (!match) throw new Error(`package.json version "${version}" is not valid semver`)
  return Math.max(1, Number(match[1]) * 1_000_000 + Number(match[2]) * 1_000 + Number(match[3]))
}

export async function changelog(options, paths) {
  const versionCode = Number(options['version-code'] ?? (await packageVersionCode()))
  if (!Number.isInteger(versionCode) || versionCode < 1)
    throw new Error('--version-code must be a positive integer')
  const force = Boolean(options.force)
  const report = new Report(false)
  let written = 0
  for (const locale of LOCALES) {
    const where = `android/${locale.play}/changelogs/${versionCode}.txt`
    const source =
      typeof options.text === 'string'
        ? options.text
        : await readListing(
            join(paths.ios, locale.apple, 'release_notes.txt'),
            report,
            `ios/${locale.apple}/release_notes.txt`,
          )
    if (!source) {
      report.add('warn', where, 'skipped: no release notes to copy')
      continue
    }
    if ([...source].length > ANDROID_CHANGELOG_MAX) {
      report.add(
        'error',
        where,
        `skipped: ${[...source].length} characters, Google Play allows ${ANDROID_CHANGELOG_MAX}; shorten it or use --text`,
      )
      continue
    }
    if (
      await writeText(
        join(paths.android, locale.play, 'changelogs', `${versionCode}.txt`),
        source,
        { force },
      )
    )
      written += 1
    else report.add('warn', where, 'kept the existing file (use --force to overwrite)')
  }
  console.log(`wrote ${written} changelogs for versionCode ${versionCode}`)
  report.print()
  if (report.count('error')) process.exitCode = 1
}

const USAGE = `Usage: node scripts/store-metadata.mjs <command> [options]

  check [options]               validate text and media
      --scope all|text|media    default all
      --platform all|android|ios
      --strict                  treat missing content as errors (use before uploading)
      --all-locales             also require media in every language, not only the default
  changelog [options]           Google Play release notes from the App Store ones
      --version-code <n>        default: from package.json, like the Gradle build
      --text "<notes>"          use this text for every language instead
      --force                   overwrite existing files

All commands take --store-dir <folder> (default: store/).`

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2))
  const paths = createPaths(resolve(String(options['store-dir'] ?? join(root, 'store'))))
  const commands = { check, changelog }
  if (!Object.hasOwn(commands, command)) {
    console.error(USAGE)
    process.exitCode = command ? 2 : 0
    return
  }
  await commands[command](options, paths)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
