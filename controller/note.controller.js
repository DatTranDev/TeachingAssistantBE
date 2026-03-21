const Note = require('../model/note.js');

// POST /api/v1/note
const createNote = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { title, date, time, duration, location, doingWith, checklist, done } = req.body;

    const note = new Note({
      userId,
      title,
      date,
      time: time ?? '',
      duration: duration ?? 0,
      location: location ?? '',
      doingWith: doingWith ?? '',
      checklist: checklist ?? [],
      done: done ?? false,
    });

    const saved = await note.save();
    return res.status(201).json({ data: saved });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/note/user/:userId
const getNotesByUser = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const notes = await Note.find({ userId }).sort({ date: 1, time: 1 });
    return res.status(200).json({ data: notes });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/note/:id
const updateNote = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { id } = req.params;
    const { title, date, time, duration, location, doingWith, checklist, done } = req.body;

    const note = await Note.findOne({ _id: id, userId });
    if (!note) return res.status(404).json({ message: 'Note not found' });

    if (title !== undefined) note.title = title;
    if (date !== undefined) note.date = date;
    if (time !== undefined) note.time = time;
    if (duration !== undefined) note.duration = duration;
    if (location !== undefined) note.location = location;
    if (doingWith !== undefined) note.doingWith = doingWith;
    if (checklist !== undefined) note.checklist = checklist;
    if (done !== undefined) note.done = done;

    const updated = await note.save();
    return res.status(200).json({ data: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/note/:id
const deleteNote = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { id } = req.params;

    const note = await Note.findOneAndDelete({ _id: id, userId });
    if (!note) return res.status(404).json({ message: 'Note not found' });

    return res.status(200).json({ message: 'Note deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createNote, getNotesByUser, updateNote, deleteNote };
