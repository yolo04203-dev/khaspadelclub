
# Update Team Creation Toast Message

## Summary
Update the success toast message when creating a team to remove the incorrect reference to "added to the ladder" since at this point the team is only being registered, not yet added to any ladder.

## Current Behavior
When a user creates a team, the toast shows:
> **Team created!**
> "ZOKX" has been registered and added to the ladder.

## Expected Behavior
The toast should show:
> **Team created!**
> "ZOKX" has been registered successfully.

This is more accurate since the team creation flow only registers the team - joining a ladder is a separate step that requires selecting a ladder and requesting to join.

---

## Technical Details

### File to Modify
`src/pages/CreateTeam.tsx`

### Change Required
**Line 100** - Update the toast description:

```typescript
// Before
description: `"${data.name}" has been registered and added to the ladder.`,

// After
description: `"${data.name}" has been registered successfully.`,
```

This is a single-line text change with no logic or functionality changes required.
