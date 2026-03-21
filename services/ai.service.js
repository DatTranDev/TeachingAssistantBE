const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const { retrieveContext } = require('./rag.service');
const mongoose = require('mongoose');
require('dotenv').config();

// ─── Provider Setup ──────────────────────────────────────────────────────────

const PROVIDER = process.env.AI_PROVIDER || 'gemini';
const genAI = PROVIDER === 'gemini' ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const openai = PROVIDER === 'openai' ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// ─── Tool Definitions (Shared) ───────────────────────────────────────────────

const SHARED_TOOLS = [
    {
        name: 'queryDatabase',
        description: 'Query the MongoDB database using a Mongoose-compatible aggregation pipeline or find query expressed as a JSON description. Use this when the user asks for data from the classroom system.',
        parameters: {
            type: 'object',
            properties: {
                collection: {
                    type: 'string',
                    description: 'MongoDB collection name (e.g., "subjects", "usersubjects", "attendrecords", "absencerequests", "cattends", "users")'
                },
                filter: {
                    type: 'string',
                    description: 'JSON string of the MongoDB filter/query object (e.g., {"role": "student"})'
                },
                projection: {
                    type: 'string',
                    description: 'JSON string of fields to include or exclude (e.g., {"name": 1, "email": 1})'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results to return (default 10)'
                }
            },
            required: ['collection']
        }
    },
    {
        name: 'joinClass',
        description: 'Enroll the current user into a class using the class join code.',
        parameters: {
            type: 'object',
            properties: {
                classCode: {
                    type: 'string',
                    description: 'The unique join code for the class (e.g., "ABC123")'
                }
            },
            required: ['classCode']
        }
    },
    {
        name: 'createNote',
        description: 'Create a note or reminder for the user with a title and date.',
        parameters: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'The title or content of the note/reminder'
                },
                date: {
                    type: 'string',
                    description: 'The date for the reminder in YYYY-MM-DD format'
                }
            },
            required: ['title', 'date']
        }
    }
];

// Helper to convert to Gemini format
const getGeminiTools = () => ([{ functionDeclarations: SHARED_TOOLS }]);

// Helper to convert to OpenAI format
const getOpenAITools = () => SHARED_TOOLS.map(t => ({
    type: 'function',
    function: t
}));

// ─── Tool Executors (Shared) ─────────────────────────────────────────────────

const ALLOWED_COLLECTIONS = [
    'users', 'subjects', 'usersubjects', 'classsessions',
    'cattends', 'attendrecords', 'absencerequests',
    'discussions', 'questions', 'notifications', 'reviews'
];

async function executeQueryDatabase({ collection, filter, projection, limit = 10 }, userId) {
    try {
        const collName = collection.toLowerCase();
        if (!ALLOWED_COLLECTIONS.includes(collName)) {
            return { error: `Collection "${collection}" is not accessible.` };
        }

        const db = mongoose.connection.db;
        const col = db.collection(collName);

        let filterObj = {};
        try {
            filterObj = filter ? JSON.parse(filter) : {};
        } catch {
            filterObj = {};
        }

        const convertToObjectId = (obj) => {
            for (const key in obj) {
                if (obj[key] !== null && typeof obj[key] === 'object') {
                    convertToObjectId(obj[key]);
                } else if (typeof obj[key] === 'string' && (key.endsWith('Id') || key === '_id' || key === 'userID' || key === 'studentID' || key === 'subjectID' || key === 'userId' || key === 'studentId' || key === 'subjectId')) {
                    if (mongoose.Types.ObjectId.isValid(obj[key])) {
                        obj[key] = new mongoose.Types.ObjectId(obj[key]);
                    }
                }
            }
        };
        convertToObjectId(filterObj);

        let projObj = {};
        try {
            projObj = projection ? JSON.parse(projection) : {};
        } catch {
            projObj = {};
        }

        let results = await col.find(filterObj, { projection: projObj }).limit(Math.min(limit, 20)).toArray();

        if (collName === 'usersubjects' && results.length > 0) {
            const subjectIds = results.map(r => r.subjectId).filter(Boolean);
            if (subjectIds.length > 0) {
                const subjects = await db.collection('subjects').find({ _id: { $in: subjectIds } }).toArray();
                const subjectMap = subjects.reduce((acc, sub) => { acc[sub._id.toString()] = sub; return acc; }, {});
                results = results.map(r => ({ ...r, subjectDetails: subjectMap[r.subjectId?.toString()] || null }));
            }
        }

        return { collection, count: results.length, data: results };
    } catch (err) {
        return { error: err.message };
    }
}

async function executeJoinClass({ classCode }, userId) {
    try {
        const db = mongoose.connection.db;
        const subject = await db.collection('subjects').findOne({ joinCode: classCode });
        if (!subject) return { success: false, message: `No class found with join code "${classCode}".` };

        const userObjId = new mongoose.Types.ObjectId(userId);
        const subjectObjId = subject._id;

        const existing = await db.collection('usersubjects').findOne({ userId: userObjId, subjectId: subjectObjId });
        if (existing) return { success: false, message: `You are already enrolled in "${subject.name}".` };

        await db.collection('usersubjects').insertOne({ userId: userObjId, subjectId: subjectObjId, role: 'student' });
        return { success: true, message: `Successfully joined class "${subject.name}" (${subject.code}).` };
    } catch (err) {
        return { success: false, message: err.message };
    }
}

async function executeCreateNote({ title, date }) {
    return { success: true, message: `Note created: "${title}" on ${date}.`, note: { title, date, createdAt: new Date().toISOString() } };
}

async function dispatchTool(toolName, args, userId) {
    switch (toolName) {
        case 'queryDatabase':  return await executeQueryDatabase(args, userId);
        case 'joinClass':      return await executeJoinClass(args, userId);
        case 'createNote':     return await executeCreateNote(args);
        default:               return { error: `Unknown tool: ${toolName}` };
    }
}

// ─── Main Chat Implementation ────────────────────────────────────────────────

const AIChatHistory = require('../model/aiChatHistory');
const AIUsageLog = require('../model/aiUsageLog');

async function chat(userMessage, userId, role = 'unknown', language = 'vi') {
    try {
        const recentHistory = await AIChatHistory.find({ userId }).sort({ timestamp: -1 }).limit(5).lean();
        const context = await retrieveContext(userMessage);

        const currentDate = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            timeZone: 'Asia/Ho_Chi_Minh'
        });

        const langInstructions = language === 'en' 
            ? "Your primary language is English. Respond in English unless the user specifically speaks another language."
            : "Ngôn ngữ chính của bạn là Tiếng Việt. Hãy phản hồi bằng Tiếng Việt trừ khi người dùng nói bằng ngôn ngữ khác.";

        const systemPrompt = `You are an AI assistant integrated with the Teaching Assistant classroom management system.
Today is ${currentDate}.
The current user's ID is: ${userId}
The current user's Role is: ${role.toUpperCase()}.
Preferred Language: ${language.toUpperCase()}

${langInstructions}

Your job is to help users by:
1. Answering questions using documentation context below
2. Querying the database when they ask for data
3. Executing system actions (joinClass, createNote)

Rules:
- Only use collections documented below
- Never expose raw database internals
- Keep in mind the user's role (${role.toUpperCase()}) when answering.
- When querying data belonging to the current user, you MUST explicitly include their ID in the filter (e.g., {"userId": "${userId}"} or {"studentId": "${userId}"}).
- CRITICAL: Always use the exact key "userId" or "studentId" for IDs, NEVER "userID" or "studentID".
- Be concise and helpful. Respond in the same language the user writes in.

📚 Documentation Context:
${context || 'No specific documentation matched. Use general knowledge of the system.'}`;

        let replyText = '';
        let inputTokens = 0;
        let outputTokens = 0;

        if (PROVIDER === 'openai') {
            // OpenAI Implementation
            const messages = [
                { role: 'system', content: systemPrompt },
                ...recentHistory.reverse().map(h => ({
                    role: h.role === 'model' ? 'assistant' : 'user',
                    content: h.content
                })),
                { role: 'user', content: userMessage }
            ];

            const response = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o',
                messages,
                tools: getOpenAITools(),
                tool_choice: 'auto'
            });

            let finalResponse = response.choices[0].message;
            inputTokens += response.usage.prompt_tokens;
            outputTokens += response.usage.completion_tokens;

            // Handle tool calling loop for OpenAI
            while (finalResponse.tool_calls) {
                messages.push(finalResponse);
                for (const toolCall of finalResponse.tool_calls) {
                    const toolResult = await dispatchTool(toolCall.function.name, JSON.parse(toolCall.function.arguments), userId);
                    messages.push({
                        tool_call_id: toolCall.id,
                        role: 'tool',
                        name: toolCall.function.name,
                        content: JSON.stringify(toolResult)
                    });
                }

                const nextResponse = await openai.chat.completions.create({
                    model: process.env.OPENAI_MODEL || 'gpt-4o',
                    messages
                });
                finalResponse = nextResponse.choices[0].message;
                inputTokens += nextResponse.usage.prompt_tokens;
                outputTokens += nextResponse.usage.completion_tokens;
            }
            replyText = finalResponse.content;

        } else {
            // Gemini Implementation
            const history = recentHistory.reverse().map(h => ({
                role: h.role,
                parts: [{ text: h.content }]
            }));

            const model = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash',
                tools: getGeminiTools(),
                systemInstruction: systemPrompt
            });

            const chatSession = model.startChat({ history });
            let result = await chatSession.sendMessage(userMessage);
            let response = result.response;

            let functionCalls = response.functionCalls();
            while (functionCalls && functionCalls.length > 0) {
                const toolResults = [];
                for (const fc of functionCalls) {
                    const toolResult = await dispatchTool(fc.name, fc.args, userId);
                    toolResults.push({ functionResponse: { name: fc.name, response: toolResult } });
                }
                result = await chatSession.sendMessage(toolResults);
                response = result.response;
                functionCalls = response.functionCalls();
            }
            replyText = response.text();
            inputTokens = response.usageMetadata?.promptTokenCount || 0;
            outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
        }

        // 6. Save and Log
        await AIChatHistory.create({ userId, role: 'user', content: userMessage });
        await AIChatHistory.create({ userId, role: 'model', content: replyText });

        await AIUsageLog.create({
            userId,
            endpoint: '/api/v1/ai/chat',
            feature: 'chat',
            provider: PROVIDER,
            prompt: userMessage,
            response: replyText,
            inputTokens,
            outputTokens
        });

        return replyText;
    } catch (err) {
        console.error('[AI Service Error]', err);
        throw err;
    }
}

async function getHistory(userId, language = 'vi') {
    const history = await AIChatHistory.find({ userId }).sort({ timestamp: -1 }).limit(10).lean();
    return { history };
}

module.exports = { chat, getHistory };
