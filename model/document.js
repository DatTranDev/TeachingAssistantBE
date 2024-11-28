const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const documentSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    dowloadUrl: {
        type: String,
        required: true,
    },
    cAttendId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CAttend',
        required: true,
    },
});
documentSchema.virtual("id").get(function(){
    return this._id.toHexString
});
documentSchema.set('toJSON',{
    "virtuals": true
});
const Document = mongoose.model('Document', documentSchema);
module.exports = Document;