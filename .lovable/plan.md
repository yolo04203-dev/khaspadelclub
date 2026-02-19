

# Add 20 Test Teams with Pakistani Names

## Overview

Create 20 test teams with realistic Pakistani player names (e.g., "Hassan & Bilal") and add them to the ladder rankings across both Category A and Category B. This will populate the dashboard, ladder detail page, and admin panel with enough data for thorough testing.

## Data to Insert

### 20 Teams (Pakistani name pairs)

1. Hassan & Bilal
2. Usman & Farhan
3. Saad & Zain
4. Ali Raza & Kamran
5. Tariq & Shahid
6. Imran & Wasim
7. Babar & Rizwan
8. Fakhar & Shadab
9. Shoaib & Waqar
10. Asif & Junaid
11. Haris & Naseem
12. Iftikhar & Faheem
13. Sarfraz & Azhar
14. Yasir & Fawad
15. Shan & Saud
16. Danish & Adeel
17. Nabeel & Kashif
18. Rehan & Owais
19. Zubair & Arslan
20. Moeen & Talha

## Steps

1. **Insert 20 rows into `teams`** with `created_by` set to the admin user (`4f7673a0-2397-4fce-a61c-2799316e3642`) and `name` set to the "Player1 & Player2" format.

2. **Insert 20 rows into `team_members`** linking each team to the admin user as captain (since these are test teams without real auth accounts).

3. **Insert 20 rows into `ladder_rankings`** -- split 10 teams into Category A and 10 into Category B, with sequential ranks (1-10 each) and varied win/loss/points/streak data for realistic testing.

## No Code Changes

This is purely a data seeding task using SQL inserts. No frontend code changes are needed.

