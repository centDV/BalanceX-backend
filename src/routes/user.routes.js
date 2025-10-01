const express = require('express');
const userController = require('../controllers/user.controller');

const router = express.Router();

router.post('/save', userController.saveUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;