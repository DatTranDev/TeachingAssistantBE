# 2. Current Use Cases

---

## UC-01: Register an Account

**Actor:** New User (Student or Teacher)

**Description:** User creates a new account with email, password, name, school, user code, and role.

**Preconditions:** User has a valid email; email is not already registered.

**Main Flow:**
1. User opens sign-up screen
2. User fills in registration form (name, email, password, school, userCode, role)
3. Mobile calls register API
4. Backend validates email, hashes password, generates JWT tokens, returns user + tokens
5. FCM token is registered; user is directed to appropriate dashboard

**Backend APIs:** `POST /api/v1/user/register`

**Backend files:**
- TeachingAssistantBE/route/user_route.js
- TeachingAssistantBE/controller/user_controller.js
- TeachingAssistantBE/model/user.js

**Mobile screens:** `(auth)/sign-up/index.tsx`, `(auth)/sign-up/signUp.tsx`, `(auth)/sign-up/verify.tsx`

---

## UC-02: Log In

**Actor:** Registered User

**Description:** User authenticates with email/password to receive JWT access and refresh tokens.

**Preconditions:** User has an existing account.

**Main Flow:**
1. User opens login screen
2. User enters email and password
3. Mobile calls login API
4. Backend validates credentials and returns access token (1h) + refresh token (30d)
5. Mobile subscribes to Firebase topics for subject push notifications
6. User is routed to student or teacher dashboard based on `role`

**Backend APIs:** `POST /api/v1/user/login`, `POST /api/v1/firebase/subscribeToTopics`

**Backend files:**
- TeachingAssistantBE/controller/user_controller.js
- TeachingAssistantBE/services/token.service.js
- TeachingAssistantBE/services/firebase.service.js

**Mobile screen:** `(auth)/sign-in.tsx`

---

## UC-03: Forgot Password / Password Reset

**Actor:** Registered User

**Description:** User resets password via email OTP verification.

**Main Flow:**
1. User opens forgot password screen
2. User enters email
3. Mobile calls send email OTP API
4. User receives code and enters it
5. Mobile verifies code
6. User sets new password; mobile calls changePassword API

**Backend APIs:** `POST /api/v1/service/sendEmail`, `POST /api/v1/service/verifyCode`, `POST /api/v1/service/verifyEmail`, `PATCH /api/v1/user/changepassword`

**Backend files:**
- TeachingAssistantBE/route/service_route.js
- TeachingAssistantBE/controller/email_controller.js
- TeachingAssistantBE/services/email.service.js

**Mobile screens:** `(auth)/forgotPassword/index.tsx`, `verify.tsx`, `changePassword.tsx`

---

## UC-04: Create a Class (Subject)

**Actor:** Teacher

**Description:** Teacher creates a new subject with a unique auto-generated join code, specifying class sessions (day/time/room).

**Main Flow:**
1. Teacher opens "Create class" screen
2. Enters subject name, code, and session schedules
3. Mobile calls create subject API
4. Backend creates Subject + ClassSession records, auto-generates `joinCode`, links teacher as host

**Backend APIs:** `POST /api/v1/subject/add`

**Backend files:**
- TeachingAssistantBE/controller/subject_controller.js
- TeachingAssistantBE/model/subject.js
- TeachingAssistantBE/model/classSession.js
- TeachingAssistantBE/model/userSubject.js

**Mobile screen:** `(teacherDetail)/classDetail/addClass.tsx`

---

## UC-05: Join a Class (Student)

**Actor:** Student

**Description:** Student joins an existing subject using the teacher's join code.

**Main Flow:**
1. Student opens "Join class" screen
2. Enters the join code
3. Mobile calls join subject API
4. Backend looks up subject by join code, creates UserSubject link

**Backend APIs:** `POST /api/v1/subject/join`

**Backend files:**
- TeachingAssistantBE/controller/subject_controller.js

**Mobile screen:** `(studentDetail)/classDetail/addClass.tsx`

---

## UC-06: GPS-Based Attendance Check-in (Student)

**Actor:** Student

**Description:** Teacher activates an attendance session (CAttend). Students check in by submitting their GPS coordinates. Backend calculates distance from teacher's coordinates to validate presence.

**Preconditions:** Teacher has activated the attendance session with their GPS; session is within time limit.

**Main Flow:**
1. Teacher opens attendance menu and starts a session (sets GPS, duration)
2. Backend creates/updates CAttend record with `isActive=true`, teacher's GPS, `timeExpired`
3. WebSocket broadcasts attendance event to the subject room
4. Student sees attendance prompt on mobile
5. Student submits GPS coordinates and FCMToken
6. Backend computes distance; marks student as present (CM) or absent (KP) per round

**Backend APIs:** `POST /api/v1/cAttend/add`, `PATCH /api/v1/cAttend/update/:id`, `POST /api/v1/cAttend/attendRecord/add`, Socket event: `attendace`

**Backend files:**
- TeachingAssistantBE/controller/cAttend_controller.js
- TeachingAssistantBE/controller/attendRecord_controller.js
- TeachingAssistantBE/model/cAttend.js
- TeachingAssistantBE/model/attendRecord.js
- TeachingAssistantBE/utils/helper.js (getDistanceInKm, isPresent)

**Mobile screens:** `(studentDetail)/classDetail/rollCall/rollCall.tsx`, `(teacherDetail)/classDetail/teachFeature/attendance/menuAttendance.tsx`

---

## UC-07: Teacher Manual Attendance Override

**Actor:** Teacher

**Description:** Teacher manually sets or updates a student's attendance status for a specific round, or marks excused absences in bulk.

**Backend APIs:** `POST /api/v1/cAttend/attendRecord/add/forStudent`, `PATCH /api/v1/cAttend/attendRecord/update/forStudent/:id`, `PATCH /api/v1/cAttend/attendRecord/markExcusedAttendance`

**Backend files:**
- TeachingAssistantBE/controller/attendRecord_controller.js

**Mobile screens:** `(teacherDetail)/classDetail/teachFeature/attendance/rollCall.tsx`, `absence.tsx`

---

## UC-08: Student Absence Request

**Actor:** Student

**Description:** Student submits a formal absence request with reason and optional proof (images). Teacher approves or rejects. Approved requests auto-mark excused attendance.

**Preconditions:** Student is enrolled in subject; an absence has occurred or is anticipated.

**Main Flow:**
1. Student creates absence request with date, reason, proof images
2. Teacher receives notification and reviews the request
3. Teacher approves or rejects with optional comment
4. If approved, system can mark student's attendance as excused (CP)

**Backend APIs:** `POST /api/v1/absence/create`, `PATCH /api/v1/absence/update/:id`, `GET /api/v1/absence/studentRequest`, `GET /api/v1/absence/teacherRequest`, `DELETE /api/v1/absence/delete/:id`

**Backend files:**
- TeachingAssistantBE/controller/absenceRequest_controller.js
- TeachingAssistantBE/model/absenceRequest.js

**Mobile screens:** `(studentDetail)/classDetail/rollCall/absence.tsx`, `(teacherDetail)/classDetail/teachFeature/attendance/absence.tsx`

---

## UC-09: Real-time Q&A / Discussion in Session

**Actor:** Student, Teacher

**Description:** Students ask questions (text or image) during a session. Questions are posted in a subject-wide real-time channel via WebSocket. Teacher can resolve questions.

**Main Flow:**
1. Student submits a question during active session
2. WebSocket broadcasts message to subject room
3. Teacher (and other students) see the question in real-time
4. Teacher can resolve a question (marks `isResolved = true`)
5. Users can vote (upvote/downvote) on discussions

**Backend APIs:** `POST /api/v1/discussion/add`, `PATCH /api/v1/discussion/update/:id`, `DELETE /api/v1/discussion/delete/:id`, `GET /api/v1/discussion/findByCAttend/:cAttendId`, `POST /api/v1/discussion/:id/vote`, Socket events: `sendMessageToSubject`, `sendReply`, `sendVote`, `sendResolve`, `sendDeleteMessage`

**Backend files:**
- TeachingAssistantBE/controller/discussion_controller.js
- TeachingAssistantBE/model/discussion.js
- TeachingAssistantBE/controller/reaction_controller.js

**Mobile screens:** `(studentDetail)/classDetail/discussionRoom.tsx`, `(teacherDetail)/classDetail/teachFeature/chat.tsx`

---

## UC-10: Post-Session Review (Student)

**Actor:** Student

**Description:** After a session, students rate the class across multiple dimensions: understanding percentage, usefulness, teaching method, atmosphere, document quality, and open comment.

**Backend APIs:** `POST /api/v1/review/add`, `GET /api/v1/review/findByCAttend/:cAttendId`, `GET /api/v1/subject/avgReview/:subjectId`

**Backend files:**
- TeachingAssistantBE/controller/review_controller.js
- TeachingAssistantBE/model/review.js
- TeachingAssistantBE/services/review.service.js

**Mobile screens:** `(studentDetail)/classDetail/review.tsx`, `(teacherDetail)/classDetail/statistical/review.tsx`

---

## UC-11: Subject Channel / Post Boards

**Actor:** Teacher, Student

**Description:** A subject contains named channels (e.g., "General", "Announcements"). Members can create posts within channels for general communication outside live sessions.

**Backend APIs:** `POST /api/v1/channel/add`, `GET /api/v1/channel/findBySubject/:subjectId`, `POST /api/v1/channel/post/add`, `GET /api/v1/channel/post/find/:channelId`

**Backend files:**
- TeachingAssistantBE/controller/channel_controller.js
- TeachingAssistantBE/controller/post_controller.js
- TeachingAssistantBE/model/channel.js

**Mobile screens:** `(studentDetail)/classDetail/generalRoom.tsx`, `(teacherDetail)/classDetail/teachFeature/discussion.tsx`

---

## UC-12: Document Sharing

**Actor:** Teacher

**Description:** Teacher uploads documents (PDFs, files) to a session. Students can view and download them within the class.

**Backend APIs:** `POST /api/v1/upload/file`, `GET /api/v1/document/findByCAttend/:cAttendId`, `PATCH /api/v1/document/update/:id`, `DELETE /api/v1/document/delete/:id`

**Backend files:**
- TeachingAssistantBE/controller/document_controller.js
- TeachingAssistantBE/controller/firebase_controller.js
- TeachingAssistantBE/services/firebase.service.js
- TeachingAssistantBE/model/document.js

**Mobile screens:** `(studentDetail)/classDetail/document.tsx`, `(teacherDetail)/classDetail/teachFeature/document.tsx`

---

## UC-13: Random Group Generation

**Actor:** Teacher

**Description:** Teacher randomly assigns present students into groups during a live session. Groups are session-scoped ("random" type). Students can also form permanent "default" groups within the subject.

**Backend APIs:** `POST /api/v1/group/random/create`, `GET /api/v1/group/random/all/:cAttendId`, `POST /api/v1/group/create`, `POST /api/v1/group/join/:groupId`, `DELETE /api/v1/group/leave/:groupId`

**Backend files:**
- TeachingAssistantBE/controller/group_controller.js
- TeachingAssistantBE/model/group.js

**Mobile screens:** `(teacherDetail)/classDetail/teachFeature/groupRandom.tsx`, `(studentDetail)/classDetail/discussion/randomGroup.tsx`, `fixedGroup.tsx`

---

## UC-14: Group Chat

**Actor:** Student, Teacher

**Description:** Members of a group can send text messages and images within a private group chat.

**Backend APIs:** `POST /api/v1/group/message/create`, `GET /api/v1/group/:groupId/message/`, `PATCH /api/v1/group/message/update/:id`, `DELETE /api/v1/group/message/delete/:id`

**Backend files:**
- TeachingAssistantBE/controller/groupMessage_controller.js
- TeachingAssistantBE/model/groupMessage.js

**Mobile screens:** `(teacherDetail)/classDetail/teachFeature/groupChat.tsx`, `(studentDetail)/classDetail/discussion/fixedGroup.tsx`

---

## UC-15: Class Cancellation / Reschedule Notification

**Actor:** Teacher

**Description:** Teacher sends a push notification to all enrolled students when a class is cancelled or rescheduled. Notifications are persisted and accessible via the notification center.

**Backend APIs:** `POST /api/v1/subject/notify/classCancel`, `POST /api/v1/subject/notify/classReschedule`, `GET /api/v1/notification/classCancel/:id`, `GET /api/v1/notification/classReschedule/:id`

**Backend files:**
- TeachingAssistantBE/controller/subject_controller.js
- TeachingAssistantBE/controller/notification_controller.js
- TeachingAssistantBE/services/notification.service.js
- TeachingAssistantBE/model/notification.js

**Mobile screens:** `(teacherDetail)/classDetail/notification/cancellation.tsx`, `reschedule.tsx`

---

## UC-16: Statistics & Leaderboards

**Actor:** Teacher

**Description:** Teacher views aggregated statistics per subject and per session: top participants in discussion, top emoji-reactors, top reviewers, most-absent students, average review scores.

**Backend APIs:** `GET /api/v1/subject/top-participants/:subjectId`, `GET /api/v1/subject/top-reactors/:subjectId`, `GET /api/v1/subject/top-reviewers/:subjectId`, `GET /api/v1/subject/top-absentees/:subjectId`, `GET /api/v1/cAttend/topParticipants/:cAttendId`, `GET /api/v1/cAttend/topReactors/:cAttendId`, `GET /api/v1/subject/avgReview/:subjectId`

**Backend files:**
- TeachingAssistantBE/controller/subject_controller.js
- TeachingAssistantBE/services/discussion.service.js
- TeachingAssistantBE/services/reaction.service.js
- TeachingAssistantBE/services/review.service.js
- TeachingAssistantBE/services/attendRecord.service.js

**Mobile screens:** `(teacherDetail)/classDetail/statistical/index.tsx`, `interaction.tsx`, `review.tsx`, `rollCall.tsx`, `absence.tsx`

---

## UC-17: Export Student List

**Actor:** Teacher

**Description:** Teacher exports a student list for a subject as an Excel file.

**Backend APIs:** `GET /api/v1/subject/:subjectId/students/exportExcel`

**Backend files:**
- TeachingAssistantBE/controller/fileGenerate_controller.js

---

## UC-18: View Timetable

**Actor:** Student, Teacher

**Description:** User views a weekly timetable of their enrolled/teaching classes.

**Backend APIs:** `GET /api/v1/classSession/findByUser/:userId`

**Mobile screens:** `(student)/timetable.tsx`, `(teacher)/timetable.tsx`

---

## UC-19: Peer Review Group Cross-Grading

**Actor:** Teacher

**Description:** Teacher assigns cross-grading pairs — one group reviews another group's work. Backend records the pairing (`reviewedBy` field in Group) and sends FCM notifications.

**Backend APIs:** `POST /api/v1/group/crossPairs`

**Backend files:**
- TeachingAssistantBE/controller/group_controller.js
- TeachingAssistantBE/services/group.service.js

**Mobile screens:** `(studentDetail)/classDetail/discussion/reviewGroup.tsx`

---

## UC-20: Token Refresh

**Actor:** System (automatic)

**Description:** Mobile silently requests a new access token using a stored refresh token.

**Backend APIs:** `GET /api/v1/token/refresh-token`

**Backend files:**
- TeachingAssistantBE/route/token_route.js
- TeachingAssistantBE/services/token.service.js

**Mobile utility:** `utils/refreshAccessToken.tsx`
