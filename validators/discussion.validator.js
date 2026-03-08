const { body } = require("express-validator");

const createDiscussionValidator = [
  body("cAttendId").isMongoId().withMessage("A valid cAttendId is required"),
  body("creator").isMongoId().withMessage("A valid creator id is required"),
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required")
    .isLength({ max: 500 })
    .withMessage("Content must not exceed 500 characters"),
];

const updateDiscussionValidator = [
  body("content")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Content cannot be empty")
    .isLength({ max: 500 })
    .withMessage("Content must not exceed 500 characters"),
];

module.exports = { createDiscussionValidator, updateDiscussionValidator };
