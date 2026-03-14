const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const aiChatHistorySchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ['user', 'model'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AIChatHistory', aiChatHistorySchema);
