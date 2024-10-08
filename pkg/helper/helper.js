const validator = require('validator')
const mongoose = require("mongoose")

const isValidEmail =async  (email)=>{
    try{
        return await validator.isEmail(email)
    }
    catch
    {
        return false;
    }
}

const isValidPhoneNumber = async (phoneNumber) =>{
    try{
        return await validator.isMobilePhone(phoneNumber)
    }
    catch{
        return false
    }
}

const isValidObjectID = async (id) =>{
    try{
        return await mongoose.isValidObjectId(id)
    }
    catch{
        return false
    }
}

const randomCode =()=>{
    const codeInit = "QWERTYUIOPASDFGHJKLZXCVBNM1234567890"
    let code = ""
    for(let i =0; i<6;i++){
        const index = Math.floor(Math.random()*codeInit.length)
        code += codeInit.charAt(index)
    }
    return code
}
const deg2rad = (deg)=>{
    return deg * (Math.PI/180);
}
const getDistanceInKm = (lat1, lon1, lat2, lon2)=>{
    var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d;
}
const isPresent = (dis)=>{
    if (dis < 0.3){
        return true
    }
    return false
}
module.exports = {isValidEmail, isValidPhoneNumber, isValidObjectID, randomCode, getDistanceInKm, isPresent}