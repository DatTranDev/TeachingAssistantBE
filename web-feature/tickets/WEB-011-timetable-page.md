# WEB-011 — Timetable Page

## Objective
Build the Timetable page for both teacher and student roles. Teachers see all their subjects with upcoming class sessions; students see their enrolled subjects with scheduled sessions. This is the landing/home page after login for both roles.

## Background
The timetable is the central navigation hub — it gives users an at-a-glance view of what classes are upcoming. For teachers it shows subjects they created; for students it shows subjects they have joined. Sessions are sorted by next occurrence.

## Scope
- `/teacher/timetable` — teacher timetable page
- `/student/timetable` — student timetable page
- `TimetableCard` component — single subject card showing subject info + next session time
- `SessionBadge` component — shows session status (upcoming, live, ended)
- Fetch teacher subjects: `GET /api/v1/subject/getAll`
- Fetch student subjects: `GET /api/v1/subject/getAllJoined`
- Fetch sessions per subject: `GET /api/v1/cAttend/getAll?subjectId=<id>`
- Display subjects grouped by day-of-week or sorted by next session
- Empty state when no subjects enrolled/created
- Loading skeleton while fetching

## Out of Scope
- Subject creation (WEB-012)
- Join class (WEB-013)
- Session management (WEB-015)
- Attendance (WEB-018/WEB-020)

## Dependencies
- WEB-010 (app shell)
- WEB-004 (API service layer)
- WEB-003 (UI primitives: Card, Skeleton, EmptyState, Badge)

## User Flow Context
- **UF-04 (Teacher):** After login → land on `/teacher/timetable` → see subject cards
- **UF-05 (Student):** After login → land on `/student/timetable` → see enrolled subjects

## Functional Requirements
1. Teacher page fetches `GET /api/v1/subject/getAll` — returns teacher's created subjects
2. Student page fetches `GET /api/v1/subject/getAllJoined` — returns enrolled subjects
3. For each subject, fetch latest/upcoming sessions from `GET /api/v1/cAttend/getAll?subjectId=<id>` (or batch if API supports)
4. Subjects sorted by: subjects with an active session first, then by next scheduled session date
5. Each card shows: subject name, subject code, teacher name (student view), student count (teacher view), next session info
6. Session status badge: "Đang diễn ra" (live - green), "Sắp tới" (upcoming - blue), "Đã kết thúc" (ended - gray)
7. Clicking a card navigates to `/teacher/classes/[subjectId]` or `/student/classes/[subjectId]`
8. Empty state: "Bạn chưa có lớp học nào" with a CTA button to create/join a class
9. Loading: skeleton cards while data is fetching
10. Page title in breadcrumb: "Thời khóa biểu"

## UI Requirements

### Page Layout
```
[Page Title: "Thời khóa biểu"]
[Subtitle: "X lớp học" — count of subjects]

[Grid: 1 col mobile, 2 col tablet, 3 col desktop]
[TimetableCard] [TimetableCard] [TimetableCard]
...

[EmptyState if no subjects]
```

### TimetableCard
```
┌────────────────────────────────┐
│  [Subject Code]  [Status Badge]│  — flex justify-between
│  [Subject Name — text-lg bold] │
│  [Teacher: Name] (student only)│  — text-sm text-muted
│  [N students] (teacher only)   │
│                                │
│  ─────────────────────────────│
│  [Calendar icon] Next session: │
│  [Day, Date — Month at HH:MM] │
│                                │
│  [→ Xem chi tiết]             │  — ghost button right-aligned
└────────────────────────────────┘
bg-surface border rounded-xl p-5 hover:shadow-md transition
```

### SessionBadge
```
Live:     bg-success-light text-success rounded-full px-2 py-0.5 text-xs
Upcoming: bg-primary-light text-primary rounded-full px-2 py-0.5 text-xs
Ended:    bg-neutral-100 text-neutral-500 rounded-full px-2 py-0.5 text-xs
```

### Empty State
```
[Illustration or icon — Calendar with plus]
"Chưa có lớp học nào"
[CTA: "Tạo lớp học" (teacher) / "Tham gia lớp học" (student)]
→ navigates to /teacher/classes (new class) or /student/classes (join)
```

### Loading State
```
3-6 skeleton cards (same dimensions as TimetableCard)
CardSkeleton: animated pulse on title, subtitle, and session line
```

## API Requirements

### Fetch Teacher Subjects
- `GET /api/v1/subject/getAll`
- Auth: Bearer access token
- Response: `{ subjects: Subject[] }`

### Fetch Student Joined Subjects
- `GET /api/v1/subject/getAllJoined`
- Auth: Bearer access token
- Response: `{ subjects: Subject[] }`

### Fetch Sessions for Subject
- `GET /api/v1/cAttend/getAll?subjectId=<id>`
- Auth: Bearer access token
- Response: `{ cAttends: ClassSession[] }`
- Used to determine next session time and live status

## Backend Changes
None.

## Technical Implementation Notes

### Query Setup
```typescript
// Teacher page
const { data: subjects, isLoading } = useQuery({
  queryKey: queryKeys.subjects.all,
  queryFn: subjectsApi.getAll,
});

// Student page
const { data: subjects, isLoading } = useQuery({
  queryKey: queryKeys.subjects.joined,
  queryFn: subjectsApi.getAllJoined,
});
```

### Session Status Logic
```typescript
function getSessionStatus(session: ClassSession): 'live' | 'upcoming' | 'ended' {
  const now = new Date();
  const start = new Date(session.startTime);
  const end = new Date(session.endTime);
  if (now >= start && now <= end && session.isActive) return 'live';
  if (now < start) return 'upcoming';
  return 'ended';
}

function getNextSession(sessions: ClassSession[]): ClassSession | null {
  const upcoming = sessions
    .filter(s => new Date(s.startTime) > new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  return upcoming[0] ?? null;
}
```

### File Structure
```
src/app/(dashboard)/
├── teacher/
│   └── timetable/
│       └── page.tsx
└── student/
    └── timetable/
        └── page.tsx

src/components/features/timetable/
├── TimetableCard.tsx
├── TimetableCardSkeleton.tsx
└── SessionBadge.tsx
```

### Data Fetching Pattern
```tsx
// page.tsx (server-side prefetch optional, but client-side is fine)
export default function TimetablePage() {
  const { data: subjects, isLoading } = useQuery(...);

  if (isLoading) return <TimetableSkeleton />;

  if (!subjects?.length) return <TimetableEmpty role="teacher" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Thời khóa biểu</h1>
        <p className="text-muted-foreground text-sm mt-1">{subjects.length} lớp học</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {subjects.map(subject => (
          <TimetableCard key={subject._id} subject={subject} />
        ))}
      </div>
    </div>
  );
}
```

## Acceptance Criteria
- [ ] Teacher timetable shows all created subjects
- [ ] Student timetable shows all joined subjects
- [ ] Each card shows subject name, code, and next session info
- [ ] Active session shows "Đang diễn ra" badge in green
- [ ] Upcoming session shows date/time
- [ ] Clicking card navigates to subject detail
- [ ] Empty state renders with correct CTA for each role
- [ ] Loading skeleton shows while data is fetching
- [ ] Page breadcrumb reads "Thời khóa biểu"
- [ ] Grid is responsive: 1/2/3 columns at mobile/tablet/desktop

## Testing Requirements
- **Component tests:**
  - `TimetableCard`: renders subject name, code, badge; clicking navigates
  - `SessionBadge`: renders correct variant for live/upcoming/ended
  - `getNextSession()`: returns earliest future session, null if none
  - `getSessionStatus()`: returns correct status for each time range
- **Manual QA:**
  - Login as teacher with 3+ subjects → verify all cards shown
  - Login as student with 0 subjects → verify empty state
  - Open subject with active session → verify green "Đang diễn ra" badge

## Definition of Done
- Both role pages render with correct data
- Cards navigate to correct subject detail pages
- Responsive layout works at all breakpoints
- Unit tests pass

## Risks / Notes
- Sessions are fetched per subject — if a teacher has many subjects, this causes N+1 requests. Consider displaying "no session data" gracefully if sessions aren't loaded, or optimize by passing session info alongside subject data if backend supports it
- For MVP, fetch sessions lazily inside TimetableCard or accept N+1 as acceptable for initial load
- The `isActive` field on ClassSession determines live status — verify backend sets this correctly
