# WEB-008 — Auth API Integration & Session Management

## Objective
Wire the authentication UI to the backend APIs, implement secure session management using httpOnly cookies for the refresh token, in-memory Zustand store for the access token, and implement automatic token refresh on app boot. This ticket makes login, register, and logout fully functional.

## Background
The mobile app stores tokens in local storage/SecureStore. For web, we must use a more secure approach: the refresh token lives in an httpOnly cookie (inaccessible to JavaScript, preventing XSS token theft), while the short-lived access token lives only in memory (Zustand). A Next.js Route Handler acts as the token exchange proxy — it sets the cookie server-side and hydrates the client on boot.

## Scope
- Zustand auth store (`src/stores/authStore.ts`) with `user`, `accessToken`, `setAuth`, `setAccessToken`, `signOut`
- Next.js Route Handler `POST /api/auth/callback` — receives tokens from login/register, sets httpOnly cookie for refresh token, returns access token to client
- Next.js Route Handler `GET /api/auth/refresh` — reads httpOnly cookie, calls backend `/token/refresh-token`, returns new access token
- Next.js Route Handler `POST /api/auth/logout` — clears httpOnly cookie
- Wire login form (`/login`) to call backend, go through route handler cookie exchange
- Wire register form (`/register`) to call backend + same cookie flow
- Wire forgot password flow to call `/service/sendEmail`, `/service/verifyCode`, `/user/changepassword`
- `AuthProvider` component that on mount calls `/api/auth/refresh` to hydrate Zustand from cookie
- `useAuth` hook exposing auth state and actions
- Handle logout: clear Zustand + call `/api/auth/logout`

## Out of Scope
- Route protection / middleware (WEB-009)
- Role-based page redirects (WEB-009)
- Profile update (WEB-035)

## Dependencies
- WEB-004 (API service layer)
- WEB-006 (CORS configured on backend)
- WEB-007 (auth pages UI)

## User Flow Context
- **UF-01 (Login):** form submit → `authApi.login()` → route handler sets cookie → Zustand hydrated → redirect
- **UF-02 (Register):** form submit → `authApi.register()` → same token exchange flow
- **UF-03 (Forgot Password):** 3 API calls in sequence; no token exchange (public endpoint)

## Functional Requirements
1. After successful login/register, backend returns `{ accessToken, refreshToken, data: user }`
2. Frontend posts to `POST /api/auth/callback` which sets `refreshToken` as httpOnly, Secure, SameSite=Lax cookie with 30-day expiry
3. `POST /api/auth/callback` returns `{ accessToken, user }` to client
4. Client stores `accessToken` + `user` in Zustand (memory only)
5. On app mount, `AuthProvider` calls `GET /api/auth/refresh` → if cookie exists, get new access token → hydrate Zustand
6. If `GET /api/auth/refresh` fails (expired cookie), user is unauthenticated — redirect to login
7. `signOut` action: calls `POST /api/auth/logout` (clears cookie) + clears Zustand + redirects to `/login`
8. Login errors from backend (401, 404) display as toast messages in Vietnamese
9. Register with duplicate email shows inline error: "Email đã được sử dụng"
10. Forgot password flow: email stored in component state across steps; success redirects to `/login` with toast "Đổi mật khẩu thành công"

## UI Requirements
- Auth pages already built in WEB-007; this ticket only adds actual API call behavior
- Loading state: button disabled + spinner during all async operations
- Error toast in Vietnamese for network failures
- Success toast on password reset

## API Requirements

### Backend APIs Used
- `POST /api/v1/user/login` — `{ email, password }` → `{ accessToken, refreshToken, data: User }`
- `POST /api/v1/user/register` — `{ name, email, password, userCode, school, role }` → `{ accessToken, refreshToken, user: User }`
- `GET /api/v1/token/refresh-token` — `Authorization: Bearer <refreshToken>` → `{ access_token: string }`
- `POST /api/v1/service/verifyEmail` — `{ email }` → 200/404
- `POST /api/v1/service/sendEmail` — `{ email }` → 200
- `POST /api/v1/service/verifyCode` — `{ email, code }` → 200/400
- `PATCH /api/v1/user/changepassword` — `{ email, password }` → 200

### Next.js Route Handlers (Internal)
- `POST /api/auth/callback` — receives `{ accessToken, refreshToken, user }` from client, sets cookie, returns `{ accessToken, user }`
- `GET /api/auth/refresh` — reads cookie, calls backend refresh, returns `{ accessToken }`
- `POST /api/auth/logout` — clears cookie, returns 200

## Backend Changes
No backend changes required. All token exchange logic is in Next.js Route Handlers.

## Technical Implementation Notes

### Zustand Auth Store (`src/stores/authStore.ts`)
```typescript
import { create } from 'zustand';
import type { User } from '@/types/domain';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isHydrated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isHydrated: false,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  signOut: () => set({ user: null, accessToken: null }),
}));

// Getter for use in Axios interceptor (avoids React hook rules)
export const getAuthStore = () => useAuthStore;
```

### Next.js Route Handlers (`src/app/api/auth/`)

```typescript
// src/app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const { accessToken, refreshToken, user } = await req.json();

  const cookieStore = cookies();
  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });

  return NextResponse.json({ accessToken, user });
}
```

```typescript
// src/app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/token/refresh-token`,
      { headers: { Authorization: `Bearer ${refreshToken}` } }
    );

    if (!response.ok) {
      cookieStore.delete('refresh_token');
      return NextResponse.json({ error: 'Refresh failed' }, { status: 401 });
    }

    const { access_token } = await response.json();
    return NextResponse.json({ accessToken: access_token });
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 500 });
  }
}
```

```typescript
// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  cookies().delete('refresh_token');
  return NextResponse.json({ success: true });
}
```

### AuthProvider (`src/providers/AuthProvider.tsx`)
```tsx
'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, signOut } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const hydrate = async () => {
      try {
        const res = await fetch('/api/auth/refresh');
        if (res.ok) {
          const { accessToken } = await res.json();
          // Also fetch user from token claims or a /me endpoint
          // For now, decode JWT claims client-side
          const user = decodeUserFromToken(accessToken);
          setAuth(user, accessToken);
        }
      } catch {
        // Not authenticated — middleware handles redirect
      } finally {
        useAuthStore.setState({ isHydrated: true });
      }
    };
    hydrate();
  }, []);

  return <>{children}</>;
}
```

### Auth Service (`src/lib/api/auth.ts`)
```typescript
export const authApi = {
  login: async (credentials: LoginPayload): Promise<{ user: User; accessToken: string }> => {
    const { data } = await apiClient.post('/user/login', credentials);
    // Exchange tokens via Next.js route handler
    const res = await fetch('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.data,
      }),
    });
    return res.json();
  },

  register: async (payload: RegisterPayload): Promise<{ user: User; accessToken: string }> => {
    const { data } = await apiClient.post('/user/register', payload);
    const res = await fetch('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      }),
    });
    return res.json();
  },

  logout: async (): Promise<void> => {
    await fetch('/api/auth/logout', { method: 'POST' });
  },
};
```

### Login Form Handler (wires WEB-007 stub)
```typescript
const { setAuth } = useAuthStore();
const router = useRouter();

const onSubmit = async (values: LoginFormValues) => {
  try {
    const { user, accessToken } = await authApi.login(values);
    setAuth(user, accessToken);
    // Subscribe to FCM topics
    await firebaseApi.subscribeToTopics({ token: await getFCMToken(), topics: [] });
    router.replace(user.role === 'teacher' ? ROUTES.TEACHER.HOME : ROUTES.STUDENT.HOME);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.statusCode === 404) toast.error('Không tìm thấy tài khoản');
      else if (error.statusCode === 401) toast.error('Sai mật khẩu');
      else toast.error('Đã xảy ra lỗi. Vui lòng thử lại.');
    }
  }
};
```

### JWT Decode Utility
```typescript
// src/lib/utils/jwt.ts
// Decode JWT payload client-side (no signature verification — for display only)
export function decodeUserFromToken(token: string): User {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return { id: payload.userId, role: payload.role, /* etc */ };
}
```

Note: To get full user data, add a `GET /api/v1/user/me` endpoint in WEB-037, or decode from the token.

## Acceptance Criteria
- [ ] Login with correct credentials → user is stored in Zustand → redirected to correct role home
- [ ] Login with wrong password → toast "Sai mật khẩu"
- [ ] Login with non-existent email → toast "Không tìm thấy tài khoản"
- [ ] `refresh_token` cookie is set as httpOnly after login
- [ ] Page refresh → `AuthProvider` restores session from cookie → user remains logged in
- [ ] Expired cookie → user is not authenticated → middleware redirects to `/login` (WEB-009)
- [ ] Logout → cookie cleared → Zustand cleared → redirect to `/login`
- [ ] Register with duplicate email → error displayed
- [ ] Forgot password: email OTP sent → verified → password changed → redirect to login with toast
- [ ] `accessToken` is never written to `localStorage` or `sessionStorage`

## Testing Requirements
- **Unit tests:**
  - `useAuthStore`: test `setAuth`, `signOut`, `setAccessToken`
  - `authApi.login()`: mock backend + route handler → verify Zustand is updated
  - JWT decode utility: verify correct fields extracted
- **Route Handler tests:**
  - `POST /api/auth/callback`: verify cookie is set with correct attributes
  - `GET /api/auth/refresh`: verify cookie read + backend call + token return
  - `POST /api/auth/logout`: verify cookie deleted
- **E2E (Playwright, optional):**
  - Login → verify redirect → refresh page → verify still logged in → logout → verify on login page

## Definition of Done
- Login, register, and logout fully functional
- Session persists across page refresh
- No token stored in localStorage
- All unit tests pass

## Risks / Notes
- `decodeUserFromToken` is only for hydration — the actual user object from the API is more complete; store the full user from the login response, not just the JWT payload
- Consider a `GET /api/v1/user/me` backend endpoint for a clean user-fetch pattern on refresh (add in WEB-037)
- FCM web push token registration happens in WEB-034, not here — skip FCM setup in the login flow for now
- `fetch('/api/auth/callback')` goes to the Next.js Route Handler, not the Express backend — this is intentional
