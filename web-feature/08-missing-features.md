# 8. Missing / Partial Features

---

## 1. Weekly Absence Warning Job (Partial)

**Status:** Partial — API exists, job trigger not implemented

**Evidence:**
- `TeachingAssistantBE/job/weeklyAbsentWarning.js` is an empty file (1 line)
- `TeachingAssistantBE/route/system_route.js` exposes `POST /system/absence-warning`
- `TeachingAssistantBE/controller/system_controller.js` has `notifyAbsenceViolations` implemented
- `TeachingAssistantBE/services/system.service.js` exists

**What works:** The API endpoint can be manually triggered to detect students who have exceeded `maxAbsences` and send them absence warning notifications.

**What is missing:** The automated weekly cron/scheduler that would call this endpoint (or run the logic directly) is not implemented. The `job/weeklyAbsentWarning.js` file is completely empty.

**Impact:** Absence warnings never fire automatically. Teachers or administrators would need to manually call `POST /system/absence-warning` to trigger them.

---

## 2. Google Login (Not Implemented)

**Status:** UI placeholder — no backend integration

**Evidence:**
- `TeachingAssistantFE/app/(auth)/sign-in.tsx:144`:
  ```javascript
  const loginGoogle = () => {

  }
  ```
- A Google login button is rendered in the UI but the handler is empty
- No OAuth routes exist in the backend
- No Google OAuth SDK configured in the frontend

**Impact:** The Google login button is visible but completely non-functional. Clicking it does nothing.

---

## 3. Subject Start/End Date Tracking (Unused Field)

**Status:** Broken / hardcoded

**Evidence:**
- `TeachingAssistantBE/controller/subject_controller.js:38-46`:
  ```javascript
  //Note: Client don't use startDay and endDay
  const startDay = helper.parseDate('01/01/2024');
  const endDay = helper.parseDate('02/01/2024');
  ```
- The update validation code for `startDay`/`endDay` is commented out
- `Subject` model has these fields as required but they are always hardcoded to the same fixed dates

**Impact:** Subject date ranges are meaningless. The fields exist but carry no real data. Any date-based filtering or course lifecycle management based on these fields would not work.

---

## 4. Anonymous Q&A (Inaccurate Feature Claim)

**Status:** Claimed in README but not implemented in data model

**Evidence:**
- `TeachingAssistantBE/model/question.js`: `studentId` is always stored and required
- `TeachingAssistantBE/model/discussion.js`: `creator` is always stored and required
- No anonymization layer, no display-name masking, no opt-in anonymity flag

**Impact:** Questions and discussions are fully traceable to the submitting student. The "anonymous Q&A" feature described in the README is a documentation inaccuracy. Both teacher and anyone with DB access can identify who posted what.

---

## 5. Redis Underutilization

**Status:** Configured but underutilized

**Evidence:**
- `TeachingAssistantBE/config/redis.js` exists and creates a Redis client
- `TeachingAssistantBE/services/redis.service.js` exists
- Usage appears limited to storing refresh tokens and FCM tokens via `token.service.js`

**Impact:** Redis is set up as infrastructure but is not used for its primary purpose (caching, rate limiting, session storage). All database queries go directly to MongoDB without cache. For a free-tier deployment this is an acceptable simplification, but it means the codebase carries Redis as a dependency without leveraging its performance benefits.

---

## 6. Document Upload via Firebase Service (Broken Method)

**Status:** Bug in `firebase.service.js`

**Evidence:**
- `TeachingAssistantBE/services/firebase.service.js` `uploadFile` method uses `this.getURL(file)` inside an object literal, where `this` does not refer to `FirebaseService`
- This would throw a `TypeError: Cannot read properties of undefined` at runtime when called via `FirebaseService.uploadFile()`

**Impact:** The `uploadFile` method in `firebase.service.js` has a `this` binding bug. File uploads via `firebase_controller.js` (which calls Firebase service directly) likely work via a different path; the broken path in `service.uploadFile` is inoperative.

---

## 7. Validator Coverage (Minimal)

**Status:** Incomplete

**Evidence:**
- Only `TeachingAssistantBE/validators/document.validator.js` exists
- No validators for user, subject, attendance, group, review, or discussion inputs
- Input validation is handled ad-hoc within controllers via manual checks

**Impact:** Request body validation is inconsistent. Some controllers validate inputs thoroughly; others do not. This is a code quality and security concern but not a blocking functional issue for current features.

---

## Summary Table

| Issue | Severity | Type |
|---|---|---|
| Weekly absence warning job (no scheduler) | Medium | Missing implementation |
| Google login (empty handler) | Low | Placeholder / not started |
| Subject date tracking (hardcoded) | Low | Unused / dead field |
| Anonymous Q&A (README inaccuracy) | Low | Documentation mismatch |
| Redis underutilization | Low | Architecture debt |
| `firebase.service.js` uploadFile `this` bug | Medium | Runtime bug |
| Minimal request validation coverage | Low | Code quality |
