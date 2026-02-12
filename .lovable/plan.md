

# Native Mobile Optimization for Capacitor (iOS and Android)

A comprehensive set of changes to make the web app feel fully native when running inside Capacitor on iOS and Android devices.

---

## 1. Viewport and Safe Area Foundation

**index.html** -- Update the viewport meta tag to enable edge-to-edge rendering with safe area support:
- Change viewport to `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`
- This enables `env(safe-area-inset-*)` CSS functions and prevents iOS zoom on input focus

**src/index.css** -- Add global safe area and native behavior CSS:
- Add `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)` to the root or body as needed
- Disable overscroll bounce globally with `overscroll-behavior: none` on html/body
- Force 16px minimum font-size on all inputs to prevent iOS auto-zoom
- Add `-webkit-overflow-scrolling: touch` for smooth scroll on older WebKit
- Disable text selection on interactive elements and long-press context menus
- Hide browser tap highlight with `-webkit-tap-highlight-color: transparent`

---

## 2. Header Safe Area (iOS Notch)

**src/components/AppHeader.tsx** -- Add top safe area padding:
- Add `pt-[env(safe-area-inset-top)]` to the sticky header so it sits below the iOS status bar/notch
- This keeps the header content visible and not overlapped by the system UI

---

## 3. Bottom Navigation Safe Area (iOS Home Indicator)

**src/components/AppHeader.tsx** -- Restructure mobile nav to be a fixed bottom bar with safe area:
- Move the mobile `<nav>` out of the header flow and make it `fixed bottom-0` with `pb-[env(safe-area-inset-bottom)]`
- This ensures the navigation never overlaps the iOS home indicator
- Add a matching bottom padding to the page content area so it is not hidden behind the fixed nav

**src/components/ui/fab.tsx** -- Adjust FAB positioning:
- Account for the bottom safe area so the FAB floats above the home indicator on iOS

---

## 4. Keyboard Handling

**src/hooks/useKeyboardHeight.ts** (new file) -- Create a custom hook for keyboard awareness:
- Listen for `visualViewport` resize events (the reliable cross-platform way to detect keyboard open/close)
- Expose `keyboardHeight` and `isKeyboardOpen` state
- When keyboard opens, add dynamic bottom padding to the page or scroll focused input into view using `element.scrollIntoView({ block: 'center', behavior: 'smooth' })`

**src/index.css** -- Add a global focus handler for inputs:
- Use CSS to ensure form containers have enough bottom margin for the keyboard
- Prevent the body from resizing awkwardly when the keyboard appears

---

## 5. Dialog and Modal Fixes

**src/components/ui/dialog.tsx** -- Enhance for mobile:
- Add safe area padding (top and bottom) inside `DialogContent`
- Ensure the close button is within the safe area
- The existing `fixed inset-0` overlay and scroll-locking from Radix already handles background scroll lock

**src/components/ui/sheet.tsx** -- Bottom sheet safe area:
- Add `pb-[env(safe-area-inset-bottom)]` to the bottom variant so content does not sit behind the home indicator
- Internal content remains scrollable via existing Radix behavior

---

## 6. Overscroll and Bounce Control

**src/index.css** -- Global overscroll prevention:
- `html, body { overscroll-behavior: none; }` prevents rubber-banding on the page shell
- Individual scrollable containers (lists, scroll areas) keep their natural scroll behavior
- The existing `PullToRefresh` component already guards against conflicts by only activating at scrollTop 0

---

## 7. Scroll Performance for Long Lists

**src/pages/Players.tsx** and similar list pages -- Already use server-side pagination with "Load More". Additional improvements:
- Add `will-change: transform` and `contain: content` CSS to list item cards for GPU-accelerated compositing
- Wrap list containers with `transform: translateZ(0)` to promote them to their own compositing layer
- Add these as utility classes in `src/index.css` (e.g., `.gpu-accelerated`)

---

## 8. Tap Responsiveness

Already partially implemented (buttons have `touch-manipulation` and `active:scale-[0.97]`). Additional improvements:

**src/index.css** -- Global touch optimizations:
- Add `touch-action: manipulation` globally to all interactive elements to remove the 300ms tap delay
- Add `-webkit-tap-highlight-color: transparent` to prevent the blue/grey flash on tap
- These two CSS properties eliminate all perceivable tap delay

---

## 9. Skeleton Loaders

Already implemented for Dashboard, Challenges, Players, and Ladders via `skeleton-card.tsx`. Verify coverage:
- Dashboard: has `StatsCardSkeleton`, `TeamCardSkeleton`, `DashboardCardSkeleton`
- Players: has `PlayerCardSkeleton`
- Challenges: has `ChallengeCardSkeleton`
- Profile/Stats pages: Add skeleton states if missing (check during implementation)

---

## 10. Image Optimization

**src/index.css** -- Add lazy loading defaults:
- All `<img>` tags should use `loading="lazy"` and `decoding="async"` attributes
- Create a utility component or add a note in implementation to use these attributes consistently

**Capacitor config** -- Images are served from the web server so they benefit from CDN caching already. No binary asset changes needed.

---

## 11. Status Bar and Splash Screen Styling

**capacitor.config.ts** -- Add status bar configuration:
- Add `plugins.StatusBar` config with `style: 'Dark'` and `backgroundColor` matching the app theme color
- Add `plugins.SplashScreen` config with brand colors and auto-hide behavior

These require the `@capacitor/status-bar` and `@capacitor/splash-screen` plugins. Since these are native-only plugins that work at build time, we configure them in the Capacitor config. The user will need to run `npx cap sync` after pulling these changes.

---

## 12. Platform-Specific WebView Fixes

**src/index.css** -- Already has:
- `touch-manipulation` on buttons
- `prefers-reduced-motion` support
- Error boundary for WebKit crashes

Additional CSS fixes:
- `-webkit-font-smoothing: antialiased` (already present via `antialiased` class)
- Fix iOS input zoom by enforcing `font-size: 16px` on all form inputs
- Prevent iOS rubber-band on fixed elements

---

## Summary of Files Changed

| File | Type | Change |
|------|------|--------|
| `index.html` | Edit | Update viewport meta tag with `viewport-fit=cover`, `maximum-scale=1` |
| `src/index.css` | Edit | Add safe area variables, overscroll control, tap optimizations, input zoom prevention, GPU hints |
| `src/components/AppHeader.tsx` | Edit | Add top safe area padding to header, make mobile nav fixed bottom with safe area |
| `src/components/ui/fab.tsx` | Edit | Adjust bottom positioning for safe area |
| `src/components/ui/dialog.tsx` | Edit | Add safe area padding to dialog content |
| `src/components/ui/sheet.tsx` | Edit | Add safe area padding to bottom sheet variant |
| `src/hooks/useKeyboardHeight.ts` | New | Keyboard detection hook using visualViewport API |
| `src/components/ui/input.tsx` | Edit | Enforce `text-base` (16px) font-size to prevent iOS zoom |
| `capacitor.config.ts` | Edit | Add StatusBar and SplashScreen plugin configuration |
| `src/pages/Dashboard.tsx` | Edit | Add bottom padding for fixed nav safe area |

---

## Technical Details

### Safe Area CSS Pattern
```text
/* Header */
padding-top: env(safe-area-inset-top);

/* Bottom nav */
padding-bottom: env(safe-area-inset-bottom);

/* Full page content */
padding-bottom: calc(60px + env(safe-area-inset-bottom));
```

### Keyboard Hook Pattern
```text
const { keyboardHeight, isKeyboardOpen } = useKeyboardHeight();
// Used to add dynamic bottom spacing when keyboard is open
```

### Capacitor Plugin Config
```text
plugins: {
  StatusBar: { style: 'Dark', backgroundColor: '#0d1a2d' },
  SplashScreen: { launchAutoHide: true, backgroundColor: '#0d1a2d' }
}
```

After implementation, the user should:
1. Pull the changes from GitHub
2. Run `npm install` 
3. Run `npx cap sync` to sync native config
4. Build and test on device with `npx cap run ios` or `npx cap run android`

