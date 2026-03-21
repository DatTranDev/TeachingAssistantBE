const axios = require("axios");

const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL;

/**
 * Checks if a user has sufficient credits or quota for an action.
 * @param {string} userId
 * @param {string} type - 'ai_credits' or 'storage'
 * @param {number} amount - amount to check (e.g. 1 for AI, or bytes for storage)
 * @returns {Promise<boolean>}
 */
const checkUsage = async (userId, type, amount = 1) => {
  try {
    const response = await axios.get(`${BILLING_SERVICE_URL}/check-usage`, {
      params: { userId, type, amount },
    });
    return response.data.allowed;
  } catch (err) {
    console.error(
      "[Billing Integration Error] checkUsage failed:",
      err.message,
    );
    // Fallback to true in case of service failure to not block users?
    // Or false for strict enforcement. Given it's a billing service, usually we should block or have a circuit breaker.
    // For now, let's be strict.
    return false;
  }
};

/**
 * Deducts credits from a user's balance.
 * @param {string} userId
 * @param {number} amount - amount of AI credits to deduct
 * @returns {Promise<void>}
 */
const deductCredits = async (userId, amount = 1) => {
  try {
    await axios.post(`${BILLING_SERVICE_URL}/deduct`, { userId, amount });
  } catch (err) {
    console.error(
      "[Billing Integration Error] deductCredits failed:",
      err.message,
    );
  }
};

module.exports = { checkUsage, deductCredits };
