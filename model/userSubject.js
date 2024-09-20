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

userSubjectSchema.set('toJSON',{
    "virtuals": true
});

const UserSubjectModel = mongoose.model('UserSubject', userSubjectSchema);
module.exports = UserSubjectModel;
