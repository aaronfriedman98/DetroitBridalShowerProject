const express = require('express')
const router = express.Router()
const adminUploadController = require('../controllers/adminUpload')


const multer = require('multer')
const upload = multer({dest: __dirname + '/../uploads'});


// const cookieParser = require('cookie-parser')
const {adminAuth} = require('../middleware/auth')


router.get('/', adminAuth, adminUploadController.getAdminUploadPage)
// router.get('/adminVerification', adminController.adminVerification)
router.get('/adminUpload', adminUploadController.adminUpload)
router.get('/searchCouples', adminUploadController.searchCouples)
// router.post('/addEntry', adminController.addEntry)
router.delete('/deleteUpload', adminUploadController.deleteEntry)
// router.put('/verifyEntry', adminController.verifyEntry)
router.post('/fillInfoModal', adminUploadController.fillInfoModal)
// router.post('/sendNewsletter', adminController.sendNewsletter);
router.post('/uploadAnnouncement', upload.single('file'), adminUploadController.uploadAnnouncement)
router.post('/deleteUpload', adminUploadController.deleteUpload)

// router.post('/getCouples', announcementsController.couplesSearch)


module.exports = router