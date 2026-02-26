

## Plan: Fix Safe Area Handling for Android and iOS

### Problem
The `.safe-top` class uses `padding-top: max(16px, env(safe-area-inset-top))`. On Android Capacitor with `StatusBar.setOverlaysWebView({ overlay: true })`, the WebView renders behind the status bar but `env(safe-area-inset-top)` often returns `0px` on Android WebViews, so the fallback of `16px` is insufficient for devices like Samsung S21.

### Step 1: Update `useStatusBar.ts` to inject actual status bar height as CSS variable

On native Android, use the Capacitor `StatusBar.getInfo()` API (or a known Android status bar height detection) to read the real status bar height and set it as a CSS custom property `--safe-area-top` on `<html>`. On iOS, `env(safe-area-inset-top)` works correctly, so no override needed.

Additionally, consider **not** using `overlay: true` on Android — this is the root cause. If the status bar does not overlay the WebView, the system handles the offset natively. Change `setOverlaysWebView({ overlay: false })` on Android so the system status bar pushes the WebView content down automatically, which is the most reliable approach.

### Step 2: Update `.safe-top` in `index.css`

Update the CSS to use the injected variable with proper fallback chain:

```css
.safe-top {
  padding-top: max(16px, env(safe-area-inset-top), var(--safe-area-top, 0px));
}
```

### Step 3: Ensure `<html>` and `<body>` have safe area coverage

Add to `index.css` base layer:
```css
html {
  padding-top: env(safe-area-inset-top);
}
```

Wait — this would double-pad with `.safe-top`. Instead, the cleaner approach is:

**Revised approach**: Remove `overlay: true` from Android StatusBar config. This is the simplest, most reliable fix. When overlay is `false`, Android's system WebView automatically offsets content below the status bar — no CSS hacks needed. `env(safe-area-inset-top)` on iOS continues to work.

### Final changes:

1. **`src/hooks/useStatusBar.ts`** — Change `setOverlaysWebView({ overlay: false })` on Android. This makes Android handle the status bar offset natively.

2. **`capacitor.config.ts`** — No changes needed (the plugin config is fine).

3. **`src/index.css`** — Keep `.safe-top` as-is. It already handles iOS correctly with `max(16px, env(safe-area-inset-top))`. With overlay disabled on Android, the system handles the offset.

4. **Verify** the landing `Header.tsx` also uses `safe-top` — it already does.

This is the cleanest, most reliable fix with zero hardcoded values and works in Capacitor WebView on both platforms.

