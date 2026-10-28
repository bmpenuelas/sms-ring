<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { LANGUAGES, t } from '../../i18n'
import { MAX_WORDS, MIN_WORDS, useRingApp } from '../../state/app'
import { passphraseStartMode } from '../../state/sheets'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'
import KeycapPhrase from '../KeycapPhrase.vue'
import StrengthMeter from '../StrengthMeter.vue'
import PassphraseShareActions from '../PassphraseShareActions.vue'

defineEmits<{ close: [] }>()
const { state, actions, prefs } = useRingApp()

const mode = ref<'words' | 'custom'>(passphraseStartMode.value ?? (prefs.customPassphrase ? 'custom' : 'words'))
const editing = passphraseStartMode.value === 'custom'
passphraseStartMode.value = null
const customInput = ref<HTMLInputElement>()
onMounted(() => {
  // Opened with Edit: focus the phrase, cursor at the end.
  if (editing) setTimeout(() => customInput.value?.focus(), 350)
})
const counts = computed(() => Array.from({ length: MAX_WORDS - MIN_WORDS + 1 }, (_, i) => MIN_WORDS + i))

function switchMode(next: 'words' | 'custom') {
  mode.value = next
  if (next === 'words' && prefs.customPassphrase) actions.regenerate()
}
</script>

<template>
  <BottomSheet :title="t.passphrase.title" @close="$emit('close')">
    <p class="hint ui-muted">{{ t.passphrase.hint }}</p>

    <div class="seg" role="tablist">
      <button role="tab" :aria-selected="mode === 'words'" :class="{ on: mode === 'words' }" @click="switchMode('words')">
        <Icon name="shuffle" :size="16" /> {{ t.passphrase.shuffle }}
      </button>
      <button role="tab" :aria-selected="mode === 'custom'" :class="{ on: mode === 'custom' }" @click="switchMode('custom')">
        <Icon name="sparkle" :size="16" /> {{ t.passphrase.custom }}
      </button>
    </div>

    <template v-if="mode === 'words'">
      <div class="keycaps">
        <KeycapPhrase :words="state.passphraseWords" />
      </div>
      <button class="ui-btn block" @click="actions.regenerate()"><Icon name="shuffle" /> {{ t.passphrase.shuffle }}</button>

      <label class="ui-label">{{ t.passphrase.wordCount }}</label>
      <div class="counts">
        <button
          v-for="n in counts"
          :key="n"
          class="count press"
          :class="{ on: prefs.wordCount === n }"
          :aria-pressed="prefs.wordCount === n"
          @click="actions.setWordCount(n)"
        >
          {{ n }}
        </button>
      </div>

      <label class="ui-label" for="word-lang">{{ t.passphrase.language }}</label>
      <select
        id="word-lang"
        class="ui-field"
        :value="prefs.wordLanguage"
        @change="actions.setWordLanguage(($event.target as HTMLSelectElement).value as never)"
      >
        <option value="auto">{{ t.common.automatic }}</option>
        <option v-for="l in LANGUAGES" :key="l.code" :value="l.code">{{ l.name }}</option>
      </select>
    </template>

    <template v-else>
      <label class="ui-label" for="custom-phrase">{{ t.passphrase.title }}</label>
      <input
        id="custom-phrase"
        ref="customInput"
        class="ui-field big"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        :placeholder="t.passphrase.customPlaceholder"
        :value="state.config.passphrase"
        @input="actions.setCustomPassphrase(($event.target as HTMLInputElement).value)"
      />
      <p v-if="!state.passphraseValid" class="warn">{{ t.passphrase.tooShort }}</p>
    </template>

    <div class="meter-wrap"><StrengthMeter /></div>

    <template #footer>
      <PassphraseShareActions />
    </template>
  </BottomSheet>
</template>

<style scoped>
.hint {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.45;
}
.seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  border-radius: 999px;
  background: var(--ui-field);
  margin-bottom: 18px;
}
.seg button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 14px;
  transition: background 0.25s, color 0.25s;
}
.seg .on {
  background: var(--ui-bg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.keycaps {
  display: flex;
  justify-content: center;
  margin: 6px 0 16px;
  padding-inline-start: 7px;
}
.counts {
  display: flex;
  gap: 8px;
}
.count {
  flex: 1;
  height: 46px;
  border-radius: 14px;
  background: var(--ui-field);
  font-weight: 800;
  font-size: 17px;
}
.count.on {
  background: var(--ui-accent);
  color: var(--ui-accent-ink);
}
.big {
  font-size: 18px;
  font-weight: 600;
}
.warn {
  color: var(--ui-warn);
  font-size: 13px;
  font-weight: 600;
  margin: 10px 0 0;
}
.meter-wrap {
  margin-top: 20px;
}
</style>
