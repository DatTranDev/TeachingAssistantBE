const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const classSessionSchema = new Schema({
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
    },
    room: {
        type: String,
        required: true,
    },
    dayOfWeek: {
        type: Number,
        enum: [1, 2, 3, 4, 5, 6, 7],  // 1-7 represents Monday-Sunday
        required: true,
    },
    start: {
        type: String,  // Consider storing as "HH:mm"
        required: true,
    },
    end: {
        type: String,  // Consider storing as "HH:mm"
        required: true,
    }
});
classSessionSchema.virtual("id").get(function(){
    return this._id.toHexString
}); 
classSessionSchema.set('toJSON',{
    "virtuals": true
});

const ClassSession = mongoose.model('ClassSession', classSessionSchema);
module.exports = ClassSession;
