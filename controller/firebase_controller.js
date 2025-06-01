const Document = require("../model/document.js");
const CAttend = require("../model/cAttend.js");
const FCMToken = require("../model/FCMToken.js");
const FirebaseService = require("../services/firebase.service.js");
const CAttendService = require("../services/cAttend.service.js");
const { BadRequestError, NotFoundError } = require("../utils/AppError.js");

const uploadImage = async (req, res) => {
    const file = req.file;
    if(!file) 
      throw new BadRequestError('No image in the request');
    const downloadURL = await FirebaseService.uploadImage(file);
    return res.json({
        image: downloadURL
    })
}
const uploadImages = async (req, res) => {
    const files = req.files;
    if(!files)
        return res.status(400).send('No images in the request')
    const images = await FirebaseService.uploadImages(files);
    return res.json({
        images: images
    })
}
const uploadFile = async (req, res) => {
    const file = req.file;
    if(!file) 
        throw new BadRequestError('No file in the request');
    const {name, type, cAttendId} = req.query;
    if(!name || !type || !cAttendId)
    {
        throw new BadRequestError('Missing name, type or cAttendId in the request');
    }
    await CAttendService.get(cAttendId);

    const data = {
        name: name,
        type: type,
        cAttendId: cAttendId
    }
    const document = await FirebaseService.uploadFile(file, data);
    
    return res.json({
        document: document
    })
}
const subscribeToTopic = async (req, res) => {
    const {token, topics} = req.body;
    const userId = req.user.userId;
    if(!token || !topics) 
        throw new BadRequestError('Missing token or topic');
    await FirebaseService.subscribeToTopic(token, topics, userId);
    return res.status(200).send('Subscribed to topic')
}
const unsubscribeFromTopics = async (req, res) => {
    const {token, topics} = req.body;
    if(!token || !topics) 
        throw new BadRequestError('Missing token or topic');
    await FirebaseService.unsubscribeFromTopics(token, topics);
    return res.status(200).send('Unsubscribed from topic')
}

module.exports = {
    uploadImage, 
    uploadImages,
    uploadFile,
    subscribeToTopic, 
    unsubscribeFromTopics
};