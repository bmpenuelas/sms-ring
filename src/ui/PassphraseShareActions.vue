<script setup lang="ts">
// Both phrase editors intentionally share the same buttons, feedback and actions.
import { onUnmounted, ref } from 'vue'

import { t } from '../i18n'
import { useRingApp } from '../state/app'
import Icon from './Icon.vue'

const { actions } = useRingApp()
const copied = ref(false)
const shared = ref('')
let copyTimer: ReturnType<typeof setTimeout> | undefined
let shareTimer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  copied.value = await actions.copyPassphrase()
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => (copied.value = false), 1600)
}

async function share() {
  shared.value = await actions.sharePassphrase()
  clearTimeout(shareTimer)
  shareTimer = setTimeout(() => (shared.value = ''), 1600)
}

onUnmounted(() => {
  clearTimeout(copyTimer)
  clearTimeout(shareTimer)
})
</script>

<template>
  <button class="ui-btn secondary grow" @click="copy">
    <Icon :name="copied ? 'check' : 'copy'" /> {{ copied ? t.common.copied : t.common.copy }}
  </button>
  <button class="ui-btn secondary grow" @click="share">
    <Icon :name="shared === 'copied' ? 'check' : 'share'" /> {{ shared === 'copied' ? t.common.copied : t.common.share }}
  </button>
</template>

<style scoped>
.grow { flex: 1; }
</style>
