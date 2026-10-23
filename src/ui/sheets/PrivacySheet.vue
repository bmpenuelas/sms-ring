<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { SOURCE_URL } from '../../app.config'
import { t } from '../../i18n'
import { openExternal } from '../../services/device'
import { useRingApp } from '../../state/app'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'
import type { IconName } from '../icons'

defineEmits<{ close: [] }>()
const { state, actions, platform } = useRingApp()

const icons: IconName[] = ['wifi-off', 'message', 'user', 'code']
const checking = ref(true)

const permissions = computed(() =>
  state.platformInfo.declaredPermissions
    .map((p) => p.replace(/^android\.permission\./, '').replace(/^.*\./, ''))
    .filter((p) => !p.includes('DYNAMIC_RECEIVER'))
    .sort(),
)

onMounted(async () => {
  await actions.refreshPlatform()
  // A short, honest pause: the check really runs against the OS.
  setTimeout(() => (checking.value = false), 700)
})
</script>

<template>
  <BottomSheet :title="t.privacy.title" :eyebrow="t.privacy.badge" @close="$emit('close')">
    <div class="hero" aria-hidden="true">
      <svg viewBox="0 0 240 140">
        <defs>
          <radialGradient id="dome-fill" cx="50%" cy="100%" r="80%">
            <stop offset="0%" stop-color="var(--ui-good)" stop-opacity="0.25" />
            <stop offset="100%" stop-color="var(--ui-good)" stop-opacity="0" />
          </radialGradient>
        </defs>
        <path d="M30 130a90 90 0 0 1 180 0" class="dome" />
        <path d="M30 130a90 90 0 0 1 180 0Z" fill="url(#dome-fill)" />
        <g class="packets">
          <circle v-for="i in 6" :key="i" r="3.2" class="packet" :style="{ '--i': i }" cx="120" cy="104" />
        </g>
        <rect x="104" y="78" width="32" height="52" rx="7" class="phone" />
        <rect x="114" y="84" width="12" height="2.5" rx="1.25" class="speaker" />
        <path d="M0 130h240" class="ground" />
      </svg>
    </div>

    <p class="lead">{{ t.privacy.lead }}</p>

    <ul class="points">
      <li v-for="(p, i) in t.privacy.points" :key="p.title" :style="{ '--d': `${i * 70}ms` }">
        <span class="ico"><Icon :name="icons[i]" :size="20" /></span>
        <div>
          <strong>{{ p.title }}</strong>
          <p>{{ p.body }}</p>
        </div>
      </li>
    </ul>

    <section class="check" :class="{ done: !checking }">
      <header>
        <span class="pulse" />
        <strong>{{ t.privacy.liveCheck }}</strong>
        <span class="ui-muted">{{ state.platformInfo.osVersion }}</span>
      </header>
      <template v-if="platform === 'android'">
        <p class="verdict" :class="{ bad: state.platformInfo.hasInternetPermission }">
          <Icon :name="state.platformInfo.hasInternetPermission ? 'x' : 'check'" :size="18" />
          {{ state.platformInfo.hasInternetPermission ? t.privacy.androidUnexpected : t.privacy.androidVerified }}
        </p>
        <p class="ui-label">{{ t.privacy.permissionsList }}</p>
        <ul class="perms">
          <li v-for="p in permissions" :key="p">{{ p }}</li>
          <li class="absent">INTERNET</li>
        </ul>
      </template>
      <p v-else-if="platform === 'ios'" class="note">{{ t.privacy.iosNote }}</p>
      <p v-else class="note">{{ t.privacy.webNote }}</p>
    </section>

    <h3 class="sub">{{ t.privacy.verifyTitle }}</h3>
    <ol class="steps">
      <li v-for="s in t.privacy.verifySteps" :key="s">{{ s }}</li>
    </ol>

    <button class="source-link press" @click="openExternal(SOURCE_URL)">
      <Icon name="code" :size="16" />
      <span>{{ t.privacy.seeSource }}</span>
      <Icon name="chevron" :size="14" class="flip-rtl" />
    </button>
    <p class="url">{{ SOURCE_URL.replace('https://', '') }}</p>
    <p class="license ui-muted">{{ t.privacy.license }}</p>
  </BottomSheet>
</template>

<style scoped>
.hero svg {
  display: block;
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
}
.dome {
  fill: none;
  stroke: var(--ui-good);
  stroke-width: 2;
  stroke-dasharray: 5 6;
  animation: march 12s linear infinite;
}
@keyframes march {
  to { stroke-dashoffset: -220; }
}
.ground {
  stroke: var(--ui-line);
  stroke-width: 2;
}
.phone {
  fill: var(--ui-ink);
}
.speaker {
  fill: var(--ui-bg);
}
/* Data packets fly out, hit the dome and fall back home. */
.packet {
  fill: var(--ui-accent);
  animation: packet 3.2s var(--ease-out) infinite;
  animation-delay: calc(var(--i) * 0.5s);
  opacity: 0;
}
.packet:nth-child(1) { --dx: -62px; --dy: -42px; }
.packet:nth-child(2) { --dx: 58px; --dy: -50px; }
.packet:nth-child(3) { --dx: -18px; --dy: -78px; }
.packet:nth-child(4) { --dx: 30px; --dy: -74px; }
.packet:nth-child(5) { --dx: -78px; --dy: -14px; }
.packet:nth-child(6) { --dx: 80px; --dy: -18px; }
@keyframes packet {
  0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
  10% { opacity: 1; }
  45% { transform: translate(var(--dx), var(--dy)) scale(1); fill: var(--ui-accent); }
  50% { transform: translate(calc(var(--dx) * 0.96), calc(var(--dy) * 0.96)) scale(1.5); fill: var(--ui-good); }
  90% { opacity: 1; transform: translate(0, 0) scale(0.7); fill: var(--ui-good); }
  100% { opacity: 0; transform: translate(0, 0) scale(0.5); }
}
.lead {
  font-size: 17px;
  line-height: 1.45;
  margin: 8px 0 18px;
  font-weight: 600;
}
.points {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 14px;
}
.points li {
  display: flex;
  gap: 14px;
  animation: rise 0.5s var(--ease-out) both;
  animation-delay: var(--d);
}
@keyframes rise {
  from { opacity: 0; transform: translateY(10px); }
}
.points p {
  margin: 3px 0 0;
  color: var(--ui-muted);
  line-height: 1.4;
  font-size: 14px;
}
.ico {
  flex: none;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: color-mix(in oklab, var(--ui-good) 16%, transparent);
  color: var(--ui-good);
}
.check {
  margin: 22px 0 6px;
  padding: 16px;
  border-radius: 18px;
  background: var(--ui-field);
}
.check header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.check header .ui-muted {
  margin-inline-start: auto;
  font-size: 12px;
}
.pulse {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--ui-warn);
  animation: blink 0.7s ease-in-out infinite alternate;
}
.done .pulse {
  background: var(--ui-good);
  animation: none;
}
@keyframes blink {
  to { opacity: 0.25; }
}
.verdict {
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 700;
  color: var(--ui-good);
  margin: 12px 0 0;
  opacity: 0;
  transform: translateY(4px);
  transition: all 0.4s var(--ease-out);
}
.done .verdict {
  opacity: 1;
  transform: none;
}
.verdict.bad {
  color: #d33;
}
.perms {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.perms li {
  font: 600 11px/1 ui-monospace, 'JetBrains Mono Variable', monospace;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--ui-bg);
}
.perms .absent {
  text-decoration: line-through;
  color: var(--ui-muted);
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--ui-line);
}
.note {
  font-size: 14px;
  line-height: 1.45;
  margin: 10px 0 0;
  color: var(--ui-muted);
}
.sub {
  font-family: var(--ui-font-display);
  margin: 22px 0 8px;
  font-size: 18px;
}
.steps {
  margin: 0 0 20px;
  padding-inline-start: 22px;
  line-height: 1.5;
  font-size: 14px;
}
.steps li + li {
  margin-top: 6px;
}
.source-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0 auto;
  padding: 6px 4px;
  font-size: 14px;
  font-weight: 700;
  color: var(--ui-accent);
}
.source-link span {
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1.5px;
}
:global([dir='rtl'] .source-link .flip-rtl) {
  transform: scaleX(-1);
}
.url {
  text-align: center;
  color: var(--ui-muted);
  font: 600 12px/1.4 ui-monospace, monospace;
  margin: 2px 0 2px;
  user-select: text;
}
.license {
  text-align: center;
  font-size: 12px;
  margin: 0;
}
</style>
