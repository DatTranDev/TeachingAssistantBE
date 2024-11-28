const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reactionSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true,
    },
    type: {
        type: Number,
        enum: [1, 2, 3],  
        required: true,
    },
});

reactionSchema.index({ userId: 1, postId: 1 }, { unique: true });
reactionSchema.virtual("id").get(function(){
    return this._id.toHexString
});
reactionSchema.set('toJSON',{
    "virtuals": true
});
const Reaction = mongoose.model('Reaction', reactionSchema);
module.exports = Reaction;