<script setup lang="ts">
// iPhone: an Apple Shortcuts automation hands every incoming message to our
// intent, which checks it for the passphrase. The automation never holds the
// phrase itself, so changing the passphrase needs no change in Shortcuts.
import { onMounted } from 'vue'

import { formatRelative, t } from '../../i18n'
import { openExternal } from '../../services/device'
import { useRingApp } from '../../state/app'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'
import IosStepArt from '../IosStepArt.vue'
import RichText from '../RichText.vue'

defineEmits<{ close: [] }>()
const { state, actions } = useRingApp()

onMounted(() => void actions.refreshPlatform())
</script>

<template>
  <BottomSheet :title="t.ios.setupTitle" @close="$emit('close')">
    <p class="why">{{ t.ios.why }}</p>

    <div class="word-card">
      <p><RichText :text="t.ios.wordNote(t.ios.ringWord)" /></p>
    </div>

    <ol class="steps">
      <li v-for="(s, i) in t.ios.steps(t.ios.ringWord)" :key="i" :style="{ '--d': `${i * 60}ms` }">
        <span class="n">{{ i + 1 }}</span>
        <div class="body">
          <RichText :text="s" />
          <IosStepArt :step="(i + 1) as 1 | 2 | 3 | 4 | 5" />
        </div>
      </li>
    </ol>

    <div class="verify" :class="{ ok: state.platformInfo.lastAutomationRun }">
      <span class="dot" />
      <span>
        {{
          state.platformInfo.lastAutomationRun
            ? t.ios.verified(formatRelative(state.platformInfo.lastAutomationRun.at))
            : t.ios.waiting
        }}
      </span>
    </div>

    <template #footer>
      <button class="ui-btn block" @click="openExternal('shortcuts://')"><Icon name="link" /> {{ t.ios.openShortcuts }}</button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.why {
  margin: 0 0 14px;
  line-height: 1.45;
}
.word-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--ui-field);
}
.word-card p {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
}
.steps {
  list-style: none;
  padding: 0;
  margin: 18px 0;
  display: grid;
  gap: 12px;
}
.steps li {
  display: flex;
  gap: 12px;
  line-height: 1.45;
  animation: rise 0.4s var(--ease-out) both;
  animation-delay: var(--d);
}
@keyframes rise {
  from { opacity: 0; transform: translateY(8px); }
}
.body {
  min-width: 0;
  flex: 1;
}
.n {
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--ui-ink);
  color: var(--ui-bg);
  font-weight: 800;
  font-size: 13px;
}
.verify {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--ui-field);
  font-weight: 600;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--ui-warn);
  animation: blink 0.9s ease-in-out infinite alternate;
}
.ok .dot {
  background: var(--ui-good);
  animation: none;
}
@keyframes blink {
  to { opacity: 0.25; }
}
</style>
