const Reaction = require('../model/reaction.js');
const Post = require('../model/post.js');
const UserSubject = require('../model/userSubject.js');

const createReaction = async (req, res) => {
    const { userId, postId, type } = req.body;
    if (!userId || !postId || !type) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    const existReaction = await Reaction.findOne({ userId, postId });
    if (existReaction) {
        return res.status(400).json({ error: "Reaction already exists" });
    }
    const existPost = await Post.findOne({ _id: postId }).populate('channelId');
    const existUserSubject = await UserSubject.findOne({ userId: userId, subjectId: existPost.channelId.subjectId });
    if (!existUserSubject) {
        return res.status(400).json({ error: "User is not subscribed to the subject of the post" });
    }
    if (!existPost) {
        return res.status(404).json({ error: "Post not found" });
    }
    try {
        const reaction = new Reaction({
            userId: userId,
            postId: postId,
            type: type,
        });
        await reaction.save();
        return res.status(201).json(reaction);
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
const findByPostId = async (req, res) => {
    const postId = req.params.postId;
    const reactions = await Reaction.find({ postId })
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
    findByPostId
}