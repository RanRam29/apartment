const { mongoose } = require('../../config/mongodb');

const roommateProfileSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  lookingForRoommate: {
    type: Boolean,
    default: false,
  },
  // Lifestyle questionnaire
  sleepSchedule: {
    type: String,
    enum: ['early_bird', 'night_owl', 'flexible'],
    default: 'flexible',
  },
  cleanlinessLevel: {
    type: Number,
    min: 1,
    max: 5,
    default: 3,
  },
  noiseLevel: {
    type: String,
    enum: ['quiet', 'moderate', 'lively'],
    default: 'moderate',
  },
  guestsFrequency: {
    type: String,
    enum: ['never', 'rarely', 'sometimes', 'often'],
    default: 'rarely',
  },
  smokingAllowed: {
    type: Boolean,
    default: false,
  },
  petsAllowed: {
    type: Boolean,
    default: false,
  },
  workFromHome: {
    type: Boolean,
    default: false,
  },
  // Preferred cities overlap
  cities: {
    type: [String],
    default: [],
  },
  // Snapshot fields for display (synced from User on save)
  firstName: { type: String, default: '' },
  lastName:  { type: String, default: '' },
  avatarUrl: { type: String, default: null },
}, {
  collection: 'roommate_profiles',
  timestamps: true,
});

module.exports = mongoose.model('RoommateProfile', roommateProfileSchema);
