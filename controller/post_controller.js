const Post = require('../model/post.js');
const Channel = require('../model/channel.js');
const User = require('../model/user.js');
const Reaction = require('../model/reaction.js');
const helper = require('../utils/helper.js');

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
    //Pagination
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const startIndex = (page-1)*limit;
    const endIndex = page*limit;
    const results = {};
    if(endIndex < await Post.countDocuments({channelId: req.params.channelId}).exec()){
        results.next = {
            page: page + 1,
            limit: limit
        };
    }
    if(startIndex > 0){
        results.previous = {
            page: page - 1,
            limit: limit
        };
    }
    var posts = [];
    if(!limit || !page){
        posts = await Post.find({
            channelId: req.params.channelId
        });
    }else{
        posts = await Post.find({
            channelId: req.params.channelId
        }).limit(limit).skip(startIndex).exec();
    }
    const postsWithCreator = await Promise.all(posts.map(async(post)=>{
        const creator = await User.findOne({
            _id: post.creator
        }).select("-password");

        post = post.toJSON();
        post.user = creator;
        post.reactions = reactions;
        return post;
    }));
    results.posts = postsWithCreator;
    return res.status(200).json(results);
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