const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const {transcribeAudio} = require('../services/whisper');
const {extractInsights} = require('../services/gemini');

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
  limits: {fileSize: 100 * 1024 * 1024}, // 100 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /audio\/(mp4|m4a|mpeg|wav|ogg|webm)|video\/mp4/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only audio files are allowed'));
  },
});

// ─── All routes require auth ─────────────────────────────────────────────────
router.use(authMiddleware);

// ─── POST /api/conversations/upload ─────────────────────────────────────────
router.post('/upload', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({error: 'No audio file provided'});
  }

  const filePath = req.file.path;

  // Create a placeholder doc so the client can track status
  let conversation;
  try {
    conversation = await Conversation.create({
      userId: req.userId,
      audioFileName: req.file.filename,
      status: 'processing',
    });
  } catch (err) {
    console.error('[Conversations] DB create error:', err);
    return res.status(500).json({error: 'Failed to create conversation record'});
  }

  // Run transcription + insight extraction asynchronously
  // but await here so the mobile app gets results in one request
  try {
    // 1. Whisper transcription
    const {transcript, language, duration} = await transcribeAudio(filePath);

    // 2. Gemini insight extraction
    const {summary, entities, keywords, actionItems} =
      await extractInsights(transcript);

    // 3. Persist
    conversation.transcript = transcript;
    conversation.language = language;
    conversation.duration = duration;
    conversation.summary = summary;
    conversation.entities = entities;
    conversation.keywords = keywords;
    conversation.actionItems = actionItems;
    conversation.status = 'done';
    await conversation.save();

    // 4. Clean up uploaded file (save disk space)
    fs.unlink(filePath, () => {});

    return res.status(201).json({
      message: 'Conversation processed successfully',
      conversation,
    });
  } catch (err) {
    console.error('[Conversations] Processing error:', err.message);

    // Mark as error but don't delete — may want to retry
    conversation.status = 'error';
    conversation.errorMessage = err.message;
    await conversation.save().catch(() => {});

    return res.status(500).json({
      error: 'Failed to process audio: ' + err.message,
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
      .sort({createdAt: -1})
      .limit(100)
      .select('-__v');

    res.json({conversations});
  } catch (err) {
    console.error('[Conversations] list error:', err);
    res.status(500).json({error: 'Failed to fetch conversations'});
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
      return res.status(404).json({error: 'Conversation not found'});
    }

    res.json({conversation});
  } catch (err) {
    console.error('[Conversations] get error:', err);
    res.status(500).json({error: 'Failed to fetch conversation'});
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
      return res.status(404).json({error: 'Conversation not found'});
    }

    // Remove audio file if it still exists
    if (conversation.audioFileName) {
      const filePath = path.join(UPLOADS_DIR, conversation.audioFileName);
      fs.unlink(filePath, () => {});
    }

    res.json({message: 'Conversation deleted'});
  } catch (err) {
    console.error('[Conversations] delete error:', err);
    res.status(500).json({error: 'Failed to delete conversation'});
  }
});

module.exports = router;
