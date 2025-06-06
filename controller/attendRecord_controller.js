const AttendRecord = require('../model/attendRecord.js');
const AbsenceRequest = require('../model/absenceRequest.js');
const User = require('../model/user.js');
const CAttend = require('../model/cAttend.js');
const Subject = require('../model/subject.js');
const helper = require('../utils/helper.js');
const UserSubject = require('../model/userSubject.js');

const addAttendRecord = async (req, res) => {
    try {
        const { cAttendId, studentId, studentLatitude, studentLongitude, FCMToken, index } = req.body;

        if (!helper.isValidObjectID(cAttendId) || !helper.isValidObjectID(studentId)) {
            return res.status(400).json({ message: "Invalid ID" });
        }

        const [existCAttend, existStudent] = await Promise.all([
            CAttend.findById(cAttendId),
            User.findById(studentId)
        ]);

        if (!existCAttend) return res.status(404).json({ message: "CAttend not found" });
        if (!existStudent) return res.status(404).json({ message: "Student not found" });

        if (existCAttend.updatedAt.getTime() + existCAttend.timeExpired * 60000 < Date.now() || !existCAttend.isActive) {
            return res.status(400).json({ message: "Class session expired" });
        }

        if (req.user.userId !== studentId) {
            return res.status(403).json({ message: "Unauthorized action" });
        }

        const existingRecord = await AttendRecord.findOne({ cAttendId, studentId });
        const distance = helper.getDistanceInKm(
            existCAttend.teacherLatitude, existCAttend.teacherLongitude,
            studentLatitude, studentLongitude
        );
        const isPresent = helper.isPresent(distance);
        const newStatus = isPresent ? "CM" : "KP";

        const statusEntry = { index: index, status: newStatus };

        if (existingRecord) {
            existingRecord.status = newStatus;
            if (existingRecord.listStatus.some(entry => entry.index === index)) {
                const existingIndex = existingRecord.listStatus.findIndex(entry => entry.index === index);
                existingRecord.listStatus[existingIndex].status = newStatus;
            }
            else
                existingRecord.listStatus.push(statusEntry);
            existingRecord.numberOfAbsence = isPresent ? existingRecord.numberOfAbsence : existingRecord.numberOfAbsence + 1;
            existingRecord.status = existingRecord.numberOfAbsence >= existCAttend.acceptedNumber ? "CM" : "KP";
            await existingRecord.save();
            return res.status(200).json({ attendRecord: existingRecord });
        }

        if (!FCMToken) return res.status(400).json({ message: "FCMToken required" });

        const tokenUsed = await AttendRecord.findOne({ cAttendId, FCMToken });
        if (tokenUsed) return res.status(400).json({ message: "This device already used for attendance" });

        const numberOfAbsence = isPresent ? 1 : 0;
        const newAttendRecord = new AttendRecord({
            cAttendId,
            studentId,
            FCMToken,
            studentLatitude,
            studentLongitude,
            status: numberOfAbsence >= existCAttend.acceptedNumber ? "CM" : "KP",
            numberOfAbsence: numberOfAbsence,
            listStatus: [statusEntry]
        });
        await newAttendRecord.save();
        return res.status(201).json({ attendRecord: newAttendRecord });

    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err });
    }
};

const findByUserAndSubject = async (req, res) => {
    try {
        const { userId, subjectId } = req.params;
        if (!helper.isValidObjectID(userId) || !helper.isValidObjectID(subjectId)) {
            return res.status(400).json({ message: "Invalid ID" });
        }

        const attendRecords = await AttendRecord.find({ studentId: userId }).populate({
            path: 'cAttendId',
            populate: {
                path: 'classSessionId',
                populate: { path: 'subjectId' }
            }
        });

        const filtered = attendRecords.filter(record => record.cAttendId?.classSessionId?.subjectId?._id.toString() === subjectId);
        return res.status(200).json({ attendRecords: filtered });
    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err });
    }
};

const addForStudent = async (req, res) => {
    try {
        const { cAttendId, studentId, status, index } = req.body;
        if (!helper.isValidObjectID(cAttendId) || !helper.isValidObjectID(studentId)) {
            return res.status(400).json({ message: "Invalid ID" });
        }
        const enumStatus = ["CM", "KP", "CP"];
        if (!enumStatus.includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const existCAttend = await CAttend.findById(cAttendId).populate({
            path: 'classSessionId',
            populate: { path: 'subjectId' }
        });

        if (!existCAttend) return res.status(404).json({ message: "CAttend not found" });

        if (req.user.userId !== existCAttend.classSessionId.subjectId.hostId.toString()) {
            return res.status(403).json({ message: "Unauthorized action" });
        }

        let attendRecord = await AttendRecord.findOne({ cAttendId, studentId });
        const statusEntry = { index: index, status: status };

        if (attendRecord) {
            const existingIndex = attendRecord.listStatus.findIndex(entry => entry.index === index);

            if (existingIndex === -1) {
                attendRecord.listStatus.push(statusEntry);
            } else {
                attendRecord.listStatus[existingIndex].status = status;
            }
           
            attendRecord.numberOfAbsence = attendRecord.listStatus.filter(entry => entry.status === "CM").length;

            // Update overall status based on numberOfAbsence
            attendRecord.status = attendRecord.numberOfAbsence >= existCAttend.acceptedNumber ? "CM" : "KP";

            await attendRecord.save();
            return res.status(200).json({ attendRecord });
        }

        const newRecord = new AttendRecord({
            cAttendId,
            studentId,
            status,
            listStatus: [statusEntry],
            numberOfAbsence: status === "CM" ? 1 : 0,
            status: status === "CM" && 1 >= existCAttend.acceptedNumber ? "CM" : "KP",
            FCMToken: 'N/A',
            studentLatitude: 0,
            studentLongitude: 0
        });
        await newRecord.save();
        return res.status(201).json({ attendRecord: newRecord });

    } catch (err) {
        console.error("Error in addForStudent:", err);
        return res.status(500).json({ message: "Server error", error: err });
    }
};

const updateForStudent = async (req, res) => {
    try {
        const id = req.params.id;
        const { status, index } = req.body;
        if (!helper.isValidObjectID(id)) {
            return res.status(400).json({ message: "Invalid ID" });
        }

        const attendRecord = await AttendRecord.findById(id).populate({
            path: 'cAttendId',
            populate: {
                path: 'classSessionId',
                populate: { path: 'subjectId' }
            }
        });

        if (!attendRecord) return res.status(404).json({ message: "Attend record not found" });

        if (req.user.userId !== attendRecord.cAttendId.classSessionId.subjectId.hostId.toString()) {
            return res.status(403).json({ message: "Unauthorized action" });
        }

        const enumStatus = ["CM", "KP", "CP"];
        if (!enumStatus.includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const statusEntry = { index: index, status: status };

        attendRecord.numberOfAbsence = status === "CM" ? attendRecord.numberOfAbsence + 1 : attendRecord.numberOfAbsence;
        attendRecord.status = attendRecord.numberOfAbsence >= attendRecord.cAttendId.acceptedNumber ? "CM" : "KP";
        attendRecord.listStatus.push(statusEntry);
        await attendRecord.save();
        return res.status(200).json({ attendRecord });

    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err });
    }
};
const markExcusedAttendance = async (req, res) => {
    try{
        // Create attendance record for all students, with default status is "KP"
        if (!req.body.subjectId || !req.body.cAttendId || !req.body.date) {
            return res.status(400).json({message: "Missing required fields"});
        }
        if (!helper.isValidObjectID(req.body.subjectId) || !helper.isValidObjectID(req.body.cAttendId)) {
            return res.status(400).json({message: "Invalid ID"});
        }
        const existSubject = await Subject.findById(req.body.subjectId);
        if (!existSubject) {
            return res.status(404).json({message: "Subject not found"});
        }
        const user = await UserSubject.find({ subjectId: req.body.subjectId, role: "student" });
        await Promise.all(user.map(async us => {
            const existAttendRecord = await AttendRecord.findOne({ cAttendId: req.body.cAttendId, studentId: us.userId });
            if (!existAttendRecord) {
                const newAttendRecord = new AttendRecord({
                    cAttendId: req.body.cAttendId,
                    studentId: us.userId,
                    status: "KP",
                    studentLatitude: 0,
                    studentLongitude: 0,
                    listStatus: [],
                    FCMToken: "N/A",
                    numberOfAbsence: 0
                });
                await newAttendRecord.save();
            }
        }));

        const {subjectId, cAttendId, date} = req.body;
        console.log(date);
        const listAR = await AbsenceRequest.find({subjectId: subjectId, status: "approved", date: helper.parseDate(date)});
        await Promise.all(listAR.map(async ar => {
            const attendRecord = await AttendRecord.findOne({cAttendId: ar.cAttendId, studentId: ar.studentId});
            if(attendRecord){
                attendRecord.status = "CP";
                await attendRecord.save();
            }
            else{
                const newAttendRecord = new AttendRecord({
                    cAttendId: cAttendId,
                    studentId: ar.studentId,
                    status: "CP",
                    studentLatitude: 0,
                    studentLongitude: 0,
                    listStatus: [{index: 1, status: "CP"}]
                });
                await newAttendRecord.save();
            }
        }));
        return res.status(200).json({message: "Mark excused attendance successfully"});
    }catch(err){
        console.error("Error in markExcusedAttendance:", err)
        return res.status(500).json({message: "Server error", error: err});
    }
};

module.exports = { addAttendRecord, findByUserAndSubject, addForStudent, updateForStudent, markExcusedAttendance };
