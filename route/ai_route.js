const express = require('express');
const router = express.Router();
const { aiChat, seedDocs, getChatHistory } = require('../controller/ai.controller');

// POST /api/v1/ai/chat — main chat endpoint (JWT protected via global middleware)
router.post('/chat', aiChat);

// GET /api/v1/ai/history — get chat history for the current user
router.get('/history', getChatHistory);

// POST /api/v1/ai/seed — one-time seeder to populate Supabase with schema docs
router.post('/seed', seedDocs);

module.exports = router;
