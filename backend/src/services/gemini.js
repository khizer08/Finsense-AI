/**
 * gemini.js
 * Sends a transcript to Google Gemini and parses structured financial insights.
 */
const {GoogleGenerativeAI} = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
  "paymentDeadmines": [
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

  const model = genAI.getGenerativeModel({model: 'gemini-2.5-flash-lite'});

  const prompt = `${SYSTEM_PROMPT}\n\nTranscript:\n${transcript}`;

  let raw;
  try {
    console.log('[Gemini] Calling gemini-2.5-flash-lite API with transcript length:', transcript.length);
    const result = await model.generateContent(prompt);
    raw = result.response.text().trim();
    console.log('[Gemini] API response received:', raw.substring(0, 100) + '...');
  } catch (err) {
    console.error('[Gemini] API error:', err);
    console.error('[Gemini] API key present:', !!process.env.GEMINI_API_KEY);
    throw new Error('Gemini API call failed: ' + err.message);
  }

  // Strip accidental markdown fences
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error('[Gemini] Failed to parse JSON response:', cleaned);
    // Graceful fallback — return raw text as summary
    return {
      summary: cleaned.slice(0, 300),
      entities: [],
      keywords: [],
      actionItems: [],
      paymentDeadlines: [],
    };
  }

  return {
    summary: parsed.summary || '',
    entities: Array.isArray(parsed.entities) ? parsed.entities : [],
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
    paymentDeadlines: Array.isArray(parsed.paymentDeadmines) ? parsed.paymentDeadmines : [],
  };
}

module.exports = {extractInsights};
