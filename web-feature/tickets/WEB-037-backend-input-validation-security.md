# WEB-037 — Backend Input Validation & Security Enhancements

## Objective
Harden the backend against invalid inputs and security vulnerabilities: add comprehensive input validation to remaining unvalidated endpoints (beyond login/register from WEB-006), add a `/user/me` endpoint for authenticated user hydration, add aggregate stats endpoints, and implement error response normalization.

## Background
WEB-006 added validation to login and register. Many other endpoints (create subject, create session, submit absence request, send notification, etc.) lack input validation, making them vulnerable to malformed data, injection, or unexpected crashes. This ticket hardens all remaining endpoints.

## Scope
Backend changes only:
- `/user/me` endpoint — returns authenticated user from JWT
- Input validation for: subject CRUD, session CRUD, absence request, discussion, channel post, group, document metadata
- Sanitize all string inputs (trim whitespace, strip HTML)
- Normalize error responses to consistent `{ message, errors?, code? }` shape
- Add `GET /api/v1/subject/getStats` aggregate endpoint for WEB-032
- Ensure all 4xx/5xx responses follow the same format

## Out of Scope
- Frontend changes (each feature ticket uses the validated APIs)
- JWT algorithm changes
- Database schema changes
- Rate limiting (WEB-006)

## Dependencies
- WEB-006 (validation infrastructure already added)

## User Flow Context
Transparent to users. Prevents backend crashes from malformed inputs and provides consistent error messages to the frontend.

## Functional Requirements

### New Endpoint: GET /api/v1/user/me
1. Returns the authenticated user's full profile from the database
2. Used by `AuthProvider` (WEB-008) to hydrate user data after token refresh
3. Response: `{ user: User }` — same shape as login response `data`
4. Replaces the fragile JWT client-decode approach

### Input Validation (extend WEB-006 pattern)

#### Subject Create/Update
```javascript
const createSubjectValidator = [
  body('name').trim().notEmpty().isLength({ max: 200 }),
  body('subjectCode').trim().notEmpty().isLength({ max: 20 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('room').optional().trim().isLength({ max: 100 }),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('absentLimit').optional().isInt({ min: 1, max: 50 }),
  body('gpsRadius').optional().isFloat({ min: 10, max: 5000 }),
];
```

#### Class Session Create
```javascript
const createSessionValidator = [
  body('subjectId').isMongoId(),
  body('date').isISO8601(),
  body('startTime').notEmpty(),
  body('endTime').notEmpty(),
  body('room').optional().trim().isLength({ max: 100 }),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
];
```

#### Absence Request Create
```javascript
const absenceRequestValidator = [
  body('cAttendId').isMongoId(),
  body('reason').trim().notEmpty().isLength({ min: 10, max: 1000 }),
  body('documentUrl').optional().isURL(),
];
```

#### Discussion Create
```javascript
const createDiscussionValidator = [
  body('subjectId').isMongoId(),
  body('content').trim().notEmpty().isLength({ max: 500 }),
];
```

#### Channel Post Create
```javascript
const createPostValidator = [
  body('subjectId').isMongoId(),
  body('content').trim().notEmpty().isLength({ max: 2000 }),
  body('title').optional().trim().isLength({ max: 200 }),
  body('link').optional().isURL(),
];
```

#### Group Message Send
```javascript
const sendMessageValidator = [
  body('groupId').isMongoId(),
  body('content').trim().notEmpty().isLength({ max: 1000 }),
];
```

### Error Response Normalization
All error responses normalized to:
```json
{
  "message": "Human-readable error",
  "code": "VALIDATION_ERROR | NOT_FOUND | UNAUTHORIZED | ...",
  "errors": [{ "field": "email", "message": "Invalid email" }]
}
```

Global error handler update:
```javascript
// middlewares/errorHandler.middleware.js
const errorHandler = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: Object.values(err.errors).map(e => ({ field: e.path, message: e.message })),
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID format', code: 'INVALID_ID' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
  });
};
```

### New Endpoint: GET /api/v1/subject/getStats
```javascript
// Returns aggregate stats for a subject (for WEB-032)
// Response:
{
  "totalSessions": 10,
  "completedSessions": 8,
  "averageAttendanceRate": 87.5,
  "averageRating": 4.2,
  "atRiskStudentCount": 3,
  "sessionStats": [
    { "sessionId": "...", "date": "...", "attendanceRate": 90, "averageRating": 4.5 }
  ]
}
```

Implementation:
```javascript
const getSubjectStats = async (req, res) => {
  const { subjectId } = req.query;

  const [sessions, totalStudents] = await Promise.all([
    CAttend.find({ subjectId, status: 'completed' }).lean(),
    UserSubject.countDocuments({ subjectId }),
  ]);

  const sessionStats = await Promise.all(sessions.map(async session => {
    const [presentCount, reviewAgg] = await Promise.all([
      AttendRecord.countDocuments({ cAttendId: session._id, status: { $in: ['CM', 'CP'] } }),
      Review.aggregate([
        { $match: { sessionId: session._id.toString() } },
        { $group: { _id: null, avg: { $avg: '$rating' } } },
      ]),
    ]);

    return {
      sessionId: session._id,
      date: session.date,
      attendanceRate: totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0,
      averageRating: reviewAgg[0]?.avg ? Math.round(reviewAgg[0].avg * 10) / 10 : null,
    };
  }));

  const avgAttendance = sessionStats.reduce((sum, s) => sum + s.attendanceRate, 0) / (sessionStats.length || 1);
  const avgRating = sessionStats.filter(s => s.averageRating).reduce((sum, s) => sum + s.averageRating, 0)
    / (sessionStats.filter(s => s.averageRating).length || 1);

  const atRiskCount = await UserSubject.countDocuments({
    subjectId,
    kpCount: { $gte: req.subjectAbsentLimit ?? 3 },
  });

  res.json({
    totalSessions: sessions.length + await CAttend.countDocuments({ subjectId, status: { $ne: 'completed' } }),
    completedSessions: sessions.length,
    averageAttendanceRate: Math.round(avgAttendance * 10) / 10,
    averageRating: Math.round(avgRating * 10) / 10,
    atRiskStudentCount: atRiskCount,
    sessionStats,
  });
};
```

## API Requirements (New)

### GET /api/v1/user/me
- Auth: Bearer access token
- Response: `{ user: User }` — full user object from DB

### GET /api/v1/subject/getStats?subjectId=<id>
- Auth: Bearer token (teacher only)
- Response: stats object as above

## Testing Requirements
- **Unit tests:**
  - Each validator: valid input passes; invalid inputs return 400 with correct field errors
  - `getSubjectStats`: aggregate calculations correct with mock data
  - Error handler: `CastError` → 400, `ValidationError` → 400, unknown → 500
- **Integration tests:**
  - `POST /subject/create` without `name` → 400 with `{ errors: [{ field: 'name', ... }] }`
  - `GET /user/me` with valid token → returns user; with invalid token → 401

## Definition of Done
- `/user/me` endpoint working and used by `AuthProvider`
- All listed endpoints have input validation
- Error responses normalized across all endpoints
- `/subject/getStats` endpoint available for WEB-032
- All new tests pass

## Risks / Notes
- Adding `handleValidationErrors` middleware to existing routes may reveal bugs where the frontend was sending malformed data silently accepted before — test each route after adding validation
- The `getSubjectStats` endpoint uses multiple aggregation queries — N+1 per session; for large subjects (50+ sessions), this may be slow; add a caching layer or limit to recent N sessions
- `/user/me` decouples `AuthProvider` from client-side JWT decoding (`decodeUserFromToken` in WEB-008) — update `AuthProvider` to call `/user/me` after refresh instead of JWT decode
- The `UserSubject` model may track `kpCount` directly, or it may need to be computed from `AttendRecord` — verify the data model before implementing `atRiskStudentCount`
