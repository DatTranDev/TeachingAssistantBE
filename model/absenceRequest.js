const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const absenceRequestSchema = new Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
    },
    proof:[
        {type: String}
    ]
    ,
    date: {
        type: Date,
        required: true,
    },
    reason: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        required: true,
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    comment: {
        type: String,
        required: false,
    },
    reviewedAt: {
        type: Date,
        required: false,
    }
}, {
    timestamps: true
});
absenceRequestSchema.virtual("id").get(function(){
    return this._id.toHexString
});
absenceRequestSchema.set('toJSON',{
    "virtuals": true
});
const AbsenceRequest = mongoose.model('AbsenceRequest', absenceRequestSchema);
module.exports = AbsenceRequest;