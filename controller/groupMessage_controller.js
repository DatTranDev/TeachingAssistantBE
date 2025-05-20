const GroupMessage = require('../model/groupMessage.js');
const Group = require('../model/group.js');
const User = require('../model/user.js');
const helper = require('../pkg/helper/helper.js');

const createGroupMessage = async (req, res) => {
    const { groupId, senderId, content, images } = req.body;
    if (!groupId || !senderId) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    const existGroup = await Group.findOne({ _id: groupId });
    if (!existGroup) {
        return res.status(404).json({ error: "Group not found" });
    }
    const existUser = await User.findOne({ _id: senderId });
    if (!existUser) {
        return res.status(404).json({ error: "User not found" });
    }
    if(!existGroup.members.includes(senderId)) {
        return res.status(403).json({ error: "You are not a member of this group" });
    }
    try {
        const groupMessage = new GroupMessage({
            groupId: groupId,
            senderId: senderId,
            content: content,
            images: images
        });
        await groupMessage.save();
        return res.status(201).json({
            groupMessage: groupMessage
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
const updateGroupMessage = async (req, res) => {
    const id = req.params.id;
    const isValidId = await helper.isValidObjectID(id);
    if (!isValidId) {
        return res.status(400).json({ error: "Invalid id" });
    }
    const newGroupMessage = await GroupMessage.findOneAndUpdate(
        { _id: id }, 
        req.body, 
        { new: true }
    );
    if (!newGroupMessage) {
        return res.status(404).json({ error: "Group message not found" });
    }
    return res.status(200).json({
        groupMessage: newGroupMessage
    });
}
const deleteGroupMessage = async (req, res) => {
    const id = req.params.id;
    const isValidId = await helper.isValidObjectID(id);
    if (!isValidId) {
        return res.status(400).json({ error: "Invalid id" });
    }
    const groupMessage = await GroupMessage.findOneAndDelete({ _id: id });
    if (!groupMessage) {
        return res.status(404).json({ error: "Group message not found" });
    }
    return res.status(200).json({
        message: "Group message deleted successfully"
    });
}
const getByGroupId = async (req, res) => {
    const groupId = req.params.groupId;
    const isValidId = await helper.isValidObjectID(groupId);
    if (!isValidId) {
        return res.status(400).json({ error: "Invalid id" });
    }
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const groupMessages = await GroupMessage.find({ groupId: groupId })
        .populate({path: 'senderId', select: '-password -__v'})
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });
    return res.status(200).json({
        groupMessages: groupMessages,
        page: page,
        limit: limit
    });
}

module.exports = {
    createGroupMessage,
    updateGroupMessage,
    deleteGroupMessage,
    getByGroupId
}