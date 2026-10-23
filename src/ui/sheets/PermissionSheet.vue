<script setup lang="ts">
// Explain first, ask second. The system dialog (or settings page) opens only
// after the user taps Allow here.
import type { CapabilityName } from 'capacitor-remote-ring'
import { computed, ref } from 'vue'

import { t } from '../../i18n'
import { useRingApp } from '../../state/app'
import { finishPermission, setupProgress } from '../../state/sheets'
import BottomSheet from '../BottomSheet.vue'
import CapabilityArt from '../CapabilityArt.vue'
import Icon from '../Icon.vue'

const props = defineProps<{ capability: CapabilityName }>()
const { state, actions, platform } = useRingApp()

const copy = computed(() => t.value.permissions.items[props.capability])
const importance = computed(() => state.checklist.find((c) => c.name === props.capability)?.importance ?? 'optional')
const blocked = computed(() => state.capabilities[props.capability] === 'blocked')
const viaSettings = computed(() => blocked.value || (platform !== 'ios' && ['fullScreen', 'dnd', 'unusedApps', 'autostart', 'notificationAccess'].includes(props.capability)))
const busy = ref(false)
const granted = ref(false)

async function allow() {
  busy.value = true
  try {
    const ok = await actions.grantFromSheet(props.capability)
    if (ok) {
      granted.value = true
      setTimeout(() => finishPermission(true), 650)
    } else {
      finishPermission(false)
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BottomSheet :title="copy.title" :eyebrow="setupProgress ? t.permissions.step(setupProgress.step, setupProgress.total) : t.permissions[importance]" @close="finishPermission(false)">
    <CapabilityArt :name="capability" :granted="granted" />

    <h3 class="h">{{ t.permissions.why }}</h3>
    <p class="why">{{ copy.why }}</p>

    <div class="safe">
      <h3 class="h"><Icon name="shield-check" :size="18" /> {{ t.permissions.safe }}</h3>
      <ul>
        <li v-for="line in copy.safe" :key="line"><Icon name="check" :size="16" /> {{ line }}</li>
        <li><Icon name="wifi-off" :size="16" /> {{ t.privacy.line }}</li>
      </ul>
    </div>

    <p v-if="capability === 'sms' && platform === 'android' && !blocked" class="note">{{ t.permissions.smsDialogNote }}</p>

    <p class="next ui-muted">
      {{ blocked ? t.permissions.blocked : viaSettings ? t.permissions.settingsNext : t.permissions.systemNext }}
    </p>

    <template #footer>
      <button class="ui-btn secondary" @click="finishPermission(false)">{{ t.common.notNow }}</button>
      <button class="ui-btn grow" :class="{ ok: granted }" :disabled="busy" @click="allow">
        <Icon :name="granted ? 'check' : blocked ? 'settings' : 'shield-check'" />
        {{ granted ? t.permissions.allowed : blocked ? t.common.openSettings : t.permissions.allow }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.h {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin: 18px 0 6px;
  color: var(--ui-muted);
}
.why {
  margin: 0;
  font-size: 17px;
  line-height: 1.45;
}
.safe {
  margin-top: 16px;
  padding: 4px 16px 14px;
  border-radius: 18px;
  background: color-mix(in oklab, var(--ui-good) 12%, transparent);
}
.safe .h {
  color: var(--ui-good);
}
.safe ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
  font-size: 14px;
  line-height: 1.4;
}
.safe li {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.safe li .icon {
  color: var(--ui-good);
  margin-top: 1px;
}
.note {
  margin: 14px 0 0;
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--ui-field);
  font-size: 13px;
  line-height: 1.4;
}
.next {
  font-size: 13px;
  text-align: center;
  margin: 16px 0 0;
}
.grow {
  flex: 1;
}
.ok {
  background: var(--ui-good);
  animation: pop 0.45s var(--ease-spring);
}
@keyframes pop {
  50% { transform: scale(1.06); }
}
</style>
