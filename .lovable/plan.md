

# Fix PWA Icon: Use Uploaded PNG

Replace the current JPEG icons with the user-provided PNG image to satisfy Chrome's PWA installability requirement.

## Changes

### 1. Replace Icon Files

Copy the uploaded PNG to both icon locations in the `public/` directory:
- `public/icon-192.png` -- overwrite with the uploaded PNG
- `public/icon-512.png` -- overwrite with the uploaded PNG

The uploaded image is already square and large enough (1024x1024), so it works for both sizes. Chrome will scale it down as needed.

### 2. Update `public/manifest.json`

Change the icon `type` back from `"image/jpeg"` to `"image/png"` to match the actual file format:

```text
"icons": [
  { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
  { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
]
```

### Files Changed

| File | Change |
|------|--------|
| `public/icon-192.png` | Replace with uploaded PNG |
| `public/icon-512.png` | Replace with uploaded PNG |
| `public/manifest.json` | Change icon type back to `"image/png"` |

This will resolve the "must have a PNG icon" error since the file will now be a genuine PNG.

