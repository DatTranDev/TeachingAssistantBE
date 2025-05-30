const mongoose = require('mongoose');

const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id) {
      return res.status(400).json({ message: `${paramName} is required` });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: `${paramName} is not a valid ObjectId` });
    }

    next();
  };
};

const validateSchema = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const messages = error.details.map((err) => err.message);
      return res.status(400).json({ errors: messages });
    }

    next();
  };
};
module.exports = {
  validateObjectId,
  validateSchema,
};