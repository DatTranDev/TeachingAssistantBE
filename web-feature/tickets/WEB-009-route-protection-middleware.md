# WEB-009 — Route Protection & Middleware

## Objective
Implement Next.js `middleware.ts` to protect all dashboard routes, redirect unauthenticated users to login, redirect authenticated users away from auth pages, and enforce role-based routing so teachers cannot access student routes and vice versa.

## Background
Without route protection, any unauthenticated user could browse to `/teacher/classes` and see an empty/broken page, or a student could access teacher-only pages. Next.js Middleware runs at the Edge before any page renders, making it the correct place to enforce access control.

## Scope
- `src/middleware.ts` — route matching and redirect logic
- Protected route groups: `(dashboard)/(teacher)/*` and `(dashboard)/(student)/*`
- Public routes: `(auth)/*`, `/api/auth/*`
- Read `refresh_token` cookie to determine authentication state
- Read user role from a signed cookie or a separate `user_role` cookie set during login
- Redirect unauthenticated users from any protected route → `/login`
- Redirect authenticated users from auth pages → role-appropriate home
- Redirect teacher to student route (or vice versa) → correct home (e.g., if teacher visits `/student/classes`, redirect to `/teacher/classes`)
- `useAuth` hook for consuming auth state in components

## Out of Scope
- Authentication logic (WEB-008)
- API-level authorization (handled by backend)
- Fine-grained permission checks within pages (pages check role from Zustand)

## Dependencies
- WEB-008 (auth store and cookie setup)

## User Flow Context
- After UF-01 (Login): user is redirected to correct home; middleware ensures they stay there
- Unauthenticated: any attempt to access `/teacher/` or `/student/` redirects to `/login`

## Functional Requirements
1. `middleware.ts` runs on all paths matching `/(dashboard)/:path*`
2. Reads `refresh_token` cookie — if absent, redirect to `/login?redirect=<original-path>`
3. Reads `user_role` cookie (set during login alongside `refresh_token`) — if role doesn't match route group, redirect to correct home
4. Auth pages (`/login`, `/register`, `/forgot-password/*`) redirect to home if user is already authenticated
5. Root path `/` redirects to `/login` if unauthenticated, or role home if authenticated
6. `matcher` in middleware config must exclude: `_next/static`, `_next/image`, `favicon.ico`, `/api/auth/*`
7. On successful auth check, allow request to continue to the page

## UI Requirements
No UI. Pure redirect logic.

## API Requirements
No API calls in middleware (Edge runtime — use only cookies, not fetch to external API).

## Backend Changes
None.

## Technical Implementation Notes

### Cookie Setup (update WEB-008)
During login (in `POST /api/auth/callback` route handler), set an additional `user_role` cookie:
```typescript
cookieStore.set('user_role', user.role, {
  httpOnly: false,    // Readable by middleware and JavaScript
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60,
  path: '/',
});
```

### Middleware (`src/middleware.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password'];
const TEACHER_HOME = '/teacher/timetable';
const STUDENT_HOME = '/student/timetable';

function getHome(role: string | undefined): string {
  return role === 'teacher' ? TEACHER_HOME : STUDENT_HOME;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const userRole = request.cookies.get('user_role')?.value;
  const isAuthenticated = Boolean(refreshToken);

  // Root redirect
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(isAuthenticated ? getHome(userRole) : '/login', request.url)
    );
  }

  // Redirect authenticated users away from auth pages
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(getHome(userRole), request.url));
    }
    return NextResponse.next();
  }

  // Protect dashboard routes
  if (pathname.startsWith('/teacher') || pathname.startsWith('/student')) {
    if (!isAuthenticated) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // Role enforcement
    if (pathname.startsWith('/teacher') && userRole !== 'teacher') {
      return NextResponse.redirect(new URL(STUDENT_HOME, request.url));
    }
    if (pathname.startsWith('/student') && userRole !== 'student') {
      return NextResponse.redirect(new URL(TEACHER_HOME, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
};
```

### `useAuth` Hook (`src/hooks/useAuth.ts`)
```typescript
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { ROUTES } from '@/constants/routes';

export function useAuth() {
  const { user, accessToken, isHydrated, setAuth, signOut: clearStore } = useAuthStore();
  const router = useRouter();

  const signOut = async () => {
    await authApi.logout();
    clearStore();
    router.replace(ROUTES.LOGIN);
  };

  const isAuthenticated = Boolean(accessToken && user);

  return {
    user,
    accessToken,
    isAuthenticated,
    isHydrated,
    role: user?.role,
    signOut,
  };
}
```

### Loading Guard (for pages that need auth hydrated)
```tsx
// src/components/shared/AuthGuard.tsx
'use client';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isHydrated, isAuthenticated } = useAuth();

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Middleware handles redirect; this is a safety fallback
  }

  return <>{children}</>;
}
```

### Handle Redirect After Login
```typescript
// In login onSubmit:
const searchParams = useSearchParams();
const redirect = searchParams.get('redirect') ?? getHome(user.role);
router.replace(redirect);
```

## Acceptance Criteria
- [ ] Visiting `/teacher/classes` while unauthenticated → redirected to `/login?redirect=/teacher/classes`
- [ ] After login, redirect param is used to send user back to intended page
- [ ] Visiting `/login` while authenticated as teacher → redirected to `/teacher/timetable`
- [ ] Student visiting `/teacher/classes` → redirected to `/student/timetable`
- [ ] Teacher visiting `/student/classes` → redirected to `/teacher/timetable`
- [ ] Root path `/` redirects correctly based on auth state
- [ ] `_next/static` and image paths are not matched by middleware
- [ ] `AuthGuard` shows spinner while `isHydrated` is false

## Testing Requirements
- **Unit tests (Vitest):**
  - Mock `NextRequest` with various cookie/path combinations → verify correct `NextResponse.redirect` URL
  - Test all branches: no cookie, wrong role, correct role, auth pages when already authenticated
- **Manual QA:**
  - Open incognito → visit `/teacher/classes` → verify redirect to `/login`
  - Login as student → manually type `/teacher/classes` in URL → verify redirect to student home
  - Login as teacher → verify stays on teacher routes

## Definition of Done
- All route protection logic in `middleware.ts`
- `useAuth` hook exported and working
- `AuthGuard` component available for pages
- All middleware unit tests pass

## Risks / Notes
- Next.js Middleware runs in the Edge Runtime — do not use Node.js APIs (`fs`, `crypto`, etc.)
- The `user_role` cookie is not httpOnly (readable by middleware AND JavaScript) — this is intentional; it does not contain sensitive data
- Do not validate the JWT signature in middleware (Edge Runtime doesn't have crypto easily) — just check cookie presence; actual auth enforcement is on the backend
- The middleware redirect loop risk: ensure auth pages are excluded from protection matcher correctly
