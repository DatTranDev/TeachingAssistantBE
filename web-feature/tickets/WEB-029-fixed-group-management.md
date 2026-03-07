# WEB-029 — Fixed Group Management

## Objective
Build the fixed/manual group management feature and the student-facing groups view. Teachers can create named groups, manually add/remove members, and view the final group structure. Students see which group they belong to and who else is in it.

## Background
Alongside random generation, teachers may need to manually assign students to specific groups (e.g., based on project topics, skill balance). This provides full manual control over group composition. Students see their group as a read-only view.

## Scope
- Teacher groups tab: view existing groups, create new group, rename, add/remove members
- Student groups tab: `/student/classes/[subjectId]/groups` — see own group and members
- Create group: `POST /api/v1/group/create`
- Update group (rename, add/remove members): `PATCH /api/v1/group/update`
- Delete individual group: `DELETE /api/v1/group/delete`
- Student view shows only their group prominently

## Out of Scope
- Random generation (WEB-028)
- Group chat (WEB-030)

## Dependencies
- WEB-028 (GroupCard component, shared groups API)
- WEB-014 (subject shell)
- WEB-004 (API service layer)
- WEB-003 (Modal, Select, Avatar, Button, Input)

## User Flow Context
- Teacher: opens Groups tab → creates group manually → assigns students
- Student: opens Groups tab → sees own group with members → "Vào nhóm chat" button (WEB-030)

## Functional Requirements

### Teacher
1. Groups list: reuse `GroupCard` from WEB-028
2. "Tạo nhóm" button (manual) → modal: enter group name → creates empty group
3. Each group card: rename button, "Thêm thành viên" button, "Xóa nhóm" button
4. "Thêm thành viên": searchable dropdown of enrolled students not yet in any group (or any group)
5. Remove member from group: X button on member in card
6. All students shown below groups: "Sinh viên chưa có nhóm" section (ungrouped)

### Student
7. Show student's own group prominently at top: group name, member list
8. "Nhóm của bạn: Nhóm X" heading
9. "Vào nhóm chat" button → links to group chat (WEB-030)
10. If student not in any group: "Bạn chưa được xếp vào nhóm nào"
11. Below: all groups list (read-only, can see all groups and who's in each)

## UI Requirements

### Teacher Group Management
```
[+ Tạo nhóm — primary]  [Tạo ngẫu nhiên — outline (link to WEB-028 flow)]

[Nhóm 1]  [Nhóm 2]  [Nhóm 3]  (grid)

GroupCard with teacher controls:
┌──────────────────────────────────────┐
│  [✏ Nhóm 1]              [🗑 Xóa]   │
│  ─────────────────────────────────  │
│  [Av] Nguyễn A  [×]                 │
│  [Av] Trần B    [×]                 │
│                                      │
│  [+ Thêm thành viên]                │
│  4 thành viên                        │
└──────────────────────────────────────┘

Ungrouped section:
[Sinh viên chưa có nhóm (3)]
[Av] Lê C  [Av] Phạm D  [Av] Hoàng E
(click avatar → assign to group picker)
```

### Add Member Modal
```
Title: "Thêm thành viên vào Nhóm 1"

[Search: "Tìm sinh viên..."]
[Checkbox list of ungrouped students]
• [✓] Nguyễn Văn F
• [ ] Trần Thị G

[Hủy]  [Thêm — primary]
```

### Student Group View
```
[Nhóm của bạn]
┌──────────────────────────────────────┐
│  Nhóm 3                              │
│  ─────────────────────────────────  │
│  [Av] Bạn (Nguyễn Văn A)  — bạn    │
│  [Av] Trần Thị B                    │
│  [Av] Lê Văn C                      │
│  4 thành viên                        │
│                                      │
│  [💬 Vào nhóm chat — primary]       │
└──────────────────────────────────────┘

[Tất cả nhóm (5 nhóm) — collapsed/expandable]
  Nhóm 1: A, B, C (4 thành viên)
  Nhóm 2: D, E, F (4 thành viên)
  ...
```

## API Requirements

### Create Group (Manual)
- `POST /api/v1/group/create`
- Auth: Bearer token (teacher)
- Body: `{ subjectId: string, name: string }`
- Response: `{ group: Group }` (empty group)

### Update Group (Rename / Members)
- `PATCH /api/v1/group/update`
- Auth: Bearer token (teacher)
- Body: `{ groupId: string, name?: string, addMembers?: string[], removeMembers?: string[] }`

### Delete Group
- `DELETE /api/v1/group/delete`
- Auth: Bearer token (teacher)
- Body: `{ groupId: string }`

### Get All Groups (reuse from WEB-028)
- `GET /api/v1/group/getAll?subjectId=<id>`

## Backend Changes
None.

## Technical Implementation Notes

### Inline Rename
```typescript
const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
const [editName, setEditName] = useState('');

// Clicking rename icon: set editingGroupId + editName = group.name
// Pressing Enter or blur: call update API
```

### Ungrouped Students Calculation
```typescript
const groupedUserIds = new Set(groups.flatMap(g => g.members.map(m => m._id)));
const ungrouped = allStudents.filter(s => !groupedUserIds.has(s._id));
```

### Student's Own Group
```typescript
const myGroup = groups.find(g => g.members.some(m => m._id === currentUserId));
```

### File Structure
```
src/app/(dashboard)/
├── teacher/classes/[subjectId]/groups/page.tsx
└── student/classes/[subjectId]/groups/page.tsx

src/components/features/groups/
├── TeacherGroupCard.tsx        # Extends GroupCard with edit controls
├── AddMemberModal.tsx
├── CreateGroupModal.tsx
├── UngroupedStudents.tsx
└── StudentGroupView.tsx
```

## Acceptance Criteria
- [ ] Teacher can create a named empty group
- [ ] Teacher can add/remove members from group
- [ ] Teacher can rename group (inline edit)
- [ ] Teacher can delete a group
- [ ] Ungrouped students section shows students not in any group
- [ ] Student sees own group prominently with "Vào nhóm chat" button
- [ ] Student sees all groups list (read-only)
- [ ] Student not in group sees appropriate empty state
- [ ] Changes reflect immediately (optimistic updates or invalidation)

## Testing Requirements
- **Component tests:**
  - `TeacherGroupCard`: renders edit/delete controls; inline rename
  - `AddMemberModal`: filters already-grouped students; submits correct member IDs
  - `ungrouped` calculation: excludes already-assigned members
  - `myGroup` detection: finds correct group for student
- **Manual QA:**
  - Create group → add 3 students → verify they no longer in ungrouped
  - Rename group → verify name updates
  - Student view → verify correct group shown → "Vào nhóm chat" navigates correctly

## Definition of Done
- Teacher manual group management works end-to-end
- Student group view shows correct group
- "Vào nhóm chat" link works (WEB-030 target)
- Unit tests pass

## Risks / Notes
- Adding members should check if student is already in another group — either prevent it (with error) or auto-remove from old group before adding
- The `update` API with `addMembers`/`removeMembers` arrays assumes backend can handle partial updates; verify API contract
