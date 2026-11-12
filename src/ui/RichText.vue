<script setup lang="ts">
// Renders `**bold**` and `[[typed text]]` in translated copy as <strong> and a
// monospace chip, never as raw HTML.
import { computed } from 'vue'

import { richParts } from '../i18n'

const props = defineProps<{ text: string }>()
const parts = computed(() => richParts(props.text))
</script>

<template>
  <span><template v-for="(p, i) in parts" :key="i"><code v-if="p.chip" class="chip">{{ p.text }}</code><strong v-else-if="p.bold">{{ p.text }}</strong><template v-else>{{ p.text }}</template></template></span>
</template>

<style scoped>
/* Text to type into a field: monospace, boxed, so it reads as input and not as a label. */
.chip {
  display: inline-block;
  padding: 0.05em 0.5em;
  border-radius: 7px;
  background: var(--ui-field);
  box-shadow: inset 0 0 0 1px var(--ui-line);
  font: 700 0.92em/1.3 ui-monospace, 'SF Mono', 'JetBrains Mono Variable', Menlo, Consolas, monospace;
  unicode-bidi: isolate;
  white-space: nowrap;
}
</style>
