const Group = require('../model/group.js');
const User = require('../model/user.js');
const CAttend = require('../model/cAttend.js');
const AttendRecord = require('../model/attendRecord.js');
const UserSubject = require('../model/userSubject.js');
const helper = require('../pkg/helper/helper.js');  
const path = require('path');
const { populate } = require('../model/discussion.js');

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
    if(existCAttend.classSessionId.subjectId.hostId != userId){
        return res.status(403).json({ error: "You are not the host of this class" });
    }
    const existGroup = await Group.find({ cAttendId: cAttendId });
    if (existGroup.length > 0) {
        return res.status(400).json({ error: "Group already exists" });
    }
}
module.exports = { 
    createRandomGroup
}