

# Use Largest Logo on Landing Header

## Change

Update `src/components/landing/Header.tsx` to use `size="lg"` on the `Logo` component (currently `size="md"`).

## Technical detail

In `src/components/landing/Header.tsx`, line 42, change:
```tsx
<Logo size="md" />
```
to:
```tsx
<Logo size="lg" />
```

This will render the logo at 72px (w-18 h-18) in the landing page header, matching the Auth screen.

