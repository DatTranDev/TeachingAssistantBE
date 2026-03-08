const { body } = require("express-validator");

const createGroupMessageValidator = [
  body("groupId").isMongoId().withMessage("A valid groupId is required"),
  body("senderId").isMongoId().withMessage("A valid senderId is required"),
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Message content is required")
    .isLength({ max: 1000 })
    .withMessage("Content must not exceed 1000 characters"),
];

const updateGroupMessageValidator = [
  body("content")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Content cannot be empty")
    .isLength({ max: 1000 })
    .withMessage("Content must not exceed 1000 characters"),
];

module.exports = { createGroupMessageValidator, updateGroupMessageValidator };
