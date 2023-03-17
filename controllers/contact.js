const nodemailer = require("nodemailer")


module.exports = {
    getContactPage : async (req, res) => {
        try {
            res.sendFile(__dirname + '/views/contact.html')
        } catch (err) {
            if (err) return res.status(500).send(err)
        }
    },
    message : async (req, res) => {
        try {
            async function sendNodemailer() {

                const transporter = nodemailer.createTransport({
                    service: "hotmail",
                    auth: {
                        user: "lyftscooter@outlook.com",
                        pass: "scooterLyft98"
                    }
                })
            
                const info = await transporter.sendMail({
                    from: 'Detroit Bridal Shower <lyftscooter@outlook.com>',
                    to: 'afriedman@woodmontcollege.edu',
                    subject: 'Detroit Bridal Shower Inquiry',
                    html: ` <h2>Message:</h2>
                            <p>
                            <strong>Name:</strong> ${req.body.First_Name} ${req.body.Last_Name} <br>
                            <strong>Email:</strong> ${req.body.Email} <br>
                            <strong>Phone Number:</strong> ${req.body.Phone_Number} <br>
                            <strong>Message:</strong> ${req.body.Message} <br>
                            </p>
                    `
                })
            }
            sendNodemailer()

            res.redirect('/')
            
        } catch (err) {
            return res.status(500).send(err)
        }
    }
}


