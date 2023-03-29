const express = require('express')
const router = express.Router()
const homeController = require('../controllers/home')

router.get('/', homeController.getIndex)
router.post('/addEntry', homeController.addEntry)
router.get('/confirmEntry', homeController.confirmEntry)
router.post('/addEmail', homeController.addEmail)
router.get('/confirm', homeController.confirmEmail)
// router.get('/unsubscribe', homeController.unsubscribeEmail)

module.exports = router



