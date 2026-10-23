<script setup lang="ts">
// The home screen: numbered steps down one line, each marked by a shape with a
// white dot. The status is a pulsing message under a radar sweep; the phrase is
// an incoming chat bubble of keycaps; senders are SIM cards; ring time is a
// filled timeline. Waiting for a message: the message travels straight from dot
// to dot, swelling as it lands and shrinking as it leaves, and the line fills in
// colour behind it. Awaiting setup: the line is dashed, the shapes are outlined
// and the message waits on the first dot.
import { computed, ref } from 'vue'

import BrandMark from './BrandMark.vue'
import Icon from '../Icon.vue'
import KeycapPhrase from '../KeycapPhrase.vue'
import PrivacySeal from '../PrivacySeal.vue'
import TimeBar from './TimeBar.vue'
import { editPassphrase } from '../../state/sheets'
import { shortSender, useView } from '../useView'
import { useWaypoints } from './waypoints'

const k = useView()
const { state, actions, t } = k

const host = ref<HTMLElement>()
const { vars } = useWaypoints(host)
const live = computed(() => state.status === 'ready' || state.status === 'ringing')
</script>

<template>
  <div ref="host" class="home" :class="[state.status, { live }]" :style="vars">
    <header class="top">
      <BrandMark />
      <PrivacySeal />
    </header>

    <!-- SMS refused: nothing can ring. Loud on purpose. -->
    <section v-if="state.smsDenied" class="sms-alert" role="alert">
      <span class="alert-icon" aria-hidden="true"><Icon name="warning" :size="22" :stroke="2.6" /></span>
      <span class="alert-text">
        <strong>{{ t.smsWarning.title }}</strong>
        <small>{{ t.smsWarning.body }}</small>
      </span>
      <button class="alert-action press" @click="actions.askCapability('sms')">{{ t.smsWarning.action }}</button>
    </section>

    <section
      class="hero"
      :class="{ tappable: state.improvable.length }"
      aria-live="polite"
      @click="state.improvable.length && actions.improveReliability()"
    >
      <span class="radar" aria-hidden="true">
        <span v-if="live" class="sweep" />
        <svg viewBox="0 0 96 96">
          <defs>
            <linearGradient id="home-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#2f5bff" />
              <stop offset="1" stop-color="#9b6bff" />
            </linearGradient>
          </defs>
          <circle cx="48" cy="48" r="46" class="ring" />
          <circle cx="48" cy="48" r="33" class="ring" />
          <template v-if="state.status === 'setup'">
            <rect x="28" y="28" width="40" height="40" rx="12" class="setup-box" />
            <path d="M48 39v10M48 56v1" class="bang" />
          </template>
          <template v-else-if="state.status === 'paused'">
            <circle cx="48" cy="48" r="20" class="paused-ring" />
            <path d="M43 40v16M53 40v16" class="paused-bars" />
          </template>
          <template v-else>
            <circle cx="48" cy="48" r="24" class="ping" />
            <g class="pulse">
              <circle cx="48" cy="48" r="24" fill="url(#home-grad)" />
              <path d="M37 39h22a3.5 3.5 0 0 1 3.5 3.5v10a3.5 3.5 0 0 1-3.5 3.5H47l-7.5 6v-6H37a3.5 3.5 0 0 1-3.5-3.5v-10A3.5 3.5 0 0 1 37 39Z" class="bubble-icon" />
            </g>
          </template>
        </svg>
      </span>
      <span class="hero-text">
        <h1>{{ k.statusTitle.value }}</h1>
        <p>{{ k.statusHint.value }}</p>
      </span>
      <button v-if="state.status === 'setup' || state.status === 'paused'" class="cta press" @click="k.primaryAction()">
        {{ state.status === 'setup' ? k.setupLabel.value : t.status.turnOn }}
      </button>
      <!-- ready, but some recommended access is missing: the whole card asks for it -->
      <button v-if="state.improvable.length" class="improve press" @click.stop="actions.improveReliability()">
        <Icon name="shield-check" :size="16" :stroke="2.4" />
        <span>{{ t.status.improve }}</span>
        <Icon name="chevron" :size="14" class="improve-chev" />
      </button>
    </section>

    <ol class="steps">
      <!-- phrase: an incoming chat bubble of keycaps -->
      <li class="step">
        <span class="mark circle" data-stop="0" aria-hidden="true"><i /></span>
        <div class="body">
          <span class="heading">
            <h2>{{ t.passphrase.title }}</h2>
            <span class="exact"><Icon name="message" :size="15" /> {{ t.passphrase.exactly }}</span>
          </span>
          <button class="chat press" :aria-label="k.words.value.join(' ')" @click="k.openSheet('passphrase')">
            <KeycapPhrase :words="k.words.value" />
          </button>
          <span class="tools">
            <button class="tool press" @click="actions.regenerate()"><Icon name="shuffle" :size="16" /><span>{{ t.passphrase.shuffle }}</span></button>
            <button class="tool press" @click="editPassphrase()"><Icon name="edit" :size="16" /><span>{{ t.common.edit }}</span></button>
            <button class="mini press" :aria-label="t.common.copy" @click="actions.copyPassphrase()"><Icon name="copy" :size="16" /></button>
            <button class="mini press" :aria-label="t.common.share" @click="actions.sharePassphrase()"><Icon name="share" :size="16" /></button>
          </span>
        </div>
      </li>

      <!-- senders as SIM cards -->
      <li class="step">
        <span class="mark square" data-stop="1" aria-hidden="true"><i /></span>
        <div class="body">
          <h2>{{ t.senders.title }}</h2>
          <span class="sims">
            <button v-if="!state.config.senders.length" class="sim any press" @click="k.openSheet('senders')">
              <i class="chip" />
              <b>∞</b>
              <small>{{ t.senders.everyoneShort }}</small>
            </button>
            <button v-for="(s, i) in state.config.senders" :key="i" class="sim press" :style="{ '--i': i }" @click="k.openSheet('senders')">
              <i class="chip" />
              <b>{{ shortSender(s) }}</b>
            </button>
            <button class="sim new press" :aria-label="t.senders.add" @click="k.openSheet('senders')">
              <Icon name="plus" :size="22" />
            </button>
          </span>
        </div>
      </li>

      <!-- ring time: a filled timeline -->
      <li class="step">
        <span class="mark diamond" data-stop="2" aria-hidden="true"><i /></span>
        <div class="body time">
          <h2>{{ t.duration.title }} <b>{{ k.formatDuration(state.config.durationSeconds) }}</b></h2>
          <TimeBar :fraction="k.durationFraction.value" :running="state.ring.ringing" />
          <span class="marks" role="radiogroup" :aria-label="t.duration.title">
            <button
              v-for="(s, i) in k.DURATION_STEPS"
              :key="s"
              role="radio"
              :aria-checked="i === k.durationIndex.value"
              class="notch press"
              :class="{ on: i === k.durationIndex.value }"
              @click="actions.setDuration(s)"
            >
              {{ k.formatDuration(s, 'narrow') }}
            </button>
          </span>
        </div>
      </li>

      <!-- shaped switches -->
      <li class="step">
        <span class="mark hex" data-stop="3" aria-hidden="true"><i /></span>
        <div class="body switches">
          <button class="switch press" role="switch" :aria-checked="state.config.vibrate" :class="{ on: state.config.vibrate }" @click="actions.setVibrate(!state.config.vibrate)">
            <span class="track" aria-hidden="true"><span class="knob sqk"><Icon name="vibrate" :size="18" /></span></span>
            <span class="sw-text">
              <b>{{ t.vibrate.title }}</b>
              <small>{{ state.config.vibrate ? t.vibrate.on : t.vibrate.off }}</small>
            </span>
          </button>
          <button
            v-if="k.dndAvailable.value"
            class="switch press"
            role="switch"
            :aria-checked="state.config.overrideDnd"
            :class="{ on: state.config.overrideDnd && !k.dndNeedsAccess.value, warn: k.dndNeedsAccess.value }"
            @click="k.tapDnd()"
          >
            <span class="track" aria-hidden="true"><span class="knob ck"><Icon name="moon" :size="18" /></span></span>
            <span class="sw-text">
              <b>{{ t.dnd.title }}</b>
              <small>{{ k.dndLabel.value }}</small>
            </span>
          </button>
        </div>
      </li>

      <!-- the bell -->
      <li class="step last">
        <span class="mark bell" data-stop="4" aria-hidden="true"><Icon :name="state.ring.ringing ? 'stop' : 'bell'" :size="22" :stroke="2.4" /></span>
        <div class="body end-row">
          <button class="test press" @click="k.toggleTest()">{{ state.ring.ringing ? t.test.stop : t.test.button }}</button>
          <button class="round press" :aria-label="t.tryIt.title" @click="k.openSheet('try')"><Icon name="flask" /></button>
          <button class="round press" :aria-label="t.common.settings" @click="k.openSheet('settings')"><Icon name="settings" /></button>
        </div>
      </li>
    </ol>

    <!-- the line between the dots, and the colour the message draws on it -->
    <span class="line" aria-hidden="true" />
    <span class="line-fill" aria-hidden="true" />
    <span class="msg" aria-hidden="true"><Icon name="message" :size="14" :stroke="2.6" /></span>
  </div>
</template>

<style scoped>
.home {
  --bg: #ffffff;
  --soft: #f1f2f6;
  --line: #dfe1e8;
  --ink: #14161f;
  --dim: #5f6475;
  --blue: #2f5bff;
  --coral: #ff5a4e;
  --yellow: #ffc21a;
  --green: #19c37d;
  --purple: #9b6bff;
  --card: #ffffff;
  --solid: #14161f;
  --on-light: #14161f;
  /* one trip of the message; the line fill uses the same keyframe stops */
  --trip: 8s;
  --ease: cubic-bezier(0.45, 0, 0.55, 1);
  position: relative;
  min-height: 100dvh;
  padding: calc(var(--safe-top) + 14px) 18px calc(var(--safe-bottom) + 24px);
  background: var(--bg);
  color: var(--ink);
  font-family: 'Inter Tight Variable', system-ui, sans-serif;
  overflow: hidden;
  --seal-bg: var(--soft);
  --seal-accent: #12a150;
}
:global([data-theme='dark'] .home) {
  --bg: #0f1016;
  --soft: #1c1e28;
  --line: #2e3142;
  --ink: #eceef5;
  --dim: #9ba1b5;
  --card: #2a2d3a;
  --solid: #3b4058;
  --seal-accent: #2fbf71;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* status: a light card with a pulsing message under a radar sweep */
/* SMS refused: a red-to-orange banner that can't be missed */
.sms-alert {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px 12px;
  align-items: center;
  margin-top: 16px;
  padding: 14px;
  border-radius: 20px;
  background: linear-gradient(135deg, #e5383b, #ff7a1a);
  color: #fff;
  box-shadow: 0 10px 24px rgba(229, 56, 59, 0.35);
  animation: alert-in 0.5s var(--ease-spring) both;
}
@keyframes alert-in {
  from { transform: translateY(-8px) scale(0.97); opacity: 0; }
}
.alert-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.22);
  animation: alert-pulse 1.6s ease-in-out infinite;
}
@keyframes alert-pulse {
  50% { transform: scale(1.1); background: rgba(255, 255, 255, 0.34); }
}
.alert-text {
  display: grid;
  gap: 3px;
}
.alert-text strong {
  font-family: 'Unbounded Variable', sans-serif;
  font-weight: 800;
  font-size: 15px;
  line-height: 1.2;
}
.alert-text small {
  font-size: 13px;
  line-height: 1.35;
  opacity: 0.95;
}
.alert-action {
  grid-column: 1 / -1;
  height: 46px;
  border-radius: 14px;
  background: #fff;
  color: #c81d25;
  font-weight: 800;
  font-size: 15px;
}
.hero {
  margin: 18px 0 24px;
  padding: 16px;
  border-radius: 24px;
  background: var(--soft);
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 14px 16px;
  align-items: center;
}
.radar {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--card);
}
.radar svg {
  position: relative;
  width: 96px;
  height: 96px;
  overflow: visible;
}
.ring {
  fill: none;
  stroke: var(--line);
  stroke-width: 1.5;
}
.setup .ring {
  stroke: var(--yellow);
  stroke-dasharray: 3 5;
}
/* the circular beam: a soft wedge turning around the message */
.sweep {
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 0 250deg, rgba(25, 195, 125, 0.08) 290deg, rgba(25, 195, 125, 0.5) 360deg);
  animation: sweep 3.2s linear infinite;
}
.sweep::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  width: 2px;
  height: 50%;
  margin-left: -1px;
  border-radius: 1px;
  background: var(--green);
}
@keyframes sweep {
  to { transform: rotate(360deg); }
}
/* one gentle ping each time the beam passes the top */
.ping {
  fill: none;
  stroke: var(--green);
  stroke-width: 2;
  transform-origin: 48px 48px;
  animation: ping 3.2s ease-out infinite;
}
@keyframes ping {
  0% { transform: scale(1); opacity: 0.8; }
  45%, 100% { transform: scale(1.9); opacity: 0; }
}
.pulse {
  transform-origin: 48px 48px;
  animation: pulse 3.2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  8% { transform: scale(1.1); }
  18% { transform: scale(0.97); }
  28% { transform: scale(1.03); }
  40% { transform: scale(1); }
}
.bubble-icon {
  fill: #fff;
}
.setup-box {
  fill: var(--yellow);
}
.bang {
  stroke: var(--on-light);
  stroke-width: 5;
  stroke-linecap: round;
}
.paused-ring {
  fill: none;
  stroke: var(--line);
  stroke-width: 6;
}
.paused-bars {
  stroke: var(--dim);
  stroke-width: 5;
  stroke-linecap: round;
}
.hero.tappable {
  cursor: pointer;
}
.improve {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: -2px;
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--card);
  color: var(--ink);
  font-size: 13.5px;
  font-weight: 700;
  text-align: start;
}
.improve :deep(svg:first-child) {
  color: var(--blue);
  flex: none;
}
.improve span {
  flex: 1;
}
.improve-chev {
  color: var(--dim);
}
:global([dir='rtl'] .improve-chev) {
  transform: scaleX(-1);
}
.hero-text {
  display: grid;
  gap: 4px;
}
.hero h1 {
  margin: 0;
  font-family: 'Unbounded Variable', sans-serif;
  font-weight: 800;
  font-size: 20px;
  line-height: 1.15;
  letter-spacing: -0.01em;
}
.hero p {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  color: var(--dim);
}
.cta {
  grid-column: 1 / -1;
  height: 54px;
  border-radius: 16px;
  background: var(--solid);
  color: var(--yellow);
  font-weight: 800;
  font-size: 15.5px;
  box-shadow: 0 4px 0 #000;
}
.paused .cta {
  color: var(--green);
}

/* steps */
.steps {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 26px;
}
.step {
  position: relative;
  display: grid;
  grid-template-columns: 46px 1fr;
  gap: 14px;
}
.mark {
  position: relative;
  z-index: 2;
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  color: #fff;
}
.mark > i {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
}
.mark.circle { border-radius: 50%; background: var(--blue); box-shadow: 0 0 0 5px var(--bg); }
.mark.square { border-radius: 12px; background: var(--coral); box-shadow: 0 0 0 5px var(--bg); }
.mark.diamond {
  width: 38px;
  height: 38px;
  margin: 4px;
  border-radius: 8px;
  background: var(--yellow);
  transform: rotate(45deg);
  box-shadow: 0 0 0 5px var(--bg);
}
.mark.hex {
  background: var(--green);
  clip-path: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%);
}
.mark.bell {
  border-radius: 50%;
  background: var(--yellow);
  color: var(--on-light);
  box-shadow: 0 0 0 5px var(--bg);
}
.setup .mark:not(.bell),
.paused .mark:not(.bell) {
  background: var(--bg);
  box-shadow: inset 0 0 0 3px var(--line), 0 0 0 5px var(--bg);
}
.setup .mark:not(.bell) > i,
.paused .mark:not(.bell) > i {
  background: var(--line);
}
.setup .mark.hex,
.paused .mark.hex {
  background: var(--line);
}
.setup .mark.hex > i,
.paused .mark.hex > i {
  background: var(--card);
}
/* each dot pops as the message lands on it (arrival times match the trip) */
.live .mark.circle > i { animation: land var(--trip) infinite 0.48s; }
.live .mark.square > i { animation: land var(--trip) infinite 1.92s; }
.live .mark.diamond > i { animation: land var(--trip) infinite 3.52s; }
.live .mark.hex > i { animation: land var(--trip) infinite 5.12s; }
.live .mark.bell { animation: ding var(--trip) infinite 6.56s; }
@keyframes land {
  0% { transform: scale(1); }
  3% { transform: scale(1.8); }
  8%, 100% { transform: scale(1); }
}
/* the bell stays yellow; it flashes brighter and swings when the message lands */
@keyframes ding {
  0% { transform: rotate(0) scale(1); background: var(--yellow); box-shadow: 0 0 0 5px var(--bg); }
  3% { transform: rotate(-16deg) scale(1.12); background: #ffe27a; box-shadow: 0 0 0 5px var(--bg), 0 0 0 12px rgba(255, 194, 26, 0.35); }
  7% { transform: rotate(14deg) scale(1.08); background: #ffe27a; box-shadow: 0 0 0 5px var(--bg), 0 0 0 18px rgba(255, 194, 26, 0); }
  11%, 100% { transform: rotate(0) scale(1); background: var(--yellow); box-shadow: 0 0 0 5px var(--bg); }
}
.ringing .mark.bell {
  animation: wobble 0.3s ease-in-out infinite alternate;
}
@keyframes wobble {
  from { transform: rotate(-15deg); }
  to { transform: rotate(15deg); }
}
.body {
  min-width: 0;
  display: grid;
  gap: 10px;
  align-content: start;
  padding-top: 10px;
}
h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--dim);
}
h2 b {
  margin-inline-start: 6px;
  color: var(--ink);
  letter-spacing: 0;
  text-transform: none;
  font-size: 15px;
}
/* the phrase as an incoming chat bubble of keycaps (ui/KeycapPhrase) */
.chat {
  justify-self: start;
  max-width: 100%;
  padding-inline-start: 7px;
  text-align: start;
}
.heading {
  display: grid;
  gap: 4px;
}
.exact {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 800;
  font-size: 14px;
}
/* one row: New words, Edit, copy, share */
.tools {
  display: flex;
  gap: 6px;
}
.tool {
  flex: 0 1 auto;
  min-width: 0;
  height: 38px;
  padding: 0 11px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--soft);
  font-weight: 700;
  font-size: 13.5px;
}
.tool :deep(svg) {
  flex: none;
}
.tool span {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.mini {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--soft);
}
/* senders as SIM cards */
.sims {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.sim {
  position: relative;
  width: 74px;
  height: 92px;
  padding: 10px 8px;
  display: grid;
  align-content: end;
  justify-items: start;
  gap: 2px;
  background: var(--coral);
  color: #fff;
  border-radius: 8px;
  clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%);
  text-align: start;
  animation: deal 0.45s var(--ease-spring) both;
  animation-delay: calc(var(--i, 0) * 70ms);
}
@keyframes deal {
  from { transform: translateY(12px) rotate(-6deg); opacity: 0; }
}
.sim .chip {
  position: absolute;
  top: 14px;
  inset-inline-start: 10px;
  width: 24px;
  height: 20px;
  border-radius: 4px;
  background: linear-gradient(135deg, #ffe08a, #e0a800);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
}
.sim b {
  font-size: 15px;
  font-weight: 800;
}
.sim small {
  font-size: 11.5px;
  font-weight: 700;
}
.sim.any {
  background: var(--solid);
}
.sim.any b {
  font-size: 22px;
  line-height: 1;
}
.sim.new {
  align-content: center;
  justify-items: center;
  background: var(--soft);
  color: var(--dim);
}
/* ring time: a filled timeline with the steps right under it */
.time {
  gap: 8px;
}
.time :deep(.ticks) {
  display: none;
}
.time :deep(.time-bar) {
  color: var(--yellow);
}
.time :deep(.track) {
  height: 18px;
  border-radius: 6px;
  background: var(--soft);
}
.time :deep(.span) {
  border-radius: 6px;
}
.marks {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
}
.notch {
  height: 32px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 800;
  color: var(--dim);
  background: var(--soft);
}
.notch.on {
  background: var(--solid);
  color: #fff;
}
/* shaped switches */
.switches {
  gap: 10px;
}
.switch {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 18px;
  background: var(--soft);
  text-align: start;
}
.track {
  position: relative;
  width: 72px;
  height: 40px;
  border-radius: 12px;
  background: var(--line);
  transition: background 0.3s;
}
.switch.on .track {
  background: var(--green);
}
.switch.warn .track {
  background: var(--yellow);
}
.knob {
  position: absolute;
  top: 4px;
  inset-inline-start: 4px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  background: #fff;
  color: var(--dim);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.15);
  transition: transform 0.4s var(--ease-spring), color 0.3s;
}
.knob.sqk {
  border-radius: 8px;
}
.knob.ck {
  border-radius: 50%;
}
/* optical centring of the glyphs inside the knobs */
.sqk :deep(svg) {
  translate: 0 -1.5px;
}
.ck :deep(svg) {
  translate: 1.5px 0;
}
.switch.on .knob {
  transform: translateX(32px);
  color: var(--on-light);
}
.switch.on .knob:dir(rtl) {
  transform: translateX(-32px);
}
.switch.on .sqk :deep(svg) {
  animation: buzz 0.18s linear infinite;
}
@keyframes buzz {
  50% { transform: translateX(1.5px); }
}
.sw-text {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.sw-text b {
  font-size: 15px;
  font-weight: 800;
  line-height: 1.2;
}
.sw-text small {
  font-size: 13px;
  font-weight: 600;
  color: var(--dim);
}
.switch.warn small {
  color: #a87400;
  font-weight: 800;
}
.end-row {
  display: flex;
  gap: 8px;
  padding-top: 0;
}
.test {
  flex: 1;
  height: 52px;
  border-radius: 16px;
  background: var(--blue);
  color: #fff;
  font-family: 'Unbounded Variable', sans-serif;
  font-weight: 800;
  font-size: 14px;
  box-shadow: 0 4px 0 #1d3cc4;
}
.ringing .test {
  background: var(--coral);
  box-shadow: 0 4px 0 #c2392f;
}
.round {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: var(--soft);
}

/* the line between the dots (measured), and the fill the message draws */
.line,
.line-fill {
  position: absolute;
  z-index: 1;
  left: var(--x0);
  top: var(--y0);
  width: 4px;
  margin-left: -2px;
  border-radius: 2px;
}
.line {
  height: calc(var(--y4) - var(--y0));
  background: var(--line);
}
.setup .line,
.paused .line {
  background: repeating-linear-gradient(to bottom, var(--line) 0 8px, transparent 8px 14px);
}
.line-fill {
  height: 0;
  background: linear-gradient(to bottom, var(--blue), var(--coral), var(--yellow), var(--green), var(--ink));
  background-size: 100% calc(var(--y4) - var(--y0));
  opacity: 0;
}
.live .line-fill {
  animation: draw var(--trip) var(--ease) infinite;
}
/* same stops as the message below, so the fill always ends under it */
@keyframes draw {
  0%, 12% { height: 0; opacity: 1; }
  24%, 32% { height: calc(var(--y1) - var(--y0)); }
  44%, 52% { height: calc(var(--y2) - var(--y0)); }
  64%, 72% { height: calc(var(--y3) - var(--y0)); }
  82%, 90% { height: calc(var(--y4) - var(--y0)); opacity: 1; }
  98%, 100% { height: calc(var(--y4) - var(--y0)); opacity: 0; }
}
/* the message: straight from dot to dot, swelling as it lands, shrinking as it leaves */
.msg {
  position: absolute;
  z-index: 5;
  left: 0;
  top: 0;
  width: 30px;
  height: 30px;
  margin: -15px 0 0 -15px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--solid);
  color: #fff;
  box-shadow: 0 4px 12px rgba(20, 22, 31, 0.3);
  opacity: 0;
  transform: translate(var(--x0, -100px), var(--y0, -100px));
}
.live .msg {
  animation: travel var(--trip) var(--ease) infinite;
}
@keyframes travel {
  0% { transform: translate(var(--x0), var(--y0)) scale(0); opacity: 0; }
  6% { transform: translate(var(--x0), var(--y0)) scale(1.3); opacity: 1; }
  9% { transform: translate(var(--x0), var(--y0)) scale(1); }
  12% { transform: translate(var(--x0), var(--y0)) scale(0.7); }
  24% { transform: translate(var(--x1), var(--y1)) scale(0.7); }
  26% { transform: translate(var(--x1), var(--y1)) scale(1.3); }
  29% { transform: translate(var(--x1), var(--y1)) scale(1); }
  32% { transform: translate(var(--x1), var(--y1)) scale(0.7); }
  44% { transform: translate(var(--x2), var(--y2)) scale(0.7); }
  46% { transform: translate(var(--x2), var(--y2)) scale(1.3); }
  49% { transform: translate(var(--x2), var(--y2)) scale(1); }
  52% { transform: translate(var(--x2), var(--y2)) scale(0.7); }
  64% { transform: translate(var(--x3), var(--y3)) scale(0.7); }
  66% { transform: translate(var(--x3), var(--y3)) scale(1.3); }
  69% { transform: translate(var(--x3), var(--y3)) scale(1); }
  72% { transform: translate(var(--x3), var(--y3)) scale(0.7); }
  82% { transform: translate(var(--x4), var(--y4)) scale(0.7); opacity: 1; }
  84% { transform: translate(var(--x4), var(--y4)) scale(1.4); opacity: 1; }
  90%, 100% { transform: translate(var(--x4), var(--y4)) scale(0); opacity: 0; }
}
.setup .msg {
  opacity: 1;
  background: var(--yellow);
  color: var(--on-light);
  animation: perch 1.6s ease-in-out infinite;
}
@keyframes perch {
  0%, 100% { transform: translate(var(--x0), calc(var(--y0) - 36px)); }
  50% { transform: translate(var(--x0), calc(var(--y0) - 42px)); }
}
</style>
