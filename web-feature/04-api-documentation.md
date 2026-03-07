# 4. Backend API Documentation

Base prefix: `/api/v1` (set via `API_URL` environment variable)

---

## Authentication & User

### POST /api/v1/user/register
**Purpose:** Register a new user

**Request body:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "userCode": "string",
  "school": "string",
  "role": "student | teacher"
}
```

**Response:**
```json
{
  "user": {},
  "accessToken": "string",
  "refreshToken": "string"
}
```

**Files:**
- TeachingAssistantBE/route/user_route.js
- TeachingAssistantBE/controller/user_controller.js

---

### POST /api/v1/user/login
**Purpose:** Authenticate user

**Request body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "data": {}
}
```

**Files:**
- TeachingAssistantBE/controller/user_controller.js
- TeachingAssistantBE/services/token.service.js

---

### PATCH /api/v1/user/update/:id
**Purpose:** Update user profile (auth required; own account only)

**Request body:** Any user fields except `password`

**Response:** `{ "message": "Updated successfully" }`

---

### PATCH /api/v1/user/changepassword
**Purpose:** Change password (used in forgot-password flow)

**Request body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:** `{ "message": "Password changed successfully" }`

---

### GET /api/v1/token/refresh-token
**Purpose:** Get a new access token using refresh token

**Header:** `Authorization: Bearer <refresh_token>`

**Response:**
```json
{
  "access_token": "string"
}
```

**Files:**
- TeachingAssistantBE/route/token_route.js
- TeachingAssistantBE/services/token.service.js

---

### DELETE /api/v1/token/deleteall/:key
**Purpose:** Admin-only — delete all tokens (uses SECRET_KEY)

---

## Email / OTP Service

### POST /api/v1/service/sendEmail
**Purpose:** Send OTP email for verification/password reset

**Request body:**
```json
{
  "email": "string"
}
```

---

### POST /api/v1/service/verifyCode
**Purpose:** Verify OTP code submitted by user

**Request body:**
```json
{
  "email": "string",
  "code": "string"
}
```

---

### POST /api/v1/service/verifyEmail
**Purpose:** Verify that email exists in the system

**Files:**
- TeachingAssistantBE/route/service_route.js
- TeachingAssistantBE/controller/email_controller.js
- TeachingAssistantBE/services/email.service.js

---

## Subject (Class)

### POST /api/v1/subject/add
**Purpose:** Create a new subject (teacher only, auth required)

**Request body:**
```json
{
  "hostId": "string",
  "name": "string",
  "code": "string",
  "sessions": [
    {
      "dayOfWeek": 1,
      "start": "07:30",
      "end": "09:30",
      "room": "string"
    }
  ]
}
```

**Response:**
```json
{
  "subject": {},
  "userSubject": {}
}
```

---

### POST /api/v1/subject/join
**Purpose:** Student joins a subject via join code (auth required)

**Request body:**
```json
{
  "studentId": "string",
  "joinCode": "string"
}
```

**Response:** `{ "userSubject": {} }`

---

### POST /api/v1/subject/leave
**Purpose:** Student leaves a subject, or teacher removes a student (auth required)

**Request body:**
```json
{
  "studentId": "string",
  "subjectId": "string"
}
```

---

### PATCH /api/v1/subject/update/:id
**Purpose:** Update subject info (teacher/host only, auth required)

---

### DELETE /api/v1/subject/delete/:id
**Purpose:** Delete subject and all related data (host only, auth required)

---

### GET /api/v1/subject/:id
**Purpose:** Get subject by ID (includes class sessions)

**Response:**
```json
{
  "subject": {},
  "classSessions": []
}
```

---

### GET /api/v1/subject/findByUserId/:userId
**Purpose:** Get all subjects the user is enrolled in or teaching (auth required)

**Response:** `{ "subjects": [] }`

---

### GET /api/v1/subject/avgReview/:subjectId
**Purpose:** Get average review scores across all sessions for the subject

**Response:**
```json
{
  "avgUnderstand": 0,
  "avgUseful": 0,
  "avgTeachingMethod": 0,
  "avgAtmosphere": 0,
  "avgDocument": 0,
  "thinkings": []
}
```

---

### GET /api/v1/subject/:subjectId/students
**Purpose:** Get all enrolled students in a subject

**Response:** `{ "students": [] }`

---

### GET /api/v1/subject/:subjectId/students/exportExcel
**Purpose:** Export student list as Excel file

**Files:** TeachingAssistantBE/controller/fileGenerate_controller.js

---

### POST /api/v1/subject/notify/classCancel
**Purpose:** Send class cancellation notification to all students (teacher/host only, auth required)

**Request body:**
```json
{
  "subjectId": "string",
  "date": "string",
  "reason": "string"
}
```

---

### POST /api/v1/subject/notify/classReschedule
**Purpose:** Send class reschedule notification to all students (teacher/host only, auth required)

**Request body:**
```json
{
  "subjectId": "string",
  "date": "string"
}
```

---

### GET /api/v1/subject/top-participants/:subjectId
**Purpose:** Top N students by discussion participation (auth required)

**Query params:** `?top=5` (default: 5)

---

### GET /api/v1/subject/top-reactors/:subjectId
**Purpose:** Top N students by emoji reactions (auth required)

---

### GET /api/v1/subject/top-reviewers/:subjectId
**Purpose:** Top N students by review submissions (auth required)

---

### GET /api/v1/subject/top-absentees/:subjectId
**Purpose:** Top N most-absent students (auth required)

**Files:** TeachingAssistantBE/controller/subject_controller.js

---

## Class Session

### POST /api/v1/classSession/add
**Purpose:** Add a class session (recurring time slot) to a subject (auth required)

**Request body:**
```json
{
  "subjectId": "string",
  "room": "string",
  "dayOfWeek": 2,
  "start": "07:30",
  "end": "09:30"
}
```

---

### GET /api/v1/classSession/findByUser/:userId
**Purpose:** Get all class sessions for a user (populates subject info for timetable, auth required)

---

### GET /api/v1/classSession/findBySubject/:subjectId
**Purpose:** Get all sessions for a subject (auth required)

---

### PATCH /api/v1/classSession/update/:id
**Purpose:** Update a class session (auth required)

---

### DELETE /api/v1/classSession/delete/:id
**Purpose:** Delete a class session (auth required)

**Files:**
- TeachingAssistantBE/route/classSession_route.js
- TeachingAssistantBE/controller/classSession_controller.js

---

## Attendance (CAttend)

### POST /api/v1/cAttend/add
**Purpose:** Teacher creates a new attendance session for a class (auth required)

**Request body:**
```json
{
  "classSessionId": "string",
  "date": "dd/mm/yyyy",
  "sessionNumber": 1,
  "teacherLatitude": 0.0,
  "teacherLongitude": 0.0,
  "timeExpired": 5
}
```

**Response:** `{ "cAttend": {} }`

---

### GET /api/v1/cAttend/findBySubject/:subjectId
**Purpose:** Get all attendance sessions for a subject; auto-expires overdue active sessions (auth required)

**Response:** `{ "cAttends": [] }`

---

### GET /api/v1/cAttend/:id
**Purpose:** Get single attendance session by ID

---

### PATCH /api/v1/cAttend/update/:id
**Purpose:** Update attendance session — activate, update GPS, set timer, open/close session (teacher only, auth required)

---

### DELETE /api/v1/cAttend/delete/:cAttendId
**Purpose:** Delete attendance session and all AttendRecords, Reviews, Documents, Groups linked to it (teacher only, auth required)

---

### GET /api/v1/cAttend/attendStudents/:cAttendId
**Purpose:** Get all students with their attendance status for a session (auth required)

**Response:** `{ "students": [{ name, email, status, listStatus, ... }] }`

---

### PATCH /api/v1/cAttend/reset/:cAttendId
**Purpose:** Reset all attendance records for a session — clears GPS, counts, and all AttendRecords (host only, auth required)

---

### PATCH /api/v1/cAttend/resetSingle/:cAttendId/:index
**Purpose:** Remove a single attendance round (by index) from all records (auth required)

---

### PATCH /api/v1/cAttend/updateAcceptedNumber/:cAttendId
**Purpose:** Update the absence threshold; recalculates all student statuses (auth required)

**Request body:** `{ "acceptedNumber": 2 }`

---

### GET /api/v1/cAttend/topParticipants/:cAttendId
**Purpose:** Top N discussion participants for this session (auth required)

---

### GET /api/v1/cAttend/topReactors/:cAttendId
**Purpose:** Top N emoji reactors for this session (auth required)

**Files:**
- TeachingAssistantBE/route/cAttend_route.js
- TeachingAssistantBE/controller/cAttend_controller.js

---

## Attend Record

### POST /api/v1/cAttend/attendRecord/add
**Purpose:** Student submits GPS for attendance check-in (auth required; own studentId only)

**Request body:**
```json
{
  "cAttendId": "string",
  "studentId": "string",
  "studentLatitude": 0.0,
  "studentLongitude": 0.0,
  "FCMToken": "string",
  "index": 1
}
```

**Validation:** Session must be active and not expired. GPS distance computed against teacher coordinates. One FCMToken per session (anti-fraud).

**Status codes:** `CM` = present per round, `KP` = absent per round, `CP` = excused

**Response:** `{ "attendRecord": {} }`

---

### POST /api/v1/cAttend/attendRecord/add/forStudent
**Purpose:** Teacher manually creates an attendance record for a student (auth required; host only)

**Request body:**
```json
{
  "cAttendId": "string",
  "studentId": "string",
  "status": "CM | KP | CP",
  "index": 1
}
```

---

### PATCH /api/v1/cAttend/attendRecord/update/forStudent/:id
**Purpose:** Teacher manually updates an existing attendance record (auth required; host only)

**Request body:** `{ "status": "CM | KP | CP", "index": 1 }`

---

### PATCH /api/v1/cAttend/attendRecord/markExcusedAttendance
**Purpose:** Bulk operation — creates KP records for all students not yet checked in, then applies approved AbsenceRequests as CP for the given date (auth required)

**Request body:**
```json
{
  "subjectId": "string",
  "cAttendId": "string",
  "date": "dd/mm/yyyy"
}
```

---

### GET /api/v1/subject/:subjectId/user/:userId/attendRecords
**Purpose:** Get all attend records for a student within a subject

**Files:**
- TeachingAssistantBE/controller/attendRecord_controller.js

---

## Absence Requests

### POST /api/v1/absence/create
**Purpose:** Student submits an absence request (auth required)

**Request body:**
```json
{
  "studentId": "string",
  "subjectId": "string",
  "date": "ISO date string",
  "reason": "string",
  "proof": ["imageUrl1", "imageUrl2"]
}
```

**Response:** `{ "absenceRequest": {} }`

---

### PATCH /api/v1/absence/update/:id
**Purpose:** Teacher approves/rejects; student can update pending request (auth required)

**Request body:**
```json
{
  "status": "pending | approved | rejected",
  "comment": "string"
}
```

---

### GET /api/v1/absence/info/:id
**Purpose:** Get single absence request details (auth required)

---

### GET /api/v1/absence/studentRequest
**Purpose:** Get all absence requests for the authenticated student

---

### GET /api/v1/absence/teacherRequest
**Purpose:** Get all absence requests for subjects taught by the authenticated teacher

---

### DELETE /api/v1/absence/delete/:id
**Purpose:** Delete an absence request (auth required)

**Files:**
- TeachingAssistantBE/route/absence_route.js
- TeachingAssistantBE/controller/absenceRequest_controller.js

---

## Discussion (In-Session Q&A)

### POST /api/v1/discussion/add
**Purpose:** Create a new discussion post in a session

**Request body:**
```json
{
  "cAttendId": "string",
  "creator": "string",
  "title": "string",
  "content": "string",
  "images": [],
  "replyOf": "string | null"
}
```

---

### PATCH /api/v1/discussion/update/:id
**Purpose:** Update discussion content or mark as resolved

---

### DELETE /api/v1/discussion/delete/:id
**Purpose:** Delete a discussion post

---

### GET /api/v1/discussion/findByCAttend/:cAttendId
**Purpose:** Get all discussions for a session

---

### POST /api/v1/discussion/:id/vote
**Purpose:** Upvote or downvote a discussion (auth required)

---

### POST /api/v1/discussion/reaction/add
**Purpose:** Add an emoji reaction to a discussion

**Request body:**
```json
{
  "discussionId": "string",
  "creator": "string",
  "emoji": "string"
}
```

---

### PATCH /api/v1/discussion/reaction/update/:id
**Purpose:** Update an existing reaction

---

### GET /api/v1/discussion/:discussionId/reactions
**Purpose:** Get all reactions for a discussion

**Files:**
- TeachingAssistantBE/route/discussion_route.js
- TeachingAssistantBE/controller/discussion_controller.js
- TeachingAssistantBE/controller/reaction_controller.js

---

## Questions (Subject-Level Q&A)

### POST /api/v1/question/add
**Purpose:** Student adds a question to a subject (auth required)

**Request body:**
```json
{
  "subjectId": "string",
  "studentId": "string",
  "type": "text | image",
  "content": "string"
}
```

---

### PATCH /api/v1/question/update/:id
**Purpose:** Update or resolve a question (auth required)

---

### DELETE /api/v1/question/delete/:id
**Purpose:** Delete a question (auth required)

---

### GET /api/v1/question/findBySubject/:subjectId
**Purpose:** Get all questions for a subject (auth required)

**Files:**
- TeachingAssistantBE/route/question_route.js
- TeachingAssistantBE/controller/question_controller.js

---

## Channel & Posts

### POST /api/v1/channel/add
**Purpose:** Create a channel within a subject

**Request body:** `{ "subjectId": "string", "name": "string" }`

---

### POST /api/v1/channel/addMany
**Purpose:** Bulk create multiple channels for a subject

---

### GET /api/v1/channel/findBySubject/:subjectId
**Purpose:** Get all channels for a subject

---

### PATCH /api/v1/channel/update/:id
**Purpose:** Update a channel

---

### DELETE /api/v1/channel/delete/:id
**Purpose:** Delete a channel and all its posts

---

### POST /api/v1/channel/post/add
**Purpose:** Add a post to a channel

**Request body:** `{ "channelId": "string", "creator": "string", "content": "string", "images": [] }`

---

### GET /api/v1/channel/post/find/:channelId
**Purpose:** Get all posts in a channel

---

### PATCH /api/v1/channel/post/update/:id
**Purpose:** Update a post

---

### DELETE /api/v1/channel/post/delete/:id
**Purpose:** Delete a post

**Files:**
- TeachingAssistantBE/route/channel_route.js
- TeachingAssistantBE/controller/channel_controller.js
- TeachingAssistantBE/controller/post_controller.js

---

## Review

### POST /api/v1/review/add
**Purpose:** Student submits session review (auth required; unique per cAttendId+studentId)

**Request body:**
```json
{
  "cAttendId": "string",
  "studentId": "string",
  "understandPercent": 80,
  "usefulPercent": 90,
  "teachingMethodScore": "4",
  "atmosphereScore": "5",
  "documentScore": "3",
  "thinking": "optional open text"
}
```

---

### PATCH /api/v1/review/update/:id
**Purpose:** Update a review (auth required)

---

### DELETE /api/v1/review/delete/:id
**Purpose:** Delete a review (auth required)

---

### GET /api/v1/review/findByCAttend/:cAttendId
**Purpose:** Get all reviews for a session (auth required)

---

### GET /api/v1/subject/:subjectId/user/:userId/reviews
**Purpose:** Get all reviews submitted by a student in a subject

**Files:**
- TeachingAssistantBE/route/review_route.js
- TeachingAssistantBE/controller/review_controller.js
- TeachingAssistantBE/services/review.service.js

---

## Groups

### POST /api/v1/group/random/create
**Purpose:** Randomly partition present students (status=CM) into N groups (teacher/host only, auth required)

**Request body:**
```json
{
  "cAttendId": "string",
  "numberOfGroup": 4
}
```

**Response:** `{ "groups": [] }`

---

### GET /api/v1/group/cAttend/:cAttendId
**Purpose:** Get all groups for a session (populated members)

---

### POST /api/v1/group/create
**Purpose:** Manually create a group (auth required)

**Request body:**
```json
{
  "name": "string",
  "members": [],
  "admin": "string",
  "type": "random | default",
  "cAttendId": "string",
  "subjectId": "string",
  "autoAccept": true
}
```

---

### PATCH /api/v1/group/update/:id
**Purpose:** Update group info (group admin only, auth required)

---

### POST /api/v1/group/join/:groupId
**Purpose:** Join a group (auth required; respects autoAccept flag)

---

### DELETE /api/v1/group/leave/:groupId
**Purpose:** Leave a group (auth required; deletes group if last member; transfers admin if needed)

---

### GET /api/v1/group/default/all/:subjectId
**Purpose:** Get all default (fixed) groups for a subject (auth required)

---

### GET /api/v1/group/random/all/:cAttendId
**Purpose:** Get all random groups for a session (auth required)

---

### GET /api/v1/group/default/:subjectId
**Purpose:** Get the authenticated user's default group in a subject

---

### GET /api/v1/group/random/:subjectId
**Purpose:** Get the authenticated user's random groups in a subject

---

### DELETE /api/v1/group/randoms/:cAttendId
**Purpose:** Delete all random groups for a session (auth required)

---

### POST /api/v1/group/crossPairs
**Purpose:** Assign cross-grading pairs (teacher sends FCM notifications to each group about which group reviews them)

**Request body:**
```json
{
  "pairs": [
    { "groupId": "string", "reviewedBy": "string" }
  ]
}
```

**Files:**
- TeachingAssistantBE/route/group_route.js
- TeachingAssistantBE/controller/group_controller.js
- TeachingAssistantBE/services/group.service.js

---

## Group Messages

### POST /api/v1/group/message/create
**Purpose:** Send a message in a group

**Request body:**
```json
{
  "groupId": "string",
  "senderId": "string",
  "content": "string",
  "images": []
}
```

---

### GET /api/v1/group/:groupId/message/
**Purpose:** Get all messages for a group

---

### PATCH /api/v1/group/message/update/:id
**Purpose:** Update a group message

---

### DELETE /api/v1/group/message/delete/:id
**Purpose:** Delete or revoke a group message (`isRevoked` flag)

**Files:**
- TeachingAssistantBE/controller/groupMessage_controller.js

---

## Documents

### GET /api/v1/document/findByCAttend/:cAttendId
**Purpose:** Get all documents attached to a session

**Response:** `{ "documents": [] }`

---

### PATCH /api/v1/document/update/:id
**Purpose:** Update document metadata

---

### DELETE /api/v1/document/delete/:id
**Purpose:** Delete a document record

**Files:**
- TeachingAssistantBE/route/document_route.js
- TeachingAssistantBE/controller/document_controller.js

---

## Upload (Firebase Storage)

### POST /api/v1/upload/image
**Purpose:** Upload a single image to Firebase Storage

**Request:** `multipart/form-data` with field `image`

**Response:** `{ "downloadURL": "string" }`

---

### POST /api/v1/upload/images
**Purpose:** Upload up to 5 images

**Request:** `multipart/form-data` with field `image` (array, max 5)

---

### POST /api/v1/upload/file
**Purpose:** Upload a file to Firebase Storage and create a Document record linked to cAttendId

**Request:** `multipart/form-data` with field `file`

**Files:**
- TeachingAssistantBE/route/upload_route.js
- TeachingAssistantBE/controller/firebase_controller.js
- TeachingAssistantBE/services/firebase.service.js

---

## Firebase / FCM

### POST /api/v1/firebase/subscribeToTopics
**Purpose:** Subscribe device FCM token to subject topic IDs for push notifications (auth required)

**Request body:**
```json
{
  "token": "fcmToken",
  "topics": ["subjectId1", "subjectId2"]
}
```

---

### POST /api/v1/firebase/unsubscribeFromTopics
**Purpose:** Unsubscribe FCM token from topics (on logout)

**Request body:**
```json
{
  "token": "fcmToken",
  "topics": ["subjectId1"]
}
```

**Files:**
- TeachingAssistantBE/route/firebase_route.js
- TeachingAssistantBE/controller/firebase_controller.js

---

## Notifications

### GET /api/v1/notification/get
**Purpose:** Get all notifications for the authenticated user

---

### PATCH /api/v1/notification/read/:id
**Purpose:** Mark a single notification as read

---

### PATCH /api/v1/notification/readAll
**Purpose:** Mark all notifications as read

---

### DELETE /api/v1/notification/delete/:id
**Purpose:** Delete a notification

---

### GET /api/v1/notification/classReschedule/:id
**Purpose:** Get details for a class reschedule notification

---

### GET /api/v1/notification/classCancel/:id
**Purpose:** Get details for a class cancellation notification

**Files:**
- TeachingAssistantBE/route/notification_route.js
- TeachingAssistantBE/controller/notification_controller.js
- TeachingAssistantBE/services/notification.service.js

---

## System

### POST /api/v1/system/absence-warning
**Purpose:** Trigger absence violation warnings to students approaching their maximum absence limit

**Note:** The underlying scheduled job (weeklyAbsentWarning.js) is empty — this endpoint exists but the automated trigger is not implemented.

**Files:**
- TeachingAssistantBE/route/system_route.js
- TeachingAssistantBE/controller/system_controller.js
- TeachingAssistantBE/services/system.service.js
