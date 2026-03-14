const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const aiUsageLogSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    endpoint: {
        type: String,
        required: true
    },
    feature: {
        type: String,
        default: 'chat'
    },
    prompt: {
        type: String,
        required: true
    },
    response: {
        type: String,
        required: true
    },
    inputTokens: {
        type: Number,
        default: 0
    },
    outputTokens: {
        type: Number,
        default: 0
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AIUsageLog', aiUsageLogSchema);
