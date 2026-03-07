# WEB-016 — Subject Settings & Class Notifications

## Objective
Build the Subject Settings tab (teacher only) and the class notification broadcast feature. Teachers can edit subject details, set attendance rules (absence threshold, GPS radius), and send broadcast notifications to all students in the subject.

## Background
Subject settings control the rules of the class: how many absences trigger a warning, the GPS radius for check-in, and general subject information. Class notifications (not the app notification system) are direct messages broadcast to all enrolled students via push notification + in-app notification.

## Scope
- `/teacher/classes/[subjectId]/settings` — settings tab page
- Edit subject form: name, description, room, schedule
- Attendance rules: `absentLimit` (max absences before warning), `gpsRadius` (meters)
- Class cancellation notification: `POST /api/v1/subject/notiClassCancellation`
- Class reschedule notification: `POST /api/v1/subject/notiClassReschedule`
- Custom broadcast notification: `POST /api/v1/notification/send`
- API: `PATCH /api/v1/subject/update`, `GET /api/v1/subject/getDetail`

## Out of Scope
- Student list (WEB-017)
- In-app notification center (WEB-033)
- Web push registration (WEB-034)

## Dependencies
- WEB-014 (subject shell, `useSubject()` context)
- WEB-004 (API service layer)
- WEB-003 (Form inputs, Button, Card, Separator)

## User Flow Context
- Teacher navigates to Settings tab within a subject
- Teacher updates subject info or attendance rules → saves
- Teacher sends class cancellation/reschedule notification → all students receive push + in-app notification

## Functional Requirements

### Subject Settings Form
1. Pre-populated with current subject data from `useSubject()` context
2. Editable fields: `name`, `description`, `room`, `startDate`, `endDate`
3. Attendance settings: `absentLimit` (number input, default 3), `gpsRadius` (number in meters, default 100)
4. "Lưu thay đổi" submits `PATCH /api/v1/subject/update`
5. On success: invalidate subject query, toast "Lưu thành công"
6. Unsaved changes indicator (optional: disable Save button until form is dirty)

### Class Notifications
7. "Thông báo hủy lớp" button opens a modal to confirm/add message
   - Calls `POST /api/v1/subject/notiClassCancellation`
   - Sends push notification to all enrolled students
8. "Thông báo dời lịch" button opens a modal with date/time fields for new schedule
   - Calls `POST /api/v1/subject/notiClassReschedule`
9. "Gửi thông báo tùy chỉnh" opens a compose modal: title + content fields
   - Calls `POST /api/v1/notification/send` with subjectId context

### Danger Zone
10. "Xóa lớp học" — opens destructive confirm dialog → `DELETE /api/v1/subject/delete`
    - Redirects to `/teacher/classes` after deletion
    - Input confirmation required: type subject name to confirm

## UI Requirements

### Settings Page Layout
```
[Section: Thông tin lớp học]
  [Form fields in card]
  [Lưu thay đổi — primary button]

[Section: Cài đặt điểm danh]
  [Số buổi vắng tối đa]  [Number input]
  [Bán kính GPS (m)]     [Number input]
  [Lưu cài đặt — primary button]

[Section: Thông báo lớp học]
  [Thông báo hủy lớp — outline danger]
  [Thông báo dời lịch — outline]
  [Gửi thông báo tùy chỉnh — outline]

[Danger Zone — red bordered card]
  [Xóa lớp học — destructive button]
```

### Cancel Class Modal
```
Title: "Thông báo hủy lớp"
"Tất cả sinh viên sẽ nhận thông báo hủy buổi học."
[Ghi chú (tùy chọn)]  [Textarea]
[Hủy]  [Gửi thông báo — danger]
```

### Reschedule Modal
```
Title: "Thông báo dời lịch"
[Ngày mới *]    [Date picker]
[Giờ mới *]     [Time input]
[Phòng mới]     [Input]
[Ghi chú]       [Textarea]
[Hủy]  [Gửi thông báo — primary]
```

### Custom Notification Modal
```
Title: "Gửi thông báo"
[Tiêu đề *]   [Input]
[Nội dung *]  [Textarea rows=4]
[Hủy]  [Gửi — primary]
```

### Delete Subject Confirmation
```
Title: "Xóa lớp học?"
"Hành động này không thể hoàn tác. Nhập tên lớp học để xác nhận:"
[Input — must match subject name]
[Hủy]  [Xóa lớp học — destructive, disabled until input matches]
```

## API Requirements

### Update Subject
- `PATCH /api/v1/subject/update`
- Auth: Bearer token (teacher only)
- Body: `{ subjectId, name?, description?, room?, startDate?, endDate?, absentLimit?, gpsRadius? }`

### Class Cancellation Notification
- `POST /api/v1/subject/notiClassCancellation`
- Auth: Bearer token
- Body: `{ subjectId, message? }`

### Class Reschedule Notification
- `POST /api/v1/subject/notiClassReschedule`
- Auth: Bearer token
- Body: `{ subjectId, newDate, newTime, newRoom?, message? }`

### Custom Notification
- `POST /api/v1/notification/send`
- Auth: Bearer token
- Body: `{ subjectId, title, content, type: 'other' }`

### Delete Subject
- `DELETE /api/v1/subject/delete`
- Auth: Bearer token
- Body: `{ subjectId }`

## Backend Changes
None.

## Technical Implementation Notes

### Form with React Hook Form
```typescript
const form = useForm<SubjectSettingsValues>({
  resolver: zodResolver(subjectSettingsSchema),
  defaultValues: {
    name: subject?.name ?? '',
    description: subject?.description ?? '',
    room: subject?.room ?? '',
    absentLimit: subject?.absentLimit ?? 3,
    gpsRadius: subject?.gpsRadius ?? 100,
  },
});

// Reset form when subject data loads
useEffect(() => {
  if (subject) form.reset({ name: subject.name, ... });
}, [subject]);
```

### Delete Confirmation Logic
```typescript
const [deleteInput, setDeleteInput] = useState('');
const canDelete = deleteInput === subject?.name;
```

### File Structure
```
src/app/(dashboard)/teacher/classes/[subjectId]/settings/
└── page.tsx

src/components/features/subjects/settings/
├── SubjectSettingsForm.tsx
├── AttendanceSettingsForm.tsx
├── ClassNotificationSection.tsx
├── CancelClassModal.tsx
├── RescheduleModal.tsx
├── CustomNotificationModal.tsx
└── DeleteSubjectDialog.tsx
```

## Acceptance Criteria
- [ ] Settings form pre-populated with current subject data
- [ ] Saving subject info updates subject via API
- [ ] Attendance settings (absentLimit, gpsRadius) saveable
- [ ] Cancel class modal sends notification to all students
- [ ] Reschedule modal sends notification with new date/time
- [ ] Custom notification modal sends with title + content
- [ ] Delete subject requires typing subject name to confirm
- [ ] After delete, redirects to `/teacher/classes`
- [ ] All modals show loading state during submission

## Testing Requirements
- **Component tests:**
  - `SubjectSettingsForm`: pre-populates from props, validates, calls mutation on submit
  - `DeleteSubjectDialog`: confirms delete button disabled until name matches
  - Notification modals: validates required fields
- **Manual QA:**
  - Update subject name → verify change persists after page refresh
  - Send cancel notification as teacher → verify student receives notification
  - Delete subject → type wrong name → button stays disabled → type correct name → enables

## Definition of Done
- Subject settings editable and saveable
- All three notification types work
- Subject deletion works with confirmation
- Unit tests pass

## Risks / Notes
- Notification endpoints call FCM internally — students must have FCM tokens registered (WEB-034 handles web push registration)
- `gpsRadius` is in meters; display as an integer number input with a "m" suffix label
- Subject deletion is destructive and permanent — the confirmation input pattern is intentional as a safety measure
