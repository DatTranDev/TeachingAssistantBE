# WEB-006 — Backend CORS & Security Hardening for Web

## Objective
Enhance the existing Express.js backend to safely accept requests from the Next.js web application: configure CORS with the web origin, add rate limiting on sensitive endpoints, install security headers via `helmet`, and add basic input sanitization. These changes must not break the existing mobile app.

## Background
The Express.js backend currently has `cors()` configured with default settings (all origins allowed). While this works for mobile, it is insecure for a public web deployment. Before the web frontend can make cross-origin requests in a controlled, secure manner, the backend must explicitly configure allowed origins, set rate limits to prevent brute-force attacks, and add security headers appropriate for API services.

## Scope
- Configure `cors` with explicit allowed origins (web + mobile origins or a whitelist)
- Install and configure `express-rate-limit` on `/user/login` and `/user/register`
- Install and configure `helmet` for security headers
- Add `express-validator` or `joi` for input sanitization on at least: login, register, absence request
- Add `morgan` structured logging (already installed; configure production format)
- Document all new environment variables in `.env.local`
- Ensure mobile app continues to work without modification

## Out of Scope
- JWT algorithm changes
- Database schema changes
- New API endpoints (those are in per-feature backend tickets)
- VAPID web push setup (WEB-034)
- Pagination/filtering (WEB-036)

## Dependencies
- None (standalone backend ticket)

## User Flow Context
Transparent to users. Enables UF-01 through UF-19 by allowing the web app to communicate with the backend.

## Functional Requirements
1. `cors` configured with `origin` as an array from `ALLOWED_ORIGINS` env var (comma-separated)
   - Development: `http://localhost:3000,http://localhost:19000` (Next.js + Expo)
   - Production: `https://yourapp.vercel.app` + mobile origins
2. `cors` credentials: `true` (required for cookie-based flows)
3. Rate limiting on `POST /api/v1/user/login`:
   - 10 requests per 15 minutes per IP
   - Responds with 429 JSON: `{ message: "Too many login attempts. Try again in 15 minutes." }`
4. Rate limiting on `POST /api/v1/user/register`:
   - 5 requests per hour per IP
5. `helmet()` applied to all routes (default settings are suitable for API)
6. `helmet.contentSecurityPolicy` disabled (APIs don't serve HTML)
7. Input validation on `POST /user/login`: `email` must be valid email, `password` non-empty string
8. Input validation on `POST /user/register`: all required fields validated, role must be `student|teacher`
9. Validation errors return 400 with `{ message: "Validation failed", errors: [...] }`
10. Existing mobile API behavior must not change (test with existing mobile flow)

## UI Requirements
N/A — this is a backend-only ticket.

## API Requirements
No new endpoints. Only configuration changes to existing Express app.

## Backend Changes

### Install Dependencies
```bash
npm install helmet express-rate-limit express-validator
```

### Update `app.js`

#### CORS Configuration
```javascript
const cors = require('cors');

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:19000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

#### Helmet
```javascript
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: false,  // Not needed for API-only server
  crossOriginEmbedderPolicy: false,
}));
```

#### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many registration attempts. Please try again later.' },
});

// Apply to specific routes only
app.use(`${api}/user/login`, loginLimiter);
app.use(`${api}/user/register`, registerLimiter);
```

#### Input Validation Middleware
```javascript
// middlewares/validate.middleware.js — enhance existing file
const { validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};
module.exports = { handleValidationErrors };
```

```javascript
// validators/user.validator.js
const { body } = require('express-validator');

const loginValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const registerValidator = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('userCode').trim().notEmpty(),
  body('school').trim().notEmpty(),
  body('role').isIn(['student', 'teacher']).withMessage('Role must be student or teacher'),
];

module.exports = { loginValidator, registerValidator };
```

```javascript
// route/user_route.js — apply validators
const { loginValidator, registerValidator } = require('../validators/user.validator');
const { handleValidationErrors } = require('../middlewares/validate.middleware');

route.post('/login', loginLimiter, loginValidator, handleValidationErrors, userController.login);
route.post('/register', registerLimiter, registerValidator, handleValidationErrors, userController.register);
```

#### New Environment Variables (`.env.local`)
```
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19000
```

### Middleware Order in `app.js`
```javascript
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ ... }));
app.use(morgan('dev'));
app.use(express.json());
app.use(authJwt());
// ... routes
app.use(ErrorHandler);
```

## Acceptance Criteria
- [ ] `POST /api/v1/user/login` from `http://localhost:3000` returns 200 (CORS passes)
- [ ] `POST /api/v1/user/login` from an unlisted origin returns 403 CORS error
- [ ] After 10 login attempts in 15 min from same IP, returns 429 with message
- [ ] `helmet` response headers present: `X-Content-Type-Options`, `X-Frame-Options`, `X-DNS-Prefetch-Control`
- [ ] Login with invalid email format returns 400 with validation error
- [ ] Register with missing `name` field returns 400 with field-specific error
- [ ] Existing mobile app behavior unchanged (test: login, join subject, create attendance)
- [ ] `ALLOWED_ORIGINS` env var controls allowed origins without code change

## Testing Requirements
- **Manual (curl/Postman):**
  - `OPTIONS http://localhost:5000/api/v1/user/login` with `Origin: http://localhost:3000` → verify 204 with CORS headers
  - `OPTIONS` with `Origin: http://evil.com` → verify CORS rejection
  - Send 11 login requests rapidly → verify 429 on 11th
  - Send `POST /user/login` with `email: "notanemail"` → verify 400
- **Integration test:**
  - Write an automated test that sends 10 login requests and verifies the 10th succeeds but the 11th returns 429
- **Regression:**
  - Run existing mobile app against the updated backend — login, subject list, attendance — must all work

## Definition of Done
- CORS allows web origin and rejects unlisted origins
- Rate limiting active on login and register
- `helmet` headers present in all responses
- Input validation rejects malformed login/register requests
- Mobile app unaffected

## Risks / Notes
- `credentials: true` in CORS requires the frontend to also send `credentials: 'include'` in fetch/Axios — ensure WEB-004's Axios client sets `withCredentials: true` when cookies are used
- `express-rate-limit` with in-memory store is fine for single-process deployment; if backend scales to multiple processes, use a Redis store (`rate-limit-redis`)
- The `!origin` bypass is intentional — mobile apps and server-to-server requests have no Origin header
- Do not enable `contentSecurityPolicy` — it's for HTML page serving, not REST APIs
- Test with both HTTP and HTTPS origins in production setup
