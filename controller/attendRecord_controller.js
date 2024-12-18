const AttendRecord = require('../model/attendRecord.js');
const User = require('../model/user.js');
const CAttend = require('../model/cAttend.js');
const Subject = require('../model/subject.js');
const helper = require('../pkg/helper/helper.js');
const { populate } = require('../model/token.js');

const addAttendRecord = async (req, res) => {
    const isValidId = await helper.isValidObjectID(req.body.cAttendId);
    const isValidId2 = await helper.isValidObjectID(req.body.studentId);
    if (!isValidId || !isValidId2) {
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    const existCAttend = await CAttend.findById(req.body.cAttendId);
    if (!existCAttend) {
        return res.status(404).json({
            message: "CAttend is not found"
        });
    }

    if(existCAttend.updatedAt.getTime() + existCAttend.timeExpired * 60000 < Date.now()){
        return res.status(400).json({
            message: "Class is expired, no more attendance"
        });
    }

    const existStudent = await User.findById(req.body.studentId);
    if (!existStudent) {
        return res.status(404).json({
            message: "Student is not found"
        });
    }
    const userIdFromToken = req.user.userId;
    if (userIdFromToken != req.body.studentId) {
        return res.status(403).json({
            message: "Unauthorized action"
        });
    }
    const attendRecord = await AttendRecord.findOne({
        cAttendId: req.body.cAttendId,
        studentId: req.body.studentId
    });
    if (attendRecord) {
        return res.status(400).json({
            message: "Attend record is already exist, please update it"
        });
    }
    if(!req.body.FCMToken){
        return res.status(400).json({
            message: "FCMToken is required"
        });
    }
    const existAttendRecord = await AttendRecord.findOne({
        cAttendId: req.body.cAttendId,
        FCMToken: req.body.FCMToken
    });
    if(existAttendRecord){
        return res.status(400).json({
            message: "This device is already used for attendance in class session today"
        });
    }
    const lat1 = existCAttend.teacherLatitude;
    const lon1 = existCAttend.teacherLongitude;
    const lat2 = req.body.studentLatitude;
    const lon2 = req.body.studentLongitude;
    if(helper.isPresent(helper.getDistanceInKm(lat1, lon1, lat2, lon2))){
        req.body.status = "CM";
    }else{
        req.body.status = "KP";
    }
    if(!existCAttend.isActive){
        req.body.status = "KP";
    }
    const newAttendRecord = new AttendRecord(req.body);
    await newAttendRecord.save().then((attendRecord) => {
        return res.status(201).json({
            attendRecord: attendRecord
        });
    }).catch(
        err => {
            return res.status(500).json({
                message: "Internal server error: " + err
            });
        });
}
const findByUserAndSubject = async (req, res) => {
    const isValidId = await helper.isValidObjectID(req.params.userId);
    if (!isValidId) {
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    const existUser = await User.findById(req.params.userId);
    if (!existUser) {
        return res.status(404).json({
            message: "User is not found"
        });
    }
    const isValidId2 = await helper.isValidObjectID(req.params.subjectId);
    if (!isValidId2) {
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    const existSubject = await Subject.findById(req.params.subjectId);
    if (!existSubject) {
        return res.status(404).json({
            message: "Subject is not found"
        });
    }
    const attendRecords = await AttendRecord.find({
        studentId: req.params.userId
    }).populate({
        path: 'cAttendId',
        populate: {path: 'classSessionId'}
    });

    return res.status(200).json({
        attendRecords: attendRecords.filter(attendRecord => attendRecord.cAttendId.classSessionId.subjectId == req.params.subjectId)
    });
}
const addForStudent = async (req, res) => {
    const isValidId = await helper.isValidObjectID(req.body.cAttendId);
    if (!isValidId) {
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    const existCAttend = await CAttend.findById(req.body.cAttendId).populate({
        path: 'classSessionId',
        populate: {path: 'subjectId'}
    });
    if (!existCAttend) {
        return res.status(404).json({
            message: "CAttend is not found"
        });
    }
    const userIdFromToken = req.user.userId;
    if (userIdFromToken != existCAttend.classSessionId.subjectId.hostId) {
        return res.status(403).json({
            message: "Unauthorized action, you are not the host teacher of the subject"
        });
    }
    const attendRecord = await AttendRecord.findOne({
        cAttendId: req.body.cAttendId,
        studentId: req.body.studentId
    });
    if (attendRecord) {
        attendRecord.status = req.body.status;
        await attendRecord.save().then((attendRecord) => {
            return res.status(200).json({
                attendRecord: attendRecord
            });
        }).catch(
            err => {
                return res.status(500).json({
                    message: "Internal server error: " + err
                });
            });
    }
    if(!req.body.status){
        return res.status(400).json({
            message: "Status is required"
        });
    }
    const enumStatus = ["CM", "KP", "CP"];
    if(!enumStatus.includes(req.body.status)){
        return res.status(400).json({
            message: "Invalid status"
        });
    }
    const newAttendRecord = new AttendRecord(req.body);
    await newAttendRecord.save().then((attendRecord) => {
        return res.status(201).json({
            attendRecord: attendRecord
        });
    }).catch(
        err => {
            return res.status(500).json({
                message: "Internal server error: " + err
            });
        });
}
const updateForStudent = async (req, res) => {
    const isValidId = await helper.isValidObjectID(req.params.id);
    if (!isValidId) {
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    const existAttendRecord = await AttendRecord.findById(req.params.id).populate({
        path: 'cAttendId',
        populate: {
            path: 'classSessionId',
            populate: {path: 'subjectId'}
        }
    });
    if (!existAttendRecord) {
        return res.status(404).json({
            message: "Attend record is not found"
        });
    }
    const userIdFromToken = req.user.userId;
    if (userIdFromToken != existAttendRecord.cAttendId.classSessionId.subjectId.hostId) {
        return res.status(403).json({
            message: "Unauthorized action, you are not the host teacher of the subject"
        });
    }
    if(!req.body.status){
        return res.status(400).json({
            message: "Status is required"
        });
    }
    const enumStatus = ["CM", "KP", "CP"];
    if(!enumStatus.includes(req.body.status)){
        return res.status(400).json({
            message: "Invalid status"
        });
    }
    const update = {
        status: req.body.status
    }
    await AttendRecord.findByIdAndUpdate(req.params.id, update, {new: true}).then((attendRecord) => {
        return res.status(200).json({
            attendRecord: attendRecord
        });
    }).catch(
        err => {
            return res.status(500).json({
                message: "Internal server error: " + err
            });
        });
}

module.exports = { addAttendRecord, findByUserAndSubject, addForStudent, updateForStudent };