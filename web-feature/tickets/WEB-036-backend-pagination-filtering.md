# WEB-036 — Backend Pagination & Filtering

## Objective
Add pagination and filtering support to key backend API endpoints that return lists, ensuring the web frontend can handle large datasets efficiently without loading everything at once.

## Background
Several endpoints return full unbounded lists (all students in a subject, all notifications, all sessions, all discussions). As subjects grow, these become slow. Adding cursor-based or offset-based pagination and server-side filtering prevents performance degradation and enables frontend infinite scroll or page controls.

## Scope
Backend changes only. Affected endpoints:
- `GET /api/v1/notification/get` — paginate notifications (default page 1, limit 20)
- `GET /api/v1/discussion/getAll` — paginate and filter by answered/unanswered
- `GET /api/v1/cAttend/getAll` — paginate sessions (default limit 20)
- `GET /api/v1/attendRecord/getBySession` — no pagination (sessions are bounded by enrollment)
- `GET /api/v1/channel/getPosts` — paginate posts (default limit 20)
- `GET /api/v1/group/getMessages` — paginate chat history (default limit 50)

Frontend integration notes for each endpoint.

## Out of Scope
- Frontend pagination UI (each feature ticket handles its own load-more UI)
- Search/full-text search (separate concern)
- MongoDB Atlas Search

## Dependencies
- None (standalone backend enhancement)

## User Flow Context
Transparent to users. Faster loading, reduced memory usage, enables smooth scrolling in chat and discussion.

## Functional Requirements

### Pagination Standard
All paginated endpoints accept:
- `page` (integer, default 1) — for offset pagination
- `limit` (integer, default 20, max 100) — page size
- Response wrapper:
  ```json
  {
    "data": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
  ```

### Chat Messages: Cursor-based (better for real-time)
- Accept `before` (message ID) for loading older messages
- Response: `{ messages: [...], hasMore: boolean }`
- Load 50 most recent on first open; load older on scroll up

### Discussion Filtering
- Add `?isAnswered=true|false` filter
- Add `?sort=recent|votes` (already may exist)

### Notification Filtering
- Add `?isRead=true|false` filter (reduces need to load all for "Chưa đọc" tab)

## Backend Changes

### Generic Pagination Middleware
```javascript
// middlewares/pagination.middleware.js
const paginate = (defaultLimit = 20) => (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || defaultLimit));
  const skip = (page - 1) * limit;

  req.pagination = { page, limit, skip };
  next();
};

module.exports = { paginate };
```

### Paginated Query Helper
```javascript
// utils/paginatedQuery.js
async function paginatedQuery(Model, filter = {}, options = {}) {
  const { page, limit, skip } = options.pagination;
  const sort = options.sort ?? { createdAt: -1 };

  const [data, total] = await Promise.all([
    Model.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Model.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
}

module.exports = { paginatedQuery };
```

### Update Each Controller

#### Notifications
```javascript
// controller/notification_controller.js
const getNotifications = async (req, res) => {
  const { userId } = req.user;
  const { skip, limit, page } = req.pagination;
  const { isRead } = req.query;

  const filter = { userId };
  if (isRead !== undefined) filter.isRead = isRead === 'true';

  const result = await paginatedQuery(Notification, filter, {
    pagination: req.pagination,
    sort: { createdAt: -1 },
  });

  res.json({ notifications: result.data, pagination: result.pagination });
};
```

#### Discussion
```javascript
const getDiscussions = async (req, res) => {
  const { subjectId } = req.query;
  const { skip, limit, page } = req.pagination;
  const { isAnswered, sort } = req.query;

  const filter = { subjectId };
  if (isAnswered !== undefined) filter.isAnswered = isAnswered === 'true';

  const sortOption = sort === 'votes'
    ? { reactionCount: -1 }
    : { createdAt: -1 };

  const result = await paginatedQuery(Discussion, filter, {
    pagination: req.pagination,
    sort: sortOption,
  });

  res.json({ discussions: result.data, pagination: result.pagination });
};
```

#### Group Messages (cursor-based)
```javascript
const getMessages = async (req, res) => {
  const { groupId, before, limit = 50 } = req.query;
  const query = { groupId };
  if (before) query._id = { $lt: before };

  const messages = await GroupMessage.find(query)
    .sort({ _id: -1 })
    .limit(parseInt(limit))
    .lean();

  const hasMore = messages.length === parseInt(limit);

  res.json({
    messages: messages.reverse(), // Return in chronological order
    hasMore,
    oldestId: messages[0]?._id ?? null,
  });
};
```

### Apply Middleware to Routes
```javascript
// route/notification_route.js
const { paginate } = require('../middlewares/pagination.middleware');

route.get('/get', authJwt(), paginate(20), notificationController.getAll);
```

## Frontend Integration Notes

### TanStack Query Infinite Queries (for load-more)
```typescript
// For notifications with infinite scroll
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery({
  queryKey: queryKeys.notifications.all,
  queryFn: ({ pageParam = 1 }) =>
    notificationsApi.getAll({ page: pageParam, limit: 20 }),
  getNextPageParam: (lastPage) =>
    lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
  initialPageParam: 1,
});

const notifications = data?.pages.flatMap(p => p.notifications) ?? [];
```

### Chat Cursor Pagination
```typescript
// Load more old messages on scroll-to-top
const loadOlderMessages = async () => {
  if (!hasMore || isLoading) return;
  const oldestId = messages[0]?._id;
  const older = await chatApi.getMessages({ groupId, before: oldestId, limit: 50 });
  setMessages(prev => [...older.messages, ...prev]);
  setHasMore(older.hasMore);
};
```

## Acceptance Criteria
- [ ] `GET /api/v1/notification/get` accepts `page`, `limit`, `isRead` params
- [ ] Paginated responses include `pagination` object with `hasNextPage`
- [ ] `GET /api/v1/discussion/getAll` accepts `isAnswered` filter
- [ ] `GET /api/v1/channel/getPosts` paginates correctly
- [ ] `GET /api/v1/group/getMessages` returns cursor-based pagination with `hasMore`
- [ ] Backend handles invalid page/limit values gracefully (coerce to defaults)
- [ ] Existing API consumers not broken (responses still include the main data key)

## Testing Requirements
- **Backend unit tests:**
  - `paginatedQuery()`: returns correct slice, total, pagination metadata
  - `paginate` middleware: coerces invalid values, respects max limit
  - Cursor-based messages: filters by `before` correctly
- **Manual QA:**
  - Create 25 notifications → fetch page 1 (limit 20) → verify 20 items + hasNextPage true
  - Fetch page 2 → verify remaining 5 items + hasNextPage false
  - Filter `?isRead=false` → verify only unread items returned

## Definition of Done
- All listed endpoints paginated
- Pagination metadata included in responses
- Backend tests pass
- No breaking changes to existing consumers

## Risks / Notes
- Adding `pagination` wrapper changes response shape — existing frontend code (WEB-033, WEB-024, WEB-026, WEB-030) that expects raw arrays must be updated to access `response.data.notifications` instead of `response.data` — coordinate with those tickets
- Cursor-based pagination (messages) and offset-based (everything else) are chosen deliberately: chat benefits from cursor for real-time consistency; other lists use offset for simple page controls
- `countDocuments()` is called on every paginated request — for large collections, consider caching or estimatedDocumentCount with a filter
