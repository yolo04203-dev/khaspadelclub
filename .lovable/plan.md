

## Plan: Replace App Icon and Splash Screen

The uploaded image (`user-uploads://splash_icon._png.png`) — the metallic "K" with "PADEL CLUB" text — will replace all icon and logo assets across the project.

### Files to update

**1. Copy uploaded image to all asset locations (5 copies):**
- `user-uploads://splash_icon._png.png` → `src/assets/logo.png` (Logo component)
- `user-uploads://splash_icon._png.png` → `public/favicon.png` (favicon)
- `user-uploads://splash_icon._png.png` → `public/icon-192.png` (PWA 192px icon)
- `user-uploads://splash_icon._png.png` → `public/icon-512.png` (PWA 512px icon, also used for OG/Twitter meta)

**2. Delete unused SVG icons:**
- `public/favicon.svg` — remove (PNG favicon is sufficient)
- `public/icon-192.svg` — remove (old hand-drawn SVG, not referenced)
- `public/icon-512.svg` — remove (old hand-drawn SVG, not referenced)

**3. Update `index.html`:**
- Remove the `favicon.svg` link (line 5) since the file is being deleted
- Keep the PNG favicon references (lines 6-8)

### What stays the same
- `src/components/Logo.tsx` — already imports from `@/assets/logo.png`, no change needed
- `public/manifest.json` — already references `/icon-192.png` and `/icon-512.png`
- `capacitor.config.ts` — splash screen background stays `#0d1a2d` (dark navy); the native splash screen displays this color while the app loads
- OG/Twitter meta tags already reference `/icon-512.png`

### Note on Android splash screen
The Capacitor splash screen on Android shows a solid `#0d1a2d` background. To display this logo image as the actual splash graphic, you would need to place a properly sized PNG in the Android native resource folders (`android/app/src/main/res/drawable*/`). This requires running `npx cap sync android` after the icon update, then manually placing the splash drawable in Android Studio, or using a tool like `@capacitor/assets` to generate all native sizes. After this change, I can guide you through that step.

