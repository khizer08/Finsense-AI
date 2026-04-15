const mongoose = require('mongoose');

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const EntitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['SIP', 'EMI', 'loan', 'budget', 'deadline', 'other'],
      default: 'other',
    },
    value: {type: String, trim: true},
    amount: {type: Number, default: null},
  },
  {_id: false},
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const ConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Raw transcript from Whisper
    transcript: {type: String, default: ''},

    // AI-generated fields from Gemini
    summary: {type: String, default: ''},
    entities: {type: [EntitySchema], default: []},
    keywords: {type: [String], default: []},
    actionItems: {type: [String], default: []},

    // Audio metadata
    audioFileName: {type: String, default: ''},
    duration: {type: Number, default: 0},   // seconds
    language: {type: String, default: 'en'},

    // Processing status
    status: {
      type: String,
      enum: ['processing', 'done', 'error'],
      default: 'processing',
    },
    errorMessage: {type: String, default: ''},
  },
  {timestamps: true},
);

// ─── Text index for full-text search ─────────────────────────────────────────
ConversationSchema.index(
  {transcript: 'text', summary: 'text', keywords: 'text', actionItems: 'text'},
  {name: 'conversation_text_search'},
);

module.exports = mongoose.model('Conversation', ConversationSchema);
