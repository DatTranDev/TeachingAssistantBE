const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const checklistItemSchema = new Schema(
  {
    text: { type: String, required: true },
    done: { type: Boolean, default: false },
  },
  { _id: true }
);

const noteSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, default: '' },    // HH:mm, optional
    duration: { type: Number, default: 0 }, // minutes
    location: { type: String, default: '' },
    doingWith: { type: String, default: '' },
    checklist: { type: [checklistItemSchema], default: [] },
    done: { type: Boolean, default: false },
  },
  { timestamps: true }
);

noteSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
noteSchema.set('toJSON', { virtuals: true });

const Note = mongoose.model('Note', noteSchema);
module.exports = Note;
