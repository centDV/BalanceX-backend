const express = require('express');
const router = express.Router();

const journalController = require('../controllers/journal.controller');
router.get('/journal/:userId', journalController.getJournal);


router.post('/journal', journalController.registerAsiento);


router.delete('/journal/:asientoId', journalController.deleteAsiento);


module.exports = router;
