

# Add More Top Whitespace to Mobile Dialogs

## Problem
The dialog currently sits at `top-[5%]` on mobile, but the title text ("Schedule Your Match") is flush against the top of the dialog with no visible breathing room above it. The user wants clear whitespace above the dialog.

## Change

**File:** `src/components/ui/dialog.tsx`

Increase the mobile top offset from `top-[5%]` to `top-[12%]` (or similar) so there is a visible gap between the top of the screen and the dialog. Also reduce `max-h` accordingly from `95vh` to `88vh` to prevent overflow.

This is a one-line class change in the DialogContent component.

