const jwt = require("jsonwebtoken")
require("dotenv").config()

const secret = process.env.SECRET_KEY

const auth = (req, res, next) => {
    try {
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(400).json({ message: 'Invalid Token' });
    }
};
module.exports= auth;