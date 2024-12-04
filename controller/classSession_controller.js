const ClassSession = require('../model/classSession.js');
const User = require('../model/user.js');
const Subject = require('../model/subject.js');
const UserSubject = require('../model/userSubject.js');
const tokenController = require('./token_controller.js');
const Review = require('../model/review.js');
const AttendRecord = require('../model/attendRecord.js');
const CAttend = require('../model/cAttend.js');
const helper = require('../pkg/helper/helper.js');

const addClassSession = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.body.subjectId);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid subject id"
        });
    }
    const existSubject = await Subject.findOne({
        _id: req.body.subjectId
    });
    const userIdFromToken = req.user.userId;
    if(userIdFromToken != existSubject.hostId){
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
    const userSubject = await UserSubject.findOne({
        userId: userIdFromToken,
        subjectId: existSubject._id,
        role: "teacher"
    })
    if(!userSubject){
        return res.status(404).json({
            message: "User is not a teacher of the subject"
        });
    }
    const newClassSession = new ClassSession(req.body);
    await newClassSession.save().then((classSession)=>{
        return res.status(201).json({
            classSession: classSession
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
    const existUser = await User.findOne({
        _id: req.params.userId
    });
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
    const subjectIds = userSubjects.map((userSubject)=>{
        return userSubject.subjectId;
    });
    const classSessions = await ClassSession.find({
        subjectId: {
            $in: subjectIds
        }
    });

    const results = await Promise.all(classSessions.map(async(classSession)=>{
        var subject = await Subject.findOne({
            _id: classSession.subjectId
        });
        const host = await User.findById(subject.hostId).select('-password');
        subject = {
            ...subject.toObject(),
            id: subject._id,
            host: host
        }
        return {
            ...classSession.toObject(),
            id: classSession._id,
            subject: subject
        }
    }));
    return res.status(200).json({
        classSessions: results
    });
}
const updateClassSession = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.id);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid class session id"
        });
    }
    const existClassSession = await ClassSession.findOne({
        _id: req.params.id
    });
    if(!existClassSession){
        return res.status(404).json({
            message: "Class session is not found"
        });
    }
    const subjectId = req.body.subjectId;
    if(subjectId){
        res.status(400).json({
            message: "Subject id cannot be updated"
        });
    }
    const userIdFromToken = req.user.userId;
    const subject = await Subject.findOne({
        _id: existClassSession.subjectId
    });
    if(userIdFromToken != subject.hostId.toString()){
        await tokenController.deleteTokenByUserID(userIdFromToken);
        return res.status(403).json({
            message: "Unauthorized action"
        });
    }
    const updateInfo = {
        room: req.body.room,
        dayOfWeek: req.body.dayOfWeek,
        start: req.body.start,
        end: req.body.end
    }
    await ClassSession.findByIdAndUpdate(req.params.id, updateInfo).then((classSession)=>{
        return res.status(200).json({
            message: "Class session is updated successfully"
        });
    }).catch(
        err=>{
            return res.status(500).json({
                message: "Internal server error: "+err
            });
        });
}
const deleteClassSession = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.id);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid class session id"
        });
    }
    const existClassSession = await ClassSession.findOne({
        _id: req.params.id
    });
    if(!existClassSession){
        return res.status(404).json({
            message: "Class session is not found"
        });
    }
    const subject = await Subject.findOne({
        _id: existClassSession.subjectId
    });
    const userIdFromToken = req.user.userId;
    if(userIdFromToken != subject.hostId.toString()){
        await tokenController.deleteTokenByUserID(userIdFromToken);
        return res.status(403).json({
            message: "Unauthorized action"
        });
    }
    // Delete all objects that have reference to this class session
    const cAttends = await CAttend.find({
        classSessionId: req.params.id
    });
    try{
        await Promise.all(cAttends.map(async(cAttend)=>{
            await AttendRecord.deleteMany({
                cAttendId: cAttend._id
            });
            await Review.deleteMany({
                cAttendId: cAttend._id
            });
        }));
        await CAttend.deleteMany({
            classSessionId: req.params.id
        });
    }
    catch(err){
        return res.status(500).json({
            message: "Internal server error: "+err
        });
    }
    await ClassSession.findByIdAndDelete(req.params.id).then(()=>{
        return res.status(200).json({
            message: "Class session is deleted successfully"
        });
    }).catch(
        err=>{
            return res.status(500).json({
                message: "Internal server error: "+err
            });
        });
}
const findBySubjectId = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.subjectId);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid subject id"
        });
    }
    const existSubject = await Subject.findOne({
        _id: req.params.subjectId
    });
    if(!existSubject){
        return res.status(404).json({
            message: "Subject is not found"
        });
    }
    const userIdFromToken = req.user.userId;
    const userSubject = await UserSubject.findOne({
        userId: userIdFromToken,
        subjectId: existSubject._id
    });
    if(!userSubject){
        return res.status(404).json({
            message: "User is not a member of the subject"
        });
    }
    const classSessions = await ClassSession.find({
        subjectId: req.params.subjectId
    });
    return res.status(200).json({
        classSessions: classSessions
    });
}
module.exports = {
    addClassSession, 
    findByUserId, 
    updateClassSession,
    deleteClassSession,
    findBySubjectId
};