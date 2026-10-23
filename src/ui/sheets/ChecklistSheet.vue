<script setup lang="ts">
import { computed } from 'vue'

import { formatRelative, t } from '../../i18n'
import { useRingApp } from '../../state/app'
import { openSheet } from '../../state/sheets'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'
import type { IconName } from '../icons'

defineEmits<{ close: [] }>()
const { state, actions, platform } = useRingApp()

const ICON: Record<string, IconName> = {
  sms: 'message',
  notifications: 'bell',
  fullScreen: 'screen',
  battery: 'battery',
  dnd: 'moon',
  unusedApps: 'clock',
  autostart: 'play',
  notificationAccess: 'chat',
}
const done = computed(() => state.checklist.filter((c) => c.granted).length + (platform === 'ios' && !state.iosNeedsShortcut ? 1 : 0))
const total = computed(() => state.checklist.length + (platform === 'ios' ? 1 : 0))
</script>

<template>
  <BottomSheet :title="t.permissions.title" @close="$emit('close')">
    <p class="intro ui-muted">{{ t.permissions.intro }}</p>
    <div class="progress" :style="{ '--p': total ? done / total : 1 }" aria-hidden="true"><span /></div>

    <ul class="items">
      <li v-if="platform === 'ios'">
        <button class="item press" :class="{ ok: !state.iosNeedsShortcut }" @click="openSheet('ios-setup')">
          <span class="ico"><Icon :name="state.iosNeedsShortcut ? 'link' : 'check'" /></span>
          <span class="txt">
            <strong>{{ t.ios.setupTitle }}</strong>
            <small>
              {{
                state.platformInfo.lastAutomationRun
                  ? t.ios.verified(formatRelative(state.platformInfo.lastAutomationRun.at))
                  : t.ios.waiting
              }}
            </small>
          </span>
          <span class="tag">{{ t.permissions.required }}</span>
        </button>
      </li>
      <li v-for="c in state.checklist" :key="c.name">
        <button class="item press" :class="{ ok: c.granted }" :disabled="c.granted" @click="actions.askCapability(c.name)">
          <span class="ico"><Icon :name="c.granted ? 'check' : ICON[c.name]" /></span>
          <span class="txt">
            <strong>{{ t.permissions.items[c.name].title }}</strong>
            <small>{{ t.permissions.items[c.name].short }}</small>
          </span>
          <span class="tag" :class="c.importance">{{ c.granted ? t.permissions.allowed : t.permissions[c.importance] }}</span>
        </button>
      </li>
    </ul>
    <p class="foot ui-muted"><Icon name="shield-check" :size="14" /> {{ t.privacy.line }}</p>
  </BottomSheet>
</template>

<style scoped>
.intro {
  margin: 0 0 14px;
  font-size: 14px;
  line-height: 1.45;
}
.progress {
  height: 6px;
  border-radius: 3px;
  background: var(--ui-line);
  overflow: hidden;
  margin-bottom: 16px;
}
.progress span {
  display: block;
  height: 100%;
  width: calc(var(--p) * 100%);
  background: var(--ui-good);
  border-radius: inherit;
  transition: width 0.6s var(--ease-out);
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
}
.ok .ico {
  background: var(--ui-good);
  color: #fff;
  animation: pop 0.4s var(--ease-spring);
}
@keyframes pop {
  50% { transform: scale(1.15); }
}
.txt {
  flex: 1;
  display: grid;
}
.txt small {
  color: var(--ui-muted);
  font-size: 13px;
}
.tag {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ui-muted);
}
.tag.required {
  color: var(--ui-accent);
}
.ok .tag {
  color: var(--ui-good);
}
.foot {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  margin: 16px 0 0;
}
</style>
