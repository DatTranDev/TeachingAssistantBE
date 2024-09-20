const ClassSession = require('../model/classSession.js');
const User = require('../model/user.js');
const Subject = require('../model/subject.js');
const UserSubject = require('../model/userSubject.js');
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
    if(!existSubject){
        return res.status(404).json({
            message: "Subject is not found"
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
            host: host
        }
        return {
            ...classSession.toObject(),
            subject: subject
        }
    }));
    return res.status(201).json({
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
    await ClassSession.findByIdAndUpdate(req.params.id, req.body).then((classSession)=>{
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
module.exports = {addClassSession, findByUserId, updateClassSession, deleteClassSession};