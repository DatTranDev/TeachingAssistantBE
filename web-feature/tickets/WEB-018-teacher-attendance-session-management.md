# WEB-018 — Teacher Attendance Session Management

## Objective
Build the teacher-facing attendance session control: start/stop attendance rounds within a session, view real-time attendance status as students check in, and end the session. This is the pre-live and post-live view; the live real-time dashboard is WEB-019.

## Background
An attendance session (CAttend) can have multiple rounds. The teacher starts a round (which opens GPS check-in for students), waits for students to check in, then ends the round. Multiple rounds can be opened within a single class session. This page manages that lifecycle.

## Scope
- Session detail page: `/teacher/classes/[subjectId]/sessions/[sessionId]`
- Start attendance round: `POST /api/v1/cAttend/startRound`
- End attendance round: `POST /api/v1/cAttend/endRound`
- View attendance records per round: `GET /api/v1/attendRecord/getBySession?cAttendId=<id>`
- Mark session complete: `PATCH /api/v1/cAttend/complete`
- Real-time update via Socket.IO: listen for `newAttendRecord` event

## Out of Scope
- Live attendance dashboard UI (WEB-019 — the visual real-time view)
- Manual override of individual records (WEB-021)
- Student check-in (WEB-020)

## Dependencies
- WEB-014 (subject shell, `useSubject()`)
- WEB-005 (Socket.IO client)
- WEB-004 (API service layer)
- WEB-003 (Button, Badge, Table, Alert)

## User Flow Context
1. Teacher opens session detail from Sessions tab
2. Clicks "Bắt đầu điểm danh" → opens attendance round
3. Students check in via GPS (WEB-020)
4. Teacher sees student names appearing in real-time as they check in
5. Teacher clicks "Kết thúc vòng" → round ends
6. Teacher can start additional rounds
7. Teacher clicks "Hoàn thành buổi học" → session marked complete

## Functional Requirements
1. Fetch session detail: `GET /api/v1/cAttend/getDetail?cAttendId=<id>`
2. Fetch attendance records: `GET /api/v1/attendRecord/getBySession?cAttendId=<id>`
3. Show session info: date, time, room, current status
4. If no active round: show "Bắt đầu điểm danh" button
5. If active round: show real-time attendee list + "Kết thúc vòng" button
6. Round status indicator: "Đang mở - [HH:MM]" countdown or elapsed time
7. Real-time: subscribe to Socket.IO `newAttendRecord` event → update attendance list without refetch
8. Attendance records table: student name, check-in time, round number, status (CM/KP)
9. Students not yet checked in shown as "Chưa điểm danh" (pending)
10. "Hoàn thành buổi học" button available when no active round → marks session complete
11. "Xem trực tiếp" link → navigates to WEB-019 live dashboard

## UI Requirements

### Session Detail Header
```
[← Quay lại Sessions]

[Buổi học #N]  [Status badge]
[Ngày: T2, 06/01/2025]  [Phòng: A101]  [Thời gian: 07:30 - 09:30]

[Bắt đầu điểm danh — primary] (when no active round)
OR
[Vòng X đang mở — Đã qua 5:32]  [Kết thúc vòng — danger]  [Xem trực tiếp →]
(when active round)
```

### Attendance Records Table
```
[Tổng: 28/30 sinh viên đã điểm danh]

Table:
┌──────────────────┬──────────┬────────────┬──────────┐
│ Sinh viên        │ Mã SV    │ Giờ check-in│ Trạng thái│
├──────────────────┼──────────┼────────────┼──────────┤
│ Nguyễn Văn A     │ SV001    │ 07:31      │ [CM]     │
│ Trần Thị B       │ SV002    │ –          │ [Chưa]   │
└──────────────────┴──────────┴────────────┴──────────┘
```

### Round Controls (Active)
```
┌─────────────────────────────────────────────┐
│  Vòng 1 đang mở  •  28/30 đã điểm danh     │
│  Đã mở lúc 07:30 • Đang chờ 2 sinh viên    │
│                                             │
│  [Kết thúc vòng — danger]  [Xem trực tiếp →]│
└─────────────────────────────────────────────┘
bg-primary-light border border-primary rounded-xl
```

## API Requirements

### Get Session Detail
- `GET /api/v1/cAttend/getDetail?cAttendId=<id>`
- Response: `{ cAttend: ClassSession }` — includes rounds, status, GPS info

### Get Attendance Records
- `GET /api/v1/attendRecord/getBySession?cAttendId=<id>`
- Response: `{ records: AttendRecord[] }` — includes student info, check-in time

### Start Round
- `POST /api/v1/cAttend/startRound`
- Body: `{ cAttendId: string }`
- Response: `{ round: number, openTime: string }`

### End Round
- `POST /api/v1/cAttend/endRound`
- Body: `{ cAttendId: string }`

### Complete Session
- `PATCH /api/v1/cAttend/complete`
- Body: `{ cAttendId: string }`

## Backend Changes
None.

## Technical Implementation Notes

### Socket.IO Real-time Updates
```typescript
// Join session room on mount
const socket = useSocketContext();

useEffect(() => {
  socket.emit('joinSession', { cAttendId });

  socket.on('newAttendRecord', (record: AttendRecord) => {
    queryClient.setQueryData(
      queryKeys.attendance.bySession(cAttendId),
      (old: AttendRecord[] | undefined) => {
        if (!old) return [record];
        const exists = old.find(r => r.userId === record.userId);
        if (exists) return old.map(r => r.userId === record.userId ? record : r);
        return [...old, record];
      }
    );
  });

  return () => {
    socket.off('newAttendRecord');
    socket.emit('leaveSession', { cAttendId });
  };
}, [cAttendId]);
```

### Round Timer
```typescript
const [elapsed, setElapsed] = useState(0);

useEffect(() => {
  if (!activeRound) return;
  const interval = setInterval(() => {
    const diff = Math.floor((Date.now() - new Date(activeRound.openTime).getTime()) / 1000);
    setElapsed(diff);
  }, 1000);
  return () => clearInterval(interval);
}, [activeRound]);

const formatElapsed = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
```

### File Structure
```
src/app/(dashboard)/teacher/classes/[subjectId]/sessions/[sessionId]/
└── page.tsx

src/components/features/attendance/
├── SessionDetailHeader.tsx
├── RoundControls.tsx
├── AttendanceRecordsTable.tsx
└── SessionCompleteButton.tsx
```

## Acceptance Criteria
- [ ] Session detail shows date, time, room, status
- [ ] "Bắt đầu điểm danh" starts a new round
- [ ] Active round shows elapsed timer
- [ ] Student check-ins appear in real-time via Socket.IO
- [ ] "Kết thúc vòng" ends the active round
- [ ] "Hoàn thành buổi học" marks session complete
- [ ] "Xem trực tiếp" navigates to live dashboard (WEB-019)
- [ ] Attendance records table shows all students with status
- [ ] Present count and pending count displayed

## Testing Requirements
- **Component tests:**
  - `RoundControls`: renders start/end buttons based on round status; timer increments
  - `AttendanceRecordsTable`: renders records; pending students shown
  - Socket.IO mock: verify `newAttendRecord` updates records list
- **Manual QA:**
  - Start round → student checks in (WEB-020) → verify record appears in real-time
  - End round → verify round status changes
  - Complete session → verify session status changes

## Definition of Done
- Teacher can start/end attendance rounds
- Real-time check-in updates work via Socket.IO
- Session can be marked complete
- Unit tests pass

## Risks / Notes
- Socket.IO event name for attendance is `newAttendRecord` per backend `app.js` — verify exact event name
- The teacher needs to be in the socket room for the session to receive events; emit `joinSession` on mount
- `startRound` may fail if a round is already active — handle 409 error gracefully
