import assert from 'node:assert/strict'
import { test } from 'node:test'

import { LANGUAGES } from '../src/i18n/languages.ts'

test('every language gives the same seven iPhone steps, with the labels the user sees', async () => {
  for (const { code } of LANGUAGES) {
    const { default: messages } = await import(`../src/i18n/locales/${code}.ts`)
    const { ios } = messages.app
    const steps: string[] = ios.steps(ios.ringWord)
    assert.equal(steps.length, 7, code)
    // The word to type, in the trigger step and in the test step.
    // It is text to type, so it is a chip (`[[word]]`), not bold.
    for (const i of [1, 6]) assert.ok(steps[i].includes(`[[${ios.ringWord}]]`), `${code}: step ${i + 1} shows the ring word as a chip`)
    assert.ok(ios.wordNote(ios.ringWord).includes(`[[${ios.ringWord}]]`), `${code}: word note`)
    // The If step points at the action it already contains.
    assert.ok(steps[3].includes(`**${messages.native.intentRingTitle}**`), `${code}: If step names the action`)
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

test('every language explains the box that asks to type the message, in the app and in Shortcuts', async () => {
  for (const { code } of LANGUAGES) {
    const { default: messages } = await import(`../src/i18n/locales/${code}.ts`)
    const { ios } = messages.app
    // The in-app hint names the Message parameter as a bold label; the Shortcuts dialog is plain text.
    assert.ok(ios.promptHint.includes(`**${messages.native.intentMessage}**`), `${code}: hint names Message`)
    assert.ok(!messages.native.intentMessagePrompt.includes('**'), `${code}: dialog has no markup`)
    assert.ok(messages.native.intentMessagePrompt.length > 20, code)
  }
})
