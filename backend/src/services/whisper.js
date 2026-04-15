/**
 * whisper.js
 * Sends an audio file to the Python FastAPI / Whisper service for transcription.
 */
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

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

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), {
    filename: path.basename(filePath),
    contentType: _inferMimeType(filePath),
  });

  const response = await axios.post(`${AI_SERVICE_URL}/transcribe`, form, {
    headers: form.getHeaders(),
    timeout: 120_000, // 2 min — Whisper can be slow on large files
  });

  const {transcript, language, duration} = response.data;
  return {
    transcript: transcript || '',
    language: language || 'en',
    duration: duration || 0,
  };
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
