

# Plan: Add 4 Features to GATE CS 2027 Tracker

## Overview
Adding Authentication + Cloud Sync, Notes/Resources per Topic, Daily Streak Calendar, and Difficulty Tags.

---

## Feature 1: Authentication + Cloud Sync

**Database tables** (via migration):
- `profiles` — id (uuid, references auth.users), display_name (text), created_at
- `tracker_data` — id (uuid), user_id (uuid, references profiles), data (jsonb), updated_at (with upsert on user_id)
- RLS policies: users can only read/write their own rows

**Auth setup**:
- Configure auto-confirm OFF, enable Google auth
- Create login/signup page at `/auth` with email + Google sign-in
- Add auth context provider wrapping the app
- Protected route: redirect to `/auth` if not logged in

**Sync logic**:
- On login, load `tracker_data` from database into state (merge with any localStorage data on first sync)
- On state change, debounce-save to database (replace localStorage as primary store)
- Keep localStorage as offline fallback

**Files**: New `src/pages/Auth.tsx`, new `src/components/AuthProvider.tsx`, update `src/App.tsx` routes, update `src/pages/Index.tsx` to use cloud save, update `src/lib/trackerStore.ts` with cloud sync functions.

---

## Feature 2: Notes / Resources per Topic

**Data model** — Add to `TrackerState`:
```
topicNotes: Record<string, { text: string; links: string[] }>
// key: `${subjectId}|${topicId}`
```

**UI** — In `SubjectChecklist.tsx` (and Revision/PYQ sections), add a small notes icon next to each topic. Clicking opens a popover/dialog to:
- Add/edit a text note
- Add resource links (auto-detect YouTube, PDF, article)
- Display link count badge on the icon

**Files**: Update `src/lib/trackerStore.ts`, update `src/components/SubjectChecklist.tsx`, create `src/components/TopicNotesDialog.tsx`.

---

## Feature 3: Daily Streak & Streak Calendar

**Data model** — Derive from existing `checklist` data (completedAt dates). No new storage needed.

**UI** — New component showing:
- Current streak count (consecutive days with at least 1 completion)
- Longest streak
- GitHub-style heatmap grid (last 3-4 months) colored by daily topic completion count
- Per-member view using member selector

**Files**: New `src/components/StreakCalendar.tsx`, add as a new tab or section in Dashboard.

---

## Feature 4: Difficulty Tags on Topics

**Data model** — Add to `TrackerState`:
```
topicDifficulty: Record<string, "easy" | "medium" | "hard">
// key: `${subjectId}|${topicId}`
```

**UI** — In `SubjectChecklist.tsx`, add a small colored badge next to each topic:
- Click to cycle: unset → Easy (green) → Medium (yellow) → Hard (red) → unset
- Dashboard shows difficulty distribution summary
- Filter topics by difficulty in checklist view

**Files**: Update `src/lib/trackerStore.ts`, update `src/components/SubjectChecklist.tsx`, update `src/components/OverallDashboard.tsx`.

---

## Implementation Order
1. **Auth + Cloud Sync** (foundation — everything else syncs through this)
2. **Difficulty Tags** (small data model change, quick)
3. **Notes / Resources** (new dialog component)
4. **Streak Calendar** (read-only derived view, no data model change)

All synced data flows through the single `tracker_data` jsonb column, keeping the migration simple.

