const Reaction = require('../model/reaction.js');
const Discussion = require('../model/discussion.js');
const UserSubject = require('../model/userSubject.js');
const path = require('path');

const createReaction = async (req, res) => {
    const { userId, discussionId, type } = req.body;
    if (!userId || !discussionId || !type) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    const existReaction = await Reaction.findOne({ userId, discussionId });
    if (existReaction) {
        return res.status(400).json({ error: "Reaction already exists" });
    }
    const existdiscussion = await Discussion.findOne({ _id: discussionId })
    .populate({
        path: 'cAttendId',
        populate: {
            path: 'classSessionId'
        }
    });
    if (!existdiscussion) {
        return res.status(404).json({ error: "Discussion not found" });
    }
    const existUserSubject = await UserSubject.findOne({ userId: userId, subjectId: existdiscussion.cAttendId.classSessionId.subjectId });
    if (!existUserSubject) {
        return res.status(400).json({ error: "User is not subscribed to the subject of the discussion" });
    }
    try {
        const reaction = new Reaction({
            userId: userId,
            discussionId: discussionId,
            type: type,
        });
        await reaction.save();
        return res.status(201).json({reaction: reaction});
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
const updateReaction = async (req, res) => {
    const {type} = req.body;
    if (!type) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    try {
        const reaction = await Reaction.findOne(req.params.id);
        if (!reaction) {
            return res.status(404).json({ error: "Reaction not found" });
        }
        reaction.type = type;
        await reaction.save();
        return res.status(200).json(reaction);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
const findByDiscussionId = async (req, res) => {
    const discussionId = req.params.discussionId;
    const reactions = await Reaction.find({ discussionId })
    .populate({
        path: 'userId',
        select: '-password'
    });
    return res.status(200).json({
        reactions: reactions   
    });
}
module.exports = {
    createReaction,
    updateReaction,
    findByDiscussionId
}