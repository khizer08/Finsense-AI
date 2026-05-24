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
const WHISPER_TIMEOUT_MS = Number(process.env.WHISPER_TIMEOUT_MS || 180_000);
const WHISPER_RETRIES = Number(process.env.WHISPER_RETRIES || 1);

class TranscriptionError extends Error {
  constructor(message, code = 'TRANSCRIPTION_FAILED', status = 500) {
    super(message);
    this.name = 'TranscriptionError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Transcribe an audio file using the Whisper CLI.
 *
 * @param {string} filePath  - absolute path to the audio file
 * @returns {Promise<{transcript: string, language: string, duration: number}>}
 */
async function transcribeAudio(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new TranscriptionError(
      'Audio file was not found on the backend.',
      'AUDIO_FILE_NOT_FOUND',
      400,
    );
  }

  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    throw new TranscriptionError(
      'Uploaded audio file is empty.',
      'EMPTY_AUDIO_FILE',
      400,
    );
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
    await _runWhisperCliWithRetry(filePath, outputDir);
  } catch (err) {
    console.error('[Whisper] CLI error:', err.message);
    _cleanupWhisperOutputs(outputDir, baseName);
    if (err instanceof TranscriptionError) {
      throw err;
    }
    throw new TranscriptionError(
      'Whisper transcription failed: ' + err.message,
      'WHISPER_FAILED',
      502,
    );
  }

  const result = _readWhisperResult(outputDir, baseName);
  _cleanupWhisperOutputs(outputDir, baseName);

  if (!result.transcript) {
    throw new TranscriptionError(
      'Whisper returned an empty transcript. Please try a clearer or longer recording.',
      'EMPTY_TRANSCRIPT',
      422,
    );
  }

  console.log(
    `[Whisper] Done: ${result.transcript.length} chars | duration=${result.duration}s`,
  );

  return {
    transcript: result.transcript,
    language: result.language || 'en',
    duration: result.duration,
  };
}

async function _runWhisperCliWithRetry(filePath, outputDir) {
  let lastError;
  const attempts = Math.max(1, WHISPER_RETRIES + 1);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      if (attempt > 1) {
        console.log(`[Whisper] Retry ${attempt - 1}/${attempts - 1}`);
      }
      return await _runWhisperCli(filePath, outputDir);
    } catch (err) {
      lastError = err;
      if (
        err.code === 'WHISPER_NOT_FOUND' ||
        err.code === 'FFMPEG_NOT_FOUND' ||
        err.code === 'WHISPER_TIMEOUT'
      ) {
        break;
      }
    }
  }

  throw lastError;
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
      '--output_format', 'json',
      '--fp16', 'False',
      '--verbose', 'False',
    ];

    const proc = execFile('whisper', args, { timeout: WHISPER_TIMEOUT_MS }, (error, stdout, stderr) => {
      if (error) {
        if (error.code === 'ENOENT') {
          return reject(
            new TranscriptionError(
              'Whisper CLI not found. Install with: pip install openai-whisper',
              'WHISPER_NOT_FOUND',
              503,
            ),
          );
        }
        if (error.killed || error.signal === 'SIGTERM') {
          return reject(
            new TranscriptionError(
              'Whisper transcription timed out.',
              'WHISPER_TIMEOUT',
              504,
            ),
          );
        }
        return reject(_mapWhisperError(stderr || error.message));
      }
      resolve(stdout);
    });

    proc.on('error', err => {
      if (err.code === 'ENOENT') {
        reject(
          new TranscriptionError(
            'Whisper CLI not found. Install with: pip install openai-whisper',
            'WHISPER_NOT_FOUND',
            503,
          ),
        );
      }
    });
  });
}

function _mapWhisperError(message) {
  const safeMessage = String(message || 'Unknown Whisper error').trim();
  if (/ffmpeg/i.test(safeMessage) && /(not found|no such file|not recognized)/i.test(safeMessage)) {
    return new TranscriptionError(
      'ffmpeg is required for Whisper transcription but was not found.',
      'FFMPEG_NOT_FOUND',
      503,
    );
  }

  if (/invalid data|could not find codec|failed to load audio|no such file/i.test(safeMessage)) {
    return new TranscriptionError(
      'Uploaded audio could not be decoded. Please try another recording.',
      'INVALID_AUDIO_FILE',
      400,
    );
  }

  return new TranscriptionError(safeMessage, 'WHISPER_FAILED', 502);
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

function _readWhisperResult(outputDir, baseName) {
  const fallback = {
    transcript: '',
    language: 'en',
    duration: 0,
  };

  try {
    const jsonPath = path.join(outputDir, `${baseName}.json`);
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const segments = data.segments || [];
      const transcript =
        typeof data.text === 'string'
          ? data.text.trim()
          : segments.map(segment => segment.text).join(' ').trim();
      const duration =
        segments.length > 0
          ? Math.round(segments[segments.length - 1].end * 100) / 100
          : 0;
      return {
        transcript,
        language: data.language || 'en',
        duration,
      };
    }

    const txtPath = path.join(outputDir, `${baseName}.txt`);
    if (fs.existsSync(txtPath)) {
      return {
        ...fallback,
        transcript: fs.readFileSync(txtPath, 'utf8').trim(),
      };
    }
  } catch (err) {
    console.warn('[Whisper] Failed to read Whisper output:', err.message);
  }

  return fallback;
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

module.exports = { transcribeAudio, TranscriptionError };
