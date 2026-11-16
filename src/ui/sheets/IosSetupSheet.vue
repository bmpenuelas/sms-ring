<script setup lang="ts">
// iPhone: an Apple Shortcuts automation hands every incoming message to our
// intent, which checks it for the passphrase. The automation never holds the
// phrase itself, so changing the passphrase needs no change in Shortcuts.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { formatRelative, language, t } from '../../i18n'
import { openExternal } from '../../services/device'
import { useRingApp } from '../../state/app'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'
import IosStepArt from '../IosStepArt.vue'
import RichText from '../RichText.vue'

const emit = defineEmits<{ close: [] }>()
const { state, actions } = useRingApp()

// The automation runs in the background (the intent is called by Shortcuts), so nothing tells the app
// to look again: poll while the guide is open. A run that arrives after the guide was opened ends the setup.
const openedAt = Date.now()
const done = ref(false)
const POLL_MS = 1500
let poll: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  void actions.refreshPlatform()
  poll = setInterval(() => void actions.refreshPlatform(), POLL_MS)
})
onBeforeUnmount(() => clearInterval(poll))

watch(
  () => state.platformInfo.lastAutomationRun?.at,
  (at) => {
    if (at !== undefined && at >= openedAt && !done.value) {
      done.value = true
      clearInterval(poll)
    }
  },
)

function finish() {
  done.value = false
  emit('close')
}

// One screenshot per app language; English when a language has none.
const finalImage = ref(`${import.meta.env.BASE_URL}ios-setup/${language.value}.webp`)
function fallbackImage() {
  finalImage.value = `${import.meta.env.BASE_URL}ios-setup/en.webp`
}
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
          <p v-if="i === 2" class="callout"><RichText :text="t.ios.inputInstruction" /></p>
          <IosStepArt :step="(i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7" />
        </div>
      </li>
    </ol>

    <figure class="final">
      <figcaption>{{ t.ios.finalCaption }}</figcaption>
      <img :src="finalImage" :alt="t.ios.finalCaption" loading="lazy" width="588" height="1280" @error="fallbackImage" />
    </figure>

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

    <p class="hint"><RichText :text="t.ios.promptHint" /></p>

    <Teleport to="body">
      <Transition name="pop">
        <div v-if="done" class="done-backdrop">
          <div class="done" role="alertdialog" aria-modal="true" :aria-label="t.ios.setupCompleted">
            <span class="done-icon"><Icon name="check" :size="28" /></span>
            <h3>{{ t.ios.setupCompleted }}</h3>
            <p>{{ t.ios.doneText }}</p>
            <button class="ui-btn block" @click="finish">{{ t.ios.doneOk }}</button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <template #footer>
      <button class="ui-btn block" @click="openExternal('shortcuts://')"><Icon name="link" /> {{ t.ios.openShortcuts }}</button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.done-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--ui-backdrop);
  backdrop-filter: blur(3px);
}
.done {
  width: min(100%, 340px);
  display: grid;
  gap: 12px;
  justify-items: center;
  text-align: center;
  padding: 24px 20px 20px;
  border-radius: 24px;
  background: var(--ui-bg);
  color: var(--ui-ink);
  box-shadow: 0 12px 40px rgb(0 0 0 / 0.3);
}
.done h3 {
  margin: 0;
  font-size: 20px;
}
.done p {
  margin: 0;
  line-height: 1.4;
}
.done .ui-btn {
  margin-top: 6px;
}
.done-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--ui-good);
  color: #fff;
}
.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.25s;
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
}
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
.callout {
  margin: 8px 0 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--ui-field);
  border-inline-start: 4px solid var(--ui-warn);
  font-size: 14px;
  line-height: 1.4;
}
.final {
  margin: 18px 0;
  display: grid;
  gap: 10px;
  justify-items: center;
}
.final figcaption {
  font-weight: 700;
  text-align: center;
}
.final img {
  width: min(100%, 260px);
  height: auto;
  border-radius: 28px;
  box-shadow: 0 6px 24px rgb(0 0 0 / 0.18);
}
.hint {
  margin: 12px 2px 0;
  font-size: 13px;
  line-height: 1.4;
  opacity: 0.8;
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
