<script setup lang="ts">
// "Anyone" by default; add a number to restrict, then add more or remove.
import { nextTick, ref } from 'vue'

import { t } from '../i18n'
import { MAX_SENDERS, useRingApp } from '../state/app'
import Icon from './Icon.vue'

const { state, actions, platform } = useRingApp()
const list = ref<HTMLElement>()

async function add() {
  actions.addSender()
  await nextTick()
  const inputs = list.value?.querySelectorAll('input')
  inputs?.[inputs.length - 1]?.focus()
}
</script>

<template>
  <div ref="list" class="senders">
    <TransitionGroup tag="ul" name="row" class="list">
      <li v-if="state.config.senders.length === 0" key="anyone" class="anyone">
        <span class="globe"><Icon name="users" /></span>
        <span>{{ t.senders.everyone }}</span>
      </li>
      <li v-for="(s, i) in state.config.senders" :key="`s${i}`" class="row">
        <span class="num">{{ i + 1 }}</span>
        <input
          class="ui-field"
          type="tel"
          inputmode="tel"
          autocomplete="off"
          :placeholder="t.senders.placeholder"
          :value="s"
          @input="actions.updateSender(i, ($event.target as HTMLInputElement).value)"
        />
        <button class="rm press" :aria-label="t.senders.removeLabel(s || String(i + 1))" @click="actions.removeSender(i)">
          <Icon name="minus" :size="18" />
        </button>
      </li>
    </TransitionGroup>

    <button
      v-if="state.config.senders.length < MAX_SENDERS"
      class="ui-btn ghost block add"
      @click="add"
    >
      <Icon name="plus" /> {{ state.config.senders.length ? t.senders.addAnother : t.senders.add }}
    </button>
    <p class="hint ui-muted">
      {{ t.senders.hint }} {{ t.senders.limit(MAX_SENDERS) }}
      <template v-if="platform === 'ios'"><br />{{ t.senders.iosHint }}</template>
    </p>
  </div>
</template>

<style scoped>
.list {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  display: grid;
  gap: 8px;
}
.anyone {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--ui-field);
  font-weight: 600;
}
.globe {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--ui-accent);
  color: var(--ui-accent-ink);
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.num {
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  background: var(--ui-ink);
  color: var(--ui-bg);
}
.row input {
  direction: ltr;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.03em;
}
.rm {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--ui-field);
}
.hint {
  font-size: 13px;
  line-height: 1.4;
  margin: 12px 0 0;
}
.row-enter-from,
.row-leave-to {
  opacity: 0;
  transform: translateX(-16px) scale(0.96);
}
.row-enter-active,
.row-leave-active {
  transition: all 0.3s var(--ease-out);
}
.row-leave-active {
  position: absolute;
  width: 100%;
}
</style>
