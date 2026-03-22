const GroupMessage = require("../model/groupMessage.js");
const Group = require("../model/group.js");
const User = require("../model/user.js");
const helper = require("../utils/helper.js");
const RedisService = require("../services/redis.service.js");

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
    // Invalidate cache for the group
    await RedisService.del(`group_messages:${groupId}:limit:50`);
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
  // Invalidate cache for the group
  await RedisService.del(`group_messages:${newGroupMessage.groupId}:limit:50`);
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
  // Invalidate cache for the group
  await RedisService.del(`group_messages:${groupMessage.groupId}:limit:50`);
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

  // Cache initial load only (no 'before' cursor) with default limit 50
  const isInitialLoad = !before && limit === 50;
  const cacheKey = `group_messages:${groupId}:limit:50`;

  try {
    const result = isInitialLoad
      ? await RedisService.getOrSet(cacheKey, async () => {
          const fetchedMessages = await GroupMessage.find(filter)
            .populate({ path: "senderId", select: "-password -__v" })
            .limit(limit + 1)
            .sort({ _id: -1 });
          
          const hasMore = fetchedMessages.length > limit;
          if (hasMore) fetchedMessages.pop();

          const oldestId = fetchedMessages.length > 0 ? fetchedMessages[fetchedMessages.length - 1]._id : null;
          return { messages: fetchedMessages, hasMore, oldestId };
        }, 3600) // 1 hour TTL
      : null;

    if (result) return res.status(200).json(result);

    // Fallback for non-cached or non-initial loads
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
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createGroupMessage,
  updateGroupMessage,
  deleteGroupMessage,
  getByGroupId,
};
