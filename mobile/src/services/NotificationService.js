import notifee, {
  AlarmType,
  AndroidCategory,
  AndroidImportance,
  TriggerType,
} from '@notifee/react-native';
import api from './api';
import {StorageService} from './StorageService';

const PENDING_ROUTE_KEY = 'pending_notification_route';
const FUTURE_TRIGGER_BUFFER_MS = 15 * 1000;
const OVERDUE_DELAY_MS = 24 * 60 * 60 * 1000;

export const CHANNELS = {
  CALLS: 'finsense_calls',
  REMINDER_CHECKIN: 'finsense_reminder_checkin',
  REMINDER_DUE: 'finsense_reminder_due',
  REMINDER_OVERDUE: 'finsense_reminder_overdue',
  PLAN_PROMPTS: 'finsense_plan_prompts',
};

export const NOTIFICATION_ACTIONS = {
  RECORD: 'record',
  IGNORE: 'ignore',
  REMINDER_DONE: 'reminder_done',
  REMINDER_PENDING: 'reminder_pending',
  OPEN_SUMMARY: 'open_summary',
  OPEN_PLAN: 'open_plan',
  PLAN_LATER: 'plan_later',
};

export async function setupNotifications() {
  await notifee.createChannel({
    id: CHANNELS.CALLS,
    name: 'Call Reminders',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
  });

  await notifee.createChannel({
    id: CHANNELS.REMINDER_CHECKIN,
    name: 'Task Check-ins',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
  });

  await notifee.createChannel({
    id: CHANNELS.REMINDER_DUE,
    name: 'Upcoming Due Tasks',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
  });

  await notifee.createChannel({
    id: CHANNELS.REMINDER_OVERDUE,
    name: 'Overdue Tasks',
    importance: AndroidImportance.MAX,
    vibration: true,
    sound: 'default',
  });

  await notifee.createChannel({
    id: CHANNELS.PLAN_PROMPTS,
    name: 'Planning Prompts',
    importance: AndroidImportance.DEFAULT,
    vibration: true,
    sound: 'default',
  });
}

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
      pressAction: {id: NOTIFICATION_ACTIONS.RECORD, launchActivity: 'default'},
      actions: [
        {
          title: 'Record Summary',
          pressAction: {id: NOTIFICATION_ACTIONS.RECORD, launchActivity: 'default'},
        },
        {
          title: 'Ignore',
          pressAction: {id: NOTIFICATION_ACTIONS.IGNORE},
        },
      ],
    },
  });
}

export async function syncReminderSchedules() {
  try {
    const response = await api.get('/api/reminders?status=pending');
    const reminders = Array.isArray(response.data?.reminders)
      ? response.data.reminders
      : [];

    for (const reminder of reminders) {
      await scheduleReminderJob(reminder);
    }

    return reminders;
  } catch (error) {
    console.warn('[Notifications] Failed to sync reminders:', error.message);
    return [];
  }
}

export async function scheduleConversationReminders(conversation) {
  const conversationId = conversation?._id;
  const reminderJobs = Array.isArray(conversation?.reminderJobs)
    ? conversation.reminderJobs
    : [];

  for (const reminder of reminderJobs) {
    await scheduleReminderJob({
      ...reminder,
      id: reminder.id || reminder._id,
      conversationId,
    });
  }
}

export async function scheduleReminderJob(reminderJob) {
  const reminder = _normalizeReminder(reminderJob);
  if (!reminder.id || !reminder.conversationId) {
    return;
  }

  await cancelReminderNotifications(reminder.id);

  if (reminder.status !== 'pending') {
    return;
  }

  if (reminder.kind === 'plan_prompt') {
    await _schedulePlanPrompt(reminder);
    return;
  }

  await _scheduleTaskCheckIn(reminder);
  await _scheduleDueReminder(reminder);
  await _scheduleOverdueReminder(reminder);
}

export async function cancelReminderNotifications(reminderId) {
  const ids = Object.values(_buildNotificationIds(reminderId));

  await notifee.cancelTriggerNotifications(ids).catch(() => {});
  await Promise.all(ids.map(id => notifee.cancelNotification(id).catch(() => {})));
}

export async function updateReminderStatus(reminderId, status) {
  const response = await api.patch(`/api/reminders/${reminderId}`, {status});

  if (status === 'done' || status === 'dismissed') {
    await cancelReminderNotifications(reminderId);
  }

  return response.data;
}

export async function storePendingNotificationRoute(route) {
  await StorageService.setItem(PENDING_ROUTE_KEY, JSON.stringify(route));
}

export async function consumePendingNotificationRoute() {
  const raw = await StorageService.getItem(PENDING_ROUTE_KEY);
  if (!raw) {
    return null;
  }

  await StorageService.removeItem(PENDING_ROUTE_KEY);

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function handleNotificationAction(detail, options = {}) {
  const actionId = detail?.pressAction?.id || detail?.notification?.pressAction?.id || 'default';
  const data = detail?.notification?.data || {};
  const reminderId = data.reminderId;

  if (actionId === NOTIFICATION_ACTIONS.IGNORE) {
    if (detail?.notification?.id) {
      await notifee.cancelNotification(detail.notification.id).catch(() => {});
    }
    return null;
  }

  if (actionId === NOTIFICATION_ACTIONS.RECORD) {
    return {screen: 'Main', params: {screen: 'Record'}};
  }

  if (actionId === NOTIFICATION_ACTIONS.REMINDER_DONE && reminderId) {
    await updateReminderStatus(reminderId, 'done').catch(error => {
      console.warn('[Notifications] Failed to mark reminder done:', error.message);
    });
    return null;
  }

  if (actionId === NOTIFICATION_ACTIONS.PLAN_LATER && reminderId) {
    return _buildConversationRoute(data.conversationId, {
      promptPlanReminderId: reminderId,
    });
  }

  if (
    actionId === NOTIFICATION_ACTIONS.OPEN_PLAN ||
    actionId === NOTIFICATION_ACTIONS.OPEN_SUMMARY ||
    actionId === NOTIFICATION_ACTIONS.REMINDER_PENDING ||
    actionId === 'default'
  ) {
    return _buildConversationRoute(data.conversationId, {
      promptPlanReminderId:
        data.kind === 'plan_prompt' || actionId === NOTIFICATION_ACTIONS.OPEN_PLAN
          ? reminderId
          : undefined,
    });
  }

  if (options.persistRoute && data.conversationId) {
    const route = _buildConversationRoute(data.conversationId, {
      promptPlanReminderId: data.kind === 'plan_prompt' ? reminderId : undefined,
    });

    if (route) {
      await storePendingNotificationRoute(route);
    }
  }

  return null;
}

export async function scheduleDeadlineNotification(paymentDeadline, conversationId) {
  const dueAt = paymentDeadline?.dueDate ? new Date(paymentDeadline.dueDate) : null;
  if (!dueAt || Number.isNaN(dueAt.getTime())) {
    return;
  }

  await scheduleReminderJob({
    id: `legacy_${conversationId}_${String(paymentDeadline.description || 'task')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')}`,
    conversationId,
    kind: 'payment',
    title: paymentDeadline.description || 'Payment reminder',
    description: paymentDeadline.description || 'Payment reminder',
    dueAt: dueAt.toISOString(),
    checkInAt: new Date(dueAt.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    requiresCompletionCheck: paymentDeadline.requiresAction !== false,
  });
}

export async function scheduleSmartDeadlineReminders(
  conversationId,
  actionText,
  deadline,
) {
  const dueAt = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(dueAt.getTime())) {
    return;
  }

  await scheduleDeadlineNotification(
    {
      description: actionText,
      dueDate: dueAt.toISOString(),
      requiresAction: true,
    },
    conversationId,
  );
}

async function _scheduleTaskCheckIn(reminder) {
  if (!reminder.requiresCompletionCheck || !reminder.checkInAtMs) {
    return;
  }

  if (reminder.checkInAtMs <= Date.now() + FUTURE_TRIGGER_BUFFER_MS) {
    return;
  }

  await notifee.createTriggerNotification(
    _buildTaskNotification(reminder, 'checkin'),
    _buildTimestampTrigger(reminder.checkInAtMs),
  );
}

async function _scheduleDueReminder(reminder) {
  if (reminder.dueAtMs <= Date.now() + FUTURE_TRIGGER_BUFFER_MS) {
    return;
  }

  await notifee.createTriggerNotification(
    _buildTaskNotification(reminder, 'due'),
    _buildTimestampTrigger(reminder.dueAtMs),
  );
}

async function _scheduleOverdueReminder(reminder) {
  const overdueAtMs = reminder.dueAtMs + OVERDUE_DELAY_MS;
  if (overdueAtMs <= Date.now() + FUTURE_TRIGGER_BUFFER_MS) {
    return;
  }

  await notifee.createTriggerNotification(
    _buildTaskNotification(reminder, 'overdue'),
    _buildTimestampTrigger(overdueAtMs),
  );
}

async function _schedulePlanPrompt(reminder) {
  if (reminder.dueAtMs <= Date.now() + FUTURE_TRIGGER_BUFFER_MS) {
    return;
  }

  const notification = _buildPlanPromptNotification(reminder);
  await notifee.createTriggerNotification(
    notification,
    _buildTimestampTrigger(reminder.dueAtMs),
  );
}

function _buildTaskNotification(reminder, stage) {
  const ids = _buildNotificationIds(reminder.id);
  const channelId =
    stage === 'overdue'
      ? CHANNELS.REMINDER_OVERDUE
      : stage === 'checkin'
      ? CHANNELS.REMINDER_CHECKIN
      : CHANNELS.REMINDER_DUE;
  const title =
    stage === 'checkin'
      ? 'Did you complete this task?'
      : stage === 'overdue'
      ? 'Task still pending'
      : 'Task due now';
  const bodyPrefix =
    stage === 'checkin'
      ? 'Due soon'
      : stage === 'overdue'
      ? 'Still pending'
      : 'Due today';

  return {
    id: ids[stage],
    title,
    body: `${bodyPrefix}: ${reminder.title} (${_formatDateTime(reminder.dueAt)})`,
    data: {
      reminderId: reminder.id,
      conversationId: reminder.conversationId,
      kind: reminder.kind,
      stage,
    },
    android: {
      channelId,
      category: AndroidCategory.REMINDER,
      smallIcon: 'ic_launcher',
      color: stage === 'overdue' ? '#DC2626' : '#4F46E5',
      importance:
        stage === 'overdue' ? AndroidImportance.MAX : AndroidImportance.HIGH,
      pressAction: {
        id: NOTIFICATION_ACTIONS.OPEN_SUMMARY,
        launchActivity: 'default',
      },
      actions: [
        {
          title: 'Yes, completed',
          pressAction: {id: NOTIFICATION_ACTIONS.REMINDER_DONE},
        },
        {
          title: 'Not yet',
          pressAction: {
            id: NOTIFICATION_ACTIONS.REMINDER_PENDING,
            launchActivity: 'default',
          },
        },
      ],
    },
  };
}

function _buildPlanPromptNotification(reminder) {
  const ids = _buildNotificationIds(reminder.id);
  const horizonLabel = reminder.planHorizonMonths
    ? `${reminder.planHorizonMonths}-month`
    : 'multi-step';

  return {
    id: ids.plan,
    title: 'Should we create a plan?',
    body: `Would you like FinSense AI to create a ${horizonLabel} plan for "${reminder.title}"?`,
    data: {
      reminderId: reminder.id,
      conversationId: reminder.conversationId,
      kind: reminder.kind,
    },
    android: {
      channelId: CHANNELS.PLAN_PROMPTS,
      category: AndroidCategory.RECOMMENDATION,
      smallIcon: 'ic_launcher',
      color: '#4F46E5',
      importance: AndroidImportance.DEFAULT,
      pressAction: {
        id: NOTIFICATION_ACTIONS.OPEN_PLAN,
        launchActivity: 'default',
      },
      actions: [
        {
          title: 'Create plan',
          pressAction: {
            id: NOTIFICATION_ACTIONS.OPEN_PLAN,
            launchActivity: 'default',
          },
        },
        {
          title: 'Later',
          pressAction: {
            id: NOTIFICATION_ACTIONS.PLAN_LATER,
            launchActivity: 'default',
          },
        },
      ],
    },
  };
}

function _buildTimestampTrigger(timestamp) {
  return {
    type: TriggerType.TIMESTAMP,
    timestamp,
    alarmManager: {
      type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
    },
  };
}

function _buildNotificationIds(reminderId) {
  return {
    checkin: `reminder_${reminderId}_checkin`,
    due: `reminder_${reminderId}_due`,
    overdue: `reminder_${reminderId}_overdue`,
    plan: `reminder_${reminderId}_plan`,
  };
}

function _buildConversationRoute(conversationId, extraParams = {}) {
  if (!conversationId) {
    return null;
  }

  return {
    screen: 'Summary',
    params: {
      conversationId,
      ...extraParams,
    },
  };
}

function _normalizeReminder(reminderJob) {
  const id = String(reminderJob?.id || reminderJob?._id || '');
  const dueAt = new Date(reminderJob?.dueAt);
  const checkInAt = reminderJob?.checkInAt ? new Date(reminderJob.checkInAt) : null;

  return {
    id,
    conversationId: String(reminderJob?.conversationId || ''),
    kind: reminderJob?.kind || 'task',
    title: reminderJob?.title || reminderJob?.description || 'Task reminder',
    description: reminderJob?.description || reminderJob?.title || '',
    status: reminderJob?.status || 'pending',
    requiresCompletionCheck: reminderJob?.requiresCompletionCheck !== false,
    dueAt,
    dueAtMs: Number.isNaN(dueAt.getTime()) ? 0 : dueAt.getTime(),
    checkInAt,
    checkInAtMs:
      checkInAt && !Number.isNaN(checkInAt.getTime()) ? checkInAt.getTime() : 0,
    planHorizonMonths: reminderJob?.planHorizonMonths || null,
  };
}

function _formatDateTime(date) {
  const value = new Date(date);
  return value.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
