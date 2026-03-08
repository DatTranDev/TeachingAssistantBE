const { body } = require("express-validator");

const createSubjectValidator = [
  body("name").trim().notEmpty().withMessage("Subject name is required"),
  body("code").trim().notEmpty().withMessage("Subject code is required"),
  body("hostId").isMongoId().withMessage("A valid hostId is required"),
  body("maxAbsences")
    .optional()
    .isInt({ min: 0 })
    .withMessage("maxAbsences must be a non-negative integer"),
];

const updateSubjectValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Subject name cannot be empty"),
  body("code")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Subject code cannot be empty"),
  body("maxAbsences")
    .optional()
    .isInt({ min: 0 })
    .withMessage("maxAbsences must be a non-negative integer"),
];

module.exports = { createSubjectValidator, updateSubjectValidator };
