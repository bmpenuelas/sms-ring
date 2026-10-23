<script setup lang="ts">
import { defineAsyncComponent, type Component } from 'vue'

import { closeSheet, topSheet, type SheetName } from '../state/sheets'
import PermissionSheet from './sheets/PermissionSheet.vue'

const SHEETS: Record<Exclude<SheetName, 'permission'>, Component> = {
  privacy: defineAsyncComponent(() => import('./sheets/PrivacySheet.vue')),
  checklist: defineAsyncComponent(() => import('./sheets/ChecklistSheet.vue')),
  'health-warning': defineAsyncComponent(() => import('./sheets/HealthWarningSheet.vue')),
  'ios-setup': defineAsyncComponent(() => import('./sheets/IosSetupSheet.vue')),
  passphrase: defineAsyncComponent(() => import('./sheets/PassphraseSheet.vue')),
  senders: defineAsyncComponent(() => import('./sheets/SendersSheet.vue')),
  try: defineAsyncComponent(() => import('./sheets/TrySheet.vue')),
  history: defineAsyncComponent(() => import('./sheets/HistorySheet.vue')),
  language: defineAsyncComponent(() => import('./sheets/LanguageSheet.vue')),
  settings: defineAsyncComponent(() => import('./sheets/SettingsSheet.vue')),
  tones: defineAsyncComponent(() => import('./sheets/ToneSheet.vue')),
}
</script>

<template>
  <Teleport to="body">
    <Transition name="backdrop">
      <div v-if="topSheet" class="backdrop" @click="closeSheet()" />
    </Transition>
    <Transition name="sheet" mode="out-in">
      <div v-if="topSheet" :key="topSheet.name + ('capability' in topSheet ? topSheet.capability : '')" class="dock">
        <PermissionSheet v-if="topSheet.name === 'permission'" :capability="topSheet.capability" />
        <component :is="SHEETS[topSheet.name]" v-else @close="closeSheet()" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: var(--ui-backdrop);
  backdrop-filter: blur(3px);
}
.dock {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  z-index: 41;
  display: flex;
  pointer-events: none;
}
.dock > :deep(*) {
  pointer-events: auto;
}
.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.3s;
}
.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}
.sheet-enter-active {
  transition: transform 0.45s var(--ease-out);
}
.sheet-leave-active {
  transition: transform 0.25s ease-in;
}
.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
}
</style>
