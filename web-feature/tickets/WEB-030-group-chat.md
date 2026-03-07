# WEB-030 — Group Chat

## Objective
Build the real-time group chat feature: students and teachers can send and receive messages within a subject group. Messages appear in real-time via Socket.IO. The chat is a standard messaging UI with message history, sender info, and timestamps.

## Background
Each group has a dedicated chat room. Students use it to coordinate on group projects. Teachers may also participate. The chat uses Socket.IO for real-time delivery and the backend stores messages in MongoDB for history. This mirrors standard messaging app UX.

## Scope
- Group chat page: `/student/classes/[subjectId]/groups/[groupId]/chat` and teacher equivalent
- Message list with scroll-to-bottom
- Message input with send button
- Real-time: send/receive via Socket.IO `groupMessage` events
- Message history: `GET /api/v1/group/getMessages?groupId=<id>`
- Send message: `POST /api/v1/group/sendMessage` (or via socket emit)
- Online members indicator (optional)

## Out of Scope
- Channel posts (WEB-026)
- Q&A discussion (WEB-024/025)
- File sharing in chat (future enhancement)

## Dependencies
- WEB-029 (groups, `groupId` context)
- WEB-005 (Socket.IO client)
- WEB-004 (API service layer)
- WEB-003 (Avatar, Input, Button)

## User Flow Context
1. Student in Groups tab clicks "Vào nhóm chat" (WEB-029)
2. Chat page opens with message history
3. Student types and sends message → appears immediately
4. Other group members see message in real-time
5. Messages persist across sessions

## Functional Requirements
1. Fetch message history on mount: `GET /api/v1/group/getMessages?groupId=<id>`
2. Auto-scroll to bottom on load and on new message
3. Send message via `POST /api/v1/group/sendMessage` OR emit via socket
4. Receive real-time messages via Socket.IO `newGroupMessage` event
5. Message bubbles: own messages right-aligned (primary), others left-aligned (gray)
6. Group consecutive messages from same sender (no repeated avatar/name within 3 minutes)
7. Date separator: show date between messages from different days
8. Empty state: "Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!"
9. Message input: Enter to send, Shift+Enter for newline
10. Message length limit: 1000 characters
11. Loading state: skeleton messages while fetching history
12. Join/leave socket room on mount/unmount

## UI Requirements

### Chat Page Layout
```
[Group name — header]
[Back to groups]

┌────────────────────────────────────────┐
│  [Message history — scrollable]        │  flex-1
│                                        │
│  [Date: Hôm nay]                       │
│                                        │
│     [Av] [Nguyen A]                    │
│          Tin nhắn từ thành viên khác  │  left-aligned
│                                        │
│                  [Tin nhắn của bạn]   │  right-aligned
│                  [primary bubble]      │
│                                        │
│     [Av] Tin nhắn tiếp theo...       │
└────────────────────────────────────────┘
│  [Input: "Nhập tin nhắn..."]    [➤]  │  h-16 border-t sticky bottom
└────────────────────────────────────────┘
```

### Message Bubble — Own
```
Right side:
[Nội dung tin nhắn của bạn]  bg-primary text-white rounded-2xl rounded-br-sm px-4 py-2
[HH:MM — text-xs text-muted below, right-aligned]
max-width: 70%
```

### Message Bubble — Other
```
Left side:
[Avatar] [Sender name — text-xs text-muted above if first in group]
         [Nội dung tin nhắn]  bg-neutral-100 text-foreground rounded-2xl rounded-bl-sm px-4 py-2
         [HH:MM — text-xs text-muted below]
max-width: 70%
```

### Date Separator
```
─────── Hôm nay ─────── (text-xs text-muted, centered)
─────── 06/01/2025 ───────
```

### Input Area
```
[Textarea auto-resize — 1-4 rows]  [Send button →]
Enter = send, Shift+Enter = newline
Disabled if empty or only whitespace
```

## API Requirements

### Get Message History
- `GET /api/v1/group/getMessages?groupId=<id>`
- Auth: Bearer token
- Response: `{ messages: GroupMessage[] }` — sorted oldest to newest
  ```typescript
  interface GroupMessage {
    _id: string;
    groupId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    createdAt: string;
  }
  ```

### Send Message
- `POST /api/v1/group/sendMessage`
- OR: emit `sendGroupMessage` via Socket.IO (check backend)
- Auth: Bearer token
- Body: `{ groupId: string, content: string }`
- Response: `{ message: GroupMessage }`

## Backend Changes
None.

## Technical Implementation Notes

### Socket.IO Group Chat Room
```typescript
useEffect(() => {
  const socket = getSocket();
  socket.emit('joinGroup', { groupId });

  socket.on('newGroupMessage', (message: GroupMessage) => {
    setMessages(prev => [...prev, message]);
    scrollToBottom();
  });

  return () => {
    socket.off('newGroupMessage');
    socket.emit('leaveGroup', { groupId });
  };
}, [groupId]);
```

### Auto-scroll
```typescript
const bottomRef = useRef<HTMLDivElement>(null);

const scrollToBottom = () => {
  bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
};

useEffect(() => { scrollToBottom(); }, [messages]);

// In JSX: <div ref={bottomRef} />
```

### Message Grouping
```typescript
interface MessageGroup {
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  messages: GroupMessage[];
  startTime: Date;
}

function groupMessages(messages: GroupMessage[]): MessageGroup[] {
  // Group consecutive messages from the same sender within 3 minutes
  const groups: MessageGroup[] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    const timeDiff = last
      ? (new Date(msg.createdAt).getTime() - new Date(last.messages[last.messages.length - 1].createdAt).getTime()) / 1000 / 60
      : Infinity;

    if (last && last.senderId === msg.senderId && timeDiff < 3) {
      last.messages.push(msg);
    } else {
      groups.push({
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderAvatar: msg.senderAvatar,
        messages: [msg],
        startTime: new Date(msg.createdAt),
      });
    }
  }
  return groups;
}
```

### Optimistic Send
```typescript
const handleSend = () => {
  const content = inputValue.trim();
  if (!content) return;

  const optimistic: GroupMessage = {
    _id: `temp-${Date.now()}`,
    groupId,
    senderId: currentUser._id,
    senderName: currentUser.name,
    content,
    createdAt: new Date().toISOString(),
  };

  setMessages(prev => [...prev, optimistic]);
  setInputValue('');
  scrollToBottom();

  sendMessageMutation.mutate({ groupId, content }, {
    onError: () => {
      setMessages(prev => prev.filter(m => m._id !== optimistic._id));
      toast.error('Gửi tin nhắn thất bại');
    },
  });
};
```

### File Structure
```
src/app/(dashboard)/
├── student/classes/[subjectId]/groups/[groupId]/chat/page.tsx
└── teacher/classes/[subjectId]/groups/[groupId]/chat/page.tsx

src/components/features/chat/
├── ChatWindow.tsx
├── MessageBubble.tsx
├── MessageInput.tsx
├── MessageGroupDisplay.tsx
├── DateSeparator.tsx
└── ChatSkeleton.tsx
```

## Acceptance Criteria
- [ ] Message history loads and displays oldest to newest
- [ ] Auto-scrolls to bottom on load
- [ ] Sending a message shows it immediately (optimistic)
- [ ] Other group members receive messages in real-time
- [ ] Own messages right-aligned (primary), others left-aligned (gray)
- [ ] Date separators between different days
- [ ] Consecutive messages from same sender grouped
- [ ] Enter sends, Shift+Enter creates newline
- [ ] Empty state when no messages
- [ ] Loading skeleton while fetching history

## Testing Requirements
- **Component tests:**
  - `MessageBubble`: own vs other styling based on `isOwn` prop
  - `groupMessages()`: correctly groups consecutive same-sender messages within 3min
  - `MessageInput`: Enter sends; Shift+Enter doesn't; disabled when empty
  - Socket mock: new message appends to list
- **Manual QA:**
  - Open chat in two browsers → send message in one → verify real-time in other
  - Refresh page → verify history persists
  - Send 5 consecutive messages → verify grouped (no repeated avatar)

## Definition of Done
- Group chat works in real-time
- Message history persists
- Message grouping and date separators work
- Unit tests pass

## Risks / Notes
- Long chat histories may cause performance issues — consider virtual scrolling or lazy loading older messages (pagination) for production
- Socket.IO event names `joinGroup`, `leaveGroup`, `newGroupMessage` need verification against backend `app.js`
- The `sendGroupMessage` socket event vs REST API for sending — check if backend handles both or just one
