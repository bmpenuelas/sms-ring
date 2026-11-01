<script setup lang="ts">
// The privacy promise, made visible: a bare padlock that clicks shut now and
// then. Tapping opens the full explanation.
import { t } from '../i18n'
import { openSheet } from '../state/sheets'
import { haptic } from '../services/device'

function open() {
  haptic.tap()
  openSheet('privacy')
}
</script>

<template>
  <button class="seal press" :aria-label="t.privacy.secure" @click="open">
    <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true">
      <path class="shackle" d="M11 15v-4a5 5 0 0 1 10 0v4" />
      <rect x="8" y="14" width="16" height="12" rx="3" class="body" />
      <circle cx="16" cy="19.5" r="1.8" class="hole" />
      <path d="M16 20.5v2.5" class="hole-line" />
    </svg>
  </button>
</template>

<style scoped>
.seal {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  color: var(--seal-accent, var(--ui-good));
}
.seal svg {
  overflow: visible;
}
/* the shackle lifts and clicks shut, now and then */
.shackle {
  fill: none;
  stroke: currentColor;
  stroke-width: 2.6;
  stroke-linecap: round;
  animation: click 4s var(--ease-out) infinite;
}
.body {
  fill: currentColor;
}
.hole,
.hole-line {
  fill: var(--bg, var(--ui-bg));
  stroke: var(--bg, var(--ui-bg));
  stroke-width: 1.6;
  stroke-linecap: round;
}
@keyframes click {
  0%, 70%, 100% { transform: translateY(0); }
  78% { transform: translateY(-3px); }
  86% { transform: translateY(0.6px); }
  90% { transform: translateY(0); }
}
</style>
