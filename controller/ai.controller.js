const { chat, getHistory } = require('../services/ai.service');
const { seedDocumentation } = require('../services/rag.service');

/**
 * POST /api/v1/ai/chat
 * Body: { message: string }
 * Auth: JWT required — userId extracted from req.auth
 */
const aiChat = async (req, res, next) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({ error: 'Message is required.' });
        }

        const userId = req.auth?.userId || req.user?.userId;
        const role = req.auth?.role || req.user?.role || 'unknown';
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const reply = await chat(message.trim(), userId, role);
        return res.status(200).json({ reply });

    } catch (err) {
        console.error('[AI Controller Error]', err);
        next(err);
    }
};

/**
 * POST /api/v1/ai/seed
 * Admin-only: seeds schema documentation into Supabase for RAG.
 * Only needs to be called once.
 */
const seedDocs = async (req, res, next) => {
    try {
        await seedDocumentation();
        return res.status(200).json({ message: 'Documentation seeded successfully.' });
    } catch (err) {
        console.error('[AI Seed Error]', err);
        next(err);
    }
};

const getChatHistory = async (req, res, next) => {
    try {
        const userId = req.auth?.userId || req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const history = await getHistory(userId);
        return res.status(200).json({ history });
    } catch (err) {
        console.error('[AI Get History Error]', err);
        next(err);
    }
};

module.exports = { aiChat, seedDocs, getChatHistory };
