# WEB-026 — Subject Channel & Posts

## Objective
Build the Subject Channel feature: a teacher-managed announcement/content channel within a subject where teachers post updates, links, and content. Students can view posts and react to them. This is a one-way broadcast channel (teacher posts, students read and react).

## Background
The Channel is distinct from the Q&A Discussion — it's for teacher-curated content: announcements, lecture notes links, important dates, resources. Teachers post; students consume and react. Think of it as a class "feed" or announcement board.

## Scope
- Channel tab: `/teacher/classes/[subjectId]/channel` and `/student/classes/[subjectId]/channel`
- Create post modal (teacher only): title, content, optional image/link
- Post list sorted by newest first
- Student/Teacher react to posts: `POST /api/v1/channel/react`
- Fetch: `GET /api/v1/channel/getPosts?subjectId=<id>`
- Real-time: new posts appear via Socket.IO `newPost` event

## Out of Scope
- Group chat (WEB-030)
- Q&A discussion (WEB-024/025)
- Document uploads (WEB-027)

## Dependencies
- WEB-014 (subject shell)
- WEB-005 (Socket.IO)
- WEB-004 (API service layer)
- WEB-003 (Card, Button, Avatar, Badge)

## User Flow Context
- Teacher: opens Channel tab → creates post → students see it appear in real-time
- Student: opens Channel tab → reads announcements → reacts

## Functional Requirements
1. Fetch posts: `GET /api/v1/channel/getPosts?subjectId=<id>`
2. Posts sorted newest first (reverse chronological)
3. Each post: author (teacher name + avatar), title (optional), content, timestamp, reaction count, user's reaction state
4. Teacher-only: "Tạo bài đăng" button opens post creation modal
5. Post creation: title (optional), content (required, up to 2000 chars), image URL or link (optional)
6. On create: `POST /api/v1/channel/createPost`; optimistic insert at top of list
7. React to post: `POST /api/v1/channel/react` with `{ postId }`
8. Teacher can delete own posts: `DELETE /api/v1/channel/deletePost`
9. Real-time: subscribe to Socket.IO `newPost` event → add to top of list
10. Empty state: "Chưa có bài đăng nào" (student) / "Tạo bài đăng đầu tiên" (teacher)

## UI Requirements

### Channel Feed Layout
```
[Teacher only: + Tạo bài đăng — top right]

[Post cards — stacked vertically]

[Empty state]
```

### Post Card
```
┌──────────────────────────────────────────────────────┐
│  [Avatar] [Teacher Name]             [1 ngày trước]  │
│                                                      │
│  [Title — text-lg font-semibold (if exists)]         │
│                                                      │
│  Nội dung bài đăng của giảng viên. Có thể nhiều dòng │
│  và chứa các thông tin quan trọng cho lớp học.       │
│                                                      │
│  [🔗 Link đính kèm] (if present)                    │
│                                                      │
│  [❤ 8]  [• • •  (teacher: delete)]                  │
└──────────────────────────────────────────────────────┘
border rounded-xl p-5
```

### Create Post Modal (Teacher)
```
Title: "Tạo bài đăng"

[Tiêu đề (tùy chọn)]    [Input]
[Nội dung *]             [Textarea rows=5, max 2000 chars]
[Đường dẫn đính kèm]    [Input — URL, optional]
                         [Character counter for content]

[Hủy]  [Đăng — primary]
```

### Reaction Button
```
[❤ 8] — ghost/outline
Reacted: [❤ 8] — filled red/primary
```

## API Requirements

### Get Posts
- `GET /api/v1/channel/getPosts?subjectId=<id>`
- Auth: Bearer token
- Response: `{ posts: ChannelPost[] }` — includes author info, reactionCount, userReacted

### Create Post
- `POST /api/v1/channel/createPost`
- Auth: Bearer token (teacher only)
- Body: `{ subjectId, title?, content, link? }`
- Response: `{ post: ChannelPost }`

### React to Post
- `POST /api/v1/channel/react`
- Auth: Bearer token
- Body: `{ postId: string }`
- Response: `{ reactionCount: number, userReacted: boolean }`

### Delete Post
- `DELETE /api/v1/channel/deletePost`
- Auth: Bearer token (teacher only)
- Body: `{ postId: string }`

## Backend Changes
None.

## Technical Implementation Notes

### Real-time New Posts
```typescript
socket.on('newPost', (post: ChannelPost) => {
  queryClient.setQueryData(
    queryKeys.channel.posts(subjectId),
    (old: ChannelPost[] | undefined) => [post, ...(old ?? [])]
  );
});
```

### Optimistic Post Creation
```typescript
const createPostMutation = useMutation({
  mutationFn: channelApi.createPost,
  onMutate: async (newPost) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.channel.posts(subjectId) });
    const optimistic: ChannelPost = {
      _id: `temp-${Date.now()}`,
      ...newPost,
      author: currentUser,
      reactionCount: 0,
      userReacted: false,
      createdAt: new Date().toISOString(),
    };
    queryClient.setQueryData(
      queryKeys.channel.posts(subjectId),
      (old: ChannelPost[] | undefined) => [optimistic, ...(old ?? [])]
    );
    return { optimistic };
  },
  onError: (_, __, ctx) => {
    // Revert
    queryClient.invalidateQueries({ queryKey: queryKeys.channel.posts(subjectId) });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.channel.posts(subjectId) });
    toast.success('Đã đăng bài');
  },
});
```

### Relative Time Display
```typescript
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi });
// "1 ngày trước", "2 giờ trước", "vài giây trước"
```

Add `date-fns` to dependencies.

### File Structure
```
src/app/(dashboard)/
├── teacher/classes/[subjectId]/channel/page.tsx
└── student/classes/[subjectId]/channel/page.tsx

src/components/features/channel/
├── PostCard.tsx
├── PostReactionButton.tsx
├── CreatePostModal.tsx
└── PostList.tsx
```

## Acceptance Criteria
- [ ] Channel feed shows posts sorted newest first
- [ ] Teacher "Tạo bài đăng" button creates and shows post optimistically
- [ ] Students see new posts in real-time via Socket.IO
- [ ] Reaction button toggles; count updates immediately
- [ ] Teacher can delete own posts
- [ ] Links in posts are clickable (open in new tab)
- [ ] Relative timestamps ("2 giờ trước") displayed
- [ ] Empty state per role
- [ ] Loading skeletons while fetching

## Testing Requirements
- **Component tests:**
  - `PostCard`: renders title, content, reaction count; link opens new tab
  - `CreatePostModal`: validates required content, submits with optional fields
  - `PostReactionButton`: toggles state on click
- **Manual QA:**
  - Teacher creates post → student sees it appear in real-time
  - React to post → count increments immediately
  - Delete post → removed from feed

## Definition of Done
- Channel feed loads and shows posts
- Teacher can create and delete posts
- Reactions work for both roles
- Real-time new posts work
- Unit tests pass

## Risks / Notes
- `date-fns` adds ~13KB gzipped but provides robust localization — use tree-shaking (`import { formatDistanceToNow } from 'date-fns'`)
- Socket.IO event name `newPost` needs backend verification
- The Channel and Discussion are separate features with different APIs — avoid confusing the two in the routing/component structure
