const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const groupMessageSchema = new Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
    },
    images: [
        {type: String}
    ],
    isRevoked: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true
});
groupMessageSchema.virtual("id").get(function(){
    return this._id.toHexString
});
groupMessageSchema.set('toJSON',{
    "virtuals": true
});
const GroupMessage = mongoose.model('GroupMessage', groupMessageSchema);
module.exports = GroupMessage;