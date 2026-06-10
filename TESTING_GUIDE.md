# Testing & Verification Guide - FinSense AI

This guide covers testing procedures for the FinSense AI MVP across all phases.

## Quick Start - Phase Verification

### Phase 1: Backend Stabilization ✅
```bash
# Test whisper transcription
curl -X POST http://localhost:3000/api/conversations/upload \
  -F "file=@test-audio.m4a" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
{
  "message": "Conversation saved",
  "conversation": {
    "_id": "...",
    "transcript": "...",
    "summary": "...",
    "actionItems": [...],
    "entities": [...]
  }
}
```

### Phase 2: Task System ✅
```bash
# Create a conversation (via upload)
# Then patch action item:
curl -X PATCH http://localhost:3000/api/conversations/{id}/action-items/0 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"done": true}'

# Verify: actionItems[0].done === true
```

### Phase 3: Notifications ✅
```bash
# Backend scheduler creates reminders
# Mobile app receives them via:
# 1. NotificationService.scheduleConversationReminders()
# 2. notifee.onForegroundEvent handler in useCallNavigation
# 3. notifee.onBackgroundEvent handler in index.js

# Test by:
# 1. Recording a conversation
# 2. Checking notification channels exist in system settings
# 3. Tapping notification and verifying navigation works
```

### Phase 4: Permission Onboarding ✅
```bash
# First launch after login:
# 1. Should see OnboardingScreen (6 steps)
# 2. Each step explains a permission
# 3. Permission requests happen AFTER explanation
# 4. Battery optimization shows OnePlus-specific guidance
# 5. Completion persists (relaunch doesn't show again)

# To reset for testing:
# App Settings → Storage → Clear App Data
# Or: storageService.clearAll()
```

### Phase 5: Responsive UI 🟡 IN PROGRESS
```bash
# Test on different screen sizes:
# 1. Small phones: Run on Pixel 3a or emulator at 540 density
# 2. Standard phones: Pixel 4/5 at 420 density (default)
# 3. Tablets: Use emulator or physical tablet

# Visual checks:
# - No text overflow
# - Buttons stay centered
# - Cards don't clip
# - Text wraps naturally
```

## Test Scenarios

### Scenario 1: Full Recording → Summary Flow

1. **Launch App**
   - [ ] Sees auth (if logged out) or onboarding (if first launch)
   - [ ] Then sees main app (Timeline, Record tabs)

2. **Record Audio**
   - [ ] Tap Record button
   - [ ] Pulse animation appears
   - [ ] Mic indicator shows recording
   - [ ] Tap stop
   - [ ] Upload begins

3. **Upload Processing**
   - [ ] "Processing..." notification appears
   - [ ] Whisper transcription completes (≤ 30s for test audio)
   - [ ] Text preprocessing runs
   - [ ] Gemini extraction completes
   - [ ] "Summary Ready" notification appears

4. **View Summary**
   - [ ] Tap notification or navigate to Summary
   - [ ] See: Date, transcript, summary, entities, action items
   - [ ] Action items show checkbox
   - [ ] Timeline shows new conversation with progress

5. **Toggle Task**
   - [ ] Tap action item checkbox
   - [ ] Done state persists (✓ check, greyed text)
   - [ ] Reload app - task still marked done
   - [ ] Timeline shows updated progress (e.g., "2/3 completed")

### Scenario 2: Permission & Onboarding Flow

1. **Fresh App Install**
   ```bash
   adb uninstall com.tempapp
   adb install app-release.apk
   ```

2. **First Launch After Login**
   - [ ] OnboardingScreen appears (not Main app)
   - [ ] Welcome step shows 5 features
   - [ ] "Next" button advances
   - [ ] Notification step explains reminders
   - [ ] "Request Permission" button requests notification permission
   - [ ] Microphone step explains recording
   - [ ] Phone state step explains call detection
   - [ ] Battery optimization step shows instructions
   - [ ] OnePlus users see OnePlus-specific guidance
   - [ ] Completion step shows permission status
   - [ ] "Done" button dismisses onboarding

3. **Verify Onboarding Complete**
   - [ ] Close and relaunch app
   - [ ] Onboarding should NOT appear again
   - [ ] Main app (Timeline) shows immediately

4. **Reset Onboarding (for testing)**
   - [ ] In PermissionService: `resetOnboarding()` → clears storage key

### Scenario 3: Responsive Design Testing

1. **Small Phone (< 4.5")**
   ```bash
   # Pixel 3a dimensions: 392 x 784 density 440
   adb shell am display-density 540
   ```
   - [ ] Record button stays visible (not off-screen)
   - [ ] Summary page text doesn't overflow
   - [ ] Timeline cards fit on screen
   - [ ] All buttons/inputs are clickable

2. **Standard Phone (4.5" - 6.5")**
   ```bash
   # Pixel 4 dimensions: 412 x 869 density 420 (default)
   ```
   - [ ] All layouts look balanced
   - [ ] No excessive whitespace
   - [ ] Content is easy to read

3. **Tablet (> 6.5")**
   - [ ] Content doesn't stretch too wide
   - [ ] Use tablet device or emulator
   - [ ] Verify cards are readable width
   - [ ] Spacing is appropriate

### Scenario 4: Call Detection & Post-Call Notification

**Android Only, READ_PHONE_STATE required:**

1. **Setup**
   - [ ] App has READ_PHONE_STATE permission (grant via onboarding)
   - [ ] App is running (can be in background)

2. **Test Flow**
   - [ ] Start recording a conversation
   - [ ] Receive a phone call
   - [ ] Answer and hang up
   - [ ] Wait 1.5 seconds
   - [ ] "Did you discuss finances?" notification appears
   - [ ] Tap notification
   - [ ] Navigate to Record screen

3. **Verify Behavior**
   - [ ] Post-call prompt uses the correct reminder icon
   - [ ] Notification only appears after call ends (not during call)
   - [ ] Appears even if app is in background

### Scenario 5: Reminder Scheduling & Notifications

1. **Create a Reminder**
   - [ ] Record conversation with actionable reminder keywords
   - [ ] Gemini extracts reminder templates
   - [ ] Backend schedules reminder jobs

2. **Verify Notification**
   - [ ] Notification appears at scheduled time
   - [ ] Contains correct reminder text
   - [ ] Clicking navigates to appropriate screen
   - [ ] Status updates when interacted with

3. **Verify Persistence**
   - [ ] Close app completely
   - [ ] Notification still triggers at time
   - [ ] Background handler fires notification

## Automated Testing

### Unit Tests
```bash
cd mobile
npm test

# Test key components:
# - ActionItem toggle state
# - EntityTag type -> color mapping
# - Task progress calculation
```

### Build & Compile Checks
```bash
cd mobile
npm run lint              # ESLint checks
npm run build:android     # Verify compilation
```

### Backend Tests
```bash
cd backend
npm test                  # If test suite exists
# Manual verification via API calls (see above)
```

## Performance Testing

### Metrics to Monitor

1. **Recording Start**
   - Expected: < 100ms from tap to recording indicator

2. **Upload Processing**
   - Transcription: 10-30s for test audio
   - Preprocessing: < 1s
   - Gemini extraction: 5-15s
   - Total: 20-50s

3. **Navigation**
   - Screen transitions: < 300ms
   - ScrollView: 60fps smooth scroll

4. **Memory**
   - App memory: < 150MB (ideal)
   - Alert for: > 200MB

### Tools
```bash
# Monitor memory and performance
adb shell dumpsys meminfo com.tempapp

# Monitor CPU
adb shell top -p $(adb shell pidof com.tempapp)

# Network monitoring in Chrome DevTools
# Open DevTools → Network tab while using app
```

## Error Scenarios

### Test Error Handling

1. **No Audio Input**
   - [ ] Tap Record immediately and stop
   - [ ] Should show error: "No audio detected"

2. **Network Timeout**
   - [ ] Simulate slow network: DevTools → Network throttling
   - [ ] Upload should timeout gracefully with user-friendly error

3. **Backend Server Down**
   - [ ] Stop backend: `kill -9 <pid>`
   - [ ] App should show: "Connection failed, please try again"
   - [ ] Retry button works when server back up

4. **Permission Denied**
   - [ ] Grant microphone, then revoke in Settings
   - [ ] Tap Record button
   - [ ] Should show: "Microphone permission required"

5. **Storage Full**
   - [ ] Simulate: `adb shell fallocate -l 10G /data/test.img`
   - [ ] Upload should handle gracefully

## Device Testing Matrix

| Device | Size | OS | Priority | Status |
|--------|------|----|----|--------|
| Pixel 3a | 4.6" | 13+ | HIGH | 🟡 TODO |
| OnePlus 8 | 6.5" | 12+ | HIGH | 🟡 TODO |
| Moto G6 | 5.7" | 9 | MEDIUM | 🟡 TODO |
| Samsung Tab S7 | 11" | 12+ | MEDIUM | 🟡 TODO |
| Android Emulator | Configurable | 13 | HIGH | ✅ Ready |

## Verification Checklist - Pre-Release

- [ ] All 6 phases pass their respective tests
- [ ] No crashes on small phones
- [ ] No crashes on tablets
- [ ] No crashes on OnePlus (battery optimization tested)
- [ ] Recording works end-to-end
- [ ] Upload works end-to-end
- [ ] Task toggle works end-to-end
- [ ] Reminders fire at correct times
- [ ] Notifications route correctly
- [ ] Onboarding shows on first launch
- [ ] Permissions persist correctly
- [ ] Call detection works (on supported devices)
- [ ] No console errors or warnings (except known ESLint warnings)
- [ ] Memory usage stays under 200MB
- [ ] App doesn't crash with no network
- [ ] Screens are readable on all device sizes
- [ ] No text overflow on small phones

## Continuous Testing During Development

After **any** code change:

1. Run linter: `npm run lint`
2. Test on emulator: `npm run android`
3. Try key flow: Record → Upload → View Summary
4. Check responsive: Test on 2 different screen sizes
5. Verify permissions: Toggle permissions in app

Before **each phase completion**:

1. Document what was fixed
2. Run full test matrix
3. Verify no regressions
4. Update PROJECT_STATUS.md
5. Update this testing guide

## Bug Report Template

When encountering issues:

```
**Device:** [Model, Android version, screen size]
**Phase:** [1-6]
**Steps to reproduce:**
1. 
2. 
3. 

**Expected result:**
[What should happen]

**Actual result:**
[What actually happened]

**Logs:**
[Share console errors if available]

**Screenshots:**
[Attach if visual issue]
```

## References

- [React Native Testing Library](https://testing-library.com/docs/react-native-testing-library/intro/)
- [Android Testing Guide](https://developer.android.com/training/testing)
- [Device Testing Best Practices](https://reactnative.dev/docs/testing-overview)
