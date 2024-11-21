const AttendRecord = require('../model/attendRecord.js');
const User = require('../model/user.js');
const CAttend = require('../model/cAttend.js');
const Subject = require('../model/subject.js');
const helper = require('../pkg/helper/helper.js');
const tokenController = require('./token_controller.js');

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

    const existStudent = await User.findById(req.body.studentId);
    if (!existStudent) {
        return res.status(404).json({
            message: "Student is not found"
        });
    }
    const userIdFromToken = req.user.userId;
    if (userIdFromToken != req.body.studentId) {
        await tokenController.deleteTokenByUserID(userIdFromToken);
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

module.exports = { addAttendRecord, findByUserAndSubject};