

## Plan: Update Terms of Service Page

**Single file: `src/pages/Terms.tsx`** — Replace the `<main>` content (lines 24–100) with the new 12-section compliant terms.

Changes:
- Title → "Terms of Service — Khas Padel Club"
- Add introductory paragraph with agreement clause
- Replace 9 sections with 12 expanded sections: Eligibility, Account Registration (with bullet list), Acceptable Use (with prohibited actions list), Match Results, Public Information (with bullet list), Real-World Activity Disclaimer, Account Termination/Deletion, Service Availability, Limitation of Liability, Governing Law, Changes to Terms, Contact (with email link)
- Keep static "Last updated: February 13, 2026" date
- Match Privacy Policy formatting: `prose prose-invert`, `space-y-8`, bullet lists with `list-disc pl-6`
- Keep existing header wrapper unchanged

