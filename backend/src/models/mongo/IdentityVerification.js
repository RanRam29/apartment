const { mongoose } = require('../../config/mongodb');

const identityVerificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  // SHA-256 of the raw ID number — never store plain-text gov ID
  idNumberHash: {
    type: String,
    required: true,
  },
  // Last 4 digits only, for display/support purposes
  idNumberLast4: {
    type: String,
    required: true,
    length: 4,
  },
  fullName: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  // pending → verified | rejected
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
    index: true,
  },
  // In production this would come back from BDI/gov API
  rejectedReason: {
    type: String,
    default: null,
  },
  verifiedAt: {
    type: Date,
    default: null,
  },
}, {
  collection: 'identity_verifications',
  timestamps: true,
});

module.exports = mongoose.model('IdentityVerification', identityVerificationSchema);
