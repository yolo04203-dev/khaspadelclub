

# Use New Logo as Website Favicon

## What Changes

Copy the uploaded logo image to the `public` directory as the favicon, and update `index.html` to reference it.

## Steps

1. **Copy the uploaded image** from `user-uploads://SOUTH_CITY_STATICS_2_-removebg-preview-2.png` to `public/favicon.png` (replacing the old favicon)
2. **No HTML changes needed** -- `index.html` already references `/favicon.png`:
   ```html
   <link rel="icon" type="image/png" href="/favicon.png" />
   ```

## Scope

- 1 file replaced (`public/favicon.png`)
- 0 code changes

