const mongoose = require("mongoose")
const emailSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    }
    // firstName: {
    //     type: String,
    //     required: false
    // },
    // lastName: {
    //     type: String,
    //     required: false
    // }
})

module.exports = mongoose.model('testEmails', emailSchema, 'couplesDB')