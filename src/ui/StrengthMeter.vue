<script setup lang="ts">
import { computed } from 'vue'

import { formatNumber, t } from '../i18n'
import { useRingApp } from '../state/app'

const { state } = useRingApp()
const segments = computed(() => Math.max(1, Math.min(4, Math.ceil(state.strengthBits / 10))))
const combos = computed(() => formatNumber(2 ** state.strengthBits, { notation: 'compact', maximumFractionDigits: 1 }))
</script>

<template>
  <div class="meter" :class="state.strengthLevel">
    <div class="bars" aria-hidden="true">
      <span v-for="i in 4" :key="i" :class="{ on: i <= segments }" />
    </div>
    <span class="label">
      {{ t.passphrase.strength }} · <strong>{{ t.passphrase.strengthLevels[state.strengthLevel] }}</strong>
    </span>
    <span class="combos ui-muted">{{ t.passphrase.combinations(combos) }}</span>
  </div>
</template>

<style scoped>
.meter {
  display: grid;
  gap: 6px;
  font-size: 13px;
}
.bars {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
.bars span {
  height: 6px;
  border-radius: 3px;
  background: var(--ui-line);
  transition: background 0.4s, transform 0.4s var(--ease-spring);
}
.bars span.on {
  background: var(--meter, var(--ui-good));
  transform: scaleY(1.3);
}
.fair { --meter: var(--ui-warn); }
.combos {
  font-size: 12px;
}
</style>
