const RECURRENCE_VALUES = new Set([
  'once',
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
]);
const REMINDER_KINDS = new Set([
  'payment',
  'investment',
  'task',
  'goal',
  'plan_prompt',
  'other',
]);
const DEFAULT_HORIZON_DAYS = Number(process.env.REMINDER_HORIZON_DAYS || 180);
const DEFAULT_CHECK_IN_DAYS = Number(process.env.REMINDER_CHECKIN_DAYS || 2);

function buildReminderJobs(reminderTemplates = [], context = {}) {
  if (!Array.isArray(reminderTemplates) || reminderTemplates.length === 0) {
    return [];
  }

  const referenceDate = _parseDate(context.referenceDate) || new Date();
  const horizonDate = _addDays(referenceDate, DEFAULT_HORIZON_DAYS);
  const utcOffset = _toUtcOffsetString(context.timezoneOffsetMinutes);
  const jobs = [];
  const seenKeys = new Set();

  reminderTemplates.forEach((template, templateIndex) => {
    const expandedJobs = _expandTemplate(template, {
      referenceDate,
      horizonDate,
      utcOffset,
      templateIndex,
    });

    expandedJobs.forEach(job => {
      const dedupeKey = [
        job.kind,
        job.seriesKey,
        job.title,
        job.dueAt.toISOString(),
        job.occurrenceIndex,
      ].join('|');

      if (!seenKeys.has(dedupeKey)) {
        seenKeys.add(dedupeKey);
        jobs.push(job);
      }
    });
  });

  return jobs.sort((left, right) => left.dueAt - right.dueAt);
}

function flattenReminderJobs(conversations = [], filterStatus = 'pending') {
  return conversations.flatMap(conversation => {
    const reminderJobs = Array.isArray(conversation.reminderJobs)
      ? conversation.reminderJobs
      : [];

    return reminderJobs
      .filter(reminder => !filterStatus || reminder.status === filterStatus)
      .map(reminder => ({
        id: String(reminder._id),
        conversationId: String(conversation._id),
        conversationCreatedAt: conversation.createdAt,
        conversationSummary: conversation.summary,
        kind: reminder.kind,
        title: reminder.title,
        description: reminder.description,
        dueAt: reminder.dueAt,
        checkInAt: reminder.checkInAt,
        status: reminder.status,
        requiresCompletionCheck: reminder.requiresCompletionCheck,
        recurrence: reminder.recurrence,
        occurrenceIndex: reminder.occurrenceIndex,
        seriesKey: reminder.seriesKey,
        amount: reminder.amount,
        currency: reminder.currency,
        dueLabel: reminder.dueLabel,
        sourceText: reminder.sourceText,
        planHorizonMonths: reminder.planHorizonMonths,
      }));
  });
}

function _expandTemplate(template, options) {
  const normalizedTemplate = _normalizeTemplate(template);
  if (!normalizedTemplate.title) {
    return [];
  }

  if (normalizedTemplate.kind === 'plan_prompt') {
    const dueAt =
      _parseFlexibleDate(
        normalizedTemplate.dueAt,
        options.utcOffset,
      ) || new Date(options.referenceDate);

    return [
      _createReminderJob(normalizedTemplate, dueAt, 1, options.templateIndex),
    ];
  }

  const firstDueAt = _parseFlexibleDate(
    normalizedTemplate.dueAt,
    options.utcOffset,
  );

  if (!firstDueAt) {
    return [];
  }

  const jobs = [];
  let occurrenceIndex = 1;
  let currentDueAt = new Date(firstDueAt);
  const recurrence = normalizedTemplate.recurrence;

  if (recurrence !== 'once') {
    while (
      currentDueAt < options.referenceDate &&
      occurrenceIndex < 60
    ) {
      currentDueAt = _advanceDate(currentDueAt, recurrence);
      occurrenceIndex += 1;
    }
  }

  if (recurrence === 'once') {
    jobs.push(
      _createReminderJob(
        normalizedTemplate,
        currentDueAt,
        occurrenceIndex,
        options.templateIndex,
      ),
    );
    return jobs;
  }

  while (currentDueAt <= options.horizonDate && occurrenceIndex < 60) {
    jobs.push(
      _createReminderJob(
        normalizedTemplate,
        currentDueAt,
        occurrenceIndex,
        options.templateIndex,
      ),
    );
    currentDueAt = _advanceDate(currentDueAt, recurrence);
    occurrenceIndex += 1;
  }

  return jobs;
}

function _createReminderJob(template, dueAt, occurrenceIndex, templateIndex) {
  const checkInAt = template.requiresCompletionCheck
    ? _addDays(dueAt, -DEFAULT_CHECK_IN_DAYS)
    : null;
  const seriesKey = `${template.kind}_${_slugify(template.title)}_${templateIndex}`;

  return {
    kind: template.kind,
    title: template.title,
    description: template.description || template.title,
    dueAt,
    checkInAt,
    status: 'pending',
    requiresCompletionCheck: template.requiresCompletionCheck,
    seriesKey,
    occurrenceIndex,
    recurrence: template.recurrence,
    amount: template.amount,
    currency: template.currency || 'INR',
    dueLabel: template.dueLabel || '',
    sourceText: template.sourceText || '',
    planHorizonMonths: template.planHorizonMonths,
  };
}

function _normalizeTemplate(template) {
  const kind = _normalizeKind(template?.kind);
  return {
    kind,
    title: _normalizeString(template?.title),
    description: _normalizeString(template?.description),
    dueAt: _normalizeString(template?.dueAt),
    recurrence: _normalizeRecurrence(template?.recurrence),
    amount: _normalizeNumber(template?.amount),
    currency: _normalizeString(template?.currency) || 'INR',
    dueLabel: _normalizeString(template?.dueLabel),
    sourceText: _normalizeString(template?.sourceText),
    planHorizonMonths: _normalizeInteger(template?.planHorizonMonths),
    requiresCompletionCheck:
      kind === 'plan_prompt' ? false : _normalizeBoolean(template?.requiresCompletionCheck, true),
  };
}

function _normalizeKind(kind) {
  const normalized = _normalizeString(kind).toLowerCase().replace(/\s+/g, '_');
  const aliases = {
    bill: 'payment',
    credit_card: 'payment',
    emi: 'payment',
    sip: 'investment',
    planning: 'plan_prompt',
    plan: 'plan_prompt',
    reminder: 'task',
  };
  const mapped = aliases[normalized] || normalized;
  return REMINDER_KINDS.has(mapped) ? mapped : 'other';
}

function _normalizeRecurrence(recurrence) {
  const normalized = _normalizeString(recurrence).toLowerCase();
  return RECURRENCE_VALUES.has(normalized) ? normalized : 'once';
}

function _parseFlexibleDate(value, utcOffset) {
  const normalized = _normalizeFlexibleDateString(value, utcOffset);
  return _parseDate(normalized);
}

function _normalizeFlexibleDateString(value, utcOffset) {
  const input = _normalizeString(value);
  if (!input) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return `${input}T09:00:00${utcOffset}`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) {
    return `${input}:00${utcOffset}`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(input)) {
    return `${input}${utcOffset}`;
  }

  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/.test(input)
  ) {
    return input.length === 16 ? `${input}:00` : input;
  }

  return input;
}

function _advanceDate(date, recurrence) {
  const next = new Date(date);

  switch (recurrence) {
    case 'daily':
      next.setUTCDate(next.getUTCDate() + 1);
      break;
    case 'weekly':
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case 'monthly':
      next.setUTCMonth(next.getUTCMonth() + 1);
      break;
    case 'quarterly':
      next.setUTCMonth(next.getUTCMonth() + 3);
      break;
    case 'yearly':
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      break;
    default:
      break;
  }

  return next;
}

function _addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function _parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function _slugify(value) {
  return _normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function _normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function _normalizeNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/[^0-9.-]/g, '');
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function _normalizeInteger(value) {
  const number = _normalizeNumber(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

function _normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === 'yes') {
      return true;
    }
    if (normalized === 'false' || normalized === 'no') {
      return false;
    }
  }

  return fallback;
}

function _toUtcOffsetString(offsetMinutes) {
  if (offsetMinutes === null || offsetMinutes === undefined || offsetMinutes === '') {
    return '+00:00';
  }

  const numericOffset = Number(offsetMinutes);
  if (!Number.isFinite(numericOffset)) {
    return '+00:00';
  }

  const totalMinutes = -numericOffset;
  const sign = totalMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(totalMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0');
  const minutes = String(absoluteMinutes % 60).padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}

module.exports = {
  buildReminderJobs,
  flattenReminderJobs,
};
