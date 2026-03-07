# 3. Backend Architecture

## Language & Framework

| Item | Value |
|---|---|
| Language | JavaScript (Node.js) |
| Framework | Express.js |
| Database | MongoDB via Mongoose ODM |
| Real-time | Socket.IO |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| File Storage | Firebase Storage |
| Caching | Redis (configured; used for token storage) |
| Email | Nodemailer (via email service) |
| Architecture Style | Layered MVC — Route -> Controller -> Service -> Model |

## Project Structure

```
TeachingAssistantBE/
├── app.js                      # App bootstrap, routes, WebSocket server
├── config/
│   ├── firebase.js             # Firebase Admin SDK init
│   └── redis.js                # Redis client init
├── constants/
│   ├── constants.js            # App constants
│   ├── groupType.js            # RANDOM / DEFAULT enum
│   └── notificationType.js     # Notification type enum
├── controller/                 # Request handlers (thin, delegate to services)
│   ├── absenceRequest_controller.js
│   ├── attendRecord_controller.js
│   ├── cAttend_controller.js
│   ├── channel_controller.js
│   ├── classSession_controller.js
│   ├── discussion_controller.js
│   ├── document_controller.js
│   ├── email_controller.js
│   ├── fileGenerate_controller.js
│   ├── firebase_controller.js
│   ├── group_controller.js
│   ├── groupMessage_controller.js
│   ├── notification_controller.js
│   ├── post_controller.js
│   ├── question_controller.js
│   ├── reaction_controller.js
│   ├── review_controller.js
│   ├── subject_controller.js
│   ├── system_controller.js
│   └── user_controller.js
├── middlewares/
│   ├── auth.middleware.js      # Role/ownership checks
│   ├── expressJwt.js           # JWT verification (express-jwt)
│   ├── error.middleware.js     # Global error handler
│   └── validate.middleware.js
├── model/                      # Mongoose schemas
│   ├── FCMToken.js
│   ├── absenceRequest.js
│   ├── attendRecord.js
│   ├── cAttend.js
│   ├── channel.js
│   ├── classSession.js
│   ├── discussion.js
│   ├── document.js
│   ├── group.js
│   ├── groupMessage.js
│   ├── notification.js
│   ├── notificationRecipient.js
│   ├── post.js
│   ├── question.js
│   ├── reaction.js
│   ├── review.js
│   ├── subject.js
│   ├── token.js
│   ├── user.js
│   └── userSubject.js
├── route/                      # Express route definitions
│   ├── absence_route.js
│   ├── cAttend_route.js
│   ├── channel_route.js
│   ├── classSession_route.js
│   ├── discussion_route.js
│   ├── document_route.js
│   ├── firebase_route.js
│   ├── group_route.js
│   ├── notification_route.js
│   ├── question_route.js
│   ├── review_route.js
│   ├── service_route.js
│   ├── subject_route.js
│   ├── system_route.js
│   ├── token_route.js
│   ├── upload_route.js
│   └── user_route.js
├── services/                   # Business logic
│   ├── attendRecord.service.js
│   ├── cAttend.service.js
│   ├── discussion.service.js
│   ├── document.service.js
│   ├── email.service.js
│   ├── firebase.service.js
│   ├── group.service.js
│   ├── notification.service.js
│   ├── reaction.service.js
│   ├── redis.service.js
│   ├── review.service.js
│   ├── subject.service.js
│   ├── system.service.js
│   ├── token.service.js
│   └── user.service.js
├── utils/
│   ├── AppError.js             # Custom error classes
│   ├── hash.js                 # bcrypt wrapper
│   ├── helper.js               # GPS distance, date parsing, ObjectID validation
│   └── token.js                # JWT generation
├── validators/
│   └── document.validator.js
└── job/
    └── weeklyAbsentWarning.js  # Scheduled job (empty / not implemented)
```

## Route Prefix Map

All routes are prefixed with `/api/v1` (configured via `API_URL` env variable).

| Prefix | Module |
|---|---|
| `/api/v1/user` | User registration, login, profile update |
| `/api/v1/token` | JWT refresh, admin token delete |
| `/api/v1/subject` | Subject (class) CRUD, leaderboards, notifications |
| `/api/v1/classSession` | Class session time slot management |
| `/api/v1/question` | Subject-level Q&A |
| `/api/v1/channel` | Subject channels and posts |
| `/api/v1/cAttend` | Attendance sessions and attend records |
| `/api/v1/review` | Session reviews |
| `/api/v1/service` | Email OTP service |
| `/api/v1/upload` | File/image upload to Firebase |
| `/api/v1/firebase` | FCM topic subscription management |
| `/api/v1/document` | Session document management |
| `/api/v1/discussion` | In-session Q&A discussions and reactions |
| `/api/v1/absence` | Absence requests |
| `/api/v1/notification` | In-app notification management |
| `/api/v1/group` | Group management and group messages |
| `/api/v1/system` | System operations (absence warning trigger) |

## WebSocket Events

### Client -> Server

| Event | Description |
|---|---|
| `addOnlineUser` | Register user as online with their socket ID |
| `joinSubject` | Join a subject-level socket room |
| `joinSubjectChannel` | Join a channel sub-room (`subjectId_channelId`) |
| `leaveSubject` | Leave a subject room |
| `leaveSubjectChannel` | Leave a channel room |
| `sendMessageToSubject` | Broadcast message to subject room + FCM push |
| `sendMessageToChannel` | Broadcast message to channel room + FCM push |
| `sendReply` | Broadcast a reply message to subject room |
| `sendVote` | Broadcast a vote update to subject room |
| `sendReaction` | Broadcast emoji reaction |
| `sendUpdateReaction` | Broadcast reaction update |
| `sendAttendance` | Broadcast attendance status update |
| `sendUpdateAttendance` | Broadcast individual attendance change |
| `sendResolve` | Broadcast question resolved event |
| `sendDeleteMessage` | Broadcast message deleted |
| `sendRevokedMessage` | Broadcast message revoked |
| `attendace` (sic) | Teacher starts attendance session + FCM push |

### Server -> Client

| Event | Description |
|---|---|
| `getOnlineUsers` | Updated list of online users |
| `receiveSubjectMessage` | Incoming subject-level message |
| `receiveChannelMessage` | Incoming channel message |
| `receiveReply` | Incoming reply |
| `receiveVote` | Vote update |
| `receiveReaction` | Emoji reaction |
| `receiveUpdateReaction` | Reaction update |
| `receiveUserAttendance` | Individual attendance update |
| `receiveUpdateAttendance` | Batch attendance update |
| `receiveResolve` | Question resolved |
| `receiveDeleteMessage` | Message deleted |
| `receiveRevokedMessage` | Message revoked |
| `receiveAttendance` | Attendance session broadcast from teacher |

## Authentication Flow

1. Client calls `POST /user/login` or `POST /user/register`
2. Backend returns `accessToken` (1h) and `refreshToken` (30d)
3. `expressJwt` middleware validates `accessToken` on all protected routes
4. When access token expires, client calls `GET /token/refresh-token` with the refresh token
5. Backend validates refresh token from Redis/DB and issues a new access token
6. FCM token is linked to user on login via `POST /firebase/subscribeToTopics`

## External Integrations

| Service | Purpose |
|---|---|
| Firebase Storage | Store uploaded images and files |
| Firebase Cloud Messaging | Push notifications to mobile devices |
| MongoDB Atlas | Cloud database (ATLAS_URI env variable) |
| Redis | Refresh token and FCM token storage |
| Nodemailer / SMTP | OTP email delivery for password reset |
