
# Replace Logo and Favicon with New KP Image

## What will change

The uploaded "KP Padel Club" logo image will replace the current logo and favicon across the entire app.

## Files to update

### 1. Copy the image to project assets
- Copy `user-uploads://SOUTH_CITY_STATICS_2.jpg` to `src/assets/logo.png` (replacing the current logo used in React components)
- Copy it to `public/favicon.png` (replacing the current favicon)
- Copy it to `public/icon-192.png` and `public/icon-512.png` (replacing PWA icons and apple-touch-icon)

### 2. No code changes needed
The `Logo` component (`src/components/Logo.tsx`) already imports from `@/assets/logo.png`, and `index.html` already references `/favicon.png`, `/icon-192.png`, and `/icon-512.png`. Since we're replacing files at the same paths, everything will pick up the new image automatically.

### 3. Update SVG icons (optional cleanup)
The `public/icon-192.svg` and `public/icon-512.svg` files contain the old icon as SVG. These can be left as-is since the manifest and HTML reference the PNG versions, not SVGs.

## Notes
- The image has a white background which works well for favicons and PWA icons
- The brand text "Khas Padel Club" in the `Logo` component will remain alongside the new logo image
