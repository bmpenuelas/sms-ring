<script setup lang="ts">
import { onBeforeUnmount } from 'vue'

import { t } from '../../i18n'
import { useRingApp } from '../../state/app'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'

defineEmits<{ close: [] }>()
const { state, actions } = useRingApp()

// Leaving the sheet silences any preview still playing.
onBeforeUnmount(actions.stopTonePreview)
</script>

<template>
  <BottomSheet :title="t.tones.title" @close="$emit('close')">
    <p class="hint ui-muted">{{ t.tones.hint }}</p>
    <ul class="tones">
      <li v-for="id in state.tones" :key="id">
        <button class="tone press" :class="{ on: state.config.tone === id }" @click="actions.setTone(id)">
          <span class="ico"><Icon :name="id === 'system' ? 'bell' : 'music'" /></span>
          <span class="name">
            <strong>{{ t.tones.names[id] }}</strong>
            <small v-if="id === 'system'">{{ t.tones.systemNote }}</small>
          </span>
          <Icon v-if="state.config.tone === id" name="check" />
        </button>
      </li>
    </ul>
  </BottomSheet>
</template>

<style scoped>
.hint {
  margin: 0 0 12px;
  font-size: 14px;
}
.tones {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}
.tone {
  width: 100%;
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px 8px 8px;
  border-radius: 14px;
  text-align: start;
}
.ico {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: var(--ui-field);
}
.name {
  flex: 1;
  display: grid;
}
.name small {
  font-size: 12px;
  color: var(--ui-muted);
}
.tone.on {
  background: var(--ui-field);
  color: var(--ui-accent);
}
.tone.on .ico {
  background: var(--ui-bg);
}
</style>
