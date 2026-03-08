const express = require("express");
const route = express.Router();
const channelController = require("../controller/channel_controller.js");
const postController = require("../controller/post_controller.js");
const { paginate } = require("../middlewares/pagination.middleware.js");
const {
  handleValidationErrors,
} = require("../middlewares/validate.middleware.js");
const {
  createPostValidator,
  updatePostValidator,
} = require("../validators/post.validator.js");

route.post("/add", channelController.addChannel);
route.post("/addMany", channelController.addManyChannels);
route.get("/findBySubject/:subjectId", channelController.findBySubjectId);
route.patch("/update/:id", channelController.updateChannel);
route.delete("/delete/:id", channelController.deleteChannel);

route.post(
  "/post/add",
  createPostValidator,
  handleValidationErrors,
  postController.addPost,
);
route.get(
  "/post/find/:channelId",
  paginate(20),
  postController.findByChannelId,
);
route.patch("/post/update/:id", postController.updatePost);
route.delete("/post/delete/:id", postController.deletePost);

module.exports = route;
