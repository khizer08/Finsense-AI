const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const { transcribeAudio } = require('../services/whisper');
const { preprocessText } = require('../services/textPreprocessor');
const { extractInsights, generateFinancialPlan } = require('../services/gemini');
const { buildReminderJobs } = require('../services/reminderPlanner');

const router = express.Router();

// ─── Multer config ────────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /audio\/(mp4|m4a|mpeg|wav|ogg|webm|aac|x-m4a|3gpp)|video\/mp4/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    const err = new Error('Only audio files are allowed');
    err.code = 'INVALID_AUDIO_TYPE';
    err.status = 400;
    cb(err);
  },
});

// ─── All routes require auth ─────────────────────────────────────────────────
router.use(authMiddleware);

// ─── POST /api/conversations/upload ─────────────────────────────────────────
router.post('/upload', _handleAudioUpload, async (req, res) => {
  if (!req.file) {
    return _sendError(res, 400, 'NO_AUDIO_FILE', 'No audio file provided');
  }

  const filePath = req.file.path;
  const referenceDate = req.body.referenceDate || new Date().toISOString();
  const timeZone = req.body.timeZone || 'UTC';
  const timezoneOffsetMinutes = Number(req.body.timezoneOffsetMinutes || 0);

  // Create a placeholder doc so the client can track status
  let conversation;
  try {
    conversation = await Conversation.create({
      userId: req.userId,
      audioFileName: req.file.filename,
      timeZone,
      timezoneOffsetMinutes,
      status: 'processing',
    });
  } catch (err) {
    console.error('[Conversations] DB create error:', err);
    _cleanupUploadedFile(filePath);
    return _sendError(
      res,
      500,
      'CONVERSATION_CREATE_FAILED',
      'Failed to create conversation record',
    );
  }

  // Run transcription + insight extraction asynchronously
  // but await here so the mobile app gets results in one request
  try {
    // 1. Whisper transcription
    const { transcript: rawTranscript, language, duration } = await transcribeAudio(filePath);

    // 1b. Preprocess transcript — expand shorthand (50k → 50,000, etc.)
    const transcript = preprocessText(rawTranscript);

    // 2. Gemini insight extraction
    const {
      summary,
      entities,
      keywords,
      actionItems,
      paymentDeadlines,
      reminderTemplates,
    } = await extractInsights(transcript, {
      referenceDate,
      timeZone,
      utcOffset: _toUtcOffsetString(timezoneOffsetMinutes),
    });
    const reminderJobs = buildReminderJobs(reminderTemplates, {
      referenceDate,
      timeZone,
      timezoneOffsetMinutes,
    });

    // 3. Persist
    conversation.transcript = transcript;
    conversation.language = language;
    conversation.duration = duration;
    conversation.summary = summary;
    conversation.entities = entities;
    conversation.keywords = keywords;
    conversation.actionItems = actionItems;
    conversation.paymentDeadlines = paymentDeadlines;
    conversation.reminderJobs = reminderJobs;
    conversation.status = 'done';
    await conversation.save();

    // 4. Clean up uploaded file (save disk space)
    _cleanupUploadedFile(filePath);

    return res.status(201).json({
      message: 'Conversation processed successfully',
      conversation,
    });
  } catch (err) {
    console.error('[Conversations] Processing error:', err);

    // Mark as error but don't delete — may want to retry
    conversation.status = 'error';
    conversation.errorMessage = err.message;
    await conversation.save().catch(() => { });
    _cleanupUploadedFile(filePath);

    return _sendError(
      res,
      err.status || 500,
      err.code || 'AUDIO_PROCESSING_FAILED',
      'Failed to process audio: ' + (err.message || 'Unknown processing error'),
    );
  }
});

// ─── POST /api/conversations/:id/plan ───────────────────────────────────────
router.post('/:id/plan', async (req, res) => {
  try {
    const { reminderId } = req.body || {};
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const reminder = reminderId ? conversation.reminderJobs.id(reminderId) : null;
    const horizonMonths = reminder?.planHorizonMonths || 3;

    const plan = await generateFinancialPlan(conversation, {
      horizonMonths,
      reminderTitle: reminder?.title || 'Financial plan',
    });

    conversation.financialPlans.push({
      ...plan,
      sourceReminderId: reminder?._id || null,
    });

    if (reminder) {
      reminder.status = 'done';
      reminder.completedAt = new Date();
    }

    await conversation.save();

    return res.status(201).json({
      message: 'Financial plan created successfully',
      plan: conversation.financialPlans[conversation.financialPlans.length - 1],
      conversation,
    });
  } catch (err) {
    console.error('[Conversations] plan error:', err);
    return res.status(500).json({
      error: 'Failed to create financial plan: ' + (err.message || 'Unknown error'),
    });
  }
});

// ─── GET /api/conversations ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const conversations = await Conversation.find({
      userId: req.userId,
      status: 'done',
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('-__v');

    res.json({ conversations });
  } catch (err) {
    console.error('[Conversations] list error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// ─── GET /api/conversations/:id ──────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).select('-__v');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ conversation });
  } catch (err) {
    console.error('[Conversations] get error:', err);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// ─── DELETE /api/conversations/:id ───────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Remove audio file if it still exists
    if (conversation.audioFileName) {
      const filePath = path.join(UPLOADS_DIR, conversation.audioFileName);
      fs.unlink(filePath, () => { });
    }

    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    console.error('[Conversations] delete error:', err);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// ─── PATCH /api/conversations/:id/action-items/:index ───────────────────────
router.patch('/:id/action-items/:index', async (req, res) => {
  try {
    const { id, index } = req.params;
    const idx = parseInt(index, 10);
    const conversation = await Conversation.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (idx < 0 || idx >= conversation.actionItems.length) {
      return res.status(400).json({ error: 'Invalid action item index' });
    }

    // Toggle the done state
    const item = conversation.actionItems[idx];
    // Handle legacy string items
    if (typeof item === 'string') {
      conversation.actionItems[idx] = { text: item, done: true };
    } else {
      item.done = req.body.done !== undefined ? !!req.body.done : !item.done;
    }

    await conversation.save();

    return res.json({
      message: 'Action item updated',
      conversation,
    });
  } catch (err) {
    console.error('[Conversations] action-item toggle error:', err);
    return res.status(500).json({ error: 'Failed to update action item' });
  }
});

module.exports = router;

function _handleAudioUpload(req, res, next) {
  upload.single('audio')(req, res, err => {
    if (!err) {
      return next();
    }

    console.error('[Conversations] upload middleware error:', err.message);
    const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 400);
    const code = err.code || 'UPLOAD_FAILED';
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Audio file is too large. Maximum upload size is 100 MB.'
        : err.message || 'Audio upload failed';

    return _sendError(res, status, code, message);
  });
}

function _sendError(res, status, code, message) {
  return res.status(status).json({
    error: message,
    code,
  });
}

function _cleanupUploadedFile(filePath) {
  if (!filePath) {
    return;
  }

  fs.unlink(filePath, err => {
    if (err && err.code !== 'ENOENT') {
      console.warn('[Conversations] Failed to clean uploaded file:', err.message);
    }
  });
}

function _toUtcOffsetString(offsetMinutes) {
  if (!Number.isFinite(offsetMinutes)) {
    return '+00:00';
  }

  const totalMinutes = -offsetMinutes;
  const sign = totalMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(totalMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0');
  const minutes = String(absoluteMinutes % 60).padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}
