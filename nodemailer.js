// const nodemailer = require('nodemailer')

// const html = `
//     <h1>New Couple</h1>
//     <p>Isn't nodemailer useful</p>
//     <img src="cid:logo">
// `

// const emails = [ 'aronfriedman98@gmail.com']

// async function sendNodemailer() {

//     const transporter = nodemailer.createTransport({
//         service: "hotmail",
//         auth: {
//             user: "lyftscooter@outlook.com",
//             pass: "scooterLyft98"
//         }
//     })

//     const info = await transporter.sendNodeMailer({
//         from: 'Detroit Bridal Shower Update <lyftscooter@outlook.com>',
//         to: emails,
//         subject: 'New Couple Submission',
//         html: html,
//         attachements: [{
//             filename: 'bridalshowerpic.png',
//             filePath: __dirname + './public/assets/images/bridalshowerpic.png',
//             cid: 'logo'
//         }]
//     })

//     // console.log("Message sent: " + info.response)
//     // console.log(info.accepted)
//     // console.log(info.rejected)

// }

// // main()
// // .catch(e => console.log(e))

// // module.exports = sendNodemailer