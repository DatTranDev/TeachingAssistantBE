const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const FCMTokenSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    FCMToken: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
});
const FCMToken = mongoose.model('FCMToken', FCMTokenSchema);
module.exports = FCMToken;
