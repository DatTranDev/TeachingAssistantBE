const Subject = require('../model/subject.js');
const User = require('../model/user.js');
const UserSubject = require('../model/userSubject.js');
const CAttend = require('../model/cAttend.js');
const ClassSession = require('../model/classSession.js');
const AttendRecord = require('../model/attendRecord.js');
const firebase_controller = require('./firebase_controller.js');
const fs = require('fs');
const path = require('path');

const helper = require('../pkg/helper/helper.js');

var xl = require('excel4node');
const { count } = require('console');


const getStudentList = async (req, res) => {
    const subjectId = req.params.subjectId;
    const existSubject = await Subject.findById(subjectId);
    if (!existSubject) {
        return res.status(404).json({
            message: "Subject is not found"
        });
    }
    var wb = new xl.Workbook();

    // Add Worksheets to the workbook
    var ws = wb.addWorksheet('Sheet 1');
    const students = await UserSubject.find({
        subjectId: subjectId,
        role: 'student'
    }).populate('userId');

    const studentsData = students.map(student => {
        return {
            name: student.userId.name,
            id: student.userId.id,
            userCode: student.userId.userCode,
        };
    });
    const classSessions = await ClassSession.find({
        subjectId: subjectId
    });
    const cAttends = await CAttend.find({
        classSessionId: { $in: classSessions.map(classSession => classSession._id) }
    });
    const attendRecords = await AttendRecord.find({
        cAttendId: { $in: cAttends.map(cAttend => cAttend._id) }
    });
    // Writing header
    ws.cell(1, 1).string('Họ và tên');
    ws.cell(1, 2).string('Mã sinh viên');
    for(let i = 0; i < cAttends.length; i++) {
        const date = new Date(cAttends[i].date);
        ws.cell(1, 3 + i).string(`${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`);
    }
    ws.cell(1, 3 + cAttends.length).string('Số buổi vắng');

    // Writing student data
    for(let i = 0; i < studentsData.length; i++) {
        ws.cell(2 + i, 1).string(studentsData[i].name?studentsData[i].name:'');
        ws.cell(2 + i, 2).string(studentsData[i].userCode?studentsData[i].userCode:'');
        let count = 0;
        for(let j = 0; j < cAttends.length; j++) {  
            const attendRecord = attendRecords.find(attendRecord => 
                String(attendRecord.cAttendId) === String(cAttends[j]._id) && 
                String(attendRecord.studentId) === String(studentsData[i].id)
            );
            if(attendRecord) {
                if(attendRecord.status === 'KP') {
                    count++;
                }
                ws.cell(2 + i, 3 + j).string(attendRecord.status);
            } else {
                ws.cell(2 + i, 3 + j).string('KP');
                count++;
            }
        }
        ws.cell(2 + i, 3 + cAttends.length).string(`${count}/${cAttends.length}`);
    }
    const timestamp = Date.now();
    const filename = `${subjectId}_${timestamp}.xlsx`;
    const filePath = path.join(__dirname, '../', filename);
    wb.write(filePath, async (err, stats) => {
        if (err) {
            return res.status(500).json({
                message: "Error writing file",
                error: err.message
            });
        }

        try {
            const fileBuffer = fs.readFileSync(filePath);

            // Create a file object
            const file = {
                originalname: filename,
                mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                buffer: fileBuffer
            };

            // Pass the file object to the getURL function
            const url = await firebase_controller.getURL(file);

            return res.status(200).json({
                url: url
            });
        } catch (err) {
            return res.status(500).json({
                message: err.message,
            });
        }
    });
};
module.exports = {
    getStudentList,
};
