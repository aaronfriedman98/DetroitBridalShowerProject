const Couples = require('../models/couplesList')

module.exports = {
    getAnnouncementSubmissionPage : async (req, res) => {
        try {
            res.sendFile(__dirname + "/views/announcementSubmission.html")
        } catch (err) {
            if (err) return res.status(500).send(err)
        }
    },
    submitAnnouncement: async (req, res) => {
        try {
            await Couples.updateOne({chossonName: req.body.chossonName, 
            kallahName: req.body.kallahName}, {
                $set: {
                    announcement: true,
                    collecting: false
                }
            })
            console.log('submitted')
            res.redirect("/")
        } catch (err) {
            if (err) return res.status(500).send(err)
        }
    }
}
