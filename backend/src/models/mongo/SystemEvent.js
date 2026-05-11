const { mongoose } = require('../../config/mongodb');

const systemEventSchema = new mongoose.Schema({
  requestId: { type: String, default: null, index: true },
  source: { type: String, required: true, index: true },
  category: {
    type: String,
    enum: ['application', 'security', 'integration', 'performance'],
    default: 'application',
    index: true,
  },
  severity: {
    type: String,
    enum: ['debug', 'info', 'warn', 'error', 'critical'],
    default: 'info',
    index: true,
  },
  event: { type: String, required: true, index: true },
  message: { type: String, required: true },
  actorId: { type: String, default: null, index: true },
  tags: [{ type: String }],
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  collection: 'system_events',
  timestamps: true,
});

const retentionDays = parseInt(process.env.SYSTEM_EVENT_RETENTION_DAYS || '30', 10);
systemEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: Math.max(1, retentionDays) * 24 * 60 * 60 }
);

module.exports = mongoose.model('SystemEvent', systemEventSchema);
