<script setup lang="ts">
// The privacy promise, made visible: a pill with a padlock that clicks shut now
// and then, "Private and Secure · See how we make it". Tapping opens the full
// explanation.
import { t } from '../i18n'
import { openSheet } from '../state/sheets'
import { haptic } from '../services/device'
import Icon from './Icon.vue'

function open() {
  haptic.tap()
  openSheet('privacy')
}
</script>

<template>
  <button class="seal press" :aria-label="t.privacy.title" @click="open">
    <span class="dome" aria-hidden="true">
      <svg viewBox="0 0 32 32" width="24" height="24">
        <path class="shackle" d="M11 15v-4a5 5 0 0 1 10 0v4" />
        <rect x="8" y="14" width="16" height="12" rx="3" class="body" />
        <circle cx="16" cy="19.5" r="1.8" class="hole" />
        <path d="M16 20.5v2.5" class="hole-line" />
      </svg>
    </span>
    <span class="text">
      <strong>{{ t.privacy.secure }}</strong>
      <span class="sub">{{ t.privacy.seeHow }} <Icon name="chevron" :size="11" class="flip-rtl" /></span>
    </span>
  </button>
</template>

<style scoped>
.seal {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px 5px 5px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--seal-bg, var(--ui-field)) 100%, transparent);
  color: var(--seal-ink, var(--ui-ink));
  box-shadow: inset 0 0 0 1px var(--ui-line);
  text-align: start;
  line-height: 1.1;
}
.dome {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--seal-accent, var(--ui-good));
  color: #fff;
}
.dome svg {
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
  fill: var(--seal-accent, var(--ui-good));
  stroke: var(--seal-accent, var(--ui-good));
  stroke-width: 1.6;
  stroke-linecap: round;
}
@keyframes click {
  0%, 70%, 100% { transform: translateY(0); }
  78% { transform: translateY(-3px); }
  86% { transform: translateY(0.6px); }
  90% { transform: translateY(0); }
}
.text strong {
  display: block;
  font-size: 13px;
}
.sub {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  opacity: 0.7;
}
:global([dir='rtl'] .flip-rtl) {
  transform: scaleX(-1);
}
</style>
