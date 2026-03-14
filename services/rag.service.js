const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('./supabase.service');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Schema documentation chunks to be seeded into Supabase ─────────────────
const SCHEMA_DOCS = [
    {
        content: `TABLE: users
Description: Stores all registered users in the Teaching Assistant system.
Columns:
- _id (ObjectId): unique identifier
- name (string): full name of the user
- userCode (string): student or teacher identification code
- school (string): school/university affiliation  
- email (string): unique email address
- role (string): either 'student' or 'teacher'
- avatar (string): profile picture URL

Example queries:
- Find a user by email: db.users.findOne({ email: "user@example.com" })
- List all teachers: db.users.find({ role: "teacher" })`,
        metadata: { table: 'users' }
    },
    {
        content: `TABLE: subjects (Classes)
Description: Represents a class/subject managed by a teacher. Students join using a join code.
Columns:
- _id (ObjectId): unique identifier
- code (string): subject/class code (e.g., "CS101")
- name (string): full name of the subject
- hostId (ObjectId → users._id): teacher who owns the class
- startDay (Date): semester/course start date
- endDay (Date): semester/course end date
- currentSession (Number): how many sessions have been held so far
- maxAbsences (Number): maximum allowed absences (default 5)
- joinCode (string): unique code students use to join the class

Example queries:
- Find classes a teacher hosts: db.subjects.find({ hostId: ObjectId("teacherId") })
- Find class by join code: db.subjects.findOne({ joinCode: "XYZ123" })`,
        metadata: { table: 'subjects' }
    },
    {
        content: `TABLE: usersubjects (Enrollments)
Description: Maps users (students or teachers) to subjects. Acts as the enrollment/membership table.
Columns:
- _id (ObjectId): unique identifier
- userId (ObjectId → users._id): the enrolled user
- subjectId (ObjectId → subjects._id): the subject
- role (string): either 'student' or 'teacher'

Unique constraint: (userId, subjectId) pair is unique.

Example queries:
- Get all subjects a student is enrolled in: db.usersubjects.find({ userId: ObjectId("studentId"), role: "student" })
- Get all students in a subject: db.usersubjects.find({ subjectId: ObjectId("subjectId"), role: "student" })`,
        metadata: { table: 'usersubjects' }
    },
    {
        content: `TABLE: classsessions (Weekly Schedule)
Description: Defines the recurring weekly schedule for a subject (day of week + time + room).
Columns:
- _id (ObjectId): unique identifier
- subjectId (ObjectId → subjects._id): the parent subject
- room (string): classroom or lab name
- dayOfWeek (Number): 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday
- start (string): start time in "HH:mm" format (e.g., "08:00")
- end (string): end time in "HH:mm" format (e.g., "10:00")

Example queries:
- Get schedule for a subject: db.classsessions.find({ subjectId: ObjectId("subjectId") })
- Find all Monday classes: db.classsessions.find({ dayOfWeek: 1 })`,
        metadata: { table: 'classsessions' }
    },
    {
        content: `TABLE: cattends (Attendance Sessions)
Description: Each row is one actual occurrence of a class attendance check (tied to a classSession on a specific date).
Columns:
- _id (ObjectId): unique identifier
- classSessionId (ObjectId → classsessions._id): which recurring class slot this belongs to
- date (Date): actual calendar date this session occurred
- sessionNumber (Number): sequential session number for the subject
- teacherLatitude / teacherLongitude (Number): teacher GPS coordinates for geo-verification
- isActive (Boolean): whether the attendance window is currently open
- timeExpired (Number): attendance window duration in minutes
- numberOfAttend (Number): total number of attendance records submitted
- acceptedNumber (Number): number of students accepted as present
- isClosed (Boolean): whether the session has been finalized

Example queries:
- Get all today's attendance sessions: db.cattends.find({ date: { $gte: startOfToday, $lt: endOfToday } })
- Get open attendance sessions: db.cattends.find({ isActive: true, isClosed: false })`,
        metadata: { table: 'cattends' }
    },
    {
        content: `TABLE: attendrecords (Individual Attendance)
Description: Stores each student's attendance record for a specific attendance session.
Columns:
- _id (ObjectId): unique identifier
- cAttendId (ObjectId → cattends._id): the attendance session
- studentId (ObjectId → users._id): the student
- listStatus (Array): array of { index (Number), status (string) } — tracks granular check-ins
- numberOfAbsence (Number): how many times this student has been absent in the subject
- status (string): overall status for this record — 'CP' (present), 'KP' (absent), 'CM' (excused)
- studentLatitude / studentLongitude (Number): student GPS coordinates

Status codes: CP = Có Phép (excused), KP = Không Phép (unexcused), CM = Có Mặt (present)

Example queries:
- Get a student's record for a session: db.attendrecords.findOne({ cAttendId: ObjectId("id"), studentId: ObjectId("studentId") })
- Count absent students in a session: db.attendrecords.countDocuments({ cAttendId: ObjectId("id"), status: { $in: ["KP", "CP"] } })`,
        metadata: { table: 'attendrecords' }
    },
    {
        content: `TABLE: absencerequests (Leave Requests)
Description: Students submit absence/leave requests for a subject on a specific date. Teachers review them.
Columns:
- _id (ObjectId): unique identifier
- studentId (ObjectId → users._id): student making the request
- subjectId (ObjectId → subjects._id): the subject the absence is for
- proof (Array of strings): URLs to uploaded evidence/documents
- date (Date): date of the absence
- reason (string): explanation from the student
- status (string): 'pending', 'approved', or 'rejected'
- reviewedBy (ObjectId → users._id): teacher who reviewed it
- comment (string): optional comment from the teacher
- reviewedAt (Date): when the review was made

Example queries:
- Get pending requests for a student: db.absencerequests.find({ studentId: ObjectId("id"), status: "pending" })
- Get all pending requests for a subject: db.absencerequests.find({ subjectId: ObjectId("id"), status: "pending" })`,
        metadata: { table: 'absencerequests' }
    },
    {
        content: `TABLE: discussions (In-class Q&A)
Description: In-class discussion threads posted during an attendance session.
Columns:
- _id (ObjectId): unique identifier
- cAttendId (ObjectId → cattends._id): the class session this discussion belongs to
- creator (ObjectId → users._id): user who posted
- title (string): optional title
- content (string): message content (required)
- isResolved (Boolean): whether the discussion was marked resolved
- images (Array of strings): optional image URLs
- replyOf (ObjectId → discussions._id): if this is a reply, references the parent
- upvotes / downvotes (Array of ObjectIds): users who upvoted/downvoted

Example queries:
- Get all discussions in a session: db.discussions.find({ cAttendId: ObjectId("id"), replyOf: null })`,
        metadata: { table: 'discussions' }
    },
    {
        content: `TABLE: questions (Student Questions to Teacher)
Description: Students send direct questions to the teacher for a subject.
Columns:
- _id (ObjectId): unique identifier
- subjectId (ObjectId → subjects._id): the related subject
- studentId (ObjectId → users._id): the asking student
- type (string): 'text' or 'image'
- content (string): the question text
- isResolved (Boolean): whether the teacher has answered/resolved it

Example queries:
- Get unresolved questions for a subject: db.questions.find({ subjectId: ObjectId("id"), isResolved: false })`,
        metadata: { table: 'questions' }
    },
    {
        content: `TABLE: notifications
Description: System-generated notifications sent to users.
Columns:
- _id (ObjectId): unique identifier
- senderId (ObjectId → users._id): who triggered the notification (null for system)
- title (string): notification headline
- content (string): notification body
- type (string): one of 'absent_warning', 'absence_request', 'class_cancellation', 'class_reschedule', 'other'
- referenceModel (string): model name the notification references
- referenceId (ObjectId): ID in that model

Example queries:
- Get all notification types: the type field has values absent_warning, absence_request, class_cancellation, class_reschedule, other`,
        metadata: { table: 'notifications' }
    },
    {
        content: `TABLE: reviews (Session Feedback)
Description: Students submit feedback/reviews after each class session.
Columns:
- _id (ObjectId): unique identifier
- cAttendId (ObjectId → cattends._id): the class session reviewed
- studentId (ObjectId → users._id): the reviewing student
- understandPercent (Number): how much they understood (0-100)
- usefulPercent (Number): how useful they found the session (0-100)
- teachingMethodScore (string): rating for teaching method
- atmosphereScore (string): rating for classroom atmosphere
- documentScore (string): rating for course materials
- thinking (string): optional free-text thoughts

Example queries:
- Get reviews for a session: db.reviews.find({ cAttendId: ObjectId("id") })
- Average understanding for a subject's sessions: aggregate understandPercent across cAttendIds belonging to the subject`,
        metadata: { table: 'reviews' }
    }
];

/**
 * Generate an embedding vector for a piece of text using Gemini's embedding model.
 */
async function generateEmbedding(text) {
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-2-preview' });
    const result = await model.embedContent(text);
    // Truncate to 768 dimensions (Gemini Matryoshka models support this)
    return result.embedding.values.slice(0, 768);
}

/**
 * Retrieve relevant documentation chunks from Supabase using vector similarity search.
 * @param {string} query - The user's question/message
 * @returns {string} Concatenated documentation context
 */
async function retrieveContext(query) {
    try {
        const embedding = await generateEmbedding(query);

        const { data, error } = await supabase.rpc('match_documents', {
            query_embedding: embedding,
            match_threshold: 0.4,
            match_count: 4
        });

        if (error) {
            console.error('RAG retrieval error:', error);
            return '';
        }

        if (!data || data.length === 0) return '';

        return data.map(doc => doc.content).join('\n\n---\n\n');
    } catch (err) {
        console.error('generateEmbedding or retrieval failed:', err.message);
        return '';
    }
}

/**
 * One-time seeder: embeds all schema docs and upserts them into Supabase.
 * Call this once to populate the knowledge base.
 */
async function seedDocumentation() {
    console.log('Seeding documentation into Supabase...');

    for (const doc of SCHEMA_DOCS) {
        try {
            const embedding = await generateEmbedding(doc.content);

            // Upsert based on table name in metadata
            const { error } = await supabase.from('documents').upsert({
                content: doc.content,
                metadata: doc.metadata,
                embedding
            }, { 
                onConflict: 'metadata->>table' 
            });

            if (error) {
                // If the unique constraint on metadata->>table doesn't exist, we fallback to manual update
                if (error.code === '42703' || error.message.includes('column') || error.message.includes('unique')) {
                    const { data: existing } = await supabase
                        .from('documents')
                        .select('id')
                        .eq('metadata->>table', doc.metadata.table)
                        .single();

                    if (existing) {
                        const { error: updateError } = await supabase
                            .from('documents')
                            .update({ content: doc.content, embedding })
                            .eq('id', existing.id);
                        
                        if (updateError) throw updateError;
                        console.log(`  ✓ Updated ${doc.metadata.table}`);
                    } else {
                        const { error: insertError } = await supabase
                            .from('documents')
                            .insert({ content: doc.content, metadata: doc.metadata, embedding });
                        
                        if (insertError) throw insertError;
                        console.log(`  ✓ Seeded ${doc.metadata.table}`);
                    }
                } else {
                    console.error(`  ✗ Failed to sync ${doc.metadata.table}:`, error.message);
                }
            } else {
                console.log(`  ✓ Synced ${doc.metadata.table}`);
            }
        } catch (err) {
            console.error(`  ✗ Error seeding ${doc.metadata.table}:`, err.message);
        }
    }

    console.log('Seeding complete.');
}

module.exports = { retrieveContext, seedDocumentation, generateEmbedding };
