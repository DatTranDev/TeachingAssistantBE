const Post = require('../model/post.js');
const Channel = require('../model/channel.js');

const addPost = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.body.channelId);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid channel id"
        });
    }
    const existChannel = await Channel.findOne({
        _id: req.body.channelId
    });
    if(!existChannel){
        return res.status(404).json({
            message: "Channel is not found"
        });
    }
    const newPost = new Post(req.body);
    await newPost.save().then((post)=>{
        return res.status(201).json({
            post: post
        });
    }).catch(
        err=>{
            return res.status(500).json({
                message: "Internal server error: "+err
            });
        });
}
const findByChannelId = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.channelId);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid channel id"
        });
    }
    const existChannel = await Channel.findOne({
        _id: req.params.channelId
    });
    if(!existChannel){
        return res.status(404).json({
            message: "Channel is not found"
        });
    }
    const posts = await Post.find({
        channelId: req.params.channelId
    });
    return res.status(200).json({
        posts: posts
    });
}
const updatePost = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.id);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid post id"
        });
    }
    const existPost = await Post.findOne({
        _id: req.params.id
    });
    if(!existPost){
        return res.status(404).json({
            message: "Post is not found"
        });
    }
    await Post.findByIdAndUpdate(req.params.id, req.body).then((post)=>{
        return res.status(200).json({
            message: "Post is updated successfully"
        });
    }).catch(
        err=>{
            return res.status(500).json({
                message: "Internal server error: "+err
            });
        });
}
const deletePost = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.id);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid post id"
        });
    }
    const existPost = await Post.findOne({
        _id: req.params.id
    });
    if(!existPost){
        return res.status(404).json({
            message: "Post is not found"
        });
    }
    await Post.findByIdAndDelete(req.params.id).then((post)=>{
        return res.status(200).json({
            message: "Post is deleted successfully"
        });
    }).catch(
        err=>{
            return res.status(500).json({
                message: "Internal server error: "+err
            });
        });
}

module.exports = {
    addPost,
    findByChannelId,
    updatePost,
    deletePost
}