const express = require('express')
const router = express.Router()
const announcementSubmissionController = require('../controllers/announcementSubmission')

router.get('/', announcementSubmissionController.getAnnouncementSubmissionPage)
router.post('/submitAnnouncement', announcementSubmissionController.submitAnnouncement)


module.exports = router