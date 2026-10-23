<script setup lang="ts">
// Renders `**bold**` in translated copy as <strong>, never as raw HTML.
import { computed } from 'vue'

import { richParts } from '../i18n'

const props = defineProps<{ text: string }>()
const parts = computed(() => richParts(props.text))
</script>

<template>
  <span><template v-for="(p, i) in parts" :key="i"><strong v-if="p.bold">{{ p.text }}</strong><template v-else>{{ p.text }}</template></template></span>
</template>
