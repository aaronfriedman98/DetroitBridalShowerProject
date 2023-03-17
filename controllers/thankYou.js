module.exports = {
    getThankYouPage : async (req, res) => {
        try {
            res.sendFile(__dirname + '/views/thankYou.html')
        } catch (err) {
            if (err) return res.status(500).send(err)
        }
    }
}
