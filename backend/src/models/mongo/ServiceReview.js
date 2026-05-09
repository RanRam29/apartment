const mongoose = require('mongoose');

const ServiceReviewSchema = new mongoose.Schema({
  serviceId:    { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceListing', required: true },
  reviewerId:   { type: String, required: true },
  reviewerName: { type: String },
  rating:       { type: Number, min: 1, max: 5, required: true },
  comment:      { type: String },
}, { timestamps: true });

ServiceReviewSchema.index({ serviceId: 1, reviewerId: 1 }, { unique: true });

module.exports = mongoose.model('ServiceReview', ServiceReviewSchema, 'service_reviews');
