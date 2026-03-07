# WEB-019 — Teacher Live Attendance Dashboard

## Objective
Build the real-time live attendance dashboard for teachers: a full-screen view during an active attendance round showing a visual grid of students with live check-in status, attendance count progress, and round controls. This is the focal point during a class session.

## Background
When a teacher opens an attendance round, they need a dedicated view to monitor who has checked in in real-time. The mobile app has a similar screen. The web version should be visually rich — a student grid where each tile turns green as students check in, with a progress counter at the top.

## Scope
- Route: `/teacher/classes/[subjectId]/sessions/[sessionId]/live`
- Student grid with live check-in status (green = checked in, gray = pending)
- Progress bar: "X / N sinh viên đã điểm danh"
- Round status + elapsed timer
- Start/end round controls (mirrors WEB-018 but in full-screen context)
- Real-time via Socket.IO: `newAttendRecord` event
- Auto-redirect to WEB-018 if no active session exists

## Out of Scope
- Manual override (WEB-021)
- Session management controls beyond start/end round (WEB-018)

## Dependencies
- WEB-018 (session management logic and APIs)
- WEB-005 (Socket.IO client)
- WEB-004 (API service layer)
- WEB-003 (Avatar, Badge, Progress, Button)

## User Flow Context
1. Teacher clicks "Xem trực tiếp" from WEB-018 session detail
2. Full-screen grid loads with all students
3. As students check in, tiles animate to green
4. Teacher monitors progress; ends round when satisfied
5. Teacher can navigate back to session detail

## Functional Requirements
1. Fetch enrolled students + current attendance records on mount
2. Combine: students without records = pending; students with records = checked in
3. Subscribe to Socket.IO `newAttendRecord` → animate tile to checked-in state
4. Progress bar: `checkedIn / totalStudents`
5. Counter display: "28 / 30 — 93% đã điểm danh"
6. Round timer: elapsed since round opened (MM:SS)
7. "Kết thúc vòng" button → ends round → tiles freeze
8. After round ends, show summary: total CM, total KP, list of absent students
9. "Bắt đầu vòng mới" and "Hoàn thành buổi học" available after round ends
10. Auto-redirect to session detail if no active session found (not in a class)

## UI Requirements

### Layout (Full-screen within app shell)
```
┌────────────────────────────────────────────────────────┐
│  [← Buổi học]  Vòng 1 đang mở • 05:32  [Kết thúc vòng]│
│                                                        │
│  [Progress bar ████████████░░░░ 28/30 — 93%]          │
│                                                        │
│  Grid 4-6 cols (depends on screen width):              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                 │
│  │ [✓]  │ │ [✓]  │ │ [?]  │ │ [✓]  │                 │
│  │ Name │ │ Name │ │ Name │ │ Name │                 │
│  └──────┘ └──────┘ └──────┘ └──────┘                 │
│  ┌──────┐ ...                                          │
│                                                        │
│  Checked in (green): bg-success/10 border-success      │
│  Pending (gray):     bg-neutral-50 border-neutral-200  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Student Tile
```
Pending:
┌──────────┐
│  [Avatar]│
│  Name    │  text-xs truncate
│  SV001   │  text-xs text-muted
└──────────┘
border rounded-xl p-2 bg-neutral-50

Checked-in (animated transition):
┌──────────┐
│  [Avatar]│
│  ✓ Name  │  text-xs text-success font-medium
│  07:31   │  check-in time
└──────────┘
border-success bg-success/10 shadow-sm
```

### Progress Bar
```
[████████████░░░░░░]  28 / 30 sinh viên đã điểm danh  (93%)
h-2 rounded-full bg-success (filled) / bg-neutral-200 (track)
```

### Post-Round Summary (after ending round)
```
┌─────────────────────────────────────────────────┐
│  Vòng 1 kết thúc                                │
│  ✓ 28 Có mặt   ✗ 2 Vắng                        │
│                                                 │
│  Sinh viên vắng:                                │
│  • Trần Văn X (SV010)                           │
│  • Lê Thị Y (SV022)                             │
│                                                 │
│  [Bắt đầu vòng mới]  [Hoàn thành buổi học]     │
└─────────────────────────────────────────────────┘
```

## API Requirements
Same as WEB-018:
- `GET /api/v1/cAttend/getDetail?cAttendId=<id>`
- `GET /api/v1/attendRecord/getBySession?cAttendId=<id>`
- `POST /api/v1/cAttend/endRound`
- `POST /api/v1/cAttend/startRound`
- `PATCH /api/v1/cAttend/complete`

Plus enrolled students list from `GET /api/v1/subject/getStudents?subjectId=<id>`

## Backend Changes
None.

## Technical Implementation Notes

### Student Grid State
```typescript
interface StudentTile {
  userId: string;
  name: string;
  userCode: string;
  avatar?: string;
  checkedIn: boolean;
  checkInTime?: string;
}

const [tiles, setTiles] = useState<StudentTile[]>([]);

// Initialize from enrolled students + existing records
useEffect(() => {
  if (!students || !records) return;
  setTiles(students.map(s => ({
    ...s,
    checkedIn: records.some(r => r.userId === s.userId && r.status === 'CM'),
    checkInTime: records.find(r => r.userId === s.userId)?.createdAt,
  })));
}, [students, records]);

// Real-time update
socket.on('newAttendRecord', (record: AttendRecord) => {
  setTiles(prev => prev.map(t =>
    t.userId === record.userId
      ? { ...t, checkedIn: true, checkInTime: record.createdAt }
      : t
  ));
});
```

### Animation on Check-in
```tsx
// Use framer-motion or CSS transition for tile flip
<motion.div
  key={tile.userId}
  animate={{ backgroundColor: tile.checkedIn ? 'rgb(var(--success-light))' : 'rgb(var(--neutral-50))' }}
  transition={{ duration: 0.3 }}
  className={cn('border rounded-xl p-2 text-center', tile.checkedIn && 'border-success')}
>
```

Or use plain CSS `transition-colors duration-300` if framer-motion not installed.

### Auto-redirect
```typescript
useEffect(() => {
  if (!sessionLoading && !session?.isActive) {
    router.replace(`/teacher/classes/${subjectId}/sessions/${sessionId}`);
  }
}, [session, sessionLoading]);
```

### File Structure
```
src/app/(dashboard)/teacher/classes/[subjectId]/sessions/[sessionId]/live/
└── page.tsx

src/components/features/attendance/live/
├── LiveDashboard.tsx
├── StudentGrid.tsx
├── StudentTile.tsx
├── AttendanceProgress.tsx
└── RoundSummary.tsx
```

## Acceptance Criteria
- [ ] Student grid shows all enrolled students
- [ ] Pending students show gray tiles
- [ ] Student checking in (via WEB-020) causes tile to turn green with check-in time
- [ ] Progress bar updates in real-time
- [ ] Round timer shows elapsed time
- [ ] "Kết thúc vòng" ends round, shows summary
- [ ] Summary shows CM and KP counts with absent student names
- [ ] "Bắt đầu vòng mới" and "Hoàn thành buổi học" available after round ends
- [ ] Redirects to session detail if not in active session

## Testing Requirements
- **Component tests:**
  - `StudentGrid`: renders correct tiles; updates when `checkedIn` changes
  - `AttendanceProgress`: shows correct percentage and count
  - Socket.IO mock: verify tile updates on `newAttendRecord`
- **Manual QA (integration):**
  - Teacher opens live dashboard → student checks in on mobile/WEB-020 → verify tile turns green immediately
  - End round → verify summary shows correct absent students
  - Navigate back → verify returns to session detail

## Definition of Done
- Live grid renders all students
- Real-time check-in updates work
- Round controls function correctly
- Post-round summary shows
- Unit tests pass

## Risks / Notes
- This page may have many students (30-100) in the grid; ensure performance with `React.memo` on `StudentTile`
- Socket.IO event timing: if student checks in just before teacher opens the live page, ensure initial records fetch captures it (not just socket events)
- Framer Motion adds ~30KB to bundle — consider using plain CSS transitions to minimize bundle size if not already installed
