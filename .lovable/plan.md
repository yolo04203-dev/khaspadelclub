

# Enlarge Header Logo Icon

## Change

Make the logo icon in the top-left corner larger and more visible, especially on mobile where it's the only branding element.

## Details

Update the `AppHeader` component to use a slightly larger logo size on mobile. Instead of the fixed `sm` size (32px), the Logo component will be adjusted to render at 40px (`w-10 h-10`) — matching the `md` size — while keeping the text behavior unchanged.

## Technical Details

**File: `src/components/AppHeader.tsx`**
- Change `<Logo size="sm" ...>` to `<Logo size="md" ...>` so the icon renders at 40x40px instead of 32x32px
- Keep the existing `showText` and `className` props as-is (text still hidden on small screens, shown on `sm:` and up)

This is a one-line change with no side effects on layout since the header is already 64px tall (`h-16`), comfortably fitting a 40px icon.
