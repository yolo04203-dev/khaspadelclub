

# Tournament Entry Fee Collection System

This plan implements a comprehensive entry fee collection mechanism for tournaments, allowing admins to set fees and track payments while giving participants the option to register with their existing team or create a new one.

---

## Overview

The system will add:
1. **Entry fee configuration** for tournaments (amount, currency)
2. **Registration dialog** with team selection (existing or new team)
3. **Payment status tracking** on participant records
4. **Admin payment management dashboard** to view and update payment status
5. **Clear messaging** about payment requirements during registration

---

## Database Changes

### 1. Add Entry Fee to Tournaments Table

```sql
ALTER TABLE tournaments
ADD COLUMN entry_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN entry_fee_currency TEXT DEFAULT 'PKR';
```

### 2. Add Payment Status to Tournament Participants

```sql
ALTER TABLE tournament_participants
ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
ADD COLUMN payment_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN payment_confirmed_by UUID REFERENCES auth.users(id),
ADD COLUMN payment_notes TEXT,
ADD COLUMN custom_team_name TEXT;
```

**Column purposes:**
- `payment_status`: Track if team has paid (pending/paid/refunded)
- `payment_confirmed_at`: When admin marked as paid
- `payment_confirmed_by`: Which admin confirmed payment
- `payment_notes`: Optional notes about payment (e.g., "Cash payment received")
- `custom_team_name`: For teams created during registration without a pre-existing team

---

## Feature Implementation

### 1. Tournament Creation Updates

**File:** `src/pages/TournamentCreate.tsx`

Add fields for entry fee configuration:
- Entry fee amount (numeric input)
- Currency selector (PKR, USD, etc.)
- Preview of fee information

### 2. Registration Dialog Component

**New File:** `src/components/tournament/RegistrationDialog.tsx`

A modal dialog that appears when clicking "Register":
- **Team Selection Section:**
  - Radio button: "Use my existing team" (shows team name if user is captain)
  - Radio button: "Register a new team" (shows team name input)
- **Entry Fee Information:**
  - Clear display of the entry fee amount
  - Message: "Your slot will be confirmed once payment is verified by the organizer"
  - Payment instructions or contact info
- **Confirmation button** to submit registration

### 3. Tournament Detail Registration Flow

**File:** `src/pages/TournamentDetail.tsx`

Update registration logic:
- Open RegistrationDialog instead of direct registration
- Handle both existing team and custom team name scenarios
- Show payment pending status after registration
- Display entry fee info in the tournament header

### 4. Admin Payment Management Panel

**New File:** `src/components/tournament/PaymentManagement.tsx`

A new tab or section in the admin management area showing:
- Table of all registered teams with columns:
  - Team Name
  - Registration Date
  - Payment Status (badge: Pending/Paid/Refunded)
  - Actions (Mark as Paid, Mark as Refunded, Add Note)
- Filter options: All / Pending / Paid
- Summary stats: Total teams, Paid count, Pending count, Total collected
- Quick action to mark multiple as paid

### 5. Update AdminGroupManagement

**File:** `src/components/tournament/AdminGroupManagement.tsx`

- Add a "Payments" section or integrate payment status badges next to team names
- Visual indicator for unpaid teams (warning icon/color)
- Option to only allow group assignment for paid teams

### 6. Update Participant Display

**File:** `src/pages/TournamentDetail.tsx` (Participants tab)

- Show payment status badge next to each team
- Different styling for paid vs pending teams
- For waitlist teams, still show payment status

---

## User Experience Flow

### For Participants:

1. User clicks "Register" on tournament page
2. Registration dialog opens with:
   - Option to select existing team (if captain) or enter new team name
   - Entry fee amount displayed prominently
   - Message explaining payment process
3. User confirms registration
4. Toast message: "Registration submitted! Please pay the entry fee of [amount] to confirm your slot."
5. User sees their team with "Payment Pending" status
6. Once admin confirms payment, status changes to "Paid"

### For Admins:

1. View "Payments" tab in tournament management
2. See list of all registered teams with payment status
3. Click "Mark as Paid" when payment is received
4. Optionally add notes (e.g., payment method, reference number)
5. Filter by payment status to see who still needs to pay

---

## Technical Details

### Files to Create:
1. `src/components/tournament/RegistrationDialog.tsx` - Team selection and registration modal
2. `src/components/tournament/PaymentManagement.tsx` - Admin payment tracking panel

### Files to Modify:
1. `src/pages/TournamentCreate.tsx` - Add entry fee fields
2. `src/pages/TournamentDetail.tsx` - Integrate registration dialog, show payment info
3. `src/components/tournament/AdminGroupManagement.tsx` - Add payment status indicators

### Database Migration:
- Add `entry_fee` and `entry_fee_currency` to `tournaments` table
- Add `payment_status`, `payment_confirmed_at`, `payment_confirmed_by`, `payment_notes`, and `custom_team_name` to `tournament_participants` table

### RLS Policies:
- Tournament creators and admins can update payment status
- Participants can view their own payment status
- All tournament participants visible to everyone (existing policy covers this)

---

## UI Components Used

- Dialog (for registration modal)
- RadioGroup (for team selection)
- Input (for custom team name, entry fee)
- Select (for currency)
- Badge (for payment status)
- Table (for payment management list)
- Button, Card, and other existing UI components

