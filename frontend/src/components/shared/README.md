# Shared Directory

This directory contains components that are shared across multiple features or applications.

## Current Components

### Email Verification Components
- **EmailVerificationNotice** - Inline notification for email verification with resend button
- **EmailVerificationGuard** - Full-screen blocking component that prevents access until email is verified
- **useEmailVerification** - Custom hook for email verification logic and handlers

### Route Components
- **ProtectedRoute** - Protects routes that require authentication
- **PublicRoute** - Redirects authenticated users away from public-only routes

## Future Components
- ErrorBoundary
- Layout
- LoadingSpinner
- NotFound
- SEOHead
- Analytics

## Structure
Shared components should be:
- Feature-agnostic
- Highly tested
- Well-documented
- Stable API 