const { body } = require("express-validator");

const createSessionValidator = [
  body("subjectId").isMongoId().withMessage("A valid subjectId is required"),
  body("date").notEmpty().withMessage("Session date is required"),
  body("room").optional().trim(),
  body("dayOfWeek")
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage("dayOfWeek must be 0–6"),
  body("start")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Start time cannot be empty if provided"),
  body("end")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("End time cannot be empty if provided"),
];

const updateSessionValidator = [
  body("room").optional().trim(),
  body("start")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Start time cannot be empty"),
  body("end")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("End time cannot be empty"),
];

module.exports = { createSessionValidator, updateSessionValidator };
