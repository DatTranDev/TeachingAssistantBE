# WEB-020 — Student GPS Attendance Check-in

## Objective
Build the student GPS attendance check-in feature: when an attendance round is open for their subject, students can check in by verifying their GPS location is within the required radius of the classroom. The check-in triggers a real-time update visible on the teacher's live dashboard.

## Background
Attendance is verified via GPS proximity. The student's device browser requests location permission, gets coordinates, and the backend calculates distance from the classroom GPS point using the Haversine formula. If within radius, the attendance is recorded as "CM" (present). This replaces QR/manual entry and is the primary check-in method.

## Scope
- Student attendance page: `/student/classes/[subjectId]/attendance`
- Active round detection: show "Điểm danh đang mở" when a round is active
- GPS check-in button: request browser location → send to API
- Check-in result: success (CM) / already checked in / outside radius / no active round
- Real-time round status via Socket.IO: listen for round open/close events
- Show personal attendance history per session at the bottom

## Out of Scope
- Absence request (WEB-022)
- Teacher live dashboard (WEB-019)
- Manual override (WEB-021)

## Dependencies
- WEB-014 (subject shell, `useSubject()`)
- WEB-005 (Socket.IO client)
- WEB-004 (API service layer)
- WEB-003 (Button, Alert, Badge, Spinner)

## User Flow Context
1. Student is in class, teacher opens attendance round
2. Student opens app → Attendance tab → sees "Điểm danh đang mở"
3. Student taps "Điểm danh ngay" → browser requests location permission
4. If permission granted: coordinates sent to API → success toast "Điểm danh thành công!"
5. If outside radius: error "Bạn đang ở ngoài khu vực điểm danh"
6. If permission denied: error "Vui lòng cho phép truy cập vị trí"

## Functional Requirements
1. Fetch current session + active round status on page load
2. Subscribe to Socket.IO events for round open/close to update UI without polling
3. Show prominent "Điểm danh đang mở" card when active round exists
4. Show "Không có vòng điểm danh nào đang mở" when no active round
5. Check-in button calls `navigator.geolocation.getCurrentPosition()`
6. On location success: `POST /api/v1/attendRecord/checkin` with `{ cAttendId, latitude, longitude }`
7. API response:
   - Success: toast "Điểm danh thành công!" + update personal record
   - 400 (outside radius): toast.error "Bạn đang ở ngoài khu vực điểm danh"
   - 409 (already checked in): toast.info "Bạn đã điểm danh cho vòng này"
   - 403 (round closed): toast.error "Vòng điểm danh đã kết thúc"
8. Personal attendance summary at bottom: all sessions with status per session
9. Loading state on check-in button while getting location + submitting
10. If no sessions created yet: empty state

## UI Requirements

### Active Round Card (when round is open)
```
┌──────────────────────────────────────────────────────┐
│  🟢 Điểm danh đang mở                               │
│  Buổi học #N — Vòng X                               │
│  Giảng viên đã mở lúc [HH:MM]                       │
│                                                      │
│  [Điểm danh ngay — primary large button full-width]  │
│                                                      │
│  Vị trí của bạn sẽ được sử dụng để xác nhận.        │
└──────────────────────────────────────────────────────┘
border-2 border-success bg-success/5 rounded-2xl p-6
```

### No Active Round State
```
┌──────────────────────────────────────────────────┐
│  ⏸ Không có điểm danh đang mở                   │
│  Chờ giảng viên mở vòng điểm danh.              │
└──────────────────────────────────────────────────┘
bg-neutral-50 border-dashed border-2 rounded-2xl p-6 text-center
```

### Already Checked In State
```
┌──────────────────────────────────────────────────┐
│  ✓ Đã điểm danh — [HH:MM]                       │
│  Vòng X — Có mặt                                 │
└──────────────────────────────────────────────────┘
border-success bg-success/5
```

### Check-in Button States
```
Default:   "Điểm danh ngay" (location icon)
Loading:   [Spinner] "Đang lấy vị trí..." (disabled)
Submitting:[Spinner] "Đang xử lý..." (disabled)
Success:   → becomes "Already checked in" state above
```

### Location Permission Denied Alert
```
[Alert — warning variant]
"Trình duyệt bị chặn truy cập vị trí."
"Vào Cài đặt trình duyệt → Cho phép truy cập vị trí để điểm danh."
```

### Personal Attendance History (below check-in card)
```
[Lịch sử điểm danh — Section title]

Table (same as WEB-015 student view):
┌──────┬────────────────┬──────────────────┐
│  #   │  Ngày          │ Trạng thái       │
├──────┼────────────────┼──────────────────┤
│  1   │ T2, 06/01/2025 │ [Có mặt ✓]      │
│  2   │ T4, 08/01/2025 │ [Vắng ✗]        │
│  3   │ T2, 13/01/2025 │ [Chưa ghi –]    │
└──────┴────────────────┴──────────────────┘
```

## API Requirements

### Check In
- `POST /api/v1/attendRecord/checkin`
- Auth: Bearer token
- Body: `{ cAttendId: string, latitude: number, longitude: number }`
- Response 200: `{ record: AttendRecord, status: 'CM' }`
- Response 400: outside radius
- Response 409: already checked in
- Response 403: round not active

### Get Active Session for Subject
- `GET /api/v1/cAttend/getActive?subjectId=<id>` — or derive from session list

### Get Personal Attendance Records
- `GET /api/v1/attendRecord/getByStudent?subjectId=<id>` (student's own records)

## Backend Changes
None.

## Technical Implementation Notes

### Geolocation Flow
```typescript
const handleCheckIn = async () => {
  setCheckInState('locating');
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      })
    );
    setCheckInState('submitting');
    await attendanceApi.checkIn({
      cAttendId: activeRound.cAttendId,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    toast.success('Điểm danh thành công!');
    setCheckInState('done');
    queryClient.invalidateQueries({ queryKey: queryKeys.attendance.myRecords(subjectId) });
  } catch (error) {
    if (error instanceof GeolocationPositionError) {
      if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
        setLocationDenied(true);
      } else {
        toast.error('Không thể lấy vị trí. Thử lại.');
      }
    } else if (error instanceof ApiError) {
      handleApiError(error);
    }
    setCheckInState('idle');
  }
};
```

### Socket.IO Round Events
```typescript
// Listen for round open/close
useSocketEvent('roundOpened', (data: { cAttendId: string; roundNumber: number }) => {
  if (data.cAttendId === currentSessionId) {
    setActiveRound(data);
    setCheckInState('idle');
  }
});

useSocketEvent('roundClosed', (data: { cAttendId: string }) => {
  if (data.cAttendId === currentSessionId) {
    setActiveRound(null);
  }
});
```

### File Structure
```
src/app/(dashboard)/student/classes/[subjectId]/attendance/
└── page.tsx

src/components/features/attendance/student/
├── CheckInCard.tsx
├── NoActiveRoundCard.tsx
├── AlreadyCheckedInCard.tsx
├── LocationDeniedAlert.tsx
└── StudentAttendanceHistory.tsx
```

## Acceptance Criteria
- [ ] "Điểm danh đang mở" card shows when active round exists
- [ ] "Không có vòng điểm danh" shows when no round active
- [ ] Check-in button requests browser geolocation
- [ ] Successful check-in → success toast + state changes to "Đã điểm danh"
- [ ] Outside radius → error toast with clear message
- [ ] Already checked in → informational toast
- [ ] Location permission denied → alert with instructions
- [ ] Round open/close updates UI in real-time via Socket.IO
- [ ] Personal attendance history shown below check-in section
- [ ] Check-in button shows loading states (locating → submitting)

## Testing Requirements
- **Component tests:**
  - `CheckInCard`: renders check-in button; calls geolocation on click
  - `LocationDeniedAlert`: renders when `locationDenied=true`
  - Geolocation mock: test success/permission-denied/timeout scenarios
  - API error handling: 400/409/403 show correct messages
- **Manual QA (integration):**
  - Teacher opens round → student page updates to show active round
  - Check in with valid GPS → verify success + teacher live dashboard updates
  - Check in from wrong location → verify outside-radius error
  - Deny location permission → verify alert shows

## Definition of Done
- Student can check in when round is active and within radius
- All error states handled with clear messages
- Real-time round open/close via Socket.IO
- Attendance history displayed
- Unit tests pass

## Risks / Notes
- Browser geolocation accuracy on desktop can be low (WiFi-based geolocation) — users on desktop may fail radius check even if physically in classroom; this is a known limitation
- HTTPS is required for `navigator.geolocation` — ensure production deployment uses HTTPS
- The `enableHighAccuracy: true` option increases battery usage on mobile — acceptable for a quick check-in flow
- Socket.IO event names for round open/close need verification against backend (`app.js`) — the backend may emit `roundOpen`/`roundClose` or similar
