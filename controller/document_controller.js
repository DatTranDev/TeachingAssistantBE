const Document = require('../model/document.js');
const CAttend = require('../model/cAttend.js');
const helper = require('../pkg/helper/helper.js');

const findByCAttendId = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.cAttendId);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    const existCAttend = await CAttend.findById(req.params.cAttendId);
    if(!existCAttend){
        return res.status(404).json({
            message: "CAttend is not found"
        });
    }
    const documents = await Document.find({
        cAttendId: req.params.cAttendId
    });
    return res.json({
        documents: documents
    });
}
const update = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.id);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    const existDoc = await Document.findById(req.params.id);
    if(!existDoc){
        return res.status(404).json({
            message: "Document is not found"
        });
    }
    if(req.body.name == null || req.body.name == "") {
        return res.status(400).json({
            message: "Missing required fields"
        });
    }
    await Document.findByIdAndUpdate(req.params.id, {name: req.body.name});
    return res.status(200).json({
        message: "Updated successfully"
    });
}
const deleteDoc = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.id);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    const existDoc = await Document.findById(req.params.id);
    if(!existDoc){
        return res.status(404).json({
            message: "Document is not found"
        });
    }
    await Document.findByIdAndDelete(req.params.id);
    return res.status(200).json({
        message: "Deleted successfully"
    });
}
module.exports = {
    findByCAttendId,
    update,
    deleteDoc
}