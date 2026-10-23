<script setup lang="ts">
// A small animated scene per capability: what it does, shown before asking.
import type { CapabilityName } from 'capacitor-remote-ring'

defineProps<{ name: CapabilityName; granted?: boolean }>()
</script>

<template>
  <svg class="art" :class="[name, { granted }]" viewBox="0 0 200 120" aria-hidden="true">
    <!-- the phone, common to every scene -->
    <rect x="80" y="14" width="44" height="88" rx="9" class="phone" />
    <rect x="95" y="20" width="14" height="3" rx="1.5" class="notch" />

    <template v-if="name === 'sms'">
      <g class="bubble">
        <path d="M20 40h44a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8H38l-10 8v-8h-8a8 8 0 0 1-8-8V48a8 8 0 0 1 8-8Z" class="paper" />
        <path d="M24 52h36M24 59h22" class="ink" />
      </g>
      <g class="lens">
        <circle cx="102" cy="58" r="11" class="glass" />
        <path d="M110 66l7 7" class="ink thick" />
      </g>
      <path d="M150 50l8 8 16-17" class="tick" />
      <g class="nothing">
        <path d="M136 88h40" class="ink dashed" />
        <path d="M168 82l8 6-8 6" class="ink" />
        <path d="M150 80l14 16M164 80l-14 16" class="stop-x" />
      </g>
    </template>

    <template v-else-if="name === 'notifications'">
      <rect x="86" y="34" width="32" height="18" rx="5" class="paper card" />
      <rect x="90" y="56" width="24" height="9" rx="4.5" class="accent card2" />
      <g class="bell-out">
        <path d="M152 58v-9a10 10 0 1 1 20 0v9l3 4h-26l3-4Z" class="paper" />
        <path d="M158 66a4 4 0 0 0 8 0" class="ink" />
      </g>
      <g class="waves">
        <path d="M144 40a18 18 0 0 0 0 26" class="ink" />
        <path d="M180 40a18 18 0 0 1 0 26" class="ink" />
      </g>
    </template>

    <template v-else-if="name === 'fullScreen'">
      <rect x="84" y="28" width="36" height="66" rx="5" class="accent screen" />
      <circle cx="102" cy="52" r="8" class="paper bell-dot" />
      <rect x="88" y="78" width="28" height="9" rx="4.5" class="paper" />
      <circle cx="93" cy="82.5" r="3.5" class="accent knob" />
      <g class="lock">
        <rect x="38" y="56" width="22" height="18" rx="4" class="paper" />
        <path d="M43 56v-5a6 6 0 0 1 12 0v5" class="ink" />
      </g>
    </template>

    <template v-else-if="name === 'battery'">
      <g class="moon">
        <path d="M48 36a20 20 0 1 0 22 26 16 16 0 0 1-22-26Z" class="paper" />
        <text x="62" y="34" class="zz">z</text>
        <text x="70" y="26" class="zz z2">z</text>
      </g>
      <path d="M106 36l-12 24h10l-6 22 16-28h-10l6-18Z" class="accent bolt" />
      <rect x="140" y="52" width="38" height="18" rx="4" class="paper" />
      <rect x="178" y="58" width="3" height="6" rx="1" class="paper" />
      <rect x="143" y="55" width="30" height="12" rx="2" class="good charge" />
    </template>

    <template v-else-if="name === 'unusedApps'">
      <!-- months go by unused, and the permissions stay -->
      <g class="calendar">
        <rect x="22" y="38" width="44" height="40" rx="6" class="paper" />
        <rect x="22" y="38" width="44" height="11" rx="5" class="accent" />
        <path d="M31 58h4M42 58h4M53 58h4M31 68h4M42 68h4" class="ink" />
      </g>
      <g class="keep">
        <path d="M102 34l14 6v11c0 10-6 17-14 20-8-3-14-10-14-20V40l14-6Z" class="accent" />
        <path d="M96 52l4.5 4.5 8-9" class="ink light" />
      </g>
      <path d="M150 50l8 8 16-17" class="tick" />
    </template>

    <template v-else-if="name === 'autostart'">
      <!-- the phone maker's own switch, turned on -->
      <g class="switch">
        <rect x="22" y="50" width="48" height="24" rx="12" class="paper" />
        <circle cx="34" cy="62" r="8" class="good knob" />
      </g>
      <path d="M96 44v28l22-14-22-14Z" class="accent play" />
      <path d="M150 50l8 8 16-17" class="tick" />
    </template>

    <template v-else-if="name === 'notificationAccess'">
      <!-- chat messages arrive, are checked on the phone, nothing leaves -->
      <g class="chats">
        <path d="M14 34h36a7 7 0 0 1 7 7v8a7 7 0 0 1-7 7H28l-8 6v-6h-6a7 7 0 0 1-7-7v-8a7 7 0 0 1 7-7Z" class="good" />
        <path d="M24 66h36a7 7 0 0 1 7 7v6a7 7 0 0 1-7 7H38l-8 6v-6h-6a7 7 0 0 1-7-7v-6a7 7 0 0 1 7-7Z" class="accent second" />
      </g>
      <g class="lens">
        <circle cx="102" cy="58" r="11" class="glass" />
        <path d="M110 66l7 7" class="ink thick" />
      </g>
      <g class="bell-out">
        <path d="M152 58v-9a10 10 0 1 1 20 0v9l3 4h-26l3-4Z" class="paper" />
        <path d="M158 66a4 4 0 0 0 8 0" class="ink" />
      </g>
    </template>

    <template v-else>
      <g class="moon">
        <path d="M48 36a20 20 0 1 0 22 26 16 16 0 0 1-22-26Z" class="paper" />
      </g>
      <g class="bell-in">
        <path d="M92 66v-9a10 10 0 1 1 20 0v9l3 4H89l3-4Z" class="accent" />
        <path d="M98 74a4 4 0 0 0 8 0" class="ink" />
      </g>
      <g class="waves">
        <path d="M84 48a18 18 0 0 0 0 26" class="ink" />
        <path d="M120 48a18 18 0 0 1 0 26" class="ink" />
      </g>
      <path d="M150 50l8 8 16-17" class="tick" />
    </template>
  </svg>
</template>

<style scoped>
.art {
  display: block;
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
  overflow: visible;
}
.phone {
  fill: var(--ui-ink);
}
.notch {
  fill: var(--ui-bg);
}
.paper {
  fill: var(--ui-bg);
  stroke: var(--ui-ink);
  stroke-width: 2;
}
.accent {
  fill: var(--ui-accent);
}
.good {
  fill: var(--ui-good);
}
.ink {
  fill: none;
  stroke: var(--ui-ink);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.thick {
  stroke: var(--ui-bg);
  stroke-width: 4;
}
.glass {
  fill: color-mix(in oklab, var(--ui-bg) 25%, transparent);
  stroke: var(--ui-bg);
  stroke-width: 3;
}
.dashed {
  stroke-dasharray: 4 4;
}
.tick {
  fill: none;
  stroke: var(--ui-good);
  stroke-width: 5;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 40;
  stroke-dashoffset: 40;
  animation: draw 3.2s var(--ease-out) infinite;
}
.stop-x {
  stroke: var(--ui-accent);
  stroke-width: 3;
  stroke-linecap: round;
}
@keyframes draw {
  40%, 85% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 0; opacity: 0; }
}

/* sms: a text flies in, is inspected, nothing flies out */
.sms .bubble {
  animation: fly-in 3.2s var(--ease-out) infinite;
}
@keyframes fly-in {
  0% { transform: translateX(-30px); opacity: 0; }
  20% { opacity: 1; }
  45%, 100% { transform: translateX(0); opacity: 1; }
}
.sms .lens {
  transform-origin: 102px 58px;
  animation: scan 3.2s ease-in-out infinite;
}
@keyframes scan {
  0%, 30% { transform: translate(0, 0); }
  45% { transform: translate(-4px, -6px); }
  60% { transform: translate(4px, 4px); }
  75%, 100% { transform: translate(0, 0); }
}

.notifications .card {
  animation: drop 3s var(--ease-spring) infinite;
}
.notifications .card2 {
  animation: drop 3s var(--ease-spring) infinite 0.15s;
}
@keyframes drop {
  0% { transform: translateY(-14px); opacity: 0; }
  25%, 85% { transform: translateY(0); opacity: 1; }
  100% { opacity: 0; }
}
.bell-out,
.bell-in {
  transform-origin: 50% 30%;
  transform-box: fill-box;
  animation: wiggle 1.4s ease-in-out infinite;
}
@keyframes wiggle {
  0%, 60%, 100% { transform: rotate(0); }
  10% { transform: rotate(14deg); }
  20% { transform: rotate(-12deg); }
  30% { transform: rotate(9deg); }
  40% { transform: rotate(-6deg); }
}
.waves path {
  animation: pulse 1.4s ease-out infinite;
}
@keyframes pulse {
  0% { opacity: 0; }
  30% { opacity: 1; }
  100% { opacity: 0; }
}

.fullScreen .knob {
  animation: slide 2.6s var(--ease-out) infinite;
}
@keyframes slide {
  0%, 20% { transform: translateX(0); }
  60%, 100% { transform: translateX(18px); }
}
.fullScreen .bell-dot {
  animation: beat 0.9s ease-in-out infinite alternate;
  transform-origin: 102px 52px;
}
@keyframes beat {
  to { transform: scale(1.18); }
}

.battery .zz {
  font: 700 12px/1 var(--ui-font);
  fill: var(--ui-ink);
  animation: float-z 2.4s ease-in-out infinite;
}
.battery .z2 {
  animation-delay: 0.8s;
}
@keyframes float-z {
  0% { opacity: 0; transform: translateY(6px); }
  50% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-6px); }
}
.battery .bolt {
  transform-origin: 104px 58px;
  animation: zap 2.4s var(--ease-spring) infinite;
}
@keyframes zap {
  0%, 55% { transform: scale(0.4); opacity: 0; }
  65% { transform: scale(1.15); opacity: 1; }
  80%, 100% { transform: scale(1); opacity: 1; }
}
.battery .charge {
  transform-origin: 143px 61px;
  animation: fill 2.4s var(--ease-out) infinite;
}
@keyframes fill {
  0% { transform: scaleX(0.15); }
  70%, 100% { transform: scaleX(1); }
}
/* unused apps: the calendar pages turn, the shield holds */
.unusedApps .calendar {
  transform-origin: 44px 58px;
  animation: flip 2.8s ease-in-out infinite;
}
@keyframes flip {
  0%, 30% { transform: rotateX(0); }
  45% { transform: scaleY(0.2); }
  60%, 100% { transform: rotateX(0); }
}
.unusedApps .keep {
  transform-origin: 102px 52px;
  animation: beat 1.4s ease-in-out infinite alternate;
}
.light {
  stroke: #fff;
  stroke-width: 3;
}

/* autostart: the switch slides on, the app may start */
.autostart .knob {
  animation: switch-on 2.6s var(--ease-out) infinite;
}
@keyframes switch-on {
  0%, 20% { transform: translateX(0); fill: var(--ui-line); }
  55%, 100% { transform: translateX(24px); fill: var(--ui-good); }
}
.autostart .play {
  transform-origin: 105px 58px;
  animation: zap 2.6s var(--ease-spring) infinite;
}

/* chat apps: bubbles fly in and get checked, the bell rings */
.notificationAccess .chats {
  animation: fly-in 3.2s var(--ease-out) infinite;
}
.notificationAccess .second {
  animation: drop 3.2s var(--ease-spring) infinite 0.3s;
}
.notificationAccess .lens {
  transform-origin: 102px 58px;
  animation: scan 3.2s ease-in-out infinite;
}

.granted .tick {
  animation: none;
  stroke-dashoffset: 0;
}
</style>
