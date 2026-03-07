# WEB-010 — App Shell Layout & Navigation

## Objective
Build the authenticated application shell: the persistent sidebar navigation, topbar with notifications bell and user avatar, mobile bottom tab bar, breadcrumb system, and the role-aware navigation structure. This layout wraps all dashboard pages and provides consistent navigation for both teachers and students.

## Background
Every authenticated page lives inside this shell. It must adapt to both roles (different nav items), respond to all screen sizes, and remain accessible. Getting the shell right here prevents structural changes in every subsequent feature ticket.

## Scope
- `(dashboard)/layout.tsx` — root dashboard layout wrapping shell + AuthGuard
- `Sidebar` component — desktop left sidebar (240px), role-aware nav items, collapsible on tablet
- `Topbar` component — page title/breadcrumb, notification bell with unread count badge, user avatar with dropdown (profile, logout)
- `MobileNav` component — bottom tab bar for mobile (<1024px)
- `NavItem` component — single navigation link with icon, label, active state
- Breadcrumb component — dynamic based on current route
- Subject context: navigation within a subject uses `[subjectId]` dynamic segment; shell passes subjectId context
- Notification unread count: `GET /api/v1/notification/get` (count only, lazy-loaded)
- Sidebar collapse state persisted in localStorage

## Out of Scope
- Individual page content
- Notification list (WEB-033)
- Profile page (WEB-035)

## Dependencies
- WEB-008 (auth store — need `user` and `signOut`)
- WEB-003 (UI primitives: Avatar, DropdownMenu, Badge, Spinner)
- WEB-002 (design system)

## User Flow Context
This shell appears in every authenticated user flow. It enables navigation between all features and provides the notification entry point.

## Functional Requirements
1. `(dashboard)/layout.tsx` wraps with `AuthGuard` (shows spinner until auth hydrated)
2. Sidebar is fixed on the left on desktop (≥1024px), hidden on mobile
3. Mobile bottom tab bar shows on <1024px with 4-5 most important items per role
4. Tablet (768–1023px): sidebar collapses to icon-only mode (64px wide)
5. Active nav item is highlighted with primary color background + text
6. User avatar in sidebar bottom (desktop) or topbar (mobile) opens dropdown: "Hồ sơ", "Đăng xuất"
7. Notification bell shows badge with unread count (max "99+")
8. Subject-level pages show a secondary nav (tabs within subject layout — implemented in WEB-014)
9. Sidebar collapse state saved in `localStorage`
10. All nav links use `next/link` with prefetching

## UI Requirements

### Teacher Navigation Items
```
Main nav:
  📅 Thời khóa biểu     /teacher/timetable
  📚 Lớp học             /teacher/classes
  🔔 Thông báo          /teacher/notifications

Bottom (sidebar):
  👤 Avatar → dropdown (Hồ sơ, Đăng xuất)
```

### Student Navigation Items
```
Main nav:
  📅 Thời khóa biểu     /student/timetable
  📚 Lớp học             /student/classes
  🔔 Thông báo          /student/notifications

Bottom (sidebar):
  👤 Avatar → dropdown (Hồ sơ, Đăng xuất)
```

### Sidebar Layout (Desktop)
```
┌─────────────────────────┐
│  [Logo]  Teaching Asst  │  h-16 border-b
├─────────────────────────┤
│                         │
│  📅 Thời khóa biểu     │  active: bg-primary-light text-primary rounded-lg
│  📚 Lớp học             │
│  🔔 Thông báo          │  + badge if unread
│                         │
├─────────────────────────┤
│  [Avatar] [Name] [↕]   │  hover: dropdown
└─────────────────────────┘

Width: 240px (expanded), 64px (collapsed — icons only with tooltip)
Collapse toggle: arrow button at top-right of sidebar
```

### Topbar Layout
```
┌───────────────────────────────────────────────────┐
│  [≡ menu (mobile)]  [Breadcrumb]     [🔔] [Avatar]│
└───────────────────────────────────────────────────┘
Height: 64px, border-b, bg-surface, sticky top-0 z-30
```

### Mobile Bottom Nav
```
┌─────┬─────┬─────┬─────┐
│  📅 │  📚 │  🔔 │  👤 │
│Lịch│Lớp │Notif│Profile│
└─────┴─────┴─────┴─────┘
Fixed bottom, h-16, border-t, bg-surface
Active tab: text-primary
```

### NavItem Component
```tsx
// Active: bg-primary-light text-primary font-medium
// Inactive: text-neutral-600 hover:bg-neutral-100
// Structure: flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
// Collapsed mode: w-10 h-10 justify-center (icon only) + Tooltip on hover
```

### Breadcrumb
```
Lớp học / [Subject Name] / Điểm danh
         (linked)          (current, not linked)
Separator: / (text-muted)
```

## API Requirements

### Notification Unread Count
- `GET /api/v1/notification/get` — returns all notifications; client counts `isRead: false`
- Query: `useQuery({ queryKey: queryKeys.notifications.all, queryFn: notificationsApi.getAll, refetchInterval: 30000 })`
- Show badge only if unread count > 0

## Backend Changes
None for this ticket.

## Technical Implementation Notes

### Dashboard Layout (`src/app/(dashboard)/layout.tsx`)
```tsx
import { AuthGuard } from '@/components/shared/AuthGuard';
import { AppShell } from '@/components/shared/AppShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
```

### AppShell Component
```tsx
'use client';
// Manages sidebar open/collapsed state
// Uses useAuth() for user/role
// Renders: Sidebar + main content column (Topbar + children)
// Responsive: lg:flex (sidebar visible) vs mobile (bottom nav + topbar only)
```

### File Structure
```
src/components/shared/
├── AppShell.tsx
├── Sidebar.tsx
├── Topbar.tsx
├── MobileNav.tsx
├── NavItem.tsx
├── Breadcrumb.tsx
├── UserMenu.tsx      # Avatar dropdown
└── AuthGuard.tsx     # (from WEB-009)
```

### Navigation Config
```typescript
// src/constants/navigation.ts
import { BookOpen, Bell, Calendar } from 'lucide-react';

export const teacherNavItems = [
  { label: 'Thời khóa biểu', href: '/teacher/timetable', icon: Calendar },
  { label: 'Lớp học', href: '/teacher/classes', icon: BookOpen },
  { label: 'Thông báo', href: '/teacher/notifications', icon: Bell, showBadge: true },
];

export const studentNavItems = [
  { label: 'Thời khóa biểu', href: '/student/timetable', icon: Calendar },
  { label: 'Lớp học', href: '/student/classes', icon: BookOpen },
  { label: 'Thông báo', href: '/student/notifications', icon: Bell, showBadge: true },
];
```

### Active State Detection
```typescript
// Use usePathname() from next/navigation
// NavItem is active if pathname === href OR pathname.startsWith(href + '/')
```

### Sidebar Collapse Persistence
```typescript
const [collapsed, setCollapsed] = useState(() => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('sidebar-collapsed') === 'true';
});

const toggleCollapse = () => {
  const next = !collapsed;
  setCollapsed(next);
  localStorage.setItem('sidebar-collapsed', String(next));
};
```

### Responsive Strategy
```tsx
// AppShell structure:
<div className="flex h-screen overflow-hidden">
  {/* Sidebar — hidden on mobile */}
  <aside className="hidden lg:flex flex-col w-60 border-r bg-surface">
    <Sidebar />
  </aside>

  {/* Main column */}
  <div className="flex-1 flex flex-col overflow-hidden">
    <Topbar />
    <main className="flex-1 overflow-y-auto p-6 pb-20 lg:pb-6">
      {children}
    </main>
    {/* Bottom nav — visible on mobile only */}
    <MobileNav className="lg:hidden" />
  </div>
</div>
```

### Icon Library
```bash
npm install lucide-react
```
Use Lucide icons throughout — consistent, tree-shakeable, TypeScript-friendly.

## Acceptance Criteria
- [ ] Sidebar renders for authenticated users with role-correct navigation items
- [ ] Active nav item is highlighted on the correct route
- [ ] Sidebar collapses to icon-only on tablet, hides on mobile
- [ ] Bottom tab bar renders on mobile with correct items
- [ ] Notification bell shows unread count badge when notifications exist
- [ ] User avatar dropdown has "Hồ sơ" and "Đăng xuất" items
- [ ] "Đăng xuất" calls signOut and redirects to `/login`
- [ ] Breadcrumb shows current location accurately
- [ ] Sidebar collapse state persists across page refresh
- [ ] All nav links navigate correctly without full page reload
- [ ] Layout is accessible: all interactive elements focusable via keyboard

## Testing Requirements
- **Component tests:**
  - `NavItem`: renders with correct active class when `isActive=true`
  - `Sidebar`: renders teacher nav for teacher role, student nav for student role
  - `Topbar`: renders notification badge when `unreadCount > 0`
  - `UserMenu`: clicking "Đăng xuất" calls `signOut`
- **Manual QA:**
  - At 375px: sidebar hidden, bottom nav visible
  - At 768px: sidebar icon-only, no bottom nav
  - At 1280px: full sidebar visible
  - Keyboard: Tab through sidebar items, Enter to navigate
  - Notification badge: mock 3 unread notifications → verify "3" shows

## Definition of Done
- Shell renders correctly for both roles
- All responsive breakpoints work
- Navigation is functional
- Unit tests pass

## Risks / Notes
- The notification count refetchInterval of 30s keeps the count reasonably fresh without polling too aggressively
- Avoid making the shell a Server Component — it uses auth state, localStorage, and event handlers
- Lucide React v0.400+ is recommended — ensure tree-shaking is working (import individual icons, not the whole package)
- The `pb-20 lg:pb-6` bottom padding on main content accounts for the mobile bottom nav bar
