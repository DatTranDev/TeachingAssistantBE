# 6. Important Backend Files

## Entry Point

| File | Description |
|---|---|
| `TeachingAssistantBE/app.js` | Application entry point. Bootstraps Express, connects to MongoDB, mounts all 17 route modules, initializes Socket.IO server, and registers all WebSocket event handlers. Also starts the HTTP server. |

---

## Configuration

| File | Description |
|---|---|
| `TeachingAssistantBE/config/firebase.js` | Initializes Firebase Admin SDK using `service-account.json`. Exports `bucket` (Firebase Storage) and `messaging` (FCM) instances used throughout the app. |
| `TeachingAssistantBE/config/redis.js` | Creates and exports a Redis client instance. Used by `token.service.js` to store refresh tokens and FCM tokens. |

---

## Middlewares

| File | Description |
|---|---|
| `TeachingAssistantBE/middlewares/expressJwt.js` | Global JWT verification middleware applied to all routes. Skips public routes (login, register, email service). Sets `req.user` on valid tokens. |
| `TeachingAssistantBE/middlewares/auth.middleware.js` | Authorization helper used at route level. Validates that the authenticated user's token claims match the resource being accessed (ownership checks). |
| `TeachingAssistantBE/middlewares/error.middleware.js` | Global Express error handler. Catches all unhandled errors and returns formatted JSON error responses. |
| `TeachingAssistantBE/middlewares/validate.middleware.js` | Request body validation middleware (used with document routes). |

---

## Controllers

| File | Description |
|---|---|
| `TeachingAssistantBE/controller/user_controller.js` | Handles registration, login, profile update, and password change. Issues JWT tokens on auth. Validates emails and enforces ownership on updates. |
| `TeachingAssistantBE/controller/subject_controller.js` | Core subject lifecycle: create (with sessions), join, leave, update, delete (with full cascade), leaderboard queries, class cancel/reschedule notifications. |
| `TeachingAssistantBE/controller/cAttend_controller.js` | Manages attendance sessions: create, update (activate/deactivate/set GPS/set timer), delete (with cascade), reset, per-session leaderboards, list of attending students. |
| `TeachingAssistantBE/controller/attendRecord_controller.js` | GPS attendance check-in logic with distance validation, anti-fraud FCMToken check, multi-round support. Also handles teacher manual overrides and bulk excused attendance. |
| `TeachingAssistantBE/controller/discussion_controller.js` | In-session Q&A: create, update, delete, vote (upvote/downvote), find by session. |
| `TeachingAssistantBE/controller/reaction_controller.js` | Emoji reactions on discussions: create, update, find by discussion. |
| `TeachingAssistantBE/controller/group_controller.js` | Full group management: random generation from present students, manual group creation, join/leave/update, cross-grading pair assignment with FCM notifications. |
| `TeachingAssistantBE/controller/groupMessage_controller.js` | Group chat CRUD: create, fetch by group, update, delete/revoke. |
| `TeachingAssistantBE/controller/absenceRequest_controller.js` | Absence request lifecycle: student creates, teacher approves/rejects, both sides can view their relevant requests. |
| `TeachingAssistantBE/controller/review_controller.js` | Session review CRUD, find by session. Delegates aggregation to review.service.js. |
| `TeachingAssistantBE/controller/notification_controller.js` | In-app notification management: get, read, read all, delete, get specific notification types. Creates notifications with FCM push via firebase.service.js. |
| `TeachingAssistantBE/controller/channel_controller.js` | Subject channel CRUD. |
| `TeachingAssistantBE/controller/post_controller.js` | Channel post CRUD. |
| `TeachingAssistantBE/controller/document_controller.js` | Session document metadata CRUD. Actual file upload handled by firebase_controller.js. |
| `TeachingAssistantBE/controller/firebase_controller.js` | Handles file/image uploads to Firebase Storage via multer (memory storage) and FCM topic subscriptions. |
| `TeachingAssistantBE/controller/email_controller.js` | Email OTP: send, verify code, verify email (for forgot-password flow). |
| `TeachingAssistantBE/controller/classSession_controller.js` | Class session (time slot) CRUD; findByUser populates subject info for timetable. |
| `TeachingAssistantBE/controller/question_controller.js` | Subject-level Q&A: add, update, delete, find by subject. |
| `TeachingAssistantBE/controller/fileGenerate_controller.js` | Excel file generation for student list export. |
| `TeachingAssistantBE/controller/system_controller.js` | System-level operations: `notifyAbsenceViolations` computes students exceeding max absences and sends warnings. |

---

## Services

| File | Description |
|---|---|
| `TeachingAssistantBE/services/firebase.service.js` | Central Firebase operations: upload image(s), upload file, subscribe/unsubscribe FCM topics, send topic-based push notifications, send targeted device notifications. |
| `TeachingAssistantBE/services/token.service.js` | JWT refresh token and FCM token lifecycle: add, get, delete by user, delete all, store and retrieve FCM tokens. |
| `TeachingAssistantBE/services/discussion.service.js` | Aggregation pipelines for top discussion participants — per session and per subject. |
| `TeachingAssistantBE/services/reaction.service.js` | Aggregation pipelines for top emoji reactors — per session and per subject. |
| `TeachingAssistantBE/services/review.service.js` | Aggregation for top reviewers per subject. |
| `TeachingAssistantBE/services/attendRecord.service.js` | Aggregation for top absent students per subject. |
| `TeachingAssistantBE/services/notification.service.js` | Creates Notification documents and NotificationRecipient records; triggers FCM delivery. |
| `TeachingAssistantBE/services/group.service.js` | Group business logic: cross-grading pair notifications. |
| `TeachingAssistantBE/services/cAttend.service.js` | CAttend lookup helper used across controllers. |
| `TeachingAssistantBE/services/email.service.js` | Nodemailer-based OTP email delivery. |
| `TeachingAssistantBE/services/document.service.js` | Document creation helper called during file upload. |
| `TeachingAssistantBE/services/redis.service.js` | Redis helper operations. |
| `TeachingAssistantBE/services/subject.service.js` | Subject-level business logic helpers. |
| `TeachingAssistantBE/services/system.service.js` | Absence violation detection logic for weekly warning job. |
| `TeachingAssistantBE/services/user.service.js` | User-level helpers. |

---

## Models

| File | Description |
|---|---|
| `TeachingAssistantBE/model/user.js` | User schema: name, userCode, school, email, password (select:false), role (student/teacher), avatar. |
| `TeachingAssistantBE/model/subject.js` | Subject schema: code, name, hostId, startDay, endDay, currentSession, maxAbsences, joinCode (unique). |
| `TeachingAssistantBE/model/userSubject.js` | Enrollment join table: userId, subjectId, role. Unique compound index. |
| `TeachingAssistantBE/model/classSession.js` | Recurring time slot: subjectId, room, dayOfWeek (1-7), start/end (HH:mm). |
| `TeachingAssistantBE/model/cAttend.js` | Attendance session: classSessionId, date, sessionNumber, teacherGPS, isActive, timeExpired, numberOfAttend, acceptedNumber, isClosed. |
| `TeachingAssistantBE/model/attendRecord.js` | Student attendance record: cAttendId, studentId, listStatus[], numberOfAbsence, status, FCMToken, studentGPS. Unique (cAttendId, studentId). |
| `TeachingAssistantBE/model/discussion.js` | Q&A post: cAttendId, creator, title, content, images[], replyOf (self-ref), isResolved, upvotes[], downvotes[]. |
| `TeachingAssistantBE/model/reaction.js` | Emoji reaction on a discussion. |
| `TeachingAssistantBE/model/question.js` | Subject-level question: subjectId, studentId, type (text/image), content, isResolved. |
| `TeachingAssistantBE/model/review.js` | Session review: cAttendId, studentId, 5 score fields, thinking. Unique (cAttendId, studentId). |
| `TeachingAssistantBE/model/group.js` | Group: name, members[], admin, type (random/default), cAttendId, subjectId, reviewedBy (Group ref), autoAccept. |
| `TeachingAssistantBE/model/groupMessage.js` | Group chat message: groupId, senderId, content, images[], isRevoked. |
| `TeachingAssistantBE/model/channel.js` | Discussion channel: subjectId, name. Unique (subjectId, name). |
| `TeachingAssistantBE/model/post.js` | Channel post content. |
| `TeachingAssistantBE/model/document.js` | Session document: name, type, downloadUrl (typo: dowloadUrl), cAttendId. |
| `TeachingAssistantBE/model/absenceRequest.js` | Absence request: studentId, subjectId, proof[], date, reason, status (pending/approved/rejected), reviewedBy, comment, reviewedAt. |
| `TeachingAssistantBE/model/notification.js` | Notification: senderId, title, content, type enum, referenceModel, referenceId. |
| `TeachingAssistantBE/model/notificationRecipient.js` | Links notification to each recipient user; tracks read status. |
| `TeachingAssistantBE/model/token.js` | Stores refresh tokens and FCM tokens per user. |
| `TeachingAssistantBE/model/FCMToken.js` | FCM device token storage. |

---

## Utilities

| File | Description |
|---|---|
| `TeachingAssistantBE/utils/helper.js` | Key utility functions: `getDistanceInKm` (Haversine GPS distance), `isPresent` (proximity threshold check), `parseDate` (dd/mm/yyyy parser), `isValidObjectID` (Mongoose ID validation), `randomCode` (join code generator). |
| `TeachingAssistantBE/utils/token.js` | `generateToken` — creates signed JWTs with role, userId, and expiry. |
| `TeachingAssistantBE/utils/hash.js` | bcrypt wrapper: `hashPassword` and `comparePassword`. |
| `TeachingAssistantBE/utils/AppError.js` | Custom error classes: `BadRequestError`, `NotFoundError`, `ForbiddenError`, `AppError` with HTTP status codes. |

---

## Constants

| File | Description |
|---|---|
| `TeachingAssistantBE/constants/notificationType.js` | Enum values: `absent_warning`, `absence_request`, `class_cancellation`, `class_reschedule`, `other` |
| `TeachingAssistantBE/constants/groupType.js` | Enum values: `RANDOM`, `DEFAULT` |
| `TeachingAssistantBE/constants/constants.js` | General app constants |

---

## Jobs

| File | Description |
|---|---|
| `TeachingAssistantBE/job/weeklyAbsentWarning.js` | Intended scheduled cron job for weekly absence warnings. File is currently empty — no scheduler is implemented. |
