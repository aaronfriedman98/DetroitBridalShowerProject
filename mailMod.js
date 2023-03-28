require("dotenv").config({path: "./config/.env"})

const sgMail = require('@sendgrid/mail')
const sgClient = require('@sendgrid/client')
const express = require('express')
const expressFileUpload = require('express-fileupload')
const app = express()


let test1 = "hello"
let test2 = "hi there"

sgMail.setApiKey(process.env.API_KEY)
sgClient.setApiKey(process.env.API_KEY)

sgMail.setApiKey(process.env.API_KEY)
sgClient.setApiKey(process.env.API_KEY)
app.use(express.urlencoded({
 extended: true
}))
app.use(express.json())
app.use(expressFileUpload())
app.set('view engine', 'ejs')

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