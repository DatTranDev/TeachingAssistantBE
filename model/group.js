const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const groupSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }],
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type: {
        type: String,
        enum: ['random', 'default'],
        default: 'random',
        required: true,
    },
    cAttendId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CAttend',
        required: true,
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
    },
    autoAccept: {
        type: Boolean,
        required: true,
        default: true,
    }
}, {
    timestamps: true
});
groupSchema.virtual("id").get(function(){
    return this._id.toHexString
});
groupSchema.set('toJSON',{
    "virtuals": true
});
const Group = mongoose.model('Group', groupSchema);
module.exports = Group;