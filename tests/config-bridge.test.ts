import assert from 'node:assert/strict'
import { test } from 'node:test'

import { reactive } from 'vue'

import { defaultConfig, plainConfig } from '../src/core/config.ts'

test('the native bridge gets a plain copy, not a reactive proxy', () => {
  const config = reactive(defaultConfig('daisy peach carpet'))
  config.senders.push('+34600000000')

  // WKWebView posts plugin options with structured clone, which cannot copy a Proxy.
  assert.throws(() => structuredClone({ config }))

  const copy = structuredClone({ config: plainConfig(config) }).config
  assert.deepEqual(copy, { ...defaultConfig('daisy peach carpet'), senders: ['+34600000000'] })
})
