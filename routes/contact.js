const express = require('express')
const router = express.Router()
const contactController = require('../controllers/contact')

router.get('/', contactController.getContactPage)
router.post('/message', contactController.message)


module.exports = router