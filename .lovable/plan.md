

# Remove "View Demo" Button from Home Page

## Change

Remove the "View Demo" button from the Hero section on the landing page.

## Technical Details

**File:** `src/components/landing/Hero.tsx`

- Remove the `handleViewDemo` function (lines 18-24)
- Remove the "View Demo" `<Button>` element from the button row
- The "Get Started" button remains as the sole CTA

