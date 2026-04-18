/**
 * gemini.js
 * Structured financial extraction and plan generation using Google Gemini.
 */
const {GoogleGenerativeAI} = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

const VALID_ENTITY_TYPES = new Set([
  'SIP',
  'EMI',
  'loan',
  'budget',
  'deadline',
  'credit_card',
  'insurance',
  'tax',
  'bill',
  'investment',
  'other',
]);
const VALID_URGENCY = new Set(['critical', 'high', 'medium', 'low']);
const VALID_REMINDER_KINDS = new Set([
  'payment',
  'investment',
  'task',
  'goal',
  'plan_prompt',
  'other',
]);
const VALID_RECURRENCES = new Set([
  'once',
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
]);
const ENTITY_TYPE_ALIASES = {
  sip: 'SIP',
  emi: 'EMI',
  loan: 'loan',
  loans: 'loan',
  budget: 'budget',
  deadline: 'deadline',
  deadlines: 'deadline',
  credit_card: 'credit_card',
  creditcard: 'credit_card',
  'credit-card': 'credit_card',
  insurance: 'insurance',
  insurances: 'insurance',
  tax: 'tax',
  tax_payment: 'tax',
  'tax-payment': 'tax',
  bill: 'bill',
  bills: 'bill',
  investment: 'investment',
  investments: 'investment',
  other: 'other',
};
const REMINDER_KIND_ALIASES = {
  bill: 'payment',
  credit_card: 'payment',
  emi: 'payment',
  sip: 'investment',
  plan: 'plan_prompt',
  planning: 'plan_prompt',
  reminder: 'task',
};

const SYSTEM_PROMPT = `You are an expert financial conversation analyst specializing in deadlines, recurring obligations, budgeting follow-ups, and real-world reminders.
Analyze the following conversation transcript and return ONLY valid JSON.

Reference Rules:
1. Use the provided reference date/time and user timezone to resolve relative phrases like "within 10 days", "next month", "this Friday", "every 25th", or "for the next three months".
2. When a date is inferable, return an exact ISO 8601 timestamp with timezone offset, for example "2026-04-25T09:00:00+05:30".
3. If no exact time is mentioned, default to 09:00 local time.
4. For recurring obligations (monthly EMI, recurring SIP, weekly payment, quarterly tax), return the first upcoming due date and the recurrence pattern.
5. If the conversation suggests creating a financial plan, include a plan_prompt reminder template with planHorizonMonths set.
6. Do not invent facts. If a date truly cannot be resolved, set dueAt to null.

JSON format:
{
  "summary": "2-3 sentence summary focusing on financial obligations and deadlines",
  "entities": [
    {
      "type": "SIP|EMI|loan|budget|deadline|credit_card|insurance|tax|bill|investment|other",
      "value": "brief description",
      "amount": <number or null>,
      "deadline": "YYYY-MM-DD HH:MM or relative text or null",
      "urgency": "critical|high|medium|low|null"
    }
  ],
  "keywords": ["keyword1", "keyword2"],
  "actionItems": ["action item 1", "action item 2"],
  "paymentDeadlines": [
    {
      "description": "what payment is due",
      "dueDate": "exact date if mentioned or resolved, else null",
      "daysUntilDue": <number or null>,
      "requiresAction": true|false
    }
  ],
  "reminderTemplates": [
    {
      "kind": "payment|investment|task|goal|plan_prompt|other",
      "title": "short reminder title",
      "description": "clear reminder description",
      "dueAt": "ISO 8601 timestamp with timezone offset or null",
      "recurrence": "once|daily|weekly|monthly|quarterly|yearly",
      "amount": <number or null>,
      "currency": "INR|USD|etc",
      "requiresCompletionCheck": true|false,
      "planHorizonMonths": <number or null>,
      "dueLabel": "original wording like 'within 10 days' or '25th of every month'",
      "sourceText": "short original text span"
    }
  ]
}`;

const PLAN_PROMPT = `You are an expert personal finance coach. Create a practical financial plan from the conversation context.
Return ONLY valid JSON.

JSON format:
{
  "title": "short plan title",
  "summary": "2-3 sentence overview",
  "immediateActions": ["action 1", "action 2"],
  "monthlyMilestones": [
    {
      "monthIndex": 1,
      "title": "Month 1 title",
      "focus": "main focus for this month",
      "actions": ["action 1", "action 2"],
      "targetAmount": <number or null>,
      "successMetric": "how the user knows this month is successful"
    }
  ],
  "riskNotes": ["risk 1", "risk 2"]
}`;

async function extractInsights(transcript, context = {}) {
  if (!transcript || transcript.trim().length === 0) {
    return {
      summary: '',
      entities: [],
      keywords: [],
      actionItems: [],
      paymentDeadlines: [],
      reminderTemplates: [],
    };
  }

  if (!GEMINI_API_KEY) {
    throw new Error('Gemini is not configured on the backend.');
  }

  const prompt = [
    SYSTEM_PROMPT,
    '',
    `Reference date/time: ${context.referenceDate || new Date().toISOString()}`,
    `User timezone: ${context.timeZone || 'UTC'}`,
    `UTC offset: ${context.utcOffset || '+00:00'}`,
    '',
    'Transcript:',
    transcript,
  ].join('\n');

  const cleaned = await _generateAndClean(prompt, transcript.length);
  let parsed;

  try {
    parsed = _parseGeminiJson(cleaned);
  } catch {
    console.error('[Gemini] Failed to parse JSON response:', cleaned);
    return {
      summary: cleaned.slice(0, 300) || 'Gemini returned an empty summary.',
      entities: [],
      keywords: [],
      actionItems: [],
      paymentDeadlines: [],
      reminderTemplates: [],
    };
  }

  const paymentDeadlines = _sanitizePaymentDeadlines(parsed.paymentDeadlines);

  return {
    summary: _normalizeString(parsed.summary) || cleaned.slice(0, 300),
    entities: _sanitizeEntities(parsed.entities),
    keywords: _sanitizeStringList(parsed.keywords),
    actionItems: _sanitizeStringList(parsed.actionItems),
    paymentDeadlines,
    reminderTemplates: _sanitizeReminderTemplates(
      parsed.reminderTemplates,
      paymentDeadlines,
    ),
  };
}

async function generateFinancialPlan(conversation, options = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini is not configured on the backend.');
  }

  const horizonMonths = _normalizeInteger(options.horizonMonths) || 3;
  const reminderTitle = _normalizeString(options.reminderTitle) || 'Financial plan';
  const prompt = [
    PLAN_PROMPT,
    '',
    `Plan horizon (months): ${horizonMonths}`,
    `Plan request title: ${reminderTitle}`,
    `Conversation date: ${conversation.createdAt?.toISOString?.() || ''}`,
    `Conversation timezone: ${conversation.timeZone || 'UTC'}`,
    '',
    'Summary:',
    conversation.summary || '',
    '',
    'Transcript:',
    conversation.transcript || '',
    '',
    'Action items:',
    JSON.stringify(conversation.actionItems || []),
    '',
    'Reminder jobs:',
    JSON.stringify(
      (conversation.reminderJobs || []).map(reminder => ({
        title: reminder.title,
        dueAt: reminder.dueAt,
        recurrence: reminder.recurrence,
        amount: reminder.amount,
      })),
    ),
  ].join('\n');

  const cleaned = await _generateAndClean(prompt, (conversation.transcript || '').length);
  let parsed;

  try {
    parsed = _parseGeminiJson(cleaned);
  } catch {
    console.error('[Gemini] Failed to parse plan JSON:', cleaned);
    return {
      title: reminderTitle,
      summary: cleaned.slice(0, 500),
      horizonMonths,
      immediateActions: conversation.actionItems || [],
      monthlyMilestones: [],
      riskNotes: [],
    };
  }

  return _sanitizeFinancialPlan(parsed, {
    title: reminderTitle,
    horizonMonths,
  });
}

async function _generateAndClean(prompt, transcriptLength = 0) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({model: GEMINI_MODEL});

  let raw;
  try {
    console.log(`[Gemini] Calling ${GEMINI_MODEL} API with transcript length:`, transcriptLength);
    const result = await model.generateContent(prompt);
    raw = result.response.text().trim();
    console.log('[Gemini] API response received:', raw.substring(0, 120) + '...');
  } catch (err) {
    console.error('[Gemini] API error:', err);
    console.error('[Gemini] API key present:', !!GEMINI_API_KEY);
    throw new Error('Gemini API call failed: ' + (err.message || 'Unknown Gemini error'));
  }

  return raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function _sanitizeEntities(entities) {
  if (!Array.isArray(entities)) {
    return [];
  }

  return entities
    .map(entity => {
      const type = _normalizeEntityType(entity?.type);
      const value = _normalizeString(entity?.value);
      const amount = _normalizeNumber(entity?.amount);
      const deadline = _normalizeString(entity?.deadline) || null;
      const urgency = _normalizeUrgency(entity?.urgency);

      if (!value && amount === null && !deadline) {
        return null;
      }

      return {
        type,
        value,
        amount,
        deadline,
        urgency,
      };
    })
    .filter(Boolean);
}

function _sanitizePaymentDeadlines(paymentDeadlines) {
  if (!Array.isArray(paymentDeadlines)) {
    return [];
  }

  return paymentDeadlines
    .map(item => {
      const description = _normalizeString(item?.description);
      if (!description) {
        return null;
      }

      return {
        description,
        dueDate: _normalizeString(item?.dueDate) || null,
        daysUntilDue: _normalizeNumber(item?.daysUntilDue),
        requiresAction: _normalizeBoolean(item?.requiresAction, true),
      };
    })
    .filter(Boolean);
}

function _sanitizeReminderTemplates(reminderTemplates, paymentDeadlines) {
  const templates = Array.isArray(reminderTemplates) ? reminderTemplates : [];
  const normalizedTemplates = templates
    .map(template => {
      const title = _normalizeString(template?.title);
      const description = _normalizeString(template?.description) || title;
      const kind = _normalizeReminderKind(template?.kind);
      const dueAt = _normalizeString(template?.dueAt) || null;

      if (!title) {
        return null;
      }

      return {
        kind,
        title,
        description,
        dueAt,
        recurrence: _normalizeReminderRecurrence(template?.recurrence),
        amount: _normalizeNumber(template?.amount),
        currency: _normalizeString(template?.currency) || 'INR',
        requiresCompletionCheck:
          kind === 'plan_prompt'
            ? false
            : _normalizeBoolean(template?.requiresCompletionCheck, true),
        planHorizonMonths: _normalizeInteger(template?.planHorizonMonths),
        dueLabel: _normalizeString(template?.dueLabel),
        sourceText: _normalizeString(template?.sourceText),
      };
    })
    .filter(Boolean);

  if (normalizedTemplates.length > 0) {
    return normalizedTemplates;
  }

  return paymentDeadlines
    .filter(deadline => deadline.requiresAction)
    .map(deadline => ({
      kind: 'payment',
      title: deadline.description,
      description: deadline.description,
      dueAt: deadline.dueDate,
      recurrence: 'once',
      amount: null,
      currency: 'INR',
      requiresCompletionCheck: true,
      planHorizonMonths: null,
      dueLabel: deadline.dueDate || '',
      sourceText: deadline.description,
    }));
}

function _sanitizeFinancialPlan(plan, fallback = {}) {
  return {
    title: _normalizeString(plan?.title) || fallback.title || 'Financial plan',
    summary: _normalizeString(plan?.summary),
    horizonMonths: _normalizeInteger(plan?.horizonMonths) || fallback.horizonMonths || 3,
    immediateActions: _sanitizeStringList(plan?.immediateActions),
    monthlyMilestones: _sanitizeMonthlyMilestones(plan?.monthlyMilestones),
    riskNotes: _sanitizeStringList(plan?.riskNotes),
  };
}

function _sanitizeMonthlyMilestones(milestones) {
  if (!Array.isArray(milestones)) {
    return [];
  }

  return milestones
    .map((milestone, index) => {
      const monthIndex = _normalizeInteger(milestone?.monthIndex) || index + 1;
      const title = _normalizeString(milestone?.title);
      const focus = _normalizeString(milestone?.focus);
      const actions = _sanitizeStringList(milestone?.actions);

      if (!title && !focus && actions.length === 0) {
        return null;
      }

      return {
        monthIndex,
        title,
        focus,
        actions,
        targetAmount: _normalizeNumber(milestone?.targetAmount),
        successMetric: _normalizeString(milestone?.successMetric),
      };
    })
    .filter(Boolean);
}

function _sanitizeStringList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map(_normalizeString)
    .filter(Boolean);
}

function _parseGeminiJson(cleaned) {
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      throw err;
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function _normalizeEntityType(type) {
  const normalized = _normalizeString(type).toLowerCase().replace(/\s+/g, '_');
  const mapped = ENTITY_TYPE_ALIASES[normalized] || normalized;
  return VALID_ENTITY_TYPES.has(mapped) ? mapped : 'other';
}

function _normalizeReminderKind(kind) {
  const normalized = _normalizeString(kind).toLowerCase().replace(/\s+/g, '_');
  const mapped = REMINDER_KIND_ALIASES[normalized] || normalized;
  return VALID_REMINDER_KINDS.has(mapped) ? mapped : 'other';
}

function _normalizeReminderRecurrence(recurrence) {
  const normalized = _normalizeString(recurrence).toLowerCase();
  return VALID_RECURRENCES.has(normalized) ? normalized : 'once';
}

function _normalizeUrgency(value) {
  const normalized = _normalizeString(value).toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === 'urgent') {
    return 'critical';
  }

  return VALID_URGENCY.has(normalized) ? normalized : null;
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

module.exports = {
  extractInsights,
  generateFinancialPlan,
};
