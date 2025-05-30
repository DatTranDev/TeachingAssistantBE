const Document = require('../model/document.js');

const DocumentService = {
    get: async (id) => {
        const document = await Document.findById(id);
        if (!document) throw new Error('Document not found');
        return document;
    },
    add: async (data) => {
        const document = new Document(data);
        await document.save().catch(err => {
            throw new Error(`Error saving document: ${err.message}`);
        });
        return document;
    }
};
module.exports = DocumentService;