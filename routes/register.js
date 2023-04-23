const express = require('express')
const router = express.Router()
const registerController = require('../controllers/register')

router.get('/', registerController.getRegisterPage)


module.exports = router