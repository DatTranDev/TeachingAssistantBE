const jwt = require("jsonwebtoken")
require("dotenv").config()
const secret = process.env.SECRET_KEY
const generateToken = async (payload, expired, type) =>{
    return await jwt.sign(
        {
            userId: payload._id,
            type: type
        },
        secret,
        {
            algorithm: "HS256",
            expiresIn: expired
        }
    )
}

const verifyToken = async (token) =>{
    return await jwt.verify(
        token,
        secret
    )   
}
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization').replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'Access Denied' });
    }

    try {
        const verified = jwt.verify(token, secret);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: 'Invalid Token' });
    }
};
module.exports={generateToken,verifyToken, authenticateToken}