const express = require('express')
const router = express.Router()
const give = require('../controllers/give')

router.get('/', give.getContributorsPage)
router.post('/lookup', give.lookupContributor)

module.exports = router
