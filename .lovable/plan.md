

## Fix: Remove K logo from all remaining in-app pages

The previous change missed pages that render their own headers instead of using `AppHeader`. These pages still show the K monogram and need `showImage={false}`:

### Pages to update

1. **`src/pages/LadderDetail.tsx`** — 3 Logo instances (lines 451, 481, 507)
2. **`src/pages/LadderCreate.tsx`** — 2 Logo instances (lines 157, 182)
3. **`src/pages/LadderManage.tsx`** — 2 Logo instances (lines 293, 326)
4. **`src/pages/TournamentDetail.tsx`** — Logo instances in custom header
5. **`src/pages/CreateTeam.tsx`** — Logo instance in custom header

### No changes to (public pages — keep K logo)
- Auth, Contact, Terms, Privacy, DeleteAccount, Landing Header, Footer

### Implementation
Add `showImage={false}` to every `<Logo>` call in the five pages listed above. Same pattern as the previous fix.

