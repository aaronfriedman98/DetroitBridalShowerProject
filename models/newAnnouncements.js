const mongoose = require("mongoose")
const announcementSchema = new mongoose.Schema({
    chosson: {
        type: String,
        required: true
    },
    kallah: {
        type: String,
        required: true
    },
    imageString : {
        type: String,
        required: false
    }
})

module.exports = mongoose.model('announcements', announcementSchema, 'announcements')