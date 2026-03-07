# WEB-031 — Session Review Submission

## Objective
Build the session review (đánh giá buổi học) feature: after a class session ends, students can submit a rating and optional comment about the session. Teachers can view the aggregate reviews and individual feedback for each session.

## Background
Session reviews provide teachers with feedback on class quality. Students rate sessions on a 1-5 star scale and can leave a text comment. This data feeds into the Statistics dashboard (WEB-032). Reviews are submitted anonymously by default.

## Scope
- Student: review submission UI within session detail or via notification prompt
- Student review form: star rating (1-5) + comment (optional)
- Teacher: view aggregate reviews per session (average rating, distribution, comments)
- API: `POST /api/v1/review/create`, `GET /api/v1/review/getBySession`
- One review per student per session
- Review window: available after session ends (backend enforces)

## Out of Scope
- Statistics dashboard aggregation across sessions (WEB-032)
- Notification prompts for review (WEB-033/034)

## Dependencies
- WEB-015 (session list — review access from here)
- WEB-014 (subject shell)
- WEB-004 (API service layer)
- WEB-003 (Button, Textarea, Badge)

## User Flow Context
- Student sees "Đánh giá buổi học" button on completed sessions
- Student rates 1-5 stars + optional comment → submits
- Teacher views session detail → sees review summary

## Functional Requirements

### Student
1. On student sessions list (WEB-015), completed sessions show "Đánh giá" button (if not yet reviewed)
2. "Đã đánh giá" badge if already submitted
3. "Đánh giá" opens a review modal
4. Star rating: 1-5 stars (interactive, hover highlights)
5. Comment: optional textarea (up to 500 chars)
6. Submit: `POST /api/v1/review/create` with `{ sessionId, rating, comment? }`
7. After submission: button becomes "Đã đánh giá" badge
8. Cannot edit after submission (backend enforces)

### Teacher
9. Session detail (WEB-018) shows "Đánh giá" section below attendance
10. Aggregate display: average rating (e.g. ⭐ 4.2 / 5), rating distribution bar chart
11. Total reviews: "X / Y sinh viên đã đánh giá"
12. Individual reviews list: rating + comment (anonymous by default, no names)
13. Fetch: `GET /api/v1/review/getBySession?sessionId=<id>`

## UI Requirements

### Student Review Button (on session row)
```
Not reviewed:  [⭐ Đánh giá — outline small]
Reviewed:      [✓ Đã đánh giá — success-light text-success small]
```

### Review Modal
```
Title: "Đánh giá buổi học"
Subtitle: "[Session Date] — [Subject Name]"

[Star Rating — 5 stars, interactive]
★★★★☆  (hover: highlight up to cursor; click: select)
[Feedback label: "Rất tệ" | "Tệ" | "Bình thường" | "Tốt" | "Xuất sắc"]

[Nhận xét (tùy chọn)]
[Textarea rows=3, placeholder "Chia sẻ cảm nhận của bạn...", max 500 chars]

[Hủy]  [Gửi đánh giá — primary, disabled until star selected]
```

### Teacher Review Summary (Session Detail)
```
[Đánh giá buổi học — section heading]
[28/30 sinh viên đã đánh giá]

[⭐ 4.2 / 5 — large display]

Rating distribution:
5 ★  ████████████████░░  18
4 ★  ██████████░░░░░░░░  10
3 ★  ██░░░░░░░░░░░░░░░░   2
2 ★  ░░░░░░░░░░░░░░░░░░   0
1 ★  ░░░░░░░░░░░░░░░░░░   0

[Nhận xét:]
• "Bài giảng rõ ràng, dễ hiểu..."
• "Tốc độ giảng hơi nhanh..."
```

### Star Rating Component
```tsx
// Interactive star rating
// Props: value (1-5), onChange (optional — read-only if no onChange)
// Hover: fill stars up to hover position with primary color
// Selected: filled primary stars
// Read-only: filled stars (for display in teacher view)
```

## API Requirements

### Submit Review
- `POST /api/v1/review/create`
- Auth: Bearer token
- Body: `{ sessionId: string, rating: number (1-5), comment?: string }`
- Response: `{ review: Review }`
- Error 409: already reviewed this session

### Get Session Reviews (Teacher)
- `GET /api/v1/review/getBySession?sessionId=<id>`
- Auth: Bearer token (teacher only for individual reviews)
- Response: `{ reviews: Review[], averageRating: number, distribution: Record<number, number> }`

## Backend Changes
None.

## Technical Implementation Notes

### StarRating Component
```tsx
interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
}

export function StarRating({ value, onChange, size = 'md', readOnly = false }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const display = readOnly ? value : (hovered || value);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(0)}
        >
          <Star
            className={cn(
              'transition-colors',
              star <= display ? 'fill-yellow-400 text-yellow-400' : 'text-neutral-300',
              size === 'lg' && 'size-8',
              size === 'md' && 'size-6',
              size === 'sm' && 'size-4',
            )}
          />
        </button>
      ))}
    </div>
  );
}
```

### Rating Labels
```typescript
const RATING_LABELS = {
  1: 'Rất tệ',
  2: 'Tệ',
  3: 'Bình thường',
  4: 'Tốt',
  5: 'Xuất sắc',
} as const;
```

### Distribution Bar
```typescript
// Teacher view: percentage bar per star
{[5, 4, 3, 2, 1].map(star => {
  const count = distribution[star] ?? 0;
  const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
  return (
    <div key={star} className="flex items-center gap-2">
      <span className="text-sm w-8">{star} ★</span>
      <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm text-muted w-8 text-right">{count}</span>
    </div>
  );
})}
```

### File Structure
```
src/components/features/reviews/
├── StarRating.tsx
├── ReviewModal.tsx
├── SessionReviewSummary.tsx      # Teacher view
└── ReviewDistributionChart.tsx
```

## Acceptance Criteria
- [ ] Completed sessions show "Đánh giá" button
- [ ] Review modal with 5-star interactive rating
- [ ] Star hover highlights correctly
- [ ] Comment field optional, max 500 chars
- [ ] Submit disabled until star selected
- [ ] After submission, button becomes "Đã đánh giá"
- [ ] Cannot submit twice (409 handled gracefully)
- [ ] Teacher sees average rating and distribution
- [ ] Anonymous comments listed below distribution
- [ ] Read-only star display in teacher view

## Testing Requirements
- **Component tests:**
  - `StarRating`: interactive mode — hover changes display; click calls onChange; read-only shows correct stars
  - `ReviewModal`: submit disabled without rating; calls API with correct payload
  - `SessionReviewSummary`: renders average, distribution bars, comments
- **Manual QA:**
  - Submit review → button changes to "Đã đánh giá"
  - Try submitting again → handled (already reviewed state)
  - Teacher views session → review summary shows with correct average

## Definition of Done
- Student review submission works
- Teacher review summary displays
- StarRating component reusable (used in WEB-032)
- Unit tests pass

## Risks / Notes
- Anonymous reviews: ensure backend does not expose `userId` in the reviews response for the teacher view — or if it does, the frontend should not display student names
- The review window (only after session ends) is enforced by the backend — frontend should check session status and only show the button for completed sessions
