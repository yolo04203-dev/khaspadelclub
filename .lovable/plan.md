

# Enhanced Service Worker and Offline Experience

## What Already Exists
Your app already has a fully functional service worker (`public/sw.js`) with:
- Network-first caching strategy
- OAuth and API route exclusion
- Old cache cleanup on activation
- Registration in `main.tsx`
- Web app manifest with icons
- Offline/slow connection banners in the UI

## Proposed Enhancements

### 1. Versioned Cache with Build Hash
Replace the static `khas-padel-v1` cache name with a version that changes on each deploy, ensuring users always get fresh assets after an update.

**File:** `public/sw.js`
- Change `CACHE_NAME` to `khas-padel-v2` (increment on each meaningful SW change)
- Add a version comment at the top for tracking

### 2. Precache Key Static Assets
Cache the critical app shell files during the `install` event so they're available offline immediately, not just after first visit.

**File:** `public/sw.js`
- Expand the `install` handler to cache: `/`, `/index.html`, `/manifest.json`, `/icon-192.png`, `/icon-512.png`, `/offline.html`

### 3. Offline Fallback Page
Create a simple offline fallback page shown when the user navigates to a page that isn't cached and has no network.

**New file:** `public/offline.html`
- A styled HTML page matching the app's dark theme
- Shows a friendly "You're offline" message with a retry button
- Self-contained (no external CSS/JS dependencies)

**File:** `public/sw.js`
- Update the `fetch` handler to serve `/offline.html` for navigation requests that fail and aren't in cache

### 4. Background Sync for Queued Actions (Optional Foundation)
Add a `sync` event listener skeleton so future features (like submitting scores while offline) can queue actions and replay them when connectivity returns.

**File:** `public/sw.js`
- Add a `sync` event listener with a `sync-data` tag
- For now, just log that sync was triggered (actual queue logic can be added per-feature later)

### 5. SW Update Notification
Notify users when a new version of the app is available so they can refresh.

**File:** `src/main.tsx`
- After registration, listen for the `updatefound` event on the registration
- When a new SW is installed and waiting, show a toast prompting the user to refresh

## Technical Details

### Updated `public/sw.js` structure:
```text
CACHE_NAME = 'khas-padel-v2'

install -> precache [/, /index.html, /manifest.json, /offline.html, icons]
activate -> delete old caches, claim clients
fetch -> skip OAuth/Supabase/non-GET
       -> network-first for all other requests
       -> on navigation failure, serve /offline.html
sync -> log + placeholder for future queue replay
```

### Files Changed
| File | Change |
|------|--------|
| `public/sw.js` | Versioned cache, expanded precache list, offline fallback for navigations, sync listener |
| `public/offline.html` | New -- styled offline fallback page |
| `src/main.tsx` | Add SW update detection with toast notification |

### What This Does NOT Change
- No new dependencies needed
- No changes to the manifest, icons, or meta tags (already correct)
- No changes to the existing `OfflineBanner` component (it handles in-app network status)
- The network-first strategy remains unchanged (proven to work well)

