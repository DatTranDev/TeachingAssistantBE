# WEB-017 — Student List & Excel Export

## Objective
Build the student list feature within a subject (teacher view): display all enrolled students with their cumulative attendance summary, and provide Excel export of the attendance data. This is accessed via the Students section in the subject detail.

## Background
Teachers need to see which students are in their class and each student's overall attendance standing. The Excel export is a critical feature for reporting to school administration. The attendance summary shows total sessions attended, total absent, and total excused per student.

## Scope
- Student list page (within subject detail, likely as a sub-section of the Attendance tab or Settings)
- Route: `/teacher/classes/[subjectId]/attendance` (student list embedded on this page)
- `StudentAttendanceRow` — per-student row: avatar, name, student code, CM/KP/CP counts, absent warning badge
- Excel export: `GET /api/v1/subject/exportAttendance?subjectId=<id>`
- Search/filter students by name or student code
- Sort by name, by absent count (most absent first)
- Absent warning badge when student absences exceed `absentLimit`

## Out of Scope
- Individual session attendance (WEB-018/019)
- Manual override (WEB-021)
- Absence requests (WEB-023)

## Dependencies
- WEB-014 (subject shell)
- WEB-004 (API service layer)
- WEB-003 (Table, Avatar, Badge, Button)

## User Flow Context
- Teacher opens Attendance tab in subject → sees student list with aggregate attendance
- Teacher clicks "Xuất Excel" → downloads Excel file
- Teacher searches for a student by name

## Functional Requirements
1. Fetch enrolled students with attendance summary: `GET /api/v1/subject/getStudents?subjectId=<id>` or equivalent
2. For each student row: avatar, name, userCode, email, total CM (present), total KP (absent), total CP (excused), warning badge
3. Warning badge shows when `KP count >= subject.absentLimit`
4. Search input filters students by name or userCode (client-side)
5. Sort options: "Tên A-Z", "Vắng nhiều nhất" (most absences)
6. "Xuất Excel" button calls `GET /api/v1/subject/exportAttendance?subjectId=<id>` — triggers file download
7. Total row at bottom: total sessions, class-wide averages
8. Loading skeleton while fetching

## UI Requirements

### Page Layout (Attendance Tab — Teacher)
```
[Student List Section]
[Search: "Tìm sinh viên..."]  [Sort dropdown]  [Xuất Excel — outline button with download icon]
[N sinh viên]

Table:
┌────┬──────────────────┬──────────┬────┬────┬────┬────────┐
│    │ Tên sinh viên    │ Mã SV    │ CM │ KP │ CP │        │
├────┼──────────────────┼──────────┼────┼────┼────┼────────┤
│[Av]│ Nguyễn Văn A     │ SV001    │ 8  │ 2  │ 1  │        │
│[Av]│ Trần Thị B       │ SV002    │ 5  │[5!]│ 0  │[! Cảnh]│
└────┴──────────────────┴──────────┴────┴────┴────┴────────┘

Legend: CM = Có mặt, KP = Không phép, CP = Có phép
[!] = red badge when KP >= absentLimit
```

### Mobile View
```
Card per student (stacked):
┌──────────────────────────────┐
│ [Avatar] Nguyễn Văn A  [⚠️] │
│          SV001               │
│  CM: 8   KP: 2   CP: 1      │
└──────────────────────────────┘
```

### Absent Warning Badge
```
[⚠ Cảnh báo vắng] — bg-danger-light text-danger rounded-full px-2 text-xs
Shows when: student.kpCount >= subject.absentLimit
```

### Export Button Behavior
```
Click → loading state (spinner in button) → fetch triggers download
File name: "[SubjectCode]_[SubjectName]_DiemDanh.xlsx"
```

## API Requirements

### Get Students with Attendance
- `GET /api/v1/subject/getStudents?subjectId=<id>` (or check actual route)
- Alt: `GET /api/v1/attendRecord/getSummary?subjectId=<id>`
- Auth: Bearer token
- Response: `{ students: StudentAttendanceSummary[] }`
  ```typescript
  interface StudentAttendanceSummary {
    userId: string;
    name: string;
    userCode: string;
    email: string;
    avatar?: string;
    cmCount: number;
    kpCount: number;
    cpCount: number;
  }
  ```

### Export Attendance Excel
- `GET /api/v1/subject/exportAttendance?subjectId=<id>`
- Auth: Bearer token
- Response: binary file (Excel) with `Content-Disposition: attachment; filename=...`

## Backend Changes
None.

## Technical Implementation Notes

### File Download Pattern
```typescript
const handleExport = async () => {
  setExporting(true);
  try {
    const response = await apiClient.get(
      `/subject/exportAttendance?subjectId=${subjectId}`,
      { responseType: 'blob' }
    );
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${subject?.subjectCode}_DiemDanh.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    setExporting(false);
  }
};
```

### Sort Logic
```typescript
const sorted = useMemo(() => {
  const list = [...(students ?? [])];
  if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  if (sortBy === 'absent') list.sort((a, b) => b.kpCount - a.kpCount);
  return list;
}, [students, sortBy]);
```

### File Structure
```
src/app/(dashboard)/teacher/classes/[subjectId]/attendance/
└── page.tsx      # Contains both student list and session list sections

src/components/features/attendance/
├── StudentAttendanceTable.tsx
├── StudentAttendanceCard.tsx   # Mobile card
├── AbsentWarningBadge.tsx
└── AttendanceExportButton.tsx
```

## Acceptance Criteria
- [ ] All enrolled students shown with CM/KP/CP counts
- [ ] Students exceeding absentLimit show warning badge
- [ ] Search filters students by name or code
- [ ] Sort by name and by absent count work
- [ ] Excel export triggers file download
- [ ] Loading skeletons while fetching
- [ ] Mobile shows card layout
- [ ] Total count shown above table

## Testing Requirements
- **Component tests:**
  - `StudentAttendanceTable`: renders rows, sorts correctly, warning badge shows when threshold met
  - `AttendanceExportButton`: calls correct API, shows loading state
  - Sort logic: test name sort and absent sort
- **Manual QA:**
  - Open subject with 5+ students → verify all rows
  - Student with KP >= absentLimit → verify warning badge
  - Click export → verify Excel file downloads with correct filename
  - Search "Nguyen" → verify filtering

## Definition of Done
- Student list with attendance summary renders
- Warning badge shows correctly
- Excel export works
- Search and sort work
- Unit tests pass

## Risks / Notes
- The exact API endpoint for fetching per-student attendance summary needs verification against the backend routes (`/api/v1/attendRecord/` or `/api/v1/subject/`)
- Excel export uses Axios `responseType: 'blob'` — the Axios instance in WEB-004 may need a second instance or override for blob responses
- If the backend doesn't aggregate CM/KP/CP counts, the frontend may need to compute them from raw attendance records (N queries — consider backend-side aggregation)
