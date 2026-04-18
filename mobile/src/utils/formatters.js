/**
 * formatters.js
 * Shared utility functions for display formatting.
 */

/**
 * Format milliseconds to MM:SS string.
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format a Date to a human-readable date string (en-IN locale).
 * @param {string|Date} dateInput
 * @returns {string}  e.g. "Monday, 14 April 2026"
 */
export function formatFullDate(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format a Date to short date string.
 * @param {string|Date} dateInput
 * @returns {string}  e.g. "14 Apr 2026"
 */
export function formatShortDate(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a Date to time string.
 * @param {string|Date} dateInput
 * @returns {string}  e.g. "09:45 AM"
 */
export function formatTime(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a number as Indian Rupees.
 * @param {number} amount
 * @returns {string}  e.g. "₹1,50,000"
 */
export function formatRupees(amount) {
  if (amount == null) return '';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

/**
 * Format recording duration in minutes from seconds.
 * @param {number} seconds
 * @returns {string}  e.g. "2 min"
 */
export function formatRecordingLength(seconds) {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.ceil(seconds / 60);
  return `${mins} min`;
}

/**
 * Format a Date to short date and time string.
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function formatDateTime(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format reminder status into readable copy.
 * @param {string} status
 * @returns {string}
 */
export function formatReminderStatus(status) {
  switch (status) {
    case 'done':
      return 'Completed';
    case 'dismissed':
      return 'Dismissed';
    default:
      return 'Pending';
  }
}

/**
 * Truncate a string with ellipsis.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(str, maxLen = 80) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen).trimEnd() + '…';
}
