import type { CapacitorConfig } from '@capacitor/cli'

// Offline by design: no server.url, no remote hosts, no allowNavigation.
// The web assets ship inside the app and are served from the app bundle.
const config: CapacitorConfig = {
  appId: 'app.smsring',
  appName: 'SMS Ring',
  webDir: 'dist',
  loggingBehavior: 'none',
  android: {
    // Never allow http:// content: there is nothing to load from anywhere.
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'never',
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
    },
  },
}

export default config
