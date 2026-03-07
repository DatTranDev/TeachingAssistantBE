# WEB-025 — Real-time Q&A Moderation (Teacher)

## Objective
Build the teacher-facing Q&A moderation view within the Discussion tab: teachers see all student questions, can mark questions as answered, delete inappropriate questions, and pin important questions to the top. Real-time updates show new questions as students post them.

## Background
Teachers moderate the Q&A space. Marking a question "answered" signals to students that it's been addressed. Deletion removes spam or inappropriate content. The teacher view builds on the same Socket.IO room as the student view (WEB-024) but adds moderation controls.

## Scope
- Teacher discussion tab: `/teacher/classes/[subjectId]/discussion`
- Same question list as student view + moderation controls
- Mark as answered: `PATCH /api/v1/discussion/markAnswered`
- Delete question: `DELETE /api/v1/discussion/delete`
- Pin question (if backend supports): display pinned at top
- Real-time: same Socket.IO events as WEB-024 + emit answered/deleted events

## Out of Scope
- Student question posting (WEB-024)
- Channel posts (WEB-026)

## Dependencies
- WEB-024 (discussion components — reuse QuestionCard, QuestionList)
- WEB-005 (Socket.IO)
- WEB-004 (API service layer)
- WEB-003 (Button, DropdownMenu)

## User Flow Context
1. Teacher opens Discussion tab
2. Sees all questions in real-time as students post
3. Teacher clicks "Đánh dấu đã trả lời" → question gets answered badge (all students see it)
4. Teacher deletes inappropriate question → question removed for all
5. Teacher can answer verbally in class while marking digitally

## Functional Requirements
1. Same data fetch and Socket.IO subscription as WEB-024
2. Each question card has additional teacher controls:
   - "Đã trả lời" button (if not answered) / "Bỏ đánh dấu" (if answered)
   - "Xóa" button (with confirmation)
3. Mark answered: `PATCH /api/v1/discussion/markAnswered` with `{ discussionId }`
4. Emits `questionAnswered` to room — all students see badge update in real-time
5. Delete: `DELETE /api/v1/discussion/delete` with `{ discussionId }`
6. On delete: optimistic removal from list; emit socket event for all students
7. All students' views update via Socket.IO when teacher moderates
8. Same sort/filter options as student view
9. Teacher can react to questions (same as students)
10. Unanswered count shown as prominent metric: "X câu hỏi chưa trả lời"

## UI Requirements

### Teacher Discussion Layout
```
[X câu hỏi chưa trả lời — prominent count badge]

[Sort/Filter bar — same as student]

[Question cards with teacher controls:]
┌──────────────────────────────────────────────────────────┐
│  [Avatar] [Name]                    [2 giờ trước]  [⋮]  │
│                                                          │
│  Nội dung câu hỏi của sinh viên...                       │
│                                                          │
│  [👍 12]  [✓ Đánh dấu đã trả lời]                      │
└──────────────────────────────────────────────────────────┘

Context menu [⋮]:
  [✓ Đánh dấu đã trả lời]
  [✗ Bỏ đánh dấu đã trả lời]  (if answered)
  [🗑 Xóa câu hỏi — danger]
```

### Unanswered Count Banner
```
[🔔 5 câu hỏi chưa được trả lời]
bg-warning-light text-warning rounded-lg p-3 mb-4
```

### Mark Answered Button
```
Not answered: [✓ Đánh dấu đã trả lời — outline-success small]
Answered:     [✓ Đã trả lời — filled success] + [Bỏ đánh dấu — ghost small]
```

### Delete Confirmation
```
"Xóa câu hỏi này? Hành động không thể hoàn tác."
[Hủy]  [Xóa — danger]
```

## API Requirements

### Mark Question Answered
- `PATCH /api/v1/discussion/markAnswered`
- Auth: Bearer token (teacher)
- Body: `{ discussionId: string, isAnswered: boolean }`
- Side effect: Socket.IO emits `questionAnswered` to room

### Delete Question
- `DELETE /api/v1/discussion/delete`
- Auth: Bearer token (teacher)
- Body: `{ discussionId: string }`
- Side effect: Socket.IO emits `questionDeleted` to room

## Backend Changes
None.

## Technical Implementation Notes

### Reuse Student Components
The teacher discussion page reuses `QuestionList`, `QuestionCard`, `DiscussionFilterBar` from WEB-024. It extends `QuestionCard` to accept a `moderationControls` prop:

```tsx
interface QuestionCardProps {
  question: Discussion;
  currentUserId: string;
  moderationControls?: React.ReactNode;  // Teacher injects controls here
}
```

### Socket Events for Deletion
```typescript
socket.on('questionDeleted', ({ discussionId }: { discussionId: string }) => {
  queryClient.setQueryData(
    queryKeys.discussions.bySubject(subjectId),
    (old: Discussion[] | undefined) =>
      old?.filter(d => d._id !== discussionId) ?? []
  );
});
```

### Mark Answered Mutation
```typescript
const markAnsweredMutation = useMutation({
  mutationFn: ({ discussionId, isAnswered }: { discussionId: string; isAnswered: boolean }) =>
    discussionApi.markAnswered({ discussionId, isAnswered }),
  onSuccess: (_, { discussionId, isAnswered }) => {
    queryClient.setQueryData(
      queryKeys.discussions.bySubject(subjectId),
      (old: Discussion[] | undefined) =>
        old?.map(d => d._id === discussionId ? { ...d, isAnswered } : d) ?? []
    );
  },
});
```

### File Structure
```
src/app/(dashboard)/teacher/classes/[subjectId]/discussion/
└── page.tsx

src/components/features/discussion/teacher/
├── TeacherQuestionControls.tsx   # Moderation buttons
├── UnansweredCountBanner.tsx
└── DeleteQuestionDialog.tsx
```

## Acceptance Criteria
- [ ] Teacher sees all questions with moderation controls
- [ ] "Đánh dấu đã trả lời" updates badge on question for all viewers
- [ ] "Bỏ đánh dấu" removes the answered badge
- [ ] Delete question removes it from all viewers' lists
- [ ] Delete requires confirmation
- [ ] Unanswered count banner shows correct count
- [ ] Real-time: new questions appear without refresh
- [ ] Same sort/filter options as student view work

## Testing Requirements
- **Component tests:**
  - `TeacherQuestionControls`: renders mark-answered and delete buttons; calls correct mutations
  - `DeleteQuestionDialog`: disabled delete until confirmed
  - Socket mock: `questionDeleted` removes from list
- **Manual QA:**
  - Mark question answered → verify student sees answered badge (WEB-024 browser)
  - Delete question → verify question removed from student view
  - Multiple students posting → verify all appear in teacher view in real-time

## Definition of Done
- Teacher can mark answers and delete questions
- Real-time updates work for all room members
- Reuses student discussion components
- Unit tests pass

## Risks / Notes
- Socket.IO event for deletion `questionDeleted` needs backend verification — may not be implemented yet; if not, after deleting, only the current teacher sees it removed (others see on refresh)
- Ensure teacher cannot delete own questions through the student interface path (access control should be role-based)
