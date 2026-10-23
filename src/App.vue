<script setup lang="ts">
import { onMounted } from 'vue'

import { useRingApp } from './state/app'
import HomePage from './ui/home/HomePage.vue'
import RingingOverlay from './ui/RingingOverlay.vue'
import SheetHost from './ui/SheetHost.vue'

const { state, actions } = useRingApp()
onMounted(() => {
  void actions.init()
})
</script>

<template>
  <main class="app">
    <Transition name="fade" appear>
      <HomePage v-if="state.loaded" />
    </Transition>
  </main>
  <SheetHost />
  <RingingOverlay />
</template>

<style scoped>
.app {
  min-height: 100dvh;
}
.fade-enter-active {
  transition: opacity 0.25s;
}
.fade-enter-from {
  opacity: 0;
}
</style>
