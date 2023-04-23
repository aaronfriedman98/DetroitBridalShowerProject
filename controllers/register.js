module.exports = {
    getRegisterPage : async (req, res) => {
        try {
            res.render(__dirname + '/views/register.ejs')
        } catch (err) {
            return res.status(500).send(err)
        }
    }
}