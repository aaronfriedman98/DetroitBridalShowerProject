const express = require('express')
const router = express.Router()
const shoppingGuideController = require('../controllers/shoppingGuide')

router.get('/', shoppingGuideController.getShoppingGuidePage)
router.get('/checklist', shoppingGuideController.checklist)


module.exports = router