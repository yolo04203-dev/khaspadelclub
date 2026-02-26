

## Plan: Update Privacy Policy Page to App Store Compliant Version

### Changes

**Single file: `src/pages/Privacy.tsx`** — Replace the entire `<main>` content (lines 24–136) with the new structured policy. Keep the existing header/layout wrapper intact.

Key updates:
- Add introductory paragraph with "This Privacy Policy applies to..." preamble
- Expand Section 1 with bullet lists for collection triggers and data types, plus explicit "we do not collect" statement
- Expand Section 2 with bullet list of purposes and "we do not sell" statement
- Rewrite Section 3 with sub-descriptions for Sentry and Google Fonts, plus "bound by privacy obligations" line
- Rename Section 4 to "Information Sharing & Public Data" with bullet list of public items and explicit "no advertisers/data brokers" statement
- Rewrite Section 5 (Data Retention) with bullet list format
- Rewrite Section 6 (Data Security) with bullet list of protections
- Rename Section 7 to "Your Rights & Choices" with updated bullet list and deletion clarification
- Simplify Section 8 (Children's Privacy)
- Add new Section 9: International Data Processing
- Renumber Changes to Section 10, Contact to Section 11
- Section 11 (Contact): Show `support@khaspadelclub.com` email and app name instead of linking to contact page
- Auto-generate "Last Updated" date using JavaScript `new Date()` formatted as "February 26, 2026"
- Title becomes "Privacy Policy — Khas Padel Club"

No changes to routing, header, or other files needed. The page is already publicly accessible without auth at `/privacy`.

