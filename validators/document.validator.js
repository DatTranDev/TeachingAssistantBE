const Joi = require('joi');

const DocumentValidator = {
    create: () =>{
        return Joi.object({
            name: Joi.string().required().messages({
                'string.empty': 'Name is required',
                'any.required': 'Name is required'
            }),
            downloadUrl: Joi.string().required().messages({
                'string.empty': 'Download URL is required',
                'any.required': 'Download URL is required'
            }),
            type: Joi.string().required().messages({
                'string.empty': 'Type is required',
                'any.required': 'Type is required'
            }),
            cAttendId: Joi.string().required().messages({
                'string.empty': 'Class attendance ID is required',
                'any.required': 'Class attendance ID is required'
            })
        });
    },
    patch: () => {
        return Joi.object({
            name: Joi.string().optional().messages({
                'string.empty': 'Name cannot be empty'
            }),
            downloadUrl: Joi.string().optional().messages({
                'string.empty': 'Download URL cannot be empty'
            }),
            type: Joi.string().optional().messages({
                'string.empty': 'Type cannot be empty'
            }),
            cAttendId: Joi.string().optional().messages({
                'string.empty': 'Class attendance ID cannot be empty'
            })
        }).min(1).messages({
            'object.min': 'At least one field must be provided for update'
        });
    }
}
module.exports = DocumentValidator;