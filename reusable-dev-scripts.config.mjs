import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'reusable-dev-scripts'
import { LANGUAGES } from './src/i18n/languages.ts'

const root = dirname(fileURLToPath(import.meta.url))
const credential = (name, fallback) => process.env[name] ? resolve(root, 'store', process.env[name]) : fallback

export default defineConfig({
  version: 1,
  vue: { typecheck: 'noEmit' },
  capacitor: {
    platforms: ['android', 'ios'],
    prepare: [['node', 'scripts/generate-app-assets.mjs', '--check']],
    // Keep the existing order: web build, localized native/store resources, sync.
    afterBuild: [['node', 'scripts/generate-native-locales.mjs']],
  },
  android: { appId: 'com.logicedge.smsring' },
  store: {
    root: 'store',
    locales: LANGUAGES.map(language => ({ app: language.code, android: language.play, ios: language.appStore })),
    appLocales: LANGUAGES.map(language => language.code),
    defaultLocales: { android: 'en-US', ios: 'en-US' },
    iosDevices: { iphone: true, ipad: false, watch: false },
    androidId: 'com.logicedge.smsring',
    iosId: 'com.logicedge.smsring',
    allowExternalCredentials: true,
    playKey: credential('SUPPLY_JSON_KEY', 'store/fastlane/play-service-account.json'),
    appleKey: credential('APP_STORE_CONNECT_API_KEY_PATH', 'store/fastlane/app-store-connect-api-key.json'),
    hooks: { beforeUpload: [['node', 'scripts/verify-offline.mjs']] },
  },
})
