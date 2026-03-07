# WEB-033 — In-App Notification Center

## Objective
Build the in-app notification center: a dedicated notifications page where users can view all their notifications (absence request outcomes, class cancellations, attendance warnings, etc.), mark them as read, and navigate to the relevant content.

## Background
The app generates notifications for key events: teacher approves/rejects absence requests, teacher sends class cancellation notice, student attendance warning. These are stored in MongoDB and fetched via API. The notification bell in the topbar (WEB-010) shows the unread count; clicking it or the sidebar nav item opens this page.

## Scope
- `/teacher/notifications` — teacher notification list
- `/student/notifications` — student notification list
- Full notifications list with read/unread state
- Mark as read: individual + "Mark all as read"
- Notification types: absent_warning, absence_request (approved/rejected), class_cancellation, class_reschedule, other
- Real-time: new notifications via Socket.IO (or notification bell badge from WEB-010)
- Click notification → navigate to relevant content
- API: `GET /api/v1/notification/get`, `PATCH /api/v1/notification/markRead`

## Out of Scope
- Web push notifications (WEB-034)
- Notification sending from teacher (WEB-016)
- Notification bell badge (already in WEB-010)

## Dependencies
- WEB-010 (notification bell badge integration)
- WEB-004 (API service layer)
- WEB-003 (Badge, Button, Skeleton)

## User Flow Context
- User clicks notification bell or sidebar notifications link → opens notifications page
- Unread notifications shown with highlight
- User clicks notification → navigated to relevant page, notification marked read

## Functional Requirements
1. Fetch all notifications: `GET /api/v1/notification/get`
2. Display sorted newest first
3. Unread notifications highlighted: slightly different background, bold title
4. "Đọc tất cả" button marks all as read: `PATCH /api/v1/notification/markRead` for all
5. Clicking individual notification marks it read + navigates to relevant page
6. Notification type routing:
   - `absent_warning` → student's attendance tab for that subject
   - `absence_request` (approved/rejected) → student's attendance history
   - `class_cancellation` / `class_reschedule` → subject sessions tab
   - `other` → no navigation (generic)
7. Filter tabs: "Tất cả" / "Chưa đọc"
8. Empty state: "Không có thông báo nào"
9. Loading skeletons while fetching
10. Real-time: if new notification arrives while on this page, it should appear at top (via query invalidation or socket)

## UI Requirements

### Notifications Page
```
[Thông báo — title]    [Đọc tất cả — ghost small]

[Filter Tabs: Tất cả | Chưa đọc (3)]

[Notification rows]
```

### Notification Row
```
Unread:
┌────────────────────────────────────────────────────────────┐
│ [•] [Icon] [Title — font-semibold]           [2 giờ trước]│ ← bg-primary/5
│            [Content preview — text-sm text-muted]          │
└────────────────────────────────────────────────────────────┘

Read:
┌────────────────────────────────────────────────────────────┐
│      [Icon] [Title — font-normal]            [2 ngày trước]│ ← bg-surface
│             [Content preview — text-sm text-muted]         │
└────────────────────────────────────────────────────────────┘

[•] = filled blue dot for unread, invisible for read
Hover: bg-neutral-50 cursor-pointer
```

### Notification Type Icons
```
absent_warning:      ⚠️  text-warning bg-warning-light
absence_request:     📋  text-primary bg-primary-light
class_cancellation:  ❌  text-danger bg-danger-light
class_reschedule:    📅  text-success bg-success-light
other:               🔔  text-neutral-600 bg-neutral-100
```

### Mark All Read
```
Button: "Đọc tất cả" — ghost, top-right
Shows count: "Đọc tất cả (3)" when unread > 0
After click: all rows lose unread styling immediately (optimistic)
```

## API Requirements

### Get Notifications
- `GET /api/v1/notification/get`
- Auth: Bearer token
- Response: `{ notifications: Notification[] }` — sorted newest first
  ```typescript
  interface Notification {
    _id: string;
    type: 'absent_warning' | 'absence_request' | 'class_cancellation' | 'class_reschedule' | 'other';
    title: string;
    content: string;
    isRead: boolean;
    subjectId?: string;
    relatedId?: string;  // session ID, request ID, etc.
    createdAt: string;
  }
  ```

### Mark Notification(s) Read
- `PATCH /api/v1/notification/markRead`
- Auth: Bearer token
- Body: `{ notificationIds: string[] }` or `{ all: true }`

## Backend Changes
None.

## Technical Implementation Notes

### Navigation on Click
```typescript
function getNotificationRoute(notification: Notification, role: 'teacher' | 'student'): string | null {
  const base = `/${role}/classes/${notification.subjectId}`;

  switch (notification.type) {
    case 'absent_warning':
      return `${base}/attendance`;
    case 'absence_request':
      return `${base}/attendance`;
    case 'class_cancellation':
    case 'class_reschedule':
      return `${base}/sessions`;
    default:
      return null;
  }
}

const handleClick = async (notification: Notification) => {
  if (!notification.isRead) {
    await markReadMutation.mutateAsync({ notificationIds: [notification._id] });
  }
  const route = getNotificationRoute(notification, role);
  if (route) router.push(route);
};
```

### Optimistic Mark All Read
```typescript
const markAllReadMutation = useMutation({
  mutationFn: () => notificationsApi.markAllRead(),
  onMutate: () => {
    queryClient.setQueryData(
      queryKeys.notifications.all,
      (old: Notification[] | undefined) =>
        old?.map(n => ({ ...n, isRead: true })) ?? []
    );
  },
  onError: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  },
});
```

### Topbar Badge Integration
The notification bell badge in WEB-010 uses `refetchInterval: 30000`. After marking notifications read on this page, invalidate the query so the badge count updates immediately.

### File Structure
```
src/app/(dashboard)/
├── teacher/notifications/page.tsx
└── student/notifications/page.tsx

src/components/features/notifications/
├── NotificationList.tsx
├── NotificationRow.tsx
├── NotificationIcon.tsx
└── MarkAllReadButton.tsx
```

## Acceptance Criteria
- [ ] All notifications shown sorted newest first
- [ ] Unread notifications highlighted with blue background tint
- [ ] Unread count badge on "Chưa đọc" filter tab
- [ ] Clicking notification marks it read + navigates
- [ ] "Đọc tất cả" marks all read optimistically
- [ ] Notification badge in topbar (WEB-010) updates after marking read
- [ ] Filter "Chưa đọc" shows only unread
- [ ] Type-specific icons shown
- [ ] Empty state when no notifications
- [ ] Loading skeletons while fetching

## Testing Requirements
- **Component tests:**
  - `NotificationRow`: renders correctly for read/unread states; calls handleClick
  - `getNotificationRoute()`: returns correct routes for each type
  - Mark all read: optimistic update clears unread state
- **Manual QA:**
  - Teacher sends class cancellation → student sees notification in list
  - Click notification → verify correct page navigation
  - Mark all read → verify all lose unread styling → bell badge drops to 0

## Definition of Done
- Notification list renders with correct states
- Mark read works individually and in bulk
- Navigation to relevant content works
- Bell badge updates after reading
- Unit tests pass

## Risks / Notes
- `subjectId` must be included in notification data for routing to work — verify backend includes this in the notification response
- If many notifications exist (100+), consider pagination (WEB-036 adds backend pagination)
- The 30s refetch interval in WEB-010 means the badge may lag up to 30s before a new notification appears — real-time socket notification delivery is covered in WEB-034
