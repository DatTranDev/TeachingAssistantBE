const { GoogleGenerativeAI } = require('@google/generative-ai');
const { retrieveContext } = require('./rag.service');
const mongoose = require('mongoose');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const tools = [
    {
        functionDeclarations: [
            {
                name: 'queryDatabase',
                description: 'Query the MongoDB database using a Mongoose-compatible aggregation pipeline or find query expressed as a JSON description. Use this when the user asks for data from the classroom system.',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        collection: {
                            type: 'STRING',
                            description: 'MongoDB collection name (e.g., "subjects", "usersubjects", "attendrecords", "absencerequests", "cattends", "users")'
                        },
                        filter: {
                            type: 'STRING',
                            description: 'JSON string of the MongoDB filter/query object (e.g., {"role": "student"})'
                        },
                        projection: {
                            type: 'STRING',
                            description: 'JSON string of fields to include or exclude (e.g., {"name": 1, "email": 1})'
                        },
                        limit: {
                            type: 'NUMBER',
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
                    type: 'OBJECT',
                    properties: {
                        classCode: {
                            type: 'STRING',
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
                    type: 'OBJECT',
                    properties: {
                        title: {
                            type: 'STRING',
                            description: 'The title or content of the note/reminder'
                        },
                        date: {
                            type: 'STRING',
                            description: 'The date for the reminder in YYYY-MM-DD format'
                        }
                    },
                    required: ['title', 'date']
                }
            }
        ]
    }
];

// ─── Tool Executors ───────────────────────────────────────────────────────────

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

        // Convert string IDs to mongoose ObjectIds recursively for any field ending with 'Id' or '_id'
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

        // If querying usersubjects or cattends, do a manual local lookup for the related subject/session to make the data actually useful for Gemini
        if (collName === 'usersubjects' && results.length > 0) {
            const subjectIds = results.map(r => r.subjectId).filter(Boolean);
            if (subjectIds.length > 0) {
                const subjects = await db.collection('subjects').find({ _id: { $in: subjectIds } }).toArray();
                const subjectMap = subjects.reduce((acc, sub) => { acc[sub._id.toString()] = sub; return acc; }, {});
                results = results.map(r => ({ ...r, subjectDetails: subjectMap[r.subjectId?.toString()] || null }));
            }
        }

        return {
            collection,
            count: results.length,
            data: results
        };
    } catch (err) {
        return { error: err.message };
    }
}

async function executeJoinClass({ classCode }, userId) {
    // This is a system action — we look up the subject and enroll the user
    try {
        const db = mongoose.connection.db;
        const subject = await db.collection('subjects').findOne({ joinCode: classCode });

        if (!subject) {
            return { success: false, message: `No class found with join code "${classCode}".` };
        }

        const userObjId = new mongoose.Types.ObjectId(userId);
        const subjectObjId = subject._id;

        // Check if already enrolled
        const existing = await db.collection('usersubjects').findOne({
            userId: userObjId,
            subjectId: subjectObjId
        });

        if (existing) {
            return { success: false, message: `You are already enrolled in "${subject.name}".` };
        }

        await db.collection('usersubjects').insertOne({
            userId: userObjId,
            subjectId: subjectObjId,
            role: 'student'
        });

        return {
            success: true,
            message: `Successfully joined class "${subject.name}" (${subject.code}).`
        };
    } catch (err) {
        return { success: false, message: err.message };
    }
}

async function executeCreateNote({ title, date }) {
    // Notes are stored in-memory or as a simple acknowledgement
    // Extend this to persist to a notes collection if needed
    return {
        success: true,
        message: `Note created: "${title}" on ${date}.`,
        note: { title, date, createdAt: new Date().toISOString() }
    };
}

// ─── Tool Dispatcher ─────────────────────────────────────────────────────────

async function dispatchTool(toolName, args, userId) {
    switch (toolName) {
        case 'queryDatabase':  return await executeQueryDatabase(args, userId);
        case 'joinClass':      return await executeJoinClass(args, userId);
        case 'createNote':     return await executeCreateNote(args);
        default:               return { error: `Unknown tool: ${toolName}` };
    }
}

// ─── Main Chat Function ───────────────────────────────────────────────────────

const AIChatHistory = require('../model/aiChatHistory');
const AIUsageLog = require('../model/aiUsageLog');

/**
 * Process a user message through the RAG + Gemini pipeline.
 * @param {string} userMessage - The message from the user
 * @param {string} userId - MongoDB ObjectId of the authenticated user
 * @param {string} role - The user's role (teacher/student)
 * @returns {string} Final text reply
 */
async function chat(userMessage, userId, role = 'unknown') {
    try {
        // 1. Fetch last 5 messages for context
        const recentHistory = await AIChatHistory.find({ userId })
            .sort({ timestamp: -1 })
            .limit(5)
            .lean();
        
        // Sort chronologically for Gemini
        const history = recentHistory.reverse().map(h => ({
            role: h.role,
            parts: [{ text: h.content }]
        }));

        // 2. Retrieve relevant schema documentation
        const context = await retrieveContext(userMessage);

        const currentDate = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            timeZone: 'Asia/Ho_Chi_Minh'
        });

        // 3. Build system prompt
        const systemPrompt = `You are an AI assistant integrated with the Teaching Assistant classroom management system.
Today is ${currentDate}.
The current user's ID is: ${userId}
The current user's Role is: ${role.toUpperCase()} (either STUDENT or TEACHER).

Your job is to help users by:
1. Answering questions using documentation context below
2. Querying the database when they ask for data
3. Executing system actions (joinClass, createNote)

Always follow this reasoning:
- If the user asks for data → call queryDatabase
- If the user says "join class [code]" → call joinClass  
- If the user asks to create a note/reminder → call createNote
- If it can be answered from docs directly → respond with text

Rules:
- Only use collections documented below
- Never expose raw database internals
- Keep in mind the user's role (${role.toUpperCase()}) when answering. If a TEACHER asks what classes they have, query classes where they are the hostId or have role "teacher". If a STUDENT asks what classes they have, query classes where they have role "student". Explain to them if their query yields no results because of their role.
- When querying data belonging to the current user (e.g. usersubjects, attendrecords, reviews), you MUST explicitly include their ID in the filter (e.g., {"userId": "${userId}"} or {"studentId": "${userId}"}).
- CRITICAL: Always use the exact key "userId" or "studentId" for IDs, NEVER "userID" or "studentID".
- SECURITY & CONSISTENCY: Do NOT allow querying or returning sensitive information of other users. If a user asks for another person's information, politely refuse. You are strictly restricted to querying and responding with data that belongs to the current user (${userId}) or global non-sensitive class information.
- Be concise and helpful. Respond in the same language the user writes in.

📚 Documentation Context:
${context || 'No specific documentation matched. Use general knowledge of the system.'}`;

        // 4. Call Gemini
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            tools,
            systemInstruction: systemPrompt
        });

        const chatSession = model.startChat({ history });
        let result = await chatSession.sendMessage(userMessage);
        let response = result.response;

        // 5. Handle tool calls (function calling loop)
        let functionCalls = response.functionCalls();
        while (functionCalls && functionCalls.length > 0) {
            const toolResults = [];

            for (const fc of functionCalls) {
                console.log(`[AI] Tool call: ${fc.name}`, fc.args);
                const toolResult = await dispatchTool(fc.name, fc.args, userId);
                console.log(`[AI] Tool result:`, JSON.stringify(toolResult).substring(0, 200));

                toolResults.push({
                    functionResponse: {
                        name: fc.name,
                        response: toolResult
                    }
                });
            }

            // Send tool results back to Gemini
            result = await chatSession.sendMessage(toolResults);
            response = result.response;
            functionCalls = response.functionCalls();
        }

        const replyText = response.text();

        // 6. SUCCESS: Now save everything to DB
        // Save User Message
        await AIChatHistory.create({ userId, role: 'user', content: userMessage });
        // Save AI Response
        await AIChatHistory.create({ userId, role: 'model', content: replyText });

        // Log Usage
        const usage = response.usageMetadata || {};
        await AIUsageLog.create({
            userId,
            endpoint: '/api/v1/ai/chat',
            feature: 'chat',
            prompt: userMessage,
            response: replyText,
            inputTokens: usage.promptTokenCount || 0,
            outputTokens: usage.candidatesTokenCount || 0
        });

        return replyText;
    } catch (err) {
        console.error('[AI Service Error]', err);
        // Do not save history or usage logs if the process failed
        throw err;
    }
}

/**
 * Retrieve the last 10 messages for a user to display in the UI.
 */
async function getHistory(userId) {
    return await AIChatHistory.find({ userId })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();
}

module.exports = { chat, getHistory };
