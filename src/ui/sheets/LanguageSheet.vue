<script setup lang="ts">
import { computed, ref } from 'vue'

import { deviceLanguage, languageByCode, languagePreference, setLanguagePreference, t } from '../../i18n'
import { searchLanguages } from '../../i18n/languages'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'

defineEmits<{ close: [] }>()
const search = ref('')
const languages = computed(() => searchLanguages(search.value))
</script>

<template>
  <BottomSheet :title="t.language.title" @close="$emit('close')">
    <div class="search">
      <Icon name="search" :size="18" />
      <input
        v-model="search"
        class="ui-field"
        type="search"
        dir="auto"
        autocomplete="off"
        autocapitalize="off"
        :spellcheck="false"
        :placeholder="t.language.search"
        :aria-label="t.language.search"
      />
    </div>
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
      <li v-for="l in languages" :key="l.code">
        <button class="lang press" :class="{ on: languagePreference === l.code }" :lang="l.bcp47" @click="setLanguagePreference(l.code)">
          <span>
            <strong>{{ l.name }}</strong>
            <small v-if="l.englishName !== l.name" lang="en">{{ l.englishName }}</small>
          </span>
          <Icon v-if="languagePreference === l.code" name="check" />
        </button>
      </li>
    </ul>
    <p v-if="!languages.length" class="empty ui-muted" role="status">{{ t.language.noResults }}</p>
  </BottomSheet>
</template>

<style scoped>
.search {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  background: var(--ui-sheet);
  color: var(--ui-muted);
}
.search input {
  min-width: 0;
}
.empty {
  margin: 16px;
  font-size: 14px;
}
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
