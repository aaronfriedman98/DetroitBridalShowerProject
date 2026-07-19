const mongoose = require("mongoose")

// One record per (contributor, couple). A single pledge submission for
// several couples shares a groupId. amount is PRIVATE - never shown on the
// public contributors page. verified=false until mom confirms payment arrived.
const contributionSchema = new mongoose.Schema({
    coupleId: {
        type: String,
        required: true
    },
    coupleNames: {          // snapshot "Chosson & Kallah" so lists render fast
        type: String
    },
    contributorName: {
        type: String,
        required: true
    },
    contributorEmail: {
        type: String
    },
    contributorPhone: {
        type: String
    },
    amount: {
        type: Number,
        default: 65
    },
    verified: {
        type: Boolean,
        default: false
    },
    source: {               // 'pledge' = via website form, 'manual' = mom entered
        type: String,
        default: 'pledge'
    },
    groupId: {
        type: String
    }
})

module.exports = mongoose.model('contribution', contributionSchema, 'contributions')
