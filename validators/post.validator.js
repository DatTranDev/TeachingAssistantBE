const { body } = require("express-validator");

const createPostValidator = [
  body("channelId").isMongoId().withMessage("A valid channelId is required"),
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Post content is required")
    .isLength({ max: 2000 })
    .withMessage("Content must not exceed 2000 characters"),
];

const updatePostValidator = [
  body("content")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Content cannot be empty")
    .isLength({ max: 2000 })
    .withMessage("Content must not exceed 2000 characters"),
];

module.exports = { createPostValidator, updatePostValidator };
