<script setup lang="ts">
// Ring time as a timeline from 0 to the longest ring time with the ring
// span as a solid block. A playhead sweeps the block while `running`.
import { computed } from 'vue'

const props = withDefaults(defineProps<{ fraction: number; running?: boolean; ticks?: number }>(), {
  running: false,
  ticks: 6,
})
const width = computed(() => `${Math.max(6, Math.min(1, props.fraction) * 100)}%`)
</script>

<template>
  <span class="time-bar" :class="{ running }" aria-hidden="true">
    <span class="track">
      <span class="span" :style="{ width }"><span class="head" /></span>
    </span>
    <span class="ticks">
      <i v-for="i in ticks + 1" :key="i" />
    </span>
  </span>
</template>

<style scoped>
.time-bar {
  display: grid;
  gap: 4px;
  width: 100%;
}
.track {
  position: relative;
  height: 14px;
  border-radius: 4px;
  background: color-mix(in srgb, currentColor 16%, transparent);
  overflow: hidden;
}
.span {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 4px;
  background: currentColor;
  transition: width 0.5s var(--ease-spring);
  overflow: hidden;
}
[dir='rtl'] .span {
  inset: 0 0 0 auto;
}
.head {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  background: color-mix(in srgb, currentColor 30%, white);
  opacity: 0;
}
.running .head {
  opacity: 1;
  animation: sweep 1.2s linear infinite;
}
@keyframes sweep {
  from { left: 0; }
  to { left: 100%; }
}
.ticks {
  display: flex;
  justify-content: space-between;
}
.ticks i {
  width: 2px;
  height: 6px;
  border-radius: 1px;
  background: currentColor;
  opacity: 0.35;
}
</style>
