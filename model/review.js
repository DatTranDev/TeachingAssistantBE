const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
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
    understandPercent:{
        type: Number,
        required: true,
    },
    usefulPercent:{
        type: Number,
        required: true,
    },
    teachingMethodScore:{
        type: String,
        required: true
    },
    atmosphereScore:{
        type: String,
        required: true
    },
    documentScore:{
        type: String,
        required: true
    },
    thinking: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
});

reviewSchema.index({ cAttendId: 1, studentId: 1 }, { unique: true });
reviewSchema.virtual("id").get(function(){
    return this._id.toHexString
});
reviewSchema.set('toJSON',{
    "virtuals": true
});
const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;