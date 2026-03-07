# WEB-012 — Teacher Subject Creation & List

## Objective
Build the Teacher's Classes page: a list of all subjects created by the teacher, with the ability to create a new subject via a modal form. Each subject entry links to the subject detail page.

## Background
Teachers manage multiple subjects (lop hoc). This page is the entry point for subject management. Creating a subject generates a join code that students use. The list provides quick access to each subject's detail page where sessions, attendance, and other features live.

## Scope
- `/teacher/classes` — teacher classes list page
- `SubjectCard` or table row for each subject (name, code, join code, student count, actions)
- Create Subject modal with form: name, subjectCode, description, schedule (days + time), room
- API: `POST /api/v1/subject/create`, `GET /api/v1/subject/getAll`
- Copy join code to clipboard
- Search/filter subjects by name

## Out of Scope
- Subject detail (WEB-014)
- Session management (WEB-015)
- Subject settings (WEB-016)
- Student list within subject (WEB-017)

## Dependencies
- WEB-010 (app shell)
- WEB-004 (API service layer)
- WEB-003 (Button, Card, Modal, Input, Badge)

## User Flow Context
- Teacher navigates to `/teacher/classes` from sidebar
- Teacher clicks "Tạo lớp học" → modal opens → fills form → subject created → appears in list
- Teacher clicks subject card → navigates to `/teacher/classes/[subjectId]`

## Functional Requirements
1. `GET /api/v1/subject/getAll` fetches teacher's subjects on page load
2. "Tạo lớp học" button opens a modal with the subject creation form
3. Form fields: `name` (required), `subjectCode` (required), `description` (optional), `room` (optional), `startDate`, `endDate`
4. On submit, call `POST /api/v1/subject/create` with form data
5. On success: close modal, invalidate subjects query, show success toast "Tạo lớp học thành công"
6. On error: show error toast with server message
7. Each subject card displays: name, subjectCode, join code (with copy button), student count
8. Clicking "Copy join code" copies the join code to clipboard + shows "Đã sao chép!" feedback
9. Search input filters subjects by name or subject code (client-side filtering)
10. Empty state when no subjects exist

## UI Requirements

### Page Header
```
[Title: "Lớp học của tôi"]        [+ Tạo lớp học — primary button]
[Search input: "Tìm kiếm lớp học..."]
```

### Subject List
```
Grid: 1 col mobile, 2 col md, 3 col xl
Each card:
┌─────────────────────────────────────┐
│  [Subject Name — text-lg font-bold] │
│  [Code: CS101] [N sinh viên]        │
│                                     │
│  Mã tham gia: [ABCD1234]  [Copy]   │
│                                     │
│  [Xem chi tiết →]                  │
└─────────────────────────────────────┘
```

### Create Subject Modal
```
Title: "Tạo lớp học mới"

[Tên môn học *]           [Input]
[Mã môn học *]            [Input — e.g. CS101]
[Phòng học]               [Input — optional]
[Mô tả]                   [Textarea — optional]
[Ngày bắt đầu]            [Date input]
[Ngày kết thúc]           [Date input]

[Hủy — ghost]  [Tạo lớp học — primary, loading state]
```

### Copy Join Code Feedback
```
Button state: default → "Đã sao chép!" (check icon, text-success) for 2s → revert
```

## API Requirements

### Get All Subjects (Teacher)
- `GET /api/v1/subject/getAll`
- Auth: Bearer token
- Response: `{ subjects: Subject[] }`

### Create Subject
- `POST /api/v1/subject/create`
- Auth: Bearer token
- Body: `{ name, subjectCode, description?, room?, startDate?, endDate? }`
- Response: `{ subject: Subject }` with `joinCode` field

## Backend Changes
None.

## Technical Implementation Notes

### Mutations
```typescript
const createSubjectMutation = useMutation({
  mutationFn: subjectsApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all });
    toast.success('Tạo lớp học thành công');
    setModalOpen(false);
    form.reset();
  },
  onError: (error: ApiError) => {
    toast.error(error.message ?? 'Đã xảy ra lỗi');
  },
});
```

### Zod Schema
```typescript
export const createSubjectSchema = z.object({
  name: z.string().min(1, 'Tên môn học là bắt buộc'),
  subjectCode: z.string().min(1, 'Mã môn học là bắt buộc'),
  description: z.string().optional(),
  room: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
```

### Copy to Clipboard
```typescript
const [copied, setCopied] = useState(false);

const handleCopy = async (code: string) => {
  await navigator.clipboard.writeText(code);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};
```

### Client-side Search
```typescript
const filtered = useMemo(() =>
  subjects?.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.subjectCode.toLowerCase().includes(search.toLowerCase())
  ) ?? [],
  [subjects, search]
);
```

### File Structure
```
src/app/(dashboard)/teacher/classes/
└── page.tsx

src/components/features/subjects/
├── SubjectCard.tsx
├── CreateSubjectModal.tsx
└── SubjectCardSkeleton.tsx
```

## Acceptance Criteria
- [ ] Page loads and shows all teacher subjects
- [ ] "Tạo lớp học" button opens modal
- [ ] Form validates: name and subjectCode required
- [ ] On success, new subject appears in list without page reload
- [ ] Join code copy button works and shows feedback
- [ ] Search filters subjects by name or code in real-time
- [ ] Empty state shown when no subjects
- [ ] Loading skeleton while fetching
- [ ] Error toast if creation fails

## Testing Requirements
- **Component tests:**
  - `CreateSubjectModal`: renders, validates required fields, calls mutation on submit
  - `SubjectCard`: renders name, code, join code; copy button calls clipboard API
  - Client-side search filter logic
- **Manual QA:**
  - Create a subject → verify it appears in list
  - Copy join code → verify clipboard content
  - Search "CS" → verify only matching subjects shown

## Definition of Done
- Subjects list loads correctly
- Subject creation form works end-to-end
- Join code copy works
- Client-side search works
- Unit tests pass

## Risks / Notes
- Join code is generated by the backend on subject creation — it will be in the `Subject` response object
- `navigator.clipboard` requires HTTPS or localhost — will not work on plain HTTP deployments
- If subject list grows large, consider adding pagination (WEB-036 adds backend pagination support)
