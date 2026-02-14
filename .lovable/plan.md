

# In-App Error Analytics for Mobile (iOS & Android)

## What This Solves

When a user on their phone hits a crash, API failure, or broken screen, you currently have zero visibility -- errors only live in the browser console which is inaccessible on mobile. This builds a complete error tracking pipeline that stores every client error in your database and shows them live on your Admin dashboard, with extra mobile-specific context like device model, OS version, network type, and whether the app is running natively via Capacitor or as a PWA.

## How It Works

1. User on their phone encounters an error (crash, failed API call, broken page)
2. The logger silently batches the error and writes it to the database within 3 seconds
3. Includes mobile-specific context: device (iPhone 16, Samsung Galaxy), OS (iOS 18.2, Android 15), network type (4G/WiFi/offline), and whether it's native Capacitor or web
4. The Admin "Errors" tab receives the new error in real-time -- no refresh needed
5. You can see exactly which page, device, and user triggered it, expand the full stack trace, and mark it resolved

## Implementation Details

### 1. Database: `client_errors` table

Create a table to store error reports with these columns:
- `id` (UUID, primary key)
- `user_id` (UUID, nullable -- captures errors from logged-out users too)
- `message` (text -- the error message)
- `stack` (text -- full stack trace)
- `page_url` (text -- which page they were on)
- `user_agent` (text -- raw browser/device string)
- `device_info` (JSONB -- parsed mobile context: platform, os_version, model, network_type, is_native)
- `severity` (text -- "error" or "warn")
- `resolved` (boolean, default false)
- `created_at` (timestamp)

RLS policies:
- Any user (authenticated or anonymous) can INSERT their own errors
- Admins can SELECT all errors and UPDATE the `resolved` flag

Enable real-time on this table so the admin dashboard updates instantly.

### 2. Update Logger (`src/lib/logger.ts`)

Add a batched database writer to the existing Logger class:
- Collect errors in a queue
- Every 3 seconds, flush the queue with a single batch insert
- Include mobile context using Capacitor's Device plugin (platform, OS version, model) and the Network API (connection type)
- Fire-and-forget: never blocks the UI or throws errors itself
- Only sends `error` and `warn` level logs (not debug/info)

### 3. Global error capture (`src/main.tsx`)

Add `window.addEventListener("error", ...)` and `window.addEventListener("unhandledrejection", ...)` that feed into the logger's database writer. This catches errors outside React's tree (e.g., third-party scripts, async code).

### 4. ErrorBoundary integration (`src/components/ErrorBoundary.tsx`)

When `componentDidCatch` fires, also send the error through the logger's database writer with the component stack trace included.

### 5. New Admin "Errors" tab (`src/components/admin/ErrorsTab.tsx`)

A new tab on the Admin page showing:
- Live-updating list of recent errors (real-time subscription)
- Each row: timestamp, user name (if available), error message, page, device type icon (phone/desktop)
- Click to expand: full stack trace, device details (OS, model, network), component stack
- Filter by: severity, resolved/unresolved, time range (last hour/day/week)
- "Mark Resolved" button per error
- Unresolved error count shown as a badge on the tab

### 6. Admin page update (`src/pages/Admin.tsx`)

- Add the "Errors" tab with a `Bug` icon
- Show unresolved count badge (red dot with number)
- Real-time subscription to `client_errors` table for instant updates

## Files Changed

| File | Change |
|------|--------|
| New database migration | Create `client_errors` table, RLS policies, enable real-time |
| `src/lib/logger.ts` | Add batched DB writer with mobile device context |
| `src/main.tsx` | Add global `onerror` + `unhandledrejection` handlers |
| `src/components/ErrorBoundary.tsx` | Add DB logging alongside existing Sentry call |
| `src/components/admin/ErrorsTab.tsx` | New component -- error list with filters, expand, resolve |
| `src/pages/Admin.tsx` | Add "Errors" tab with real-time subscription and badge |

## Mobile-Specific Context Captured

| Field | Source | Example |
|-------|--------|---------|
| Platform | `Capacitor.getPlatform()` | "ios", "android", "web" |
| OS Version | User agent parsing | "iOS 18.2", "Android 15" |
| Network Type | `navigator.connection.effectiveType` | "4g", "3g", "wifi" |
| Is Native | `Capacitor.isNativePlatform()` | true/false |
| Screen Size | `window.innerWidth x innerHeight` | "390x844" |
| App Version | Build-time constant | "1.0.0" |

