const mongoose = require('mongoose');

const IoTDeviceSchema = new mongoose.Schema({
  leaseId:    { type: String, required: true },
  landlordId: { type: String, required: true },
  tenantId:   { type: String, required: true },
  deviceId:   { type: String, required: true, unique: true },
  name:       { type: String, required: true },
  type: {
    type: String,
    enum: ['access_control', 'sensor', 'camera', 'meter', 'other'],
    required: true,
  },
  location:   { type: String },
  status: {
    type: String,
    enum: ['online', 'offline', 'maintenance'],
    default: 'offline',
  },
  lastSeenAt: { type: Date },
  metadata:   { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

IoTDeviceSchema.index({ leaseId: 1 });
IoTDeviceSchema.index({ deviceId: 1 }, { unique: true });

module.exports = mongoose.model('IoTDevice', IoTDeviceSchema, 'iot_devices');
