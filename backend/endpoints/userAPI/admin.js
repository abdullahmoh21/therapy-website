const express = require('express');
const router = express.Router();
const usersController = require('../../controllers/adminController.js');
const ROLES_LIST = require('../../config/roles_list.js');
const verifyAdmin = require('../../middleware/verifyAdmin.js'); 

router.route('/')
    .get(verifyAdmin(), usersController.getAllUsers)
    .delete(verifyAdmin(), usersController.deleteUser);


router.route('/:username')
    .get(verifyAdmin(), usersController.getUser)
    .put(verifyAdmin(), usersController.updateUser);


module.exports = router;