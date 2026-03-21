const { chat, getHistory } = require("../services/ai.service");
const { seedDocumentation } = require("../services/rag.service");
const User = require("../model/user");
const { checkUsage, deductCredits } = require("../services/billing.service");

/**
 * POST /api/v1/ai/chat
 * Body: { message: string }
 * Auth: JWT required — userId extracted from req.auth
 */
const aiChat = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({ error: "Message is required." });
    }

    const userId = req.auth?.userId || req.user?.userId;
    const role = req.auth?.role || req.user?.role || "unknown";
    const authorizationHeader = req.headers?.authorization;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const user = await User.findById(userId).lean();

    // Billing Check
    const isAllowed = await checkUsage(
      userId,
      "ai_token",
      1,
      authorizationHeader,
    );
    if (!isAllowed) {
      return res.status(403).json({
        error:
          "Insufficient AI credits. Please upgrade your plan or buy more credits.",
      });
    }

    const preferredLanguage = req.body.language || user?.language || "vi";
    const reply = await chat(message.trim(), userId, role, preferredLanguage);

    // Deduct Credits after success
    await deductCredits(userId, 1, authorizationHeader);

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("[AI Controller Error]", err);
    next(err);
  }
};

const getChatHistory = async (req, res, next) => {
  try {
    const userId = req.auth?.userId || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const { history } = await getHistory(userId, req.query.language || "vi");
    return res.status(200).json({ history });
  } catch (err) {
    console.error("[AI Get History Error]", err);
    next(err);
  }
};

module.exports = { aiChat, getChatHistory };
