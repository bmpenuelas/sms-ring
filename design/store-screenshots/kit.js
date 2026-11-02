// Shared helpers for the screenshot artwork: device frames and headline fitting.
// <div class="phone" data-src="caps/home-dark.png" data-theme="dark" data-net="signal">

const ICON = {
  signal: (c) => `<svg viewBox="0 0 34 22"><g fill="${c}"><rect x="0" y="15" width="6" height="7" rx="1.6"/><rect x="9" y="10.5" width="6" height="11.5" rx="1.6"/><rect x="18" y="5.5" width="6" height="16.5" rx="1.6"/><rect x="27" y="0" width="6" height="22" rx="1.6"/></g></svg>`,
  wifi: (c) => `<svg viewBox="0 0 30 22"><g fill="none" stroke="${c}" stroke-width="3.6" stroke-linecap="round"><path d="M2.5 8.2a18 18 0 0 1 25 0"/><path d="M7.4 13a11 11 0 0 1 15.2 0"/></g><circle cx="15" cy="18.6" r="2.9" fill="${c}"/></svg>`,
  wifiOff: (c) => `<svg viewBox="0 0 30 22" opacity=".45"><g fill="none" stroke="${c}" stroke-width="3.6" stroke-linecap="round"><path d="M2.5 8.2a18 18 0 0 1 25 0"/><path d="M7.4 13a11 11 0 0 1 15.2 0"/><path d="M4 1.5 26 21"/></g></svg>`,
  battery: (c) => `<svg viewBox="0 0 50 22"><rect x="1.5" y="1.5" width="42" height="19" rx="5.5" fill="none" stroke="${c}" stroke-opacity=".4" stroke-width="2.6"/><rect x="5" y="5" width="30" height="12" rx="3" fill="${c}"/><path d="M47 8v6" stroke="${c}" stroke-opacity=".4" stroke-width="3" stroke-linecap="round"/></svg>`,
}

function buildPhone(el) {
  // data-cap="ring" reads caps/<language>/ring.png; data-src takes any image.
  if (el.dataset.cap) el.dataset.src = `caps/${window.LANG ?? 'en'}/${el.dataset.cap}.png`
  if (window.PLATFORM === 'android') el.classList.add('android')
  const dark = el.dataset.theme === 'dark'
  const bar = el.dataset.bar || (dark ? '#0f1016' : '#ffffff')
  const ink = el.dataset.ink || (dark ? '#ffffff' : '#14161f')
  const net = el.dataset.net || 'full'
  const icons = ICON.signal(ink) + (net === 'full' ? ICON.wifi(ink) : ICON.wifiOff(ink)) + ICON.battery(ink)
  el.style.setProperty('--bar', bar)
  el.style.setProperty('--ink', ink)
  // Children written inside the phone are overlays placed on the screen (em units).
  const overlays = [...el.children]
  el.innerHTML = `
    <div class="screen">
      <div class="status"><span class="time">9:41</span><span class="icons">${icons}</span></div>
      <img src="${el.dataset.src}" alt="">
    </div>
    <i class="island"></i><i class="glare"></i>`
  el.querySelector('.screen').append(...overlays)
}

/** Shrinks each .fit element until no hand-broken line overflows its box. */
function fitText(el) {
  let size = parseFloat(getComputedStyle(el).fontSize)
  const min = size * 0.5
  while (el.scrollWidth > el.clientWidth + 1 && size > min) {
    size -= 2
    el.style.fontSize = `${size}px`
  }
}

/** Shrinks a fixed-size box's text until it fits both ways (stickers, pills). */
function shrinkText(el) {
  let size = parseFloat(getComputedStyle(el).fontSize)
  const min = size * 0.45
  while ((el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) && size > min) {
    size -= 1
    el.style.fontSize = `${size}px`
  }
}

async function ready() {
  document.querySelectorAll('.phone').forEach(buildPhone)
  window.afterBuild?.(false)
  // Lay out first so fonts for every script on the page start loading, then wait for them.
  void document.body.offsetHeight
  await new Promise((r) => setTimeout(r, 50))
  await document.fonts.ready
  await Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)))
  document.querySelectorAll('.fit').forEach(fitText)
  document.querySelectorAll('.shrink').forEach(shrinkText)
  window.afterBuild?.(true) // true: text is fitted, final sizes are known
  document.body.dataset.ready = '1'
}

window.addEventListener('DOMContentLoaded', ready)
