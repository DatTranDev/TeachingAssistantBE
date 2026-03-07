# WEB-035 — User Profile Page

## Objective
Build the user profile page: display and allow editing of the user's personal information (name, school, user code), avatar upload, and password change. Accessible from the user menu dropdown in the app shell.

## Background
Users need to view and update their profile information. The profile page covers display name, school affiliation, avatar, and password management. This is a standard settings page — straightforward but important for user trust.

## Scope
- `/teacher/profile` and `/student/profile` — profile pages (or a shared `/profile` route)
- Display: name, email (read-only), userCode, school, role badge, avatar
- Edit: name, school (email and role are immutable)
- Avatar upload: `POST /api/v1/firebase/upload`
- Password change: `PATCH /api/v1/user/changepassword` (requires current password)
- API: `PATCH /api/v1/user/update`

## Out of Scope
- Google OAuth profile sync
- Account deletion
- Two-factor authentication

## Dependencies
- WEB-008 (auth store — user data)
- WEB-004 (API service layer)
- WEB-003 (Avatar, Input, Button, Card)

## User Flow Context
1. User clicks avatar in sidebar/topbar → dropdown → "Hồ sơ"
2. Profile page shows current info
3. User edits name → clicks save → info updates in Zustand store
4. User uploads avatar → preview shown → saved
5. User clicks "Đổi mật khẩu" → password change form appears

## Functional Requirements
1. Profile data displayed from Zustand `useAuth().user`
2. Editable fields: `name`, `school`; non-editable: `email`, `role`, `userCode`
3. Save changes: `PATCH /api/v1/user/update` → update Zustand store on success
4. Avatar upload: click avatar → file input opens → preview → save with upload
5. Avatar file requirements: JPG/PNG, max 5MB; cropped to square automatically (optional)
6. Password change form (collapsible section):
   - Current password, new password (min 6), confirm new password
   - `PATCH /api/v1/user/changepassword`
   - On success: toast "Đổi mật khẩu thành công"; form resets
   - On 401 (wrong current password): inline error "Mật khẩu hiện tại không đúng"
7. Role badge: "Giảng viên" or "Sinh viên" (non-editable, visual only)
8. Display email with "(không thể thay đổi)" label

## UI Requirements

### Profile Page Layout
```
[← Quay lại]

[Avatar Section]
┌────────────────────────────────────────┐
│  [Avatar 96px]  [Thay ảnh — ghost btn]│
│  [Name — text-xl]  [Role badge]       │
│  [Email — text-muted]                 │
└────────────────────────────────────────┘

[Thông tin cá nhân — section card]
  [Họ và tên *]      [Input — editable]
  [Email]            [Input — disabled]
  [Mã sinh viên/GV]  [Input — disabled]
  [Trường]           [Input — editable]

  [Lưu thay đổi — primary]

[Bảo mật — section card]
  [Đổi mật khẩu — expand toggle]
  → Expands to:
    [Mật khẩu hiện tại]   [Input type=password]
    [Mật khẩu mới *]      [Input type=password, min 6]
    [Xác nhận mật khẩu *] [Input type=password]
    [Đổi mật khẩu — primary]
```

### Avatar Upload
```
Avatar has overlay on hover:
[Camera icon] "Thay ảnh"

Click → opens native file picker (image/*)
On select → show preview in avatar circle
Separate "Lưu ảnh" button or auto-save
```

### Role Badge
```
Giảng viên: bg-primary text-white rounded-full px-2 py-0.5 text-xs
Sinh viên:  bg-success text-white rounded-full px-2 py-0.5 text-xs
```

## API Requirements

### Update User Info
- `PATCH /api/v1/user/update`
- Auth: Bearer token
- Body: `{ name?, school?, avatar? }`
- Response: `{ user: User }` — updated user

### Change Password
- `PATCH /api/v1/user/changepassword`
- Auth: Bearer token
- Body: `{ currentPassword: string, password: string }`
- Response: 200 on success, 401 on wrong current password

### Upload Avatar
- `POST /api/v1/firebase/upload` (reuse from WEB-022)
- Body: FormData with `file`
- Response: `{ url: string }`

## Backend Changes
None.

## Technical Implementation Notes

### Zustand Store Update After Profile Save
```typescript
const updateMutation = useMutation({
  mutationFn: (data: UpdateUserPayload) => userApi.update(data),
  onSuccess: (updatedUser) => {
    useAuthStore.getState().setAuth(updatedUser, useAuthStore.getState().accessToken!);
    toast.success('Đã lưu thay đổi');
  },
});
```

### Password Change Schema
```typescript
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Nhập mật khẩu hiện tại'),
  newPassword: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});
```

### Avatar Upload + Preview
```typescript
const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

const handleAvatarChange = (file: File) => {
  const objectUrl = URL.createObjectURL(file);
  setAvatarPreview(objectUrl);
  setAvatarFile(file);
};

// Cleanup on unmount
useEffect(() => {
  return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); };
}, [avatarPreview]);
```

### File Structure
```
src/app/(dashboard)/
├── teacher/profile/page.tsx   # Or redirect to shared /profile
└── student/profile/page.tsx

src/components/features/profile/
├── ProfileInfoForm.tsx
├── AvatarUpload.tsx
├── ChangePasswordForm.tsx
└── RoleBadge.tsx
```

## Acceptance Criteria
- [ ] Profile page shows all current user info
- [ ] Name and school are editable and save correctly
- [ ] Email, userCode, role are read-only
- [ ] Avatar upload shows preview before saving
- [ ] Saved avatar updates in sidebar/topbar
- [ ] Password change works with correct current password
- [ ] Wrong current password shows inline error
- [ ] Password mismatch shows validation error
- [ ] Success toasts after each action
- [ ] Role badge displays correctly for both roles

## Testing Requirements
- **Component tests:**
  - `ProfileInfoForm`: pre-populated from user prop; validates; calls mutation
  - `ChangePasswordForm`: validates all fields; 401 shows inline error
  - `AvatarUpload`: creates preview URL; accepts only images
- **Manual QA:**
  - Update name → save → sidebar shows new name
  - Upload avatar → see preview → save → avatar updates throughout app
  - Wrong current password → inline error shown
  - New password < 6 chars → validation error

## Definition of Done
- Profile info editable and persisted
- Avatar upload works
- Password change works
- Auth store updated after profile changes
- Unit tests pass

## Risks / Notes
- Avatar update should also update the Zustand `user` object so all components using `user.avatar` (sidebar, topbar) reflect the change immediately
- The `PATCH /user/update` and `PATCH /user/changepassword` may be the same endpoint or different — check `user_route.js`
- Avatar URL from Firebase Storage should be stored in `user.avatar` field in the database — verify this field exists in the User model
