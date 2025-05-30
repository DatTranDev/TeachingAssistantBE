const FCMToken = require('../model/FCMToken.js');
const Token = require('../model/token.js');
const TokenHepler = require('../utils/token.js');
const UserService = require('./user.service.js');

const TokenService = {
    addFCM: async (userId, token) => {
        const existingToken = await FCMToken.findOne({ user: userId });
        if (existingToken) {
            existingToken.FCMToken = token;
            await existingToken.save().catch(err => {
                throw new Error(`Error updating FCM token: ${err.message}`);
            });
            return existingToken;
        } else {
            const newToken = new FCMToken({ user: userId, FCMToken: token });
            await newToken.save().catch(err => {
                throw new Error(`Error saving FCM token: ${err.message}`);
            });
            return newToken;
        }
    },
    getFCM: async (userId) => {
        const token = await FCMToken.findOne({ user: userId });
        if (!token) throw new Error('FCM token not found for this user');
        return token;
    },
    getFCMs: async (userIds) => {
        const tokens = await FCMToken.find({ user: { $in: userIds } }).lean();
        const tokenList = tokens.map(t => t.FCMToken).filter(Boolean);
        if (tokenList.length === 0) throw new Error('No FCM tokens found for the provided user IDs');
        return tokens;
    },
    addNewToken: async (token, userID)=>{
        const tokenModel= new Token({
            token: token,
            user: userID
        })
        await tokenModel.save().catch(
            err=>{
                return err
            }
        )
        return null;
    },
    checkTokenIsRevoked: async (token) =>{
        const jwt = await TokenHepler.verifyToken(token)
        const type = jwt.type
        if(type == 'access'){
            return false
        }
        const tokenModel = await Token.findOne(
            {
                token: token
            }
        )
        if(!tokenModel) return true
        return false
    },
    revokedToken: async (token) =>{
        const tokenFind = await Token.findOneAndDelete({
            token: token
        })
        return tokenFind
    },
    getAccessToken: async (refreshToken) =>{
        const jwt = await Token.verifyToken(refreshToken)
        const id= jwt.userId
        const user = await UserService.get(id);
        const token =  await TokenHepler.generateToken(user, "1h", 'access')
        return token
    },
    deleteTokenByUserID: async (uid) =>{
        return await Token.deleteMany({
            user: uid
        })
    },
    deleteAllToken: async ()=>{
        return await Token.deleteMany({});
    }
}
module.exports = TokenService;