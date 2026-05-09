const mongoose = require('mongoose');

const CamRecordSchema = new mongoose.Schema({
  year:       { type: Number, required: true },
  estimated:  { type: Number, required: true },
  actual:     { type: Number },
  difference: { type: Number }, // actual - estimated; positive = tenant owes, negative = credit
  settledAt:  { type: Date },
  notes:      { type: String },
}, { _id: false });

const CommercialLeaseSchema = new mongoose.Schema({
  tenantId:   { type: String, required: true },
  landlordId: { type: String, required: true },
  apartmentId:{ type: String },

  businessName: { type: String, required: true },
  businessType: {
    type: String,
    enum: ['office', 'retail', 'warehouse', 'industrial', 'other'],
    default: 'office',
  },

  // Base rent
  monthlyRent: { type: Number, required: true },

  // CAM — Common Area Maintenance
  annualCamEstimate:      { type: Number, default: 0 },
  camReconciliationMonth: { type: Number, default: 1, min: 1, max: 12 },
  camHistory:             { type: [CamRecordSchema], default: [] },

  // Lease term
  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },

  // Critical dates
  renewalOptionDate:     { type: Date },
  renewalOptionMonths:   { type: Number },
  rentEscalationDate:    { type: Date },
  rentEscalationPercent: { type: Number },
  inspectionDate:        { type: Date },

  // Snapshots so screens render without extra joins
  tenantName:      { type: String },
  landlordName:    { type: String },
  propertyAddress: { type: String },

  status: {
    type: String,
    enum: ['active', 'expired', 'terminated'],
    default: 'active',
  },
  notes: { type: String },
}, { timestamps: true });

CommercialLeaseSchema.index({ landlordId: 1, status: 1 });
CommercialLeaseSchema.index({ tenantId: 1, status: 1 });
CommercialLeaseSchema.index({ endDate: 1 });
CommercialLeaseSchema.index({ renewalOptionDate: 1 });

module.exports = mongoose.model('CommercialLease', CommercialLeaseSchema, 'commercial_leases');
