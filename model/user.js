const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    userCode: {
        type: String,
        required: true,
    },
    school:{
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['student', 'teacher'],
        required: true,
    },
    avatar: {
        type: String,
        default: ''
    }
});
userSchema.virtual("id").get(function(){
    return this._id.toHexString
})

userSchema.set('toJSON',{
    "virtuals": true
})
const UserModel = mongoose.model('User', userSchema);
module.exports = UserModel;
