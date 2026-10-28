<script setup lang="ts">
// A message simulator: type a text, watch the matcher decide. Runs the same
// rules as the native side; nothing is sent.
import { computed, ref } from 'vue'

import { t } from '../../i18n'
import { useRingApp } from '../../state/app'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'

defineEmits<{ close: [] }>()
const { state, actions } = useRingApp()

const body = ref(state.config.passphrase)
const sender = ref('')
const verdict = computed(() => actions.simulate(body.value, sender.value))
const rings = computed(() => verdict.value === 'ring' || verdict.value === 'vibrate-only')
</script>

<template>
  <BottomSheet :title="t.tryIt.title" @close="$emit('close')">
    <p class="ui-muted hint">{{ t.tryIt.hint }}</p>

    <div class="phone" :class="{ rings }">
      <div class="bubble">
        <span class="from">{{ sender || '+1 555 0100' }}</span>
        <textarea v-model="body" rows="2" :placeholder="t.tryIt.placeholder" :aria-label="t.tryIt.placeholder" />
      </div>
      <div class="result" :key="verdict">
        <span class="bell"><Icon :name="verdict === 'vibrate-only' ? 'vibrate' : rings ? 'bell' : 'bell-off'" :size="22" /></span>
        <strong>{{ t.tryIt.verdicts[verdict] }}</strong>
      </div>
    </div>

    <label class="ui-label" for="try-sender">{{ t.tryIt.sender }}</label>
    <input id="try-sender" v-model="sender" class="ui-field" type="tel" inputmode="tel" placeholder="+1 555 0100" />
  </BottomSheet>
</template>

<style scoped>
.hint {
  margin: 0 0 14px;
  font-size: 14px;
}
.phone {
  padding: 16px;
  border-radius: 24px;
  background: var(--ui-field);
  display: grid;
  gap: 14px;
}
.bubble {
  align-self: start;
  max-width: 88%;
  padding: 10px 14px 12px;
  border-radius: 20px 20px 20px 6px;
  background: var(--ui-bg);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}
.from {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: var(--ui-muted);
  margin-bottom: 2px;
  direction: ltr;
}
.bubble textarea {
  width: 100%;
  border: 0;
  outline: none;
  resize: none;
  background: transparent;
  font-size: 16px;
  line-height: 1.35;
}
.result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 16px;
  background: var(--ui-bg);
  font-size: 15px;
  animation: in 0.35s var(--ease-spring);
}
@keyframes in {
  from { transform: scale(0.94); opacity: 0.4; }
}
.bell {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--ui-line);
}
.rings .result {
  background: var(--ui-accent);
  color: var(--ui-accent-ink);
}
.rings .bell {
  background: rgba(255, 255, 255, 0.22);
  animation: ring 0.5s ease-in-out infinite;
}
@keyframes ring {
  25% { transform: rotate(12deg); }
  75% { transform: rotate(-12deg); }
}
</style>
