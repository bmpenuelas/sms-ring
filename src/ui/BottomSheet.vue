<script setup lang="ts">
// The frame every sheet shares: grab handle (drag down to close), title and
// a scrollable body. Theme tokens come from the active design.
import { ref } from 'vue'

import { t } from '../i18n'
import Icon from './Icon.vue'

defineProps<{ title?: string; eyebrow?: string; tone?: 'default' | 'accent' }>()
const emit = defineEmits<{ close: [] }>()

const dragY = ref(0)
let startY: number | null = null

function onDown(e: PointerEvent) {
  startY = e.clientY
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function onMove(e: PointerEvent) {
  if (startY !== null) dragY.value = Math.max(0, e.clientY - startY)
}
function onUp() {
  if (dragY.value > 90) emit('close')
  dragY.value = 0
  startY = null
}
</script>

<template>
  <section
    class="sheet"
    :class="tone"
    role="dialog"
    aria-modal="true"
    :aria-label="title"
    :style="{ transform: dragY ? `translateY(${dragY}px)` : undefined, transition: dragY ? 'none' : undefined }"
  >
    <div class="grab" @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp">
      <span class="handle" />
    </div>
    <header v-if="title" class="head">
      <div>
        <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
        <h2 class="title">{{ title }}</h2>
      </div>
      <button class="close press" :aria-label="t.common.close" @click="emit('close')">
        <Icon name="x" :size="18" />
      </button>
    </header>
    <div class="body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="foot">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.sheet {
  position: relative;
  width: 100%;
  max-width: 560px;
  max-height: calc(100dvh - var(--safe-top) - 24px);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  background: var(--ui-sheet);
  color: var(--ui-ink);
  border-radius: var(--ui-radius) var(--ui-radius) 0 0;
  box-shadow: 0 -12px 48px rgba(0, 0, 0, 0.18);
  padding-bottom: var(--safe-bottom);
  transition: transform 0.35s var(--ease-out);
}
.grab {
  display: grid;
  place-items: center;
  height: 22px;
  touch-action: none;
  cursor: grab;
}
.handle {
  width: 40px;
  height: 5px;
  border-radius: 3px;
  background: var(--ui-line);
}
.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 20px 10px;
}
.eyebrow {
  margin: 0 0 4px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ui-accent);
  font-weight: 700;
}
.title {
  margin: 0;
  font-family: var(--ui-font-display);
  font-size: 24px;
  line-height: 1.15;
  font-weight: 700;
}
.close {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--ui-field);
}
.body {
  overflow-y: auto;
  padding: 4px 20px 20px;
  -webkit-overflow-scrolling: touch;
}
.foot {
  padding: 12px 20px 16px;
  border-top: 1px solid var(--ui-line);
  display: flex;
  gap: 10px;
}
</style>
