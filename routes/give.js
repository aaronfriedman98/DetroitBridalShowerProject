const express = require('express')
const router = express.Router()
const give = require('../controllers/give')

router.get('/', give.getGivePage)
router.post('/submit', give.submitPledge)

module.exports = router
