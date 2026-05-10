const mongoose = require('mongoose');

const MaintenanceTicketSchema = new mongoose.Schema({
  leaseId:         { type: String, required: true },
  deviceId:        { type: String },
  reporterId:      { type: String, required: true },
  reporterName:    { type: String },
  title:           { type: String, required: true },
  description:     { type: String },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
  },
  resolvedAt:       { type: Date },
  resolvedBy:       { type: String },
  resolutionNotes:  { type: String },
}, { timestamps: true });

MaintenanceTicketSchema.index({ leaseId: 1, status: 1 });

module.exports = mongoose.model('MaintenanceTicket', MaintenanceTicketSchema, 'maintenance_tickets');
