const userController = require("../controller/user_controller.js");
const auth = require("../middlewares/auth.middleware.js");
const {
  handleValidationErrors,
} = require("../middlewares/validate.middleware.js");
const {
  loginValidator,
  registerValidator,
} = require("../validators/user.validator.js");
const express = require("express");
const route = express.Router();

route.post(
  "/register",
  registerValidator,
  handleValidationErrors,
  userController.register,
);
route.patch("/changepassword", userController.changePassword);
route.post(
  "/login",
  loginValidator,
  handleValidationErrors,
  userController.login,
);
route.get("/me", auth, userController.getMe);
route.patch("/update/:id", auth, userController.updateUser);
route.patch("/preferences", auth, userController.updatePreferences);

module.exports = route;
