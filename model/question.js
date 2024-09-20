const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const questionSchema = new Schema({
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    isResolved: {
        type: Boolean,
        default: false,
    }
}, {
    timestamps: true
});
questionSchema.virtual("id").get(function(){
    return this._id.toHexString
});
questionSchema.set('toJSON',{
    "virtuals": true
});

const Question = mongoose.model('Question', questionSchema);
module.exports = Question;
