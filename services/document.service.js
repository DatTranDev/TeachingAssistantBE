const Document = require('../model/document.js');
const { AppError, NotFoundError } = require('../utils/AppError.js');

const DocumentService = {
    get: async (id) => {
        const document = await Document.findById(id);
        if (!document) throw new NotFoundError(`Document with ID ${id} not found`);
        return document;
    },
    add: async (data) => {
        const document = new Document(data);
        await document.save().catch(err => {
            throw new AppError(`Error saving document: ${err.message}`, 500);
        });
        return document;
    }
};
module.exports = DocumentService;