# WEB-032 — Statistics & Analytics Dashboard

## Objective
Build the Statistics/Analytics dashboard for both roles: teachers see subject-level analytics (attendance rates, session ratings, student engagement), students see their personal performance across all subjects (attendance record, rating history). Presented with charts and summary cards.

## Background
Analytics help teachers identify at-risk students (low attendance) and evaluate class quality (low ratings). Students can track their own academic standing. This is a read-only aggregation view over existing data.

## Scope
- Teacher analytics: per-subject attendance rates, session review averages, absent warning count
- Student analytics: personal attendance rate per subject, overall standing
- Charts: attendance rate over time (line), rating distribution (bar), per-student attendance (bar)
- Route: `/teacher/timetable` or dedicated `/teacher/analytics` + `/student/analytics`
- API: aggregate data from existing endpoints or dedicated stats endpoint

## Out of Scope
- Attendance management (WEB-018/021)
- Reviews submission (WEB-031)
- Excel export (WEB-017)

## Dependencies
- WEB-017 (student list data model)
- WEB-031 (reviews data model)
- WEB-004 (API service layer)
- WEB-003 (Card, Badge, Skeleton)
- Chart library: `recharts` or `chart.js`

## User Flow Context
- Teacher clicks "Thống kê" nav item → sees cross-subject dashboard
- OR: teacher opens subject → sees stats for that subject
- Student opens stats → sees own attendance rates

## Functional Requirements

### Teacher — Subject Stats (within subject detail or standalone page)
1. Overall attendance rate for the subject: `(total CM records) / (total possible records) * 100`
2. Session-by-session attendance trend (line chart): x = session date, y = % attendance
3. Average session rating over time (line chart): x = session date, y = average rating
4. At-risk students count: students with `kpCount >= absentLimit`
5. Student attendance leaderboard: top 5 most absent (WEB-017 data)
6. API: `GET /api/v1/subject/getStats?subjectId=<id>` (if exists) or compute from existing data

### Student — Personal Stats
7. Overall attendance rate per subject (% of sessions attended)
8. Subject list with attendance percentage + color indicator (green ≥80%, yellow 60-79%, red <60%)
9. Total sessions attended vs total sessions
10. History: per-subject absent count vs allowed absent count

## UI Requirements

### Teacher Subject Stats (Embedded in Subject Detail — new "Thống kê" tab or section)
```
[Summary Cards Row:]
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Tỉ lệ điểm  │ │ Trung bình  │ │ Sinh viên   │ │ Tổng buổi  │
│ danh         │ │ đánh giá    │ │ có nguy cơ  │ │ học         │
│ 87%          │ │ ⭐ 4.2       │ │ 3           │ │ 15          │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

[Tỉ lệ điểm danh theo buổi — Line Chart]
x-axis: session dates
y-axis: 0-100%
line: attendance rate per session

[Đánh giá trung bình theo buổi — Line Chart]
x-axis: session dates
y-axis: 1-5

[Sinh viên có nguy cơ — Table]
Top students by absent count (reuse from WEB-017)
```

### Student Personal Stats
```
[My Stats: Thống kê của tôi]

[Total Attendance Rate — large number: 85%]
[X / Y buổi học có mặt]

[Per-subject breakdown:]
┌─────────────────────────────────────────────────────────────┐
│ [Subject Name]          [████████░░ 80%]  8/10 buổi   [🟡] │
│ [Subject Name]          [██████████ 100%] 5/5 buổi    [🟢] │
│ [Subject Name]          [████░░░░░░ 40%]  2/5 buổi    [🔴] │
└─────────────────────────────────────────────────────────────┘
```

### Chart Colors
```
Attendance line: primary blue (#2563EB)
Rating line: yellow (#D97706)
Area fill: primary with 10% opacity
Grid: neutral-100
```

## API Requirements

### Teacher Subject Stats
- `GET /api/v1/subject/getStats?subjectId=<id>` (if available)
- Alt: compute from `GET /api/v1/cAttend/getAll` + `GET /api/v1/attendRecord/getSummary`
- Alt: `GET /api/v1/review/getBySubject?subjectId=<id>` for ratings

### Student Personal Stats
- Computed from: `GET /api/v1/subject/getAllJoined` + `GET /api/v1/attendRecord/getByStudent`
- No dedicated stats endpoint required

## Backend Changes
None (compute from existing endpoints; WEB-037 adds dedicated stats endpoint if needed).

## Technical Implementation Notes

### Install Recharts
```bash
npm install recharts
```
Use Recharts for charts — it's React-native, tree-shakeable, and works with TypeScript.

### Attendance Rate Calculation
```typescript
function calculateAttendanceRate(sessions: ClassSession[], records: AttendRecord[], userId: string): number {
  const totalSessions = sessions.filter(s => s.status === 'completed').length;
  if (totalSessions === 0) return 100;

  const presentCount = records.filter(r =>
    r.userId === userId && (r.status === 'CM' || r.status === 'CP')
  ).length;

  return Math.round((presentCount / totalSessions) * 100);
}
```

### Session Attendance Trend (for chart)
```typescript
function getSessionTrend(sessions: ClassSession[], records: AttendRecord[], totalStudents: number) {
  return sessions
    .filter(s => s.status === 'completed')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(session => {
      const presentCount = records.filter(r =>
        r.cAttendId === session._id && (r.status === 'CM' || r.status === 'CP')
      ).length;
      return {
        date: format(new Date(session.date), 'dd/MM', { locale: vi }),
        rate: Math.round((presentCount / totalStudents) * 100),
      };
    });
}
```

### Recharts Line Chart
```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={200}>
  <LineChart data={trendData}>
    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
    <Tooltip formatter={(v) => `${v}%`} />
    <Line
      type="monotone"
      dataKey="rate"
      stroke="#2563EB"
      strokeWidth={2}
      dot={{ r: 3 }}
      activeDot={{ r: 5 }}
    />
  </LineChart>
</ResponsiveContainer>
```

### File Structure
```
src/app/(dashboard)/
├── teacher/classes/[subjectId]/stats/page.tsx   # Subject-level stats
└── student/stats/page.tsx                       # Personal stats

src/components/features/stats/
├── StatSummaryCard.tsx
├── AttendanceTrendChart.tsx
├── RatingTrendChart.tsx
├── StudentAttendanceBreakdown.tsx    # Student personal view
└── AtRiskStudentsList.tsx
```

## Acceptance Criteria
- [ ] Teacher subject stats page shows overall attendance rate
- [ ] Attendance trend line chart renders per session
- [ ] Rating trend line chart renders per session
- [ ] At-risk students count (>= absentLimit) shown
- [ ] Student stats page shows per-subject attendance rates
- [ ] Color indicators (green/yellow/red) based on attendance percentage
- [ ] Charts render on mobile (responsive container)
- [ ] Loading skeletons while data fetches
- [ ] Empty/zero state when no sessions exist

## Testing Requirements
- **Component tests:**
  - `calculateAttendanceRate()`: edge cases — 0 sessions, 100% present, 0% present
  - `getSessionTrend()`: correctly maps sessions to chart data points
  - `StatSummaryCard`: renders label and value
- **Manual QA:**
  - Teacher with 5+ sessions → verify chart shows correct data points
  - Student with 40% attendance in one subject → verify red indicator
  - No sessions: verify empty state, not crash

## Definition of Done
- Teacher subject stats render with charts
- Student personal stats render
- Calculations are correct
- Charts are responsive
- Unit tests pass

## Risks / Notes
- Recharts adds ~50KB gzipped — use tree-shaking by importing only needed components
- If backend doesn't have aggregate endpoints, all aggregation happens client-side from raw data — this may cause slow loading for large datasets; consider backend aggregation in WEB-037
- `date-fns` format function needed for x-axis labels — already added in WEB-026; reuse
