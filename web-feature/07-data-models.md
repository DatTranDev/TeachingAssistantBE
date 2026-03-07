# 7. Data / Domain Model Overview

---

## User

**Purpose:** Platform user account for both students and teachers.

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| name | String | Required |
| userCode | String | Student ID or employee number |
| school | String | Institution name |
| email | String | Unique; used for login |
| password | String | bcrypt hashed; select:false (excluded from queries by default) |
| role | String | Enum: `student`, `teacher` |
| avatar | String | URL to profile image; defaults to empty string |

**Relationships:**
- Has many `UserSubject` (enrollment records)
- Has many `AttendRecord` (as student)
- Has many `Discussion` (as creator)
- Has many `Review` (as student)
- Has many `AbsenceRequest` (as student)
- Has many `Group` (as member or admin)
- Hosts many `Subject` (as teacher)

**Related features:** Authentication, Attendance, Discussion, Review, Absence Requests, Groups

---

## Subject

**Purpose:** Represents a university course/class. The central domain entity around which all features are organized.

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| code | String | Course code (e.g., "CS101") |
| name | String | Full course name |
| hostId | ObjectId (User) | Teacher who owns the subject |
| startDay | Date | Course start date (currently hardcoded; not used by client) |
| endDay | Date | Course end date (currently hardcoded; not used by client) |
| currentSession | Number | Auto-incremented session counter |
| maxAbsences | Number | Allowed absence threshold; default 5 |
| joinCode | String | Unique code students use to join; auto-generated |

**Relationships:**
- Belongs to one `User` (hostId / teacher)
- Has many `UserSubject` (enrollment links)
- Has many `ClassSession` (time slots)
- Has many `Question` (subject-level Q&A)
- Has many `Channel` (discussion boards)
- Has many `Group` of type `default`

**Related features:** Class management, enrollment, timetable, channels, groups

---

## UserSubject

**Purpose:** Join table linking users to subjects with a role. Represents enrollment.

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| userId | ObjectId (User) | |
| subjectId | ObjectId (Subject) | |
| role | String | Enum: `student`, `teacher` |

**Constraints:** Unique compound index on (userId, subjectId)

**Related features:** Class enrollment, access control

---

## ClassSession

**Purpose:** A recurring weekly time slot within a subject (when and where the class meets).

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| subjectId | ObjectId (Subject) | |
| room | String | Physical room/location |
| dayOfWeek | Number | Enum: 1-7 (Monday=1, Sunday=7) |
| start | String | Format "HH:mm" |
| end | String | Format "HH:mm" |

**Relationships:**
- Belongs to one `Subject`
- Has many `CAttend` (attendance sessions)

**Related features:** Timetable, attendance

---

## CAttend (Class Attendance Session)

**Purpose:** A single instance of an attendance check for a class session on a specific date. May contain multiple check-in rounds.

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| classSessionId | ObjectId (ClassSession) | |
| date | Date | The actual date of this session |
| sessionNumber | Number | Sequential session number within subject |
| teacherLatitude | Number | GPS coordinate when teacher started attendance |
| teacherLongitude | Number | GPS coordinate when teacher started attendance |
| isActive | Boolean | Whether attendance is currently open for check-in |
| timeExpired | Number | Duration in minutes before session auto-closes |
| numberOfAttend | Number | Total check-in rounds conducted |
| acceptedNumber | Number | Number of rounds a student must miss to be marked absent |
| isClosed | Boolean | Whether the session is fully closed |

**Relationships:**
- Belongs to one `ClassSession`
- Has many `AttendRecord`
- Has many `Discussion`
- Has many `Review`
- Has many `Document`
- Has many `Group` of type `random`

**Related features:** Attendance, Discussion, Review, Documents, Groups

---

## AttendRecord

**Purpose:** Tracks a single student's attendance across all rounds of one CAttend session.

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| cAttendId | ObjectId (CAttend) | |
| studentId | ObjectId (User) | |
| listStatus | Array | Each entry: `{ index: Number, status: "CM|KP|CP" }` — one per check-in round |
| numberOfAbsence | Number | Count of rounds with missed attendance |
| status | String | Overall status: `CM` / `KP` / `CP` |
| FCMToken | String | Device token used; one per session for anti-fraud |
| studentLatitude | Number | GPS at check-in time |
| studentLongitude | Number | GPS at check-in time |

**Status codes:**
- `CM` — Present (per round) / Absent overall (context-dependent naming)
- `KP` — Absent without excuse (per round) / Present overall
- `CP` — Excused (Có Phép)

**Constraints:** Unique compound index on (cAttendId, studentId)

**Related features:** GPS attendance, manual override, absence requests

---

## Discussion

**Purpose:** A Q&A message or discussion post within a class session. Supports threading via self-reference.

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| cAttendId | ObjectId (CAttend) | Session scope |
| creator | ObjectId (User) | |
| title | String | Optional |
| content | String | Required |
| isResolved | Boolean | Teacher marks as answered |
| images | Array[String] | Image URLs |
| replyOf | ObjectId (Discussion) | Self-reference for threaded replies; null for root posts |
| upvotes | Array[ObjectId (User)] | Users who upvoted |
| downvotes | Array[ObjectId (User)] | Users who downvoted |

**Relationships:**
- Belongs to one `CAttend`
- Belongs to one `User` (creator)
- Has many `Reaction`
- Self-referential replies via `replyOf`

**Note:** Despite README claiming "anonymous Q&A", `creator` is always stored — no anonymity at data layer.

**Related features:** Real-time Q&A, reactions, statistics

---

## Reaction

**Purpose:** Emoji reaction attached to a discussion post.

**Key fields:** discussionId, creator, emoji type

**Relationships:** Belongs to Discussion, belongs to User

**Related features:** Discussion reactions, top reactor leaderboard

---

## Question

**Purpose:** A standalone question posted at the subject level (not session-scoped).

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| subjectId | ObjectId (Subject) | |
| studentId | ObjectId (User) | |
| type | String | Enum: `text`, `image` |
| content | String | |
| isResolved | Boolean | Default false |

**Note:** `studentId` is always stored — not truly anonymous despite README claim.

**Related features:** Subject-level Q&A

---

## Review

**Purpose:** Student's structured feedback for a single class session.

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| cAttendId | ObjectId (CAttend) | |
| studentId | ObjectId (User) | |
| understandPercent | Number | 0-100 |
| usefulPercent | Number | 0-100 |
| teachingMethodScore | String | Numeric string "1"-"5" |
| atmosphereScore | String | Numeric string "1"-"5" |
| documentScore | String | Numeric string "1"-"5" |
| thinking | String | Optional open comment |

**Constraints:** Unique compound index on (cAttendId, studentId) — one review per student per session.

**Related features:** Post-session feedback, statistics

---

## Group

**Purpose:** A student grouping for collaborative activities. Two types with different lifecycles.

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| name | String | Group display name |
| members | Array[ObjectId (User)] | |
| admin | ObjectId (User) | Group admin; transfers on admin leave |
| type | String | Enum: `random` (session-scoped), `default` (persistent) |
| cAttendId | ObjectId (CAttend) | Session reference for random groups |
| subjectId | ObjectId (Subject) | |
| reviewedBy | ObjectId (Group) | Which group is reviewing this group's work |
| autoAccept | Boolean | If true, anyone can join; if false, admin controls membership |

**Relationships:**
- Belongs to `Subject` and optionally `CAttend`
- Has many `User` members
- Has many `GroupMessage`
- `reviewedBy` → self-referential to another `Group`

**Related features:** Random grouping, fixed groups, group chat, cross-grading

---

## GroupMessage

**Purpose:** A single message in a group chat.

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| groupId | ObjectId (Group) | |
| senderId | ObjectId (User) | |
| content | String | Text content |
| images | Array[String] | Image URLs |
| isRevoked | Boolean | Soft-delete flag; content hidden when true |

**Related features:** Group chat

---

## Channel

**Purpose:** A named discussion board within a subject for asynchronous communication.

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| subjectId | ObjectId (Subject) | |
| name | String | Channel display name |

**Constraints:** Unique compound index on (subjectId, name)

**Relationships:** Has many `Post`

**Related features:** Subject channels

---

## Post

**Purpose:** A message posted within a channel.

**Key fields:** channelId, creator, content, images[]

**Relationships:** Belongs to `Channel`, belongs to `User`

**Related features:** Channel communication

---

## Document

**Purpose:** A file (PDF, etc.) attached to a class session.

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| name | String | Display name |
| type | String | MIME type or file extension |
| dowloadUrl | String | Firebase Storage download URL (note: typo in field name) |
| cAttendId | ObjectId (CAttend) | Session reference |

**Related features:** Document sharing

---

## AbsenceRequest

**Purpose:** Formal request from a student to have an absence excused.

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| studentId | ObjectId (User) | |
| subjectId | ObjectId (Subject) | |
| proof | Array[String] | Image URLs as supporting evidence |
| date | Date | The date of the absence |
| reason | String | Written justification |
| status | String | Enum: `pending`, `approved`, `rejected` |
| reviewedBy | ObjectId (User) | Teacher who reviewed the request |
| comment | String | Teacher's response comment |
| reviewedAt | Date | When the decision was made |

**Related features:** Absence request workflow, excused attendance

---

## Notification

**Purpose:** A system notification for an event such as class cancellation or absence warning.

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| senderId | ObjectId (User) | Sender; can be null for system notifications |
| title | String | Notification title |
| content | String | Notification body |
| type | String | Enum: `absent_warning`, `absence_request`, `class_cancellation`, `class_reschedule`, `other` |
| referenceModel | String | Name of the referenced collection |
| referenceId | ObjectId | ID of the referenced document |

**Relationships:** Has many `NotificationRecipient`

**Related features:** Push notifications, notification center

---

## NotificationRecipient

**Purpose:** Delivery and read-status record linking a notification to each individual recipient.

**Key fields:** notificationId, recipientId (User), isRead

**Related features:** Notification center, read/unread state

---

## Token

**Purpose:** Server-side storage of JWT refresh tokens and FCM device tokens per user.

**Key fields:** userId, refreshToken, FCMToken

**Related features:** Authentication, token refresh, push notifications

---

## FCMToken

**Purpose:** Dedicated storage for Firebase Cloud Messaging device tokens.

**Key fields:** token, userId

**Related features:** Push notifications

---

## Domain Relationship Summary

```
User
 ├── UserSubject (many) ──> Subject
 │     └── ClassSession (many)
 │           └── CAttend (many)
 │                 ├── AttendRecord (many, per student)
 │                 ├── Discussion (many)
 │                 │     └── Reaction (many)
 │                 ├── Review (many, per student)
 │                 ├── Document (many)
 │                 └── Group [random] (many)
 │                       └── GroupMessage (many)
 ├── Question (many, subject-level)
 ├── Channel (many, per subject)
 │     └── Post (many)
 ├── Group [default] (many, per subject)
 │     └── GroupMessage (many)
 ├── AbsenceRequest (many, as student)
 └── Notification -> NotificationRecipient (many)
```
