# WEB-028 — Random Group Generation

## Objective
Build the teacher's random group generation feature: teachers can generate random student groups for a subject, configure group size or count, and the system randomly assigns enrolled students. Generated groups are saved and visible to both teachers and students.

## Background
Teachers frequently divide classes into groups for projects, presentations, or activities. Random group generation saves time and removes bias. The backend handles the randomization algorithm. Teachers configure parameters and trigger generation; the result is persisted.

## Scope
- Groups tab (teacher): `/teacher/classes/[subjectId]/groups`
- Random group generation: configure group count or size → `POST /api/v1/group/random`
- View generated groups: list of groups with their members
- Delete all groups and regenerate
- API: `GET /api/v1/group/getAll`, `POST /api/v1/group/random`, `DELETE /api/v1/group/deleteAll`

## Out of Scope
- Fixed/manual groups (WEB-029)
- Group chat (WEB-030)

## Dependencies
- WEB-014 (subject shell)
- WEB-004 (API service layer)
- WEB-003 (Card, Button, Input, Avatar, ConfirmDialog)

## User Flow Context
1. Teacher opens Groups tab
2. No groups exist → sees "Generate groups" form
3. Configures: number of groups OR members per group
4. Clicks "Tạo nhóm ngẫu nhiên" → groups generated and displayed
5. Teacher can regenerate (delete all + generate again)
6. Students see their group in the Groups tab (WEB-029 handles their view)

## Functional Requirements
1. Fetch groups: `GET /api/v1/group/getAll?subjectId=<id>`
2. If no groups: show generation form
3. If groups exist: show groups list + "Tạo lại" button
4. Generation form options:
   - "Số nhóm" (group count): enter number → system divides students evenly
   - "Số thành viên mỗi nhóm" (size per group): enter number → system creates enough groups
   - Toggle between the two modes
5. Submit: `POST /api/v1/group/random` with `{ subjectId, groupCount? | memberCount? }`
6. Response: array of generated groups with members
7. Show groups as cards: group name (Nhóm 1, Nhóm 2...), member list with avatars
8. "Tạo lại nhóm" shows confirm dialog → deletes all → generates new
9. Teacher can rename individual groups (optional enhancement)
10. Show total groups count and average members per group

## UI Requirements

### Empty State (No Groups)
```
[Groups icon]
"Chưa có nhóm nào"
"Tạo nhóm ngẫu nhiên để phân chia sinh viên"

[Generation Config Card:]
  Chia theo:  ○ Số nhóm  ● Số thành viên/nhóm

  [Số nhóm:]      [Input number]
  OR
  [Thành viên/nhóm:] [Input number]

  Kết quả ước tính: ~X nhóm (~Y thành viên/nhóm)

  [Tạo nhóm ngẫu nhiên — primary full-width]
```

### Groups List
```
[5 nhóm — 30 sinh viên — 6 người/nhóm]   [Tạo lại — outline]

Grid 2-3 cols:
┌──────────────────────┐  ┌──────────────────────┐
│  Nhóm 1              │  │  Nhóm 2              │
│  ─────────────────  │  │  ─────────────────  │
│  [Av] Nguyễn Văn A  │  │  [Av] Trần Thị B    │
│  [Av] Lê Văn C      │  │  [Av] Phạm Thị D    │
│  [Av] Đặng Thị E    │  │  [Av] Hoàng Văn F   │
│  ...                 │  │  ...                 │
│  6 thành viên        │  │  6 thành viên        │
└──────────────────────┘  └──────────────────────┘
```

### Group Card
```
[Group name — font-semibold]
[Member list — avatar + name rows]
[N thành viên — text-sm text-muted at bottom]
border rounded-xl p-4
```

### Regenerate Confirmation
```
"Tạo lại nhóm?"
"Tất cả nhóm hiện tại sẽ bị xóa và tạo ngẫu nhiên lại."
[Hủy]  [Tạo lại — primary]
```

### Preview Calculation
```typescript
// Estimate before generating
if (mode === 'groupCount') {
  const membersPerGroup = Math.ceil(totalStudents / groupCount);
  preview = `~${groupCount} nhóm (~${membersPerGroup} thành viên/nhóm)`;
}
if (mode === 'memberCount') {
  const groupCount = Math.ceil(totalStudents / memberCount);
  preview = `~${groupCount} nhóm (~${memberCount} thành viên/nhóm)`;
}
```

## API Requirements

### Get Groups
- `GET /api/v1/group/getAll?subjectId=<id>`
- Auth: Bearer token
- Response: `{ groups: Group[] }` — each group has `{ _id, name, members: User[], subjectId }`

### Generate Random Groups
- `POST /api/v1/group/random`
- Auth: Bearer token (teacher only)
- Body: `{ subjectId: string, groupCount?: number, memberCount?: number }`
- Response: `{ groups: Group[] }` — newly generated groups

### Delete All Groups
- `DELETE /api/v1/group/deleteAll`
- Auth: Bearer token (teacher only)
- Body: `{ subjectId: string }`

## Backend Changes
None.

## Technical Implementation Notes

### Generation Form Zod Schema
```typescript
const generateGroupSchema = z.object({
  mode: z.enum(['groupCount', 'memberCount']),
  groupCount: z.number().int().min(2).max(50).optional(),
  memberCount: z.number().int().min(2).max(30).optional(),
}).refine(
  (d) => (d.mode === 'groupCount' ? !!d.groupCount : !!d.memberCount),
  { message: 'Vui lòng nhập số lượng' }
);
```

### File Structure
```
src/app/(dashboard)/teacher/classes/[subjectId]/groups/
└── page.tsx

src/components/features/groups/
├── RandomGroupGenerator.tsx    # Form to configure generation
├── GroupsGrid.tsx
├── GroupCard.tsx
└── RegenerateDialog.tsx
```

## Acceptance Criteria
- [ ] Empty state shows generation form when no groups exist
- [ ] "Số nhóm" mode calculates preview correctly
- [ ] "Thành viên/nhóm" mode calculates preview correctly
- [ ] "Tạo nhóm ngẫu nhiên" calls API and displays groups
- [ ] Group cards show group name and member list with avatars
- [ ] "Tạo lại" shows confirmation before regenerating
- [ ] Summary shows total groups, students, avg size
- [ ] Loading state during generation
- [ ] Error if groupCount or memberCount is invalid (< 2)

## Testing Requirements
- **Component tests:**
  - `RandomGroupGenerator`: toggle between modes; preview calculation; validates min 2
  - `GroupCard`: renders group name and member count
  - Generation mutation: calls correct API params based on mode
- **Manual QA:**
  - Generate with groupCount=5 for 30 students → verify 5 groups, ~6 members each
  - Regenerate → confirm dialog → new groups shown
  - Student view (WEB-029) shows student's own group

## Definition of Done
- Group generation form works
- Generated groups display correctly
- Regeneration with confirmation works
- Unit tests pass

## Risks / Notes
- The backend randomization may not distribute perfectly evenly (some groups get extra member) — this is expected and the preview should use `Math.ceil` to set expectations
- If `DELETE /api/v1/group/deleteAll` endpoint doesn't exist, check `group_route.js` for actual endpoint name
- Group generation is destructive (deletes existing groups) — always require confirmation before regenerating
