module.exports = {
    getRegisterPage : async (req, res) => {
        try {
            res.render('register.ejs')
        } catch (err) {
            return res.status(500).send(err)
        }
    }
}