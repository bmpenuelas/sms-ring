// The TypeScript matcher against the shared vectors that the Java and Swift
// ports also run (plugins/remote-ring/test-fixtures/matching.json).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { evaluateMessage, RING_WORDS } from '../src/core/matcher.ts'
import { normalizePhrase, sendersMatch } from '../src/core/normalize.ts'

const fixtures = JSON.parse(readFileSync(new URL('../plugins/remote-ring/test-fixtures/matching.json', import.meta.url), 'utf8'))

test('normalizePhrase', () => {
  for (const [input, expected] of fixtures.normalizePhrase) assert.equal(normalizePhrase(input), expected, input)
})

test('sendersMatch', () => {
  for (const [a, b, expected] of fixtures.sendersMatch) assert.equal(sendersMatch(a, b), expected, `${a} vs ${b}`)
})

test('evaluateMessage', () => {
  for (const c of fixtures.evaluate) assert.equal(evaluateMessage(c.config, c.body, c.sender), c.verdict, c.body)
})

test('every locale supplies its ring word, and the matcher accepts it', async () => {
  const { LANGUAGES } = await import('../src/i18n/languages.ts')
  for (const { code } of LANGUAGES) {
    const { default: messages } = await import(`../src/i18n/locales/${code}.ts`)
    const word: string = messages.app.ios.ringWord
    assert.ok(RING_WORDS.includes(word as never), `${code}: "${word}" is not in RING_WORDS`)
    assert.ok(normalizePhrase(word).length >= 2, code)
    const config = { armed: true, passphrase: 'blue tiger moon', senders: [] }
    for (const body of [`${word} blue tiger moon`, `blue tiger moon ${word}`, `${word.toUpperCase()}: “blue tiger moon”`]) {
      assert.equal(evaluateMessage(config, body, ''), 'ring', `${code}: ${body}`)
    }
  }
})

test('the Java and Swift ring-word lists are the TypeScript list', () => {
  const quoted = (source: string, marker: RegExp) => {
    const block = source.match(marker)?.[1] ?? ''
    return [...block.matchAll(/"([^"]+)"/gu)].map((m) => m[1])
  }
  const java = readFileSync(new URL('../plugins/remote-ring/android/src/main/java/com/logicedge/smsring/remotering/MessageMatcher.java', import.meta.url), 'utf8')
  const swift = readFileSync(new URL('../plugins/remote-ring/ios/Sources/RemoteRingPlugin/MessageMatcher.swift', import.meta.url), 'utf8')
  assert.deepEqual(quoted(java, /RING_WORDS = \{([^}]*)\}/u), [...RING_WORDS])
  assert.deepEqual(quoted(swift, /ringWords = \[([^\]]*)\]/u), [...RING_WORDS])
})
