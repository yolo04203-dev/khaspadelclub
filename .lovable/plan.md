

# Replace Logo Throughout the App

## What Changes

The app uses a single centralized `Logo` component (`src/components/Logo.tsx`) that imports the logo image from `src/assets/logo.png`. Every page and header in the app references this one component, so replacing the image file is all that's needed.

## Steps

1. **Copy the new logo image** from `user-uploads://SOUTH_CITY_STATICS_2_-removebg-preview.png` to `src/assets/logo.png`, replacing the old file
2. **No other file changes needed** -- the `Logo` component already handles sizing (sm: 40px, md: 52px, lg: 72px) and all pages import from this single source

## Affected Areas (all automatic via the shared component)

- Landing page header
- App header (dashboard, ladders, challenges, etc.)
- Admin header
- Auth page
- Footer
- Tournament detail page
- Ladder manage page
- Terms and Privacy pages

