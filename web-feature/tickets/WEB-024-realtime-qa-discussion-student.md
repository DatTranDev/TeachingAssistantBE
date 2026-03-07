# WEB-024 — Real-time Q&A Discussion (Student)

## Objective
Build the student-facing real-time Q&A discussion feature within a subject: students can post questions, upvote/react to existing questions, and see questions answered by the teacher in real-time. Questions appear live without page refresh via Socket.IO.

## Background
The Discussion tab provides a real-time Q&A channel where students ask questions during or outside class. Unlike a chat, questions are the primary entity — they can be upvoted, and teachers can mark them as answered. This replaces hand-raising and chat clutter during class.

## Scope
- Student discussion tab: `/student/classes/[subjectId]/discussion`
- List of questions sorted by: most recent, most upvoted
- Post new question (text only, anonymous option per subject settings)
- React/upvote a question: `POST /api/v1/discussion/react`
- Real-time: new questions and reactions via Socket.IO events
- Question status: unanswered, answered (teacher marked)
- Filter: all questions / unanswered / my questions

## Out of Scope
- Teacher answer/moderation (WEB-025)
- Channel posts (WEB-026)
- Group chat (WEB-030)

## Dependencies
- WEB-014 (subject shell, `useSubject()`)
- WEB-005 (Socket.IO client)
- WEB-004 (API service layer)
- WEB-003 (Card, Button, Badge, Textarea)

## User Flow Context
1. Student opens Discussion tab in a subject
2. Sees existing questions sorted by recency or votes
3. Types a question → posts → appears in list immediately
4. Student upvotes another student's question
5. Teacher marks question as answered → badge updates in real-time

## Functional Requirements
1. Fetch questions: `GET /api/v1/discussion/getAll?subjectId=<id>`
2. Sort toggle: "Mới nhất" (recent) / "Nhiều vote nhất" (most voted)
3. Filter: All / Chưa trả lời / Của tôi
4. Post question: `POST /api/v1/discussion/create` with `{ subjectId, content }`
5. React (upvote): `POST /api/v1/discussion/react` with `{ discussionId }`
6. Cannot react to own question
7. Reaction count displayed; user's own reaction highlighted
8. Real-time: join Socket.IO room on mount, listen for:
   - `newQuestion` → add to list
   - `questionReacted` → update reaction count
   - `questionAnswered` → update answered status
9. Question cards show: author (or "Ẩn danh"), time, content, reaction count, answered badge
10. Character limit on question: 500 chars (show countdown)
11. Empty state: "Chưa có câu hỏi nào"

## UI Requirements

### Discussion Tab Layout
```
[Đặt câu hỏi — text input area]
[Gửi — primary button]

[Sort/Filter row:]
[Mới nhất | Nhiều vote nhất]    [Tất cả | Chưa trả lời | Của tôi]

[Question cards list — scrollable]
```

### Ask Question Input
```
[Textarea — "Đặt câu hỏi..." rows=2, max 500 chars]
[Character counter: 0/500 — right-aligned below]
[Gửi câu hỏi — primary, disabled if empty or >500]
```

### Question Card
```
┌──────────────────────────────────────────────────┐
│  [Avatar] [Name or Ẩn danh]    [2 giờ trước]    │
│                                                  │
│  Nội dung câu hỏi của sinh viên...               │
│                                                  │
│  [👍 12]  [✓ Đã trả lời]                        │
│           (only if teacher marked answered)       │
└──────────────────────────────────────────────────┘
border rounded-xl p-4 hover:bg-neutral-50
```

### Reaction Button
```
Unreacted: [👍 12] — outline/ghost variant
Reacted:   [👍 12] — filled primary variant (user's own reaction)
Own question: reaction button disabled/hidden
```

### Answered Badge
```
[✓ Đã trả lời] — bg-success-light text-success rounded-full px-2 text-xs
```

### Real-time Indicator
```
[● Đang kết nối...] / [● Trực tiếp] — small dot + text in top-right of tab
Connected: green dot, text "Trực tiếp"
Disconnected: gray dot, text "Đang kết nối..."
```

## API Requirements

### Get Questions
- `GET /api/v1/discussion/getAll?subjectId=<id>`
- Auth: Bearer token
- Response: `{ discussions: Discussion[] }` — includes author, reactionCount, isAnswered, userReacted

### Post Question
- `POST /api/v1/discussion/create`
- Auth: Bearer token
- Body: `{ subjectId: string, content: string }`
- Response: `{ discussion: Discussion }`

### React to Question
- `POST /api/v1/discussion/react`
- Auth: Bearer token
- Body: `{ discussionId: string }`
- Response: `{ reactionCount: number, userReacted: boolean }`

## Backend Changes
None.

## Technical Implementation Notes

### Socket.IO Room + Events
```typescript
// Join subject discussion room
useEffect(() => {
  const socket = getSocket();
  socket.emit('joinSubject', { subjectId });

  socket.on('newQuestion', (question: Discussion) => {
    queryClient.setQueryData(
      queryKeys.discussions.bySubject(subjectId),
      (old: Discussion[] | undefined) => [question, ...(old ?? [])]
    );
  });

  socket.on('questionReacted', ({ discussionId, reactionCount, userReacted }) => {
    queryClient.setQueryData(
      queryKeys.discussions.bySubject(subjectId),
      (old: Discussion[] | undefined) =>
        old?.map(d =>
          d._id === discussionId ? { ...d, reactionCount, userReacted } : d
        ) ?? []
    );
  });

  socket.on('questionAnswered', ({ discussionId }) => {
    queryClient.setQueryData(
      queryKeys.discussions.bySubject(subjectId),
      (old: Discussion[] | undefined) =>
        old?.map(d =>
          d._id === discussionId ? { ...d, isAnswered: true } : d
        ) ?? []
    );
  });

  return () => {
    socket.off('newQuestion');
    socket.off('questionReacted');
    socket.off('questionAnswered');
    socket.emit('leaveSubject', { subjectId });
  };
}, [subjectId]);
```

### Client-side Sort and Filter
```typescript
const displayed = useMemo(() => {
  let filtered = discussions ?? [];

  if (filter === 'unanswered') filtered = filtered.filter(d => !d.isAnswered);
  if (filter === 'mine') filtered = filtered.filter(d => d.authorId === currentUserId);

  if (sort === 'recent') filtered = [...filtered].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  if (sort === 'votes') filtered = [...filtered].sort((a, b) => b.reactionCount - a.reactionCount);

  return filtered;
}, [discussions, filter, sort, currentUserId]);
```

### File Structure
```
src/app/(dashboard)/student/classes/[subjectId]/discussion/
└── page.tsx

src/components/features/discussion/
├── QuestionInput.tsx
├── QuestionCard.tsx
├── QuestionList.tsx
├── ReactionButton.tsx
├── AnsweredBadge.tsx
└── DiscussionFilterBar.tsx
```

## Acceptance Criteria
- [ ] Questions list loads on tab open
- [ ] Student can post a question (max 500 chars)
- [ ] Character counter shown in input
- [ ] New question appears at top without page refresh (real-time)
- [ ] Student can upvote a question; count increments immediately
- [ ] Own question cannot be upvoted
- [ ] Teacher marking answered updates badge in real-time (WEB-025)
- [ ] Sort by recent and by votes works
- [ ] Filter by unanswered and by "my questions" works
- [ ] Connection status indicator shows
- [ ] Empty state shows when no questions

## Testing Requirements
- **Component tests:**
  - `QuestionInput`: disables button when empty or >500 chars; shows character count
  - `QuestionCard`: renders author, content, reaction count, answered badge
  - `ReactionButton`: calls API on click; shows filled when reacted; disabled for own question
  - Socket mock: verify `newQuestion` event adds to list
- **Manual QA:**
  - Post question → see in list immediately
  - Open same page in second browser → post question → verify appears in both
  - Upvote → verify count increments
  - Teacher marks answered (WEB-025) → verify badge appears

## Definition of Done
- Students can post and react to questions
- Real-time updates via Socket.IO work
- Sort and filter function correctly
- Unit tests pass

## Risks / Notes
- Socket.IO event names (`newQuestion`, `questionReacted`, `questionAnswered`) need verification against backend `app.js` — use exact names from the backend
- The `userReacted` field must be included in API responses to correctly show reaction state after page load
- Anonymous posting depends on subject settings (`allowAnonymous`) — if enabled, show "Ẩn danh" instead of author name; check subject detail for this field
