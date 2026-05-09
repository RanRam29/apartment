const mongoose = require('mongoose');

const ServiceListingSchema = new mongoose.Schema({
  providerId:   { type: String, required: true },
  providerName: { type: String },
  category: {
    type: String,
    enum: ['movers', 'cleaning', 'painting', 'plumbing', 'electricity', 'carpentry', 'other'],
    required: true,
  },
  title:       { type: String, required: true },
  description: { type: String },
  priceType: {
    type: String,
    enum: ['hourly', 'fixed', 'quote'],
    default: 'fixed',
  },
  price:    { type: Number, default: null },
  cities:   { type: [String], default: [] },
  phone:    { type: String },
  isActive: { type: Boolean, default: true },
  rating:      { type: Number, default: null },
  reviewCount: { type: Number, default: 0 },
}, { timestamps: true });

ServiceListingSchema.index({ category: 1, isActive: 1 });
ServiceListingSchema.index({ cities: 1, isActive: 1 });
ServiceListingSchema.index({ providerId: 1 });

module.exports = mongoose.model('ServiceListing', ServiceListingSchema, 'service_listings');
