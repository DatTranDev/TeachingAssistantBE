const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cAttendSchema = new Schema({
    classSessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClassSession',
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    sessionNumber: {
        type: Number,
        required: true,
    }
});
cAttendSchema.virtual("id").get(function(){
    return this._id.toHexString
});
cAttendSchema.set('toJSON',{
    "virtuals": true
});

const CAttendModel = mongoose.model('CAttend', cAttendSchema);
module.exports = CAttendModel;
