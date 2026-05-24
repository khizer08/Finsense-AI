# FinSense AI Project Status

Last updated: 2026-05-24

This file is the living status document for the FinSense AI MVP. Keep the README focused on how to run the project; keep implementation progress and next steps here.

## Product Goal

FinSense AI should behave like an intelligent financial memory assistant:

```text
Calls
-> voice summaries
-> AI transcription and extraction
-> task tracking
-> reminders
-> financial timeline
```

## Current Architecture Direction

- React Native CLI Android app remains the mobile client.
- Node.js/Express remains the backend API.
- MongoDB/Mongoose remains the persistence layer.
- JWT authentication remains unchanged.
- Whisper is being merged directly into the backend through `child_process.execFile`.
- The old separate Python FastAPI AI service should not be required for the target MVP runtime.
- Existing API response shapes and database collections must remain backward compatible.

## Completed Work

### Backend

- `textPreprocessor.js` exists.
- `whisper.js` has been rewritten around the Whisper CLI.
- Conversation model supports migrated action items in `{ text, done }` form.
- Backward-compatible action item migration hooks have been started.
- Gemini integration has been updated for structured extraction.
- Preprocessing pipeline has been added before Gemini extraction.
- Action item toggle endpoint has been added.
- Reminder planning service and reminder routes exist.

### Mobile

- Processing-complete notification work has started.
- `NotificationService` has been updated.
- Summary screen task tracking has started.
- Timeline completed-state grey-out logic has started.
- Checkbox UI work has started in `UIComponents`.

## Phase Plan

### Phase 1 - Backend Stabilization

Status: In progress

Goals:

- Finalize Whisper CLI integration.
- Keep transcription entirely inside the backend.
- Use `child_process.execFile` safely.
- Handle Windows paths safely.
- Add timeout protection.
- Clean temporary files after processing.
- Improve text preprocessing for Indian financial shorthand.
- Improve Gemini JSON fallback behavior.
- Preserve `/api/conversations/upload` response compatibility.
- Add structured errors and useful logging.

Exit checks:

- Backend starts.
- Upload endpoint accepts audio.
- Whisper produces a transcript.
- Preprocessing runs before Gemini.
- Gemini output saves to MongoDB.
- Existing frontend still receives the same response shape.

### Phase 2 - Task And Reminder System

Status: Pending Phase 1 stabilization

Goals:

- Finalize `actionItems: [{ text, done }]`.
- Ensure old conversations render safely.
- Ensure PATCH task toggle persists.
- Show progress such as `3/5 completed`.
- Grey out completed task rows.
- Fade completed conversations in timeline.
- Parse reminder dates safely.
- Schedule local reminder notifications from detected deadlines.

Exit checks:

- Task toggle works end to end.
- Old conversations still render.
- Reminders schedule without duplicates.

### Phase 3 - Notification Flow

Status: Pending Phase 2

Goals:

- Call-ended notification.
- Processing-started notification.
- Summary-ready notification.
- Reminder notifications.
- Notification tap navigation.
- Duplicate prevention.
- Background-safe handling.

Exit checks:

- Each notification appears at the expected point.
- Taps open the correct screen.
- Dismiss actions do not create records.

### Phase 4 - Permission Onboarding

Status: Pending Phase 3

Goals:

- First-launch welcome flow.
- Explain notification permission before request.
- Explain microphone permission before request.
- Explain phone state permission before request.
- Make clear that calls are not recorded.
- Battery optimization guidance.
- OnePlus-style background, auto-launch, and unrestricted battery guidance.
- Permission status tracking and re-checking.

Exit checks:

- Already-granted permissions are skipped.
- Denied critical permissions show a clear warning.
- Onboarding state persists.

### Phase 5 - Responsive UI Polish

Status: Pending Phase 4

Goals:

- Fix overflow and clipping.
- Improve small-phone layout stability.
- Improve tablet spacing.
- Add responsive spacing and text wrapping where needed.
- Polish checkbox, task, timeline, and summary layouts.

Exit checks:

- No clipped buttons/cards on small Android phones.
- Long text wraps cleanly.
- Timeline and Summary remain usable on tablets.

### Phase 6 - Final Stability Pass

Status: Pending Phase 5

Goals:

- Runtime cleanup.
- Retry paths.
- Loading states.
- Empty states.
- Edge-case handling.
- Performance sanity checks.

Final checks:

- Recording works.
- Upload works.
- AI pipeline works.
- Reminders work.
- Notifications work.
- Task system works.
- Timeline works.
- Onboarding works.

## Known Documentation Cleanup

The root documentation has been reduced to:

- `README.md` for setup, run flow, architecture notes, and troubleshooting.
- `PROJECT_STATUS.md` for current progress, phase gates, and next work.

Older one-off checklist, summary, quick-reference, and testing Markdown files were removed because they duplicated information and still referenced the old FastAPI service.
