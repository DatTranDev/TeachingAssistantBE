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
    },
    teacherLatitude: {
        type: Number,
        default: 0,
        required: true,
    },
    teacherLongitude: {
        type: Number,
        default: 0,
        required: true,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: false,
    },
    timeExpired: {
        type: Number,
        required: true,
        default: 0,//minutes
    }
}, {
    timestamps: true
});
cAttendSchema.virtual("id").get(function(){
    return this._id.toHexString
});
cAttendSchema.set('toJSON',{
    "virtuals": true
});

const CAttend = mongoose.model('CAttend', cAttendSchema);
module.exports = CAttend;
