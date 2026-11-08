import assert from 'node:assert/strict'
import { test } from 'node:test'

import { LANGUAGES } from '../src/i18n/languages.ts'

test('every language gives the same five iPhone steps, with the labels the user sees', async () => {
  for (const { code } of LANGUAGES) {
    const { default: messages } = await import(`../src/i18n/locales/${code}.ts`)
    const { ios } = messages.app
    const steps: string[] = ios.steps(ios.ringWord)
    assert.equal(steps.length, 5, code)
    // The word to type, in the trigger step and in the test step.
    for (const i of [1, 4]) assert.ok(steps[i].includes(`**${ios.ringWord}**`), `${code}: step ${i + 1} shows the ring word`)
    // The action is found by the app name and the exact (localized) action title; its parameters keep their names.
    assert.ok(steps[2].includes('**SMS Ring**'), code)
    assert.ok(steps[2].includes(`**${messages.native.intentRingTitle}**`), `${code}: action title`)
    assert.ok(steps[2].includes(`**${messages.native.intentMessage}**`), `${code}: Message parameter`)
    assert.ok(steps[2].includes(`**${messages.native.intentSender}**`), `${code}: Sender parameter`)
    // The path starts with the plus button and no step is left over from the old six-step guide.
    assert.ok(steps[0].includes('**+**'), code)
    assert.ok(steps.every((s) => !s.includes('undefined') && !s.includes('${')), code)
  }
})
