const Group = require('../model/group.js');
const User = require('../model/user.js');
const CAttend = require('../model/cAttend.js');
const AttendRecord = require('../model/attendRecord.js');
const UserSubject = require('../model/userSubject.js');
const helper = require('../pkg/helper/helper.js');  
const path = require('path');

const createRandomGroup = async (req, res) => {
    const { cAttendId, numberOfGroup } = req.body;

    if (!cAttendId || !numberOfGroup) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const userId = req.user.userId;

    const existCAttend = await CAttend.findOne({ _id: cAttendId }).populate({
        path: 'classSessionId',
        populate: {
            path: 'subjectId'
        }
    });

    if (!existCAttend) {
        return res.status(404).json({ error: "CAttend not found" });
    }

    if (existCAttend.classSessionId.subjectId.hostId.toString() !== userId.toString()) {
        return res.status(403).json({ error: "You are not the host of this class" });
    }

    const existGroup = await Group.find({ cAttendId: cAttendId });
    if (existGroup.length > 0) {
        return res.status(400).json({ error: "Group already exists" });
    }

    const students = await AttendRecord.find({ cAttendId: cAttendId, status: "CM" }).populate('studentId');

    if (students.length < numberOfGroup) {
        return res.status(400).json({ message: "Number of online students is less than number of groups" });
    }

    const shuffledStudents = students.sort(() => 0.5 - Math.random());

    // Create groups
    const groups = Array.from({ length: numberOfGroup }, () => []);

    shuffledStudents.forEach((student, index) => {
        const groupIndex = index % numberOfGroup;
        groups[groupIndex].push(student.studentId._id);
    });

    const groupPromises = groups.map((groupMembers, index) => {
        const group = new Group({
            name: `Nhóm ${index + 1}`,
            members: groupMembers,
            admin: userId,
            type: "random",
            cAttendId: cAttendId
        });
        return group.save();
    });

    const groupDocs = await Promise.all(groupPromises);

    return res.status(201).json({ message: "Groups created successfully", groups: groupDocs });
};
const getGroupByCAttendId = async (req, res) => {
    const cAttendId = req.params.cAttendId;
    const isValidId = await helper.isValidObjectID(cAttendId);
    if (!isValidId) {
        return res.status(400).json({ error: "Invalid id" });
    }
    const groups = await Group.find({ cAttendId: cAttendId }).populate('members');
    if (!groups) {
        return res.status(404).json({ error: "Groups not found" });
    }
    return res.status(200).json({ groups: groups });
};
module.exports = { 
    createRandomGroup,
    getGroupByCAttendId
}