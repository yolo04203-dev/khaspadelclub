
# Enlarge Logo Across the App

## What changes

Increase all logo sizes throughout the app by bumping up the dimensions in the `Logo` component, and use the `lg` size on the Auth screen for a more prominent brand presence.

## Changes

### 1. Update size classes in `src/components/Logo.tsx`
Increase all three size tiers:

| Size | Current | New |
|------|---------|-----|
| sm   | 32px (w-8 h-8) | 40px (w-10 h-10) |
| md   | 40px (w-10 h-10) | 52px (w-13 h-13) |
| lg   | 56px (w-14 h-14) | 72px (w-18 h-18) |

Also bump the text sizes to match:
- sm: text-lg -> text-xl
- md: text-xl -> text-2xl
- lg: text-2xl -> text-3xl

### 2. Use `lg` size on Auth screen (`src/pages/Auth.tsx`)
Change the Logo on the auth page from `size="md"` to `size="lg"` so the branding is prominent when users sign in or sign up.

### 3. Use `md` size on Landing Header (`src/components/landing/Header.tsx`)
Bump the landing page header logo from `size="sm"` to `size="md"` for better visibility.

## Impact
- All ~16 files using `<Logo>` automatically get larger icons through the updated size classes -- no individual file changes needed beyond Auth and the landing header.
- The Auth screen gets the largest logo for strong brand presence.
