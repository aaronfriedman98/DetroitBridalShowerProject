const express = require('express')
const router = express.Router()
const aboutController = require('../controllers/about')

router.get('/', aboutController.getAboutPage)


module.exports = router