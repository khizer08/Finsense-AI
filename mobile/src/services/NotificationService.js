/**
 * NotificationService
 * Uses @notifee/react-native for all local notifications.
 *
 * Features:
 *  - Post-call prompt: "Did you discuss finances?"
 *  - Deadline reminders (<48h / <24h)  [ready for future use]
 */
import notifee, {
  AndroidImportance,
  AndroidCategory,
  TriggerType,
} from '@notifee/react-native';

export const CHANNELS = {
  CALLS: 'finsense_calls',
  DEADLINES: 'finsense_deadlines',
};

// ─── Setup ──────────────────────────────────────────────────────────────────
export async function setupNotifications() {
  // Create notification channels (Android only; idempotent)
  await notifee.createChannel({
    id: CHANNELS.CALLS,
    name: 'Call Reminders',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
  });

  await notifee.createChannel({
    id: CHANNELS.DEADLINES,
    name: 'Deadline Alerts',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
  });
}

// ─── Post-call notification ─────────────────────────────────────────────────
/**
 * Show "Did you discuss finances in that call?" prompt.
 * Called automatically by CallDetectionService when a call ends.
 */
export async function showPostCallNotification() {
  await notifee.displayNotification({
    title: 'FinSense AI',
    body: 'Did you discuss finances in that call?',
    android: {
      channelId: CHANNELS.CALLS,
      category: AndroidCategory.RECOMMENDATION,
      importance: AndroidImportance.HIGH,
      smallIcon: 'ic_launcher',
      color: '#4F46E5',
      pressAction: {id: 'default'},
      actions: [
        {
          title: '🎙  Record Summary',
          pressAction: {id: 'record', launchActivity: 'default'},
        },
        {
          title: 'Ignore',
          pressAction: {id: 'ignore'},
        },
      ],
    },
  });
}

// ─── Deadline reminders ─────────────────────────────────────────────────────
/**
 * Schedule a deadline reminder notification.
 *
 * @param {string} id       - unique identifier (e.g. conversationId + '_48h')
 * @param {string} title    - notification title
 * @param {string} body     - notification body
 * @param {Date}   fireDate - exact Date when notification should fire
 */
export async function scheduleDeadlineReminder(id, title, body, fireDate) {
  const trigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: fireDate.getTime(),
    alarmManager: {allowWhileIdle: true},
  };

  await notifee.createTriggerNotification(
    {
      id,
      title,
      body,
      android: {
        channelId: CHANNELS.DEADLINES,
        importance: AndroidImportance.HIGH,
        smallIcon: 'ic_launcher',
        color: '#EF4444',
        pressAction: {id: 'default'},
      },
    },
    trigger,
  );
}

/**
 * Cancel a previously scheduled deadline reminder.
 * @param {string} id
 */
export async function cancelDeadlineReminder(id) {
  await notifee.cancelTriggerNotification(id);
}

/**
 * Schedule smart reminders for an action item deadline.
 * Fires at T-48h (warning) and T-24h (urgent).
 *
 * @param {string} conversationId
 * @param {string} actionText
 * @param {Date}   deadline
 */
export async function scheduleSmartDeadlineReminders(conversationId, actionText, deadline) {
  const now = Date.now();
  const deadlineMs = deadline.getTime();

  const minus48h = new Date(deadlineMs - 48 * 60 * 60 * 1000);
  const minus24h = new Date(deadlineMs - 24 * 60 * 60 * 1000);

  if (minus48h.getTime() > now) {
    await scheduleDeadlineReminder(
      `${conversationId}_48h`,
      '⏰ Deadline Reminder',
      `In 48 hours: ${actionText}`,
      minus48h,
    );
  }

  if (minus24h.getTime() > now) {
    await scheduleDeadlineReminder(
      `${conversationId}_24h`,
      '🚨 Urgent Deadline',
      `Due tomorrow: ${actionText}`,
      minus24h,
    );
  }
}
