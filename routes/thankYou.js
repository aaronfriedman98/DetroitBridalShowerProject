const express = require('express')
const router = express.Router()
const thankYouController = require('../controllers/thankYou')

router.get('/', thankYouController.getThankYouPage)


module.exports = router