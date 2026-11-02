// Shared drawings for the store artwork: the app icon's ringing bell and the message
// with a hidden secret. Fill any element with data-motif="bell" or "message".
window.MOTIFS = {
  // viewBox="-35 -30 170 140"
  bell: `
<defs>
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffdf3d"/><stop offset=".55" stop-color="#ffc20f"/><stop offset="1" stop-color="#ffb000"/></linearGradient>
  <path id="bell-body" d="M50 17C36 17 26 27 26 41V57L16 69H84L74 57V41C74 27 64 17 50 17Z"/>
  <path id="bell-clap" d="M40 70a10 10 0 0 0 20 0Z"/>
</defs>
<g fill="none" stroke-linecap="round" stroke-width="5">
  <g stroke="#ff5a4e"><path d="M12 30Q2 46 10 63M0 20Q-13 46 -3 73" transform="translate(-2.5 2.5)"/><path d="M88 30Q98 46 90 63M100 20Q113 46 103 73" transform="translate(2.5 2.5)"/></g>
  <g stroke="#fff"><path d="M12 30Q2 46 10 63M0 20Q-13 46 -3 73M88 30Q98 46 90 63M100 20Q113 46 103 73"/><path d="M58.8 -6.8V-18.8M42.7 0.7 33.5 -7M74.9 0.7 84.1 -7" transform="rotate(16 58.8 14.2)"/></g>
</g>
<g transform="rotate(16 50 45)">
  <g fill="#14161f" stroke="#14161f" stroke-width="15" stroke-linejoin="round" transform="translate(5 5)"><use href="#bell-body"/><use href="#bell-clap"/><circle cx="50" cy="13" r="6"/></g>
  <g stroke="#fff" stroke-width="15" stroke-linejoin="round" fill="#fff"><use href="#bell-body"/><use href="#bell-clap"/><circle cx="50" cy="13" r="6"/></g>
  <g stroke="#14161f" stroke-width="5" stroke-linejoin="round">
    <use href="#bell-clap" fill="#14161f"/>
    <circle cx="50" cy="13" r="6" fill="url(#gold)"/>
    <use href="#bell-body" fill="url(#gold)"/>
  </g>
  <g fill="none" stroke-linecap="round">
    <path d="M36 27Q32 33 32 41" stroke="#fff" stroke-width="4" stroke-opacity=".85"/>
    <path d="M22 64.5H78" stroke="#ffe680" stroke-width="3"/>
  </g>
</g>`,
  message: `
<svg class="tail" viewBox="0 0 130 80"><path d="M68 6 4 76H124Z" fill="#fff"/><path d="M68 6 4 76H124" fill="none" stroke="#14161f" stroke-width="8" stroke-linejoin="round"/></svg>
<span class="cap"><svg viewBox="0 0 24 24" fill="none" stroke="#14161f" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.6"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg></span>
<span class="stars"><svg viewBox="-10 -10 20 20"><path d="M0-7.5V7.5M-6.5-3.75 6.5 3.75M-6.5 3.75 6.5-3.75" stroke="#14161f" stroke-width="3.8" stroke-linecap="round"/></svg><svg viewBox="-10 -10 20 20"><path d="M0-7.5V7.5M-6.5-3.75 6.5 3.75M-6.5 3.75 6.5-3.75" stroke="#14161f" stroke-width="3.8" stroke-linecap="round"/></svg><svg viewBox="-10 -10 20 20"><path d="M0-7.5V7.5M-6.5-3.75 6.5 3.75M-6.5 3.75 6.5-3.75" stroke="#14161f" stroke-width="3.8" stroke-linecap="round"/></svg><svg viewBox="-10 -10 20 20"><path d="M0-7.5V7.5M-6.5-3.75 6.5 3.75M-6.5 3.75 6.5-3.75" stroke="#14161f" stroke-width="3.8" stroke-linecap="round"/></svg></span>`,
}
for (const el of document.querySelectorAll('[data-motif]')) el.innerHTML = MOTIFS[el.dataset.motif]
