const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const channelSchema = new Schema({
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
    },
    name: {
        type: String,
        required: true,
    }
});
channelSchema.index({ subjectId: 1, name: 1 }, { unique: true });
channelSchema.virtual("id").get(function(){
    return this._id.toHexString
});
channelSchema.set('toJSON',{
    "virtuals": true
});

const ChannelModel = mongoose.model('Channel', channelSchema);
module.exports = ChannelModel;
