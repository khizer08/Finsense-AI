# FinSense AI - How to install the apk (Quick Guide)

1. connect to USB cable and allow file transfer
2. enable developer option on device (ask gpt it will guide)
3. type "developer options" in mobile setting and enable 
"USB debugging" and "Install via USB"
4. run this command in project:-
PS C:\Dev\Finsense-AI> adb install -r C:\Dev\Finsense-AI\mobile\android\app\build\outputs\apk\debug\app-debug.apk
5. install in mobile


# FinSense AI - How to Run the Project (Quick Guide)

## 🚀 3 Terminals Required (Keep All Running)

### **Terminal 1: Metro Bundler (JavaScript Bundler)**
```bash
cd c:\Dev\Finsense-AI\mobile
npm start
```

**What to expect:**
```
Welcome to Metro v0.84.3
Dev server ready. Press Ctrl+C to exit.
```

✅ **Keep this running** - Your app's JavaScript is served from here

---

### **Terminal 2: Backend Server (Node.js API)**
```bash
cd c:\Dev\Finsense-AI\backend
npm start
```

**What to expect:**
```
✓ Connected to MongoDB
Server running on http://localhost:3000
```

✅ **Keep this running** - Your phone talks to this server

---

### **Terminal 3: React Native Run (Optional - for initial build only)**
```bash
cd c:\Dev\Finsense-AI\mobile
npx react-native run-android
```

⚠️ Only needed when **first building** the app. After that, just reload on your phone.

---

## 📱 On Your Phone

### **Reload the App**
1. **Shake your phone** (or swipe down from top)
2. Tap **"Reload JS"** from the menu

That's it! Your phone will reload JavaScript from Terminal 1 (Metro).

---

## ⚡ Quick Start Sequence

**Every time you restart:**

1. **Open Terminal 1:**
   ```bash
   cd c:\Dev\Finsense-AI\mobile
   npm start
   ```
   Wait for "Dev server ready" ✅

2. **Open Terminal 2:**
   ```bash
   cd c:\Dev\Finsense-AI\backend
   npm start
   ```
   Wait for "Server running" ✅

3. **On your phone:**
   - Shake device → **Reload JS**
   - Done! 🎉

---

## 🔌 USB Connection: YES, It's Required

### **Why?**
- Your phone needs to communicate with your computer
- Without USB, the app can't connect to the backend server
- ADB (Android Debug Bridge) requires USB for debugging

### **Minimum Requirements:**
1. ✅ USB cable connected to phone
2. ✅ Phone unlocked
3. ✅ Developer Mode enabled on phone
4. ✅ USB Debugging enabled in Developer Options
5. ✅ Computer added as "Trusted" on phone (first time)

### **Check Connection:**
```bash
adb devices
```

Should show:
```
List of devices attached
3C15A10011Q00000    device
```

If it says `offline`, unplug and replug USB.

---

## 📞 Port Forwarding (Already Done)

The app on your phone connects to your computer at:
```
http://192.168.0.6:3000
```

This is set in: `mobile/src/services/api.js`

---

## ✅ Daily Checklist

Every time you work on the project:

- [ ] USB cable connected to phone
- [ ] Terminal 1 running: `npm start` (Mobile)
- [ ] Terminal 2 running: `npm start` (Backend)
- [ ] Phone showing app (with Reload button ready)
- [ ] Backend showing "Server running"
- [ ] Metro showing "Dev server ready"

---

## 🐛 Troubleshooting

### "Network Error" on phone?
- [ ] Check Terminal 2 (Backend) is running
- [ ] Check phone is connected: `adb devices`
- [ ] Check API URL is correct: `http://192.168.0.6:3000` in api.js
- [ ] Reload app: Shake phone → Reload JS

### "Unable to load script" on phone?
- [ ] Check Terminal 1 (Metro) is running
- [ ] Check port 8081 is free: `Get-NetTCPConnection -LocalPort 8081`
- [ ] Reload app: Shake phone → Reload JS

### "USB device not recognized"?
- [ ] Try different USB port
- [ ] Unplug and replug
- [ ] Enable USB Debugging in phone settings
- [ ] Run: `adb devices`

### "Address already in use" error?
```bash
# Terminal 1 (Metro port 8081)
Get-NetTCPConnection -LocalPort 8081 | Stop-Process -Force

# Terminal 2 (Backend port 3000)
Get-NetTCPConnection -LocalPort 3000 | Stop-Process -Force
```

Then restart terminals.

---

## 📝 Your Device Info

**Your Computer IP**: `192.168.0.6`  
**Your Phone Device ID**: `3C15A10011Q00000`  
**Metro Port**: `8081`  
**Backend Port**: `3000`

---

## 🎯 What Each Terminal Does

| Terminal | Purpose | Port | Restart Command |
|----------|---------|------|-----------------|
| 1 (Metro) | Bundles your JavaScript code | 8081 | `cd c:\Dev\Finsense-AI\mobile && npm start` |
| 2 (Backend) | API server + database | 3000 | `cd c:\Dev\Finsense-AI\backend && npm start` |
| 3 (React Native) | Initial build/install | - | `cd c:\Dev\Finsense-AI\mobile && npx react-native run-android` |

---

## 💾 Save This File

Location: `c:\Dev\Finsense-AI\RUN_PROJECT.md`

Refer to this whenever you restart!

---

**🚀 Happy Developing!**
