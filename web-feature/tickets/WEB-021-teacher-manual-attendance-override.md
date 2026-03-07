# WEB-021 — Teacher Manual Attendance Override

## Objective
Build the teacher's ability to manually override individual student attendance records: mark a student as present (CM), absent (KP), or excused (CP) for a specific session. This handles cases where GPS check-in failed, a student was late, or attendance needs correction after-the-fact.

## Background
GPS check-in doesn't cover all scenarios — a student's phone may be dead, GPS may fail, or the teacher needs to retroactively correct records. Manual override gives teachers full control over attendance records after a session ends.

## Scope
- Teacher attendance session detail page (part of WEB-018's session detail page)
- Override modal per student: change status for a specific session
- API: `PATCH /api/v1/attendRecord/update`
- Bulk mark: "Mark all remaining as absent" shortcut
- Audit trail display (who changed, when) if backend provides it

## Out of Scope
- Student absence requests (WEB-022/023) — those are student-initiated
- Session creation (WEB-015)

## Dependencies
- WEB-018 (session detail page where override UI is embedded)
- WEB-004 (API service layer)
- WEB-003 (Modal, Select, Button, Table)

## User Flow Context
1. Teacher opens completed session detail (WEB-018)
2. Sees attendance table with student statuses
3. Clicks edit icon next to a student → override modal opens
4. Selects new status → saves → row updates

## Functional Requirements
1. Each row in the attendance records table (WEB-018) has an edit button (pencil icon)
2. Clicking edit opens `OverrideModal` with:
   - Student name (read-only)
   - Status select: CM (Có mặt), KP (Vắng không phép), CP (Vắng có phép)
   - Note field (optional)
3. Submit calls `PATCH /api/v1/attendRecord/update` with `{ recordId, status, note }`
4. On success: update record in query cache, toast "Đã cập nhật điểm danh"
5. "Đánh dấu vắng tất cả" button: marks all students without a CM/CP record as KP
   - Shows confirmation dialog before executing
   - Calls the override API for each unrecorded student

## UI Requirements

### Table Row with Edit Button
```
┌──────────────────┬──────────┬────────────┬──────────┬────┐
│ Sinh viên        │ Mã SV    │ Giờ check-in│ Trạng thái│[✏]│
├──────────────────┼──────────┼────────────┼──────────┼────┤
│ Nguyễn Văn A     │ SV001    │ 07:31      │ [CM]     │[✏]│
│ Trần Thị B       │ SV002    │ –          │ [Chưa]   │[✏]│
└──────────────────┴──────────┴────────────┴──────────┴────┘
Edit icon: pencil, size-4, text-muted hover:text-foreground
```

### Override Modal
```
Title: "Chỉnh sửa điểm danh"
Subtitle: "[Student Name] — [Session Date]"

[Trạng thái *]
  Select options:
  • CM — Có mặt
  • KP — Vắng không phép
  • CP — Vắng có phép

[Ghi chú]  [Textarea — optional, placeholder: "Lý do thay đổi..."]

[Hủy]  [Lưu thay đổi — primary]
```

### Bulk Mark Absent
```
[Đánh dấu vắng tất cả — outline, end of table]
→ Confirmation: "Đánh dấu X sinh viên chưa điểm danh là vắng không phép?"
[Hủy]  [Xác nhận — danger]
```

### Status Options Display
```
CM = "Có mặt" (green)
KP = "Vắng không phép" (red)
CP = "Vắng có phép" (yellow/warning)
```

## API Requirements

### Update Attendance Record
- `PATCH /api/v1/attendRecord/update`
- Auth: Bearer token (teacher only)
- Body: `{ recordId: string, status: 'CM' | 'KP' | 'CP', note?: string }`
- Response: `{ record: AttendRecord }`

### Create Absent Record (for students without any record)
- If student has no record yet: `POST /api/v1/attendRecord/createManual` (or check actual API)
- Body: `{ cAttendId, userId, status: 'KP', note? }`

## Backend Changes
None (assume PATCH update endpoint exists; verify against `attendRecord_route.js`).

## Technical Implementation Notes

### Override Mutation
```typescript
const overrideMutation = useMutation({
  mutationFn: ({ recordId, status, note }: OverridePayload) =>
    attendanceApi.updateRecord({ recordId, status, note }),
  onSuccess: (updatedRecord) => {
    queryClient.setQueryData(
      queryKeys.attendance.bySession(sessionId),
      (old: AttendRecord[] | undefined) =>
        old?.map(r => r._id === updatedRecord._id ? updatedRecord : r) ?? []
    );
    toast.success('Đã cập nhật điểm danh');
    setOverrideModalOpen(false);
  },
});
```

### Bulk Mark Absent
```typescript
const handleBulkMarkAbsent = async () => {
  const unrecorded = students.filter(s =>
    !records.find(r => r.userId === s.userId && (r.status === 'CM' || r.status === 'CP'))
  );

  await Promise.all(
    unrecorded.map(s =>
      attendanceApi.createOrUpdateRecord({
        cAttendId: sessionId,
        userId: s.userId,
        status: 'KP',
      })
    )
  );

  queryClient.invalidateQueries({ queryKey: queryKeys.attendance.bySession(sessionId) });
  toast.success(`Đã đánh dấu vắng ${unrecorded.length} sinh viên`);
};
```

### File Structure
```
src/components/features/attendance/
├── AttendanceOverrideModal.tsx
├── BulkMarkAbsentButton.tsx
└── (AttendanceRecordsTable.tsx updated from WEB-018 to include edit buttons)
```

## Acceptance Criteria
- [ ] Edit button on each attendance row
- [ ] Override modal shows student name and current status
- [ ] Status select has CM/KP/CP options with labels
- [ ] Saving updates the row status in the UI immediately
- [ ] Note field available (optional)
- [ ] "Đánh dấu vắng tất cả" confirmation dialog
- [ ] Bulk mark updates all unrecorded students to KP
- [ ] Success toast after each operation

## Testing Requirements
- **Component tests:**
  - `AttendanceOverrideModal`: renders correct status options, validates, calls mutation
  - `BulkMarkAbsentButton`: counts unrecorded students correctly, shows correct count in confirm dialog
  - Cache update: verify optimistic update sets correct record in query cache
- **Manual QA:**
  - Change student from "Chưa" to "CP" → verify row updates
  - Bulk mark → verify only unrecorded students (not CM/CP) are affected
  - Refresh page → verify changes persisted

## Definition of Done
- Individual override works end-to-end
- Bulk mark absent works
- Query cache updated optimistically
- Unit tests pass

## Risks / Notes
- The `createManual` endpoint may not exist if backend only has update (not create) for manual records — check `attendRecord_route.js`; may need a separate endpoint or a create+set-status pattern
- Bulk operations using `Promise.all` could fail partway through — consider sequential calls with error collection and showing partial success
