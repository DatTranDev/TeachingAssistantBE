const User = require('../model/user.js');
const bcrypt = require("../pkg/auth/authorization.js");
const auth = require('../pkg/auth/authentication.js');
const helper = require('../pkg/helper/helper.js');
const tokenController = require('./token_controller.js');
const register = async(req, res)=>{
    const isValidEmail = await helper.isValidEmail(req.body.email);
    if(!isValidEmail){
        return res.status(400).json({
            message: "Invalid email"
        });
    }
    const existUser = await User.findOne({
        email: req.body.email
    });
    if(existUser){
        return res.status(400).json({
            message: "Email already exist"
        });
    }

    const newUser = new User(req.body);
    newUser.password = await bcrypt.hashPassword(newUser.password);
    let userId = null;
    await newUser.save().then((user)=>{
        userId = user._id;
    }).catch(
        err=>{
            return res.status(500).json({
                message: "Internal server error: "+err
            });
        });
    const resUser = await User.findById(userId).select('-password');
    const accessToken = await auth.generateToken(newUser, '1h', 'access');
    const refreshToken = await auth.generateToken(newUser, '30d', 'refresh');
    await tokenController.addNewToken(refreshToken, newUser._id);
    return res.status(201).json({
        user: resUser,
        accessToken: accessToken,
        refreshToken: refreshToken
    });
}
const login = async(req, res)=>{
    const existUser = await User.findOne({
        email: req.body.email
    }).select('+password');
    if(!existUser) return res.status(404).json({
        message: "User is not found"
    })
    const isValidPassword = await bcrypt.comparePassword(req.body.password, existUser.password)
    if(!isValidPassword) return res.status(401).json({
        message: "Wrong password"
    })
    const user = await User.findOne({
        email: req.body.email
    }).select('-password')
    const accessToken = await auth.generateToken(existUser,"1h", 'access')
    const refreshToken = await auth.generateToken(existUser, "30d", 'refresh')
    tokenController.addNewToken(refreshToken, user._id)
    return res.json({
        accessToken: accessToken,
        refreshToken: refreshToken,
        data: user
    })
}
const updateUser = async(req, res)=>{
    const userIdFromToken = req.user.userId;
    const id = req.params.id;
    const isValidId = await helper.isValidObjectID(id);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    const existUser = await User.findById(id);
    // Check if the user ID from the token matches the user ID of the account being modified
    if (existUser._id.toString() !== userIdFromToken) {
        await tokenController.deleteTokenByUserID(userIdFromToken);
        return res.status(403).json({ message: "Unauthorized action" });
    }
    if(req.body.password != null) return res.status(400).json({
        message: "Use changePassword route to change password"
    })
    await User.findByIdAndUpdate(id, req.body).catch((err)=>{
        return res.status(400).json({
            message: "Internal server error: "+err
        });
    })
    return res.status(200).json({
        message: "Updated successfully"
    });
};
const changePassword = async(req, res)=>{
    const isValidEmail = await helper.isValidEmail(req.body.email);
    if(!isValidEmail){
        return res.status(400).json({
            message: "Invalid email"
        });
    }
    const existUser = await User.findOne({
        email: req.body.email
    });
    if(!existUser){
        return res.status(404).json({
            message: "User is not found"
        });
    }
    const password = req.body.password;
    const hashPassword = await bcrypt.hashPassword(password);
    await User.findOneAndUpdate({
        email: req.body.email
    }, {
        password: hashPassword
    }).catch((err)=>{
        return res.status(400).json({
            message: "Internal server error: "+err
        });
    });
    return res.status(200).json({
        message: "Password changed successfully"
    }); 
};



module.exports = {register, login, updateUser, changePassword}