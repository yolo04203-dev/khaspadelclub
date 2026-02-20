

# Optimize Favicon for Better Clarity

## What Changes

Add multiple favicon sizes (16x16, 32x32, 48x48) to `index.html` so browsers can pick the best resolution for the tab icon, plus an SVG version for sharp scaling on all displays.

## Steps

1. **Create sized PNG favicons** -- Use an edge function or manual approach to generate `favicon-16.png`, `favicon-32.png`, and `favicon-48.png` from the existing `favicon.png`. Since we can't run image processing in the browser, we'll create a simple HTML utility page that uses a canvas to resize the logo and let you download the sized versions. Alternatively, we can reference the single high-res PNG with explicit `sizes` attributes so browsers know what's available.

2. **Update `index.html`** -- Replace the single favicon link with multiple entries:
   ```html
   <link rel="icon" type="image/png" sizes="48x48" href="/favicon.png" />
   <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
   <link rel="icon" type="image/png" sizes="16x16" href="/favicon.png" />
   ```
   Using the same high-res source with explicit `sizes` hints lets browsers scale from the best available image.

3. **Add an SVG favicon** for modern browsers (renders perfectly at any size):
   - Create a simple `public/favicon.svg` that wraps the logo image
   - Add to `index.html`:
     ```html
     <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
     ```
   - SVG favicons are supported by Chrome, Firefox, Edge, and Safari 15+

## Files Modified

- `index.html` -- update favicon `<link>` tags (add sizes attributes and SVG reference)
- `public/favicon.svg` -- new file, SVG version of the logo for crisp rendering

## Result

The favicon will appear sharper and larger in browser tabs, especially on high-DPI displays, by giving browsers proper size hints and an SVG alternative.

