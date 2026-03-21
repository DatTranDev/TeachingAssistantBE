const axios = require("axios");

const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL;

const buildAuthHeaders = (authorizationHeader) => {
  if (!authorizationHeader || typeof authorizationHeader !== "string") {
    return {};
  }

  return { Authorization: authorizationHeader };
};

/**
 * Checks if a user has sufficient credits or quota for an action.
 * @param {string} userId
 * @param {string} type - 'ai_credits' or 'storage'
 * @param {number} amount - amount to check (e.g. 1 for AI, or bytes for storage)
 * @returns {Promise<boolean>}
 */
const checkUsage = async (userId, type, amount = 1, authorizationHeader) => {
  try {
    const response = await axios.get(`${BILLING_SERVICE_URL}/check-usage`, {
      params: { userId, type, amount },
      headers: buildAuthHeaders(authorizationHeader),
    });
    return response.data.allowed ?? response.status === 200;
  } catch (err) {
    console.error(
      "[Billing Integration Error] checkUsage failed:",
      err.response?.status || err.message,
    );
    // Fallback to true in case of service failure to not block users?
    // Or false for strict enforcement. Given it's a billing service, usually we should block or have a circuit breaker.
    // For now, let's be strict.
    return false;
  }
};

/**
 * Consumes usage and records usage log in billing service.
 * @param {string} userId
 * @param {string} type - e.g. 'ai_credits' or 'storage'
 * @param {number} amount
 * @param {string} authorizationHeader
 * @param {string} description
 * @returns {Promise<void>}
 */
const consumeUsage = async (
  userId,
  type,
  amount = 1,
  authorizationHeader,
  description,
) => {
  const response = await axios.post(
    `${BILLING_SERVICE_URL}/deduct`,
    { userId, type, amount, description },
    { headers: buildAuthHeaders(authorizationHeader) },
  );

  if (response.status !== 200 || response.data?.status !== "ok") {
    throw new Error("Billing usage consumption failed");
  }
};

/**
 * Backward-compatible wrapper for AI usage consumption.
 */
const deductCredits = async (userId, amount = 1, authorizationHeader) => {
  await consumeUsage(
    userId,
    "ai_credits",
    amount,
    authorizationHeader,
    "ai chat usage",
  );
};

module.exports = { checkUsage, consumeUsage, deductCredits };
