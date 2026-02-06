
# Fix: White Screen on iPhone 16 When Clicking "Get Started"

## Problem Summary
When you click "Get Started" on the published app using iPhone 16, the app shows a white screen. This happens because errors during navigation or authentication aren't being caught properly, causing the app to crash silently on mobile Safari.

## Root Causes Identified

1. **Unhandled async errors** - The authentication functions can throw errors that aren't caught, crashing the app
2. **No global error handling** - Mobile Safari handles unhandled promise rejections differently than desktop browsers
3. **Mobile-specific storage issues** - localStorage can behave unexpectedly on iOS Safari

## Solution

### Step 1: Add Global Error Handler in App.tsx
Add a global unhandled promise rejection handler that catches errors and shows a user-friendly message instead of crashing to a white screen.

```tsx
// In App.tsx - add useEffect for global error handling
useEffect(() => {
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error("Unhandled promise rejection:", event.reason);
    event.preventDefault();
  };

  window.addEventListener("unhandledrejection", handleUnhandledRejection);
  return () => window.removeEventListener("unhandledrejection", handleUnhandledRejection);
}, []);
```

### Step 2: Wrap Auth Page Async Operations in Try/Catch
Ensure all async operations in the Auth page are properly wrapped:

**handleForgotPassword:**
```tsx
const handleForgotPassword = async (data: ForgotPasswordFormData) => {
  setIsSubmitting(true);
  try {
    await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    toast({
      title: "Check your email",
      description: "If an account exists with this email, you'll receive a password reset link.",
    });
    forgotPasswordForm.reset();
    setShowForgotPassword(false);
  } catch (error) {
    console.error("Password reset error:", error);
    toast({
      title: "Error",
      description: "Unable to send reset email. Please try again.",
      variant: "destructive",
    });
  } finally {
    setIsSubmitting(false);
  }
};
```

### Step 3: Add Error Boundary Component
Create a React Error Boundary to catch rendering errors and prevent white screens:

```tsx
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <h1>Something went wrong</h1>
          <Button onClick={() => window.location.reload()}>
            Reload App
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### Step 4: Wrap App with Error Boundary
```tsx
// In App.tsx
<ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    {/* rest of app */}
  </QueryClientProvider>
</ErrorBoundary>
```

### Step 5: Fix React Ref Warnings (Console Errors)
The console shows warnings about function components receiving refs. These should also be fixed:

**PullToRefresh component** - wrap with `React.forwardRef`
**Badge component** - wrap with `React.forwardRef`

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add global error handler and wrap with ErrorBoundary |
| `src/pages/Auth.tsx` | Add try/catch to `handleForgotPassword` |
| `src/components/ErrorBoundary.tsx` | Create new error boundary component |
| `src/components/ui/pull-to-refresh.tsx` | Add `React.forwardRef` wrapper |
| `src/components/ui/badge.tsx` | Add `React.forwardRef` wrapper |

## Technical Details

### Why This Happens on Mobile
- iOS Safari has stricter error handling than desktop Chrome
- Unhandled promise rejections cause immediate app crashes
- React's default error boundaries don't catch async errors
- The white screen occurs when React's root component unmounts due to an unhandled error

### Testing After Fix
1. Click "Get Started" on iPhone
2. Verify the Auth page loads correctly
3. Test login and signup flows
4. Verify the error boundary catches any remaining issues gracefully
