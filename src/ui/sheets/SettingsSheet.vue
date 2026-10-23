<script setup lang="ts">
import { computed } from 'vue'

import { languageByCode, language, languagePreference, t } from '../../i18n'
import { useRingApp } from '../../state/app'
import { THEMES } from '../../state/theme'
import { openSheet } from '../../state/sheets'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'
import type { IconName } from '../icons'

defineEmits<{ close: [] }>()
const { state, actions, prefs, platform } = useRingApp()

type Row = { icon: IconName; label: string; value?: string; action: () => void }
const rows = computed<Row[]>(() => [
  { icon: 'message', label: t.value.passphrase.title, value: `${state.passphraseWords.length}`, action: () => openSheet('passphrase') },
  {
    icon: 'users',
    label: t.value.senders.title,
    value: state.config.senders.length ? t.value.senders.onlyThese(state.config.senders.length) : t.value.senders.everyoneShort,
    action: () => openSheet('senders'),
  },
  { icon: 'music', label: t.value.tones.title, value: t.value.tones.names[state.config.tone], action: () => openSheet('tones') },
  { icon: 'flask', label: t.value.tryIt.title, action: () => openSheet('try') },
  { icon: 'history', label: t.value.history.title, value: `${state.history.length}`, action: () => openSheet('history') },
  {
    icon: 'shield-check',
    label: platform === 'ios' ? t.value.ios.setupTitle : t.value.permissions.title,
    value: state.stepsLeft ? `${state.stepsLeft}` : t.value.permissions.allSet,
    action: () => openSheet('checklist'),
  },
  {
    icon: 'globe',
    label: t.value.language.title,
    value: languagePreference.value === 'auto' ? t.value.common.automatic : languageByCode(language.value).name,
    action: () => openSheet('language'),
  },
  { icon: 'lock', label: t.value.privacy.secureHow, action: () => openSheet('privacy') },
])
const dndAvailable = computed(() => state.capabilities.dnd !== 'unsupported')
const chatAppsAvailable = computed(() => state.capabilities.notificationAccess !== 'unsupported')
</script>

<template>
  <BottomSheet :title="t.common.settings" @close="$emit('close')">
    <ul class="rows">
      <li v-for="r in rows" :key="r.label">
        <button class="row press" @click="r.action">
          <span class="ico"><Icon :name="r.icon" /></span>
          <span class="label">{{ r.label }}</span>
          <span v-if="r.value" class="value">{{ r.value }}</span>
          <Icon name="chevron" :size="16" class="chev" />
        </button>
      </li>
      <li class="row stack">
        <span class="ico"><Icon name="volume" /></span>
        <label class="label" for="ring-volume">
          {{ t.volume.title }}
          <small>{{ t.volume.hint }}</small>
        </label>
        <span class="value">{{ state.config.volume }}%</span>
        <input
          id="ring-volume"
          class="slider"
          type="range"
          min="10"
          max="100"
          step="10"
          :value="state.config.volume"
          :style="{ '--fill': `${((state.config.volume - 10) / 90) * 100}%` }"
          @input="actions.setVolume(Number(($event.target as HTMLInputElement).value))"
        />
      </li>
      <li class="row stack">
        <span class="ico"><Icon name="sun" /></span>
        <span id="appearance-label" class="label">{{ t.appearance.title }}</span>
        <div class="segments" role="radiogroup" aria-labelledby="appearance-label">
          <button
            v-for="choice in THEMES"
            :key="choice"
            class="segment press"
            role="radio"
            :aria-checked="prefs.theme === choice"
            :class="{ on: prefs.theme === choice }"
            @click="actions.setTheme(choice)"
          >
            {{ t.appearance[choice] }}
          </button>
        </div>
      </li>
      <li v-if="dndAvailable">
        <label class="row toggle">
          <span class="ico"><Icon name="moon" /></span>
          <span class="label">
            {{ t.dnd.title }}
            <small>{{ t.dnd.hint }}</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            :checked="state.config.overrideDnd"
            @change="actions.setOverrideDnd(($event.target as HTMLInputElement).checked)"
          />
        </label>
      </li>
    </ul>
    <ul v-if="chatAppsAvailable" class="rows">
      <li>
        <label class="row toggle">
          <span class="ico"><Icon name="chat" /></span>
          <span class="label">
            {{ t.chatApps.title }}
            <small>{{ t.chatApps.hint }}</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            :checked="state.config.chatApps"
            @change="actions.setChatApps(($event.target as HTMLInputElement).checked)"
          />
        </label>
      </li>
    </ul>
    <p class="about ui-muted">{{ t.name }} · {{ t.about.madeOffline }}</p>
  </BottomSheet>
</template>

<style scoped>
.rows {
  list-style: none;
  margin: 0;
  padding: 0;
}
.row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 0;
  border-bottom: 1px solid var(--ui-line);
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
.label {
  flex: 1;
  display: grid;
  font-weight: 600;
}
.label small {
  font-weight: 400;
  font-size: 12px;
  color: var(--ui-muted);
}
.value {
  color: var(--ui-muted);
  font-size: 14px;
}
.chev {
  color: var(--ui-muted);
}
:global([dir='rtl'] .chev) {
  transform: scaleX(-1);
}
.toggle input {
  appearance: none;
  width: 50px;
  height: 30px;
  border-radius: 15px;
  background: var(--ui-line);
  position: relative;
  transition: background 0.25s;
  flex: none;
}
.toggle input::after {
  content: '';
  position: absolute;
  top: 3px;
  inset-inline-start: 3px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s var(--ease-spring);
}
.toggle input:checked {
  background: var(--ui-good);
}
.toggle input:checked::after {
  transform: translateX(20px);
}
:global([dir='rtl'] .toggle input:checked::after) {
  transform: translateX(-20px);
}
/* volume and appearance: label row, then the control on its own line */
.stack {
  flex-wrap: wrap;
  row-gap: 10px;
  padding-bottom: 14px;
}
.slider {
  flex-basis: 100%;
  appearance: none;
  height: 28px;
  margin: 0;
  background: transparent;
}
.slider::-webkit-slider-runnable-track {
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(var(--fill-dir, to right), var(--ui-accent) var(--fill), var(--ui-line) var(--fill));
}
.slider::-moz-range-track {
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(var(--fill-dir, to right), var(--ui-accent) var(--fill), var(--ui-line) var(--fill));
}
.slider::-webkit-slider-thumb {
  appearance: none;
  width: 26px;
  height: 26px;
  margin-top: -9px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}
.slider::-moz-range-thumb {
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}
:global([dir='rtl'] .slider) {
  --fill-dir: to left;
}
.segments {
  flex-basis: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 4px;
  border-radius: 14px;
  background: var(--ui-field);
}
.segment {
  min-height: 40px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  color: var(--ui-muted);
}
.segment.on {
  background: var(--ui-card);
  color: var(--ui-ink);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
.about {
  text-align: center;
  font-size: 12px;
  margin: 18px 0 0;
}
</style>
