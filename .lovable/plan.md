

## Fix: Landing page header overlapping Android status bar

**Problem**: The viewport meta tag uses `viewport-fit=cover`, which extends content behind the system status bar. The `safe-top` CSS class relies on `env(safe-area-inset-top)`, but on Android browsers this value is often 0, so the header only gets 16px padding — not enough to clear the notification bar on devices like the Samsung S21.

**Solution**: Increase the minimum padding in the `safe-top` class from 16px to a value that accounts for typical Android status bars (24-28dp). Since this is a global utility class used by all headers, a slightly higher minimum won't affect native Capacitor (where `overlay: false` already pushes the WebView below the status bar) and will fix the browser case.

### Changes

**1. Update `src/index.css` — `.safe-top` class**
- Change `padding-top: max(16px, env(safe-area-inset-top))` to use a larger fallback that clears the Android status bar in browser mode: `padding-top: env(safe-area-inset-top, 0px)` — but this alone won't help since the value is 0.
- Better approach: keep the existing `safe-top` as-is for sticky headers (which don't need extra padding in browser mode since they're below the browser chrome), but for the landing `Header.tsx` which uses `fixed top-0`, add explicit top offset.

**2. Update `src/components/landing/Header.tsx`**
- The header already has `safe-top` but it's not enough on Android browser with `viewport-fit=cover`.
- Change the header from `fixed top-0` to use `padding-top: env(safe-area-inset-top, 0px)` inline or via the existing class, but the real fix is that on a standard mobile browser the `fixed top-0` should already be below the browser chrome — the issue is likely in the **Capacitor native app** where `overlay: false` may not have applied yet when the landing page renders.

Actually, re-evaluating: In the Capacitor native app, `useStatusBar` sets `overlay: false` asynchronously. There's a brief window where the WebView renders with the default `overlay: true`, causing the fixed header to sit under the status bar. The `safe-top` padding of 16px is insufficient for the S21's ~24dp status bar.

### Final approach

1. **`src/index.css`** — Bump `.safe-top` minimum from `16px` to `env(safe-area-inset-top, 28px)` so that even before the native StatusBar plugin runs, the header clears the status bar. On web browsers (where the browser chrome already provides clearance), this extra padding is harmless since headers are below the address bar anyway.

   Wait — that would break non-Capacitor usage. A better approach:

2. **`src/components/landing/Header.tsx`** — Replace `safe-top` with a more generous padding that specifically handles the fixed-position landing header on Capacitor Android. Use `pt-[env(safe-area-inset-top,28px)]` or add a dedicated style.

### Simplest correct fix

**`src/index.css`**: Change `.safe-top` padding from `max(16px, ...)` to `max(28px, ...)`. This adds 12px more padding to all headers — acceptable since they all need to clear the status bar. On web browsers the header is already below browser chrome so extra padding just adds a small visual gap. On Capacitor with `overlay: false` successfully applied, the WebView is pushed down and the 28px padding is just normal header padding.

