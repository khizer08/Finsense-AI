/**
 * NotificationService
 * Uses @notifee/react-native for all local notifications.
 *
 * Features:
 *  - Post-call prompt: "Did you discuss finances?"
 *  - Deadline reminders with urgency levels (<48h / <24h)
 */
import notifee, {
  AndroidImportance,
  AndroidCategory,
  TriggerType,
} from '@notifee/react-native';

export const CHANNELS = {
  CALLS: 'finsense_calls',
  DEADLINES_URGENT: 'finsense_deadlines_urgent',  // <24h
  DEADLINES_WARNING: 'finsense_deadlines_warning', // <48h
  DEADLINES_INFO: 'finsense_deadlines_info',      // >48h
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
    id: CHANNELS.DEADLINES_URGENT,
    name: 'Urgent Payment Deadlines',
    importance: AndroidImportance.MAX,
    vibration: true,
    sound: 'default',
    lightColor: '#EF4444', // Red
  });

  await notifee.createChannel({
    id: CHANNELS.DEADLINES_WARNING,
    name: 'Payment Deadline Warnings',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
    lightColor: '#F97316', // Orange
  });

  await notifee.createChannel({
    id: CHANNELS.DEADLINES_INFO,
    name: 'Payment Deadline Information',
    importance: AndroidImportance.DEFAULT,
    vibration: false,
    sound: 'default',
  });
}

// ─── Post-call notification with storage prompt ────────────────────────────
/**
 * Show "Did you discuss finances in that call?" prompt with storage options.
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

// ─── Deadline reminders with urgency levels ──────────────────────────────────
/**
 * Schedule deadline reminder notifications based on urgency.
 * Urgency is determined by time until due date:
 * - <24h:  CRITICAL (red, max importance)
 * - <48h:  HIGH (orange, high importance)  
 * - >=48h: INFO (blue, default importance)
 *
 * @param {Object} paymentDeadline - {description, dueDate, daysUntilDue, requiresAction}
 * @param {string} conversationId - Unique ID for tracking
 * @returns {Promise<void>}
 */
export async function scheduleDeadlineNotification(paymentDeadline, conversationId) {
  if (!paymentDeadline.requiresAction) {
    console.log('[Notifications] Skipping non-actionable deadline:', paymentDeadline.description);
    return;
  }

  const {description, daysUntilDue} = paymentDeadline;
  
  if (daysUntilDue === null || daysUntilDue === undefined) {
    console.log('[Notifications] Cannot schedule - daysUntilDue is missing:', description);
    return;
  }

  // Determine urgency and channel
  let channelId, title, bodyPrefix, color;
  
  if (daysUntilDue < 1) {
    // Overdue
    channelId = CHANNELS.DEADLINES_URGENT;
    title = '🚨 OVERDUE PAYMENT';
    bodyPrefix = 'URGENT:';
    color = '#DC2626'; // Dark red
  } else if (daysUntilDue < 1) {
    // <24h
    channelId = CHANNELS.DEADLINES_URGENT;
    title = '⚠️  Payment Due Today';
    bodyPrefix = 'Due TODAY:';
    color = '#EF4444'; // Red
  } else if (daysUntilDue <= 2) {
    // <48h
    channelId = CHANNELS.DEADLINES_WARNING;
    title = '⏰ Payment Due Soon';
    bodyPrefix = `Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}:`;
    color = '#F97316'; // Orange
  } else {
    // >=48h
    channelId = CHANNELS.DEADLINES_INFO;
    title = '📌 Payment Reminder';
    bodyPrefix = `Due in ${daysUntilDue} days:`;
    color = '#3B82F6'; // Blue
  }

  // Schedule notification to show immediately
  const notificationId = `${conversationId}_${description.replace(/\s+/g, '_').substring(0, 30)}`;
  
  await notifee.displayNotification({
    id: notificationId,
    title,
    body: `${bodyPrefix} ${description}`,
    android: {
      channelId,
      smallIcon: 'ic_launcher',
      color,
      pressAction: {id: 'default'},
      importance: channelId === CHANNELS.DEADLINES_URGENT ? AndroidImportance.MAX : 
                   channelId === CHANNELS.DEADLINES_WARNING ? AndroidImportance.HIGH :
                   AndroidImportance.DEFAULT,
      actions: [
        {
          title: '✓ Mark Done',
          pressAction: {id: 'mark_done'},
        },
        {
          title: 'Snooze',
          pressAction: {id: 'snooze'},
        },
      ],
    },
  });

  console.log('[Notifications] Scheduled deadline notification:', {
    id: notificationId,
    urgency: channelId,
    daysUntilDue,
    description,
  });
}
}


/**
 * Cancel a previously scheduled deadline reminder.
 * @param {string} id
 */
export async function cancelDeadlineReminder(id) {
  await notifee.cancelNotification(id);
}

/**
 * Legacy function - kept for backward compatibility
 * Use scheduleDeadlineNotification() instead for new code
 */
export async function scheduleSmartDeadlineReminders(conversationId, actionText, deadline) {
  console.warn('[Notifications] scheduleSmartDeadlineReminders is deprecated. Use scheduleDeadlineNotification()');
  
  const now = new Date();
  const daysUntilDue = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDue >= 0) {
    await scheduleDeadlineNotification(
      {
        description: actionText,
        dueDate: deadline.toISOString(),
        daysUntilDue,
        requiresAction: true,
      },
      conversationId,
    );
  }
}
