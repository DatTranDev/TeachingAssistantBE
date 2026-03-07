# WEB-001 — Next.js Project Scaffold & Project Configuration

## Objective
Bootstrap the Next.js web application with App Router, TypeScript strict mode, Tailwind CSS, ESLint, Prettier, path aliases, environment variable management, and the complete folder structure that all subsequent tickets will build upon.

## Background
This is the foundational ticket. Nothing else can be implemented until the project scaffold exists. It defines the folder conventions, tooling standards, and configuration that all 36 subsequent tickets must follow. Getting this right prevents structural debt from accumulating.

## Scope
- Initialize Next.js 14+ project with App Router (`create-next-app`)
- Configure TypeScript in strict mode (`tsconfig.json`)
- Configure Tailwind CSS (`tailwind.config.ts` + `globals.css`)
- Configure ESLint with Next.js + TypeScript rules
- Configure Prettier with consistent formatting rules
- Set up absolute path aliases (`@/` → `src/`)
- Create complete folder structure (empty index files as placeholders)
- Configure environment variable schema with validation
- Set up `next.config.ts` with security headers and image domain allowlist
- Add `.env.example` with all required variable keys
- Configure `package.json` scripts: `dev`, `build`, `start`, `lint`, `format`, `test`
- Add `README.md` with local setup instructions

## Out of Scope
- Any UI components
- Any API calls
- Authentication
- Any feature implementation
- Design system tokens (WEB-002)

## Dependencies
- None (this is the root ticket)

## User Flow Context
This ticket has no direct user flow. It enables all user flows by providing the application foundation.

## Functional Requirements
1. `npx create-next-app` with App Router, TypeScript, Tailwind, ESLint selected
2. TypeScript `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
3. Path alias `@/*` maps to `src/*`
4. Tailwind configured with `content` paths covering all `src/**/*.{ts,tsx}` files
5. ESLint extends `next/core-web-vitals`, `@typescript-eslint/recommended`
6. Prettier: single quotes, 2-space indent, trailing commas ES5, 100 char print width, semicolons
7. `.prettierrc` and `.eslintrc.json` committed
8. All env vars accessed only through a validated `src/lib/env.ts` file using Zod
9. `next.config.ts` includes:
   - `images.domains` allowlist for Firebase Storage
   - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` security headers
   - `reactStrictMode: true`
10. Git repository initialized with `.gitignore` covering `node_modules`, `.env.local`, `.next`, `out`

## UI Requirements
No UI in this ticket.

## API Requirements
No API calls in this ticket.

## Backend Changes
None. This is a frontend-only ticket.

## Technical Implementation Notes

### Required Folder Structure
```
src/
├── app/
│   ├── (auth)/
│   │   └── .gitkeep
│   ├── (dashboard)/
│   │   └── .gitkeep
│   ├── api/
│   │   └── auth/
│   │       └── .gitkeep
│   ├── globals.css
│   ├── layout.tsx          # Root layout (html, body, providers)
│   └── page.tsx            # Root redirect (to /login or /dashboard)
├── components/
│   ├── ui/
│   ├── shared/
│   ├── teacher/
│   └── student/
├── hooks/
├── lib/
│   ├── api/
│   ├── socket/
│   ├── utils/
│   └── env.ts
├── providers/
├── stores/
├── types/
│   ├── api.ts
│   ├── domain.ts
│   └── socket.ts
└── constants/
    └── routes.ts
```

### Environment Variables Schema (`src/lib/env.ts`)
```typescript
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_SOCKET_URL: z.string().url(),
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: z.string().optional(),
  JWT_SECRET: z.string().min(32),              // server-only
  REFRESH_TOKEN_COOKIE_SECRET: z.string(),     // server-only
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
  REFRESH_TOKEN_COOKIE_SECRET: process.env.REFRESH_TOKEN_COOKIE_SECRET,
});
```

### Root Layout
```tsx
// src/app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="bg-neutral-50 text-neutral-900 antialiased">
        {/* Providers added in WEB-008 */}
        {children}
      </body>
    </html>
  );
}
```

### `.env.example`
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
JWT_SECRET=your-very-long-secret-here
REFRESH_TOKEN_COOKIE_SECRET=another-secret
```

### `routes.ts` constants
```typescript
export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  TEACHER: {
    HOME: '/teacher/timetable',
    CLASSES: '/teacher/classes',
    CLASS: (id: string) => `/teacher/classes/${id}`,
    NOTIFICATIONS: '/teacher/notifications',
    PROFILE: '/teacher/profile',
  },
  STUDENT: {
    HOME: '/student/timetable',
    CLASSES: '/student/classes',
    CLASS: (id: string) => `/student/classes/${id}`,
    NOTIFICATIONS: '/student/notifications',
    PROFILE: '/student/profile',
  },
} as const;
```

### Domain Types Skeleton (`src/types/domain.ts`)
Define TypeScript interfaces for all backend domain entities:
`User`, `Subject`, `ClassSession`, `CAttend`, `AttendRecord`, `Discussion`, `Reaction`, `Review`, `Group`, `GroupMessage`, `Channel`, `Post`, `Document`, `Notification`, `AbsenceRequest`

Base these exactly on the backend Mongoose models documented in the analysis.

## Acceptance Criteria
- [ ] `npm run dev` starts without errors
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run format` formats files without conflicts
- [ ] TypeScript strict mode enabled; `tsc --noEmit` passes
- [ ] Path alias `@/components/ui` resolves correctly
- [ ] `src/lib/env.ts` throws at startup if required env vars are missing
- [ ] Folder structure matches the specification exactly
- [ ] `.env.example` documents all required variables
- [ ] `src/types/domain.ts` defines all 15+ domain entity types

## Testing Requirements
- **Manual:** Start dev server, verify no console errors
- **Manual:** Remove a required env var, verify startup throws with clear message
- **Manual:** Run `tsc --noEmit`, expect 0 errors
- **Manual:** Run `eslint src/`, expect 0 errors, 0 warnings
- **Unit:** Write a test for `src/lib/env.ts` that confirms Zod throws on invalid/missing vars

## Definition of Done
- Project initializes cleanly from `npm install && npm run dev`
- All config files committed and passing lint/type checks
- Folder structure matches spec with no extra files

## Risks / Notes
- Choose `src/` directory layout (not root layout) for clean separation
- Ensure `next/font` is used for Inter — do not use a `<link>` tag in `<head>`
- Keep `JWT_SECRET` and `REFRESH_TOKEN_COOKIE_SECRET` as server-only vars (no `NEXT_PUBLIC_` prefix) to prevent client exposure
- `exactOptionalPropertyTypes` may cause friction with some libraries — keep but document that some third-party types may need `| undefined` adjustments
