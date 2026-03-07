# WEB-015 — Class Session Management

## Objective
Build the Sessions tab within a subject: teachers can view all class sessions, create new sessions, and see session status. Students see their session history with attendance status for each session.

## Background
Each subject has multiple class sessions (buoi hoc). A session has a scheduled time, room, and when active, enables GPS attendance check-in. This page gives both roles a chronological view of all sessions and serves as a gateway to attendance management.

## Scope
- Teacher Sessions tab: `/teacher/classes/[subjectId]/sessions`
  - List all sessions with status, date, time, attendance summary
  - Create session form (date, time, room, GPS coordinates)
  - Cancel session action
- Student Sessions tab: `/student/classes/[subjectId]/sessions`
  - List all sessions with personal attendance status per session
  - Attendance status: present (CM), absent (KP), excused (CP), not recorded
- API: `GET /api/v1/cAttend/getAll?subjectId=<id>`, `POST /api/v1/cAttend/create`, `PATCH /api/v1/cAttend/cancel`

## Out of Scope
- Live attendance dashboard (WEB-019)
- GPS check-in (WEB-020)
- Manual attendance override (WEB-021)
- Absence requests (WEB-022/023)

## Dependencies
- WEB-014 (subject shell — provides `useSubject()` context)
- WEB-004 (API service layer)
- WEB-003 (Table/List, Modal, Button, Badge, Skeleton)

## User Flow Context
- Teacher: Opens subject → Sessions tab → sees all sessions → creates new session
- Student: Opens subject → Sessions tab → sees own attendance per session
- Teacher clicks session row → navigates to live attendance or attendance detail (WEB-018/019)

## Functional Requirements

### Teacher
1. Fetch all sessions: `GET /api/v1/cAttend/getAll?subjectId=<id>`
2. Sorted: upcoming sessions first, then past sessions (desc by date)
3. For each session row: date, time, room, total present/total students, status badge
4. "Tạo buổi học" button opens a creation modal
5. Create form: date (date picker), startTime, endTime, room, latitude, longitude (optional GPS for attendance), notes
6. On create success: invalidate sessions query, show toast
7. Cancel session: `PATCH /api/v1/cAttend/cancel` — with confirmation dialog
8. Click session row → navigate to attendance detail page (WEB-018)
9. Active session highlighted with "Đang diễn ra" badge; button "Mở điểm danh" links to live dashboard

### Student
1. Same fetch: sessions for this subject
2. For each session: show personal attendance status from `AttendRecord`
3. Attendance status badges: "Có mặt" (green), "Vắng" (red), "Có phép" (yellow), "Chưa ghi" (gray)
4. Student can click session → see attendance detail (round-by-round if multiple rounds)
5. No create/cancel actions for students

## UI Requirements

### Teacher Session List
```
[+ Tạo buổi học — right-aligned button]

Table:
┌──────┬────────────────┬────────┬───────────────┬────────┬──────────┐
│  #   │  Ngày          │ Phòng  │ Điểm danh     │ Trạng  │  Hành   │
│      │                │        │ (X/N sinh viên)│ thái  │  động   │
├──────┼────────────────┼────────┼───────────────┼────────┼──────────┤
│  1   │ T2, 06/01/2025 │ A101   │ 28/30         │[Live] │ [Xem]   │
│  2   │ T4, 08/01/2025 │ A101   │ 25/30         │[Kết]  │ [Xem]   │
│  3   │ T2, 13/01/2025 │ A101   │ –/30          │[Sắp]  │ [Xem]   │
└──────┴────────────────┴────────┴───────────────┴────────┴──────────┘
Mobile: card layout instead of table
```

### Session Status Badges
```
Đang diễn ra: bg-success text-white (or success-light variant)
Sắp tới:      bg-primary-light text-primary
Đã kết thúc:  bg-neutral-100 text-neutral-500
Đã hủy:       bg-danger-light text-danger line-through on row
```

### Create Session Modal
```
Title: "Tạo buổi học mới"

[Ngày *]           [Date picker]
[Giờ bắt đầu *]   [Time input]
[Giờ kết thúc *]  [Time input]
[Phòng học]        [Input]
[Ghi chú]          [Textarea]
[Vị trí GPS]       [Toggle — enable to enter lat/lng]
  [Latitude]       [Number input]  (if GPS enabled)
  [Longitude]      [Number input]  (if GPS enabled)

[Hủy]  [Tạo buổi học — primary]
```

### Student Session List
```
Table:
┌──────┬────────────────┬────────┬──────────────────┐
│  #   │  Ngày          │ Phòng  │ Điểm danh của bạn│
├──────┼────────────────┼────────┼──────────────────┤
│  1   │ T2, 06/01/2025 │ A101   │ [Có mặt]         │
│  2   │ T4, 08/01/2025 │ A101   │ [Vắng]           │
│  3   │ T2, 13/01/2025 │ A101   │ [Chưa ghi]       │
└──────┴────────────────┴────────┴──────────────────┘
```

## API Requirements

### Get Sessions
- `GET /api/v1/cAttend/getAll?subjectId=<id>`
- Auth: Bearer token
- Response: `{ cAttends: ClassSession[] }` — includes session status, attendance counts

### Create Session
- `POST /api/v1/cAttend/create`
- Auth: Bearer token (teacher only)
- Body: `{ subjectId, date, startTime, endTime, room?, latitude?, longitude?, notes? }`
- Response: `{ cAttend: ClassSession }`

### Cancel Session
- `PATCH /api/v1/cAttend/cancel`
- Auth: Bearer token (teacher only)
- Body: `{ cAttendId: string }`

## Backend Changes
None.

## Technical Implementation Notes

### Session Data + Attendance Status (Student)
The backend `GET /api/v1/cAttend/getAll` should return sessions. For student attendance status per session, fetch `GET /api/v1/attendRecord/getBySubject?subjectId=<id>` and join on `cAttendId`.

```typescript
// Derive student attendance status per session
function getStudentStatus(
  session: ClassSession,
  records: AttendRecord[]
): 'CM' | 'KP' | 'CP' | null {
  const record = records.find(r => r.cAttendId === session._id);
  return record?.status ?? null;
}
```

### Zod Schema
```typescript
export const createSessionSchema = z.object({
  date: z.string().min(1, 'Ngày là bắt buộc'),
  startTime: z.string().min(1, 'Giờ bắt đầu là bắt buộc'),
  endTime: z.string().min(1, 'Giờ kết thúc là bắt buộc'),
  room: z.string().optional(),
  notes: z.string().optional(),
  enableGps: z.boolean().default(false),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
```

### File Structure
```
src/app/(dashboard)/
├── teacher/classes/[subjectId]/sessions/
│   └── page.tsx
└── student/classes/[subjectId]/sessions/
    └── page.tsx

src/components/features/sessions/
├── TeacherSessionList.tsx
├── StudentSessionList.tsx
├── CreateSessionModal.tsx
├── SessionStatusBadge.tsx
└── CancelSessionDialog.tsx
```

## Acceptance Criteria
- [ ] Teacher sees all sessions sorted by date (upcoming first)
- [ ] Session rows show date, room, attendance count, status badge
- [ ] "Tạo buổi học" opens modal and creates session on submit
- [ ] Cancel session shows confirmation dialog
- [ ] Active session has "Đang diễn ra" badge with link to live dashboard
- [ ] Student sees same session list with personal attendance status
- [ ] Attendance status badges colored correctly per status
- [ ] Empty state when no sessions
- [ ] Loading skeletons while fetching
- [ ] Mobile shows card layout instead of table

## Testing Requirements
- **Component tests:**
  - `SessionStatusBadge`: correct variant for each status
  - `CreateSessionModal`: validates required fields, submits correct payload
  - `getStudentStatus()`: correctly maps records to session
- **Manual QA:**
  - Create a session → verify it appears in list
  - Cancel a session → verify status updates
  - Login as student → verify personal attendance status shows

## Definition of Done
- Teacher can view and create sessions
- Student sees attendance status per session
- Cancel session works with confirmation
- Unit tests pass

## Risks / Notes
- Student attendance status per session requires joining session data with attendance records — ensure both queries are available
- GPS coordinates for session are optional; if provided, they're used for student check-in radius validation (backend)
- The `isActive` field on ClassSession distinguishes a currently-running session from upcoming
