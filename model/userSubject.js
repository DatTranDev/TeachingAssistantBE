const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSubjectSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
    },
    role: {
        type: String,
        enum: ['student', 'teacher'],
        required: true,
    }
});

userSubjectSchema.index({ userId: 1, subjectId: 1 }, { unique: true });
userSubjectSchema.set('toJSON',{
    "virtuals": true
});

const UserSubject = mongoose.model('UserSubject', userSubjectSchema);
module.exports = UserSubject;
