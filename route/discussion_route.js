const express = require("express");
const route = express.Router();
const discussionController = require("../controller/discussion_controller.js");
const reactionController = require("../controller/reaction_controller.js");
const auth = require("../middlewares/auth.middleware.js");
const { paginate } = require("../middlewares/pagination.middleware.js");

const {
  handleValidationErrors,
} = require("../middlewares/validate.middleware.js");
const {
  createDiscussionValidator,
  updateDiscussionValidator,
} = require("../validators/discussion.validator.js");

route.post(
  "/add",
  createDiscussionValidator,
  handleValidationErrors,
  discussionController.createDiscussion,
);
route.patch(
  "/update/:id",
  updateDiscussionValidator,
  handleValidationErrors,
  discussionController.updateDiscussion,
);
route.delete("/delete/:id", discussionController.deleteDiscussion);
route.get(
  "/findByCAttend/:cAttendId",
  paginate(20),
  discussionController.findByCAttendId,
);
route.post("/reaction/add", reactionController.createReaction);
route.patch("/reaction/update/:id", reactionController.updateReaction);
route.get("/:discussionId/reactions", reactionController.findByDiscussionId);
route.post("/:id/vote", auth, discussionController.voteDiscussion);

module.exports = route;
