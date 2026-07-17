const mongoose = require("mongoose")
const newCoupleSchema = new mongoose.Schema({
    chosson: {
        type: String,
        required: true
    },
    kallah: {
        type: String,
        required: true
    },
    chossonFatherTitle: {
        type: String,
    },
    chossonFatherName: {
        type: String,
        // required: true
    },
    chossonMotherTitle: {
        type: String,
    },
    chossonMotherName: {
        type: String,
        // required: true
    },
    chossonOrigin: {
        type: String,
        required: true
    },
    kallahFatherTitle: {
        type: String,
    },
    kallahFatherName: {
        type: String,
        // required: true
    },
    kallahMotherTitle: {
        type: String,
    },
    kallahMotherName: {
        type: String,
        // required: true
    },
    kallahOrigin: {
        type: String,
        required: true
    },
    chossonMotherDivorcedTitle: {
        type: String,
    },
    chossonMotherDivorcedName: {
        type: String,
    },
    chossonMotherHusbandTitle: {
        type: String,
    },
    chossonMotherHusbandName: {
        type: String,
    },
    kallahMotherDivorcedTitle: {
        type: String,
    },
    kallahMotherDivorcedName: {
        type: String,
    },
    kallahMotherHusbandTitle: {
        type: String,
    },
    kallahMotherHusbandName: {
        type: String,
    },
    email: {
        type: String,
        // required: true
    },
    phoneNumber: {
        type: String,
    },
    tempId: {
        type: String,
    }
})

module.exports = mongoose.model('newCouple', newCoupleSchema, 'newCouple')