# Quick Reference - Testing Commands & Scenarios

## 🚀 Quick Start Commands

### Backend Testing
```bash
# Test Gemini extraction with all scenarios
cd c:\Dev\Finsense-AI
node test-gemini.js

# Test Gemini with custom transcript
node test-gemini.js "I need to pay ₹50000 EMI by 5th April"

# Check notification urgency levels
node test-notifications.js
```

### Mobile Testing
```bash
# Build and run app
cd c:\Dev\Finsense-AI\mobile
npm start
npx react-native run-android

# View app logs
npx react-native log-android
```

### Backend Server
```bash
cd c:\Dev\Finsense-AI\backend
npm start
```

---

## 📋 Test Scenarios

### Gemini Scenarios (Built-in)
| ID | Type | Expected Inputs | Expected Outputs |
|----|------|-----------------|------------------|
| 1 | SIP | "SIP ₹5000/month by 25th April" | Entity(SIP), Deadline(25th) |
| 2 | EMI | "EMI ₹50000 due on 5th" | Entity(EMI), Amount(50000) |
| 3 | Mixed | "3 payments: ₹15k by 22nd, ₹8k by month-end, ₹25k in 15 days" | 3 PaymentDeadlines |
| 4 | Non-Financial | "Weather is nice today" | Empty entities[] |

### Notification Scenarios (Built-in)
| ID | Days Until Due | Expected Title | Expected Color | Importance |
|----|---|---|---|---|
| 1 | -1 (Overdue) | 🚨 OVERDUE PAYMENT | #DC2626 | MAX |
| 2 | 0.5 (Today) | ⚠️ Due Today | #EF4444 | MAX |
| 3 | 1.5 (36h) | ⏰ Due Soon | #F97316 | HIGH |
| 4 | 7 (7 days) | 📌 Payment Reminder | #3B82F6 | DEFAULT |

### Call Detection Scenarios
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Make phone call | App detects state=Connected |
| 2 | End call | App detects state=Disconnected |
| 3 | Wait 1.5s | Notification appears |
| 4 | Tap "Record Summary" | Opens RecordScreen |
| 5 | Tap "Ignore" | Dismisses notification |

---

## 📊 Performance Targets

| Operation | Target | Max Acceptable |
|-----------|--------|-----------------|
| Audio start → display | <200ms | <500ms |
| Stop recording → file save | <500ms | <1s |
| Whisper transcription (5min) | <30s | <60s |
| Gemini extraction | <5s | <15s |
| Deadline notification show | <2s after call | <5s |
| **Total pipeline (5min audio)** | **<40s** | **<90s** |

---

## 🎯 Coverage Matrix

### Audio Recording
```
START      ✅ Pulsing animation ✅ Timer increment
   ↓
RECORDING  ✅ File created ✅ Permissions OK
   ↓
STOP       ✅ File saved ✅ Transition to RECORDED
   ↓
UPLOAD     ✅ FormData correct ✅ API receives
```

### Post-Call Notification
```
CALL ENDS  ✅ Detection ✅ 1.5s timer
   ↓
SHOW       ✅ Notification displays ✅ Actions visible
   ↓
RECORD     ✅ Navigates to RecordScreen ✅ Ready to record
   or
IGNORE     ✅ Notification dismissed ✅ No side effects
```

### Gemini Extraction
```
TRANSCRIPT ✅ Receives from Whisper ✅ Length handled
   ↓
GEMINI     ✅ API call ✅ JSON parsing
   ↓
EXTRACT    ✅ Entities ✅ Deadlines ✅ Action items
   ↓
STORE      ✅ Database save ✅ All fields populated
```

### Notification Scheduling
```
DEADLINE   ✅ Extracted from Gemini ✅ Days calculated
   ↓
URGENCY    ✅ <24h=CRITICAL ✅ <48h=HIGH ✅ >48h=INFO
   ↓
NOTIFY     ✅ Correct icon ✅ Correct color ✅ Correct sound
   ↓
INTERACT   ✅ Snooze works ✅ Mark done works
```

---

## 🔍 Debug Commands

### Check Gemini Response
```javascript
// In backend console:
const {extractInsights} = require('./src/services/gemini');
const result = await extractInsights("I need to pay ₹50000 by 5th April");
console.log(JSON.stringify(result, null, 2));
```

### Mock Notification
```javascript
// In React Native component:
import {scheduleDeadlineNotification} from './services/NotificationService';

await scheduleDeadlineNotification({
  description: 'Test Payment',
  daysUntilDue: 12,
  requiresAction: true,
  dueDate: new Date(Date.now() + 12*60*60*1000).toISOString()
}, 'test_notif');
```

### View App Logs
```bash
# Android
npx react-native log-android | grep -E "CallDetection|Notification|Gemini|AudioRecorder"

# iOS
xcrun simctl spawn booted log stream --predicate 'eventMessage contains "FinSense"'
```

---

## ✅ Pass/Fail Criteria

### Pass if:
- ✅ Audio records without crashing
- ✅ Call notification appears within 2s
- ✅ Gemini extracts deadlines correctly
- ✅ Notifications show with correct urgency
- ✅ Total pipeline takes <90s
- ✅ No unhandled errors
- ✅ Database persists correctly

### Fail if:
- ❌ Recording crashes or permissions denied (unhandled)
- ❌ Notification doesn't appear
- ❌ Deadlines not extracted
- ❌ Wrong notification urgency level
- ❌ Pipeline takes >120s
- ❌ Crashes or runtime errors
- ❌ Data not saved to database

---

## 📞 Troubleshooting Quick Links

| Problem | Check | Fix |
|---------|-------|-----|
| Gemini API error | .env has key | Regenerate key |
| No notification | Permissions | Grant in settings |
| Empty entities | Transcript format | Add explicit dates |
| Slow pipeline | Network | Check internet |
| Recording fails | File permissions | Check RNFS paths |
| App crashes | Logs | Check error trace |

---

## 📁 Important Files

| File | Purpose | Location |
|------|---------|----------|
| TESTING_GUIDE.md | Full testing doc | `/` |
| test-gemini.js | Gemini test script | `/` |
| test-notifications.js | Notification urgencies | `/` |
| gemini.js | Gemini service | `backend/src/services/` |
| NotificationService.js | Notification logic | `mobile/src/services/` |
| Conversation.js | Data model | `backend/src/models/` |
| conversations.js | API routes | `backend/src/routes/` |

---

**Last Updated**: April 17, 2026  
**Version**: 1.0  
**Status**: Ready for Testing 🟢
