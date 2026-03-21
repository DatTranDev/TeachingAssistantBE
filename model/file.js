const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const fileSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  size: {
    type: Number, // size in bytes
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  type: {
    type: String, // mimetype
    required: true,
  },
  firebasePath: {
    type: String, // path in storage bucket
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

fileSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

fileSchema.set('toJSON', {
  virtuals: true,
});

const File = mongoose.model('File', fileSchema);
module.exports = File;
