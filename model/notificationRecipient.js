const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const recipientSchema = new Schema({
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification',
      required: true,
      index: true
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    isRead: { 
      type: Boolean, 
      default: false 
    }
  }, { timestamps: true });
  
  recipientSchema.index({ receiverId: 1, isRead: 1 });
  
  recipientSchema.virtual("id").get(function () {
    return this._id.toHexString();
  });
  recipientSchema.set('toJSON', { virtuals: true });
  
  module.exports = mongoose.model('NotificationRecipient', recipientSchema);
  