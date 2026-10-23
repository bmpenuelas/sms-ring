<script setup lang="ts">
// The app name between two pieces of the app icon (assets/icon.svg): the
// message bubble with its *** before it, and the tilted bell after it. Both
// keep the icon's own coordinates; each viewBox just frames one piece.
</script>

<template>
  <span class="brand">
    <svg class="bubble" viewBox="2 35 57.2 39" aria-hidden="true">
      <g transform="translate(-1.4542042,1.2118368) translate(-9.7686375,1.1996572)">
        <path
          class="bubble-shape"
          d="M 27.844115,33.509629 H 59.036899 A 10.397595,10.204475 0 0 1 69.434493,43.714103 V 60.296374 A 10.397595,10.204475 0 0 1 59.036899,70.500848 H 14.197272 L 18.746219,66.03639 V 42.438544 a 9.0978957,8.9289153 0 0 1 9.097896,-8.928915 z"
        />
        <g fill="#14161f">
          <rect x="31.488756" y="46.689201" width="2.6047497" height="10.628856" rx="1.3023748" />
          <rect x="60.134617" y="-7.2850728" width="2.5682075" height="10.781735" rx="1.2841038" transform="matrix(0.50706161,0.86190981,-0.87005056,0.4929625,0,0)" />
          <rect x="27.800739" y="-60.030151" width="2.5682075" height="10.781735" rx="1.2841038" transform="matrix(-0.50706161,0.86190981,-0.87005056,-0.4929625,0,0)" />
          <rect x="43.042175" y="46.689201" width="2.6047497" height="10.628856" rx="1.3023748" />
          <rect x="65.83078" y="-17.244398" width="2.5682075" height="10.781735" rx="1.2841038" transform="matrix(0.50706161,0.86190981,-0.87005056,0.4929625,0,0)" />
          <rect x="22.104582" y="-69.989479" width="2.5682075" height="10.781735" rx="1.2841038" transform="matrix(-0.50706161,0.86190981,-0.87005056,-0.4929625,0,0)" />
          <rect x="54.595463" y="46.689201" width="2.6047497" height="10.628856" rx="1.3023748" />
          <rect x="16.408491" y="-79.948692" width="2.5682075" height="10.781735" rx="1.2841038" transform="matrix(-0.50706161,0.86190981,-0.87005056,-0.4929625,0,0)" />
          <rect x="71.526871" y="-27.203609" width="2.5682075" height="10.781735" rx="1.2841038" transform="matrix(0.50706161,0.86190981,-0.87005056,0.4929625,0,0)" />
        </g>
      </g>
    </svg>
    <span class="name">sms ring</span>
    <svg class="bell" viewBox="46.5 18 43 41" aria-hidden="true">
      <g transform="translate(-1.4542042,1.2118368) matrix(1.327777,-0.59116445,0.59116445,1.327777,-59.584561,22.078629)">
        <g transform="matrix(0.3443,0.0732,-0.0732,0.3443,62.7779,28.3469)">
          <circle cx="50" cy="11" r="6" fill="#ffc21a" stroke="#14161f" stroke-width="4" />
          <path d="M 50,17 C 36,17 26,27 26,41 V 57 L 16,69 H 84 L 74,57 V 41 C 74,27 64,17 50,17 Z" fill="#ffc21a" stroke="#14161f" stroke-width="5" stroke-linejoin="round" />
          <path d="m 40,70 a 10,10 0 0 0 20,0 z" fill="#14161f" />
          <path d="m 37,34 c 2,-5 6,-8 11,-9" fill="none" stroke="#ffffff" stroke-opacity="0.8" stroke-width="5" stroke-linecap="round" />
        </g>
      </g>
    </svg>
  </span>
</template>

<style scoped>
.brand {
  --brand-shadow: #c6c9d3;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: 'Unbounded Variable', sans-serif;
  font-weight: 800;
  font-size: 15px;
}
:global([data-theme='dark'] .brand) {
  --brand-shadow: #000;
}
.bubble {
  width: 30px;
  height: auto;
  overflow: visible;
  /* a flat offset shadow, so the white bubble keeps its outline on a white page */
  filter: drop-shadow(1.5px 2px 0 var(--brand-shadow));
}
.bubble-shape {
  fill: #fff;
  stroke: var(--brand-shadow);
  stroke-width: 1.4;
}
.bell {
  width: 22px;
  height: auto;
  /* tucked against the g, riding high like the icon's bell over the phone */
  margin-inline-start: -6px;
  transform: translateY(-5px);
  overflow: visible;
}
</style>
