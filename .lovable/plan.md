
# Plan: Make All Buttons and Cards Functional

## Overview
This plan addresses all non-functional buttons and cards across the application, creating new pages where needed and connecting existing elements to real functionality.

## Changes Required

### 1. Dashboard - Profile Card (Create Profile Page)
**Current State**: Static card with no link
**Solution**: Create a new `/profile` page where users can:
- View and edit their display name
- Upload an avatar
- View their match history
- Leave their current team

**Files to Create/Modify**:
- Create `src/pages/Profile.tsx`
- Update `src/App.tsx` to add route
- Update `src/pages/Dashboard.tsx` to link the Profile card

---

### 2. Dashboard - Admin Panel Card (Create Admin Page)
**Current State**: Static card visible only to admins
**Solution**: Create an `/admin` page with:
- User management (view all players)
- Team management 
- Match result recording
- Session/Tournament management

**Files to Create/Modify**:
- Create `src/pages/Admin.tsx`
- Update `src/App.tsx` to add route
- Update `src/pages/Dashboard.tsx` to link the Admin card

---

### 3. Dashboard - Stats Cards (Fetch Real Data)
**Current State**: Shows hardcoded "0" values
**Solution**: Fetch actual stats from the database:
- Matches Played: Query `matches` table for user's team
- Win Rate: Calculate from wins/losses
- Pending Challenges: Query `challenges` table for pending incoming/outgoing

**Files to Modify**:
- `src/pages/Dashboard.tsx` - Add queries and state for real stats

---

### 4. Landing Page - "View Demo" Button
**Current State**: Button does nothing
**Solution**: Either:
- Option A: Navigate to `/leaderboard` to show a preview of the app
- Option B: Open a video modal with a demo
- **Recommended**: Navigate to `/leaderboard` as a live demo

**Files to Modify**:
- `src/components/landing/Hero.tsx` - Link button to `/leaderboard`

---

### 5. Landing Page - Footer Links
**Current State**: All use `href="#"` placeholder
**Solution**: 
- Features, Sports Modes → Scroll to sections on landing page
- Pricing → Create a pricing section or page
- Help Center, Contact → Create simple info pages or modal
- Privacy Policy, Terms of Service → Create legal pages

**Files to Create/Modify**:
- Create `src/pages/Privacy.tsx`
- Create `src/pages/Terms.tsx`
- Create `src/pages/Contact.tsx`
- Update `src/components/landing/Footer.tsx` to link properly
- Update `src/App.tsx` for new routes
- Add `id="pricing"` section to Index or remove the link

---

### 6. Landing Page - Pricing Section
**Current State**: Header links to `#pricing` but no section exists
**Solution**: Create a Pricing section component for the landing page

**Files to Create/Modify**:
- Create `src/components/landing/Pricing.tsx`
- Update `src/pages/Index.tsx` to include Pricing section

---

### 7. Challenges - Match Result Recording
**Current State**: Challenges can be accepted but no way to record results
**Solution**: After a challenge is accepted:
- Create a match record
- Allow teams to enter scores
- Update ladder rankings based on results

**Files to Modify**:
- `src/pages/Challenges.tsx` - Add match result entry for accepted challenges
- May need to update database triggers/functions for ranking updates

---

## Technical Details

### New Database Queries Needed

```typescript
// Dashboard stats
const matchesPlayed = await supabase
  .from("matches")
  .select("*", { count: "exact" })
  .or(`challenger_team_id.eq.${teamId},challenged_team_id.eq.${teamId}`)
  .eq("status", "completed");

const pendingChallenges = await supabase
  .from("challenges")
  .select("*", { count: "exact" })
  .or(`challenger_team_id.eq.${teamId},challenged_team_id.eq.${teamId}`)
  .eq("status", "pending");
```

### New Routes to Add
```typescript
<Route path="/profile" element={<Profile />} />
<Route path="/admin" element={<Admin />} />
<Route path="/privacy" element={<Privacy />} />
<Route path="/terms" element={<Terms />} />
<Route path="/contact" element={<Contact />} />
```

### Profile Page Features
- Display current user info
- Form to update display name
- Avatar upload using storage
- Team membership display with leave option
- Match history list

### Admin Page Features (Protected for admin role)
- Players table with search
- Teams management
- Manual match result entry
- Tournament/Session oversight

---

## Implementation Order

1. **Quick wins first**:
   - Link "View Demo" button to `/leaderboard`
   - Link Profile card on Dashboard
   - Link Admin Panel card on Dashboard

2. **Create simple pages**:
   - Profile page
   - Admin page (basic version)
   - Privacy, Terms, Contact pages

3. **Add dynamic data**:
   - Dashboard stats fetching
   - Pricing section

4. **Complex features**:
   - Challenge match result recording with ranking updates

---

## Summary Table

| Element | Current State | Action |
|---------|---------------|--------|
| Profile Card | No link | Create `/profile` page |
| Admin Panel | No link | Create `/admin` page |
| Dashboard Stats | Hardcoded 0 | Fetch real data |
| View Demo Button | No action | Link to `/leaderboard` |
| Footer Links | `href="#"` | Create pages + proper links |
| Pricing Nav | No section | Create Pricing component |
| Challenge Results | No recording | Add score entry + ranking update |

This implementation will make every interactive element in the app fully functional.
