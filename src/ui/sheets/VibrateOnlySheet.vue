<script setup lang="ts">
import { ref, watch } from 'vue'

import { t } from '../../i18n'
import { useRingApp } from '../../state/app'
import BottomSheet from '../BottomSheet.vue'
import PassphraseShareActions from '../PassphraseShareActions.vue'

defineEmits<{ close: [] }>()
const { state, actions } = useRingApp()
const words = ref(state.config.vibrateOnlyPhrase)
// Keep the draft's spaces while typing, but share/persist sanitized words immediately.
watch(words, (value) => actions.setVibrateOnlyPhrase(value), { flush: 'sync' })
</script>

<template>
  <BottomSheet :title="t.vibrateOnly.title" @close="$emit('close')">
    <p id="vibrate-only-help" class="hint ui-muted">{{ t.vibrateOnly.matchingHint }}</p>
    <label class="ui-label" for="vibrate-only-phrase">{{ t.vibrateOnly.phraseLabel }}</label>
    <input
      id="vibrate-only-phrase"
      v-model="words"
      class="ui-field big"
      type="text"
      autocomplete="off"
      autocapitalize="off"
      :spellcheck="false"
      :placeholder="t.vibrateOnly.defaultPhrase"
      aria-describedby="vibrate-only-help"
      @blur="words = state.config.vibrateOnlyPhrase"
    />
    <template #footer><PassphraseShareActions /></template>
  </BottomSheet>
</template>

<style scoped>
.hint {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.45;
}
.big {
  font-size: 18px;
  font-weight: 600;
}
</style>
