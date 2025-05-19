const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  title: { 
    type: String, 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  type: {
    type: String,
    enum: ['absent_warning', 'absence_request', 'class_cancellation', 'reschedule','other'],
    required: true,
  },
  referenceModel: { 
    type: String 
},
  referenceId: { 
    type: mongoose.Schema.Types.ObjectId 
}
}, { 
    timestamps: true 
});

notificationSchema.virtual("id").get(function () {
  return this._id.toHexString();
});
notificationSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Notification', notificationSchema);
