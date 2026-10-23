<script setup lang="ts">
// The passphrase as keycaps in an incoming chat bubble. Shared by designs
// that show the phrase this way and by the passphrase sheet, so both look
// the same. Colours: --kp-bubble, --kp-key, --kp-ink, --kp-edge.
import { computed } from 'vue'

const props = defineProps<{ words: readonly string[] }>()
const keyWords = computed(() => props.words.map((w) => Array.from(w)))
</script>

<template>
  <span class="keycap-phrase">
    <span v-for="(letters, wi) in keyWords" :key="`${wi}-${words[wi]}`" class="kw">
      <kbd v-for="(ch, ci) in letters" :key="ci" :style="{ '--i': wi * 4 + ci }">{{ ch }}</kbd>
    </span>
  </span>
</template>

<style scoped>
.keycap-phrase {
  --bubble: var(--kp-bubble, var(--ui-soft));
  --edge: var(--kp-edge, var(--ui-edge));
  position: relative;
  max-width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  padding: 14px;
  border-radius: 22px 22px 22px 6px;
  background: var(--bubble);
  text-align: start;
  animation: arrive 0.5s var(--ease-spring) both;
}
/* the bubble's tail */
.keycap-phrase::before {
  content: '';
  position: absolute;
  inset-inline-start: -7px;
  bottom: 0;
  width: 16px;
  height: 16px;
  background: var(--bubble);
  clip-path: polygon(100% 0, 100% 100%, 0 100%);
}
:global([dir='rtl'] .keycap-phrase) {
  border-radius: 22px 22px 6px 22px;
}
:global([dir='rtl'] .keycap-phrase::before) {
  clip-path: polygon(0 0, 100% 100%, 0 100%);
}
@keyframes arrive {
  from { transform: translateY(10px) scale(0.94); opacity: 0; }
}
.kw {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
kbd {
  min-width: 30px;
  height: 36px;
  padding: 0 4px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: var(--kp-key, var(--ui-card));
  color: var(--kp-ink, var(--ui-ink));
  box-shadow: inset 0 -3px 0 var(--edge), 0 1px 0 var(--edge);
  font-family: 'Unbounded Variable', sans-serif;
  font-weight: 800;
  font-size: 17px;
  text-transform: uppercase;
  animation: press 0.4s var(--ease-spring) both;
  animation-delay: calc(0.15s + var(--i) * 35ms);
}
@keyframes press {
  0% { transform: translateY(-6px); opacity: 0; }
  60% { transform: translateY(2px); box-shadow: inset 0 -1px 0 var(--edge); }
}
</style>
