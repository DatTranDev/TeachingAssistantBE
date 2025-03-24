const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const discussionSchema = new Schema({
    cAttendId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CAttend',
        required: true,
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    isResolved: {
        type: Boolean,
        required: true,
        default: false,
    },
    images: [
        {type: String}
    ],
    replyOf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Discussion',
        default: null,
        required: false,
    }
}, {
    timestamps: true
});
discussionSchema.virtual("id").get(function(){
    return this._id.toHexString
});
discussionSchema.set('toJSON',{
    "virtuals": true
});

const Discussion = mongoose.model('Discussion', discussionSchema);
module.exports = Discussion;
