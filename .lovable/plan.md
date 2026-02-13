

# App Store and Play Store Compliance Fixes

## Issues to Fix

### 1. Fix app name consistency
Update `capacitor.config.ts` to change `appName` from `"Paddle Leaderboard"` to `"Khas Padel Club"` so it matches the manifest and HTML title.

**File:** `capacitor.config.ts`

### 2. Fix OG and Twitter metadata
- Replace the generic Lovable OG image URL with your own branded image (or the app icon)
- Change `twitter:site` from `@Lovable` to your own handle or remove it
- Update `og:title` and `twitter:card` to be consistent

**File:** `index.html`

### 3. Update Privacy Policy for store compliance
Apple and Google require specific disclosures:
- List third-party SDKs that collect data (Sentry for crash reporting, analytics)
- Add data retention period information
- Add data export/portability section (GDPR Article 20)
- Fix app name from "Paddle Leaderboard" to "Khas Padel Club"
- Add "Children's Privacy" section (required by both stores)
- Add specific mention of account deletion capability

**File:** `src/pages/Privacy.tsx`

### 4. Update Terms of Service
- Fix app name from "Paddle Leaderboard" to "Khas Padel Club"
- Add "Governing Law" section (required for store compliance)

**File:** `src/pages/Terms.tsx`

### 5. Add maskable icon to manifest
Add a second icon entry with `"purpose": "maskable"` for Android adaptive icon support. This ensures the icon displays correctly on all Android launchers.

**File:** `public/manifest.json`

### 6. Add footer copyright consistency
Update the Footer component to use "Khas Padel Club" instead of "Paddle Leaderboard".

**File:** `src/components/landing/Footer.tsx`

---

## Summary of Changes

| File | Change |
|------|--------|
| `capacitor.config.ts` | Fix appName to "Khas Padel Club" |
| `index.html` | Replace Lovable OG image, remove @Lovable twitter handle |
| `src/pages/Privacy.tsx` | Add SDK disclosures, data retention, children's privacy, fix app name |
| `src/pages/Terms.tsx` | Fix app name, add governing law section |
| `public/manifest.json` | Add maskable icon purpose |
| `src/components/landing/Footer.tsx` | Fix copyright app name |

These changes address the compliance requirements for both Apple App Store and Google Play Store submission. The privacy policy and terms updates are the most critical -- stores will reject apps without adequate privacy disclosures.

