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
// contributions management
const give = require('../controllers/give')
router.get('/contributions', adminAuth, give.adminContributionsPage)
router.get('/contributionsData', adminAuth, give.getContributionsData)
router.post('/addContribution', adminAuth, give.addContribution)
router.put('/verifyContribution', adminAuth, give.verifyContribution)
router.delete('/deleteContribution', adminAuth, give.deleteContribution)

router.post('/sendTestEmail', adminAuth, (req, res) => {
  const email = String(req.body.email || '').trim()
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json('invalid email')
  req.testEmail = email
  return adminController.sendNewNewsletter(req, res)
})
// router.get('/unsubscribe', adminController.unsubscribe)
// router.post('/removeEmailFromList', adminController.removeEmailFromList)


// router.post('/getCouples', announcementsController.couplesSearch)


module.exports = router
