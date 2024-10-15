const Subject = require('../model/subject.js');
const User = require('../model/user.js');
const UserSubject = require('../model/userSubject.js');
const tokenController = require('./token_controller.js');
const helper = require('../pkg/helper/helper.js');

const addSubject = async(req, res)=>{
    const userIdFromToken = req.user.userId;    
    if (userIdFromToken != req.body.hostId) {
        await tokenController.deleteTokenByUserID(userIdFromToken);
        return res.status(403).json({
            message: "Unauthorized action"
        });
    }
    const existUser = await User.findOne({
        _id: req.body.hostId
    });
    if(!existUser){
        return res.status(404).json({
            message: "User is not found"
        });
    }
    
    const startDay = helper.parseDate(req.body.startDay);
    const endDay = helper.parseDate(req.body.endDay);

    
    if(isNaN(startDay.getTime()) || isNaN(endDay.getTime())){
        return res.status(400).json({
            message: "Invalid date format, following dd/mm/yyyy"
        });
    }
    if(startDay.getTime() > endDay.getTime()){
        return res.status(400).json({
            message: "Start day must be before end day"
        });
    }
    req.body.startDay = startDay;
    req.body.endDay = endDay;
    let newSubject = new Subject(req.body);
    while(true){
        let subjectCode = helper.randomCode();
        let existSubject = await Subject.findOne({
            joinCode: subjectCode
        });
        if(!existSubject){
            newSubject.joinCode = subjectCode;
            break;
        }
    }
    const subject = await newSubject.save().catch(
        err=>{
            return res.status(500).json({
                message: "Internal server error: "+err
            });
        });
    const userSubject = new UserSubject({
        userId: req.body.hostId,
        subjectId: subject._id,
        role: "teacher"
    });
    await userSubject.save().then(
        userSubject=>{
            return res.status(201).json({
                subject: subject,
                userSubject: userSubject
            });
        }).catch(
            err=>{
                return res.status(500).json({
                    message: "Internal server error: "+err
                });
            });
    
}
const joinSubject = async(req, res)=>{
    const isValidId2 = await helper.isValidObjectID(req.body.studentId);
    if(!isValidId2){
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    const existSubject = await Subject.findOne({
        joinCode: req.body.joinCode
    });
    if(!existSubject){
        return res.status(404).json({
            message: "Subject is not found"
        });
    }
    const existStudent = await User.findById(req.body.studentId);
    if(!existStudent){
        return res.status(404).json({
            message: "Student is not found"
        });
    }
    const userIdFromToken = req.user.userId;
    if(userIdFromToken != req.body.studentId){
        await tokenController.deleteTokenByUserID(userIdFromToken);
        return res.status(403).json({
            message: "Unauthorized action"
        });
    }
    const us = {
        userId: req.body.studentId,
        subjectId: existSubject._id,
        role: "student"
    }
    const userSubject = new UserSubject(us);
    await userSubject.save().then(
        userSubject=>{
            return res.status(201).json({
                userSubject: userSubject
            });
        }).catch(
            err=>{
                return res.status(500).json({
                    message: "Internal server error: "+err
                });
            });
}
const updateSubject = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.id);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid subject id"
        });
    }
    const existSubject = await Subject.findOne({
        _id: req.params.id
    });
    if(!existSubject){
        return res.status(404).json({
            message: "Subject is not found"
        });
    }
    const userIdFromToken = req.user.userId;
    if(userIdFromToken !== existSubject.hostId.toString()){  
        await tokenController.deleteTokenByUserID(userIdFromToken);
        return res.status(403).json({
            message: "Unauthorized action"
        });
    }
    if(!existSubject){
        return res.status(404).json({
            message: "Subject is not found"
        });
    }
    if(req.body.joinCode){
        return res.status(400).json({
            message: "Join code is not allowed to update"
        });
    }
    if(req.body.hostId){
        return res.status(400).json({
            message: "Host id is not allowed to update"
        });
    }
    if(req.body.startDay){
        req.body.startDay = helper.parseDate(req.body.startDay);
        if (isNaN(req.body.startDay.getTime())) {
            return res.status(400).json({
                message: "Invalid date format, following dd/mm/yyyy"
            });
        }
    }
    if(req.body.endDay){
        req.body.endDay = helper.parseDate(req.body.endDay);
        if (isNaN(req.body.endDay.getTime())) {
            return res.status(400).json({
                message: "Invalid date format, following dd/mm/yyyy"
            });
        }
    }
    if(req.body.startDay && req.body.endDay && req.body.startDay.getTime() > req.body.endDay.getTime()){
        return res.status(400).json({
            message: "Start day must be before end day"
        });
    }
    await Subject.findByIdAndUpdate(req.params.id, req.body).then((subject)=>{
        return res.status(200).json({
            message: "Subject is updated successfully"
        });
    }).catch(
        err=>{
            return res.status(500).json({
                message: "Internal server error: "+err
            });
        });
}
const deleteSubject = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.id);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid subject id"
        });
    }
    const existSubject = await Subject.findOne({
        _id: req.params.id
    });
    if(!existSubject){
        return res.status(404).json({
            message: "Subject is not found"
        });
    }
    const userIdFromToken = req.user.userId;
    if(userIdFromToken !== existSubject.hostId.toString()){  
        await tokenController.deleteTokenByUserID(userIdFromToken);
        return res.status(403).json({
            message: "Unauthorized action"
        });
    }
    await Subject.findByIdAndDelete(req.params.id).then(
        subject=>{
            // Delete all object references to this subject

            return res.status(200).json({
                message: "Subject is deleted successfully"
            });
        }).catch(
            err=>{
                return res.status(500).json({
                    message: "Internal server error: "+err
                });
            });
    
}
const findByUserId = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.userId);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid user id"
        });
    }
    const existUser = await User.findById(req.params.userId);
    if(!existUser){
        return res.status(404).json({
            message: "User is not found"
        });
    }
    const userIdFromToken = req.user.userId;
    if(userIdFromToken != req.params.userId){
        await tokenController.deleteTokenByUserID(userIdFromToken);
        return res.status(403).json({
            message: "Unauthorized action"
        });
    }
    const userSubjects = await UserSubject.find({
        userId: req.params.userId
    });
    const subjectIds = userSubjects.map(userSubject=>userSubject.subjectId);
    const subjects = await Subject.find({
        _id: {
            $in: subjectIds
        }
    });
    return res.status(200).json({
        subjects: subjects
    });
}

module.exports = {addSubject, joinSubject, updateSubject, deleteSubject, findByUserId};