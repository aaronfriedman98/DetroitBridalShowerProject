const mongoose = require("mongoose")
const couplesListSchema = new mongoose.Schema({
    chossonName: {
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
    // chossonMotherField1: {
    //     type: String,
    //     // required: true
    // },
    // chossonMotherField2: {
    //     type: String,
    //     // required: true
    // },
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
    name : {
        type: String,

        // required: true
    },
    email : {
        type: String,

        // required: true
    },
    phoneNumber : {
        type: String,

        // required: true
    },
    address : {
        type: String,

        // required: true
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
    },
    chesedPackage: {
        type: String,
        required: false
    },
    chossonDeceased: {
        type: String,
        required: false
    },
    kallahDeceased: {
        type: String,
        required: false
    },
    
    //additional parents
    // addParentChossonFatherTitle: {
    //     type: String,
    // },
    // addParentChossonFatherName: {
    //     type: String,
    // },
    // addParentChossonMotherTitle: {
    //     type: String,
    // },
    // addParentChossonMotherName: {
    //     type: String,
    // },
    // addParentKallahFatherTitle: {
    //     type: String,
    // },
    // addParentKallahFatherName: {
    //     type: String,
    // },
    // addParentKallahMotherTitle: {
    //     type: String,
    // },
    // addParentKallahMotherName: {
    //     type: String,
    // },

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