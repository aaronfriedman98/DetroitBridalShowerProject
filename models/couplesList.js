const mongoose = require("mongoose")
const couplesListSchema = new mongoose.Schema({
    chossonName: {
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
    kallahName: {
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
    name : {
        type: String,
        required: true
    },
    email : {
        type: String,
        required: true
    },
    phoneNumber : {
        type: String,
        required: true
    },
    address : {
        type: String,
        required: true
    },
    weddingDate : {
        type: String,
    },
    personalShopper : {
        type: String,
    },
    announcement: {
        type: Boolean,
        default: false
    },
    collecting: {
        type: Boolean,
        default: false
    },
    verified: {
        type: Boolean,
        default: false
    },
    confNumber: {
        type: Number,
    },
    image: {
        type: Buffer,
        contentType: String
    },
    imageString : {
        type: String,
        required: false
    }

    // address: {
    //     type: String,
    //     // required: true
    // },
    //weddingDate: {
      //  type: Date,
        // default: Date.now,
        // required: true
    //},
    //email: {
      //  type: String,
        // required: true
    //}, 
    //personalShopper: {
      //  type: String,
        // required: true
    //}
})

module.exports = mongoose.model('couples', couplesListSchema, 'couplesdb')