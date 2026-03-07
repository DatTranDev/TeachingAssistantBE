# WEB-022 — Student Absence Request Submission

## Objective
Build the student-facing absence request (xin phep vang) feature: students can submit a request for an excused absence for a specific session, upload a supporting document (medical certificate, etc.), and track the status of their pending/approved/rejected requests.

## Background
When a student cannot attend a class, they can submit an absence request which the teacher reviews. If approved, the attendance record is changed to "CP" (Có Phép / excused). The student can attach a file as proof. This replaces the paper-based process.

## Scope
- Student absence request page within subject: `/student/classes/[subjectId]/attendance` (absence request section)
- Submit absence request modal: select session, reason, file upload
- List of submitted requests with status (pending/approved/rejected)
- API: `POST /api/v1/absenceRequest/create`, `GET /api/v1/absenceRequest/getByStudent`
- File upload via Firebase Storage

## Out of Scope
- Teacher review (WEB-023)
- Manual override (WEB-021)

## Dependencies
- WEB-014 (subject shell)
- WEB-004 (API service layer)
- WEB-003 (Modal, FileUpload, Select, Badge, Table)

## User Flow Context
1. Student has an absent session (KP status)
2. Student goes to Attendance tab → sees "Xin phép" button on absent session row
3. Clicks "Xin phép" → fill reason + upload document → submit
4. Request shown as "Đang chờ" until teacher reviews

## Functional Requirements
1. On student attendance history table (WEB-015/020), rows with status "KP" have an "Xin phép" button
2. Clicking "Xin phép" opens absence request modal
3. Modal pre-selects the session (if triggered from a row) or allows session selection
4. Fields: reason text (required, min 10 chars), file attachment (optional, PDF/image up to 5MB)
5. File upload: `POST /api/v1/firebase/upload` → get URL → include in request
6. Submit: `POST /api/v1/absenceRequest/create`
7. Request list section: fetch `GET /api/v1/absenceRequest/getByStudent?subjectId=<id>`
8. Request rows: session date, reason excerpt, status badge, attachment link (if any)
9. Status badges: "Đang chờ" (gray), "Đã duyệt" (green), "Từ chối" (red)
10. Cannot submit a duplicate request for the same session (show info if already submitted)

## UI Requirements

### Absence Request Button on Session Row
```
[Xin phép — outline-sm button] — only on rows with KP status and no existing request
[Đang chờ — gray badge] — if request already submitted
[Đã duyệt — green badge] — if request approved
```

### Submit Absence Request Modal
```
Title: "Gửi đơn xin phép"
Subtitle: "Buổi học: [Session Date]" (pre-filled if from session row)

[Buổi học *]     [Select — dropdown of absent sessions]  (if no pre-select)
[Lý do *]        [Textarea rows=3 — min 10 chars]
[Tài liệu đính kèm]
  [FileUpload — "Kéo thả hoặc chọn file" — PDF, JPG, PNG, max 5MB]
  [Preview if file selected]

[Hủy]  [Gửi đơn — primary, loading during upload+submit]
```

### Absence Request List
```
[Đơn xin phép — Section title]

Table:
┌────────────────┬──────────────────────┬───────────────┬──────────┐
│ Buổi học       │ Lý do                │ Tài liệu      │ Trạng thái│
├────────────────┼──────────────────────┼───────────────┼──────────┤
│ T2, 06/01/2025 │ Bị ốm, có đơn ...   │ [Xem file]    │[Đang chờ]│
│ T4, 08/01/2025 │ Gia đình có việc ... │ –             │[Đã duyệt]│
└────────────────┴──────────────────────┴───────────────┴──────────┘
```

### Request Status Badges
```
Đang chờ: bg-neutral-100 text-neutral-600 (pending)
Đã duyệt: bg-success-light text-success (approved)
Từ chối:  bg-danger-light text-danger (rejected)
```

### File Upload Component
```
[Drag & drop zone or file picker button]
Accepted: .pdf, .jpg, .jpeg, .png
Max size: 5MB
Preview: file name + size + remove button
Error: "File quá lớn (max 5MB)" / "Định dạng không hỗ trợ"
```

## API Requirements

### Create Absence Request
- `POST /api/v1/absenceRequest/create`
- Auth: Bearer token
- Body: `{ cAttendId: string, reason: string, documentUrl?: string }`
- Response: `{ absenceRequest: AbsenceRequest }`

### Get Student's Absence Requests
- `GET /api/v1/absenceRequest/getByStudent?subjectId=<id>`
- Auth: Bearer token
- Response: `{ requests: AbsenceRequest[] }` — includes session info and status

### Upload File
- `POST /api/v1/firebase/upload` (or direct Firebase Storage SDK)
- Body: FormData with file
- Response: `{ url: string }` — Firebase Storage download URL

## Backend Changes
None.

## Technical Implementation Notes

### File Upload Flow
```typescript
const handleSubmit = async (values: AbsenceFormValues) => {
  let documentUrl: string | undefined;

  if (values.file) {
    const formData = new FormData();
    formData.append('file', values.file);
    const { url } = await firebaseApi.upload(formData);
    documentUrl = url;
  }

  await absenceRequestApi.create({
    cAttendId: values.sessionId,
    reason: values.reason,
    documentUrl,
  });
};
```

### Zod Schema
```typescript
const absenceRequestSchema = z.object({
  sessionId: z.string().min(1, 'Vui lòng chọn buổi học'),
  reason: z.string().min(10, 'Lý do tối thiểu 10 ký tự'),
  file: z
    .instanceof(File)
    .refine(f => f.size <= 5 * 1024 * 1024, 'File quá lớn (max 5MB)')
    .refine(
      f => ['application/pdf', 'image/jpeg', 'image/png'].includes(f.type),
      'Chỉ chấp nhận PDF, JPG, PNG'
    )
    .optional(),
});
```

### Determine Eligible Sessions (KP without existing request)
```typescript
const eligibleSessions = useMemo(() =>
  sessions.filter(s => {
    const record = attendanceRecords.find(r => r.cAttendId === s._id);
    const existingRequest = absenceRequests.find(r => r.cAttendId === s._id);
    return record?.status === 'KP' && !existingRequest;
  }),
  [sessions, attendanceRecords, absenceRequests]
);
```

### File Structure
```
src/app/(dashboard)/student/classes/[subjectId]/attendance/
└── page.tsx   # Combines check-in (WEB-020) + absence request sections

src/components/features/absence/
├── AbsenceRequestModal.tsx
├── AbsenceRequestList.tsx
└── AbsenceStatusBadge.tsx
```

## Acceptance Criteria
- [ ] "Xin phép" button on KP-status session rows
- [ ] Button absent on non-KP rows and rows with existing requests
- [ ] Modal opens pre-selecting the session
- [ ] Reason field validates min 10 chars
- [ ] File upload accepts PDF/JPG/PNG up to 5MB
- [ ] Oversized file shows error before submission
- [ ] Submit uploads file (if attached) then creates request
- [ ] Submitted request appears in request list as "Đang chờ"
- [ ] Existing requests show correct status badges
- [ ] "Xem file" link opens attached document in new tab

## Testing Requirements
- **Component tests:**
  - `AbsenceRequestModal`: validates reason, file size, calls API in correct order
  - `AbsenceRequestList`: renders rows with correct status badges
  - `eligibleSessions` filter: only returns KP sessions without existing requests
- **Manual QA:**
  - Submit without reason → validation error
  - Attach 6MB file → size error before submission
  - Submit valid request → appears in list as pending
  - Teacher approves (WEB-023) → status updates to "Đã duyệt"

## Definition of Done
- Absence request submission works end-to-end with file upload
- Request list shows with correct statuses
- Validation prevents invalid submissions
- Unit tests pass

## Risks / Notes
- File upload calls Firebase Storage via backend proxy or directly via Firebase SDK — check backend `/firebase/upload` endpoint
- The student should not be able to submit for a session where they already have a CP record or an approved request
- If the backend doesn't provide a "already submitted" check, enforce it client-side using the fetched requests list
