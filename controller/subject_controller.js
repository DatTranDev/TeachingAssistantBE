const Subject = require('../model/subject.js');
const User = require('../model/user.js');
const UserSubject = require('../model/userSubject.js');
const Question = require('../model/question.js');
const Channel = require('../model/channel.js');
const Post = require('../model/post.js');
const CAttend = require('../model/cAttend.js');
const ClassSession = require('../model/classSession.js');
const AttendRecord = require('../model/attendRecord.js');
const Review = require('../model/review.js');
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
    const sessions = req.body.sessions;
    if(sessions)
        await Promise.all(sessions.map(async session=>{
            const newClassSession = new ClassSession({
                subjectId: subject._id,
                dayOfWeek: session.dayOfWeek,
                end: session.end,
                start: session.start,
                room: session.room,
            });
            await newClassSession.save().catch(
                err=>{
                    return res.status(500).json({
                        message: "Internal server error: "+err
                    });
                });
        }));

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
            message: "User is not found"
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
        role: existStudent.role
    }
    const existUserSubject = await UserSubject.findOne({userId: us.userId, subjectId: us.subjectId});
    if(existUserSubject){
        return res.status(400).json({
            message: "You have already joined this subject"
        });
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
    if(req.body.currentSession){
        return res.status(400).json({
            message: "Current session is not allowed to update"
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
    // Delete all object references to this subject
    // Delete all questions
    await Question.deleteMany({
        subjectId: req.params.id
    }).catch(err=>{
        return res.status(500).json({
            message: "Internal server error while delete questions "+err
        });
    });
    // Delete all channels
    const channels = await Channel.find({
        subjectId: req.params.id
    });
    try{
        await Promise.all(channels.map(async channel=>{
            await Post.deleteMany({
                channelId: channel._id
            });
        }));
        await Channel.deleteMany({
            subjectId: req.params.id
        });
    } catch{
        return res.status(500).json({
            message: "Internal server error while delete channels "+err
        });
    }
    // Delete all class sessions
    const classSessions = await ClassSession.find({
        subjectId: req.params.id
    });
    try{
        await Promise.all(classSessions.map(async classSession=>{
            const cAttends = await CAttend.find({
                classSessionId: classSession._id
            });
            await Promise.all(cAttends.map(async cAttend=>{
                await AttendRecord.deleteMany({
                    cAttendId: cAttend._id
                });
                await Review.deleteMany({
                    cAttendId: cAttend._id
                });
            }));
            await CAttend.deleteMany({
                classSessionId: classSession._id
            });
            
        }));
        await ClassSession.deleteMany({
            subjectId: req.params.id
        });
    } catch(err){
        return res.status(500).json({
            message: "Internal server error while delete class sessions "+err
        });
    }
    //Delete all user subjects
    await UserSubject.deleteMany({
        subjectId: req.params.id
    }).catch(
        err=>{
            return res.status(500).json({
                message: "Internal server error while delete user subjects "+err
            });
        });

    await Subject.findByIdAndDelete(req.params.id).then(()=>{
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
const getAvgRating = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.subjectId);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid subject id"
        });
    }
    const existSubject = await Subject.findById(req.params.subjectId);
    if(!existSubject){
        return res.status(404).json({
            message: "Subject is not found"
        });
    }
    const classSessions = await ClassSession.find({
        subjectId: req.params.subjectId
    });
    const cAttends = await CAttend.find({
        classSessionId: {
            $in: classSessions.map(classSession=>classSession._id)
        }
    });
    const reviews = await Review.find({
        cAttendId: {
            $in: cAttends.map(cAttend=>cAttend._id)
        }
    });
    const totalReviews = reviews.length;
    const totalUnderstand = reviews.reduce((acc, review)=>acc+review.understandPercent, 0);
    const totalUseful = reviews.reduce((acc, review)=>acc+review.usefulPercent, 0);
    const totalTeachingMethod = reviews.reduce((acc, review)=>acc+parseInt(review.teachingMethodScore), 0);
    const totalAtmosphere = reviews.reduce((acc, review)=>acc+parseInt(review.atmosphereScore), 0);
    const totalDocument = reviews.reduce((acc, review)=>acc+parseInt(review.documentScore), 0);
    const avgUnderstand = totalReviews == 0 ? 0 : totalUnderstand/totalReviews;
    const avgUseful = totalReviews == 0 ? 0 : totalUseful/totalReviews;
    const avgTeachingMethod = totalReviews == 0 ? 0 : totalTeachingMethod/totalReviews;
    const avgAtmosphere = totalReviews == 0 ? 0 : totalAtmosphere/totalReviews;
    const avgDocument = totalReviews == 0 ? 0 : totalDocument/totalReviews;
    return res.status(200).json({
        avgUnderstand: avgUnderstand,
        avgUseful: avgUseful,
        avgTeachingMethod: avgTeachingMethod,
        avgAtmosphere: avgAtmosphere,
        avgDocument: avgDocument,
        thinkings: reviews.map(review=>review.thinking)
    });
};


module.exports = {
    addSubject, 
    joinSubject, 
    updateSubject, 
    deleteSubject, 
    findByUserId,
    getAvgRating
};