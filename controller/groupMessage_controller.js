const GroupMessage = require("../model/groupMessage.js");
const Group = require("../model/group.js");
const User = require("../model/user.js");
const helper = require("../utils/helper.js");

const createGroupMessage = async (req, res) => {
  const { groupId, senderId, content, images } = req.body;
  if (!groupId || !senderId) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const existGroup = await Group.findOne({ _id: groupId });
  if (!existGroup) {
    return res.status(404).json({ error: "Group not found" });
  }
  const existUser = await User.findOne({ _id: senderId });
  if (!existUser) {
    return res.status(404).json({ error: "User not found" });
  }
  if (!existGroup.members.includes(senderId)) {
    return res
      .status(403)
      .json({ error: "You are not a member of this group" });
  }
  try {
    const groupMessage = new GroupMessage({
      groupId: groupId,
      senderId: senderId,
      content: content,
      images: images,
    });
    await groupMessage.save();
    ``;
    return res.status(201).json({
      groupMessage: groupMessage,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
const updateGroupMessage = async (req, res) => {
  const id = req.params.id;
  const isValidId = await helper.isValidObjectID(id);
  if (!isValidId) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const newGroupMessage = await GroupMessage.findOneAndUpdate(
    { _id: id },
    req.body,
    { new: true },
  );
  if (!newGroupMessage) {
    return res.status(404).json({ error: "Group message not found" });
  }
  return res.status(200).json({
    groupMessage: newGroupMessage,
  });
};
const deleteGroupMessage = async (req, res) => {
  const id = req.params.id;
  const isValidId = await helper.isValidObjectID(id);
  if (!isValidId) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const groupMessage = await GroupMessage.findOneAndDelete({ _id: id });
  if (!groupMessage) {
    return res.status(404).json({ error: "Group message not found" });
  }
  return res.status(200).json({
    message: "Group message deleted successfully",
  });
};
const getByGroupId = async (req, res) => {
  const groupId = req.params.groupId;
  const isValidId = await helper.isValidObjectID(groupId);
  if (!isValidId) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const before = req.query.before; // cursor: _id of oldest message already loaded

  const filter = { groupId };
  if (before) {
    if (!(await helper.isValidObjectID(before))) {
      return res.status(400).json({ error: "Invalid cursor" });
    }
    filter._id = { $lt: before };
  }

  const messages = await GroupMessage.find(filter)
    .populate({ path: "senderId", select: "-password -__v" })
    .limit(limit + 1)
    .sort({ _id: -1 });

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  const oldestId =
    messages.length > 0 ? messages[messages.length - 1]._id : null;

  return res.status(200).json({
    messages,
    hasMore,
    oldestId,
  });
};

module.exports = {
  createGroupMessage,
  updateGroupMessage,
  deleteGroupMessage,
  getByGroupId,
};
