# WEB-034 — Web Push Notifications

## Objective
Implement Firebase Cloud Messaging (FCM) web push notifications: register the browser for push, subscribe to subject-relevant FCM topics, and display system push notifications when the app is in the background. Foreground notifications are handled as toasts.

## Background
The mobile app uses FCM for push notifications. The web app needs the same capability: when a teacher cancels a class or approves an absence request, students receive a push notification even if the browser tab is not active. FCM web push requires a service worker for background delivery.

## Scope
- Firebase web SDK initialization (`firebase/app`, `firebase/messaging`)
- Service worker: `public/firebase-messaging-sw.js`
- FCM token registration on login (after user consents to notifications)
- Push permission request flow with graceful fallback
- Subscribe to subject FCM topics: `POST /api/v1/firebase/subscribeToTopic`
- Background message handling: service worker shows system notification
- Foreground message handling: show toast with `sonner`
- Token refresh handling
- Unsubscribe on logout

## Out of Scope
- Notification content (WEB-016, WEB-023)
- In-app notification list (WEB-033)
- VAPID key generation (backend provides this; frontend reads from env)

## Dependencies
- WEB-008 (auth store — need user on login)
- WEB-004 (API service layer)
- Firebase project already configured (env vars)

## User Flow Context
1. User logs in → browser prompts for notification permission
2. User allows → FCM token registered → sent to backend
3. User enrolls in a subject → subscribed to subject FCM topic
4. Teacher sends class cancellation → FCM message sent → user receives push notification
5. If tab active: toast notification
6. If tab inactive/closed: system OS notification

## Functional Requirements
1. Initialize Firebase app from env vars on app startup
2. After login, call `requestNotificationPermission()` — if granted, get FCM token
3. FCM token sent to backend: `POST /api/v1/firebase/registerToken` with `{ token, platform: 'web' }`
4. Subscribe to `subject_<subjectId>` topic on joining a subject
5. Unsubscribe from topic on leaving a subject
6. Background message handler in service worker shows OS notification with title, body, icon
7. Foreground message handler: display toast notification with action link
8. Token refresh: handle `onTokenRefresh` and re-register with backend
9. Notification click: focus or open app tab, navigate to relevant page
10. On logout: unregister FCM token from backend

## UI Requirements

### Permission Request
```
No blocking modal — use subtle banner/snackbar:

"Cho phép thông báo để nhận cập nhật lớp học."
[Cho phép] [Để sau]

Shown once after login; not shown again if denied (respect browser choice).
```

### Foreground Toast Notification
```
[🔔 Thông báo lớp học]
"Lớp CS101 đã hủy buổi hôm nay"
[Xem chi tiết]  — action button

Toast duration: 6 seconds
```

### System Notification (Background — via service worker)
```
Title: "Teaching Assistant"
Body: "[Notification title]: [notification content]"
Icon: /icons/icon-192.png
Badge: /icons/badge-72.png
Click action: opens/focuses app at /notifications
```

## Technical Implementation Notes

### Firebase Config (`src/lib/firebase.ts`)
```typescript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
```

### Permission + Token Registration
```typescript
// src/lib/notifications.ts
export async function requestAndRegisterPushToken(): Promise<void> {
  if (!messaging) return; // SSR guard

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  });

  if (token) {
    await firebaseApi.registerToken({ token, platform: 'web' });
  }
}
```

### Foreground Message Handler
```typescript
// In AuthProvider or a NotificationProvider
import { onMessage } from 'firebase/messaging';

onMessage(messaging, (payload) => {
  toast(payload.notification?.title ?? 'Thông báo', {
    description: payload.notification?.body,
    action: payload.data?.route
      ? { label: 'Xem chi tiết', onClick: () => router.push(payload.data.route) }
      : undefined,
    duration: 6000,
  });
  // Invalidate notifications query to show new item in bell badge
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
});
```

### Service Worker (`public/firebase-messaging-sw.js`)
```javascript
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: '...',        // These MUST be hardcoded or injected at build time
  messagingSenderId: '...',
  appId: '...',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(
    payload.notification?.title ?? 'Teaching Assistant',
    {
      body: payload.notification?.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: payload.data,
    }
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const route = event.notification.data?.route ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(route);
          return;
        }
      }
      return clients.openWindow(route);
    })
  );
});
```

### Topic Subscription Integration
Called when student joins a subject (WEB-013) or teacher creates one (WEB-012):
```typescript
// After successful join/create:
await firebaseApi.subscribeToTopic({
  token: currentFcmToken,
  topic: `subject_${subjectId}`,
});
```

### API Requirements
- `POST /api/v1/firebase/registerToken` — `{ token: string, platform: 'web' }`
- `POST /api/v1/firebase/subscribeToTopic` — `{ token: string, topic: string }`
- `POST /api/v1/firebase/unsubscribeFromTopic` — `{ token: string, topic: string }`
- `DELETE /api/v1/firebase/unregisterToken` — on logout

### Environment Variables
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

### File Structure
```
public/
└── firebase-messaging-sw.js

src/lib/
├── firebase.ts
└── notifications.ts

src/hooks/
└── usePushNotifications.ts
```

## Backend Changes
None (backend already has FCM Admin SDK; just needs to accept web tokens and handle `platform: 'web'` tokens alongside mobile tokens).

## Acceptance Criteria
- [ ] Browser prompts for notification permission after login
- [ ] Permission banner dismissible with "Để sau"
- [ ] FCM token registered with backend after permission granted
- [ ] Subscribed to subject topics on join/create
- [ ] Background message: system OS notification appears when tab not active
- [ ] Foreground message: sonner toast appears
- [ ] Notification click: focuses app and navigates to correct page
- [ ] Token refresh: updated in backend
- [ ] Logout: token unregistered

## Testing Requirements
- **Manual QA (push notifications require manual testing):**
  - Log in → allow notifications → teacher sends class cancellation → verify system notification
  - App in foreground → notification arrives → verify toast with action
  - Click background notification → verify app opens at correct route
- **Unit tests:**
  - `requestAndRegisterPushToken()`: handles denied permission gracefully
  - Token storage and re-registration on refresh

## Definition of Done
- FCM token registered on login
- Subject topic subscriptions work
- Background push notifications delivered
- Foreground toasts show
- Service worker registered

## Risks / Notes
- Service worker Firebase config cannot use `process.env` — values must be injected at build time or hardcoded in the SW file. Consider a build script or Next.js `next.config.js` plugin to inject env vars into the service worker
- Safari on iOS has limited web push support (only with iOS 16.4+ added to home screen) — document this limitation
- Push notification permission cannot be requested programmatically after denial — users must manually enable in browser settings; show a help tooltip in the permission banner
- This feature requires HTTPS in production (service workers need secure context)
