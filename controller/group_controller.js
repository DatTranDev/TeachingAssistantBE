const Group = require('../model/group.js');
const User = require('../model/user.js');
const CAttend = require('../model/cAttend.js');
const AttendRecord = require('../model/attendRecord.js');
const UserSubject = require('../model/userSubject.js');
const CAttendService = require('../services/cAttend.service.js');
const GroupService = require('../services/group.service.js');
const helper = require('../utils/helper.js');  
const {RANDOM, DEFAULT} = require('../constants/groupType.js');

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
            autoAccept: false,
            subjectId: existCAttend.classSessionId.subjectId._id,
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
const createGroup = async (req, res) => {
    const { name, members, admin, type, cAttendId, subjectId, autoAccept } = req.body;

    if (!name || !members || !subjectId || !type) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    if(!cAttendId && type == RANDOM){
        return res.status(400).json({ error: "cAttendId is required for random groups" });
    }
    if (!helper.isValidObjectID(subjectId)) {
        return res.status(400).json({ error: "Invalid subject id" });
    }
    const userId = req.user.userId;

    if( type == RANDOM){
        await CAttendService.get(cAttendId);
    }
    else if (type == DEFAULT) {
        cAttendId = subjectId;
    }

    const group = new Group({
        name: name,
        members: members,
        admin: admin || userId,
        type: type,
        cAttendId: cAttendId,
        subjectId: subjectId,
        autoAccept: autoAccept || true
    });

    await group.save();

    return res.status(201).json({ message: "Group created successfully", group: group });
};
const joinGroup = async (req, res) => {
    const groupId = req.params.groupId;
    const userId = req.user.userId;

    const isValidId = await helper.isValidObjectID(groupId);
    if (!isValidId) {
        return res.status(400).json({ error: "Invalid group id" });
    }

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        return res.status(404).json({ error: "Group not found" });
    }

    if (group.members.includes(userId)) {
        return res.status(400).json({ error: "You are already a member of this group" });
    }

    if (group.autoAccept || group.admin.toString() === userId.toString()) {
        group.members.push(userId);
        await group.save();
        return res.status(200).json({ message: "Joined group successfully", group: group });
    } else {
        return res.status(403).json({ error: "You cannot join this group" });
    }
}
const updateGroup = async (req, res) => {
    const groupId = req.params.groupId;
    const userId = req.user.userId;

    const isValidId = await helper.isValidObjectID(groupId);
    if (!isValidId) {
        return res.status(400).json({ error: "Invalid group id" });
    }

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        return res.status(404).json({ error: "Group not found" });
    }

    if (group.admin.toString() !== userId.toString()) {
        return res.status(403).json({ error: "You are not the admin of this group" });
    }

    Object.assign(group, req.body);
    await group.save();

    return res.status(200).json({ message: "Group updated successfully", group: group });
}
const getRandomGroups = async (req, res) => {
    const cAttendId = req.params.cAttendId;
    const isValidId = await helper.isValidObjectID(cAttendId);
    if (!isValidId) {
        return res.status(400).json({ error: "Invalid id" });
    }
    const groups = await Group.find({ cAttendId: cAttendId, type: 'random' }).populate('members');
    if (!groups) {
        return res.status(404).json({ error: "Random groups not found" });
    }
    return res.status(200).json({ groups: groups });
}
const getDefaultGroups = async (req, res) => {
    const subjectId = req.params.subjectId;
    const isValidId = await helper.isValidObjectID(subjectId);
    if (!isValidId) {
        return res.status(400).json({ error: "Invalid id" });
    }
    const groups = await Group.find({ subjectId: subjectId, type: 'default' }).populate('members');
    if (!groups) {
        return res.status(404).json({ error: "Default groups not found" });
    }
    return res.status(200).json({ groups: groups });
}
const getUserRandomGroup = async (req, res) => {
    const userId = req.user.userId;
    const cAttendId = req.params.cAttendId;
    const isValidId = await helper.isValidObjectID(cAttendId);
    if (!isValidId) {
        return res.status(400).json({ error: "Invalid id" });
    }
    const group = await Group.findOne({ cAttendId: cAttendId, type: 'random', members: userId }).populate('members');
    if (!group) {
        return res.status(404).json({ error: "Random group not found for this user" });
    }
    return res.status(200).json({ group: group });
}
const getUserDefaultGroup = async (req, res) => {
    const userId = req.user.userId;
    const subjectId = req.params.subjectId;
    const isValidId = await helper.isValidObjectID(subjectId);
    if (!isValidId) {
        return res.status(400).json({ error: "Invalid id" });
    }
    const group = await Group.findOne({ subjectId: subjectId, type: 'default', members: { $in: [userId]} }).populate('members');
    if (!group) {
        return res.status(404).json({ error: "Default group not found for this user" });
    }
    return res.status(200).json({ group: group });
}
const leaveGroup = async (req, res) => {
    const groupId = req.params.groupId;
    const userId = req.user.userId;

    const isValidId = await helper.isValidObjectID(groupId);
    if (!isValidId) {
        return res.status(400).json({ error: "Invalid group id" });
    }

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        return res.status(404).json({ error: "Group not found" });
    }

    if (!group.members.includes(userId)) {
        return res.status(400).json({ error: "You are not a member of this group" });
    }
    group.members = group.members.filter(member => member.toString() !== userId.toString());
    if (group.admin.toString() === userId.toString()) {
        group.admin = group.members.length > 0 ? group.members[0] : null; // Assign new admin if exists
    }

    if (group.members.length === 0) 
        await Group.findByIdAndDelete(groupId); // Delete group if no members left
    
    await group.save();
    return res.status(200).json({ message: "Left group successfully", group: group });
}
const notifyCrossGradingPairs = async (req, res) => {
    const pairs = req.body.pairs;

    if (!Array.isArray(pairs) || pairs.length === 0) {
        return res.status(400).json({ error: "Pairs must be a non-empty array" });
    }

    try {
        await GroupService.notifyCrossGradingPairs(pairs);
        return res.status(200).json({ message: "Cross grading notifications sent" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
module.exports = { 
    createRandomGroup,
    getGroupByCAttendId,
    createGroup,
    joinGroup,
    updateGroup,
    getRandomGroups,
    getDefaultGroups,
    getUserRandomGroup,
    getUserDefaultGroup,
    leaveGroup,
    notifyCrossGradingPairs
}