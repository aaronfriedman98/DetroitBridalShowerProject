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
    chossonFather: {
        type: String,
        // required: true
    },
    chossonMotherTitle: {
        type: String,
    },
    chossonMother: {
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
    kallahFather: {
        type: String,
        // required: true
    },
    kallahMotherTitle: {
        type: String,
    },
    kallahMother: {
        type: String,
        // required: true
    },
    kallahOrigin: {
        type: String,
        required: true
    },
    tempId: {
        type: String,
    }
})

module.exports = mongoose.model('newCouple', newCoupleSchema, 'newCouple')