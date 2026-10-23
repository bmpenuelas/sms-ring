<script setup lang="ts">
// Shown when the "can't ring" warning led here and the list was closed with
// something still missing. Each item can be tapped to allow it right away.
import { computed, watch } from 'vue'

import { t } from '../../i18n'
import { useRingApp } from '../../state/app'
import { closeSheet } from '../../state/sheets'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'
import type { IconName } from '../icons'

const { state, actions } = useRingApp()

const ICON: Record<string, IconName> = {
  sms: 'message',
  unusedApps: 'clock',
  notificationAccess: 'chat',
}

// Fixed when the popup opens, so an item stays visible (turning green) once allowed.
const names = [...state.healthMissing]
const items = computed(() => names.map((name) => ({ name, granted: state.capabilities[name] === 'granted' })))

watch(
  () => items.value.every((i) => i.granted),
  (all) => {
    if (all) setTimeout(closeSheet, 700)
  },
)

async function ignore() {
  await actions.ignoreHealth()
  closeSheet()
}
</script>

<template>
  <BottomSheet :title="t.permissions.alert.title" tone="accent" @close="closeSheet()">
    <p class="intro ui-muted">{{ t.permissions.alert.intro }}</p>
    <ul class="items">
      <li v-for="i in items" :key="i.name">
        <button class="item press" :class="{ ok: i.granted }" :disabled="i.granted" @click="actions.askCapability(i.name)">
          <span class="ico"><Icon :name="i.granted ? 'check' : ICON[i.name]" /></span>
          <span class="txt">
            <strong>{{ t.permissions.items[i.name].title }}</strong>
            <small>{{ t.permissions.alert.effects[i.name as 'sms' | 'unusedApps' | 'notificationAccess'] }}</small>
          </span>
          <span class="tag">{{ i.granted ? t.permissions.allowed : t.permissions.allow }}</span>
        </button>
      </li>
    </ul>

    <template #footer>
      <button class="ui-btn danger grow" @click="ignore">{{ t.permissions.alert.never }}</button>
      <button class="ui-btn secondary grow" @click="closeSheet()">{{ t.permissions.alert.later }}</button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.grow {
  flex: 1;
  padding-inline: 14px;
  font-size: 15px;
  line-height: 1.2;
  text-align: center;
}
.intro {
  margin: 0 0 14px;
  font-size: 14px;
  line-height: 1.45;
}
.items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 18px;
  background: var(--ui-field);
  text-align: start;
}
.item[disabled] {
  cursor: default;
}
.ico {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--ui-bg);
  color: var(--ui-danger);
}
.ok .ico {
  background: var(--ui-good);
  color: #fff;
}
.txt {
  flex: 1;
  display: grid;
  gap: 2px;
}
.txt small {
  color: var(--ui-muted);
  font-size: 13px;
  line-height: 1.4;
}
.tag {
  flex: none;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ui-accent);
}
.ok .tag {
  color: var(--ui-good);
}
</style>
