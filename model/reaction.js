const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reactionSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    discussionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Discussion',
        required: true,
    },
    type: {
        type: Number,
        enum: [1, 2, 3, 4, 5], 
        required: true,
    },
});

reactionSchema.index({ userId: 1, discussionId: 1 }, { unique: true });
reactionSchema.virtual("id").get(function(){
    return this._id.toHexString
});
reactionSchema.set('toJSON',{
    "virtuals": true
});
const Reaction = mongoose.model('Reaction', reactionSchema);
module.exports = Reaction;