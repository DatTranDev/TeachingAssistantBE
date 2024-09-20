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
    status: {
        type: String,
        enum: ['CP', 'KP', 'C'],  
        required: true,
    }
}, {
    timestamps: true
});
attendRecordSchema.virtual("id").get(function(){
    return this._id.toHexString
});
attendRecordSchema.set('toJSON',{
    "virtuals": true
});

const AttendRecordModel = mongoose.model('AttendRecord', attendRecordSchema);
module.exports = AttendRecordModel;
