/**
 * PermissionService
 * Centralised runtime permissions using react-native-permissions.
 * Also tracks onboarding completion.
 */
import {Platform, PermissionsAndroid} from 'react-native';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {StorageService} from './StorageService';

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

const ONBOARDING_COMPLETED_KEY = 'finsense_onboarding_completed';

// ─── Helpers ─────────────────────────────────────────────────────────────────
export async function checkPermission(permission) {
  try {
    const result = await check(permission);
    return result === RESULTS.GRANTED;
  } catch (error) {
    console.warn('[PermissionService] Check failed:', error.message);
    return false;
  }
}

export async function requestPermission(permission) {
  try {
    const result = await request(permission);
    return result === RESULTS.GRANTED;
  } catch (error) {
    console.warn('[PermissionService] Request failed:', error.message);
    return false;
  }
}

export async function checkPhoneStatePermission() {
  if (Platform.OS !== 'android') return false;
  try {
    const result = await check(AppPermissions.PHONE_STATE);
    return result === RESULTS.GRANTED;
  } catch (error) {
    console.warn('[PermissionService] Phone state check failed:', error.message);
    return false;
  }
}

export async function requestPhoneStatePermission() {
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
  } catch (error) {
    console.warn('[PermissionService] Phone state request failed:', error.message);
    return false;
  }
}

// ─── Named helpers ───────────────────────────────────────────────────────────
export const requestMicrophonePermission = () =>
  requestPermission(AppPermissions.MICROPHONE);

export const requestNotificationPermission = () =>
  requestPermission(AppPermissions.NOTIFICATIONS);

export async function requestStoragePermissions() {
  if (Platform.OS !== 'android') return true;
  try {
    const [read, write] = await Promise.all([
      requestPermission(AppPermissions.READ_STORAGE),
      requestPermission(AppPermissions.WRITE_STORAGE),
    ]);
    return read && write;
  } catch (error) {
    console.warn('[PermissionService] Storage request failed:', error.message);
    return false;
  }
}

// ─── Onboarding State ──────────────────────────────────────────────────────────
export async function hasCompletedOnboarding() {
  try {
    const value = await StorageService.getItem(ONBOARDING_COMPLETED_KEY);
    return value === 'true';
  } catch (error) {
    console.warn('[PermissionService] Onboarding check failed:', error.message);
    return false;
  }
}

export async function markOnboardingCompleted() {
  try {
    await StorageService.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  } catch (error) {
    console.warn('[PermissionService] Mark onboarding failed:', error.message);
  }
}

export async function resetOnboarding() {
  try {
    await StorageService.removeItem(ONBOARDING_COMPLETED_KEY);
  } catch (error) {
    console.warn('[PermissionService] Reset onboarding failed:', error.message);
  }
}
