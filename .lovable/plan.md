

## Plan: Remove K logo from in-app pages

The K monogram image currently appears in the AppHeader (all authenticated pages), AdminHeader, TournamentCreate, AmericanoCreate, AmericanoSession, and other in-app pages. It should only appear on the landing page, auth page, and public pages (Contact, Terms, Privacy, DeleteAccount, Footer).

### Changes

**1. Add `showImage` prop to `src/components/Logo.tsx`**
- New optional boolean prop `showImage`, default `true`
- When `false`, skip rendering the `<img>` tag, show only the text

**2. Update `src/components/AppHeader.tsx`**
- Set `showImage={false}` on the Logo — shows "Khas Padel Club" text only, no K image

**3. Update `src/components/admin/AdminHeader.tsx`**
- Set `showImage={false}` on the Logo

**4. Update `src/pages/TournamentCreate.tsx`**
- Set `showImage={false}` on both Logo instances

**5. Update `src/pages/AmericanoCreate.tsx`**
- Set `showImage={false}` on both Logo instances

**6. Update `src/pages/AmericanoSession.tsx`**
- Set `showImage={false}` on the Logo

**No changes to**: Landing Header, Footer, Auth page, Contact, Terms, Privacy, DeleteAccount — these keep the K logo.

