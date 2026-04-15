const express = require('express');
const authMiddleware = require('../middleware/auth');
const Conversation = require('../models/Conversation');

const router = express.Router();
router.use(authMiddleware);

// ─── GET /api/search?q=<query> ────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const {q, type, minAmount, maxAmount} = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({error: 'Search query "q" is required'});
  }

  try {
    // Build MongoDB filter
    const filter = {
      userId: req.userId,
      status: 'done',
    };

    // Full-text search on indexed fields
    filter.$text = {$search: q.trim()};

    // Optional: filter by entity type
    if (type) {
      filter['entities.type'] = type;
    }

    // Optional: filter by entity amount range
    if (minAmount || maxAmount) {
      filter['entities.amount'] = {};
      if (minAmount) filter['entities.amount'].$gte = Number(minAmount);
      if (maxAmount) filter['entities.amount'].$lte = Number(maxAmount);
    }

    const conversations = await Conversation.find(filter, {
      score: {$meta: 'textScore'},
    })
      .sort({score: {$meta: 'textScore'}, createdAt: -1})
      .limit(50)
      .select('-__v');

    res.json({conversations, count: conversations.length});
  } catch (err) {
    // Fallback: regex search if text index is not ready
    if (err.code === 27) {
      try {
        const regex = new RegExp(q.trim(), 'i');
        const conversations = await Conversation.find({
          userId: req.userId,
          status: 'done',
          $or: [
            {transcript: regex},
            {summary: regex},
            {keywords: regex},
            {actionItems: regex},
          ],
        })
          .sort({createdAt: -1})
          .limit(50)
          .select('-__v');

        return res.json({conversations, count: conversations.length});
      } catch (fallbackErr) {
        console.error('[Search] fallback error:', fallbackErr);
      }
    }

    console.error('[Search] error:', err);
    res.status(500).json({error: 'Search failed'});
  }
});

module.exports = router;
