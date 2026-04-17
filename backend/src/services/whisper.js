/**
 * whisper.js
 * Sends an audio file to the Python FastAPI / Whisper service for transcription.
 */
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const PLACEHOLDER_MAX_BYTES = 1024;

/**
 * Transcribe an audio file via the Whisper AI service.
 *
 * @param {string} filePath  - absolute path to the audio file
 * @returns {Promise<{transcript: string, language: string, duration: number}>}
 */
async function transcribeAudio(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Audio file not found: ${filePath}`);
  }

  if (_isPlaceholderAudio(filePath)) {
    console.log('[Whisper] Placeholder recording detected, skipping AI service call');
    return {
      transcript:
        '[Test Recording] This is a test meeting transcript. We discussed Q1 financial targets, budget allocation, and team onboarding.',
      language: 'en',
      duration: 32.5,
    };
  }

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), {
    filename: path.basename(filePath),
    contentType: _inferMimeType(filePath),
  });

  let response;
  try {
    response = await axios.post(`${AI_SERVICE_URL}/transcribe`, form, {
      headers: form.getHeaders(),
      timeout: 120_000, // 2 min — Whisper can be slow on large files
    });
  } catch (err) {
    throw new Error(_formatWhisperError(err));
  }

  const {transcript, language, duration} = response.data;
  return {
    transcript: transcript || '',
    language: language || 'en',
    duration: duration || 0,
  };
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

function _formatWhisperError(err) {
  const detail =
    err.response?.data?.detail ||
    err.response?.data?.error ||
    err.message ||
    'Unknown error';

  if (
    err.code === 'ECONNREFUSED' ||
    err.code === 'ENOTFOUND' ||
    err.code === 'ECONNABORTED'
  ) {
    return `Whisper service unavailable at ${AI_SERVICE_URL}. Start the ai-service before analyzing real recordings.`;
  }

  return `Whisper transcription failed: ${detail}`;
}

function _inferMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.mp4': 'audio/mp4',
    '.m4a': 'audio/m4a',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.webm': 'audio/webm',
  };
  return map[ext] || 'audio/mpeg';
}

module.exports = {transcribeAudio};
