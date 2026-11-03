// Store listing layout, limits and media specs shared by scripts/store-metadata.mjs.
// Keep in step with fastlane (store/Gemfile.lock): the Apple screenshot sizes below mirror
// deliver's DEVICE_RESOLUTIONS in deliver/lib/deliver/app_screenshot.rb, and the folder and file
// names are the ones supply and deliver read.
import { LANGUAGES } from '../../src/i18n/languages.ts'

// One row per app language, straight from the app's registry so the two cannot drift: `play` and
// `apple` are the fastlane folder names.
export const LOCALES = LANGUAGES.map((language) => ({
  app: language.code,
  play: language.play,
  apple: language.appStore,
}))

// Each store's default (primary) listing language: media missing elsewhere falls back to it.
export const DEFAULT_LOCALE = { android: 'en-US', ios: 'en-US' }

// The device kinds the iOS app ships for (TARGETED_DEVICE_FAMILY = 1: iPhone only), which decides
// the screenshot sets App Store Connect requires.
export const IOS_DEVICE_SETS = { iphone: true, ipad: false, watch: false }

const bytes = (text) => Buffer.byteLength(text, 'utf8')

// Text fields. `required` marks the fields `npm run locales` writes (missing ones are "todo"
// findings); the others are entered in App Store Connect and only checked when a file exists.
// `measure` is how the store counts (Apple counts keywords in UTF-8 bytes, the rest in characters).
export const ANDROID_TEXT = [
  { file: 'title.txt', label: 'Title', max: 30, required: true },
  { file: 'short_description.txt', label: 'Short description', max: 80, required: true },
  { file: 'full_description.txt', label: 'Full description', max: 4000, required: true },
  // YouTube link for the promo video; an empty file would clear the video, so it is optional.
  { file: 'video.txt', label: 'Promo video URL', max: 200, required: false, kind: 'youtube' },
]
export const ANDROID_CHANGELOG_MAX = 500

export const IOS_TEXT = [
  { file: 'name.txt', label: 'Name', max: 30, required: true },
  { file: 'subtitle.txt', label: 'Subtitle', max: 30, required: true },
  { file: 'description.txt', label: 'Description', max: 4000, required: true },
  {
    file: 'keywords.txt',
    label: 'Keywords',
    max: 100,
    required: true,
    measure: bytes,
    kind: 'keywords',
  },
  { file: 'promotional_text.txt', label: 'Promotional text', max: 170, required: true },
  { file: 'release_notes.txt', label: 'What’s New', max: 4000, required: false },
  { file: 'support_url.txt', label: 'Support URL', max: 2048, required: false, kind: 'url' },
  { file: 'marketing_url.txt', label: 'Marketing URL', max: 2048, required: false, kind: 'url' },
  { file: 'privacy_url.txt', label: 'Privacy policy URL', max: 2048, required: false, kind: 'url' },
]
// Not localised: <metadata/ios>/<file>. Review notes sit in review_information/.
export const IOS_ROOT_TEXT = [
  { file: 'copyright.txt', label: 'Copyright', max: 200, required: false },
  { file: 'primary_category.txt', label: 'Primary category', max: 60, required: false },
  { file: 'secondary_category.txt', label: 'Secondary category', max: 60, required: false },
]
// App Review details. Contact and demo-account files are optional here and gitignored (this repo
// is public): keep them on your machine or enter them in App Store Connect. Empty files are
// ignored by deliver, so they never blank what App Store Connect already has.
export const IOS_REVIEW_TEXT = [
  { file: 'first_name.txt', label: 'Review contact first name', max: 100, required: false },
  { file: 'last_name.txt', label: 'Review contact last name', max: 100, required: false },
  { file: 'phone_number.txt', label: 'Review contact phone', max: 50, required: false },
  { file: 'email_address.txt', label: 'Review contact email', max: 150, required: false },
  { file: 'demo_user.txt', label: 'Review demo account', max: 100, required: false },
  { file: 'demo_password.txt', label: 'Review demo password', max: 100, required: false },
  { file: 'notes.txt', label: 'Review notes', max: 4000, required: false },
]

// Google Play graphics (supply folder names). Limits: Play Console "Preview assets" help.
const PLAY_SCREENSHOT = {
  min: 2,
  max: 8,
  minSide: 320,
  maxSide: 3840,
  maxRatio: 2,
  maxBytes: 8 * 2 ** 20,
}
export const ANDROID_MEDIA = {
  icon: {
    dir: 'images',
    name: 'icon',
    width: 512,
    height: 512,
    maxBytes: 1024 ** 2,
    alpha: 'ok',
    required: true,
    defaultOnly: true,
  },
  featureGraphic: {
    dir: 'images',
    name: 'featureGraphic',
    width: 1024,
    height: 500,
    maxBytes: 15 * 2 ** 20,
    alpha: 'forbid',
    required: true,
  },
  phoneScreenshots: {
    dir: 'images/phoneScreenshots',
    label: 'Phone screenshots',
    ...PLAY_SCREENSHOT,
    required: true,
  },
  sevenInchScreenshots: {
    dir: 'images/sevenInchScreenshots',
    label: '7-inch tablet screenshots',
    ...PLAY_SCREENSHOT,
    min: 1,
    required: false,
  },
  tenInchScreenshots: {
    dir: 'images/tenInchScreenshots',
    label: '10-inch tablet screenshots',
    ...PLAY_SCREENSHOT,
    min: 1,
    required: false,
  },
}

// App Store screenshot sizes (width x height, portrait or landscape). deliver picks the display
// type from the pixel size; 2048x2732 is shared by two iPad types and so ambiguous.
const both = (sizes) =>
  sizes.flatMap(([w, h]) => [
    [w, h],
    [h, w],
  ])
export const IOS_DISPLAY_TYPES = {
  APP_IPHONE_67: {
    label: 'iPhone 6.9"',
    group: 'iphone',
    sizes: both([
      [1260, 2736],
      [1290, 2796],
      [1320, 2868],
    ]),
  },
  APP_IPHONE_65: {
    label: 'iPhone 6.5"',
    group: 'iphone',
    sizes: both([
      [1242, 2688],
      [1284, 2778],
    ]),
  },
  APP_IPHONE_61: {
    label: 'iPhone 6.3"/6.1"',
    group: 'iphone',
    sizes: both([
      [1179, 2556],
      [1206, 2622],
    ]),
  },
  APP_IPHONE_58: {
    label: 'iPhone 5.8"',
    group: 'iphone',
    sizes: both([
      [1170, 2532],
      [1125, 2436],
      [1080, 2340],
    ]),
  },
  APP_IPHONE_55: { label: 'iPhone 5.5"', group: 'iphone', sizes: both([[1242, 2208]]) },
  APP_IPHONE_47: { label: 'iPhone 4.7"', group: 'iphone', sizes: both([[750, 1334]]) },
  APP_IPAD_PRO_3GEN_129: {
    label: 'iPad 13"',
    group: 'ipad',
    sizes: both([
      [2048, 2732],
      [2064, 2752],
    ]),
  },
  APP_IPAD_PRO_129: {
    label: 'iPad Pro 12.9" (2nd gen)',
    group: 'ipad',
    sizes: both([[2048, 2732]]),
  },
  APP_IPAD_PRO_3GEN_11: {
    label: 'iPad Pro 11"',
    group: 'ipad',
    sizes: both([
      [1488, 2266],
      [1668, 2420],
      [1668, 2388],
      [1640, 2360],
    ]),
  },
  APP_IPAD_105: { label: 'iPad 10.5"', group: 'ipad', sizes: both([[1668, 2224]]) },
  APP_IPAD_97: {
    label: 'iPad 9.7"',
    group: 'ipad',
    sizes: both([
      [768, 1004],
      [768, 1024],
      [1536, 2008],
      [1536, 2048],
      [1024, 748],
      [2048, 1496],
    ]),
  },
  APP_WATCH_ULTRA: {
    label: 'Apple Watch Ultra',
    group: 'watch',
    sizes: [
      [410, 502],
      [422, 514],
    ],
  },
  APP_WATCH_SERIES_10: { label: 'Apple Watch Series 10/11', group: 'watch', sizes: [[416, 496]] },
  APP_WATCH_SERIES_7: { label: 'Apple Watch Series 7-9', group: 'watch', sizes: [[396, 484]] },
  APP_WATCH_SERIES_4: { label: 'Apple Watch Series 4-6', group: 'watch', sizes: [[368, 448]] },
  APP_WATCH_SERIES_3: { label: 'Apple Watch Series 3', group: 'watch', sizes: [[312, 390]] },
}
// Display types that satisfy each group's "required" slot in App Store Connect.
export const IOS_REQUIRED_TYPES = {
  // Apple's screenshot specifications list the Dynamic Island sizes (1179×2556, 1206×2622) as the
  // required iPhone set; the larger sizes cover the same slot.
  iphone: ['APP_IPHONE_67', 'APP_IPHONE_65', 'APP_IPHONE_61'],
  ipad: ['APP_IPAD_PRO_3GEN_129'],
  watch: ['APP_WATCH_ULTRA', 'APP_WATCH_SERIES_10', 'APP_WATCH_SERIES_7'],
}
export const IOS_SCREENSHOT = { min: 1, max: 10, maxBytes: 10 * 2 ** 20 }

// App preview videos: the file name must contain the preview type (deliver matches it
// case-insensitively), e.g. app-preview_iphone_67.mp4. Portrait sizes as accepted by deliver.
export const IOS_PREVIEW_TYPES = {
  IPHONE_67: { label: 'iPhone 6.9"', sizes: [[886, 1920]] },
  IPHONE_65: { label: 'iPhone 6.5"', sizes: [[886, 1920]] },
  IPHONE_61: { label: 'iPhone 6.3"/6.1"', sizes: [[886, 1920]] },
  IPHONE_58: { label: 'iPhone 5.8"', sizes: [[886, 1920]] },
  IPHONE_55: { label: 'iPhone 5.5"', sizes: [[1080, 1920]] },
  IPHONE_47: { label: 'iPhone 4.7"', sizes: [[750, 1334]] },
  IPAD_PRO_3GEN_129: { label: 'iPad 13"', sizes: [[1200, 1600]] },
  IPAD_PRO_3GEN_11: { label: 'iPad 11"', sizes: [[1200, 1600]] },
  IPAD_PRO_129: {
    label: 'iPad Pro 12.9"',
    sizes: [
      [1200, 1600],
      [900, 1200],
    ],
  },
}
export const IOS_PREVIEW = {
  maxPerType: 3,
  minSeconds: 15,
  maxSeconds: 30,
  maxBytes: 500 * 2 ** 20,
  extensions: ['.mp4', '.mov', '.m4v'],
}
