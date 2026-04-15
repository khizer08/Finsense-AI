# FinSense AI 💡

**Production-ready native Android AI application for financial conversation intelligence.**

Records or receives phone-call audio → Whisper transcription → Gemini AI extraction → structured financial insights.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              React Native CLI App (Android)          │
│                                                      │
│  AuthScreen → TimelineScreen → RecordScreen          │
│                             → SummaryScreen          │
│                                                      │
│  CallDetectionService  →  NotificationService        │
│  (READ_PHONE_STATE)        (@notifee/react-native)   │
└──────────────────────┬──────────────────────────────┘
                       │ Axios / REST
         ┌─────────────▼──────────────┐
         │   Node.js + Express API    │
         │   /api/auth                │
         │   /api/conversations       │
         │   /api/search              │
         │   MongoDB (Mongoose)       │
         └─────────────┬──────────────┘
                       │ HTTP multipart
         ┌─────────────▼──────────────┐
         │  Python FastAPI + Whisper  │
         │  POST /transcribe          │
         └────────────────────────────┘
                       │
         ┌─────────────▼──────────────┐
         │  Google Gemini 1.5 Flash   │
         │  (structured JSON output)  │
         └────────────────────────────┘
```

---

## Project Structure

```
FinSenseAI/
├── App.js
├── index.js
├── package.json
├── babel.config.js
├── metro.config.js
├── react-native.config.js
│
├── src/
│   ├── components/
│   │   ├── theme.js           ← colours, spacing, typography
│   │   └── UIComponents.js    ← Button, Input, Card, EntityTag, etc.
│   │
│   ├── navigation/
│   │   └── AppNavigator.js    ← Stack + Tab navigators
│   │
│   ├── screens/
│   │   ├── AuthScreen.js
│   │   ├── RecordScreen.js    ← react-native-audio-recorder-player
│   │   ├── TimelineScreen.js
│   │   └── SummaryScreen.js
│   │
│   ├── services/
│   │   ├── api.js             ← Axios instance + interceptors
│   │   ├── AuthContext.js     ← JWT auth state
│   │   ├── CallDetectionService.js  ← react-native-call-detection
│   │   ├── NotificationService.js   ← @notifee/react-native
│   │   ├── PermissionService.js     ← react-native-permissions
│   │   └── StorageService.js        ← react-native-encrypted-storage
│   │
│   ├── hooks/
│   │   ├── useAudioRecorder.js
│   │   ├── useCallNavigation.js
│   │   └── useConversations.js
│   │
│   └── utils/
│       └── formatters.js
│
├── android/
│   ├── build.gradle
│   ├── settings.gradle
│   ├── gradle.properties
│   ├── gradle/wrapper/gradle-wrapper.properties
│   └── app/
│       ├── build.gradle
│       ├── proguard-rules.pro
│       └── src/main/
│           ├── AndroidManifest.xml
│           ├── java/com/finsenseai/
│           │   ├── MainActivity.kt
│           │   └── MainApplication.kt
│           └── res/values/
│               ├── strings.xml
│               └── styles.xml
│
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js
│       ├── middleware/auth.js
│       ├── models/
│       │   ├── User.js
│       │   └── Conversation.js
│       ├── routes/
│       │   ├── auth.js
│       │   ├── conversations.js
│       │   └── search.js
│       └── services/
│           ├── gemini.js
│           └── whisper.js
│
└── ai-service/
    ├── main.py
    ├── requirements.txt
    └── .env.example
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| React Native CLI | latest |
| Android Studio + SDK 34 | required |
| Java 17 | required |
| Python | ≥ 3.10 |
| MongoDB | ≥ 6 (local or Atlas) |
| ffmpeg | required by Whisper |

---

### 1 — AI Service (Whisper)

```bash
cd ai-service

# Install ffmpeg (Ubuntu/Debian)
sudo apt install ffmpeg

# Python env
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Start
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# → http://localhost:8000/health
```

---

### 2 — Backend (Node.js)

```bash
cd backend

cp .env.example .env
# Edit .env:
#   MONGODB_URI=mongodb://localhost:27017/finsense
#   JWT_SECRET=<random 64-char string>
#   GEMINI_API_KEY=<your key from aistudio.google.com>
#   AI_SERVICE_URL=http://localhost:8000

npm install
npm run dev
# → http://localhost:3000/health
```

---

### 3 — Mobile App

```bash
# From project root
npm install

# ⚠️  Update BASE_URL in src/services/api.js:
#   Android emulator → http://10.0.2.2:3000
#   Real device      → http://<YOUR_LAN_IP>:3000

# Start Metro bundler
npx react-native start

# In a new terminal — run on Android
npx react-native run-android
```

---

## Building a Release APK

```bash
# 1. Generate keystore (run once)
cd android/app
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore finsense-release.keystore \
  -alias finsense \
  -keyalg RSA -keysize 2048 -validity 10000

# 2. Uncomment and fill in android/gradle.properties:
#   MYAPP_UPLOAD_STORE_FILE=finsense-release.keystore
#   MYAPP_UPLOAD_KEY_ALIAS=finsense
#   MYAPP_UPLOAD_STORE_PASSWORD=your_password
#   MYAPP_UPLOAD_KEY_PASSWORD=your_password

# 3. Build
cd android
./gradlew assembleRelease

# Output:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## Expo → React Native CLI: What Changed

| Feature | Expo (before) | RN CLI (now) |
|---|---|---|
| Secure storage | `expo-secure-store` | `react-native-encrypted-storage` |
| Audio recording | `expo-av` | `react-native-audio-recorder-player` |
| File system | `expo-file-system` | `react-native-fs` |
| Permissions | Expo-managed | `react-native-permissions` |
| Notifications | None | `@notifee/react-native` |
| Call detection | None | `react-native-call-detection` |
| Entry point | Expo AppEntry | `index.js` → `AppRegistry` |
| Babel preset | `babel-preset-expo` | `@react-native/babel-preset` |
| Build system | Expo EAS | Gradle (native) |

---

## Call Detection Flow

```
Phone call ends
  └─► CallDetectionService detects state = 'Disconnected'
        └─► 1.5s delay (debounce)
              └─► NotificationService.showPostCallNotification()
                    └─► User taps "🎙 Record Summary"
                          └─► App opens → RecordScreen
```

---

## Permissions Required (Android)

| Permission | Purpose |
|---|---|
| `RECORD_AUDIO` | Microphone for audio recording |
| `READ_PHONE_STATE` | Detect call start/end |
| `POST_NOTIFICATIONS` | Show post-call notification (Android 13+) |
| `READ_EXTERNAL_STORAGE` | File access (API ≤ 32) |
| `WRITE_EXTERNAL_STORAGE` | File access (API ≤ 29) |
| `FOREGROUND_SERVICE` | Notifee scheduled alerts |
| `RECEIVE_BOOT_COMPLETED` | Reschedule reminders after reboot |
| `USE_EXACT_ALARM` | Precise deadline notifications |

---

## Future Features (Architecture Ready)

### Smart Deadline Reminders
Already implemented in `NotificationService.js`:
```js
import {scheduleSmartDeadlineReminders} from './src/services/NotificationService';
// Call after processing a conversation that has deadline entities:
await scheduleSmartDeadlineReminders(conversationId, actionText, deadlineDate);
// Fires at T-48h (warning) and T-24h (urgent alert)
```

### Analytics Dashboard
- Add `AnalyticsScreen.js` to `src/screens/`
- Use `useConversations` hook — already returns full entity data
- Aggregate `entities` arrays by `type` over time for trend charts

### Smart Search Filters
Already supported via `/api/search?q=SIP&type=SIP&minAmount=5000`

### MongoDB Full Integration
Already complete — `Conversation.js` and `User.js` models with text indexes.

---

## Troubleshooting

**Metro bundler can't find module**
```bash
npx react-native start --reset-cache
```

**Gradle build fails**
```bash
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

**Audio file not uploading on Android**
Ensure `file://` prefix is present:
```js
uri: Platform.OS === 'android' ? `file://${recordPath}` : recordPath
```

**Call detection not working**
- Check `READ_PHONE_STATE` is granted in device Settings → Apps → FinSense AI → Permissions
- Some OEM ROMs (MIUI, One UI) restrict call state listeners — use `CALL_STATE_IDLE`/`OFFHOOK` broadcast as fallback

**Notifee background actions not firing**
`notifee.onBackgroundEvent()` must be called before `AppRegistry.registerComponent()`.
It is registered at the top of `index.js` — do not move it.

**Network error on real device**
Set `BASE_URL` in `src/services/api.js` to your machine's LAN IP, not `localhost`.
Both device and machine must be on the same WiFi network.
