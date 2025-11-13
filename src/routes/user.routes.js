const express = require('express');
const userController = require('../controllers/user.controller');

const router = express.Router();

router.post('/login', userController.loginUser);
router.post('/save', userController.saveUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;