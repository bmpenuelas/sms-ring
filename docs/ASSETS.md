# App icon and splash assets

Every icon and splash screen is generated from three vector sources in `assets/`:

| Source | Used for |
|---|---|
| `icon.svg` | The full icon, with its soft background shapes: iOS AppIcon, legacy Android icons, web favicon and touch icon |
| `icon-foreground.svg` | The artwork alone: Android adaptive-icon foreground, splash mark |
| `icon-background.svg` | The plain Blue → Violet gradient, no shapes: adaptive-icon background, splash backdrop |

Earlier icon drafts are kept in `design/icons/`. `design/store-mockup.html` shows `assets/icon.svg` among other apps in Play Store and App Store search results.

## Regenerating

```bash
npm run assets
```

`scripts/generate-app-assets.mjs` then:

1. Renders the base PNGs `@capacitor/assets` expects into `assets/`: `icon-only.png`, `icon-foreground.png`, `icon-background.png` and `splash.png`. The adaptive foreground is drawn at 88% because `@capacitor/assets` maps it onto the visible launcher area, and that keeps it inside round masks.
2. Runs `@capacitor/assets` for Android (mipmaps, adaptive icons, splash drawables) and iOS (AppIcon, Splash). It then drops images the iOS asset sets no longer list. It redraws every splash, light and dark, at its own size so the gradient fills it edge to edge, because `@capacitor/assets` pads non-square and dark splashes with a flat colour. Finally it recompresses all native PNGs.
3. Writes `public/favicon.svg` (rounded corners) and `public/apple-touch-icon.png`.
4. Records a hash of the sources and the script in `assets/.generated.json`.

Commit the sources, the base PNGs and the native files together.

`npm run assets:web` writes only the web icons.

## Keeping them in sync

- `npm run assets:check` fails if an output is missing or the sources changed since the last full run.
- The `cap:sync*` scripts run it first, so a stale icon never reaches a native build.
- The git pre-commit hook (`.githooks/pre-commit`) runs it when assets, the script or native image folders are staged. It runs `locales:check` when locale files are staged. `npm install` enables the hook through the `prepare` script (`core.hooksPath`).

## Notes

- Both `sharp` (the renderer) and `@capacitor/assets` are dev dependencies; generation runs offline.
- npm may block `sharp`'s install scripts. If rendering fails on a fresh clone, run `npm install-scripts approve sharp`, then `npm install`.
