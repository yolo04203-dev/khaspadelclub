

# Fix Header Branding and Layout

## Problem
The AppHeader on the Americano page (and all pages) shows "Padel LEADERBOARD" from the Logo component, which is the old branding. It should say "Khas Padel Club". Additionally, the "New Session" button crowds into the logo text on mobile, making it look congested.

## Changes

### 1. Update Logo text to "Khas Padel Club"
**File:** `src/components/Logo.tsx`
- Change "Padel" to "Khas Padel"
- Change "Leaderboard" to "Club"
- This fixes branding across the entire app since Logo is used everywhere

### 2. Hide Logo text on small screens in AppHeader
**File:** `src/components/AppHeader.tsx`
- Add `showText` prop control or a responsive class so the Logo text hides on very small screens when actions (like "New Session" button) are present, preventing the congested layout
- Alternatively, make the actions wrap below on small screens

### 3. Make "New Session" button more compact on mobile
**File:** `src/pages/Americano.tsx`
- Use icon-only button on small screens (hide "New Session" text, show only the Plus icon)
- Show full text on `sm:` breakpoint and above

These three changes will fix the branding inconsistency and the cramped header layout.

