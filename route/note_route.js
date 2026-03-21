const express = require('express');
const router = express.Router();
const { createNote, getNotesByUser, updateNote, deleteNote } = require('../controller/note.controller.js');

router.post('/', createNote);
router.get('/user/:userId', getNotesByUser);
router.patch('/:id', updateNote);
router.delete('/:id', deleteNote);

module.exports = router;
