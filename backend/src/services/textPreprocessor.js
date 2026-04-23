/**
 * textPreprocessor.js
 * Expands financial shorthand in transcripts before AI processing.
 *
 * Examples:
 *   "50k"    → "50,000"
 *   "2L"     → "200,000"
 *   "1.5cr"  → "15,000,000"
 *   "3 lakh" → "300,000"
 */

// ─── Multiplier shorthand (attached to numbers) ─────────────────────────────
const MULTIPLIER_RULES = [
  // "50k" / "50K" → 50 * 1000
  {pattern: /(\d+(?:\.\d+)?)\s*[kK]\b/g, multiplier: 1_000},
  // "2L" / "2l" → 2 * 100,000
  {pattern: /(\d+(?:\.\d+)?)\s*[lL]\b/g, multiplier: 100_000},
  // "2 lakh" / "2 lac" / "2 lakhs"
  {pattern: /(\d+(?:\.\d+)?)\s*(?:lakh|lac|lakhs?)\b/gi, multiplier: 100_000},
  // "1cr" / "1.5 crore" / "1 crores"
  {pattern: /(\d+(?:\.\d+)?)\s*(?:cr|crore|crores?)\b/gi, multiplier: 10_000_000},
];

// ─── Word-level abbreviations ────────────────────────────────────────────────
const WORD_REPLACEMENTS = [
  [/\bamt\b/gi, 'amount'],
  [/\btxn\b/gi, 'transaction'],
  [/\btxns\b/gi, 'transactions'],
  [/\byr\b/gi, 'year'],
  [/\byrs\b/gi, 'years'],
  [/\bmo\b/gi, 'month'],
  [/\bmos\b/gi, 'months'],
  [/\bpmt\b/gi, 'payment'],
  [/\bpmts\b/gi, 'payments'],
  [/\bbal\b/gi, 'balance'],
  [/\bint\b/gi, 'interest'],
  [/\bprin\b/gi, 'principal'],
  [/\bqtr\b/gi, 'quarter'],
  [/\bqtrs\b/gi, 'quarters'],
  [/\bapprox\b/gi, 'approximately'],
  [/\bgovt\b/gi, 'government'],
  [/\bmgmt\b/gi, 'management'],
  [/\bacct\b/gi, 'account'],
  [/\bmin\b/gi, 'minimum'],
  [/\bmax\b/gi, 'maximum'],
];

/**
 * Format a number with Indian-style comma separation.
 * 12345678 → "1,23,45,678" — BUT we use standard comma for simplicity:
 * 50000 → "50,000"
 */
function _formatNumber(n) {
  if (!Number.isFinite(n)) return String(n);
  return n.toLocaleString('en-IN');
}

/**
 * Expand financial shorthand in a transcript string.
 *
 * @param {string} text - Raw transcript text
 * @returns {string} Expanded text
 */
function expandShorthand(text) {
  if (!text || typeof text !== 'string') return text || '';

  let result = text;

  // 1. Expand multiplier shorthand (50k → 50,000)
  for (const {pattern, multiplier} of MULTIPLIER_RULES) {
    result = result.replace(pattern, (_, numStr) => {
      const num = parseFloat(numStr);
      if (!Number.isFinite(num)) return _;
      return _formatNumber(num * multiplier);
    });
  }

  // 2. Expand word abbreviations
  for (const [regex, replacement] of WORD_REPLACEMENTS) {
    result = result.replace(regex, replacement);
  }

  return result;
}

module.exports = {expandShorthand};
