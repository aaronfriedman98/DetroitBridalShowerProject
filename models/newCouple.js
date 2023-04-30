const mongoose = require("mongoose")
const newCoupleSchema = new mongoose.Schema({
    chosson: {
        type: String,
        required: true
    },
    kallah: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('newCouple', newCoupleSchema, 'newCouple')