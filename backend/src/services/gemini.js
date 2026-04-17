/**
 * gemini.js
 * Sends a transcript to Google Gemini and parses structured financial insights.
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

const SYSTEM_PROMPT = `You are an expert financial conversation analyst specializing in payment deadlines and financial obligations.
Analyze the following conversation transcript and extract structured financial information with high accuracy.

Return ONLY a valid JSON object — no markdown, no code fences, no extra text.

JSON format:
{
  "summary": "2-3 sentence summary of the conversation focusing on key financial topics and deadlines",
  "entities": [
    {
      "type": "SIP|EMI|loan|budget|deadline|credit_card|insurance|tax|bill|investment|other",
      "value": "brief description (e.g., 'EMI payment for home loan')",
      "amount": <number or null>,
      "deadline": "YYYY-MM-DD HH:MM or relative time (e.g., '15 days', '2026-04-25') or null",
      "urgency": "critical|high|medium|low|null"
    }
  ],
  "keywords": ["keyword1", "keyword2"],
  "actionItems": ["action item 1", "action item 2"],
  "paymentDeadlines": [
    {
      "description": "what payment is due",
      "dueDate": "exact date if mentioned or null",
      "daysUntilDue": <number or null>,
      "requiresAction": true|false
    }
  ]
}

Extraction Rules:
1. **Deadline Detection**: Extract ANY mentioned dates, durations ("by end of month", "in 2 weeks", etc.)
   - Convert relative times to approximate dates where possible
   - Mark if deadline is URGENT (<24h), HIGH (<48h), or lower priority
2. **Amount Extraction**: Extract all numeric values associated with financial items
   - Remove currency symbols; keep only the number
3. **Entity Types**: Classify as SIP, EMI, loan, credit_card, insurance, tax payment, bill, investment, budget, deadline, or other
4. **Payment Deadlines**: Extract and explicitly list all payment deadlines with urgency levels
5. **Action Items**: Focus on concrete, time-sensitive actions (e.g., "Pay ₹50,000 by 25th")
6. **Summary**: Highlight critical dates and payment obligations prominently
7. **Validation**: Do NOT invent information. If no deadline is mentioned, set to null.
8. **Fallback**: If transcript is non-financial or unclear, return short summary with empty arrays.`;

/**
 * Extract financial insights from a transcript using Gemini.
 *
 * @param {string} transcript
 * @returns {Promise<{summary, entities, keywords, actionItems, paymentDeadlines}>}
 */
async function extractInsights(transcript) {
  if (!transcript || transcript.trim().length === 0) {
    return {summary: '', entities: [], keywords: [], actionItems: [], paymentDeadlines: []};
  }

  if (!GEMINI_API_KEY) {
    throw new Error('Gemini is not configured on the backend.');
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({model: GEMINI_MODEL});

  const prompt = `${SYSTEM_PROMPT}\n\nTranscript:\n${transcript}`;

  let raw;
  try {
    console.log(`[Gemini] Calling ${GEMINI_MODEL} API with transcript length:`, transcript.length);
    const result = await model.generateContent(prompt);
    raw = result.response.text().trim();
    console.log('[Gemini] API response received:', raw.substring(0, 100) + '...');
  } catch (err) {
    console.error('[Gemini] API error:', err);
    console.error('[Gemini] API key present:', !!GEMINI_API_KEY);
    throw new Error('Gemini API call failed: ' + (err.message || 'Unknown Gemini error'));
  }

  // Strip accidental markdown fences
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

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
    };
  }

  const summary = _normalizeString(parsed.summary) || cleaned.slice(0, 300);
  const entities = _sanitizeEntities(parsed.entities);
  const keywords = _sanitizeStringList(parsed.keywords);
  const actionItems = _sanitizeStringList(parsed.actionItems);
  const paymentDeadlines = _sanitizePaymentDeadlines(
    parsed.paymentDeadlines || parsed.paymentDeadmines,
  );

  return {
    summary,
    entities,
    keywords,
    actionItems,
    paymentDeadlines,
  };
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

      if (!type || (!value && amount === null && !deadline)) {
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
        requiresAction: _normalizeBoolean(item?.requiresAction),
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
  } catch (_err) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      throw _err;
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function _normalizeEntityType(type) {
  const normalized = _normalizeString(type)
    .toLowerCase()
    .replace(/\s+/g, '_');

  const mapped = ENTITY_TYPE_ALIASES[normalized] || normalized;
  return VALID_ENTITY_TYPES.has(mapped) ? mapped : 'other';
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

function _normalizeBoolean(value) {
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

  return false;
}

module.exports = {extractInsights};
