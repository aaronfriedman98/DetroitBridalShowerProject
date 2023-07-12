module.exports = {
    getAboutPage : async (req, res) => {
        try {
            // res.sendFile(__dirname + "/views/about.html")
            res.render('about.ejs')
        } catch (err) {
            if (err) return res.status(500).send(err)
        }
    }
}
