const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const postSchema = new Schema({
    channelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
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
    }
}, {
    timestamps: true
});
postSchema.virtual("id").get(function(){
    return this._id.toHexString
});
postSchema.set('toJSON',{
    "virtuals": true
});

const PostModel = mongoose.model('Post', postSchema);
module.exports = PostModel;
