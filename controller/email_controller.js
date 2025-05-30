const Service = require("../services/email.service.js");
const RedisService = require('../services/redis.service.js');
const User = require("../model/user.js")
const Helper = require("../utils/helper.js")
const sendEmail =async (req,res)=>{
    try {
    const email = req.body.email;

    const isValidEmail = await Helper.isValidEmail(email);
    if (!isValidEmail) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const existUser = await User.findOne({ email });
    if (!existUser) {
      return res.status(404).json({ message: "User is not found" });
    }

    const redisKey = `emailCode:${email}`;
    const cachedCode = await RedisService.get(redisKey);
    if (cachedCode) {
      return res.status(429).json({ message: "Code already sent. Please wait." });
    }

    const code = Helper.randomCode();
    await Service.send(email, code);

    await RedisService.set(redisKey, code, 120); 

    res.status(200).json({ message: "Send email successful"});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  } 
}
const verifyCode = async (req,res)=>{
    try {
        const email = req.body.email;
        const code = req.body.code;
    
        const isValidEmail = await Helper.isValidEmail(email);
        if (!isValidEmail) {
          return res.status(400).json({ message: "Invalid email" });
        }
    
        const redisKey = `emailCode:${email}`;
        const cachedCode = await RedisService.get(redisKey);
        if (!cachedCode) {
          return res.status(400).json({ message: "Code expired or not sent" });
        }
    
        if (cachedCode !== code) {
          return res.status(400).json({ message: "Invalid code" });
        }
    
        await RedisService.del(redisKey);
    
        res.status(200).json({ message: "Verify code successful" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
      } 
}
const verifyEmail = async (req,res)=>{
  const email = req.body.email;
  const isValidEmail = await Helper.isValidEmail(email);
  if (!isValidEmail) {
    return res.status(400).json({ message: "Invalid email" });
  }
  const existUser = await User.find({ email });
  if (existUser.length > 0) {
    return res.status(400).json({ message: "Email already exists" });
  }
  const redisKey = `emailCode:${email}`;
  const cachedCode = await RedisService.get(redisKey);
  if (cachedCode) {
    return res.status(429).json({ message: "Code already sent. Please wait." });
  }
  const code = Helper.randomCode();
  await Service.send(email, code);
  await RedisService.set(redisKey, code, 120); 
  res.status(200).json({ message: "Send email successful" });
}


module.exports= {sendEmail, verifyCode, verifyEmail}