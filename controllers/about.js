module.exports = {
    getAboutPage : async (req, res) => {
        try {
            res.sendFile(__dirname + "/views/about.html")
        } catch (err) {
            if (err) return res.status(500).send(err)
        }
    }
}
