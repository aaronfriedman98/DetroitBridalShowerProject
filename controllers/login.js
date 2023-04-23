module.exports = {
    getLoginPage : async (req, res) => {
        try {
            res.render(__dirname + '/views/login.ejs')
        } catch (err) {
            return res.status(500).send(err)
        }
    }
}