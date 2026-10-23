<script setup lang="ts">
// Full-screen takeover while the phone rings: one huge, unmissable Stop.
import { computed } from 'vue'

import { useView } from './useView'
import Icon from './Icon.vue'

const { state, actions, t, remaining, ringProgress } = useView()
const subtitle = computed(() =>
  state.ring.reason === 'test' ? t.value.ringing.test : state.ring.sender ? t.value.ringing.from(state.ring.sender) : '',
)
</script>

<template>
  <Transition name="ring">
    <div v-if="state.ring.ringing" class="overlay" role="alertdialog" :aria-label="t.ringing.title">
      <p class="title">{{ t.ringing.title }}</p>
      <p class="sub">{{ subtitle }}</p>
      <button class="stop" :style="{ '--p': ringProgress }" @click="actions.stopRing()">
        <span v-for="i in 3" :key="i" class="wave" :style="{ animationDelay: `${i * 0.5}s` }" />
        <svg class="timer" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="47" pathLength="1" />
        </svg>
        <span class="face">
          <Icon name="bell" :size="44" class="bell" />
          <strong>{{ t.ringing.stop }}</strong>
          <span class="time">{{ remaining }}</span>
        </span>
      </button>
      <p class="privacy"><Icon name="shield-check" :size="14" /> {{ t.privacy.line }}</p>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  padding: calc(var(--safe-top) + 24px) 24px calc(var(--safe-bottom) + 24px);
  background: radial-gradient(circle at 50% 55%, color-mix(in oklab, var(--ui-accent) 85%, #000) 0%, #120a18 75%);
  color: #fff;
  text-align: center;
}
.title {
  margin: 0;
  font: 800 30px/1.1 var(--ui-font-display);
}
.sub {
  margin: 0 0 28px;
  opacity: 0.75;
  min-height: 1.2em;
}
.stop {
  position: relative;
  width: min(68vw, 280px);
  aspect-ratio: 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--ui-accent);
}
.face {
  position: relative;
  z-index: 1;
  width: 86%;
  height: 86%;
  border-radius: 50%;
  background: #fff;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 4px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s var(--ease-spring);
}
.stop:active .face {
  transform: scale(0.94);
}
.face strong {
  color: #1a1026;
  font-size: 22px;
}
.time {
  font: 600 15px/1 ui-monospace, monospace;
  color: #1a1026;
  opacity: 0.6;
}
.bell {
  animation: ring 0.32s ease-in-out infinite alternate;
  transform-origin: 50% 10%;
}
@keyframes ring {
  from { transform: rotate(-16deg); }
  to { transform: rotate(16deg); }
}
.wave {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.7);
  animation: wave 1.5s var(--ease-out) infinite;
}
@keyframes wave {
  from { transform: scale(0.85); opacity: 1; }
  to { transform: scale(1.6); opacity: 0; }
}
.timer {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}
.timer circle {
  fill: none;
  stroke: #fff;
  stroke-width: 3;
  stroke-dasharray: 1;
  stroke-dashoffset: calc(1 - var(--p));
  transition: stroke-dashoffset 0.25s linear;
}
.privacy {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 32px;
  font-size: 13px;
  opacity: 0.7;
}
.ring-enter-active {
  transition: opacity 0.3s, transform 0.5s var(--ease-out);
}
.ring-leave-active {
  transition: opacity 0.25s;
}
.ring-enter-from {
  opacity: 0;
  transform: scale(1.06);
}
.ring-leave-to {
  opacity: 0;
}
</style>
