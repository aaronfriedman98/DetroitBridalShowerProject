const express = require('express')
const router = express.Router()
const announcementsController = require('../controllers/announcements')

router.get('/', announcementsController.getAnnouncementsPage)
router.get('/search', announcementsController.searchCouples)
router.post('/fillInfoModal', announcementsController.fillInfoModal)
// router.post('/getCouples', announcementsController.couplesSearch)


module.exports = router