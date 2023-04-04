const express = require('express')
const router = express.Router()
const adminController = require('../controllers/admin')

router.get('/', adminController.getAdminPage)
router.get('/search', adminController.searchCouples)
router.post('/addEntry', adminController.addEntry)
router.delete('/deleteEntry', adminController.deleteEntry)
router.post('/fillInfoModal', adminController.fillInfoModal)
// router.post('/getCouples', announcementsController.couplesSearch)


module.exports = router