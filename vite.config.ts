import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'

/**
 * Production builds get a Content-Security-Policy that forbids every network
 * connection (fetch, XHR, WebSocket, beacons) and every remote script, style,
 * font or image. Even injected code could not phone home. The dev server keeps
 * its websocket for hot reload, so the policy is added at build time only.
 */
function offlineCsp(): Plugin {
  const policy = [
    "default-src 'self'",
    "connect-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' data: blob:",
    "object-src 'none'",
    "frame-src 'none'",
    "worker-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
  ].join('; ')
  return {
    name: 'offline-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
      )
    },
  }
}

export default defineConfig({
  plugins: [vue(), offlineCsp()],
  server: { port: 5180, host: '127.0.0.1' },
  build: {
    target: 'es2022',
    // Inline nothing that would need a remote origin; keep assets local.
    assetsInlineLimit: 0,
  },
})
