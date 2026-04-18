const express = require('express');
const authMiddleware = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const {flattenReminderJobs} = require('../services/reminderPlanner');

const router = express.Router();

router.use(authMiddleware);

// ─── GET /api/reminders ──────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const conversations = await Conversation.find({
      userId: req.userId,
      status: 'done',
      'reminderJobs.0': {$exists: true},
    })
      .sort({createdAt: -1})
      .select('summary createdAt reminderJobs');

    const reminders = flattenReminderJobs(conversations, status);
    res.json({reminders});
  } catch (err) {
    console.error('[Reminders] list error:', err);
    res.status(500).json({error: 'Failed to fetch reminders'});
  }
});

// ─── PATCH /api/reminders/:id ────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const {status} = req.body || {};
    if (!['pending', 'done', 'dismissed'].includes(status)) {
      return res.status(400).json({error: 'Invalid reminder status'});
    }

    const conversation = await Conversation.findOne({
      userId: req.userId,
      'reminderJobs._id': req.params.id,
    });

    if (!conversation) {
      return res.status(404).json({error: 'Reminder not found'});
    }

    const reminder = conversation.reminderJobs.id(req.params.id);
    reminder.status = status;
    reminder.completedAt = status === 'done' ? new Date() : null;
    await conversation.save();

    res.json({
      message: 'Reminder updated successfully',
      reminder,
      conversationId: conversation._id,
    });
  } catch (err) {
    console.error('[Reminders] update error:', err);
    res.status(500).json({error: 'Failed to update reminder'});
  }
});

module.exports = router;
