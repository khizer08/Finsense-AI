/**
 * StorageService
 * Replaces expo-secure-store.
 * Wraps react-native-encrypted-storage for secure AES-256 key/value storage.
 */
import EncryptedStorage from 'react-native-encrypted-storage';

export const StorageService = {
  async getItem(key) {
    try {
      return await EncryptedStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async setItem(key, value) {
    try {
      await EncryptedStorage.setItem(key, String(value));
    } catch (e) {
      console.warn('[StorageService] setItem failed:', e.message);
    }
  },

  async removeItem(key) {
    try {
      await EncryptedStorage.removeItem(key);
    } catch (e) {
      console.warn('[StorageService] removeItem failed:', e.message);
    }
  },

  async clear() {
    try {
      await EncryptedStorage.clear();
    } catch (e) {
      console.warn('[StorageService] clear failed:', e.message);
    }
  },
};
