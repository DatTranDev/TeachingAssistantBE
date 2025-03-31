const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const attendRecordSchema = new Schema({
    cAttendId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CAttend',
        required: true,
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    listStatus: [
        {
            index: {type: Number, required: true},
            status: {type: String, enum: ['CP', 'KP', 'CM'], required: true},            
        }
    ],
    status: {
        type: String,
        enum: ['CP', 'KP', 'CM'],  
        required: true,
    },
    FCMToken: {
        type: String,
        required: true,
    },
    studentLatitude: {
        type: Number,
        required: true,
        default: 0,
    },
    studentLongitude: {
        type: Number,
        required: true,
        default: 0,
    },
}, {
    timestamps: true
});
attendRecordSchema.index({ cAttendId: 1, studentId: 1,  }, { unique: true });
attendRecordSchema.virtual("id").get(function(){
    return this._id.toHexString
});
attendRecordSchema.set('toJSON',{
    "virtuals": true
});

const AttendRecord = mongoose.model('AttendRecord', attendRecordSchema);
module.exports = AttendRecord;
