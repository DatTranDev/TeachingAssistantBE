# WEB-007 — Authentication Pages UI

## Objective
Build the complete authentication UI: Login page, Registration page (multi-step), and Forgot Password flow (3 steps: enter email → verify OTP → set new password). These are fully functional forms with validation, loading states, and error feedback — but without live API calls (wired in WEB-008).

## Background
Authentication is the entry point for all users. The UI must be polished, accessible, and validate locally before submitting. Building the UI separately from the API integration (WEB-008) allows UI review and refinement before backend wiring.

## Scope
- `/login` page: email + password form, "Forgot Password" link, "Register" link, Google button (visible but disabled — not implemented)
- `/register` page: multi-step form (Step 1: personal info; Step 2: role selection)
- `/forgot-password` page: email submission form
- `/forgot-password/verify` page: 6-digit OTP input
- `/forgot-password/reset` page: new password + confirm password
- Form validation with React Hook Form + Zod schemas
- Loading state on submit (spinner in button)
- Inline field error messages
- Toast error for server/network errors (scaffolded — actual calls in WEB-008)
- Responsive layout: centered card on all screen sizes
- Accessible form labels, aria attributes, focus management

## Out of Scope
- Actual API calls (WEB-008)
- Session management (WEB-008)
- Route protection (WEB-009)
- Google OAuth implementation (not in MVP scope)

## Dependencies
- WEB-002 (design system)
- WEB-003 (UI components: Button, Input, FormField, Card, Spinner, Toast)

## User Flow Context
- **UF-01 (Login):** User sees `/login`, fills email + password, clicks Login
- **UF-02 (Register):** User sees `/register`, fills 2-step form
- **UF-03 (Forgot Password):** 3-step flow across 3 pages

## Functional Requirements
1. All forms use `react-hook-form` with `zodResolver`
2. Validation is triggered on submit (not on blur, to reduce noise)
3. After submission attempt, errors show inline on blur
4. Email field: `z.string().email('Invalid email')`
5. Password field: `z.string().min(6, 'Password must be at least 6 characters')`
6. Register Step 1: name (required), email (email), password (min 6), userCode (required), school (required)
7. Register Step 2: role selection — two large clickable cards: "Giảng viên" (Teacher) and "Sinh viên" (Student)
8. OTP input: 6 separate single-character inputs that auto-advance on entry and support paste
9. Password visibility toggle on password fields
10. "Remember me" checkbox on login (UX only — stores nothing in this ticket)
11. All forms submit correctly with `onSubmit` handler that receives `values` (called by WEB-008)
12. `isSubmitting` state drives button disabled + spinner

## UI Requirements

### Page Layout (all auth pages)
```
Full-screen: min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light to-white
Centered card: w-full max-w-md bg-surface rounded-2xl shadow-lg p-8
```

### Login Page (`/login`)
```
[Logo + App Name]  — centered, mb-8
[Title: "Chào mừng trở lại" — text-2xl font-bold]
[Subtitle: "Đăng nhập để tiếp tục" — text-sm text-muted]

[Email field — full width]
[Password field — full width with visibility toggle]
["Quên mật khẩu?" — right-aligned link text-sm text-primary]

[Login button — full width, primary, large]

[Divider: "hoặc đăng nhập với"]

[Google button — outline, full width, with Google icon, disabled state with cursor-not-allowed]

["Chưa có tài khoản? Đăng ký" — centered text-sm, "Đăng ký" is primary link]
```

### Register Page (`/register`)
```
Progress indicator: "Bước 1/2" or "Bước 2/2" — top right of card
[Title: "Tạo tài khoản"]

Step 1:
  [Name field]
  [Email field]
  [Password field + visibility toggle]
  [UserCode field — placeholder: "Mã sinh viên / Mã giảng viên"]
  [School field — placeholder: "Tên trường đại học"]
  [Next button: "Tiếp theo →"]

Step 2:
  [Title: "Bạn là?"]
  [Two role cards side by side:]
    Teacher card: graduation cap icon, "Giảng viên", description
    Student card: person icon, "Sinh viên", description
    Selected card: border-2 border-primary bg-primary-light
  [Back button (ghost) + Submit button (primary) in a row]
```

### Forgot Password Flow
```
Page 1 (/forgot-password):
  [Title: "Quên mật khẩu?"]
  [Description: "Nhập email để nhận mã xác thực"]
  [Email field]
  [Send code button]
  [Back to login link]

Page 2 (/forgot-password/verify):
  [Title: "Nhập mã xác thực"]
  [Description: "Mã 6 số đã được gửi đến email@example.com"]
  [6-digit OTP input — 6 separate boxes, auto-focus advances]
  [Verify button]
  [Resend code link — with 60s countdown disabled state]

Page 3 (/forgot-password/reset):
  [Title: "Đặt lại mật khẩu"]
  [New password field + toggle]
  [Confirm password field + toggle]
  [Reset button]
```

### Responsive Behavior
- All pages: card full-width with `px-4` on mobile, `max-w-md` centered on tablet+
- No horizontal scroll
- Keyboard navigation through all inputs in correct tab order

### Loading State
- Button shows `<Spinner className="mr-2" />` + "Đang xử lý..." text when `isSubmitting`
- Button is `disabled` during submit
- Entire form is not disabled — only the button (better UX than freezing the form)

### Error States
- Field errors: `text-sm text-danger mt-1` below the field
- Server errors: `toast.error(message)` (the call site is mocked in this ticket; wired in WEB-008)

## API Requirements
No live API calls in this ticket. Form handlers receive `values` and call a stub:
```typescript
const onSubmit = async (values: LoginFormValues) => {
  // TODO (WEB-008): call authApi.login(values)
  console.log('Submit:', values);
};
```

## Backend Changes
None.

## Technical Implementation Notes

### Install Dependencies
```bash
npm install react-hook-form @hookform/resolvers zod
```

### Zod Schemas (`src/lib/validations/auth.ts`)
```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

export const registerStep1Schema = z.object({
  name: z.string().min(1, 'Tên là bắt buộc'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  userCode: z.string().min(1, 'Mã số là bắt buộc'),
  school: z.string().min(1, 'Tên trường là bắt buộc'),
});

export const registerStep2Schema = z.object({
  role: z.enum(['student', 'teacher'], { required_error: 'Vui lòng chọn vai trò' }),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});
```

### File Structure
```
src/app/(auth)/
├── layout.tsx                  # Auth layout (no sidebar, gradient bg)
├── login/
│   └── page.tsx
├── register/
│   └── page.tsx                # Manages step state
└── forgot-password/
    ├── page.tsx                # Step 1: email
    ├── verify/
    │   └── page.tsx            # Step 2: OTP
    └── reset/
        └── page.tsx            # Step 3: new password
```

### OTP Input Component
```tsx
// src/components/ui/otp-input.tsx
// 6 individual <input maxLength={1}> elements
// Auto-advance focus on character entry
// On backspace: clear current, move to previous
// Supports paste: distribute characters across inputs
// Exposes: value (6-char string), onChange(value: string)
```

### Role Card Component
```tsx
interface RoleCardProps {
  role: 'student' | 'teacher';
  selected: boolean;
  onClick: () => void;
}
// Large clickable card with icon, title, description
// Selected: border-primary bg-primary-light
// Hover: border-primary/50
```

### Auth Layout
```tsx
// src/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-white to-blue-50 p-4">
      {children}
    </div>
  );
}
```

## Acceptance Criteria
- [ ] Login page renders with email, password fields and login button
- [ ] Submitting login with invalid email shows "Email không hợp lệ" inline
- [ ] Submitting with empty password shows error
- [ ] Button shows spinner + disabled during submit
- [ ] Register step 1 renders all 5 fields; "Tiếp theo" validates before advancing
- [ ] Register step 2 shows two role cards; selecting one highlights it; form can be submitted
- [ ] Forgot password: 3-page flow navigates correctly (using URL params or local state for email persistence)
- [ ] OTP input: typing auto-advances; backspace goes back; paste fills all 6 boxes
- [ ] Password field visibility toggle works
- [ ] All pages are responsive (test at 375px, 768px, 1280px)
- [ ] All form inputs have associated `<label>` elements

## Testing Requirements
- **Component tests (RTL):**
  - Login form: renders, shows validation errors, calls onSubmit with correct values
  - Register: Step 1 validation, step 2 role selection
  - OTP input: auto-advance, backspace behavior, paste
  - Role card: selected/unselected state
- **Manual QA:**
  - Test at 375px (iPhone SE), 768px (iPad), 1440px (desktop)
  - Test keyboard navigation: Tab through all fields in order
  - Test password visibility toggle
  - Test OTP paste with a 6-digit string

## Definition of Done
- All auth pages render without errors
- Form validation works client-side
- Submit handlers call stub functions with correct typed values
- No TypeScript errors
- RTL tests pass

## Risks / Notes
- Store the email entered in Step 1 of forgot-password in URL query param or `sessionStorage` so it persists to `/verify` without a global store
- The Google OAuth button should be present but with `disabled` attribute and a tooltip "Sắp ra mắt" — do not implement OAuth
- Register page manages step state with `useState` — no router navigation between steps (single page, multi-step)
- Vietnamese text is used throughout — define all Vietnamese strings as constants in `src/constants/text.ts` for easy future translation
