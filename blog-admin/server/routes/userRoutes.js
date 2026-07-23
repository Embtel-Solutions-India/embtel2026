const express = require('express');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.patch('/users/me/password', userController.updateMyPassword);

router.get('/users', restrictTo('admin'), userController.getUsers);
router.post('/users', restrictTo('admin'), userController.createUser);
router.patch('/users/:id', restrictTo('admin'), userController.updateUser);
router.delete('/users/:id', restrictTo('admin'), userController.deleteUser);

module.exports = router;
