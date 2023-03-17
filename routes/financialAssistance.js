const express = require('express')
const router = express.Router()
const financialAssistanceController = require('../controllers/financialAssistance')

router.get('/', financialAssistanceController.getFinancialAssistancePage)
router.post('/email', financialAssistanceController.emailAssistance)


module.exports = router