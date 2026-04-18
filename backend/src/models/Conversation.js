const mongoose = require('mongoose');

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const EntitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['SIP', 'EMI', 'loan', 'budget', 'deadline', 'credit_card', 'insurance', 'tax', 'bill', 'investment', 'other'],
      default: 'other',
    },
    value: {type: String, trim: true},
    amount: {type: Number, default: null},
    deadline: {type: String, default: null},
    urgency: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: null,
    },
  },
  {_id: false},
);

const PaymentDeadlineSchema = new mongoose.Schema(
  {
    description: {type: String, trim: true},
    dueDate: {type: String, default: null},
    daysUntilDue: {type: Number, default: null},
    requiresAction: {type: Boolean, default: false},
  },
  {_id: false},
);

const ReminderJobSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['payment', 'investment', 'task', 'goal', 'plan_prompt', 'other'],
      default: 'task',
    },
    title: {type: String, trim: true, required: true},
    description: {type: String, trim: true, default: ''},
    dueAt: {type: Date, required: true},
    checkInAt: {type: Date, default: null},
    status: {
      type: String,
      enum: ['pending', 'done', 'dismissed'],
      default: 'pending',
    },
    requiresCompletionCheck: {type: Boolean, default: true},
    seriesKey: {type: String, trim: true, default: ''},
    occurrenceIndex: {type: Number, default: 1},
    recurrence: {
      type: String,
      enum: ['once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      default: 'once',
    },
    amount: {type: Number, default: null},
    currency: {type: String, trim: true, default: 'INR'},
    dueLabel: {type: String, trim: true, default: ''},
    sourceText: {type: String, trim: true, default: ''},
    planHorizonMonths: {type: Number, default: null},
    completedAt: {type: Date, default: null},
  },
  {timestamps: false},
);

const FinancialPlanMonthSchema = new mongoose.Schema(
  {
    monthIndex: {type: Number, required: true},
    title: {type: String, trim: true, default: ''},
    focus: {type: String, trim: true, default: ''},
    actions: {type: [String], default: []},
    targetAmount: {type: Number, default: null},
    successMetric: {type: String, trim: true, default: ''},
  },
  {_id: false},
);

const FinancialPlanSchema = new mongoose.Schema(
  {
    title: {type: String, trim: true, required: true},
    summary: {type: String, trim: true, default: ''},
    horizonMonths: {type: Number, default: 3},
    immediateActions: {type: [String], default: []},
    monthlyMilestones: {type: [FinancialPlanMonthSchema], default: []},
    riskNotes: {type: [String], default: []},
    sourceReminderId: {type: mongoose.Schema.Types.ObjectId, default: null},
    createdAt: {type: Date, default: Date.now},
  },
  {timestamps: false},
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
    paymentDeadlines: {type: [PaymentDeadlineSchema], default: []},
    reminderJobs: {type: [ReminderJobSchema], default: []},
    financialPlans: {type: [FinancialPlanSchema], default: []},

    // Audio metadata
    audioFileName: {type: String, default: ''},
    duration: {type: Number, default: 0},   // seconds
    language: {type: String, default: 'en'},
    timeZone: {type: String, default: 'UTC'},
    timezoneOffsetMinutes: {type: Number, default: 0},

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
