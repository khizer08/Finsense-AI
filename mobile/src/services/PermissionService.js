/**
 * PermissionService
 * Centralised runtime permissions using react-native-permissions.
 */
import {Platform} from 'react-native';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';

// ─── Permission constants ────────────────────────────────────────────────────
export const AppPermissions = {
  MICROPHONE: Platform.select({
    android: PERMISSIONS.ANDROID.RECORD_AUDIO,
    ios: PERMISSIONS.IOS.MICROPHONE,
  }),
  PHONE_STATE: PERMISSIONS.ANDROID.READ_PHONE_STATE,
  READ_STORAGE: PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
  WRITE_STORAGE: PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
  NOTIFICATIONS: Platform.select({
    android: PERMISSIONS.ANDROID.POST_NOTIFICATIONS,
    ios: PERMISSIONS.IOS.NOTIFICATIONS,
  }),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
export async function checkPermission(permission) {
  const result = await check(permission);
  return result === RESULTS.GRANTED;
}

export async function requestPermission(permission) {
  const result = await request(permission);
  return result === RESULTS.GRANTED;
}

// ─── Named helpers ───────────────────────────────────────────────────────────
export const requestMicrophonePermission = () =>
  requestPermission(AppPermissions.MICROPHONE);

export const requestNotificationPermission = () =>
  requestPermission(AppPermissions.NOTIFICATIONS);

export async function requestStoragePermissions() {
  if (Platform.OS !== 'android') return true;
  const [read, write] = await Promise.all([
    requestPermission(AppPermissions.READ_STORAGE),
    requestPermission(AppPermissions.WRITE_STORAGE),
  ]);
  return read && write;
}
