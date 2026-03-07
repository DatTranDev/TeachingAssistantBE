# WEB-002 — Design System & Tailwind Configuration

## Objective
Establish the complete design system: color palette, typography scale, spacing tokens, Tailwind extended configuration, global CSS, and shadcn/ui initialization. This is the visual foundation all components and pages build upon.

## Background
Without a consistent design system, every ticket author makes independent color and spacing decisions, producing an inconsistent UI. This ticket defines the single source of truth for all visual tokens and ensures the web app visually aligns with the existing mobile app's blue-primary identity.

## Scope
- Extend `tailwind.config.ts` with custom color tokens, font family, border radius, box shadow
- Configure `globals.css` with CSS custom properties and base layer styles
- Install and initialize **shadcn/ui** (component scaffolding only, not components)
- Configure Inter font via `next/font/google`
- Define reusable Tailwind class compositions via CSS layer
- Document the design system in `src/lib/design-system.md`
- Create `src/constants/colors.ts` and `src/constants/typography.ts` as TypeScript constants for programmatic access

## Out of Scope
- Any UI components (WEB-003)
- Any page implementations
- Dark mode (not required for MVP)

## Dependencies
- WEB-001

## User Flow Context
No direct user flow. Provides the visual language for all flows.

## Functional Requirements
1. Tailwind `theme.extend` includes all brand colors as named tokens
2. Custom `fontFamily.sans` set to Inter
3. Tailwind `borderRadius` extended with app-specific values
4. shadcn/ui configured with the project's color system (CSS variable strategy)
5. `globals.css` uses `@layer base` to set body defaults
6. All custom colors accessible via Tailwind class names (e.g., `bg-primary`, `text-muted`)
7. CSS custom properties define root theme variables consumable by both Tailwind and plain CSS

## UI Requirements

### Color Tokens
```typescript
// tailwind.config.ts — theme.extend.colors
colors: {
  primary: {
    DEFAULT:  '#2563EB',
    dark:     '#1D4ED8',
    light:    '#EFF6FF',
    foreground: '#FFFFFF',
  },
  success: {
    DEFAULT:  '#16A34A',
    light:    '#F0FDF4',
    foreground: '#FFFFFF',
  },
  warning: {
    DEFAULT:  '#D97706',
    light:    '#FFFBEB',
    foreground: '#FFFFFF',
  },
  danger: {
    DEFAULT:  '#DC2626',
    light:    '#FEF2F2',
    foreground: '#FFFFFF',
  },
  muted: {
    DEFAULT:  '#6B7280',
    foreground: '#9CA3AF',
  },
  border:   '#E5E7EB',
  input:    '#F3F4F6',
  ring:     '#2563EB',
  background: '#F9FAFB',
  surface:    '#FFFFFF',
}
```

### Typography Scale
- `font-sans`: Inter variable font
- Heading: `text-2xl font-bold` (page titles), `text-xl font-semibold` (section heads), `text-lg font-semibold` (card titles)
- Body: `text-base font-normal` (default), `text-sm` (secondary), `text-xs` (captions/badges)

### Spacing & Radius
```
rounded-sm:  4px   (badges, chips)
rounded-md:  6px   (inputs, buttons)
rounded-lg:  8px   (cards, panels)
rounded-xl:  12px  (modals)
rounded-2xl: 16px  (feature panels)
rounded-full        (avatars, indicators)
```

### Shadow Tokens
```
shadow-xs: 0 1px 2px rgba(0,0,0,0.05)      (subtle card border)
shadow-sm: 0 1px 3px rgba(0,0,0,0.1)       (card elevation)
shadow-md: 0 4px 6px rgba(0,0,0,0.07)      (modals, popovers)
shadow-lg: 0 10px 15px rgba(0,0,0,0.1)     (dropdowns)
```

### CSS Custom Properties (`globals.css`)
```css
:root {
  --primary: 37 99% 235%;       /* HSL for shadcn/ui compatibility */
  --primary-foreground: 0 0% 100%;
  --background: 210 20% 98%;
  --foreground: 222 47% 11%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --border: 214 32% 91%;
  --input: 214 32% 91%;
  --ring: 221 83% 53%;
  --radius: 0.5rem;
}
```

## API Requirements
None.

## Backend Changes
None.

## Technical Implementation Notes

### Install shadcn/ui
```bash
npx shadcn@latest init
```
Choose: New York style, CSS Variables strategy, no default components yet (add per-ticket).

### `tailwind.config.ts` structure
```typescript
import type { Config } from 'tailwindcss';
import { fontFamily } from 'tailwindcss/defaultTheme';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { /* tokens above */ },
      fontFamily: {
        sans: ['var(--font-inter)', ...fontFamily.sans],
      },
      boxShadow: { /* custom shadows */ },
      borderRadius: { /* custom radii */ },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-in': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-in': 'slide-in 200ms ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### Font Setup (`src/app/layout.tsx`)
```tsx
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
// Apply: <html className={inter.variable}>
```

### Design System Documentation
Create `src/lib/design-system.md` documenting:
- Color usage guidelines (when to use primary vs danger vs muted)
- Typography usage per context
- Component composition rules
- Spacing philosophy (use multiples of 4px)

### TypeScript Color Constants
```typescript
// src/constants/colors.ts
export const COLORS = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  muted: '#6B7280',
} as const;
```

## Acceptance Criteria
- [ ] `bg-primary` renders `#2563EB`
- [ ] `text-muted` renders `#6B7280`
- [ ] Inter font loads via `next/font` (check Network tab — no external font request failure)
- [ ] `npx shadcn@latest add button` works without config errors
- [ ] All color tokens are documented in `design-system.md`
- [ ] `tailwind.config.ts` has no TypeScript errors
- [ ] `globals.css` has valid CSS variables matching the Tailwind token map
- [ ] Custom keyframe animations (`fade-in`, `slide-in`) are usable via `animate-*` classes

## Testing Requirements
- **Manual:** Apply `bg-primary text-primary-foreground` to a `<div>` — verify blue background with white text
- **Manual:** Apply `rounded-lg shadow-sm` to a `<div>` — verify correct radius and shadow
- **Manual:** Verify Inter font loads correctly in browser DevTools
- **Visual regression (optional):** Screenshot baseline of a styled div for future comparison

## Definition of Done
- `tailwind.config.ts` and `globals.css` are complete and consistent
- shadcn/ui is initialized without errors
- Design tokens are documented
- Font is loading via `next/font`

## Risks / Notes
- shadcn/ui uses CSS variables with HSL format — ensure the Tailwind `colors` config uses `hsl(var(--primary))` pattern for shadcn compatibility
- `tailwindcss-animate` must be installed separately: `npm install tailwindcss-animate`
- Avoid using `@apply` excessively in `globals.css` — prefer utility classes in JSX for maintainability
