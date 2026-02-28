

## Plan: Optimize app loading to under 2 seconds

### Current bottlenecks identified

1. **Empty white screen before React mounts** — `index.html` has no visible content until JS loads, parses, and renders
2. **Capacitor imported eagerly** — `@capacitor/core` is a synchronous import in `App.tsx` even on web where it's not needed
3. **Two toast systems loaded eagerly** — both Radix Toaster and Sonner are rendered on every page load, including the landing page where neither is used
4. **Logger eagerly imports Supabase client** — pulls the Supabase SDK into the critical path even for the landing page
5. **NetworkStatusProvider wrapper on every route** — adds overhead to initial render

### Changes

**1. Add instant loading shell to `index.html`**
- Add a minimal inline-styled loading skeleton inside `<div id="root">` that displays immediately while JS loads
- Uses the app's background color and a subtle spinner — replaced by React on mount
- Zero JS required, pure HTML/CSS, visible within milliseconds

**2. Lazy-load `@capacitor/core` in `App.tsx`**
- Replace the synchronous `import { Capacitor } from "@capacitor/core"` with a dynamic check using `window.Capacitor`
- Remove the dependency from the critical bundle path (~15KB saved on web)

**3. Lazy-load toast providers in `App.tsx`**
- Wrap both `Toaster` and `Sonner` in lazy imports since toasts are never shown during initial render
- They load on-demand when first needed

**4. Defer `NetworkStatusProvider` from blocking render**
- Move the network status check into a `useEffect`-based approach so it doesn't block the initial paint

**5. Add `<link rel="modulepreload">` for critical chunks in `index.html`**
- Preload the react-core and router chunks so the browser fetches them in parallel with the main bundle

**6. Optimize `src/lib/logger.ts` — lazy Supabase import**
- Change the top-level `import { supabase }` to a dynamic `import()` inside the `flush()` method
- This removes the entire Supabase SDK from the landing page's critical path

