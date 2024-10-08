const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const subjectSchema = new Schema({
    code: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    hostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    startDay: {
        type: Date,
        required: true,
    },
    endDay: {
        type: Date,
        required: true,
    },
    joinCode: {
        type: String,
        required: true,
        unique: true
    }
});

subjectSchema.virtual("id").get(function(){
    return this._id.toHexString
});
subjectSchema.set('toJSON',{
    "virtuals": true
});

const SubjectModel = mongoose.model('Subject', subjectSchema);
module.exports = SubjectModel;
