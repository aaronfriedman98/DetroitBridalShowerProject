const sgMail = require('@sendgrid/mail')
const sgClient = require('@sendgrid/client')

sgMail.setApiKey(process.env.API_KEY)
sgClient.setApiKey(process.env.API_KEY)

const fs = require('fs')
const path = require('path')
const { base64encode } = require('nodejs-base64')


// // Read the PDF file into a buffer
// const pdfPath = path.join(__dirname, '../public/assets/images/checklist.pdf')
// const pdfData = fs.readFileSync(pdfPath)


// // Encode the PDF buffer as a Base64 string
// const pdfBase64 = base64encode(pdfData)


// Read the PDF file into a buffer
const pdfPath = path.join(__dirname, '../public/assets/images/ChassunahResources.pdf');
const pdfData = fs.readFileSync(pdfPath);

// Encode the PDF buffer as a Base64 string
const pdfBase64 = Buffer.from(pdfData).toString('base64');



// const nodemailer = require("nodemailer")

module.exports = {
    getFinancialAssistancePage : async (req, res) => {
        try {
            res.sendFile(__dirname + '/views/financialAssistance.html')
        } catch (err) {
            if (err) return res.status(500).send(err)
        }
    },
    emailAssistance : async (req, res) => {
        try {
            if(req.body.email === '') {
                res.redirect('/financialAssistance')
            } else {

                const msg = {
                    to: req.body.email,
                    from: 'aronfriedman98@gmail.com',
                    subject: 'Wedding Resources',
                    html: ` <h2></h2>`,
                    attachments: [{
                        filename: 'checklist.pdf',
                        path: '../public/assets/images/ChassunahResources.pdf',
                        content: pdfBase64,
                        type: 'application/pdf',
                        disposition: 'attachment'
                    }]
                }
          sgMail.send(msg)        

            
            // async function sendNodemailer() {

            //     const transporter = nodemailer.createTransport({
            //         service: "hotmail",
            //         auth: {
            //             user: "lyftscooter@outlook.com",
            //             pass: "scooterLyft98"
            //         }
            //     })
            //     if(req.body.email !== '') {
            //         let recipient = req.body.email
            //     } else {
            //         recipient = 'lyfscooter@outlook.com'
            //     }
                
            
            //     const info = await transporter.sendMail({
            //         from: 'Detroit Bridal Shower <lyftscooter@outlook.com>',
            //         to: recipient,
            //         attachements: [{
            //             filename: 'checklist.pdf',
            //             path: '../public/assets/images/checklist.pdf'
            //         }],
            //         subject: 'Detroit Bridal Shower Inquiry',
            //         html: ` <h2>Message:</h2>
            //                 <p>
            //                 https://www.chesedmatch.org/new-york/long-island/chesed-categories/financial-assistance-for-kallahs-gemach-l-iluy-nishmas-elisheva-kaplan

            //                 Yad batya l'kallah application: Fill out & sign online - DocHub https://www.dochub.com/fillable-form/37569-yad-batya-lkallah-application
                            
            //                 https://acrobat.adobe.com/link/review?uri=urn:aaid:scds:US:b98f14cb-9a7f-31c0-98bd-1b3358435367

                            
            //                 </p>

            //                 <h2> Chassunah Resources </h2>
            //                 <ul>
            //                     <div style="display: flex;">
            //                         <li><b>Zichron Foundation</b></li>
            //                         <li>Mrs. Fern Herschfus</li>
            //                         <li>(text) 248-388-9157</li>
            //                     </div>
            //                     <div style="display: flex;">
            //                         <li><b>Matan Bester</b></li>
            //                         <li>Rabbi M.Z. Greenfield</li>
            //                         <li>248-569-7753</li>
            //                     </div>
            //                     <div style="display: flex;">
            //                         <li><b>Keren Simchas Chosson V'kallah</b></li>
            //                         <li>(crown heights)</li>
            //                         <li>917-225-</li>
            //                     </div>

            //                     <li></li>

            //                     <div style="display: flex;">
            //                         <li></li>
            //                         <li></li>
            //                         <li></li>
            //                     </div>
            //                     <div style="display: flex;">
            //                         <li></li>
            //                         <li></li>
            //                         <li></li>
            //                     </div>
                                

            //                     <li></li>
            //                     <li></li>
            //                     <li></li>
            //                     <li></li>
            //                     <li></li>
            //                     <li></li>
            //                     <li></li>
            //                     <li></li>

            //                     <li></li>
            //                     <li></li>
            //                     <li></li>
            //                     <li></li>
            //                     <li></li>
            //                     <li></li>
            //                     <li></li>
            //                     <li></li>
            //                 </ul
            //         `
            //     })
            // }
            // sendNodemailer()



            res.redirect('/financialAssistance')
        }
        } catch (err) {
            res.status(500).send(err)
        }
    }
}
