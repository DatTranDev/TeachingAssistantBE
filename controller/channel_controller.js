const Subject = require('../model/subject.js');
const Channel = require('../model/channel.js');
const helper = require('../pkg/helper/helper.js');

const addChannel = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.body.subjectId);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid subject id"
        });
    }
    const existSubject = await Subject.findOne({
        _id: req.body.subjectId
    });
    if(!existSubject){
        return res.status(404).json({
            message: "Subject is not found"
        });
    }
    const newChannel = new Channel(req.body);
    await newChannel.save().then((channel)=>{
        return res.status(201).json({
            channel: channel
        });
    }).catch(
        err=>{
            return res.status(500).json({
                message: "Internal server error: "+err
            });
        });
}
const findBySubjectId = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.subjectId);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid subject id"
        });
    }
    const existSubject = await Subject.findOne({
        _id: req.params.subjectId
    });
    if(!existSubject){
        return res.status(404).json({
            message: "Subject is not found"
        });
    }
    const channels = await Channel.find({
        subjectId: req.params.subjectId
    });
    return res.status(200).json({
        channels: channels
    });
}
const updateChannel = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.id);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid channel id"
        });
    }
    const existChannel = await Channel.findOne({
        _id: req.params.id
    });
    if(!existChannel){
        return res.status(404).json({
            message: "Channel is not found"
        });
    }
    await Channel.updateOne({
        _id: req.params.id
    }, req.body).then(()=>{
        return res.status(200).json({
            message: "Channel is updated"
        });
    }).catch(err=>{
        return res.status(500).json({
            message: "Internal server error: "+err
        });
    });
}
const deleteChannel = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.id);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid channel id"
        });
    }
    const existChannel = await Channel.findOne({
        _id: req.params.id
    });
    if(!existChannel){
        return res.status(404).json({
            message: "Channel is not found"
        });
    }
    await Channel.deleteOne({
        _id: req.params.id
    }).then(()=>{
        return res.status(200).json({
            message: "Channel is deleted"
        });
    }).catch(err=>{
        return res.status(500).json({
            message: "Internal server error: "+err
        });
    });
}
module.exports = {
    addChannel,
    findBySubjectId,
    updateChannel,
    deleteChannel
}