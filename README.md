# FinSense AI

FinSense AI is an Android financial memory assistant for capturing voice summaries after important calls and turning them into searchable conversation intelligence.

The current MVP flow is:

```text
Call ends
-> post-call notification
-> user records a voice summary
-> backend upload
-> Whisper CLI transcription
-> deterministic text preprocessing
-> Gemini extraction
-> MongoDB save
-> timeline, summary, tasks, and reminders
```

The separate Python FastAPI AI service is no longer part of the target runtime. Whisper now runs from the Node.js backend through the local Whisper CLI.

## Stack

| Area | Technology |
| --- | --- |
| Mobile | React Native CLI, React Navigation, Notifee |
| Recording | react-native-audio-recorder-player |
| Storage | react-native-encrypted-storage |
| API | Node.js, Express, JWT |
| Database | MongoDB, Mongoose |
| AI | Whisper CLI, ffmpeg, Gemini |

## Repository Layout

```text
.
├── backend/
│   ├── src/
│   │   ├── index.js
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
│   └── package.json
├── mobile/
│   ├── android/
│   ├── ios/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── navigation/
│   │   ├── screens/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── App.js
├── index.js
├── package.json
└── PROJECT_STATUS.md
```

## Prerequisites

- Node.js 18+ for the root app and backend
- Android Studio with Android SDK
- Java 17
- MongoDB local instance or Atlas connection string
- ffmpeg available on `PATH`
- Whisper CLI available on `PATH`
- Gemini API key

Check local AI tools:

```bash
ffmpeg -version
whisper --help
```

## Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/finsense
JWT_SECRET=replace-with-a-long-random-secret
GEMINI_API_KEY=replace-with-your-gemini-api-key
```

Start the backend:

```bash
npm start
```

Expected result:

```text
Connected to MongoDB
Server running on http://localhost:3000
```

Health check:

```bash
curl http://localhost:3000/health
```

## Mobile Setup

Install dependencies from the app folder that is being actively developed:

```bash
cd mobile
npm install
```

Update the API base URL in `mobile/src/services/api.js` if needed:

```text
Android emulator: http://10.0.2.2:3000
Physical device:  http://<your-computer-lan-ip>:3000
```

Start Metro:

```bash
cd mobile
npm start
```

Build and install on Android:

```bash
cd mobile
npx react-native run-android
```

## Development Run Flow

Use two terminals for the normal MVP development loop.

Terminal 1:

```bash
cd backend
npm start
```

Terminal 2:

```bash
cd mobile
npm start
```

Build the app when needed:

```bash
cd mobile
npx react-native run-android
```

After the app is installed, Metro reloads can usually be done from the Android developer menu.

## Android Device Setup

For a physical Android device:

1. Enable Developer Options.
2. Enable USB debugging.
3. Connect the device by USB and authorize the computer.
4. Confirm the device is visible:

```bash
adb devices
```

Install an existing debug APK manually:

```bash
adb install -r mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

## Required Android Permissions

The app should explain each permission before requesting it.

| Permission | Purpose |
| --- | --- |
| `POST_NOTIFICATIONS` | post-call prompts, processing alerts, summary-ready alerts, reminders |
| `RECORD_AUDIO` | voice summary recording |
| `READ_PHONE_STATE` | detecting when a call ends; the app does not record calls |
| Battery/background settings | improves reminder and notification reliability on OEM Android builds |

## API Notes

Do not introduce breaking changes to these existing surfaces:

- `POST /api/conversations/upload`
- JWT authentication flow
- MongoDB conversation collection
- Timeline and Summary screen response expectations

Current upload pipeline:

```text
multipart audio upload
-> temporary file save
-> Whisper CLI transcription
-> text preprocessing
-> Gemini structured extraction
-> Conversation save
-> existing response shape returned to mobile
```

## Verification Checklist

Before moving to the next implementation phase, verify the current phase still works:

- Backend starts successfully.
- MongoDB connection succeeds.
- `POST /api/conversations/upload` still accepts audio.
- Whisper transcription runs from the backend.
- Gemini extraction returns usable structured data.
- Conversations save and render in Timeline.
- Summary screen handles old and new conversations.
- Action item toggling persists.
- Notifications open the expected app screens.

Track detailed implementation status in [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Troubleshooting

Backend fails to start:

- Check `backend/.env`.
- Confirm MongoDB is running.
- Confirm port `3000` is free.

Whisper fails:

- Confirm `ffmpeg -version` works.
- Confirm `whisper --help` works.
- Check that the uploaded audio file is valid and non-empty.

Mobile cannot reach backend:

- Android emulator should use `10.0.2.2`.
- Physical devices need your computer LAN IP.
- Phone and computer must be on the same network.

Metro cache issues:

```bash
cd mobile
npm start -- --reset-cache
```

Android build issues:

```bash
cd mobile/android
gradlew clean
cd ..
npx react-native run-android
```
