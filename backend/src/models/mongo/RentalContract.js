const { mongoose } = require('../../config/mongodb');

// Contract lifecycle: draft → pending_tenant → pending_landlord → active → terminated
const rentalContractSchema = new mongoose.Schema({
  matchId:     { type: String, required: true, index: true },
  tenantId:    { type: String, required: true, index: true },
  landlordId:  { type: String, required: true, index: true },
  apartmentId: { type: String, required: true },

  // Core terms (landlord fills on creation)
  monthlyRent:      { type: Number, required: true },
  depositMonths:    { type: Number, default: 1 },   // how many months rent as deposit
  depositAmount:    { type: Number, required: true },
  startDate:        { type: Date, required: true },
  endDate:          { type: Date, required: true },
  customClauses:    { type: String, default: '' },  // free-text addendum

  // Snapshot for display (avoids join on every contract read)
  apartmentTitle:   { type: String, default: '' },
  apartmentAddress: { type: String, default: '' },
  tenantName:       { type: String, default: '' },
  landlordName:     { type: String, default: '' },

  // Signing
  status: {
    type: String,
    enum: ['draft', 'pending_tenant', 'pending_landlord', 'active', 'terminated'],
    default: 'draft',
    index: true,
  },
  tenantSignedAt:   { type: Date, default: null },
  landlordSignedAt: { type: Date, default: null },

  // Deposit tracking
  depositStatus: {
    type: String,
    enum: ['pending', 'held', 'released', 'forfeited'],
    default: 'pending',
  },
  depositPaidAt:    { type: Date, default: null },
  depositSettledAt: { type: Date, default: null },
}, {
  collection: 'rental_contracts',
  timestamps: true,
});

module.exports = mongoose.model('RentalContract', rentalContractSchema);
