# FinSense AI - Pre-Deployment Testing Guide

## Overview
This guide covers testing the four critical features before production deployment:
1. Audio recording functionality
2. Post-call notification with storage prompt
3. Gemini summary generation with deadline extraction
4. Real-time deadline notifications (48h/24h urgency levels)

---

## 1. Audio Recording Testing

### Test Environment Setup
```bash
cd c:\Dev\Finsense-AI\mobile
npm start                    # Start Metro bundle server
```

Then in another terminal:
```bash
# Build and install on connected android device/emulator
npx react-native run-android
```

### Test Cases

#### 1.1 Recording Start/Stop
- **Step 1**: Open app → Navigate to Record Screen
- **Step 2**: Tap microphone button → Should see pulsing animation
- **Step 3**: Verify timer starts incrementing
- **Expected**: 
  - ✅ Pulsing animation visible
  - ✅ Timer shows elapsed time (00:00 → 00:05 etc.)
  - ✅ Visual feedback consistent

#### 1.2 Stop Recording
- **Step 1**: While recording, tap mic button again
- **Step 2**: App should transition to RECORDED phase
- **Expected**:
  - ✅ Recording stops
  - ✅ File created in cache directory
  - ✅ UI shows "Recorded" state with Upload/Discard options

#### 1.3 Discard Recording
- **Step 1**: In RECORDED state, tap "Discard"
- **Expected**:
  - ✅ Returns to IDLE state
  - ✅ Recording file deleted
  - ✅ Timer reset to 00:00

#### 1.4 Permissions Handling
- **Step 1**: On first run, should prompt for audio/storage permissions
- **Step 2**: Grant permissions
- **Expected**:
  - ✅ Permissions granted
  - ✅ Can proceed with recording

---

## 2. Post-Call Notification Testing

### Setup
This requires a real Android device or emulator with phone capability.

### Test Cases

#### 2.1 Call Detection & Notification
- **Step 1**: Make an actual phone call (or simulate call state)
- **Step 2**: End the call
- **Expected** (after ~1.5s):
  - ✅ Notification appears: "Did you discuss finances in that call?"
  - ✅ Two action buttons: "Record Summary" and "Ignore"

#### 2.2 "Record Summary" Action
- **Step 1**: From notification, tap "Record Summary"
- **Expected**:
  - ✅ App opens RecordScreen automatically
  - ✅ Ready to record audio summary

#### 2.3 "Ignore" Action
- **Step 1**: From notification, tap "Ignore"
- **Expected**:
  - ✅ Notification dismissed
  - ✅ No recording triggered
  - ✅ No conversation created

#### 2.4 Multiple Calls
- **Step 1**: Make multiple calls in succession
- **Step 2**: End each call
- **Expected**:
  - ✅ Separate notification for each call
  - ✅ Each trigger independently

---

## 3. Gemini Summary & Deadline Extraction

### Backend Setup
```bash
# Ensure backend is running
cd c:\Dev\Finsense-AI\backend
npm start
```

### Test Cases

#### 3.1 Financial Conversation Summary
**Test Transcript 1** (SIP discussion):
```
"I need to start an SIP of ₹5000/month for my child's education. 
I've discussed with my advisor and need to open an account by 25th April. 
The fees are around ₹50/month."
```

**Expected Output**:
```json
{
  "summary": "User discussed starting a ₹5000/month SIP for child's education with deadline of April 25th and monthly fees of ₹50",
  "entities": [
    {
      "type": "SIP",
      "value": "Child education SIP",
      "amount": 5000,
      "deadline": "2026-04-25",
      "urgency": "high"
    }
  ],
  "paymentDeadlines": [
    {
      "description": "Open SIP account",
      "dueDate": "2026-04-25",
      "daysUntilDue": 8,
      "requiresAction": true
    }
  ]
}
```

#### 3.2 EMI with Payment Deadline
**Test Transcript 2** (Loan EMI):
```
"My home loan EMI is ₹50000 per month, due on the 5th of every month. 
Last payment was missed in February and I need to catch up this month. 
Next payment is in 3 days."
```

**Expected Output**:
```json
{
  "summary": "User has ₹50,000 monthly home loan EMI due on the 5th with missed payment from February needing catch-up",
  "entities": [
    {
      "type": "EMI",
      "value": "Home loan monthly payment",
      "amount": 50000,
      "deadline": "next 5th",
      "urgency": "critical"
    }
  ],
  "paymentDeadlines": [
    {
      "description": "Home loan EMI + catch-up payment",
      "dueDate": "2026-04-25",
      "daysUntilDue": 3,
      "requiresAction": true
    }
  ]
}
```

#### 3.3 Multiple Deadlines
**Test Transcript 3** (Mixed):
```
"So I need to pay my credit card bill of ₹15000 by 22nd April, 
then my insurance premium of ₹8000 by end of month, 
and my property tax bill of ₹25000 is due within 15 days."
```

**Expected Output**: Should extract all three deadlines with correct urgency levels

#### 3.4 Non-Financial Conversation
**Test Transcript 4**:
```
"Let's talk about the weather and how the garden is looking."
```

**Expected Output**:
```json
{
  "summary": "Non-financial conversation about weather and gardening",
  "entities": [],
  "keywords": [],
  "actionItems": [],
  "paymentDeadlines": []
}
```

### Testing via API
```bash
# Test extract insights endpoint
curl -X POST http://localhost:3000/api/search/extract-insights \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "transcript": "I need to pay my EMI of ₹50000 by next 5th and my insurance by end of month"
  }'
```

---

## 4. Real-Time Deadline Notifications

### Test Cases

#### 4.1 Normal Notification (<48h, ≥24h)
**Scenario**: Payment due in 36 hours (1.5 days)

**Expected**:
- ✅ Notification shows: "⏰ Payment Due Soon"
- ✅ Body shows: "Due in 1 day: [payment description]"
- ✅ Color: Orange (#F97316)
- ✅ Importance: HIGH
- ✅ Vibration: Enabled

#### 4.2 Urgent Notification (<24h)
**Scenario**: Payment due in 12 hours (0.5 days)

**Expected**:
- ✅ Notification shows: "⚠️ Payment Due Today"
- ✅ Body shows: "Due TODAY: [payment description]"
- ✅ Color: Red (#EF4444)
- ✅ Importance: MAX
- ✅ Vibration: Enabled
- ✅ Sound: Louder alert

#### 4.3 Overdue Notification
**Scenario**: Payment date has passed

**Expected**:
- ✅ Notification shows: "🚨 OVERDUE PAYMENT"
- ✅ Body shows: "URGENT: [payment description]"
- ✅ Color: Dark Red (#DC2626)
- ✅ Importance: MAX
- ✅ Vibration: Continuous

#### 4.4 Informational Notification (≥48h)
**Scenario**: Payment due in 70 hours (3 days)

**Expected**:
- ✅ Notification shows: "📌 Payment Reminder"
- ✅ Body shows: "Due in 3 days: [payment description]"
- ✅ Color: Blue (#3B82F6)
- ✅ Importance: DEFAULT
- ✅ Vibration: Disabled

#### 4.5 Multiple Deadlines
**Scenario**: Summary with 3 payment deadlines

**Expected**:
- ✅ Each deadline triggers separate notification
- ✅ Notifications grouped by urgency level
- ✅ Can snooze/mark done individually

---

## 5. End-to-End Integration Test

### Complete User Journey
1. **Call Detection**: Phone call ends
2. **Post-Call Notification**: Notification appears
3. **Record**: User taps "Record Summary" and records audio
4. **Upload**: Audio is uploaded and processed
5. **Processing**: 
   - Whisper transcribes audio
   - Gemini extracts insights + deadlines
6. **Display**: Summary screen shows all extracted data
7. **Notifications**: Deadline notifications scheduled based on urgency
8. **Storage**: Conversation saved to database

### Test Sequence
```
1. Make a call
   ↓
2. End call → notification appears
   ↓
3. Tap "Record Summary"
   ↓
4. Record: "I need to pay my tax bill of ₹1 lakh by 20th April"
   ↓
5. Stop recording → tap Upload
   ↓
6. Wait for processing (Whisper → Gemini)
   ↓
7. Verify Summary Screen shows:
   - ✅ Transcript
   - ✅ Summary highlighting tax bill deadline
   - ✅ Entity: Tax payment of ₹100000
   - ✅ Action item: "Pay ₹1 lakh tax by 20th April"
   - ✅ Deadline notification scheduled
   ↓
8. Verify deadline notification:
   - ✅ Appears at correct time
   - ✅ Correct urgency level
   - ✅ Can snooze or mark done
```

---

## 6. Error Handling Tests

### 6.1 Network Errors
- [ ] Upload fails mid-request → Show retry option
- [ ] Backend timeout → Show error message with retry
- [ ] No internet → Show offline message

### 6.2 Invalid Audio
- [ ] Empty file → Clear error message
- [ ] Corrupted file → Graceful fallback
- [ ] Very large file (>100MB) → Reject with message

### 6.3 Gemini API Errors
- [ ] API key invalid → Show configuration error
- [ ] Quota exceeded → Show rate limit message
- [ ] Malformed response → Fallback to raw text

### 6.4 Permission Errors
- [ ] Audio permission denied → Can't record
- [ ] Phone state permission denied → Call detection disabled
- [ ] Storage permission denied → Can't save recordings

---

## 7. Performance Benchmarks

| Feature | Target | Acceptable |
|---------|--------|------------|
| Record start → display | <200ms | <500ms |
| Stop recording → file save | <500ms | <1000ms |
| Upload speed (per MB) | <2s | <5s |
| Whisper transcription | <30s (5min audio) | <60s |
| Gemini extraction | <5s | <15s |
| Total pipeline | <40s (5min audio) | <90s |
| Notification show time | <2s after call end | <5s |

---

## 8. Testing Checklist

### Pre-Deployment Sign-Off
- [ ] Audio recording: All 4 test cases pass
- [ ] Post-call notification: All 4 test cases pass
- [ ] Gemini summary: All 4 test cases pass
- [ ] Deadline notifications: All 5 test cases pass
- [ ] Integration test: Complete journey successful
- [ ] Error handling: All 4 categories handled gracefully
- [ ] Performance: All benchmarks met
- [ ] UI/UX: Smooth transitions, clear feedback
- [ ] Data persistence: Conversations saved correctly
- [ ] No crashes: Tested on multiple devices

---

## 9. Device Testing

### Recommended Test Devices
- **Emulator**: Android 12 or higher
- **Physical**: Real device with Android 11+
- **Multiple tests**: At least 2 different screen sizes

### Android Versions Tested
- [ ] Android 11 (API 30)
- [ ] Android 12 (API 31)
- [ ] Android 13 (API 33)
- [ ] Android 14 (API 34)

---

## 10. Deployment Checklist

Before going to production:
- [ ] All tests pass on staging environment
- [ ] Backend deployed with Gemini API key configured
- [ ] Database migrations applied
- [ ] Notifications tested on real devices
- [ ] Error logs reviewed and acceptable
- [ ] User documentation complete
- [ ] Support team trained on common issues
- [ ] Rollback plan documented
