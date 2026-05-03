const { mongoose } = require('../../config/mongodb');

const userPreferencesSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  budget: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 20000 },
  },
  cities: {
    type: [String],
    default: [],
  },
  neighborhoods: {
    type: [String],
    default: [],
  },
  rooms: {
    min: { type: Number, default: 1 },
    max: { type: Number, default: 10 },
  },
  requiredAmenities: {
    type: [String],
    default: [],
    enum: ['parking', 'balcony', 'elevator', 'ac', 'storage', 'pets_allowed', 'furnished', 'sun_boiler'],
  },
  maxDistanceFromWork: {
    type: Number,
    default: null,
  },
  workLocation: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
  },
  swipeHistory: [{
    apartmentId: { type: String, required: true },
    direction: { type: String, enum: ['like', 'dislike', 'superlike'] },
    seenDurationMs: { type: Number },
    swipedAt: { type: Date, default: Date.now },
  }],
  nlpSearchHistory: [{
    query: { type: String },
    parsedFilters: { type: mongoose.Schema.Types.Mixed },
    searchedAt: { type: Date, default: Date.now },
  }],
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  collection: 'user_preferences',
  timestamps: true,
});

userPreferencesSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('UserPreferences', userPreferencesSchema);
