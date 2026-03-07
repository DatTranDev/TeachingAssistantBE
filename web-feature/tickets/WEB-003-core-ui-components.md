# WEB-003 — Core Reusable UI Components

## Objective
Build the complete set of primitive UI components used across every feature: Button, Input, Card, Badge, Modal/Dialog, Toast/Notification, Loading states (Spinner + Skeleton), Empty State, Avatar, and data display primitives. These must be accessible, typed, and composable.

## Background
Every subsequent feature ticket uses these primitives. Building them here prevents duplication, ensures visual consistency, and avoids each ticket implementing its own ad-hoc button or modal. Built on shadcn/ui as the base with project-specific customizations layered on top.

## Scope
- **Form primitives:** Button (all variants), Input, Textarea, Select, Checkbox, Switch, Label, FormField wrapper
- **Feedback primitives:** Toast (via `sonner`), Alert, Badge
- **Layout primitives:** Card, Separator, ScrollArea
- **Overlay primitives:** Modal/Dialog, Sheet (slide-over), Popover, DropdownMenu
- **Data display primitives:** Avatar, Table (thead/tbody/tr/td), DataTable wrapper with sort headers
- **Loading states:** Spinner, Skeleton, SkeletonCard, SkeletonTable
- **Empty state component:** with icon, title, description, optional CTA button
- **Error boundary component:** catches render errors, shows fallback
- **Confirmation dialog:** reusable "Are you sure?" pattern
- **File upload:** drag-and-drop area with preview strip
- **Status badge:** semantic colored badges for domain statuses (present/absent/pending/approved/rejected)

## Out of Scope
- Feature-specific components (e.g., attendance table, group card)
- Page layouts (WEB-010)
- Charts (WEB-032)

## Dependencies
- WEB-001, WEB-002

## User Flow Context
These primitives appear in every user flow. They are infrastructure, not feature-specific.

## Functional Requirements
1. All components accept `className` prop for extension via `cn()` utility (from `clsx` + `tailwind-merge`)
2. All interactive components are keyboard accessible (Enter/Space activation, Escape close)
3. All form inputs support `react-hook-form` `register` and `Controller` patterns
4. Button has variants: `default`, `destructive`, `outline`, `ghost`, `link` and sizes: `sm`, `md`, `lg`, `icon`
5. Modal/Dialog is focus-trapped and closes on Escape
6. Toast system is global (accessible via `toast()` call from any component)
7. Skeleton components match the layout of their real content counterparts
8. StatusBadge maps domain strings to visual styles: `CP → green`, `KP → red`, `CM → amber`, `pending → yellow`, `approved → green`, `rejected → red`
9. FileUpload component handles single and multiple files, shows file name/size, invokes `onChange` with `File[]`
10. DataTable component accepts `columns` config and `data` array, handles empty state internally

## UI Requirements

### Button Variants
```
default:     bg-primary text-white hover:bg-primary-dark
destructive: bg-danger text-white hover:bg-red-700
outline:     border border-border bg-surface hover:bg-neutral-100
ghost:       no border/bg, hover:bg-neutral-100
link:        text-primary underline-offset-4 hover:underline
```

### Input
```
base: w-full rounded-md border border-border bg-surface px-3 py-2 text-sm
      placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
error: border-danger focus-visible:ring-danger
```

### Badge / StatusBadge
```
base: inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
variants: success (bg-success-light text-success), warning (...), danger (...), neutral (...)
```

### Card
```
base: rounded-lg border border-border bg-surface shadow-sm
CardHeader: p-6 pb-4
CardTitle: text-lg font-semibold
CardContent: px-6 pb-6
CardFooter: px-6 pb-6 pt-0 flex items-center
```

### Empty State
```
centered column layout:
  [icon: 48px, muted color]
  [title: text-base font-semibold]
  [description: text-sm text-muted]
  [optional CTA button: mt-4]
```

### Skeleton
```
base: animate-pulse rounded bg-neutral-200
SkeletonCard: full card with header/body lines
SkeletonTable: header row + 5 body rows
```

### Modal
```
overlay: fixed inset-0 bg-black/50 z-50 animate-fade-in
content: fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
         w-full max-w-md rounded-xl bg-surface shadow-lg p-6
```

### Sheet (slide-over)
```
overlay: fixed inset-0 bg-black/40 z-40
panel: fixed right-0 top-0 h-full w-full max-w-lg bg-surface shadow-lg
       slide in from right with animation
```

## API Requirements
None. Components are presentational with no direct API calls.

## Backend Changes
None.

## Technical Implementation Notes

### Setup
```bash
# Install shadcn/ui components as base
npx shadcn@latest add button input textarea select checkbox switch label
npx shadcn@latest add dialog sheet popover dropdown-menu
npx shadcn@latest add card badge separator scroll-area avatar table
npx shadcn@latest add toast
npm install sonner          # better toast library
npm install clsx tailwind-merge
```

### Utility Function
```typescript
// src/lib/utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Component File Structure
```
src/components/ui/
├── button.tsx
├── input.tsx
├── textarea.tsx
├── select.tsx
├── checkbox.tsx
├── switch.tsx
├── label.tsx
├── form-field.tsx         # label + input + error message wrapper
├── card.tsx
├── badge.tsx
├── status-badge.tsx       # domain-aware badge
├── modal.tsx              # re-export of shadcn Dialog with project defaults
├── sheet.tsx              # slide-over panel
├── popover.tsx
├── dropdown-menu.tsx
├── avatar.tsx
├── table.tsx
├── data-table.tsx         # sortable table wrapper
├── separator.tsx
├── scroll-area.tsx
├── spinner.tsx            # animated spinner
├── skeleton.tsx           # base skeleton + compound variants
├── empty-state.tsx
├── error-boundary.tsx     # class component
├── confirm-dialog.tsx     # "are you sure" pattern
├── file-upload.tsx
├── toast.tsx              # sonner config + toast() wrapper
└── index.ts               # barrel export
```

### DataTable Example
```typescript
interface Column<T> {
  key: keyof T;
  header: string;
  cell?: (value: T[keyof T], row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
}
```

### FormField Wrapper
```tsx
interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}
// Renders: Label → children (Input etc.) → error message in red text-sm
```

### Toast Configuration (root layout)
```tsx
import { Toaster } from 'sonner';
// In layout.tsx:
<Toaster position="top-right" richColors closeButton />
```

### Error Boundary
```tsx
class ErrorBoundary extends React.Component {
  // catches render errors, renders fallback Card with error message and "Reload" button
}
```

## Acceptance Criteria
- [ ] Button renders all 5 variants + 3 sizes with correct styles
- [ ] Input shows error state when `error` prop is passed
- [ ] Modal is focus-trapped; closes on Escape; closes on overlay click
- [ ] Sheet slides in from the right with animation
- [ ] Toast fires globally via `toast.success()` / `toast.error()`
- [ ] Spinner animates correctly
- [ ] Skeleton has `animate-pulse` animation
- [ ] EmptyState renders icon + title + description + optional button
- [ ] StatusBadge maps `CP` → green, `KP` → red, `CM` → amber
- [ ] FileUpload fires `onChange` with selected files; shows file name list
- [ ] DataTable shows skeleton rows when `isLoading=true`; shows EmptyState when `data=[]`
- [ ] All components export from `src/components/ui/index.ts`
- [ ] All interactive elements pass keyboard accessibility (Tab focus, Enter/Space activation)

## Testing Requirements
- **Component tests (Vitest + RTL):**
  - Button: renders all variants, fires onClick, shows disabled state
  - Input: renders with error class when error prop provided
  - Modal: opens/closes; focus trap works; Escape closes
  - StatusBadge: maps all domain strings to correct color classes
  - EmptyState: renders title and optional button
  - DataTable: shows skeleton, shows empty state, renders data rows
- **Manual QA:**
  - Tab through all form components in sequence — focus order must be logical
  - Verify spinner is smooth (no jank)
  - Verify toast stacks correctly for multiple simultaneous toasts

## Definition of Done
- All listed components exist in `src/components/ui/`
- All components export from the barrel `index.ts`
- All Vitest component tests pass
- Keyboard navigation works throughout
- No TypeScript errors

## Risks / Notes
- shadcn/ui components are generated into `src/components/ui/` and can be customized freely — do not import from `shadcn` at runtime
- `sonner` is preferred over shadcn's built-in `toast` for better UX
- `file-upload.tsx` should NOT handle the actual upload API call — it only provides the `File[]` object to the parent; upload logic lives in feature components
- `tailwind-merge` prevents Tailwind class conflicts when extending via `className` — always use `cn()` in `className` props
