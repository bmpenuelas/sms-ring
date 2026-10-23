<script setup lang="ts">
import { t } from '../../i18n'
import BottomSheet from '../BottomSheet.vue'
import SendersEditor from '../SendersEditor.vue'

defineEmits<{ close: [] }>()
</script>

<template>
  <BottomSheet :title="t.senders.title" @close="$emit('close')">
    <SendersEditor />
    <template #footer>
      <button class="ui-btn block" @click="$emit('close')">{{ t.common.done }}</button>
    </template>
  </BottomSheet>
</template>
