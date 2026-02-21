

# Security Hardening: SRI, CSP, Clickjacking & Cookie Attributes

## Context

You've raised four specific security scanner findings. Here's the reality of what we can and cannot fix in this project:

## 1. Subresource Integrity (SRI) on External Resources

**Issue**: The Google Fonts stylesheet loaded from `fonts.googleapis.com` lacks an `integrity` attribute, which would protect against a compromised CDN serving malicious content.

**What we can do**: Add `integrity` and `crossorigin` attributes to the Google Fonts link tags in `index.html`.

**Challenge**: Google Fonts CSS responses are dynamic -- they vary based on the requesting browser's User-Agent header (serving different font formats). This means the hash changes per browser, making traditional SRI impractical for Google Fonts specifically.

**Recommended fix**: Switch to self-hosting the fonts instead. Download the Space Grotesk and Inter font files, place them in `public/fonts/`, and use `@font-face` declarations in CSS. This eliminates the external dependency entirely -- which is stronger than SRI since there is no third-party server involved at all.

## 2. Content Security Policy (CSP)

**Issue**: No CSP header or meta tag is present, leaving the app without a declared allowlist of content sources.

**What we can do**: Add a `<meta http-equiv="Content-Security-Policy">` tag in `index.html`. While a meta tag CSP is less powerful than an HTTP header (no `frame-ancestors`, no `report-uri`), it still provides significant XSS mitigation.

**Policy to implement**:
- `default-src 'self'`
- `script-src 'self'` (Vite bundles everything, no inline scripts needed)
- `style-src 'self' 'unsafe-inline'` (Tailwind/Radix inject inline styles)
- `font-src 'self'` (after self-hosting fonts)
- `img-src 'self' data: blob: https://rarkpesqxjpdfvxslllv.supabase.co`
- `connect-src 'self' https://rarkpesqxjpdfvxslllv.supabase.co https://*.sentry.io https://*.posthog.com`

## 3. Clickjacking / X-Frame-Options

**Issue**: No `frame-ancestors` directive or `X-Frame-Options` header prevents the app from being embedded in malicious iframes.

**What we can do**: The `frame-ancestors` directive does NOT work in meta tag CSP (per the spec). `X-Frame-Options` is an HTTP response header that cannot be set from HTML.

**Reality**: Both of these are HTTP response headers that must be set by the hosting server. On Lovable Cloud, these are managed at the infrastructure level and cannot be configured via application code. This is a platform-level concern, not an application-level one.

## 4. SameSite Cookie Attribute

**Issue**: Cookies are set without the `SameSite` attribute.

**Reality**: The cookies in question are set by Supabase Auth (authentication tokens) and by analytics services (PostHog, Sentry). These are set by their respective SDKs and infrastructure -- not by application code. The Supabase JS client stores auth tokens in `localStorage`, not cookies. Any cookies without `SameSite` are coming from third-party services whose behavior we cannot control from frontend code.

---

## Summary of Actionable Changes

| Finding | Actionable? | Fix |
|---------|-------------|-----|
| Missing SRI on fonts | Yes | Self-host Google Fonts (eliminates external dependency entirely) |
| Missing CSP | Partially | Add meta tag CSP in index.html (covers most protections except frame-ancestors) |
| Missing clickjacking protection | No | Requires HTTP headers set by hosting platform |
| Missing SameSite on cookies | No | Cookies are set by third-party SDKs/infrastructure |

## Technical Implementation

### Step 1: Self-host Google Fonts
- Download Space Grotesk (500, 600, 700) and Inter (400, 500, 600) woff2 files
- Place in `public/fonts/`
- Add `@font-face` declarations in `src/index.css`
- Remove the Google Fonts `<link>` tags from `index.html`
- Remove the `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com`

### Step 2: Add CSP meta tag to `index.html`
- Add a `<meta http-equiv="Content-Security-Policy">` tag with a strict policy allowing only necessary sources
- This will block any injected scripts from unauthorized origins

### Files to modify
- `index.html` -- remove Google Fonts links, add CSP meta tag
- `src/index.css` -- add `@font-face` declarations
- `public/fonts/` -- new directory with self-hosted font files

