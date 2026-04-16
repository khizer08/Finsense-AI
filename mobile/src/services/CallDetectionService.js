/**
 * CallDetectionService
 * Uses react-native-call-detection to watch phone call state on Android.
 *
 * When a call ends (state → 'Disconnected') it waits 1.5 s then fires
 * the post-call notification via NotificationService.
 *
 * Requires AndroidManifest permission: READ_PHONE_STATE
 */
import {Platform, PermissionsAndroid} from 'react-native';
import CallDetectionManager from 'react-native-call-detection';
import {showPostCallNotification} from './NotificationService';

let manager = null;
let postCallTimer = null;

// ─── Permission ─────────────────────────────────────────────────────────────
async function requestPhoneStatePermission() {
  if (Platform.OS !== 'android') return false;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      {
        title: 'Phone State Permission',
        message:
          'FinSense AI needs to know when calls end so it can prompt you ' +
          'to record a financial summary.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Deny',
        buttonPositive: 'Allow',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

// ─── Start ───────────────────────────────────────────────────────────────────
/**
 * Start listening for call state changes.
 * Called once in App.js on mount.
 *
 * @returns {() => void} cleanup / stop function
 */
export function startCallDetection() {
  if (Platform.OS !== 'android') {
    return () => {};
  }

  requestPhoneStatePermission().then(granted => {
    if (!granted) {
      console.warn('[CallDetection] READ_PHONE_STATE permission not granted.');
      return;
    }

    // Possible states: 'Disconnected' | 'Dialing' | 'Incoming' | 'Connected'
    manager = new CallDetectionManager(
      (state, _number) => {
        console.log('[CallDetection] state =', state);

        if (state === 'Disconnected') {
          // Clear any pending timer from a prior disconnect
          if (postCallTimer) clearTimeout(postCallTimer);

          postCallTimer = setTimeout(() => {
            showPostCallNotification().catch(e =>
              console.warn('[CallDetection] notification error:', e),
            );
          }, 1500);
        }
      },
      false, // don't request call log / phone numbers (avoids READ_CALL_LOG)
    );
  });

  // Return cleanup
  return () => {
    if (postCallTimer) clearTimeout(postCallTimer);
    if (manager) {
      manager.dispose();
      manager = null;
    }
  };
}
