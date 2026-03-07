# WEB-013 — Student Class List & Join Class

## Objective
Build the Student's Classes page: a list of all subjects the student has joined, and the ability to join a new subject using a join code. Each subject card links to the subject detail page.

## Background
Students join classes using a join code provided by their teacher. Once enrolled, the subject appears in their class list and timetable. This page is the student's hub for all enrolled subjects.

## Scope
- `/student/classes` — student classes list page
- `StudentSubjectCard` — subject card with subject info
- Join Class modal: single input for join code
- API: `GET /api/v1/subject/getAllJoined`, `POST /api/v1/subject/join`
- Search/filter by subject name
- Leave subject functionality (with confirmation dialog)

## Out of Scope
- Subject detail (WEB-014)
- Attendance check-in (WEB-020)
- Absence requests (WEB-022)

## Dependencies
- WEB-010 (app shell)
- WEB-004 (API service layer)
- WEB-003 (Card, Modal, Input, ConfirmDialog, Badge)

## User Flow Context
- Student navigates to `/student/classes` from sidebar
- Student clicks "Tham gia lớp học" → enter join code → enrolled
- Student clicks subject card → navigates to `/student/classes/[subjectId]`

## Functional Requirements
1. `GET /api/v1/subject/getAllJoined` fetches enrolled subjects on page load
2. "Tham gia lớp học" button opens a modal with a join code input
3. Join code field: required, min 6 chars, all uppercase (auto-uppercase on input)
4. On submit, call `POST /api/v1/subject/join` with `{ joinCode }`
5. On success: close modal, invalidate query, show toast "Tham gia lớp học thành công"
6. On error (invalid code): show inline error "Mã tham gia không hợp lệ"
7. On error (already joined): show inline error "Bạn đã tham gia lớp học này"
8. Subject card shows: subject name, subject code, teacher name, room
9. Card has "Xem chi tiết" link and a context menu with "Rời lớp học" option
10. "Rời lớp học" opens ConfirmDialog before calling `DELETE /api/v1/subject/leave`
11. Search filters by subject name or subject code (client-side)

## UI Requirements

### Page Header
```
[Title: "Lớp học của tôi"]        [+ Tham gia lớp học — primary button]
[Search input: "Tìm kiếm lớp học..."]
[N lớp học — subtitle count]
```

### Subject Card
```
┌─────────────────────────────────────────┐
│  [Subject Name — text-lg font-bold]  [⋮]│  — ⋮ opens context menu
│  [Mã môn: CS101]                        │
│  [Giảng viên: Nguyễn Văn A]            │
│  [Phòng: A101] (if available)           │
│                                         │
│  [Xem chi tiết →]                      │
└─────────────────────────────────────────┘
```

### Context Menu (⋮)
```
[Xem chi tiết]
─────────────
[Rời lớp học — text-danger]
```

### Join Class Modal
```
Title: "Tham gia lớp học"
Description: "Nhập mã tham gia do giảng viên cung cấp"

[Mã tham gia *]   [INPUT — uppercase, monospace font]
                  [Error message if invalid]

[Hủy — ghost]  [Tham gia — primary, loading state]
```

### Leave Subject Confirm Dialog
```
Title: "Rời lớp học?"
Message: "Bạn có chắc muốn rời khỏi [Subject Name]? Dữ liệu điểm danh của bạn sẽ không bị xóa."
[Hủy]  [Rời lớp — danger button]
```

## API Requirements

### Get Joined Subjects
- `GET /api/v1/subject/getAllJoined`
- Auth: Bearer token
- Response: `{ subjects: Subject[] }` — each subject includes teacher info

### Join Subject
- `POST /api/v1/subject/join`
- Auth: Bearer token
- Body: `{ joinCode: string }`
- Response: `{ subject: Subject }` on success
- Error 404: invalid code; Error 409: already joined

### Leave Subject
- `DELETE /api/v1/subject/leave` (or the appropriate endpoint)
- Auth: Bearer token
- Body: `{ subjectId: string }`

## Backend Changes
None.

## Technical Implementation Notes

### Mutations
```typescript
const joinMutation = useMutation({
  mutationFn: (joinCode: string) => subjectsApi.join(joinCode),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.subjects.joined });
    toast.success('Tham gia lớp học thành công');
    setJoinModalOpen(false);
    setJoinCode('');
  },
  onError: (error: ApiError) => {
    if (error.statusCode === 404) {
      setJoinError('Mã tham gia không hợp lệ');
    } else if (error.statusCode === 409) {
      setJoinError('Bạn đã tham gia lớp học này');
    } else {
      toast.error('Đã xảy ra lỗi. Vui lòng thử lại.');
    }
  },
});

const leaveMutation = useMutation({
  mutationFn: (subjectId: string) => subjectsApi.leave(subjectId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.subjects.joined });
    toast.success('Đã rời lớp học');
  },
});
```

### Join Code Auto-uppercase
```typescript
<Input
  value={joinCode}
  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
  placeholder="Ví dụ: ABCD1234"
  className="font-mono tracking-widest"
/>
```

### File Structure
```
src/app/(dashboard)/student/classes/
└── page.tsx

src/components/features/subjects/
├── StudentSubjectCard.tsx
├── JoinSubjectModal.tsx
└── LeaveSubjectDialog.tsx
```

## Acceptance Criteria
- [ ] Page shows all enrolled subjects
- [ ] "Tham gia lớp học" button opens modal
- [ ] Valid join code → enrolled and subject appears in list
- [ ] Invalid join code → inline error "Mã tham gia không hợp lệ"
- [ ] Already joined code → inline error shown
- [ ] Join code auto-uppercases as user types
- [ ] "Rời lớp học" shows confirm dialog before leaving
- [ ] After leaving, subject removed from list
- [ ] Search filters subjects in real-time
- [ ] Empty state with CTA to join a class

## Testing Requirements
- **Component tests:**
  - `JoinSubjectModal`: renders, validates empty input, calls mutation on submit
  - `StudentSubjectCard`: renders subject info, opens context menu
  - Error handling: 404 → inline error, 409 → inline error
- **Manual QA:**
  - Join with valid code → verify subject appears
  - Join with invalid code → verify inline error
  - Leave subject → confirm dialog → subject removed
  - Search "CS101" → verify filtering works

## Definition of Done
- Student can join a subject with a valid code
- Enrolled subjects list correctly
- Leave subject works with confirmation
- Client-side search works
- Unit tests pass

## Risks / Notes
- The leave subject API endpoint name needs to be confirmed against the backend — check `subject_route.js` for the exact path
- Auto-uppercasing join code improves UX but the backend should be case-insensitive on matching to be safe
