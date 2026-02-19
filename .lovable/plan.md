

# Remove Team Name Field from Tournament Registration

## What Changes

In the "Register a new team" flow of the tournament registration dialog, remove the separate "Team Name" input field. Instead, automatically generate the team name as "Player1 & Player2" from the two player name fields.

## Changes

### File: `src/components/tournament/RegistrationDialog.tsx`

1. **Remove** the `customTeamName` state variable and its input field
2. **Update validation**: `isCustomFormValid` only checks that both player names are filled
3. **Auto-generate team name** in `handleSubmit`: pass `${player1Name.trim()} & ${player2Name.trim()}` as the custom team name to `onRegister`
4. The form will show only Player 1 Name and Player 2 Name fields when "Register a new team" is selected

### No other file changes needed

The `onRegister` callback already accepts `customTeamName` as a parameter -- we just compute it from the player names instead of a separate input.

