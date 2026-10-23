<script setup lang="ts">
import { LANGUAGES, deviceLanguage, languageByCode, languagePreference, setLanguagePreference, t } from '../../i18n'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'

defineEmits<{ close: [] }>()
</script>

<template>
  <BottomSheet :title="t.language.title" @close="$emit('close')">
    <ul class="langs">
      <li>
        <button class="lang press" :class="{ on: languagePreference === 'auto' }" @click="setLanguagePreference('auto')">
          <span>
            <strong>{{ t.language.automatic }}</strong>
            <small>{{ t.language.automaticHint(languageByCode(deviceLanguage).name) }}</small>
          </span>
          <Icon v-if="languagePreference === 'auto'" name="check" />
        </button>
      </li>
      <li v-for="l in LANGUAGES" :key="l.code">
        <button class="lang press" :class="{ on: languagePreference === l.code }" :lang="l.bcp47" @click="setLanguagePreference(l.code)">
          <strong>{{ l.name }}</strong>
          <Icon v-if="languagePreference === l.code" name="check" />
        </button>
      </li>
    </ul>
  </BottomSheet>
</template>

<style scoped>
.langs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}
.lang {
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-radius: 14px;
  text-align: start;
}
.lang span {
  display: grid;
}
.lang small {
  color: var(--ui-muted);
}
.lang.on {
  background: var(--ui-field);
  color: var(--ui-accent);
}
</style>
