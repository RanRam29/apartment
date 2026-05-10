const { mongoose } = require('../../config/mongodb');

const badgeSchema = new mongoose.Schema({
  id:       { type: String, required: true },
  name:     { type: String, required: true },
  earnedAt: { type: Date, default: () => new Date() },
}, { _id: false });

const userPointsSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  points: {
    type: Number,
    default: 0,
    min: 0,
  },
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 4,
  },
  badges: {
    type: [badgeSchema],
    default: [],
  },
  lastActivityAt: {
    type: Date,
    default: null,
  },
}, {
  collection: 'user_points',
  timestamps: true,
});

// Compute level from points: 1-4 based on tiers [0, 100, 500, 1500]
userPointsSchema.methods.computeLevel = function () {
  const pts = this.points;
  if (pts >= 1500) return 4;
  if (pts >= 500)  return 3;
  if (pts >= 100)  return 2;
  return 1;
};

module.exports = mongoose.model('UserPoints', userPointsSchema);
