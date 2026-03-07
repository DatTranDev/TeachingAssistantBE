# 5. Current Features

---

## Feature 1: Role-Based Authentication

**Purpose:** Secure access control for students and teachers with separate dashboards and permissions.

**How it works:**
- JWT-based auth with access token (1h) and refresh token (30d)
- Refresh tokens stored in Redis/MongoDB via `token.service.js`
- `expressJwt` middleware validates all protected routes automatically
- `auth.middleware.js` performs ownership/role checks per resource
- Email OTP flow supports password reset without re-registration
- Roles: `student` and `teacher` — determined at registration and enforced throughout

**Backend files:**
- TeachingAssistantBE/controller/user_controller.js
- TeachingAssistantBE/middlewares/expressJwt.js
- TeachingAssistantBE/middlewares/auth.middleware.js
- TeachingAssistantBE/services/token.service.js
- TeachingAssistantBE/services/email.service.js
- TeachingAssistantBE/utils/token.js
- TeachingAssistantBE/utils/hash.js

**APIs:** `POST /user/register`, `POST /user/login`, `PATCH /user/update/:id`, `PATCH /user/changepassword`, `GET /token/refresh-token`, `POST /service/sendEmail`, `POST /service/verifyCode`, `POST /service/verifyEmail`

**Mobile support:** Full sign-in, sign-up, and forgot-password flows; role-based navigation redirect; context stored in `AuthContext.tsx`

**Status:** Complete

---

## Feature 2: GPS-Based Attendance (Multi-Round)

**Purpose:** Automate student attendance verification using GPS proximity to the teacher.

**How it works:**
- Teacher creates a `CAttend` record for a class session, providing their GPS coordinates and a time window (in minutes)
- Session activation sets `isActive=true`; timer auto-expires sessions via check in `findBySubject`
- Students submit their GPS coordinates; backend uses Haversine formula (`helper.getDistanceInKm`) to determine if within acceptable radius (`helper.isPresent`)
- Multiple rounds of check-in per session supported via `index` field in `listStatus`
- `acceptedNumber` threshold controls how many missed rounds result in marking a student absent
- FCMToken deduplication prevents one device from checking in on behalf of multiple students
- Teacher can reset all records, reset a single round, manually override individual records, or adjust the acceptance threshold (which recalculates all student statuses)

**Attendance status codes:**
- `CM` — Present for a round / Absent overall
- `KP` — Absent for a round / Present overall (naming is Vietnamese: Không Phép)
- `CP` — Excused (Có Phép)

**Backend files:**
- TeachingAssistantBE/controller/cAttend_controller.js
- TeachingAssistantBE/controller/attendRecord_controller.js
- TeachingAssistantBE/model/cAttend.js
- TeachingAssistantBE/model/attendRecord.js
- TeachingAssistantBE/utils/helper.js

**APIs:** All `/cAttend/*` and `/cAttend/attendRecord/*` endpoints

**Mobile support:** Student roll-call screen, teacher attendance management (start/stop/reset), real-time attendance list view

**Status:** Complete

---

## Feature 3: Real-Time In-Session Q&A / Discussion

**Purpose:** Enable live student-teacher interaction during class sessions.

**How it works:**
- Discussions linked to a `cAttendId` (session-scoped)
- Real-time delivery via Socket.IO subject rooms; teacher and all students in the room receive messages instantly
- Supports: text posts, image attachments, threaded replies (`replyOf` self-reference), upvotes/downvotes
- Emoji reactions tracked per discussion via separate `Reaction` model
- Teacher can mark any question as `isResolved = true`; broadcast via `sendResolve` socket event
- Messages can be deleted or revoked
- FCM push notifications sent to all subject subscribers when new messages arrive

**Backend files:**
- TeachingAssistantBE/controller/discussion_controller.js
- TeachingAssistantBE/controller/reaction_controller.js
- TeachingAssistantBE/services/discussion.service.js
- TeachingAssistantBE/services/reaction.service.js
- TeachingAssistantBE/model/discussion.js
- TeachingAssistantBE/model/reaction.js

**APIs:** All `/discussion/*` endpoints + Socket.IO events (`sendMessageToSubject`, `sendReply`, `sendVote`, `sendResolve`, `sendReaction`, `sendDeleteMessage`, `sendRevokedMessage`)

**Mobile support:** Student discussion room screen; teacher chat moderation screen; real-time updates via SocketContext

**Status:** Complete

---

## Feature 4: Absence Request Management

**Purpose:** Formal workflow for students to request excused absences with documentary proof.

**How it works:**
- Students create absence requests with date, written reason, and optional image proof URLs
- Requests go through `pending` → `approved` / `rejected` lifecycle
- Teacher reviews requests and can add a comment when deciding
- When teacher runs `markExcusedAttendance` for a session, all approved absence requests matching the date are automatically applied — setting those students' attendance to `CP` (excused)
- Students can view their own request history; teachers see all requests for their subjects

**Backend files:**
- TeachingAssistantBE/controller/absenceRequest_controller.js
- TeachingAssistantBE/controller/attendRecord_controller.js
- TeachingAssistantBE/model/absenceRequest.js

**APIs:** All `/absence/*` endpoints + `PATCH /cAttend/attendRecord/markExcusedAttendance`

**Mobile support:** Student absence request screen, teacher request review screen

**Status:** Complete

---

## Feature 5: Post-Session Review / Feedback

**Purpose:** Collect structured, quantitative student feedback after each class session.

**How it works:**
- Students rate each session on 5 dimensions after the session ends:
  - `understandPercent` — how much they understood (0-100%)
  - `usefulPercent` — how useful the content was (0-100%)
  - `teachingMethodScore` — teaching method rating (1-5 string)
  - `atmosphereScore` — class atmosphere rating (1-5 string)
  - `documentScore` — document quality rating (1-5 string)
  - `thinking` — open text comment
- Unique constraint prevents duplicate reviews per (session, student)
- Aggregated averages available at subject level via `GET /subject/avgReview/:subjectId`
- Teacher can view per-session reviews in the statistics dashboard

**Backend files:**
- TeachingAssistantBE/controller/review_controller.js
- TeachingAssistantBE/services/review.service.js
- TeachingAssistantBE/model/review.js

**APIs:** All `/review/*` endpoints + `GET /subject/avgReview/:subjectId`

**Mobile support:** Student review submission screen, teacher review statistics screen

**Status:** Complete

---

## Feature 6: Group Management (Random & Fixed)

**Purpose:** Support both spontaneous in-session group activities and persistent study groups.

**How it works:**
Two group types:
- `random` — auto-generated per session from students marked as present (CM). Distributed evenly across N groups. Deleted when new random groups are created for the same session.
- `default` — persistent subject-level groups created manually. Each student can only be in one default group per subject.

Group features:
- `autoAccept` flag: if true, any member can join; if false, only admin can add
- Admin transfers to next member if admin leaves
- Group is deleted automatically when the last member leaves
- Cross-grading: teacher assigns which group reviews which other group (`reviewedBy` field); FCM notifications sent to inform groups

**Backend files:**
- TeachingAssistantBE/controller/group_controller.js
- TeachingAssistantBE/services/group.service.js
- TeachingAssistantBE/model/group.js

**APIs:** All `/group/*` endpoints (excluding message endpoints)

**Mobile support:** Teacher group randomization screen, student group view, fixed group management

**Status:** Complete

---

## Feature 7: Group Chat

**Purpose:** Private messaging within groups for collaborative work.

**How it works:**
- Group members send text messages and image attachments within their group
- Messages support revocation (`isRevoked` flag): revoked messages remain in DB but content hidden
- Full CRUD operations on messages
- Group messages are not real-time via socket (HTTP polling); messages fetched by `GET /group/:groupId/message/`

**Backend files:**
- TeachingAssistantBE/controller/groupMessage_controller.js
- TeachingAssistantBE/model/groupMessage.js

**APIs:** All `/group/message/*` endpoints

**Mobile support:** Student and teacher group chat screens

**Status:** Complete

---

## Feature 8: Subject Channels & Post Boards

**Purpose:** Structured asynchronous communication within a subject outside live sessions.

**How it works:**
- Each subject has named channels (e.g., "Thông báo", "Tài liệu", "Trao đổi")
- Any member can create posts within channels
- Channel messages delivered via Socket.IO channel rooms (`subjectId_channelID`) for real-time updates
- FCM push notifications sent on new channel messages
- Channels have unique name constraint per subject

**Backend files:**
- TeachingAssistantBE/controller/channel_controller.js
- TeachingAssistantBE/controller/post_controller.js
- TeachingAssistantBE/model/channel.js
- TeachingAssistantBE/model/post.js

**APIs:** All `/channel/*` endpoints

**Mobile support:** Student general room screen, teacher discussion screen

**Status:** Complete

---

## Feature 9: Document Management

**Purpose:** Share lecture materials and resources per class session.

**How it works:**
- Teacher uploads files via `POST /upload/file` using `multipart/form-data`
- Files stored on Firebase Storage; a `Document` record is created in MongoDB with the download URL
- Documents are session-scoped (linked to `cAttendId`)
- Students browse and download documents within a session view
- Documents are deleted when the associated CAttend session is deleted

**Backend files:**
- TeachingAssistantBE/controller/document_controller.js
- TeachingAssistantBE/controller/firebase_controller.js
- TeachingAssistantBE/services/firebase.service.js
- TeachingAssistantBE/services/document.service.js
- TeachingAssistantBE/model/document.js

**APIs:** `POST /upload/file`, `GET /document/findByCAttend/:cAttendId`, `PATCH /document/update/:id`, `DELETE /document/delete/:id`

**Mobile support:** Document list screen for students, upload interface for teachers

**Status:** Complete

---

## Feature 10: Push Notifications (Firebase Cloud Messaging)

**Purpose:** Deliver real-time alerts to mobile devices even when the app is in the background.

**How it works:**
- On login, mobile subscribes its FCM token to all enrolled subject IDs as topics
- Backend sends topic-based notifications to all subscribers of a subject for: attendance alerts, new chat messages, class cancellation, class reschedule
- Direct device-to-device FCM used for targeted notifications (e.g., absence warnings to specific students)
- FCM tokens are stored server-side in the Token model and cleaned up on logout via `unsubscribeFromTopics`

**Notification types (from constants/notificationType.js):**
- `absent_warning`
- `absence_request`
- `class_cancellation`
- `class_reschedule`
- `other`

**Backend files:**
- TeachingAssistantBE/services/firebase.service.js
- TeachingAssistantBE/controller/notification_controller.js
- TeachingAssistantBE/services/notification.service.js
- TeachingAssistantBE/model/notification.js
- TeachingAssistantBE/model/notificationRecipient.js

**APIs:** `POST /firebase/subscribeToTopics`, `POST /firebase/unsubscribeFromTopics`, all `/notification/*` endpoints

**Mobile support:** Notification center for students and teachers; FCM handled in `sign-in.tsx`

**Status:** Complete

---

## Feature 11: Statistics & Analytics Dashboard

**Purpose:** Give teachers actionable insights about class performance and student engagement.

**How it works:**
Aggregation queries across multiple collections. All leaderboards support a `?top=N` query parameter (default 5).

Per-subject metrics:
- **Top participants:** Students with most discussion posts
- **Top reactors:** Students with most emoji reactions given
- **Top reviewers:** Students who submitted the most session reviews
- **Most absent:** Students with highest absence count
- **Average reviews:** Aggregated 5-dimension review scores across all sessions

Per-session metrics:
- Top discussion participants
- Top emoji reactors

**Backend files:**
- TeachingAssistantBE/controller/subject_controller.js
- TeachingAssistantBE/controller/cAttend_controller.js
- TeachingAssistantBE/services/discussion.service.js
- TeachingAssistantBE/services/reaction.service.js
- TeachingAssistantBE/services/review.service.js
- TeachingAssistantBE/services/attendRecord.service.js

**APIs:** `GET /subject/top-*/:subjectId`, `GET /cAttend/top*/:cAttendId`, `GET /subject/avgReview/:subjectId`

**Mobile support:** Full statistics dashboard with sub-pages per metric type

**Status:** Complete

---

## Feature 12: Excel Export

**Purpose:** Allow teacher to export the student list for offline use or administrative reporting.

**How it works:**
- `GET /subject/:subjectId/students/exportExcel` generates an Excel file from enrolled students
- Uses a file generation library in `fileGenerate_controller.js`

**Backend files:**
- TeachingAssistantBE/controller/fileGenerate_controller.js

**APIs:** `GET /subject/:subjectId/students/exportExcel`

**Status:** Complete

---

## Feature 13: Weekly Timetable

**Purpose:** Visual weekly schedule overview for students and teachers.

**How it works:**
- Fetches all ClassSessions for the user via `GET /classSession/findByUser/:userId`
- Renders weekly grid layout; student class list screen highlights currently in-progress classes based on current time vs session schedule

**APIs:** `GET /classSession/findByUser/:userId`

**Mobile support:** Dedicated timetable tab for both student and teacher roles

**Status:** Complete

---

## Feature 14: Weekly Absence Warning (Automated)

**Purpose:** Proactively warn students who are approaching or exceeding their allowed absences.

**How it works:**
- `system_controller.js` has `notifyAbsenceViolations` which computes students exceeding `maxAbsences`
- `POST /system/absence-warning` triggers the check
- Intended to run via a weekly cron job in `job/weeklyAbsentWarning.js`

**Status:** Partial — API exists and controller logic is implemented; the `job/weeklyAbsentWarning.js` file is empty (cron trigger not wired up)
