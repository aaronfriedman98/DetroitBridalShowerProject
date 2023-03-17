require("dotenv").config({path: "./config/.env"})

const sgMail = require('@sendgrid/mail')

let test1 = "hello"
let test2 = "hi there"

sgMail.setApiKey(process.env.API_KEY)

const message = {
    // to: 'aronfriedman98@gmail.com',
    to: [
        'aronfriedman98@gmail.com',
        'afriedman@woodmontcollege.edu'
        ],
    // from: 'lyftscooter@outlook.com',
    from: {
        name: 'Detroit Bridal Shower Test',
        email: 'lyftscooter@outlook.com'
    },
    subject: 'Testing sendgrid',
    text: 'testing sendgrid',
    html: `<h1> Testing sendgrid</h1>
    <p>${test1} + ${test2}</p>`
}

const sendMail = async (message) => {
    try {
        await sgMail.send(message)
        console.log("message sent")
    } catch (error) {
        console.error(error)

        if (error.response) {
            console.error(error.response.body)
        }
    }
}

// sendMail(message)

module.exports = {sendMail, message}