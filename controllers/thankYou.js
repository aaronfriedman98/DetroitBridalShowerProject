module.exports = {
    getThankYouPage : async (req, res) => {
        try {
            // res.sendFile(__dirname + '/views/thankYou.html')
            res.render('thankYou.ejs')
        } catch (err) {
            if (err) return res.status(500).send(err)
        }
    }
}
