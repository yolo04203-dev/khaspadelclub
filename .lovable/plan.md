

# Make the App Installable (PWA Setup)

Set up the app as a Progressive Web App so it can be installed on Chrome and Android devices, with basic offline support.

## What You'll Get

- An "Install App" prompt on Chrome/Android when visiting the site
- The app appears on your home screen with its own icon and splash screen
- Basic offline support so the app doesn't show a blank page when there's no internet
- Proper app name and branding in the install flow

## Changes

### 1. Create `public/manifest.json`

The manifest file tells the browser how to display the app when installed:
- App name: "Khas Padel Club"
- Short name: "Padel Club"
- Theme color matching the app's primary color
- Start URL pointing to the dashboard
- Display mode: standalone (looks like a native app, no browser bar)
- Icons at 192x192 and 512x512 sizes (generated as simple branded SVGs)

### 2. Create PWA Icons

Add two icon files to `public/`:
- `icon-192.png` -- for the home screen icon
- `icon-512.png` -- for the splash screen

Since we don't have custom artwork, these will be generated as simple SVG-based icons using the paddle logo motif from the existing `Logo.tsx` component, converted to standalone icon files.

### 3. Create `public/sw.js` (Service Worker)

A lightweight service worker that:
- Caches the app shell (HTML, CSS, JS) on first visit
- Serves cached content when offline
- Uses a "network-first" strategy so users always get fresh data when online
- Falls back to cache when offline

### 4. Update `index.html`

Add to the `<head>`:
- `<link rel="manifest" href="/manifest.json">`
- `<meta name="theme-color" content="#...">`
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<link rel="apple-touch-icon" href="/icon-192.png">`
- Update the title and og:title to "Khas Padel Club"

### 5. Register the Service Worker in `src/main.tsx`

Add service worker registration after the app renders, with proper error handling.

## Technical Details

### manifest.json Structure

```text
{
  "name": "Khas Padel Club",
  "short_name": "Padel Club",
  "start_url": "/dashboard",
  "display": "standalone",
  "theme_color": "#16a34a",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker Strategy

```text
Install -> Cache app shell files (index.html, JS, CSS)
Fetch   -> Try network first
         -> If network fails, serve from cache
         -> Never cache API calls (Supabase requests)
```

Important: The service worker will NOT cache `/~oauth` routes to ensure authentication redirects always work.

### Files Created/Changed

| File | Action |
|------|--------|
| `public/manifest.json` | Create -- PWA manifest with app info and icons |
| `public/icon-192.svg` | Create -- 192x192 app icon (SVG paddle logo) |
| `public/icon-512.svg` | Create -- 512x512 app icon (SVG paddle logo) |
| `public/sw.js` | Create -- Service worker for offline caching |
| `index.html` | Update -- Add manifest link, theme-color, apple meta tags, fix title |
| `src/main.tsx` | Update -- Register service worker |

### Chrome Installability Requirements (all met)

1. Served over HTTPS (Lovable preview/published URLs are HTTPS)
2. Has a web app manifest with name, icons, start_url, display
3. Has a registered service worker with a fetch handler
4. Icons at least 192x192 and 512x512

