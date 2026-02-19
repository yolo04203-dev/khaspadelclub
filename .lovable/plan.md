

# Add Registered Teams Management for Admins

## What's Changing

Currently, the "Payments" tab on the tournament detail page only appears when the tournament has an entry fee greater than 0. Your tournament (CHINIOT PADEL CUP) has no entry fee set, so you can't see registered teams or confirm them.

The fix: Always show a "Registrations" tab for admins that lists all registered teams with a toggle to confirm/approve each registration, regardless of whether there's an entry fee.

## Changes

### File: `src/pages/TournamentDetail.tsx`

1. **Always show the admin tab** -- Remove the `tournament.entry_fee > 0` condition from both the tab trigger and tab content for the payments/registrations tab
2. **Rename the tab** from "Payments" to "Registrations" so it makes sense even when there's no entry fee
3. **Always fetch payment data** for admins (remove conditional)

### File: `src/components/tournament/PaymentManagement.tsx`

1. **Conditionally show payment-specific UI** -- Only show entry fee amounts, "Total Collected" card, and payment action buttons (Paid/Refund/Reset) when `entryFee > 0`
2. **Always show a confirmation toggle** -- Add a "Confirmed" toggle/button for each team so admins can confirm registrations regardless of fees
3. **Rename component title** to "Registration Management" when there's no entry fee, keep "Payment Tracking" when there is one
4. **Use the existing `payment_status` field** as confirmation status: "paid" = confirmed, "pending" = unconfirmed. No database changes needed.

## Technical Details

- No database migrations required -- the `payment_status` column already exists on `tournament_participants`
- The `payment_status` field will double as a confirmation flag: `paid` = confirmed, `pending` = not yet confirmed
- RLS policies already allow tournament creators and admins to update participants
- The Registrations tab will show: team name, registration date, confirmation status, and a toggle to confirm/unconfirm
- When entry fee exists, the full payment tracking UI (amounts, refunds, notes) will continue to appear as before
