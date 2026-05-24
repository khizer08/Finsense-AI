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

Status: Stabilized with placeholder-upload verification

Goals:

Completed:

- Whisper runs through the backend service using `child_process.execFile`.
- Whisper execution has timeout protection and retry handling.
- Missing Whisper, missing ffmpeg, invalid audio, empty audio, timeout, and empty transcript cases return structured errors.
- Whisper output is read from JSON when available, with duration and language metadata preserved.
- Whisper-generated sidecar files are cleaned after processing.
- Uploaded audio files are cleaned after success and failure paths.
- Upload middleware now returns stable `{ error, code }` responses while preserving the existing `error` field.
- Text preprocessing now normalizes whitespace, currency symbols, filler words, punctuation, and financial shorthand.
- Preprocessing handles examples such as `50k`, `2L`, `1cr`, `5 lakhs`, `emi`, `sip`, `fd`, `txn`, `amt`, `mo`, and `yr`.
- Gemini calls now retry transient failures.
- Gemini JSON parsing is more tolerant of fenced or extra-text responses.
- `/api/conversations/upload` continues to return `{ message, conversation }` on success.

Exit checks:

- Backend health endpoint verified on `http://localhost:3000/health`.
- `ffmpeg -version` verified locally.
- `whisper --help` verified locally with `PYTHONIOENCODING=utf-8`.
- Preprocessing examples verified locally:
  - `50k` -> `50,000`
  - `2L` -> `2,00,000`
  - `1cr` -> `1,00,00,000`
  - `5 lakhs rs` -> `5,00,000 INR`
  - `emi sip fd txn amt mo yr` -> `EMI SIP Fixed Deposit transaction amount month year`
- Authenticated placeholder upload verified through `POST /api/conversations/upload`.
- Placeholder upload created a `done` conversation and returned the existing success response shape.

Remaining verification:

- Run one real spoken-audio upload from the Android app to verify Whisper model execution with an actual recording.
- Confirm the saved MongoDB document from a real recording contains transcript, summary, entities, action items, and reminder jobs.

### Phase 2 - Task And Reminder System

Status: In progress

Goals:

Completed:

- Summary screen normalizes legacy string action items before rendering and toggling.
- Summary screen keeps the existing `3/5` style progress badge for action items.
- Timeline screen normalizes old and new action item shapes before display.
- Timeline screen now shows task progress such as `3/5` on conversation cards.
- Timeline screen shows a completed indicator when all tasks are done.
- Timeline cards for fully completed conversations remain faded/muted.
- Completed task previews use muted strikethrough styling.
- PATCH task toggle endpoint verified through the real API with a temporary test conversation.

Remaining:

- Verify reminder scheduling on a real Android device with Notifee trigger notifications.
- Verify reminders generated from a real Gemini extraction are saved in MongoDB and scheduled locally.
- Verify notification actions can mark reminders done and cancel pending trigger notifications.

Exit checks:

- Task toggle works end to end through `PATCH /api/conversations/:id/action-items/:index`.
- Old string action items are handled safely in Summary and Timeline UI.
- Android debug build passes after task UI changes.
- Reminder scheduling still requires device validation.

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
