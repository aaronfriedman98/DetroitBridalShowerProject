const express = require('express')
const router = express.Router()
const adminController = require('../controllers/admin')


const multer = require('multer')
const upload = multer({dest: __dirname + '/../uploads'});


// const cookieParser = require('cookie-parser')
const {adminAuth} = require('../middleware/auth')


router.get('/', adminAuth, adminController.getAdminPage)
router.get('/adminVerification', adminController.adminVerification)
router.get('/adminUpload', adminController.adminUpload)
router.get('/searchCouples', adminController.searchCouples)
router.post('/addEntry', adminController.addEntry)
router.delete('/deleteEntry', adminController.deleteEntry)
router.put('/verifyEntry', adminController.verifyEntry)
router.post('/fillInfoModal', adminController.fillInfoModal)
router.post('/sendNewsletter', adminController.sendNewsletter);
router.post('/uploadAnnouncement', upload.single('file'), adminController.uploadAnnouncement)

// router.post('/getCouples', announcementsController.couplesSearch)


module.exports = router