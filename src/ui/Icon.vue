<script setup lang="ts">
import { ICONS, type IconName } from './icons'

const props = withDefaults(defineProps<{ name: IconName; size?: number | string; stroke?: number }>(), {
  size: 20,
  stroke: 1.8,
})


</script>

<template>
  <svg
    class="icon"
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="props.stroke"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="ICONS[props.name]" />
  </svg>
</template>

<style scoped>
.icon {
  flex: none;
  display: inline-block;
  vertical-align: middle;
}
</style>
