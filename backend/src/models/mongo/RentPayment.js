const mongoose = require('mongoose');

const RentPaymentSchema = new mongoose.Schema({
  contractId:            { type: mongoose.Schema.Types.ObjectId, ref: 'RentalContract', required: true },
  apartmentId:           { type: String, required: true },
  tenantId:              { type: String, required: true },
  landlordId:            { type: String, required: true },
  amount:                { type: Number, required: true },
  month:                 { type: String, required: true }, // YYYY-MM
  dueDate:               { type: Date,   required: true },
  status: {
    type:    String,
    enum:    ['pending', 'initiated', 'paid', 'overdue', 'cancelled'],
    default: 'pending',
  },
  paidAt:                { type: Date },
  paymentMethod:         { type: String, enum: ['bit', 'paybox', 'bank_transfer', 'manual'], default: null },
  externalTransactionId: { type: String },
  reminderSentAt:        { type: Date },
  landlordPhone:         { type: String },
  apartmentTitle:        { type: String },
}, { timestamps: true });

RentPaymentSchema.index({ contractId: 1, month: 1 }, { unique: true });
RentPaymentSchema.index({ tenantId: 1, dueDate: -1 });
RentPaymentSchema.index({ landlordId: 1, dueDate: -1 });
RentPaymentSchema.index({ dueDate: 1, status: 1 }); // overdue sweep

module.exports = mongoose.model('RentPayment', RentPaymentSchema, 'rent_payments');
