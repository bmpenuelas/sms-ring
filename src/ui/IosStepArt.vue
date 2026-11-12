<script setup lang="ts">
// Small, text-free sketches of the Shortcuts screens, one set per setup step.
// They only show *where* to tap (the pulsing dot); the step text names the labels,
// so nothing here needs translating. Mirrored in right-to-left languages, like iOS.
defineProps<{ step: 1 | 2 | 3 | 4 | 5 | 6 | 7 }>()
</script>

<template>
  <div class="art" aria-hidden="true">
    <!-- 1 · Automation tab → New Automation → Message -->
    <template v-if="step === 1">
      <svg class="frame" viewBox="0 0 100 120">
        <rect class="scr" width="100" height="120" rx="10" />
        <rect class="sk" x="10" y="14" width="46" height="9" rx="4.5" />
        <rect class="card" x="8" y="92" width="84" height="20" rx="10" />
        <rect class="ink" x="19" y="98" width="12" height="9" rx="2.5" />
        <rect class="pill-on" x="37" y="94" width="26" height="16" rx="8" />
        <circle class="ink" cx="50" cy="102" r="5" />
        <path class="tick-w" d="M47.6 102.2l1.8 1.8 3.2-3.6" />
        <g class="ink">
          <rect x="69" y="98" width="5" height="5" rx="1.2" /><rect x="76" y="98" width="5" height="5" rx="1.2" />
          <rect x="69" y="105" width="5" height="5" rx="1.2" /><rect x="76" y="105" width="5" height="5" rx="1.2" />
        </g>
        <g class="tap" transform="translate(50 102)"><circle class="halo" r="11" /><circle class="dot" r="3.5" /></g>
      </svg>

      <svg class="frame" viewBox="0 0 100 120">
        <rect class="scr" width="100" height="120" rx="10" />
        <path class="spark" d="M50 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" />
        <rect class="sk" x="30" y="56" width="40" height="6" rx="3" />
        <rect class="sk" x="22" y="67" width="56" height="5" rx="2.5" />
        <rect class="blue" x="18" y="80" width="64" height="18" rx="9" />
        <rect class="sk-w" x="32" y="86.5" width="36" height="5" rx="2.5" />
        <g class="tap" transform="translate(50 89)"><circle class="halo" r="11" /><circle class="dot" r="3.5" /></g>
      </svg>

      <svg class="frame" viewBox="0 0 100 120">
        <rect class="scr" width="100" height="120" rx="10" />
        <rect class="card" x="8" y="12" width="84" height="96" rx="10" />
        <template v-for="(c, i) in ['#ff9f0a', '#ff9f0a', '#0a84ff']" :key="i">
          <circle :cx="22" :cy="26 + i * 22" r="6" :fill="c" />
          <rect class="sk" x="34" :y="23.5 + i * 22" width="34" height="5" rx="2.5" />
          <path class="chev" :d="`M81 ${23 + i * 22}l3 3-3 3`" />
        </template>
        <rect class="row-hl" x="10" y="80" width="80" height="24" rx="8" />
        <path class="bubble" d="M16 90a6 5 0 0 1 12 0 6 5 0 0 1-3 4.3l.6 2.5-3.3-1.6a6 5 0 0 1-6.3-5.2Z" transform="translate(0 -1.5)" />
        <rect class="sk" x="34" y="89.5" width="34" height="5" rx="2.5" />
        <path class="chev" d="M81 89l3 3-3 3" />
        <g class="tap" transform="translate(70 92)"><circle class="halo" r="11" /><circle class="dot" r="3.5" /></g>
      </svg>
    </template>

    <!-- 2 · Message Contains → Run Immediately → Next -->
    <template v-else-if="step === 2">
      <svg class="frame" viewBox="0 0 100 120">
        <rect class="scr" width="100" height="120" rx="10" />
        <rect class="card" x="8" y="14" width="84" height="22" rx="8" />
        <rect class="sk" x="15" y="22.5" width="26" height="5" rx="2.5" />
        <rect class="sk-blue" x="58" y="22.5" width="27" height="5" rx="2.5" />
        <rect class="row-hl" x="8" y="44" width="84" height="22" rx="8" />
        <rect class="sk" x="15" y="52.5" width="34" height="5" rx="2.5" />
        <rect class="sk-blue" x="66" y="52.5" width="19" height="5" rx="2.5" />
        <rect class="card" x="8" y="76" width="84" height="38" rx="8" />
        <rect class="sk" x="15" y="86" width="40" height="5" rx="2.5" />
        <path class="tick-b" d="M77 85l3 3 6-6" />
        <path class="sep" d="M15 95h70" />
        <rect class="sk" x="15" y="102" width="28" height="5" rx="2.5" />
        <g class="tap" transform="translate(76 55)"><circle class="halo" r="11" /><circle class="dot" r="3.5" /></g>
      </svg>

      <svg class="frame" viewBox="0 0 100 120">
        <rect class="scr" width="100" height="120" rx="10" />
        <circle class="card" cx="17" cy="19" r="9" />
        <path class="chev-l" d="M18.5 15.5l-4 3.5 4 3.5" />
        <rect class="blue" x="62" y="10" width="30" height="18" rx="9" />
        <rect class="sk-w" x="70" y="16.5" width="14" height="5" rx="2.5" />
        <rect class="card" x="8" y="44" width="84" height="38" rx="8" />
        <rect class="sk" x="15" y="54" width="40" height="5" rx="2.5" />
        <path class="sep" d="M15 63h70" />
        <rect class="row-hl" x="8" y="64" width="84" height="18" rx="8" />
        <rect class="sk" x="15" y="70.5" width="28" height="5" rx="2.5" />
        <path class="tick-b" d="M77 69l3 3 6-6" />
        <g class="tap" transform="translate(77 73)"><circle class="halo" r="11" /><circle class="dot" r="3.5" /></g>
        <g class="tap t2" transform="translate(77 19)"><circle class="halo" r="11" /><circle class="dot" r="3.5" /></g>
      </svg>
    </template>

    <!-- 3 · Create New Shortcut → search → action → Message = Shortcut Input -->
    <template v-else-if="step === 3">
      <svg class="frame" viewBox="0 0 100 120">
        <rect class="scr" width="100" height="120" rx="10" />
        <rect class="card" x="6" y="30" width="88" height="84" rx="10" />
        <rect class="field" x="12" y="38" width="76" height="14" rx="7" />
        <circle class="mag" cx="21" cy="45" r="3" /><path class="mag" d="M23.3 47.3l2.4 2.4" />
        <rect class="sk" x="30" y="42.5" width="30" height="5" rx="2.5" />
        <rect class="row-hl" x="10" y="58" width="80" height="24" rx="8" />
        <rect class="app" x="14" y="62" width="16" height="16" rx="4" />
        <rect class="sk" x="36" y="67.5" width="40" height="5" rx="2.5" />
        <rect class="app dim" x="14" y="88" width="16" height="16" rx="4" />
        <rect class="sk" x="36" y="93.5" width="30" height="5" rx="2.5" />
        <g class="tap" transform="translate(66 70)"><circle class="halo" r="11" /><circle class="dot" r="3.5" /></g>
      </svg>

      <svg class="frame" viewBox="0 0 100 120">
        <rect class="scr" width="100" height="120" rx="10" />
        <rect class="card" x="8" y="26" width="84" height="46" rx="10" />
        <rect class="app" x="14" y="33" width="14" height="14" rx="4" />
        <rect class="sk" x="33" y="37" width="20" height="5" rx="2.5" />
        <rect class="pill-pale" x="57" y="33" width="29" height="14" rx="7" />
        <rect class="sk" x="14" y="55" width="52" height="5" rx="2.5" />
        <circle class="ring-blue" cx="78" cy="57.5" r="5" /><path class="chev-b" d="M77 55.5l2.2 2-2.2 2" />
        <rect class="hl-outline" x="55" y="31" width="33" height="18" rx="9" />
        <g class="tap" transform="translate(71 40)"><circle class="halo" r="11" /><circle class="dot" r="3.5" /></g>
        <rect class="card" x="8" y="80" width="84" height="26" rx="10" />
        <rect class="sk" x="15" y="90.5" width="24" height="5" rx="2.5" />
        <rect class="pill-blue" x="56" y="87" width="30" height="12" rx="6" />
      </svg>
    </template>

    <!-- 4 · search "If", add it: it already holds the Ring action -->
    <template v-else-if="step === 4">
      <svg class="frame" viewBox="0 0 100 120">
        <rect class="scr" width="100" height="120" rx="10" />
        <rect class="card" x="8" y="10" width="84" height="22" rx="8" />
        <rect class="app" x="14" y="15" width="12" height="12" rx="3.5" />
        <rect class="sk" x="32" y="19.5" width="14" height="5" rx="2.5" />
        <rect class="pill-blue" x="50" y="17" width="34" height="10" rx="5" />
        <rect class="card" x="6" y="40" width="88" height="74" rx="10" />
        <rect class="field" x="12" y="48" width="76" height="14" rx="7" />
        <circle class="mag" cx="21" cy="55" r="3" /><path class="mag" d="M23.3 57.3l2.4 2.4" />
        <rect class="sk" x="30" y="52.5" width="22" height="5" rx="2.5" />
        <rect class="row-hl" x="10" y="68" width="80" height="20" rx="8" />
        <g transform="translate(14 70) scale(1.333)"><rect class="gray" width="12" height="12" rx="3.5" /><path class="y" d="M6 10V6.2M6 6.2L3 3.2M6 6.2L9 3.2M3 5.4V3.2h2.2M9 5.4V3.2H6.8" /></g>
        <rect class="sk" x="36" y="76.5" width="12" height="5" rx="2.5" />
        <g class="dim"><g transform="translate(14 92) scale(1.333)"><rect class="gray" width="12" height="12" rx="3.5" /><path class="y" d="M6 10V6.2M6 6.2L3 3.2M6 6.2L9 3.2M3 5.4V3.2h2.2M9 5.4V3.2H6.8" /></g><rect class="sk" x="36" y="97.5" width="28" height="5" rx="2.5" /></g>
        <g class="tap" transform="translate(66 78)"><circle class="halo" r="11" /><circle class="dot" r="3.5" /></g>
      </svg>

      <svg class="frame" viewBox="0 0 100 120">
        <rect class="scr" width="100" height="120" rx="10" />
        <rect class="card" x="8" y="10" width="84" height="22" rx="8" />
        <rect class="app" x="14" y="15" width="12" height="12" rx="3.5" />
        <rect class="sk" x="32" y="19.5" width="14" height="5" rx="2.5" />
        <rect class="pill-blue" x="50" y="17" width="34" height="10" rx="5" />
        <rect class="card" x="8" y="40" width="84" height="28" rx="8" />
        <g transform="translate(13 46) scale(1.333)"><rect class="gray" width="12" height="12" rx="3.5" /><path class="y" d="M6 10V6.2M6 6.2L3 3.2M6 6.2L9 3.2M3 5.4V3.2h2.2M9 5.4V3.2H6.8" /></g>
        <rect class="sk" x="34" y="51.5" width="10" height="5" rx="2.5" />
        <rect class="pill-blue" x="50" y="48" width="34" height="10" rx="5" />
        <rect class="hl-outline" x="47.5" y="45.5" width="39" height="15" rx="7.5" />
        <rect class="card" x="8" y="72" width="84" height="14" rx="7" />
        <rect class="sk" x="27" y="77.5" width="22" height="3.5" rx="1.75" />
        <rect class="card" x="8" y="90" width="84" height="14" rx="7" />
        <rect class="sk" x="27" y="95.5" width="16" height="3.5" rx="1.75" />
        <circle class="good" cx="86" cy="40" r="9" /><path class="tick-w2" d="M81.5 40l3.2 3.2 5.6-6.4" />
      </svg>
    </template>

    <!-- 5 · search "Set Volume", add it, set it to 100% -->
    <template v-else-if="step === 5">
      <svg class="frame" viewBox="0 0 100 120">
        <rect class="scr" width="100" height="120" rx="10" />
        <rect class="card" x="8" y="8" width="84" height="14" rx="7" />
        <rect class="app" x="14" y="11" width="8" height="8" rx="2.5" />
        <rect class="pill-blue" x="50" y="11.5" width="34" height="7" rx="3.5" />
        <rect class="card" x="8" y="26" width="84" height="14" rx="7" />
        <g transform="translate(14 29) scale(0.667)"><rect class="gray" width="12" height="12" rx="3.5" /><path class="y" d="M6 10V6.2M6 6.2L3 3.2M6 6.2L9 3.2M3 5.4V3.2h2.2M9 5.4V3.2H6.8" /></g>
        <rect class="sk" x="27" y="31.5" width="14" height="3.5" rx="1.75" />
        <rect class="card" x="6" y="46" width="88" height="68" rx="10" />
        <rect class="field" x="12" y="54" width="76" height="14" rx="7" />
        <circle class="mag" cx="21" cy="61" r="3" /><path class="mag" d="M23.3 63.3l2.4 2.4" />
        <rect class="sk" x="30" y="58.5" width="26" height="5" rx="2.5" />
        <rect class="row-hl" x="10" y="74" width="80" height="20" rx="8" />
        <g transform="translate(15 78)"><rect class="red" width="12" height="12" rx="3.5" /><path class="spk" d="M2.5 4.8h1.9L7 2.6v6.8L4.4 7.2H2.5Z" /><path class="y" d="M8.7 4.6a2 2 0 0 1 0 2.8" /></g>
        <rect class="sk" x="34" y="81.5" width="30" height="5" rx="2.5" />
        <g class="dim"><g transform="translate(15 98)"><rect class="red" width="12" height="12" rx="3.5" /><path class="spk" d="M2.5 4.8h1.9L7 2.6v6.8L4.4 7.2H2.5Z" /><path class="y" d="M8.7 4.6a2 2 0 0 1 0 2.8" /></g><rect class="sk" x="34" y="103.5" width="22" height="5" rx="2.5" /></g>
        <g class="tap" transform="translate(66 84)"><circle class="halo" r="11" /><circle class="dot" r="3.5" /></g>
      </svg>

      <svg class="frame" viewBox="0 0 100 120">
        <rect class="scr" width="100" height="120" rx="10" />
        <rect class="card" x="8" y="10" width="84" height="14" rx="7" />
        <rect class="app" x="14" y="13" width="8" height="8" rx="2.5" />
        <rect class="pill-blue" x="50" y="13.5" width="34" height="7" rx="3.5" />
        <rect class="card" x="8" y="28" width="84" height="14" rx="7" />
        <g transform="translate(14 31) scale(0.667)"><rect class="gray" width="12" height="12" rx="3.5" /><path class="y" d="M6 10V6.2M6 6.2L3 3.2M6 6.2L9 3.2M3 5.4V3.2h2.2M9 5.4V3.2H6.8" /></g>
        <rect class="sk" x="27" y="33.5" width="14" height="3.5" rx="1.75" />
        <rect class="card" x="8" y="46" width="84" height="14" rx="7" />
        <rect class="sk" x="27" y="51.5" width="16" height="3.5" rx="1.75" />
        <rect class="card" x="8" y="68" width="84" height="26" rx="8" />
        <g transform="translate(14 75)"><rect class="red" width="12" height="12" rx="3.5" /><path class="spk" d="M2.5 4.8h1.9L7 2.6v6.8L4.4 7.2H2.5Z" /><path class="y" d="M8.7 4.6a2 2 0 0 1 0 2.8" /></g>
        <rect class="track" x="32" y="79.5" width="52" height="3" rx="1.5" /><rect class="fill" x="32" y="79.5" width="26" height="3" rx="1.5" /><circle class="knob" cx="58" cy="81" r="3.6" />
        <path class="drag" d="M64 81h18m0 0l-3-3m3 3l-3 3" />
        <g class="tap" transform="translate(58 81)"><circle class="halo" r="11" /><circle class="dot" r="3.5" /></g>
      </svg>
    </template>

    <!-- 6 · Set Volume must sit inside If -->
    <template v-else-if="step === 6">
      <svg class="frame" viewBox="0 0 100 120">
        <rect class="scr" width="100" height="120" rx="10" />
        <rect class="card" x="8" y="10" width="84" height="22" rx="8" />
        <g transform="translate(14 15)"><rect class="gray" width="12" height="12" rx="3.5" /><path class="y" d="M6 10V6.2M6 6.2L3 3.2M6 6.2L9 3.2M3 5.4V3.2h2.2M9 5.4V3.2H6.8" /></g>
        <rect class="sk" x="32" y="19.5" width="14" height="5" rx="2.5" />
        <rect class="pill-blue" x="50" y="17" width="34" height="10" rx="5" />
        <rect class="card" x="8" y="37" width="84" height="14" rx="7" />
        <rect class="gray" x="14" y="40" width="8" height="8" rx="2.5" /><rect class="sk" x="27" y="42.5" width="22" height="3.5" rx="1.75" />
        <rect class="card" x="8" y="55" width="84" height="14" rx="7" />
        <rect class="gray" x="14" y="58" width="8" height="8" rx="2.5" /><rect class="sk" x="27" y="60.5" width="16" height="3.5" rx="1.75" />
        <rect class="card" x="8" y="76" width="84" height="26" rx="8" />
        <g transform="translate(14 83)"><rect class="red" width="12" height="12" rx="3.5" /><path class="spk" d="M2.5 4.8h1.9L7 2.6v6.8L4.4 7.2H2.5Z" /><path class="y" d="M8.7 4.6a2 2 0 0 1 0 2.8" /></g>
        <rect class="track" x="32" y="87.5" width="52" height="3" rx="1.5" /><rect class="fill" x="32" y="87.5" width="26" height="3" rx="1.5" /><circle class="knob" cx="58" cy="89" r="3.6" />
        <circle class="bad" cx="84" cy="76" r="9" /><path class="x-w" d="M80.5 72.5l7 7m0-7l-7 7" />
      </svg>

      <svg class="frame" viewBox="0 0 100 120">
        <rect class="scr" width="100" height="120" rx="10" />
        <rect class="card" x="8" y="10" width="84" height="22" rx="8" />
        <g transform="translate(14 15)"><rect class="gray" width="12" height="12" rx="3.5" /><path class="y" d="M6 10V6.2M6 6.2L3 3.2M6 6.2L9 3.2M3 5.4V3.2h2.2M9 5.4V3.2H6.8" /></g>
        <rect class="sk" x="32" y="19.5" width="14" height="5" rx="2.5" />
        <rect class="pill-blue" x="50" y="17" width="34" height="10" rx="5" />
        <rect class="card" x="22" y="37" width="70" height="26" rx="8" />
        <g transform="translate(28 44)"><rect class="red" width="12" height="12" rx="3.5" /><path class="spk" d="M2.5 4.8h1.9L7 2.6v6.8L4.4 7.2H2.5Z" /><path class="y" d="M8.7 4.6a2 2 0 0 1 0 2.8" /></g>
        <rect class="track" x="46" y="48.5" width="38" height="3" rx="1.5" /><rect class="fill" x="46" y="48.5" width="38" height="3" rx="1.5" /><circle class="knob" cx="82" cy="50" r="3.6" />
        <rect class="card" x="8" y="68" width="84" height="14" rx="7" />
        <rect class="gray" x="14" y="71" width="8" height="8" rx="2.5" /><rect class="sk" x="27" y="73.5" width="22" height="3.5" rx="1.75" />
        <rect class="card" x="8" y="86" width="84" height="14" rx="7" />
        <rect class="gray" x="14" y="89" width="8" height="8" rx="2.5" /><rect class="sk" x="27" y="91.5" width="16" height="3.5" rx="1.75" />
        <path class="drag" d="M15 62V44m0 0l-3.5 3.5M15 44l3.5 3.5" />
        <circle class="good" cx="84" cy="37" r="9" /><path class="tick-w2" d="M79.5 37l3.2 3.2 5.6-6.4" />
        <g class="tap" transform="translate(34 50)"><circle class="halo" r="11" /><circle class="dot" r="3.5" /></g>
      </svg>
    </template>

    <!-- 7 · the blue ✓ at the top right -->
    <template v-else>
      <svg class="frame" viewBox="0 0 100 120">
        <rect class="scr" width="100" height="120" rx="10" />
        <circle class="card" cx="17" cy="19" r="9" />
        <path class="chev-l" d="M18.5 15.5l-4 3.5 4 3.5" />
        <circle class="blue" cx="83" cy="19" r="9.5" />
        <path class="tick-w2" d="M78.5 19l3.2 3.2 5.6-6.4" />
        <rect class="card" x="8" y="42" width="84" height="22" rx="8" />
        <rect class="card" x="8" y="70" width="84" height="22" rx="8" />
        <rect class="sk" x="15" y="50.5" width="46" height="5" rx="2.5" />
        <rect class="sk" x="15" y="78.5" width="36" height="5" rx="2.5" />
        <g class="tap" transform="translate(83 19)"><circle class="halo" r="12" /><circle class="dot" r="3.5" /></g>
      </svg>
    </template>
  </div>
</template>

<style scoped>
.art {
  --blue: #0a84ff;
  --sk: color-mix(in oklab, var(--ui-ink) 20%, transparent);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.frame {
  width: 92px;
  height: auto;
  flex: none;
  border-radius: 10px;
  box-shadow: 0 0 0 1px var(--ui-line);
}
:dir(rtl) .frame {
  transform: scaleX(-1);
}

.scr { fill: var(--ui-soft); }
.card { fill: var(--ui-card); }
.sk { fill: var(--sk); }
.sk-w { fill: #fff; }
.sk-blue { fill: var(--blue); opacity: 0.85; }
.ink { fill: var(--ui-ink); }
.gray { fill: color-mix(in oklab, var(--ui-ink) 45%, transparent); }
.red { fill: #ff3b30; }
.blue { fill: var(--blue); }
.pill-on { fill: color-mix(in oklab, var(--ui-ink) 10%, transparent); }
.pill-pale { fill: color-mix(in oklab, var(--blue) 18%, transparent); }
.pill-blue { fill: color-mix(in oklab, var(--blue) 80%, transparent); }
.field { fill: color-mix(in oklab, var(--ui-ink) 10%, transparent); }
.app { fill: var(--ui-accent); }
.app.dim { opacity: 0.35; }
.dim { opacity: 0.4; }
.mag { fill: none; stroke: var(--ui-muted); stroke-width: 1.4; stroke-linecap: round; }
.spark { fill: var(--ui-muted); opacity: 0.6; }
.bubble { fill: #34c759; }
.y { fill: none; stroke: #fff; stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; }
.spk { fill: #fff; }
.chev { fill: none; stroke: var(--sk); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.chev-l { fill: none; stroke: var(--ui-ink); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.chev-b { fill: none; stroke: var(--blue); stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
.ring-blue { fill: none; stroke: var(--blue); stroke-width: 1.2; }
.sep { stroke: var(--ui-line); stroke-width: 1; }
.tick-b { fill: none; stroke: var(--blue); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.tick-w, .tick-w2 { fill: none; stroke: #fff; stroke-linecap: round; stroke-linejoin: round; }
.tick-w { stroke-width: 1.4; }
.tick-w2 { stroke-width: 2; }
.x-w { stroke: #fff; stroke-width: 2; stroke-linecap: round; }
.bad { fill: var(--ui-danger); }
.good { fill: var(--ui-good); }
.track { fill: color-mix(in oklab, var(--ui-ink) 14%, transparent); }
.fill { fill: var(--blue); }
.knob { fill: #fff; stroke: color-mix(in oklab, var(--ui-ink) 22%, transparent); stroke-width: 0.6; }
.drag { fill: none; stroke: var(--ui-warn); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 3 3; }

/* the thing to tap */
.row-hl { fill: color-mix(in oklab, var(--ui-warn) 14%, var(--ui-card)); stroke: var(--ui-warn); stroke-width: 1.4; }
.hl-outline { fill: none; stroke: var(--ui-warn); stroke-width: 1.4; }
.tap .halo {
  fill: color-mix(in oklab, var(--ui-warn) 35%, transparent);
  transform-box: fill-box;
  transform-origin: center;
  animation: tap 1.6s var(--ease-out) infinite;
}
.tap .dot { fill: var(--ui-warn); stroke: #fff; stroke-width: 1; }
.tap.t2 .halo { animation-delay: 0.8s; }
@keyframes tap {
  0% { transform: scale(0.45); opacity: 1; }
  70%, 100% { transform: scale(1); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .tap .halo { animation: none; opacity: 0.6; transform: scale(0.8); }
}
</style>
