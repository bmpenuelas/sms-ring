# 🔔 SMS Ring

**Lost your phone on silent? Text it a secret phrase and it rings at full volume.**
No accounts, no cloud, no internet. Private by design, open source so you can check every line.

📶 **Works even when your phone is offline.** Find My and similar services can only ring a phone with mobile data or Wi-Fi on. SMS Ring just needs mobile signal.

[![Get it on Google Play](site/badges/google-play.png)](https://play.google.com/store/apps/details?id=app.smsring) [![Download on the App Store](site/badges/app-store.png)](https://apps.apple.com/app/sms-ring/id0000000000)

🌐 [bmpenuelas.github.io/sms-ring](https://bmpenuelas.github.io/sms-ring/) · 🔒 [Privacy policy](https://bmpenuelas.github.io/sms-ring/privacy/)

---

## ✨ Why you'll love it

🔊 **Rings loud, even on silent**: full volume through silent mode, vibrate mode and Do Not Disturb.

🎲 **A secret phrase that's easy to say**: 2 to 6 random everyday words like *“daisy meadow rocket”*, in your own language. Prefer your own? You can create your own password.

💬 **Works with chat apps too** (Android, optional): WhatsApp, Messenger, Telegram, Signal or any other app can ring it, if you turn on notification access. Notifications are checked only on your phone and never stored or sent: it stays fully private.

👨‍👩‍👧 **You decide who can ring it**: anyone who knows the phrase, or only the numbers you add.

⏱️ **Your ring, your rules**: ring for 15 seconds up to 5 minutes, at the volume you choose (full by default), with or without vibration, with one of several tones (or your own alarm sound on Android). Light or dark look, or follow your phone.

🛡️ **Ready when it matters**: rings with the screen off, while the phone sleeps, and after a restart (on Android even before you unlock it). A daily check tells you if something it needs was turned off.

🧪 **Try before you need it**: a test ring and a message simulator show exactly what will happen, without sending anything.

🔓 **Only you can stop it**: a big Stop button appears over the lock screen, like an alarm clock. Stopping asks for your PIN, pattern or fingerprint, so whoever finds your phone can't silence it.

🎯 **Exact on purpose**: only the exact phrase rings, so no everyday conversation can set it off. Capitals, accents and spaces don't matter: *“Daisy MEADOW rocket”* works.

🤝 **Share it with family**: send your phrase to someone you trust in one tap, so they can help you find your phone.

🌍 **Speaks your language**: 20 languages, from English and Español to 日本語, العربية and हिन्दी.

⚡ **Ready in a few taps**: the phrase is generated for you and it's on from the start. Setup is just a few permission taps, each explained first.

## 🔒 Privacy guaranteed by design, not by promise

- 🚫🌐 **No internet permission at all.** Android itself blocks every connection the app could try to make. You can see it in *Settings → Apps → SMS Ring → Permissions*, and the app shows you a live check.
- 🧠 **Messages are never stored.** Each text is checked in memory for your phrase and forgotten immediately.
- 🙅 **No accounts, ads, analytics or servers.** There is nothing to sign up for and nowhere for data to go.
- 👀 **Open source.** Read the code, build it yourself, verify everything. Run `npm run verify:offline` to check the claims automatically.

## 📱 Platforms

| | Android | iPhone |
|---|---|---|
| How messages arrive | Read directly by the app; optionally chat apps' notifications (WhatsApp, Messenger…) | Apple Shortcuts automation (Apple never lets apps read messages) |
| Full volume | ✅ Alarm stream raised to max, restored after | ✅ Ignores the silent switch; the automation sets volume to 100% |
| Lock-screen Stop | ✅ Full-screen Stop screen; asks to unlock first | ✅ Media controls, once the phone is unlocked |
| Do Not Disturb | ✅ Rings through it (on by default) | ✅ Time-sensitive notification |

---

## 🛠️ For developers

| Topic | |
|---|---|
| Architecture, layers and plugins-vs-native decisions | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Android implementation | [docs/ANDROID.md](docs/ANDROID.md) |
| iOS implementation (Shortcuts + App Intents) | [docs/IOS.md](docs/IOS.md) |
| Privacy model and how to verify it | [docs/PRIVACY.md](docs/PRIVACY.md) |
| Permission flow (explain first, then ask) | [docs/PERMISSIONS.md](docs/PERMISSIONS.md) |
| Passphrase and sender matching | [docs/MATCHING.md](docs/MATCHING.md) |
| Localization (app, native, stores) | [docs/LOCALIZATION.md](docs/LOCALIZATION.md) |
| App icon, splash screens and asset generation | [docs/ASSETS.md](docs/ASSETS.md) |
| Setup, scripts, testing, releasing | [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) |

Quick start:

```bash
npm install
npm run dev          # browser preview
npm test             # matcher, passphrase and word-list tests
npm run cap:sync     # build + generate native locales + sync Android/iOS
```

## 📄 License

[MIT](LICENSE). Use it, study it, share it, improve it.
