/**
 * gemini.js
 * Sends a transcript to Google Gemini and parses structured financial insights.
 */
const {GoogleGenerativeAI} = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are a financial conversation analyst.
Analyze the following conversation transcript and extract structured financial information.

Return ONLY a valid JSON object — no markdown, no code fences, no extra text.

JSON format:
{
  "summary": "2-3 sentence summary of the conversation",
  "entities": [
    {
      "type": "SIP|EMI|loan|budget|deadline|other",
      "value": "brief description",
      "amount": <number or null>
    }
  ],
  "keywords": ["keyword1", "keyword2"],
  "actionItems": ["action item 1", "action item 2"]
}

Rules:
- "entities" must only include items with clear financial relevance.
- "amount" should be a number (no currency symbol). Use null if no amount is mentioned.
- "actionItems" are concrete next steps mentioned or implied in the conversation.
- If the transcript contains no financial content, return empty arrays and a short summary.
- Do NOT invent information not present in the transcript.`;

/**
 * Extract financial insights from a transcript using Gemini.
 *
 * @param {string} transcript
 * @returns {Promise<{summary, entities, keywords, actionItems}>}
 */
async function extractInsights(transcript) {
  if (!transcript || transcript.trim().length === 0) {
    return {summary: '', entities: [], keywords: [], actionItems: []};
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
    };
  }

  return {
    summary: parsed.summary || '',
    entities: Array.isArray(parsed.entities) ? parsed.entities : [],
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
  };
}

module.exports = {extractInsights};
