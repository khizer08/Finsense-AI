/**
 * whisper.js
 * Transcribes audio via the Whisper CLI (runs locally, no separate Python server).
 *
 * Falls back to placeholder transcript when:
 *   - The file is a test/placeholder recording
 *   - Whisper CLI is not installed
 */
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const PLACEHOLDER_MAX_BYTES = 1024;
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'base';
const WHISPER_TIMEOUT_MS = 180_000; // 3 minutes

/**
 * Transcribe an audio file using the Whisper CLI.
 *
 * @param {string} filePath  - absolute path to the audio file
 * @returns {Promise<{transcript: string, language: string, duration: number}>}
 */
async function transcribeAudio(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Audio file not found: ${filePath}`);
  }

  if (_isPlaceholderAudio(filePath)) {
    console.log('[Whisper] Placeholder recording detected, returning mock transcript');
    return {
      transcript:
        '[Test Recording] This is a test meeting transcript. We discussed Q1 financial targets, budget allocation, and team onboarding.',
      language: 'en',
      duration: 32.5,
    };
  }

  // Determine output directory (same folder as the audio file)
  const outputDir = path.dirname(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));

  console.log(`[Whisper] Transcribing: ${filePath} (model: ${WHISPER_MODEL})`);

  try {
    await _runWhisperCli(filePath, outputDir);
  } catch (err) {
    console.error('[Whisper] CLI error:', err.message);
    throw new Error('Whisper transcription failed: ' + err.message);
  }

  // Read the generated .txt file
  const txtPath = path.join(outputDir, `${baseName}.txt`);
  let transcript = '';

  if (fs.existsSync(txtPath)) {
    transcript = fs.readFileSync(txtPath, 'utf8').trim();
    // Clean up generated files
    _cleanupWhisperOutputs(outputDir, baseName);
  }

  if (!transcript) {
    console.warn('[Whisper] Empty transcript returned');
    transcript = '[Inaudible or silent recording]';
  }

  // Try to read duration from the .json output if available
  const duration = _readDurationFromJson(outputDir, baseName);

  console.log(
    `[Whisper] Done: ${transcript.length} chars | duration=${duration}s`,
  );

  return {
    transcript,
    language: 'en',
    duration,
  };
}

/**
 * Run the whisper CLI as a child process.
 */
function _runWhisperCli(filePath, outputDir) {
  return new Promise((resolve, reject) => {
    const args = [
      filePath,
      '--model', WHISPER_MODEL,
      '--output_dir', outputDir,
      '--output_format', 'txt',
      '--fp16', 'False',
      '--verbose', 'False',
    ];

    const proc = execFile('whisper', args, { timeout: WHISPER_TIMEOUT_MS }, (error, stdout, stderr) => {
      if (error) {
        // Check if whisper is not installed
        if (error.code === 'ENOENT') {
          return reject(
            new Error(
              'Whisper CLI not found. Install with: pip install openai-whisper',
            ),
          );
        }
        return reject(new Error(stderr || error.message));
      }
      resolve(stdout);
    });

    proc.on('error', err => {
      if (err.code === 'ENOENT') {
        reject(
          new Error(
            'Whisper CLI not found. Install with: pip install openai-whisper',
          ),
        );
      }
    });
  });
}

function _isPlaceholderAudio(filePath) {
  const stats = fs.statSync(filePath);
  if (stats.size >= PLACEHOLDER_MAX_BYTES) {
    return false;
  }

  const content = fs.readFileSync(filePath);
  return (
    content.toString('utf8').startsWith('RECORDING_PLACEHOLDER') ||
    stats.size < PLACEHOLDER_MAX_BYTES
  );
}

function _readDurationFromJson(outputDir, baseName) {
  try {
    const jsonPath = path.join(outputDir, `${baseName}.json`);
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const segments = data.segments || [];
      if (segments.length > 0) {
        return Math.round(segments[segments.length - 1].end * 100) / 100;
      }
    }
  } catch {
    // Silently ignore — duration is non-critical
  }
  return 0;
}

function _cleanupWhisperOutputs(outputDir, baseName) {
  const extensions = ['.txt', '.json', '.srt', '.vtt', '.tsv'];
  for (const ext of extensions) {
    const file = path.join(outputDir, `${baseName}${ext}`);
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch {
      // Ignore cleanup errors
    }
  }
}

module.exports = { transcribeAudio };
