const { body } = require("express-validator");

const createAbsenceRequestValidator = [
  body("cAttendId").isMongoId().withMessage("A valid cAttendId is required"),
  body("reason")
    .trim()
    .isLength({ min: 10 })
    .withMessage("Reason must be at least 10 characters"),
];

module.exports = { createAbsenceRequestValidator };
