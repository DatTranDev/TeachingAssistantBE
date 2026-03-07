# WEB-023 — Teacher Absence Request Review

## Objective
Build the teacher-facing absence request review feature: teachers see all pending absence requests for their subject, can view the reason and attached document, and approve or reject each request. Approval automatically updates the student's attendance record to "CP" (excused).

## Background
After students submit absence requests (WEB-022), teachers need a workflow to review them. Approving a request changes the student's attendance from "KP" (absent, unexcused) to "CP" (absent, excused) and sends a notification to the student. Rejection also notifies the student.

## Scope
- Absence request review page/section within teacher subject view
- Route: part of `/teacher/classes/[subjectId]/attendance` or a dedicated sub-route
- List of pending + historical requests with student info, session, reason, document
- Approve action: `PATCH /api/v1/absenceRequest/approve`
- Reject action: `PATCH /api/v1/absenceRequest/reject`
- Badge counts: pending requests count shown as badge in navigation

## Out of Scope
- Student submission (WEB-022)
- Manual override outside absence requests (WEB-021)

## Dependencies
- WEB-014 (subject shell)
- WEB-004 (API service layer)
- WEB-003 (Table, Badge, Button, Modal/Sheet)

## User Flow Context
1. Teacher sees notification or badge indicating pending absence requests
2. Opens Attendance tab → Absence Requests section
3. Sees list of requests; clicks "Duyệt" or "Từ chối"
4. For rejected requests, optionally adds a rejection reason
5. Student receives notification of outcome

## Functional Requirements
1. Fetch absence requests: `GET /api/v1/absenceRequest/getBySubject?subjectId=<id>`
2. Tabs/filter: "Đang chờ" (pending), "Đã xử lý" (approved + rejected)
3. Each request row: student avatar, name, userCode, session date, reason excerpt, status, actions
4. "Xem tài liệu" button opens attachment in new tab (if available)
5. "Duyệt" button → confirm → `PATCH /api/v1/absenceRequest/approve`
6. "Từ chối" button → opens rejection modal with optional reason field → `PATCH /api/v1/absenceRequest/reject`
7. On approval: update row status, update attendance record in cache, send notification to student
8. On rejection: update row status, show rejection reason in row
9. Pending count badge in the attendance tab navigation (if any pending)
10. Empty state per tab: "Không có đơn xin phép nào đang chờ"

## UI Requirements

### Section Layout
```
[Đơn xin phép — Section heading]
[Tabs: Đang chờ (3) | Đã xử lý]

Pending Table:
┌────────┬────────────────┬────────────────┬──────────────┬──────────────────┐
│[Avatar]│ Sinh viên      │ Buổi học       │ Lý do        │ Hành động        │
├────────┼────────────────┼────────────────┼──────────────┼──────────────────┤
│  [Av]  │ Nguyễn Văn A   │ T2, 06/01/2025 │ "Bị ốm..."  │ [Xem] [✓] [✗]  │
│  [Av]  │ Trần Thị B     │ T4, 08/01/2025 │ "Việc gia..."│ [Xem] [✓] [✗]  │
└────────┴────────────────┴────────────────┴──────────────┴──────────────────┘

[✓] = Approve (success/outline)
[✗] = Reject (danger/outline)
[Xem] = opens attachment or reason detail
```

### Approve Confirmation
```
Inline: clicking "✓ Duyệt" immediately calls API (no modal needed — action is reversible via re-reject)
OR: simple confirm: "Duyệt đơn xin phép của [Name]?" [Hủy] [Duyệt]
```

### Reject Modal
```
Title: "Từ chối đơn xin phép"
"[Name] — [Session Date]"

[Lý do từ chối (tùy chọn)]
[Textarea — placeholder "Nhập lý do (sinh viên sẽ nhận được thông báo)"]

[Hủy]  [Từ chối — danger]
```

### Request Detail Sheet (optional for long reasons/file preview)
```
Side sheet opens with:
- Full reason text
- Attached file preview (PDF viewer / image)
- Approve/Reject buttons at bottom
```

### Status Badges
```
Đang chờ: gray
Đã duyệt: green with checkmark
Từ chối:  red with x
```

## API Requirements

### Get Absence Requests by Subject
- `GET /api/v1/absenceRequest/getBySubject?subjectId=<id>`
- Auth: Bearer token (teacher)
- Response: `{ requests: AbsenceRequest[] }` — includes student info, session info, status

### Approve Request
- `PATCH /api/v1/absenceRequest/approve`
- Auth: Bearer token
- Body: `{ requestId: string }`
- Side effect: updates attendance record to CP, sends notification to student

### Reject Request
- `PATCH /api/v1/absenceRequest/reject`
- Auth: Bearer token
- Body: `{ requestId: string, reason?: string }`
- Side effect: sends notification to student

## Backend Changes
None.

## Technical Implementation Notes

### Pending Count Badge
```typescript
const pendingCount = requests?.filter(r => r.status === 'pending').length ?? 0;
// Pass to SubjectTabs component to show as badge on "Điểm danh" tab
```

### Optimistic Update on Approve
```typescript
const approveMutation = useMutation({
  mutationFn: (requestId: string) => absenceRequestApi.approve(requestId),
  onMutate: async (requestId) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.absenceRequests.bySubject(subjectId) });
    const snapshot = queryClient.getQueryData(queryKeys.absenceRequests.bySubject(subjectId));
    queryClient.setQueryData(
      queryKeys.absenceRequests.bySubject(subjectId),
      (old: AbsenceRequest[]) =>
        old.map(r => r._id === requestId ? { ...r, status: 'approved' } : r)
    );
    return { snapshot };
  },
  onError: (_, __, ctx) => {
    queryClient.setQueryData(queryKeys.absenceRequests.bySubject(subjectId), ctx?.snapshot);
    toast.error('Đã xảy ra lỗi. Vui lòng thử lại.');
  },
  onSuccess: () => toast.success('Đã duyệt đơn xin phép'),
});
```

### File Structure
```
src/components/features/absence/teacher/
├── AbsenceRequestReviewList.tsx
├── AbsenceRequestRow.tsx
├── RejectRequestModal.tsx
└── AbsenceRequestDetail.tsx  # Optional detail sheet
```

## Acceptance Criteria
- [ ] Pending tab shows all pending requests
- [ ] Processed tab shows approved + rejected requests
- [ ] Pending count badge shows on tab
- [ ] "Xem tài liệu" opens attachment in new tab
- [ ] Approve → row moves to "Đã xử lý" with "Đã duyệt" badge
- [ ] Reject → modal for optional reason → row moves to "Đã xử lý" with "Từ chối" badge
- [ ] Student's attendance record updated after approval
- [ ] Empty state for each tab
- [ ] Mobile: card layout instead of table

## Testing Requirements
- **Component tests:**
  - `AbsenceRequestReviewList`: tab switching, correct requests per tab
  - `RejectRequestModal`: optional reason, calls reject API on submit
  - Optimistic update: verify immediate UI change before API response
- **Manual QA:**
  - Student submits request (WEB-022) → teacher sees in pending
  - Teacher approves → student's attendance status changes to CP
  - Teacher rejects → student receives notification with reason

## Definition of Done
- Teacher can approve and reject absence requests
- Pending count badge works
- Optimistic updates provide instant feedback
- Unit tests pass

## Risks / Notes
- Approval side effects (updating attendance record to CP) happen on the backend — the frontend should invalidate `attendRecord` queries after approval to reflect the change
- If the attachment is a PDF, `window.open(url)` should work for most browsers; for images, direct URL display is fine
