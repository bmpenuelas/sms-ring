<script setup lang="ts">
import { formatRelative, t } from '../../i18n'
import { useRingApp } from '../../state/app'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'

defineEmits<{ close: [] }>()
const { state, actions } = useRingApp()
</script>

<template>
  <BottomSheet :title="t.history.title" @close="$emit('close')">
    <p v-if="!state.history.length" class="empty ui-muted">
      <Icon name="history" :size="28" />
      {{ t.history.empty }}
    </p>
    <ol v-else class="list">
      <li v-for="(r, i) in state.history" :key="r.at" :style="{ '--d': `${i * 40}ms` }">
        <span class="dot" :class="r.reason"><Icon :name="r.reason === 'test' ? 'flask' : r.reason === 'app' ? 'chat' : 'message'" :size="16" /></span>
        <div class="txt">
          <strong>{{ t.history.reasons[r.reason] }}</strong>
          <span v-if="r.sender" class="ui-muted"> {{ t.history.from(r.sender) }}</span>
        </div>
        <time class="ui-muted">{{ formatRelative(r.at) }}</time>
      </li>
    </ol>
    <p class="note ui-muted"><Icon name="lock" :size="14" /> {{ t.privacy.line }}</p>
    <template v-if="state.history.length" #footer>
      <button class="ui-btn secondary block" @click="actions.clearHistory()">{{ t.history.clear }}</button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.empty {
  display: grid;
  justify-items: center;
  gap: 10px;
  text-align: center;
  padding: 24px 12px;
  line-height: 1.45;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--ui-line);
  animation: rise 0.4s var(--ease-out) both;
  animation-delay: var(--d);
}
@keyframes rise {
  from { opacity: 0; transform: translateY(6px); }
}
.dot {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--ui-accent);
  color: var(--ui-accent-ink);
}
.dot.test {
  background: var(--ui-field);
  color: var(--ui-ink);
}
.txt {
  flex: 1;
  font-size: 15px;
}
time {
  font-size: 13px;
}
.note {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  margin-top: 16px;
}
</style>
