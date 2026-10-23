#!/usr/bin/env node
// Synthesizes the ring tones (no third-party audio). Each is a seamless 2 s
// loop pitched around 1–3 kHz, where phone speakers are loudest and hearing is
// most sensitive, written as 16-bit mono WAV for both platforms:
//
//   beacon  a bright marimba-like arpeggio, played twice (the default)
//   chime   a two-note doorbell, twice
//   pulse   a digital alarm clock: four quick beeps, twice
//   siren   a smooth rising and falling sweep
//   bells   a classic telephone bell trill
//
//   node scripts/generate-ringtone.mjs
//
// The ids must match TONES in src/core/config.ts and the native players.
// "beacon" keeps its original file name (remote_ring_tone): Android's fallback
// notification channel refers to it.

import './lib/cli-failure.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dirs = [
  join(root, 'plugins/remote-ring/android/src/main/res/raw'),
  join(root, 'plugins/remote-ring/ios/Sources/RemoteRingPlugin/Resources'),
]
const fileFor = (id) => (id === 'beacon' ? 'remote_ring_tone.wav' : `tone_${id}.wav`)

const RATE = 44100
const LOOP = 2
const TAU = 2 * Math.PI

/** A decaying bell-like strike with a few inharmonic partials. */
function strike(out, startSec, freq, { len = 0.22, decay = 14, partials = [[2, 0.35, 30], [3.01, 0.18, 45]] } = {}) {
  const start = Math.floor(startSec * RATE)
  const n = Math.floor(len * RATE)
  for (let i = 0; i < n && start + i < out.length; i++) {
    const t = i / RATE
    const env = Math.min(1, t / 0.004) * Math.exp(-t * decay)
    let s = Math.sin(TAU * freq * t)
    for (const [mult, amp, d] of partials) s += amp * Math.sin(TAU * freq * mult * t) * Math.exp(-t * d)
    out[start + i] += env * s
  }
}

const TONES = {
  beacon(out) {
    // E6, G#6, B6, E7: a major arpeggio, then the same again.
    for (const round of [0, 0.55]) [1318.5, 1661.2, 1975.5, 2637.0].forEach((f, i) => strike(out, round + i * 0.11, f))
  },
  chime(out) {
    // "Ding-dong" (G6 then D#6) twice, with long bell decays.
    const bell = { len: 0.48, decay: 6, partials: [[2.76, 0.4, 9], [5.4, 0.2, 14]] }
    for (const round of [0, 1]) {
      strike(out, round, 1567.98, bell)
      strike(out, round + 0.32, 1244.51, bell)
    }
  },
  pulse(out) {
    // Four 70 ms beeps at 2.7 kHz (softened square), a rest, then again.
    for (const round of [0, 1]) {
      for (let b = 0; b < 4; b++) {
        const start = Math.floor((round + b * 0.13) * RATE)
        const n = Math.floor(0.07 * RATE)
        for (let i = 0; i < n; i++) {
          const t = i / RATE
          const edge = Math.min(1, t / 0.003, (n / RATE - t) / 0.003)
          const s = Math.sin(TAU * 2730 * t) + Math.sin(TAU * 2730 * 3 * t) / 3 + Math.sin(TAU * 2730 * 5 * t) / 5
          out[start + i] += edge * s * 0.9
        }
      }
    }
  },
  siren(out) {
    // A triangle sweep 900 Hz → 2.4 kHz → 900 Hz over the loop, phase-continuous.
    let phase = 0
    for (let i = 0; i < out.length; i++) {
      const x = i / out.length
      const sweep = x < 0.5 ? x * 2 : 2 - x * 2
      const f = 900 + (2400 - 900) * (0.5 - 0.5 * Math.cos(Math.PI * sweep))
      phase += (TAU * f) / RATE
      out[i] += Math.sin(phase) + 0.25 * Math.sin(2 * phase)
    }
  },
  bells(out) {
    // An old telephone: two bell partials struck 20 times a second, 0.8 s on, 0.2 s off.
    for (const round of [0, 1]) {
      for (let k = 0; k < 16; k++) {
        strike(out, round + k * 0.05, k % 2 ? 2200 : 1800, { len: 0.12, decay: 22, partials: [[2.4, 0.3, 40]] })
      }
    }
  },
}

function wav(samples) {
  // Soft-clip for loudness, then normalize to -0.5 dBFS.
  let peak = 0
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.tanh(samples[i] * 1.6)
    peak = Math.max(peak, Math.abs(samples[i]))
  }
  const gain = 0.944 / peak
  const data = Buffer.alloc(samples.length * 2)
  for (let i = 0; i < samples.length; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i] * gain)) * 32767), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(RATE, 24)
  header.writeUInt32LE(RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

for (const [id, render] of Object.entries(TONES)) {
  const samples = new Float32Array(RATE * LOOP)
  render(samples)
  const file = wav(samples)
  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, fileFor(id)), file)
  }
  console.log(`wrote ${fileFor(id)} (${id})`)
}
