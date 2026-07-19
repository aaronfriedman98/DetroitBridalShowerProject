const express = require('express')
const router = express.Router()
const adminController = require('../controllers/newAdmin')


const multer = require('multer')
const upload = multer({dest: __dirname + '/../uploads'});


// const cookieParser = require('cookie-parser')
const {adminAuth} = require('../middleware/auth')


router.get('/', adminAuth, adminController.getAdminPage)
router.get('/data', adminAuth, adminController.getData)
router.get('/adminVerification', adminAuth, adminController.adminVerification)
router.get('/adminUpload', adminAuth, adminController.adminUpload)
router.get('/search', adminAuth, adminController.searchCouples)
router.post('/addEntry', adminAuth, adminController.addEntry)
router.put('/updateEntry', adminAuth, adminController.updateEntry)
router.delete('/deleteEntry', adminAuth, adminController.deleteEntry)
router.put('/verifyEntry', adminAuth, adminController.verifyEntry)
router.post('/fillInfoModal', adminAuth, adminController.fillInfoModal)
router.post('/sendNewsletter', adminAuth, adminController.sendNewsletter);
router.post('/uploadAnnouncement', adminAuth, upload.single('file'), adminController.uploadAnnouncement)
router.post('/sendNewNewsletter', adminAuth, adminController.sendNewNewsletter)
router.get('/previewEmail', adminAuth, (req, res) => { req.preview = true; return adminController.sendNewNewsletter(req, res) })

// public: linked from newsletter emails
router.get('/unsubscribe', adminController.unsubscribe)


module.exports = router
