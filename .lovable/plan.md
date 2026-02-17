

# Generate iOS App Icon Set

## Overview
Create all required iOS app icon sizes from the existing paddle icon design. iOS requires specific icon sizes for different contexts (Spotlight, Settings, App Icon, App Store).

## Required iOS Icon Sizes

| Size | Usage |
|------|-------|
| 20x20 | iPad Notifications |
| 29x29 | Settings |
| 40x40 | Spotlight |
| 60x60 | iPhone App Icon (2x = 120x120) |
| 76x76 | iPad App Icon |
| 83.5x83.5 | iPad Pro App Icon |
| 1024x1024 | App Store |

In practice, iOS needs these at 1x, 2x, and 3x scales, resulting in files like: 40x40, 58x58, 60x60, 76x76, 80x80, 87x87, 120x120, 152x152, 167x167, 180x180, and 1024x1024.

## Approach

1. **Create a build script** (`scripts/generate-ios-icons.js`) that uses the existing SVG icon (`public/icon-512.svg`) as the source and renders it to PNG at all required sizes using an HTML canvas approach in an edge function.

2. **Create an edge function** (`generate-app-icons`) that:
   - Takes the SVG source and renders it server-side to PNG at each required size
   - Returns a downloadable zip or individual files

3. **Simpler alternative (recommended):** Since the SVG already scales perfectly, create a **static set of pre-rendered PNG icons** in `public/ios-icons/` by adding a simple page to the app that renders the SVG at each size and lets you download them.

**Recommended: Manual generation page**
- Add a utility page (`/generate-icons`) that renders the existing SVG at all 11 required sizes onto HTML canvases
- Provides a "Download All" button to save each as a PNG
- You then place these PNGs into your Xcode project's `Assets.xcassets/AppIcon.appiconset/`

## Technical Details

**New file: `src/pages/GenerateIcons.tsx`**
- Renders the app's paddle SVG at each required iOS size onto canvas elements
- Converts each canvas to PNG via `toDataURL()`
- Provides download links for each size
- Temporary utility page (can be removed after icons are generated)

**Route addition in `src/App.tsx`**
- Add `/generate-icons` route pointing to the new page

**Required sizes to generate (pixels):**
20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024

After downloading, you will:
1. Place the PNGs in your Xcode project under `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
2. Update the corresponding `Contents.json` to reference each file at its correct size and scale

