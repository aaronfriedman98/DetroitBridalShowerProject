const express = require('express')
const router = express.Router()
const homeController = require('../controllers/home')

router.get('/', homeController.getIndex)
router.post('/addEntry', homeController.addEntry)
router.post('/addEmail', homeController.addEmail)

module.exports = router



