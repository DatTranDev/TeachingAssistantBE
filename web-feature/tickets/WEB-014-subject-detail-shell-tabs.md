# WEB-014 — Subject Detail Shell & Tab Navigation

## Objective
Build the subject detail shell: the layout wrapper for all subject sub-pages, including the subject header (name, code, teacher info), tab navigation bar, and the dynamic route structure. All subject feature pages (attendance, discussion, groups, etc.) render inside this shell.

## Background
Every subject has multiple feature areas accessed via tabs. The shell provides consistent context (which subject we're in) and navigation between features. It uses a dynamic `[subjectId]` route segment and a nested layout so tabs persist across sub-page navigation.

## Scope
- `src/app/(dashboard)/teacher/classes/[subjectId]/layout.tsx` — teacher subject shell
- `src/app/(dashboard)/student/classes/[subjectId]/layout.tsx` — student subject shell
- `SubjectHeader` component — subject name, code, role-specific info, back button
- `SubjectTabs` component — tab nav bar with role-aware tabs
- Subject data fetching: `GET /api/v1/subject/getDetail?subjectId=<id>`
- Pass `subjectId` via context to child components
- Breadcrumb integration: "Lớp học / [Subject Name] / [Tab Name]"

## Out of Scope
- Individual tab page content (covered by WEB-015 through WEB-030)
- Subject settings (WEB-016)
- Student list (WEB-017)

## Dependencies
- WEB-010 (app shell, breadcrumb system)
- WEB-004 (API service layer)
- WEB-003 (Tabs, Avatar, Badge, Skeleton)

## User Flow Context
- User clicks a subject card from timetable or class list → navigates to subject detail
- User switches between tabs without losing subject context
- Breadcrumb shows: "Lớp học / [Subject Name] / [Current Tab]"

## Functional Requirements
1. Layout fetches `GET /api/v1/subject/getDetail?subjectId=<id>` on mount
2. Subject context (subjectId, subject data) available to all child pages via React context
3. SubjectHeader shows: subject name, subject code, teacher name (student view), room, active session indicator
4. Tab navigation — Teacher tabs:
   - "Buổi học" → `/teacher/classes/[id]/sessions`
   - "Điểm danh" → `/teacher/classes/[id]/attendance`
   - "Thảo luận" → `/teacher/classes/[id]/discussion`
   - "Tài liệu" → `/teacher/classes/[id]/documents`
   - "Nhóm" → `/teacher/classes/[id]/groups`
   - "Cài đặt" → `/teacher/classes/[id]/settings`
5. Tab navigation — Student tabs:
   - "Buổi học" → `/student/classes/[id]/sessions`
   - "Điểm danh" → `/student/classes/[id]/attendance`
   - "Thảo luận" → `/student/classes/[id]/discussion`
   - "Tài liệu" → `/student/classes/[id]/documents`
   - "Nhóm" → `/student/classes/[id]/groups`
6. Active tab is highlighted based on current pathname
7. Loading skeleton for subject header while fetching
8. 404 / error state if subject not found or user not authorized

## UI Requirements

### Subject Header
```
[← Quay lại]

[Subject Name — text-2xl font-bold]
[Mã môn: CS101]  [Phòng: A101]  [N sinh viên]
[Giảng viên: Name] (student view only)
[• Đang diễn ra] badge (if active session exists)
```

### Tab Navigation
```
┌─────────────────────────────────────────────────────┐
│ Buổi học | Điểm danh | Thảo luận | Tài liệu | Nhóm │
└─────────────────────────────────────────────────────┘
Active tab: border-b-2 border-primary text-primary font-medium
Inactive: text-neutral-600 hover:text-neutral-900
Scrollable horizontally on mobile
```

### Layout Structure
```
[Subject Header]
[Tab Navigation — sticky top-16 z-20 bg-surface border-b]
[Tab Content — flex-1 overflow-y-auto p-6]
  {children}
```

## API Requirements

### Get Subject Detail
- `GET /api/v1/subject/getDetail?subjectId=<id>`
- Auth: Bearer token
- Response: `{ subject: Subject }` — includes teacher info, student count, settings

## Backend Changes
None.

## Technical Implementation Notes

### Subject Context
```typescript
// src/contexts/SubjectContext.tsx
interface SubjectContextValue {
  subjectId: string;
  subject: Subject | null;
  isLoading: boolean;
}

export const SubjectContext = createContext<SubjectContextValue | null>(null);

export function useSubject() {
  const ctx = useContext(SubjectContext);
  if (!ctx) throw new Error('useSubject must be used within SubjectProvider');
  return ctx;
}
```

### Layout Component
```tsx
// teacher/classes/[subjectId]/layout.tsx
export default function SubjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { subjectId: string };
}) {
  const { data: subject, isLoading } = useQuery({
    queryKey: queryKeys.subjects.detail(params.subjectId),
    queryFn: () => subjectsApi.getDetail(params.subjectId),
  });

  return (
    <SubjectContext.Provider value={{ subjectId: params.subjectId, subject, isLoading }}>
      <div className="flex flex-col h-full">
        <SubjectHeader subject={subject} isLoading={isLoading} />
        <SubjectTabs subjectId={params.subjectId} role="teacher" />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </SubjectContext.Provider>
  );
}
```

### Active Tab Detection
```typescript
// In SubjectTabs
const pathname = usePathname();
const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
```

### File Structure
```
src/app/(dashboard)/
├── teacher/classes/[subjectId]/
│   ├── layout.tsx           # Teacher subject shell
│   ├── sessions/page.tsx    # Placeholder → WEB-015
│   ├── attendance/page.tsx  # Placeholder → WEB-018/021
│   ├── discussion/page.tsx  # Placeholder → WEB-024/025
│   ├── documents/page.tsx   # Placeholder → WEB-027
│   ├── groups/page.tsx      # Placeholder → WEB-028/029
│   └── settings/page.tsx    # Placeholder → WEB-016
└── student/classes/[subjectId]/
    ├── layout.tsx
    ├── sessions/page.tsx
    ├── attendance/page.tsx
    ├── discussion/page.tsx
    ├── documents/page.tsx
    └── groups/page.tsx

src/contexts/
└── SubjectContext.tsx

src/components/features/subjects/
├── SubjectHeader.tsx
├── SubjectHeaderSkeleton.tsx
└── SubjectTabs.tsx
```

### Breadcrumb Integration
The `Topbar` breadcrumb (WEB-010) should read subject name from the `SubjectContext` to show:
"Lớp học / [Subject Name] / [Tab Name]"

Each tab page can set the page title via a shared `usePageTitle` hook or Next.js `generateMetadata`.

## Acceptance Criteria
- [ ] Navigating to `/teacher/classes/[id]` shows subject header and tabs
- [ ] Subject name, code, and info render correctly
- [ ] Correct tabs shown for teacher vs student
- [ ] Active tab is highlighted on current route
- [ ] Switching tabs navigates correctly without full page reload
- [ ] Loading skeleton shows while subject data loads
- [ ] 404 state if subjectId not found
- [ ] `useSubject()` hook available to all child pages
- [ ] Breadcrumb shows subject name + current tab

## Testing Requirements
- **Component tests:**
  - `SubjectTabs`: renders teacher tabs for teacher role, student tabs for student role; active state matches pathname
  - `SubjectHeader`: renders subject name, code, info from props; shows skeleton when loading
  - `useSubject()`: throws error outside provider, returns context inside
- **Manual QA:**
  - Navigate to subject → verify header shows correct subject
  - Click each tab → verify URL changes and tab highlights
  - Reload on a tab page → verify correct tab highlighted

## Definition of Done
- Subject shell renders for both roles
- Tab navigation works
- Subject context available to child components
- Placeholder pages exist for all tabs
- Unit tests pass

## Risks / Notes
- This layout is a Next.js `layout.tsx` — it persists across tab navigation (no remount), which means the subject data fetch runs once and is cached
- The layout must be a client component (`'use client'`) because it uses `useQuery` and `usePathname`
- Consider adding an `error.tsx` sibling to handle 404/403 errors gracefully
