// const Email = require('../models/emailList')
const Couples = require('../models/couplesList')
const Announcements = require('../models/newAnnouncements')
const NewCouple = require('../models/newCouple')
const mailMod = require("../mailMod")
const nodemailer = require("nodemailer")
const Emails = require('../models/emailList')
const TestEmails = require('../models/testEmails')

const sgMail = require('@sendgrid/mail')
const sgClient = require('@sendgrid/client')
const { buildActionEmail, emailRows, buildCollectionEmail, buildPersonalCollectionEmail, buildInstructionsEmail } = require('../mailTemplates')
const expressFileUpload = require('express-fileupload')
// const { unsubscribe } = require('./newAdmin')

sgMail.setApiKey(process.env.API_KEY)
sgClient.setApiKey(process.env.API_KEY)

// ---- spam protection helpers ----
// A name is "spammy" when it reads like a random consonant string
// (e.g. "Qkmxetvbpazszqxp"). Thresholds are deliberately loose so real
// consonant-heavy names (Schwartz, Kornbleuth, Schuraytz...) always pass;
// addEntry additionally requires BOTH the chosson and kallah name to fail
// before rejecting.
function looksLikeSpamName(s) {
  if (!s) return false
  const str = String(s).trim()
  const letters = str.replace(/[^a-zA-Z]/g, '')
  if (!letters) return false
  let score = 0
  const vowelRatio = (letters.match(/[aeiouAEIOU]/g) || []).length / letters.length
  if (vowelRatio < 0.2) score += 2
  else if (vowelRatio < 0.28) score += 1
  if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(letters)) score += 2
  else if (/[bcdfghjklmnpqrstvwxz]{4}/i.test(letters)) score += 1
  if (!str.includes(' ') && str.length > 14) score += 1
  return score >= 2
}

// in-memory rate limiter: max 3 submissions per rolling hour per IP
const submissionLog = new Map()
function isRateLimited(req) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'unknown'
  const now = Date.now()
  const hits = (submissionLog.get(ip) || []).filter(t => now - t < 60 * 60 * 1000)
  if (hits.length >= 3) return true
  hits.push(now)
  submissionLog.set(ip, hits)
  if (submissionLog.size > 5000) {  // don't grow unbounded
    for (const [k, v] of submissionLog) if (v.every(t => now - t > 60 * 60 * 1000)) submissionLog.delete(k)
  }
  return false
}
// ---- end spam protection helpers ----

// app.use(expressFileUpload())



// functions:
          
          // add contact function
          async function addContact(email, confNum) {
            const customFieldID = await getCustomFieldID('conf_num')
            console.log('CustomFieldID for Conf_num='+customFieldID);
            const data = {
              "contacts": [{
                "email": email,
                "custom_fields": {}
              }
            ]
            }
            data.contacts[0].custom_fields[customFieldID] = confNum
            const request = {
              url: `/v3/marketing/contacts`,
              method: 'PUT',
              body: data
            }
            return sgClient.request(request)
          }

          // get customFieldID function
          async function getCustomFieldID(customFieldName) {
            const request = {
              url: `/v3/marketing/field_definitions`,
              method: 'GET'
            }
            const response = await sgClient.request(request)
            const allCustomFields = response[1].custom_fields
            return allCustomFields.find(x => x.name === customFieldName).id
          }



          //upload page
          const uploadPage = {
            title: 'Upload Newsletter',
            subtitle: 'Upload a newsletter to send to your contacts',
            form: `<form action="/upload" id="contact-form" enctype="multipart/form-data" method="post" style="margin: 10%; margin-left:5%; width: 350px;">
            <div class="form-group">
                <label for="subject">Email Subject:</label>
                <input type="text" class="form-control" id="subject" name="subject" placeholder="Subject" required>
            </div>
            <div class="form-group">
                <label for="newsletter">Newsletter: </label>
                <input type="file" id="newsletter" name="newsletter" accept=".html" required>
            </div>
            <button type="submit" style="background:#0263e0 !important;" class="btn btn-primary">Send</button>
           </form>`
          }

          //send newsletter to list function
          async function sendNewsletterToList(req, htmlNewsletter, listID) {
            console.log("step 1")
            const data = {
              "query": `CONTAINS(list_ids, '${listID}')`
            }
            console.log("step 2: " + data)
            const request = {
              url: `/v3/marketing/contacts/search`,
              method: 'POST',
              body: data
          }
          console.log("step 3: " + request.toString())
          const response = await sgClient.request(request)
          console.log("step 4: " + response.toString())
          for (const subscriber of response[1].result) {
            const params = new URLSearchParams({
              conf_num: subscriber.custom_fields.conf_num,
              email: subscriber.email
            })
            console.log("step 5: " + params.toString())
            const unsubscribeURL = req.protocol + '://' + req.get('host') + '/delete/?' + params
            console.log("step 6: " + unsubscribeURL)
            const msg = {
              to: subscriber.email, // Change to your recipient
              from: "bridalshower@detroitbridalshower.org", // Change to your verified sender
              subject: 'newsletter',
              html: htmlNewsletter + `<a href="${unsubscribeURL}">Unsubscribe</a>`
            }
            console.log("step 7: " + msg.toString())
            var result=await sgMail.send(msg)
            console.log("sent: "+result.toString())
          }
          console.log("finished sending")
        }

        //get List ID function
      async function getListID(listName) {
        const request = {
          url: `/v3/marketing/lists`,
          method: 'GET'
        }
        const response = await sgClient.request(request)
        const allLists = response[1].result
        return allLists.find(x => x.name === listName).id
      }

      //add contact to newsletter function
      async function addContactToList(email, listID) {
        const data = {
          "list_ids": [listID],
          "contacts": [{
            "email": email
          }]
        }
        const request = {
          url: `/v3/marketing/contacts`,
          method: 'PUT',
          body: data
        }
        return sgClient.request(request)
      }

      //get contact by email function
      async function getContactByEmail(email) {
        const data = {
          "emails": [email]
        };
        const request = {
          url: `/v3/marketing/contacts/search/emails`,
          method: 'POST',
          body: data
        }
        const response = await sgClient.request(request);
        if(response[1].result[email]) return response[1].result[email].contact;
        else return null;
       }



module.exports = {

    
    getIndex : async (req, res) => {
        try {
            // res.render('index.ejs')
            
            // res.sendFile(__dirname + '/views/index.html')
            res.render('index.ejs')
            
        } catch (err) {
            if (err) return res.status(500).send(err)
        }
    },
    unsubscribe : async (req, res) => {
        try {
            res.render('unsubscribe.ejs')
        } catch (err) {
            if (err) return res.status(500).send(err)
        }
    },
    removeEmailFromList : async (req, res) => {
      try {
        //search the emailDB for the inputed email
        const email = req.body.email
        console.log(email)
        // const count = await Emails.countDocuments({})
        // console.log(count)
        const result = await Emails.findOneAndDelete({ email: email });

    if (result) {
      return res.render('message.ejs', {title: '', message: 'You have been unsubscribed from the mailing list.'})
    } else {
      return res.render('message.ejs', {title: 'Oops!', message: 'We could not find your email in our mailing list.'})
    }
      } catch (err) {
        if (err) return res.status(500).send(err)
      }
    },
    addEmail : async (req, res) => {

      //email validation  
      if(req.body.email === "") {
        return res.status(400).json({
          status : false,
          title : 'Oops!',
          message : 'Please enter a valid email.'
        })
      }
      const emailRegex = /\S+@\S+\.\S+/;
      if(!emailRegex.test(req.body.email.trim())) {
        return res.status(400).json({
          status : false,
          title : 'Oops!',
          message : 'Please enter a valid email.'
        })
      }
      // already subscribed? don't create duplicates or resend
      const existing = await Emails.findOne({ email: new RegExp('^' + req.body.email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') })
      if (existing) {
        return res.json({
          status : true,
          title : 'You are all set!',
          message : 'This email is already on our mailing list.'
        })
      }
      //////////////////////////////////////

        try {

          // send confirmation email with sendgrid
          const confNum = Math.floor(Math.random() * 90000) + 10000
          const params = new URLSearchParams({
            conf_num: confNum,
            email: req.body.email
          })
          const confirmationURL = process.env.AZURE_URL + '/confirm?' + params
          // const unsubscribeURL = req.protocol + '://' + req.get('host') + '/unsubscribe?' + params
          console.log('Confirmation URL = ' + confirmationURL);
          const msg = {
            to: req.body.email,
            from: 'bridalshower@detroitbridalshower.org',
            subject: 'Confirm your subscription to Detroit Bridal Shower',
            html: buildActionEmail(
        'Mailing List',
        'Confirm Your Subscription',
        'You are one click away from receiving updates on Detroit engagements and upcoming bridal showers.',
        'Confirm Subscription',
        confirmationURL,
        'If you did not request this, simply ignore this email.'
      )
          }
          // await addContact(req.body.email, confNum)
          await sgMail.send(msg)

         
          


          // res.render('message', {message: 'Thank you for signing up for our newsletter! Please complete the process by confirming the subscription in your email inbox.'})
        
          





          // send confirmation email with nodemailer
        //   async function sendNodemailer() {

        //     const transporter = nodemailer.createTransport({
        //         service: "hotmail",
        //         auth: {
        //             user: "lyftscooter@outlook.com",
        //             pass: "scooterLyft98"
        //         }
        //     })
            
        //     let recipient = req.body.email            
        
        //     const info = await transporter.sendMail({
        //         from: 'Detroit Bridal Shower <lyftscooter@outlook.com>',
        //         to: recipient,
        //         subject: 'Email Confirmation',
        //         html: ` <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
        //         <html data-editor-version="2" class="sg-campaigns" xmlns="http://www.w3.org/1999/xhtml">
        //             <head>
        //               <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        //               <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1">
        //               <!--[if !mso]><!-->
        //               <meta http-equiv="X-UA-Compatible" content="IE=Edge">
        //               <!--<![endif]-->
        //               <!--[if (gte mso 9)|(IE)]>
        //               <xml>
        //                 <o:OfficeDocumentSettings>
        //                   <o:AllowPNG/>
        //                   <o:PixelsPerInch>96</o:PixelsPerInch>
        //                 </o:OfficeDocumentSettings>
        //               </xml>
        //               <![endif]-->
        //               <!--[if (gte mso 9)|(IE)]>
        //           <style type="text/css">
        //             body {width: 600px;margin: 0 auto;}
        //             table {border-collapse: collapse;}
        //             table, td {mso-table-lspace: 0pt;mso-table-rspace: 0pt;}
        //             img {-ms-interpolation-mode: bicubic;}
        //           </style>
        //         <![endif]-->
        //               <style type="text/css">
        //             body, p, div {
        //               font-family: inherit;
        //               font-size: 14px;
        //             }
        //             body {
        //               color: #000000;
        //             }
        //             body a {
        //               color: #1188E6;
        //               text-decoration: none;
        //             }
        //             p { margin: 0; padding: 0; }
        //             table.wrapper {
        //               width:100% !important;
        //               table-layout: fixed;
        //               -webkit-font-smoothing: antialiased;
        //               -webkit-text-size-adjust: 100%;
        //               -moz-text-size-adjust: 100%;
        //               -ms-text-size-adjust: 100%;
        //             }
        //             img.max-width {
        //               max-width: 100% !important;
        //             }
        //             .column.of-2 {
        //               width: 50%;
        //             }
        //             .column.of-3 {
        //               width: 33.333%;
        //             }
        //             .column.of-4 {
        //               width: 25%;
        //             }
        //             ul ul ul ul  {
        //               list-style-type: disc !important;
        //             }
        //             ol ol {
        //               list-style-type: lower-roman !important;
        //             }
        //             ol ol ol {
        //               list-style-type: lower-latin !important;
        //             }
        //             ol ol ol ol {
        //               list-style-type: decimal !important;
        //             }
        //             @media screen and (max-width:480px) {
        //               .preheader .rightColumnContent,
        //               .footer .rightColumnContent {
        //                 text-align: left !important;
        //               }
        //               .preheader .rightColumnContent div,
        //               .preheader .rightColumnContent span,
        //               .footer .rightColumnContent div,
        //               .footer .rightColumnContent span {
        //                 text-align: left !important;
        //               }
        //               .preheader .rightColumnContent,
        //               .preheader .leftColumnContent {
        //                 font-size: 80% !important;
        //                 padding: 5px 0;
        //               }
        //               table.wrapper-mobile {
        //                 width: 100% !important;
        //                 table-layout: fixed;
        //               }
        //               img.max-width {
        //                 height: auto !important;
        //                 max-width: 100% !important;
        //               }
        //               a.bulletproof-button {
        //                 display: block !important;
        //                 width: auto !important;
        //                 font-size: 80%;
        //                 padding-left: 0 !important;
        //                 padding-right: 0 !important;
        //               }
        //               .columns {
        //                 width: 100% !important;
        //               }
        //               .column {
        //                 display: block !important;
        //                 width: 100% !important;
        //                 padding-left: 0 !important;
        //                 padding-right: 0 !important;
        //                 margin-left: 0 !important;
        //                 margin-right: 0 !important;
        //               }
        //               .social-icon-column {
        //                 display: inline-block !important;
        //               }
        //               .heading {
        //                   font-size: 30px !important;
        //             }
        //           </style>
        //               <!--user entered Head Start--><link href="https://fonts.googleapis.com/css?family=Muli&display=swap" rel="stylesheet"><style>
        //         body {font-family: 'Muli', sans-serif;}
        //         </style><!--End Head user entered-->
        //             </head>
        //             <body>
        //               <center class="wrapper" data-link-color="#1188E6" data-body-style="font-size:14px; font-family:inherit; color:#000000; background-color:#FFFFFF;">
        //                 <div class="webkit">
        //                   <table cellpadding="0" cellspacing="0" border="0" width="100%" class="wrapper" bgcolor="#FFFFFF">
        //                     <tr>
        //                       <td valign="top" bgcolor="#FFFFFF" width="100%">
        //                         <table width="100%" role="content-container" class="outer" align="center" cellpadding="0" cellspacing="0" border="0">
        //                           <tr>
        //                             <td width="100%">
        //                               <table width="100%" cellpadding="0" cellspacing="0" border="0">
        //                                 <tr>
        //                                   <td>
        //                                     <!--[if mso]>
        //             <center>
        //             <table><tr><td width="600">
        //           <![endif]-->
        //                                             <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px;" align="center">
        //                                               <tr>
        //                                                 <td role="modules-container" style="padding:0px 0px 0px 0px; color:#000000; text-align:left;" bgcolor="#FFFFFF" width="100%" align="left"><table class="module preheader preheader-hide" role="module" data-type="preheader" border="0" cellpadding="0" cellspacing="0" width="100%" style="display: none !important; mso-hide: all; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0;">
        //             <tr>
        //               <td role="module-content">
        //                 <p></p>
        //               </td>
        //             </tr>
        //           </table><table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:30px 20px 30px 20px;" bgcolor="#f6f6f6" data-distribution="1">
        //             <tbody>
        //               <tr role="module-content">
        //                 <td height="100%" valign="top"><table width="540" style="width:540px; border-spacing:0; border-collapse:collapse; margin:0px 10px 0px 10px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor="" class="column column-0">
        //               <tbody>
        //                 <tr>
        //                   <td style="padding:0px;margin:0px;border-spacing:0;"><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="72aac1ba-9036-4a77-b9d5-9a60d9b05cba">
        //             <tbody>
        //               <tr>
        //                 <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="center">
        //                   <!--<img class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px;" width="29" alt="" data-proportionally-constrained="true" data-responsive="false" src="http://cdn.mcauto-images-production.sendgrid.net/954c252fedab403f/9200c1c9-b1bd-47ed-993c-ee2950a0f239/29x27.png" height="27">-->
        //                 </td>
        //               </tr>
        //             </tbody>
        //           </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="331cde94-eb45-45dc-8852-b7dbeb9101d7">
        //             <tbody>
        //               <tr>
        //                 <td style="padding:0px 0px 20px 0px;" role="module-content" bgcolor="">
        //                 </td>
        //               </tr>
        //             </tbody>
        //           </table><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="d8508015-a2cb-488c-9877-d46adf313282">
        //             <tbody>
        //               <tr>
        //                 <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="center">
        //                   <!--<img class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px;" width="95" alt="" data-proportionally-constrained="true" data-responsive="false" src="http://cdn.mcauto-images-production.sendgrid.net/954c252fedab403f/61156dfa-7b7f-4020-85f8-a586addf4288/95x33.png" height="33">-->
        //                 </td>
        //               </tr>
        //             </tbody>
        //           </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="27716fe9-ee64-4a64-94f9-a4f28bc172a0">
        //             <tbody>
        //               <tr>
        //                 <td style="padding:0px 0px 30px 0px;" role="module-content" bgcolor="">
        //                 </td>
        //               </tr>
        //             </tbody>
        //           </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="948e3f3f-5214-4721-a90e-625a47b1c957" data-mc-module-version="2019-10-22">
        //             <tbody>
        //               <tr>
        //                 <td style="padding:50px 30px 18px 30px; line-height:36px; text-align:inherit; background-color:#ffffff;" height="100%" valign="top" bgcolor="#ffffff" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="font-size: 43px;" class="heading">Thank you for subscribing!</span></div><div></div></div></td>
        //               </tr>
        //             </tbody>
        //           </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="a10dcb57-ad22-4f4d-b765-1d427dfddb4e" data-mc-module-version="2019-10-22">
        //             <tbody>
        //               <tr>
        //                 <td style="padding:18px 30px 18px 30px; line-height:22px; text-align:inherit; background-color:#ffffff;" height="100%" valign="top" bgcolor="#ffffff" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="font-size: 18px">Please verify your email address to</span><span style="color: #000000; font-size: 18px; font-family: arial, helvetica, sans-serif"> get added to the mailing list</span><span style="font-size: 18px">.</span></div><br>
        //         <div style="font-family: inherit; text-align: center"><span style="color: darkblue; font-size: 18px"><strong>Thank you!</strong></span></div><div></div></div></td>
        //               </tr>
        //             </tbody>
        //           </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="7770fdab-634a-4f62-a277-1c66b2646d8d">
        //             <tbody>
        //               <tr>
        //                 <td style="padding:0px 0px 20px 0px;" role="module-content" bgcolor="#ffffff">
        //                 </td>
        //               </tr>
        //             </tbody>
        //           </table><table border="0" cellpadding="0" cellspacing="0" class="module" data-role="module-button" data-type="button" role="module" style="table-layout:fixed;" width="100%" data-muid="d050540f-4672-4f31-80d9-b395dc08abe1">
        //               <tbody>
        //                 <tr>
        //                   <td align="center" bgcolor="#ffffff" class="outer-td" style="padding:0px 0px 0px 0px; background-color:#ffffff;">
        //                     <table border="0" cellpadding="0" cellspacing="0" class="wrapper-mobile" style="text-align:center;">
        //                       <tbody>
        //                         <tr>
        //                         <td align="center" class="inner-td" style="border-radius:6px; font-size:16px; text-align:center; background-color;">
        //                           <a href="" style="background-color:lightblue !important; border: transparent !important; border-radius:5px; border-width:1px; color:#000000; display:inline-block; font-size:14px; font-weight:normal; letter-spacing:0px; line-height:normal; padding:12px 40px 12px 40px; text-align:center; text-decoration:none; border-style:solid; font-family:inherit;" target="_blank">Verify Email Now</a><br><br><br>
        //                         </td>
        //                         </tr>
        //                       </tbody>
        //                     </table>
        //                   </td>
        //                 </tr>
        //               </tbody>
        //             </table>
        //               <tbody>
        //                 <tr>
        //                   <td align="center" bgcolor="" class="outer-td" style="padding:0px 0px 20px 0px;">
        //                     <table border="0" cellpadding="0" cellspacing="0" class="wrapper-mobile" style="text-align:center;">
        //                       <tbody>
        //                         <tr>
        //                         <!--</tr>-->
        //                       </tbody>
        //                     </table>
        //                   </td>
        //                 </tr>
        //               </tbody>
        //             </table></td>
        //                                               </tr>
        //                                             </table>
        //                                             <!--[if mso]>
        //                                           </td>
        //                                         </tr>
        //                                       </table>
        //                                     </center>
        //                                     <![endif]-->
        //                                   </td>
        //                                 </tr>
        //                               </table>
        //                             </td>
        //                           </tr>
        //                         </table>
        //                       </td>
        //                     </tr>
        //                   </table>
        //                 </div>
        //               </center>
        //             </body>
        //           </html>
        //         `
        //     })
        // }
        // sendNodemailer()



        //   const newEmail = new Email(
        //     {
        //         email: req.body.email
        //     }
        // )
        //     await newEmail.save()

            return res.json({
              status : true,
              title : 'Thank You!',
              message : 'You have been sent a confirmation email. Verify your email to be added to our mailing list.'
            })
        } catch (err) {
            if (err) return res.status(500).send(err)
            res.redirect("/")
        }
    },
    confirmEmail : async (req, res) => {

      try {
        // const contact = await getContactByEmail(req.query.email);
        // if(contact == null) throw `Contact not found.`;
        // if (contact.custom_fields.conf_num ==  req.query.conf_num) {
        //   const listID = await getListID('Newsletter Subscribers');
        //   await addContactToList(req.query.email, listID);
        // } else {
        //   throw 'Confirmation number does not match';
        // }
        const newEmail = new Emails(
          {
              email: req.query.email
          }
        )
            await newEmail.save()
        res.render('message.ejs', { title: 'Thank you!', message: 'You are now subscribed to our newsletter. We can\'t wait for you to hear from us!' });
      } catch (error) {
        console.error(error);
        const url = process.env.AZURE_URL
        res.render('message.ejs', { title: 'Thank you!', message: `Subscription was unsuccessful. Please <a href="${url}">try again.</a>` });
      }
    },
    // unsubscribeEmail : async (req, res) => {
    //   //functions:
    //   //get contact by email function
    //   async function getContactByEmail(email) {
    //     const data = {
    //       "emails": [email]
    //     };
    //     const request = {
    //       url: `/v3/marketing/contacts/search/emails`,
    //       method: 'POST',
    //       body: data
    //     }
    //     const response = await sgClient.request(request);
    //     if(response[1].result[email]) return response[1].result[email].contact;
    //     else return null;
    //    }
    //    //get List ID function
    //   async function getListID(listName) {
    //     const request = {
    //       url: `/v3/marketing/lists`,
    //       method: 'GET'
    //     }
    //     const response = await sgClient.request(request)
    //     const allLists = response[1].result
    //     return allLists.find(x => x.name === listName).id
    //   }
    //   //delete contact from list function
    //   async function deleteContactFromList(listID, contact) {
    //     const request = {
    //       url: `/v3/marketing/lists/${listID}/contacts`,
    //       method: 'DELETE',
    //       qs: {
    //         "contact_ids": contact.id
    //       }
    //     }
    //     await sgClient.request(request);
    //    }

    //   try {
    //     const contact = await getContactByEmail(req.query.email);
    //     if(contact == null) throw `Contact not found.`;
    //     if (contact.custom_fields.conf_num ==  req.query.conf_num) {
    //       const listID = await getListID('Newsletter Subscribers');
    //       await deleteContactFromList(listID, contact);
    //       res.render('message', { message: 'You have been successfully unsubscribed. If this was a mistake re-subscribe <a href="/signup">here</a>.' });
    //     }
    //   else throw 'Confirmation number does not match or contact is not subscribed'
    //   }
    //   catch(error) {
    //     console.error(error)
    //     res.render('message', { message: 'Email could not be unsubscribed. please try again.' })
    //   }
    // },
    addEntry : async (req, res) => {


      //backend validation (front end validation is in the form)
        if(req.body.name === "" || req.body.phoneNumber === "" || req.body.email === "" || req.body.address === "" || req.body.chossonName === "" || req.body.chossonOrigin === "" || req.body.kallahName === "" || req.body.kallahOrigin === "") {
          return res.json({
            status : false,
            title : 'Oops!',
            message: 'You have missing fields. Please fill out the required fields.'
          })
        }

        // ---- spam protection ----
        // 1. honeypot: hidden field humans never fill; answer with a fake
        //    success so bots don't learn they were caught
        if (req.body.website) {
          console.log('spam blocked (honeypot):', req.body.email)
          return res.json({ status: true, title: 'Thank You!', message: 'You have been sent an email for confirmation. Please open your email and confirm the submission.' })
        }
        // 2. timing token: set by the page at load; direct bot POSTs lack it,
        //    automated fills submit faster than any human can type
        const loadedAt = parseInt(req.body.formToken, 10)
        if (!loadedAt || Date.now() - loadedAt < 5000 || Date.now() - loadedAt > 24*60*60*1000) {
          console.log('spam blocked (timing):', req.body.email)
          return res.json({ status: true, title: 'Thank You!', message: 'You have been sent an email for confirmation. Please open your email and confirm the submission.' })
        }
        // 3. gibberish names (random consonant strings)
        if (looksLikeSpamName(req.body.chossonName) && looksLikeSpamName(req.body.kallahName)) {
          console.log('spam blocked (gibberish):', req.body.chossonName, req.body.kallahName)
          return res.json({ status: false, title: 'Oops!', message: 'Please double-check the names you entered.' })
        }
        if (!/^\S+@\S+\.\S+$/.test(req.body.email)) {
          return res.json({ status: false, title: 'Oops!', message: 'Please enter a valid email address.' })
        }
        // 4. rate limit per IP: max 3 submissions per hour
        if (isRateLimited(req)) {
          console.log('spam blocked (rate limit):', req.ip)
          return res.json({ status: false, title: 'Slow down!', message: 'Too many submissions from your network. Please try again later.' })
        }
        // ---- end spam protection ----

      
    try {

        //generate confirmation number
      const confNum = Math.floor(Math.random() * 90000) + 10000
      
        // res.redirect("/")

        function toUpper(str) {
          if (typeof str === 'string') {
            str = str.trim().toLowerCase();
            const words = str.split(' ');
        
            const capitalizedWords = words.map(function(word) {
              return word.charAt(0).toUpperCase() + word.slice(1);
            });
        
            return capitalizedWords.join(' ');
          }
        
          return str; // Return the input if it's not a string
        }
                // send confirmation email with sendgrid

        console.log(req.body.chossonMotherName)

        //capitalize the first letter of the user inputs
        let name = toUpper(req.body.name)
        let chossonName = toUpper(req.body.chossonName)
        let kallahName = toUpper(req.body.kallahName)
        // let chossonFatherTitle = ""
        // let chossonMotherTitle = ""
        // let kallahFatherTitle = ""
        // let kallahMotherTitle = ""
        let chossonFatherName = ""
        let chossonMotherName = ""
        let chossonMotherDivorcedName = ""
        let chossonMotherHusbandName = ""
        let kallahFatherName = ""
        let kallahMotherName = ""
        let kallahMotherDivorcedName = ""
        let kallahMotherHusbandName = ""


    
        // console.log(req.body)
        
        // console.log(req.body.kallahMotherName) // show lowercase mother name
        // console.log(toUpper(req.body.kallahMotherName)) // uppercase mother name

        kallahMotherName = req.body.kallahMotherName // 
        // console.log(toUpper(kallahMotherName)) // uppercase mother name












        // ************************************************
        // this is needed, but causing issues for some reason

        //front end required this field to be filled, so we dont need to check if the user filled it out
        chossonFatherName = toUpper(req.body.chossonFatherName)
        kallahFatherName = toUpper(req.body.kallahFatherName)

        console.log("uppercase father's names")

        ///additional parents (optional fields) 
        //might be optional, might not be. Therefore, we need to check if the user filled out
        if(req.body.chossonMotherName !== "") {
          chossonMotherName = toUpper(req.body.chossonMotherName)
        }
        console.log("uppercase chosson mother name")
        console.log(chossonMotherName)
        if(req.body.kallahMotherName !== "") {
          kallahMotherName = toUpper(req.body.kallahMotherName)
        }
        console.log("uppercase kallah mother name")

        if(req.body.chossonMotherDivorcedName !== "") {
          chossonMotherDivorcedName = toUpper(req.body.chossonMotherDivorcedName)
        }
        console.log("uppercase chosson mother divorced name")
        if(req.body.kallahMotherDivorcedName !== "") {
          kallahMotherDivorcedName = toUpper(req.body.kallahMotherDivorcedName)
        }
        console.log("uppercase kallah mother divorced name")

        if(req.body.chossonMotherHusbandName !== "") {
          chossonMotherHusbandName = toUpper(req.body.chossonMotherHusbandName)
        }
        console.log("uppercase chosson mother husband name")
        if(req.body.kallahMotherHusbandName !== "") {
          kallahMotherHusbandName = toUpper(req.body.kallahMotherHusbandName)
        }
        console.log("uppercase kallah mother husband name")
        // *********************************************************

        // if(req.body.chossonMotherTitle !== "Title" && req.body.chossonMotherTitle !== "") {
        //   chossonMotherTitle = req.body.chossonMotherTitle
        // }
        // if(req.body.kallahMotherTitle !== "Title" && req.body.kallahMotherTitle !== "") {
        //   kallahMotherTitle = req.body.kallahMotherTitle
        // }

        // if(req.body.addParentChossonMotherTitle !== "Title") {
        //   addParentChossonMotherTitle = req.body.addParentChossonMotherTitle
        // }
        // if(req.body.addParentKallahFatherTitle !== "Title") {
        //   addParentKallahFatherTitle = req.body.addParentKallahFatherTitle
        // }
        // if(req.body.addParentKallahMotherTitle !== "Title") {
        //   addParentKallahMotherTitle = req.body.addParentKallahMotherTitle
        // }

        // //additional parents (optional fields)
        // if(req.body.addParentChossonFatherName !== "") {
        //   addParentChossonFatherName = toUpper(req.body.addParentChossonFatherName)
        // }
        // if(req.body.addParentChossonMotherName !== "") {
        //   addParentChossonMotherName = toUpper(req.body.addParentChossonMotherName)
        // }
        // if(req.body.addParentKallahFatherName !== "") {
        //   addParentKallahFatherName = toUpper(req.body.addParentKallahFatherName)
        // }
        // if(req.body.addParentKallahMotherName !== "") {
        //   addParentKallahMotherName = toUpper(req.body.addParentKallahMotherName)
        // }
        
console.log("after uppercasing, before params")
        
        const params = new URLSearchParams({
          name: name,
          email: req.body.email,
          phoneNumber: req.body.phoneNumber,
          address: req.body.address,
          chossonName: chossonName,
          chossonFatherTitle: req.body.chossonFatherTitle,
          chossonFatherName: chossonFatherName,
          chossonMotherTitle: req.body.chossonMotherTitle,
          chossonMotherName: chossonMotherName,
          chossonOrigin: req.body.chossonOrigin,
          kallahName: kallahName,
          kallahFatherTitle: req.body.kallahFatherTitle,
          kallahFatherName: kallahFatherName,
          kallahMotherTitle: req.body.kallahMotherTitle,
          kallahMotherName: kallahMotherName,
          kallahOrigin: req.body.kallahOrigin,
          weddingDate: req.body.weddingDate,
          personalShopper: req.body.personalShopper,

          //additional parents
          chossonMotherDivorcedTitle: req.body.chossonMotherDivorcedTitle,
          chossonMotherDivorcedName: toUpper(req.body.chossonMotherDivorcedName),
          chossonMotherHusbandTitle: req.body.chossonMotherHusbandTitle,
          chossonMotherHusbandName: toUpper(req.body.chossonMotherHusbandName),
          kallahMotherDivorcedTitle: req.body.kallahMotherDivorcedTitle,
          kallahMotherDivorcedName: toUpper(req.body.kallahMotherDivorcedName),
          kallahMotherHusbandTitle: req.body.kallahMotherHusbandTitle,
          kallahMotherHusbandName: toUpper(req.body.kallahMotherHusbandName),

          //chesed package
          toaster: req.body.toaster,
          urn: req.body.urn,
          kitchenTowels: req.body.kitchenTowels,
          vacuum: req.body.vacuum,
          cholentPot: req.body.cholentPot,

          //deceased parents
          chossonDeceased: req.body.chossonDeceased,
          kallahDeceased: req.body.kallahDeceased,

          // chesedPackage: req.body.chesedPackage,
          confNum: confNum
        })
        console.log(params)
        // const confirmationURL = req.protocol + '://' + req.get('host') + '/confirmEntry?' + params
        // console.log("after confirmationURL")

        const confirmationURL = process.env.AZURE_URL + '/confirmEntry?' + params


        
        let chesedPackage = "  "
                        if(req.body.toaster === true) {
                          chesedPackage += "Toaster, "
                        }
                        if(req.body.urn === true) {
                          chesedPackage += "Urn, "
                        }
                        if(req.body.kitchenTowels === true) {
                          chesedPackage += "Kitchen towels, "
                        }
                        if(req.body.vacuum === true) {
                          chesedPackage += "Vacuum, "
                        }
                        if(req.body.cholentPot === true) {
                          chesedPackage += "Cholent pot, "
                        }

                        //remove last comma
                        chesedPackage = chesedPackage.slice(0, -2)
                        console.log(chesedPackage)

                        console.log('chesedPackage: ', chesedPackage)

                        


                        //set parent name variables that were filled out
                        let chossonFather = ""
                        let chossonMotherField1 = ""
                        let chossonMotherField2 = ""
                        let chossonMotherHusband = ""

                        let kallahFather = ""
                        let kallahMotherField1 = ""
                        let kallahMotherField2 = ""
                        let kallahMotherHusband = ""

                        //Fathers are easy since those fields are required no matter what
                        chossonFather = req.body.chossonFatherTitle + " " + req.body.chossonFatherName
                        kallahFather = req.body.kallahFatherTitle + " " + req.body.kallahFatherName

                        //Mothers husband is also easy since that optional no matter what
                        if(req.body.chossonMotherHusbandName !== "") {
                          chossonMotherHusband = req.body.chossonMotherHusbandTitle + " " + req.body.chossonMotherHusbandName
                        }
                        if(req.body.kallahMotherHusbandName !== "") {
                          kallahMotherHusband = req.body.kallahMotherHusbandTitle + " " + req.body.kallahMotherHusbandName
                        }

                        //deal with mother/husband wife
                        if(req.body.chossonMotherDivorcedName !== "") {
                          //if the mother is divorced, then motherfield2 is required
                          chossonMotherField2 = req.body.chossonMotherDivorcedTitle + " " + req.body.chossonMotherDivorcedName
                          //if the mother is divorced, then motherfield1 is not required
                          if(req.body.chossonMotherName !== "") {
                            chossonMotherField1 = req.body.chossonMotherTitle + " " + req.body.chossonMotherName
                          }
                        } else {
                          //if the mother is not divorced, then motherfield1 is required
                          chossonMotherField1 = req.body.chossonMotherTitle + " " + req.body.chossonMotherName
                        }

                        if(req.body.kallahMotherDivorcedName !== "") {
                          //if the mother is divorced, then motherfield2 is required
                          kallahMotherField2 = req.body.kallahMotherDivorcedTitle + " " + req.body.kallahMotherDivorcedName
                          //if the mother is divorced, then motherfield1 is not required
                          if(req.body.kallahMotherName !== "") {
                            kallahMotherField1 = req.body.kallahMotherTitle + " " + req.body.kallahMotherName
                          }
                        } else {
                          //if the mother is not divorced, then motherfield1 is required
                          kallahMotherField1 = req.body.kallahMotherTitle + " " + req.body.kallahMotherName
                        }
                        



                        //deal with regular parents variables
                        // let chossonFather = ""
                        // let chossonMother = ""
                        // let kallahFather = ""
                        // let kallahMother = ""

                //         if(req.body.chossonFatherName !== "") {
                //           if(req.body.chossonFatherTitle === "Title" || req.body.chossonFatherTitle === "") {
                //             chossonFather = "Mr." + " " + req.body.chossonFatherName
                //           } else {
                //           chossonFather = req.body.chossonFatherTitle + " " + req.body.chossonFatherName
                //         }
                //       }
                //       if(req.body.chossonMotherName !== "") {
                //         if(req.body.chossonMotherTitle === "Title" || req.body.chossonMotherTitle === "") {
                //           chossonMother = "Mrs." + " " + req.body.chossonMotherName
                //         } else {
                //         chossonMother = req.body.chossonMotherTitle + " " + req.body.chossonMotherName
                //       }
                //     }
                //     if(req.body.kallahFatherName !== "") {
                //       if(req.body.kallahFatherTitle === "Title" || req.body.kallahFatherTitle === "") {
                //         kallahFather = "Mr." + " " + req.body.kallahFatherName
                //       } else {
                //       kallahFather = req.body.kallahFatherTitle + " " + req.body.kallahFatherName
                //     }
                //   }
                //   if(req.body.kallahMotherName !== "") {
                //     if(req.body.kallahMotherTitle === "Title" || req.body.kallahMotherTitle === "") {
                //       kallahMother = "Mrs." + " " + req.body.kallahMotherName
                //     } else {
                //     kallahMother = req.body.kallahMotherTitle + " " + req.body.kallahMotherName
                //   }
                // }

                        //deal with additional parents variables
                //         let addChossonFather = ""
                //         let addChossonMother = ""
                //         let addKallahFather = ""
                //         let addKallahMother = ""

                //         if(req.body.addParentChossonFatherName !== "") {
                //           if(req.body.addParentChossonFatherTitle === "Title" || req.body.addParentChossonFatherTitle === "") {
                //             addChossonFather = "Mr." + " " + req.body.addParentChossonFatherName
                //           } else {
                //           addChossonFather = req.body.addParentChossonFatherTitle + " " + req.body.addParentChossonFatherName
                //         }
                //       }
                //       if(req.body.addParentChossonMotherName !== "") {
                //         if(req.body.addParentChossonMotherTitle === "Title" || req.body.addParentChossonMotherTitle === "") {
                //           addChossonMother = "Mrs." + " " + req.body.addParentChossonMotherName
                //         } else {
                //         addChossonMother = req.body.addParentChossonMotherTitle + " " + req.body.addParentChossonMotherName
                //       }
                //     }
                //     if(req.body.addParentKallahFatherName !== "") {
                //       if(req.body.addParentKallahFatherTitle === "Title" || req.body.addParentKallahFatherTitle === "") {
                //         addKallahFather = "Mr." + " " + req.body.addParentKallahFatherName
                //       } else {
                //       addKallahFather = req.body.addParentKallahFatherTitle + " " + req.body.addParentKallahFatherName
                //     }
                //   }
                //   if(req.body.addParentKallahMotherName !== "") {
                //     if(req.body.addParentKallahMotherTitle === "Title" || req.body.addParentKallahMotherTitle === "") {
                //       addKallahMother = "Mrs." + " " + req.body.addParentKallahMotherName
                //     } else {
                //     addKallahMother = req.body.addParentKallahMotherTitle + " " + req.body.addParentKallahMotherName
                //   }
                // }

                        console.log(chossonMotherField1)
                        console.log(chossonMotherField2)

                let chossonDads = ""
                let kallahDads = ""
                let chossonMoms = ""
                let kallahMoms = ""

                if(chossonMotherHusband !== "") {
                  chossonDads = chossonFather + " and " + chossonMotherHusband
                } else {
                  chossonDads = chossonFather
                }
                if(kallahMotherHusband !== "") {
                  kallahDads = kallahFather + " and " + kallahMotherHusband
                } else {
                  kallahDads = kallahFather
                }
                if(chossonMotherField1 !== "" && chossonMotherField2 !== "") {
                  chossonMoms = chossonMotherField2 + " and " + chossonMotherField1
                } else if(chossonMotherField1 !== "" && chossonMotherField2 === "") {
                  chossonMoms = chossonMotherField1
                } else if(chossonMotherField1 === "" && chossonMotherField2 !== "") {
                  chossonMoms = chossonMotherField2
                }
                if(kallahMotherField1 !== "" && kallahMotherField2 !== "") {
                  kallahMoms = kallahMotherField2 + " and " + kallahMotherField1
                } else if(kallahMotherField1 !== "" && kallahMotherField2 === "") {
                  kallahMoms = kallahMotherField1
                }
                else if(kallahMotherField1 === "" && kallahMotherField2 !== "") {
                  kallahMoms = kallahMotherField2
                }

                console.log(chossonMoms)
              
                  

        const msg = {
          to: req.body.email,
          from: 'bridalshower@detroitbridalshower.org',
          subject: 'Confirm your subscription to Detroit Bridal Shower',
          html: buildActionEmail(
        'One More Step',
        `${chossonName} & ${kallahName}`,
        `Mazel tov, ${name}! Thank you for adding this couple to the Detroit Bridal Shower list.<br/>Please confirm your submission below &mdash; once confirmed, it will be reviewed and shared with the community.`,
        'Confirm Submission',
        confirmationURL,
        'If you did not submit this couple, you can simply ignore this email.'
      )
        }
        
        
        await sgMail.send(msg)

        const text = {
          to: '2485147963@vtext.com',
          from: 'bridalshower@detroitbridalshower.org',
          subject: 'New Couple Submission',
          html: `${req.body.name} has submitted a new couple.`
        }

        await sgMail.send(text)


        console.log('email sent')

        //save to database
        const newCouple = new Couples(
          {
            //dont think we need seprate title and name documents, should combine them
              // chossonName: chossonName,
              // chossonFatherTitle: req.body.chossonFatherTitle,
              // chossonFather: chossonFatherName,
              // chossonMotherTitle: req.body.chossonMotherTitle,
              // chossonMother: chossonMotherName,
              // chossonOrigin: req.body.chossonOrigin,
              // kallahName: kallahName,
              // kallahFatherTitle: req.body.kallahFatherTitle,
              // kallahFather: kallahFatherName,
              // kallahMotherTitle: req.body.kallahMotherTitle,
              // kallahMother: kallahMotherName,
              // kallahOrigin: req.body.kallahOrigin,
              // name: name,
              // email: req.body.email,
              // phoneNumber: req.body.phoneNumber,
              // address: req.body.address,
              // weddingDate: req.body.weddingDate,
              // personalShopper: req.body.personalShopper,

              //just update the req.body's to the trimmed vars
              chossonName: chossonName,
              chossonFatherTitle: req.body.chossonFatherTitle,
              chossonFatherName: chossonFatherName,
              chossonMotherTitle: req.body.chossonMotherTitle,
              chossonMotherName: chossonMotherName,
              chossonOrigin: req.body.chossonOrigin,
              kallahName: kallahName,
              kallahFatherTitle: req.body.kallahFatherTitle,
              kallahFatherName: kallahFatherName,
              kallahMotherTitle: req.body.kallahMotherTitle,
              kallahMotherName: kallahMotherName,
              kallahOrigin: req.body.kallahOrigin,
              chossonMotherDivorcedTitle: req.body.chossonMotherDivorcedTitle,
              chossonMotherDivorcedName: chossonMotherDivorcedName,
              kallahMotherDivorcedTitle: req.body.kallahMotherDivorcedTitle,
              kallahMotherDivorcedName: kallahMotherDivorcedName,
              chossonMotherHusbandTitle: req.body.chossonMotherHusbandTitle,
              chossonMotherHusbandName: chossonMotherHusbandName,
              kallahMotherHusbandTitle: req.body.kallahMotherHusbandTitle,
              kallahMotherHusbandName: kallahMotherHusbandName,

              name: name,
              email: req.body.email,
              phoneNumber: req.body.phoneNumber,
              address: req.body.address,
              weddingDate: req.body.weddingDate,
              personalShopper: req.body.personalShopper,
              chesedPackage: chesedPackage,

              chossonDeceased: req.body.chossonDeceased,
              kallahDeceased: req.body.kallahDeceased,


              // chossonFather: chossonFather,
              // chossonMotherField1: chossonMotherField1,
              // chossonMotherField2: chossonMotherField2,
              // chossonMotherHusband: chossonMotherHusband,
              
              
              // kallahFather: kallahFather,
              // kallahMotherField1: kallahMotherField1,
              // kallahMotherField2: kallahMotherField2,
              // kallahMotherHusband: kallahMotherHusband,
              // kallahOrigin: req.body.kallahOrigin,
              
              
              confNumber : confNum
          }
      )
          console.log(newCouple)
          await newCouple.save()
          console.log(req.body)


        return res.json({
          status : true,
          title : 'Thank You!',
          message: 'You have been sent an email for confirmation. Please open your email and confirm the submission.'
        })

        // const databaseCouples = await Couples.find().sort({_id: -1})


        //new couple 
        // let newCoupleString = ""

        // let chossonFatherFNameNew = req.body.chossonFatherName.split(" ").slice(0, -1).join(" ")
        // let kallahFatherFNameNew = req.body.kallahFatherName.split(" ").slice(0, -1).join(" ")

        // if(req.body.chossonOrigin === 'detroit' && req.body.kallahOrigin === 'detroit') {
        //     newCoupleString += `<strong>${req.body.chossonName}</strong> is engaged to <strong>${req.body.kallahName}</strong> <br> son of ${req.body.chossonFatherTitle} & ${req.body.chossonMotherTitle} ${chossonFatherFNameNew} and ${req.body.chossonMotherName} <br> and daughter of ${req.body.kallahFatherTitle} & ${req.body.kallahMotherTitle} ${kallahFatherFNameNew} and ${req.body.kallahMotherName} <br> <br>`
        // }
        // else if(req.body.chossonOrigin === 'detroit') {
        //     newCoupleString += `<strong>${req.body.chossonName}</strong> is engaged to ${req.body.kallahName} <br> son of ${req.body.chossonFatherTitle} & ${req.body.chossonMotherTitle} ${chossonFatherFNameNew} and ${req.body.chossonMotherName} <br> <br>`
        // }
        // else {
        //     newCoupleString += `<strong>${req.body.kallahName}</strong> is engaged to ${req.body.chossonName} <br> daughter of ${req.body.kallahFatherTitle} & ${req.body.kallahMotherTitle} ${kallahFatherFNameNew} and ${req.body.kallahMotherName} <br> <br>`
        // }

        //couples still collecting for
        // let couplesString = ""


        // for(let i = 1; i < databaseCouples.length; i++) {

        //   if (databaseCouples[i].collecting === true) {


        //     let chossonFatherFName = databaseCouples[i].chossonFather.split(" ").slice(0, -1).join(" ")
        //     let kallahFatherFName = databaseCouples[i].kallahFather.split(" ").slice(0, -1).join(" ")

        //     if(databaseCouples[i].chossonOrigin === '1' && databaseCouples[i].kallahOrigin === '1') {
        //         couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong> <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} and ${databaseCouples[i].chossonMother} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} and ${databaseCouples[i].kallahMother} <br> <br>`
        //       }
        //     else if(databaseCouples[i].chossonOrigin === '1') {
        //         couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to ${databaseCouples[i].kallahName} <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} and ${databaseCouples[i].chossonMother} <br> <br>`
        //       }
        //     else {
        //         couplesString += `<strong>${databaseCouples[i].kallahName}</strong> is engaged to ${databaseCouples[i].chossonName} <br> daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} and ${databaseCouples[i].kallahMother} <br> <br>`
        //       }
        //   }
        // }

                    //nodemailer

                    // let chossonHometown = ""
                    // let kallahHometown = ""

                    // if(req.body.chossonOrigin === '1') {
                    //     chossonHometown = "Detroit"
                    // }
                    // else {
                    //     chossonHometown = "Out of town"
                    // }
                    // if(req.body.kallahorigin === '1') {
                    //     kallahHometown = "Detroit"
                    // } {
                    //     kallahHometown = "Out of town"
                    // }

                    // async function sendNodemailer() {

                    //     const transporter = nodemailer.createTransport({
                    //         service: "hotmail",
                    //         auth: {
                    //             user: "lyftscooter@outlook.com",
                    //             pass: "scooterLyft98"
                    //         }
                    //     })

                    //     let chesedPackage = " "
                    //     if(req.body.toaster === 'Toaster') {
                    //       chesedPackage += `${req.body.toaster}, `
                    //     }
                    //     if(req.body.urn === 'Urn') {
                    //       chesedPackage += `${req.body.urn}, `
                    //     }
                    //     if(req.body.kitchenTowels === 'Kitchen towels') {
                    //       chesedPackage += `${req.body.kitchenTowels}, `
                    //     }
                    //     if(req.body.vacuum === 'Vacuum') {
                    //       chesedPackage += `${req.body.vacuum}, `
                    //     }
                    //     if(req.body.cholentPot === 'Cholent pot') {
                    //       chesedPackage += `${req.body.cholentPot}`
                    //     }
                    
                    //     const info = await transporter.sendMail({
                    //         from: 'Detroit Bridal Shower Update <lyftscooter@outlook.com>',
                    //         to: 'afriedman@woodmontcollege.edu',
                    //         subject: 'New Couple Submission',
                    //         html: ` <p>
                    //                 <strong>Chosson:</strong> ${req.body.chossonName} <br>
                    //                 <strong>Chosson's Father:</strong> ${req.body.chossonFatherTitle} ${req.body.chossonFatherName} <br>
                    //                 <strong>Chosson's Mother:</strong> ${req.body.chossonMotherTitle} ${req.body.chossonMotherName} <br>
                    //                 <strong>Chosson's hometown:</strong> ${chossonHometown} <br><br>
                    //                 <strong>Kallah:</strong> ${req.body.kallahName} <br>
                    //                 <strong>Kallah's Father:</strong> ${req.body.kallahFatherTitle} ${req.body.kallahFatherName} <br>
                    //                 <strong>Kallah's Mother:</strong> ${req.body.kallahMotherTitle} ${req.body.kallahMotherName} <br>
                    //                 <strong>Kallah's hometown:</strong> ${kallahHometown} <br><br>
                    //                 <strong>Address:</strong> ${req.body.address} <br>
                    //                 <strong>Email:</strong> ${req.body.email} <br>
                    //                 <strong>Wedding Date:</strong> ${req.body.weddingDate} <br>
                    //                 <strong>Personal Shopper:</strong> ${req.body.personalShopper}<br>
                    //                 <strong>Detroit Chesed Package:</strong>
                    //                 ${chesedPackage}
                    //                 </p>
                    //         `
                    //         // ,
                    //         // attachements: [{
                    //         //     filename: 'bridalshowerpic.png',
                    //         //     filePath: __dirname + './public/assets/images/bridalshowerpic.png',
                    //         //     cid: 'logo'
                    //         // }]
                    //     })
                    // }
        
        
                    // sendNodemailer()


            // databaseCouples.forEach(couples => {

            //     let chossonFatherFName = couples.chossonFather.split(" ").slice(0, -1).join(" ")
            //     let kallahFatherFName = couples.kallahFather.split(" ").slice(0, -1).join(" ")
                

            //   if(couples.chossonOrigin === '1' && couples.kallahOrigin === '1') {
            //     couplesString += `<strong>${couples.chossonName}</strong> is engaged to <strong>${couples.kallahName}</strong> <br> son of ${couples.chossonFatherTitle} & ${couples.chossonMotherTitle} ${chossonFatherFName} and ${couples.chossonMother} <br> and daughter of ${couples.kallahFatherTitle} & ${couples.kallahMotherTitle} ${kallahFatherFName} and ${couples.kallahMother} <br> <br>`
            //   }
            //   else if(couples.chossonOrigin === '1') {
            //     couplesString += `<strong>${couples.chossonName}</strong> is engaged to ${couples.kallahName} <br> son of ${couples.chossonFatherTitle} & ${couples.chossonMotherTitle} ${chossonFatherFName} and ${couples.chossonMother} <br> <br>`
            //   }
            //   else {
            //     couplesString += `<strong>${couples.kallahName}</strong> is engaged to ${couples.chossonName} <br> daughter of ${couples.kallahFatherTitle} & ${couples.kallahMotherTitle} ${kallahFatherFName} and ${couples.kallahMother} <br> <br>`
            //   }
            // })
            
            // const emailDB = await Email.find()

            // const message2 = {
            //     to: 'aronfriedman98@gmail.com',
            //     from: {
            //         name: 'Detroit Bridal Shower',
            //         email: 'lyftscooter@outlook.com',
            //         subject: 'New couple added to the database',
            //         html: ` <h2>
            //                Chosson: ${req.body.chossonName} <br>
            //                Chosson's Father: ${req.body.chossonFatherTitle} ${req.body.chossonFatherName} <br>
            //                chosson's Mother: ${req.body.chossonMotherTitle} ${req.body.chossonMotherName} <br>
            //                chosson's Origin: ${req.body.chossonOrigin} <br>
            //                kallah: ${req.body.kallahName} <br>
            //                kallah's Father: ${req.body.kallahFatherTitle} ${req.body.kallahFatherName} <br>
            //                kallah's Mother: ${req.body.kallahMotherTitle} ${req.body.kallahMotherName} <br>
            //                Kallah's Origin: ${req.body.kallahOrigin} <br>
            //                Address: ${req.body.address} <br>
            //                Email: ${req.body.email} <br>
            //                Wedding Date: ${req.body.weddingDate} <br>
            //                Personal Shopper: ${req.body.personalShopper}<br>
            //                Detroit Chesed Package: <br>
            //                </h2>`
            //     }
            // }
//             const message = {
//                 to: 'aronfriedman98@gmail.com',
//                 // to: emailDB,
//                 // [
//                 //     'aronfriedman98@gmail.com',
//                 //     'afriedman@woodmontcollege.edu'
//                 //     ]
                    
//                 // from: 'lyftscooter@outlook.com',
//                 from: {
//                     name: 'Detroit Bridal Shower Test',
//                     email: 'lyftscooter@outlook.com'
//                 },
//                 subject: 'Testing sendgrid',
//                 text: 'testing sendgrid',
                
//                 html: `<style type="text/css">
//                 body, p, div {
//                   font-family: inherit;
//                   font-size: 14px;
//                 }
//                 body {
//                   color: #000000;
//                 }
//                 body a {
//                   color: #1188E6;
//                   text-decoration: none;
//                 }
//                 p { margin: 0; padding: 0; }
//                 table.wrapper {
//                   width:100% !important;
//                   table-layout: fixed;
//                   -webkit-font-smoothing: antialiased;
//                   -webkit-text-size-adjust: 100%;
//                   -moz-text-size-adjust: 100%;
//                   -ms-text-size-adjust: 100%;
//                 }
//                 img.max-width {
//                   max-width: 100% !important;
//                 }
//                 .column.of-2 {
//                   width: 50%;
//                 }
//                 .column.of-3 {
//                   width: 33.333%;
//                 }
//                 .column.of-4 {
//                   width: 25%;
//                 }
//                 ul ul ul ul  {
//                   list-style-type: disc !important;
//                 }
//                 ol ol {
//                   list-style-type: lower-roman !important;
//                 }
//                 ol ol ol {
//                   list-style-type: lower-latin !important;
//                 }
//                 ol ol ol ol {
//                   list-style-type: decimal !important;
//                 }
//                 @media screen and (max-width:480px) {
//                   .preheader .rightColumnContent,
//                   .footer .rightColumnContent {
//                     text-align: left !important;
//                   }
//                   .preheader .rightColumnContent div,
//                   .preheader .rightColumnContent span,
//                   .footer .rightColumnContent div,
//                   .footer .rightColumnContent span {
//                     text-align: left !important;
//                   }
//                   .preheader .rightColumnContent,
//                   .preheader .leftColumnContent {
//                     font-size: 80% !important;
//                     padding: 5px 0;
//                   }
//                   .questions {
//                     color: gray !important;
//                   }
//                   table.wrapper-mobile {
//                     width: 100% !important;
//                     table-layout: fixed;
//                   }
//                   img.max-width {
//                     height: auto !important;
//                     max-width: 100% !important;
//                   }
//                   a.bulletproof-button {
//                     display: block !important;
//                     width: auto !important;
//                     font-size: 80%;
//                     padding-left: 0 !important;
//                     padding-right: 0 !important;
//                   }
//                   .columns {
//                     width: 100% !important;
//                   }
//                   .column {
//                     display: block !important;
//                     width: 100% !important;
//                     padding-left: 0 !important;
//                     padding-right: 0 !important;
//                     margin-left: 0 !important;
//                     margin-right: 0 !important;
//                   }
//                   .social-icon-column {
//                     display: inline-block !important;
//                   }
//                 }
//               </style>
//                 <center class="wrapper" data-link-color="#1188E6" data-body-style="font-size:14px; font-family:inherit; color:#000000; background-color:#e5dcd2;">
//         <div class="webkit">
//           <table cellpadding="0" cellspacing="0" border="0" width="100%" class="wrapper" bgcolor="#e5dcd2">
//             <tr>
//               <td valign="top" bgcolor="#e5dcd2" width="100%">
//                 <table width="100%" role="content-container" class="outer" align="center" cellpadding="0" cellspacing="0" border="0">
//                   <tr>
//                     <td width="100%">
//                       <table width="100%" cellpadding="0" cellspacing="0" border="0">
//                         <tr>
//                           <td>
//                             <!--[if mso]>
//     <center>
//     <table><tr><td width="600">
//   <![endif]-->
//                                     <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px;" align="center">
//                                       <tr>
//                                         <td role="modules-container" style="padding:0px 0px 0px 0px; color:#000000; text-align:left;" bgcolor="#FFFFFF" width="100%" align="left"><table class="module preheader preheader-hide" role="module" data-type="preheader" border="0" cellpadding="0" cellspacing="0" width="100%" style="display: none !important; mso-hide: all; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0;">
//     <tr>
//       <td role="module-content">
//         <p></p>
//       </td>
//     </tr>
//   </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="ecb815cc-87bc-4a3f-a334-040d110516dc" data-mc-module-version="2019-10-22">
//     <tbody>
//       <tr>
//         <td style="padding:5px 5px 5px 0px; line-height:20px; text-align:inherit; background-color:#e5dcd2;" height="100%" valign="top" bgcolor="#e5dcd2" role="module-content"><div><div style="font-family: inherit; text-align: right"><a href="{{Weblink}}"><span style="font-size: 10px; color: #6f6860"><u>View this email in your browser.</u></span></a></div><div></div></div></td>
//       </tr>
//     </tbody>
//   </table><table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:30px 0px 30px 0px;" bgcolor="#ffecea" data-distribution="1" >
//     <tbody>
//       <tr role="module-content">
//         <td height="100%" valign="top"><table width="600" style="width:600px; border-spacing:0; border-collapse:collapse; margin:0px 0px 0px 0px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor="" class="column column-0">
//       <tbody>
//         <tr>
//           <td style="padding:0px;margin:0px;border-spacing:0;"><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="c7fa172a-cdbf-4e85-ac82-60844b32dd62">
//     <tbody>
//       <tr>
//         <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="center">
//           <!--<img class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px;" width="122" alt="" data-proportionally-constrained="true" data-responsive="false" src="http://cdn.mcauto-images-production.sendgrid.net/954c252fedab403f/f47c415b-9be7-460c-a6a8-e5194758419a/122x10.png" height="10">-->
//         </td>
//       </tr>
//     </tbody>
//   </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="594ac2bc-2bb0-4642-8002-a8c9b543d125" data-mc-module-version="2019-10-22">
//     <tbody>
//       <tr>
//         <td style="padding:30px 0px 0px 0px; line-height:16px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="color: #80817f; font-size: 25px; line-height: 30px;">Baruch Hashem for simchos!</span></div><br>
// <div style="font-family: inherit; text-align: center"><span style="color: #80817f; font-size: 14px; ">We are so fortunate for all the future Chosson and Kallahs from our community.<br> This is an updated list from {date}. Please check if there are any additions and <br>if you would like to participate in these bridal showers.</span></div>
// <div style="font-family: inherit; text-align: center"><span style="color: #80817f; font-size: 10px"></span></div><div></div></div></td>
//       </tr>
//     </tbody>
//   </table></td>
//         </tr>
//       </tbody>
//     </table></td>
//       </tr>
//     </tbody>
//   </table><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="cb31e9b8-b045-4c38-a478-ed2a6e2dc166">
//     <tbody>
//       <tr>
//         <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="center">
//           <!--<img class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px;" width="600" alt="" data-proportionally-constrained="true" data-responsive="false" src="http://cdn.mcauto-images-production.sendgrid.net/954c252fedab403f/4ad091f2-00dc-4c89-9ad8-1d7aeaf169c2/600x189.png" height="189">-->
//         </td>
//       </tr>
//     </tbody>
//   </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="8fd711e6-aecf-4663-bf53-6607f08b57e9" data-mc-module-version="2019-10-22">
//     <tbody>
//       <tr>
//         <td style="background-image: url('https://images.creativemarket.com/0.1.0/ps/4534176/300/200/m2/fpc/wm0/k0ibwifz5orspls3xqbbradq4ldxtu8wvd9nn1iuft9xdl9rssmyu8lockzqowvm-.jpg?1527764336&s=d964aab856967c268b97aa3a69c39b49'); background-repeat: repeat; padding:40px 0px 50px 0px; line-height:22px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="color: #80817f; font-size: 18px"><strong>New Chosson/Kallah:</strong></span></div>
// <div style="font-family: inherit; text-align: center"><br></div>
// <div style="font-family: inherit; text-align: center"><span style="color: #80817f; font-size: 16px">

// ${newCoupleString} <br> <br>

// <div style="font-family: inherit; text-align: center"><span style="color: #80817f; font-size: 16px">Still collecting for: <br> <br> ${couplesString}

// </span></div><div></div></div></td>
//       </tr>
//     </tbody>
//   </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="8fd711e6-aecf-4663-bf53-6607f08b57e9.1" data-mc-module-version="2019-10-22">
//   <div style="font-family: inherit; text-align: center; margin-top: 20px;"><span style="color: #80817f; font-size: 14px; ">Participation is $65.00 per shower, although if that is too difficult, <br>any amount is accepted. <br>Please send a reply email specifying and confirming which shower<br> you would like to participate in and send payment through <br>one of the following methods: <br> <br></span></div>
//     <tbody>
//       <tr>
//         <td style="padding:0px 40px 40px 40px; line-height:22px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: inherit"><span style="color: #80817f; font-size: 14px"><strong>PayPal:</strong></span><span style="color: #80817f; font-size: 14px"> beckyfriedman1@gmail.com <br>(avoid fees: choose the friends and family option)<br><br></span></div>
// <div style="font-family: inherit; text-align: inherit"><span style="color: #80817f; font-size: 14px"><strong>Venmo:</strong></span><span style="color: #80817f; font-size: 14px"> @Becky-Friedman-8</span></div><br>
// <div style="font-family: inherit; text-align: inherit"><span style="color: #80817f; font-size: 14px"><strong>Zelle:</strong></span><span style="color: #80817f; font-size: 14px"> beckyfriedman1@gmail.com</span></div><br>
// <div style="font-family: inherit; text-align: inherit"><span style="color: #80817f; font-size: 14px"><strong>Check: </strong></span><span style="color: #80817f; font-size: 14px">mailed and made out to: <br> Detroit Bridal Shower Project <br> 17322 Goldwin Drive <br> Southfield, MI 48075</span></div><div></div></div></td>
//       </tr>
//     </tbody>
//   </table><table class="module" role="module" data-type="divider" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="c614d8b1-248a-48ea-a30a-8dd0b2c65e10">
//   <div style="font-family: inherit; text-align: center"><span class="questions" style="color: white; font-size: 13px; ">All the collections will be used to start off the <br>Chosson and Kallah with all household basics. <br> <br></span></div>
  
  
//   <!--  <tbody>-->
    
//   <!--    <tr>-->
      
//   <!--      <td style="padding:0px 40px 0px 40px;" role="module-content" height="100%" valign="top" bgcolor="">-->
        
//   <!--        <table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" height="2px" style="line-height:2px; font-size:2px;">-->
//   <!--          <tbody>-->
//   <!--            <tr>-->
//   <!--              <td style="padding:0px 0px 2px 0px;" bgcolor="#80817f"></td>-->
//   <!--            </tr>-->
//   <!--          </tbody>-->
//   <!--        </table>-->
//   <!--      </td>-->
//   <!--    </tr>-->
//   <!--  </tbody>-->
    
//   <!--</table><table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:0px 40px 0px 40px;" bgcolor="#FFFFFF" data-distribution="1,1,1">-->
//   <!--  <tbody>-->
//   <!--    <tr role="module-content">-->
//   <!--      <td height="100%" valign="top"><table width="173" style="width:173px; border-spacing:0; border-collapse:collapse; margin:0px 0px 0px 0px;" cellpadding="0" cellspacing="0" align="center" border="0" bgcolor="" class="column column-0">-->
//   <!--    <tbody>-->
//   <!--      <tr>-->
//   <!--        <td style="padding:0px;margin:0px;border-spacing:0;"><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="64573b96-209a-4822-93ec-5c5c732af15c" data-mc-module-version="2019-10-22">-->
          
//   <!--  <tbody>-->
//   <!--    <tr>-->
//   <!--      <td style="padding:0px 0px 15px 0px; line-height:0px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="color: #80817f; font-size: 12px"><strong></strong></span></div><div></div></div></td>-->
//   <!--    </tr>-->
//   <!--  </tbody>-->
//   <!--</table></td>-->
//   <!--      </tr>-->
//   <!--    </tbody>-->
//   <!--  </table><table width="173" style="width:173px; border-spacing:0; border-collapse:collapse; margin:0px 0px 0px 0px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor="" class="column column-1">-->
//   <!--    <tbody>-->
//   <!--      <tr>-->
//   <!--        <td style="padding:0px;margin:0px;border-spacing:0;"><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="64573b96-209a-4822-93ec-5c5c732af15c.1" data-mc-module-version="2019-10-22">-->
          
//   <!--  <tbody>-->
//   <!--    <tr>-->
//   <!--      <td style=""><div><div style="font-family: inherit; text-align: center"><span style="color: #80817f; font-size: 12px"></strong></span></div><div></div></div></td>-->
//   <!--    </tr>-->
//   <!--  </tbody>-->
//   <!--</table></td>-->
//   <!--      </tr>-->
//   <!--    </tbody>-->
//   <!--  </table><table width="173" style="width:173px; border-spacing:0; border-collapse:collapse; margin:0px 0px 0px 0px;" cellpadding="0" cellspacing="0" align="" border="0" bgcolor="" class="column column-2">-->
//   <!--    <tbody>-->
//   <!--      <tr>-->
//   <!--        <td style="padding:0px;margin:0px;border-spacing:0;"><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="64573b96-209a-4822-93ec-5c5c732af15c.1.1" data-mc-module-version="2019-10-22">-->
//   <!--  <tbody>-->
//   <!--    <tr>-->
//   <!--      <td style="padding:15px 0px 15px 0px; line-height:22px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="color: #80817f; font-size: 12px"></strong></span></div><div></div></div></td>-->
        
        
//   <!--    </tr>-->
//   <!--  </tbody>-->
//   <!--</table></td>-->
//   <!--      </tr>-->
//   <!--    </tbody>-->
//   <!--  </table></td>-->
//   <!--    </tr>-->
//   <!--  </tbody>-->
//   <!--</table><table class="module" role="module" data-type="divider" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="c614d8b1-248a-48ea-a30a-8dd0b2c65e10.1">-->
//   <!--  <tbody>-->
//   <!--    <tr>-->
//   <!--      <td style="padding:0px 40px 0px 40px;" role="module-content" height="100%" valign="top" bgcolor="">-->
//   <!--        <table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" height="2px" style="line-height:2px; font-size:2px;">-->
//   <!--          <tbody>-->
//   <!--            <tr>-->
//   <!--              <td style="padding:0px 0px 2px 0px;" bgcolor="#80817f"></td>-->
//   <!--            </tr>-->
//   <!--          </tbody>-->
//   <!--        </table>-->
//   <!--      </td>-->
//   <!--    </tr>-->
//   <!--  </tbody>-->
//   <!--</table><table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:0px 40px 0px 40px;" bgcolor="#FFFFFF" data-distribution="1,1,1">-->
  
//   <hr><br>
//   <div style="font-family: inherit; text-align: center;"><span class="questions" style="color: white; font-size: 13px;">If you would like to add a new couple to the bridal shower list please visit our website <u><a href="https://detroit-bridal-shower.azurewebsites.net/">here.</a></u> <br> You can also view the announcements on our website. <br> <br>If you have any questions or concerns,<br> please reach out to <a style="color: grey; text-decoration: underline;"href="mailto:bridalshower@detroitbridalshower.org">bridalshower@detroitbridalshower.org</a> or visit the website <a href="">link</a>.</span></div> <br>
  
//   <div style="font-family: inherit; text-align: center;"><span style="color: white; font-size: 13px;"class="questions">We should continue to hear of many more simchas!</a></span></div>
//   <br><br>
//   <div style="font-family: inherit; text-align: center;"><span style="color: white; font-size: 13px;" class="questions">Becky Friedman</a></span></div> <br> <br>
    
//     <tbody>
//       <tr>
//         <td style="padding:40px 30px 40px 30px; line-height:22px; text-align:inherit; background-color:#80817f;" height="100%" valign="top" bgcolor="#80817f" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="color: #ffffff; font-size: 12px">Copyright &copy; 2023 Detroit Bridal Shower. All rights reserved. <br> You are receiving this email becuase you opted in via our website</span></div>
// <div style="font-family: inherit; text-align: center"><br></div>
// <div style="font-family: inherit; text-align: center"><span style="color: #ffffff; font-size: 12px"><strong>Our mailing address is: <br> Detroit Bridal Showers <br> 17322 Goldwin Dr. <br> Southfield, Michigan 48075</strong></span></div><div></div></div></td>
//       </tr>
//     </tbody>
//   </table><div data-role="module-unsubscribe" class="module" role="module" data-type="unsubscribe" style="background-color:#ffecea; color:#444444; font-size:12px; line-height:20px; padding:16px 16px 16px 16px; text-align:Center;" data-muid="4e838cf3-9892-4a6d-94d6-170e474d21e5"><p style="font-size:12px; line-height:20px;"><a class="Unsubscribe--unsubscribeLink" href="{{{unsubscribe}}}" target="_blank" style="color:#80817f;">Unsubscribe</a> - <a href="{{{unsubscribe_preferences}}}" target="_blank" class="Unsubscribe--unsubscribePreferences" style="color:#80817f;">Unsubscribe Preferences</a></p></div><table border="0" cellpadding="0" cellspacing="0" class="module" data-role="module-button" data-type="button" role="module" style="table-layout:fixed;" width="100%" data-muid="04084f31-d714-4785-98c7-39de4df9fb7b">
//       <tbody>
//         <tr>
//           <td align="center" bgcolor="#FFECEA" class="outer-td" style="padding:20px 0px 20px 0px; background-color:#FFECEA;">
//             <table border="0" cellpadding="0" cellspacing="0" class="wrapper-mobile" style="text-align:center;">
//               <tbody>
//                 <tr>
//                 <td align="center" bgcolor="#f5f8fd" class="inner-td" style="border-radius:6px; font-size:16px; text-align:center; background-color:inherit;"><a href="https://sendgrid.com/" style="background-color:#f5f8fd; border:1px solid #f5f8fd; border-color:#f5f8fd; border-radius:25px; border-width:1px; color:#a8b9d5; display:inline-block; font-size:10px; font-weight:normal; letter-spacing:0px; line-height:normal; padding:5px 18px 5px 18px; text-align:center; text-decoration:none; border-style:solid; font-family:helvetica,sans-serif;" target="_blank">♥ POWERED BY TWILIO SENDGRID</a></td>
//                 </tr>
//               </tbody>
//             </table>
//           </td>
//         </tr>
//       </tbody>
//     </table></td>
//                                       </tr>
//                                     </table>
//                                     <!--[if mso]>
//                                   </td>
//                                 </tr>
//                               </table>
//                             </center>
//                             <![endif]-->
//                           </td>
//                         </tr>
//                       </table>
//                     </td>
//                   </tr>
//                 </table>
//               </td>
//             </tr>
//           </table>
//         </div>
//       </center>`

//             }
//             mailMod.sendMail(message)
        
            // res.json({
            //   status : false,
            //   title : 'Oops!',
            //   message: 'You have missing fields. Please fill out the required fields.'
            // })

            // mailMod.sendMail(message2)
            
            // res.redirect("/")
            // res.status(200).send('Form data saved successfully!');
        } catch (err) {
            if (err) return res.json({
              status : false,
              title : 'Oops!',
              message: 'There was an error with your submission. Double check your email address or refresh the page and try again.'
            })
            // res.redirect("/")
        }
    },
    confirmEntry : async (req, res) => {
        // try {
        //     const { id } = req.params
        //     const entry = await Entry.findById(id)
        //     entry.confirmed = true
        //     await entry.save()
        //     res.redirect("/")
        // } catch (err) {
        //     if (err) return res.status(500).send(err)
        // }
        try {
          // const queryCouple = {
          //   name: req.query.name,
          //   email: req.query.email,
          //   phoneNumber: req.query.phoneNumber,
          //   address: req.query.address,
          //   chossonName: req.query.chossonName,
          //   chossonFatherTitle: req.query.chossonFatherTitle,
          //   chossonFatherName: req.query.chossonFatherName,
          //   chossonOrigin: req.query.chossonOrigin,
          //   kallah: req.query.kallah,
          //   kallahFatherTitle: req.query.kallahFatherTitle,
          //   kallahFatherName: req.query.kallahFatherName,
          //   kallahOrigin: req.query.kallahOrigin,
          //   weddingDate: req.query.weddingDate,
          //   personalShopper: req.query.personalShopper,
          //   chesedPackage: req.query.chesedPackage,
          //   confNum: req.query.confNum
          // }
          const dbCouple = await Couples.find({ confNumber: req.query.confNum })
          if (dbCouple == null) throw `Contact not found.`
          console.log(req.query)
          // console.log(dbCouple)


          // console.log(dbCouple[0].name === req.query.name)
          // console.log(dbCouple[0].name + " " + req.query.name)

          // console.log(dbCouple[0].email === req.query.email)
          // console.log(dbCouple[0].email + " " + req.query.email)

          // console.log(dbCouple[0].phoneNumber === req.query.phoneNumber)
          // console.log(dbCouple[0].phoneNumber + " " + req.query.phoneNumber)

          // console.log(dbCouple[0].address === req.query.address)
          // console.log(dbCouple[0].address + " " + req.query.address)

          // console.log(dbCouple[0].chossonName === req.query.chossonName)
          // console.log(dbCouple[0].chossonName + " " + req.query.chossonName)

          // console.log(dbCouple[0].chossonFatherTitle === req.query.chossonFatherTitle)
          // console.log(dbCouple[0].chossonFatherTitle + " " + req.query.chossonFatherTitle)

          // console.log(dbCouple[0].chossonFather === req.query.chossonFatherName)
          // console.log(dbCouple[0].chossonFather + " " + req.query.chossonFatherName)

          
          // console.log(dbCouple[0].kallahName === req.query.kallahName)
          // console.log(dbCouple[0].kallahName + " " + req.query.kallahName)

          // console.log(dbCouple[0].kallahFatherTitle === req.query.kallahFatherTitle)
          // console.log(dbCouple[0].kallahFatherTitle + " " + req.query.kallahFatherTitle)

          // console.log(dbCouple[0].kallahFather === req.query.kallahFatherName)
          // console.log(dbCouple[0].kallahFather + " " + req.query.kallahFatherName)
          
        
          console.log(dbCouple[0].confNumber == req.query.confNum)
          console.log(dbCouple[0].confNumber + " " + req.query.confNum)

          //really only need to check the confNum
          if (dbCouple[0].name === req.query.name &&
              dbCouple[0].email === req.query.email && 
              dbCouple[0].phoneNumber === req.query.phoneNumber && 
              dbCouple[0].address === req.query.address && 
              dbCouple[0].chossonName === req.query.chossonName && 
              // dbCouple[0].chossonFatherTitle === req.query.chossonFatherTitle && 
              // dbCouple[0].chossonFather === req.query.chossonFatherName &&
              // dbCouple[0].chossonMotherTitle === req.query.chossonMotherTitle &&
              // dbCouple[0].chossonMother === req.query.chossonMotherName &&
              // dbCouple[0].chossonOrigin === req.query.chossonOrigin && 
              dbCouple[0].kallahName === req.query.kallahName && 
              // dbCouple[0].kallahFatherTitle === req.query.kallahFatherTitle && 
              // dbCouple[0].kallahFather === req.query.kallahFatherName &&
              // dbCouple[0].kallahMotherTitle === req.query.kallahMotherTitle &&
              // dbCouple[0].kallahMother === req.query.kallahMotherName &&
              // dbCouple[0].kallahOrigin === req.query.kallahOrigin 
              dbCouple[0].confNumber == req.query.confNum
              ) {
                console.log("equals")

          let chesedPackage = " " 
          if(req.query.toaster === 'true') {
            chesedPackage += "Toaster, "
          }
          if(req.query.urn === 'true') {
            chesedPackage += "Urn, "
          }
          if(req.query.kitchenTowels === 'true') {
            chesedPackage += "Kitchen towels, "
          }
          if(req.query.vacuum === 'true') {
            chesedPackage += "Vacuum, "
          }
          if(req.query.cholentPot === 'true') {
            chesedPackage += "Cholent pot, "
          }

          //remove last 2 chars of string (comma and space)
          chesedPackage = chesedPackage.slice(0, -2)

          //send email to chesed package lady
          if(req.query.toaster === 'true' || req.query.urn === 'true' || req.query.kitchenTowels === 'true' || req.query.vacuum === 'true' || req.query.cholentPot === 'true') {


            
            const recipients = ['bridalshower@detroitbridalshower.org', 'shoshny@hotmail.com'];

            recipients.forEach((recipient) => {
              const chessedPackageMsg = {
                to: recipient,
                from: 'bridalshower@detroitbridalshower.org',
                subject: 'Chessed Package Request',
                html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
                <html data-editor-version="2" class="sg-campaigns" xmlns="http://www.w3.org/1999/xhtml">
                    <head>
                      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1">
                      <!--[if !mso]><!-->
                      <meta http-equiv="X-UA-Compatible" content="IE=Edge">
                      <!--<![endif]-->
                      <!--[if (gte mso 9)|(IE)]>
                      <xml>
                        <o:OfficeDocumentSettings>
                          <o:AllowPNG/>
                          <o:PixelsPerInch>96</o:PixelsPerInch>
                        </o:OfficeDocumentSettings>
                      </xml>
                      <![endif]-->
                      <!--[if (gte mso 9)|(IE)]>
                  <style type="text/css">
                    body {width: 600px;margin: 0 auto;}
                    table {border-collapse: collapse;}
                    table, td {mso-table-lspace: 0pt;mso-table-rspace: 0pt;}
                    img {-ms-interpolation-mode: bicubic;}
                  </style>
                <![endif]-->
                      <style type="text/css">
                    body, p, div {
                      font-family: inherit;
                      font-size: 14px;
                    }
                    body {
                      color: #000000;
                    }
                    body a {
                      color: #1188E6;
                      text-decoration: none;
                    }
                    p { margin: 0; padding: 0; }
                    table.wrapper {
                      width:100% !important;
                      table-layout: fixed;
                      -webkit-font-smoothing: antialiased;
                      -webkit-text-size-adjust: 100%;
                      -moz-text-size-adjust: 100%;
                      -ms-text-size-adjust: 100%;
                    }
                    img.max-width {
                      max-width: 100% !important;
                    }
                    .column.of-2 {
                      width: 50%;
                    }
                    .column.of-3 {
                      width: 33.333%;
                    }
                    .column.of-4 {
                      width: 25%;
                    }
                    ul ul ul ul  {
                      list-style-type: disc !important;
                    }
                    ol ol {
                      list-style-type: lower-roman !important;
                    }
                    ol ol ol {
                      list-style-type: lower-latin !important;
                    }
                    ol ol ol ol {
                      list-style-type: decimal !important;
                    }
                    @media screen and (max-width:480px) {
                      .preheader .rightColumnContent,
                      .footer .rightColumnContent {
                        text-align: left !important;
                      }
                      .preheader .rightColumnContent div,
                      .preheader .rightColumnContent span,
                      .footer .rightColumnContent div,
                      .footer .rightColumnContent span {
                        text-align: left !important;
                      }
                      .preheader .rightColumnContent,
                      .preheader .leftColumnContent {
                        font-size: 80% !important;
                        padding: 5px 0;
                      }
                      table.wrapper-mobile {
                        width: 100% !important;
                        table-layout: fixed;
                      }
                      img.max-width {
                        height: auto !important;
                        max-width: 100% !important;
                      }
                      a.bulletproof-button {
                        display: block !important;
                        width: auto !important;
                        font-size: 80%;
                        padding-left: 0 !important;
                        padding-right: 0 !important;
                      }
                      .columns {
                        width: 100% !important;
                      }
                      .column {
                        display: block !important;
                        width: 100% !important;
                        padding-left: 0 !important;
                        padding-right: 0 !important;
                        margin-left: 0 !important;
                        margin-right: 0 !important;
                      }
                      .social-icon-column {
                        display: inline-block !important;
                      }
                    }
                  </style>
                      <!--user entered Head Start--><link href="https://fonts.googleapis.com/css?family=Lato:300&display=swap" rel="stylesheet"><style>
                body {font-family: 'Lato', sans-serif;}
                </style><!--End Head user entered-->
                    </head>
                    <body>
                      <center class="wrapper" data-link-color="#1188E6" data-body-style="font-size:14px; font-family:inherit; color:#000000; background-color:#f3f3f3;">
                        <div class="webkit">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" class="wrapper" bgcolor="#f3f3f3">
                            <tr>
                              <td valign="top" bgcolor="#f3f3f3" width="100%">
                                <table width="100%" role="content-container" class="outer" align="center" cellpadding="0" cellspacing="0" border="0">
                                  <tr>
                                    <td width="100%">
                                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                          <td>
                                            <!--[if mso]>
                    <center>
                    <table><tr><td width="600">
                  <![endif]-->
                                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px;" align="center">
                                                      <tr>
                                                        <td role="modules-container" style="padding:0px 0px 0px 0px; color:#000000; text-align:left;" bgcolor="#FFFFFF" width="100%" align="left"><table class="module preheader preheader-hide" role="module" data-type="preheader" border="0" cellpadding="0" cellspacing="0" width="100%" style="display: none !important; mso-hide: all; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0;">
                    <tr>
                      <td role="module-content">
                        <p></p>
                      </td>
                    </tr>
                  </table><table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:30px 0px 30px 0px;" bgcolor="#f2eefb" data-distribution="1">
                    <tbody>
                      <tr role="module-content">
                        <td height="100%" valign="top"><table width="600" style="width:600px; border-spacing:0; border-collapse:collapse; margin:0px 0px 0px 0px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor="" class="column column-0">
                      <tbody>
                        <tr>
                          <td style="padding:0px;margin:0px;border-spacing:0;"><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="79178f70-3054-4e9f-9b29-edfe3988719e">
                    <tbody>
                      <tr>
                        <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="center"><a href="https://i.imgur.com/ssGV6SR.jpg"><img class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px;" width="300" alt="" data-proportionally-constrained="true" data-responsive="false" src="https://i.imgur.com/ssGV6SR.jpg" height=""></a></td>
                      </tr>
                    </tbody>
                  </table></td>
                        </tr>
                      </tbody>
                    </table></td>
                      </tr>
                    </tbody>
                  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="ef0f9e06-1b02-4b22-b5e8-dc8f6bb9b3b1" data-mc-module-version="2019-10-22">
                    <tbody>
                      <tr>
                        <td style="padding:50px 20px 10px 20px; line-height:22px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="font-size: 28px; font-family: inherit">Chessed Package Request</span></div><div></div></div></td>
                      </tr>
                    </tbody>
                  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="ef0f9e06-1b02-4b22-b5e8-dc8f6bb9b3b1.1.1" data-mc-module-version="2019-10-22">
                    <tbody>
                      <tr>
                        <td style="padding:20px 20px 10px 20px; line-height:22px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: center">This email is to update you on a recent Chessed Package Request. Below, you will find the contact information of the requester and their list of requested items.&nbsp;</div>
                <div style="font-family: inherit; text-align: center"><br></div><div></div></div></td>
                      </tr>
                    </tbody>
                  </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="8395333d-62e9-4e61-957d-72d0eefc1a4f">
                    <tbody>
                      <tr>
                        <td style="padding:0px 0px 30px 0px;" role="module-content" bgcolor="">
                        </td>
                      </tr>
                    </tbody>
                  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="f612db9d-7563-4153-b3d5-8a0015929def" data-mc-module-version="2019-10-22">
                    <tbody>
                      <tr>
                        <td style="padding:18px 30px 18px 40px; line-height:22px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: inherit"><span style="font-size: 28px">Contact Information</span></div><div></div></div></td>
                      </tr>
                    </tbody>
                  </table><table class="module" role="module" data-type="divider" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="86c0feb7-e890-4382-bb8e-b1910742ba10">
                    <tbody>
                      <tr>
                        <td style="padding:0px 30px 0px 40px;" role="module-content" height="100%" valign="top" bgcolor="">
                          <table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" height="1px" style="line-height:1px; font-size:1px;">
                            <tbody>
                              <tr>
                                <td style="padding:0px 0px 1px 0px;" bgcolor="#000000"></td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="ef0f9e06-1b02-4b22-b5e8-dc8f6bb9b3b1.1.1.1" data-mc-module-version="2019-10-22">
                    <tbody>
                      <tr>
                        <td style="padding:30px 20px 30px 40px; line-height:22px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: inherit;"><span style="font-weight:bold;">Name:</span>&nbsp; ${req.query.name}</div>
                <div style="font-family: inherit; text-align: inherit"><span style="font-weight:bold;">Email</span>:&nbsp;${req.query.email}</div>
                <div style="font-family: inherit; text-align: inherit"><span style="font-weight:bold;">Phone Number</span>:&nbsp;${req.query.phoneNumber}</div>
                <div></div></div></td>
                      </tr>
                    </tbody>
                  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="f612db9d-7563-4153-b3d5-8a0015929def.1" data-mc-module-version="2019-10-22">
                    <tbody>
                      <tr>
                        <td style="padding:18px 30px 18px 40px; line-height:22px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: inherit"><span style="font-size: 28px">Request Items</span></div><div></div></div></td>
                      </tr>
                    </tbody>
                  </table><table class="module" role="module" data-type="divider" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="86c0feb7-e890-4382-bb8e-b1910742ba10.1.1">
                    <tbody>
                      <tr>
                        <td style="padding:0px 30px 0px 40px;" role="module-content" height="100%" valign="top" bgcolor="">
                          <table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" height="1px" style="line-height:1px; font-size:1px;">
                            <tbody>
                              <tr>
                                <td style="padding:0px 0px 1px 0px;" bgcolor="#000000"></td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="ef0f9e06-1b02-4b22-b5e8-dc8f6bb9b3b1.1.1.1.1" data-mc-module-version="2019-10-22">
                    <tbody>
                      <tr>
                        <td style="padding:30px 20px 30px 40px; line-height:22px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: inherit">${chesedPackage}</div><div></div></div></td>
                      </tr>
                    </tbody>
                  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="f612db9d-7563-4153-b3d5-8a0015929def.1.1" data-mc-module-version="2019-10-22">
                    <tbody>
                      <tr>
                        <td style="padding:18px 30px 18px 40px; line-height:22px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: center">We appreciate your dedicated work with the Chessed Package!</div><div></div></div></td>
                      </tr>
                    </tbody>
                  </table><table class="module" role="module" data-type="divider" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="86c0feb7-e890-4382-bb8e-b1910742ba10.1">
                    <tbody>
                      <tr>
                        <td style="padding:0px 30px 0px 40px;" role="module-content" height="100%" valign="top" bgcolor="">
                          <table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" height="1px" style="line-height:1px; font-size:1px;">
                            <tbody>
                              <tr>
                                <td style="padding:0px 0px 1px 0px;" bgcolor="#000000"></td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="0a0f7040-0a2f-4749-8f52-03f4bfb4f161">
                    <tbody>
                      <tr>
                        <td style="padding:0px 0px 30px 0px;" role="module-content" bgcolor="">
                        </td>
                      </tr>
                    </tbody>
                  </table></td>
                                                      </tr>
                                                    </table>
                                                    <!--[if mso]>
                                                  </td>
                                                </tr>
                                              </table>
                                            </center>
                                            <![endif]-->
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </div>
                      </center>
                    </body>
                  </html>`,
              };

              sgMail.send(chessedPackageMsg)
               
            });
          }




          


          

          const params = new URLSearchParams({
            // name: req.query.name,
            // email: req.query.email,
            // phoneNumber: req.query.phoneNumber,
            // address: req.query.address,
            // chossonName: req.query.chossonName,
            // chossonFatherTitle: req.query.chossonFatherTitle,
            // chossonFatherName: req.query.chossonFatherName,
            // chossonMotherTitle: req.query.chossonMotherTitle,
            // chossonMotherName: req.query.chossonMotherName,
            // chossonOrigin: req.query.chossonOrigin,
            // kallahName: req.query.kallahName,
            // kallahFatherTitle: req.query.kallahFatherTitle,
            // kallahFatherName: req.query.kallahFatherName,
            // kallahMotherTitle: req.query.kallahMotherTitle,
            // kallahMotherName: req.query.kallahMotherName,
            // kallahOrigin: req.query.kallahOrigin,
            // weddingDate: req.query.weddingDate,
            // personalShopper: req.query.personalShopper,
            // chesedPackage: req.query.chesedPackage,
            //addition parents

            name: req.query.name,
            email: req.query.email,
            phoneNumber: req.query.phoneNumber,
            address: req.query.address,
            chossonName: req.query.chossonName,
            chossonFatherTitle: req.query.chossonFatherTitle,
            chossonFatherName: req.query.chossonFatherName,
            chossonMotherTitle: req.query.chossonMotherTitle,
            chossonMotherName: req.query.chossonMotherName,
            chossonOrigin: req.query.chossonOrigin,
            kallahName: req.query.kallahName,
            kallahFatherTitle: req.query.kallahFatherTitle,
            kallahFatherName: req.query.kallahFatherName,
            kallahMotherTitle: req.query.kallahMotherTitle,
            kallahMotherName: req.query.kallahMotherName,
            kallahOrigin: req.query.kallahOrigin,
            weddingDate: req.query.weddingDate,
            personalShopper: req.query.personalShopper,

            //additional parents
            chossonMotherDivorcedTitle: req.query.chossonMotherDivorcedTitle,
            chossonMotherDivorcedName: req.query.chossonMotherDivorcedName,
            chossonMotherHusbandTitle: req.query.chossonMotherHusbandTitle,
            chossonMotherHusbandName: req.query.chossonMotherHusbandName,
            kallahMotherDivorcedTitle: req.query.kallahMotherDivorcedTitle,
            kallahMotherDivorcedName: req.query.kallahMotherDivorcedName,
            kallahMotherHusbandTitle: req.query.kallahMotherHusbandTitle,
            kallahMotherHusbandName: req.query.kallahMotherHusbandName,

            //chesed package
            toaster: req.query.toaster,
            urn: req.query.urn,
            kitchenTowels: req.query.kitchenTowels,
            vacuum: req.query.vacuum,
            cholentPot: req.query.cholentPot,

            //deceased parent
            chossonDeceased: req.query.deceased,
            kallahDeceased: req.query.deceased2,

            confNum: req.query.confNum
           
          })
          console.log('params: ' + params)

          // let verificationURL = req.protocol + '://' + req.get('host') + '/verifyCouple?' + params
          // let adminURL = req.protocol + '://' + req.get('host') + '/admin'

          let verificationURL = process.env.AZURE_URL + '/verifyCouple?' + params
          let adminURL = process.env.AZURE_URL + '/login'

          
                        //deal with regular parents variables
                //         let chossonFather = ""
                //         let chossonMother = ""
                //         let kallahFather = ""
                //         let kallahMother = ""

                //         if(req.query.chossonFatherName !== "") {
                //           if(req.query.chossonFatherTitle === "Title" || req.query.chossonFatherTitle === "") {
                //             chossonFather = "Mr." + " " + req.query.chossonFatherName
                //           } else {
                //           chossonFather = req.query.chossonFatherTitle + " " + req.query.chossonFatherName
                //         }
                //       }
                //       if(req.query.chossonMotherName !== "") {
                //         if(req.query.chossonMotherTitle === "Title" || req.query.chossonMotherTitle === "") {
                //           chossonMother = "Mrs." + " " + req.query.chossonMotherName
                //         } else {
                //         chossonMother = req.query.chossonMotherTitle + " " + req.query.chossonMotherName
                //       }
                //     }
                //     if(req.query.kallahFatherName !== "") {
                //       if(req.query.kallahFatherTitle === "Title" || req.query.kallahFatherTitle === "") {
                //         kallahFather = "Mr." + " " + req.query.kallahFatherName
                //       } else {
                //       kallahFather = req.query.kallahFatherTitle + " " + req.query.kallahFatherName
                //     }
                //   }
                //   if(req.query.kallahMotherName !== "") {
                //     if(req.query.kallahMotherTitle === "Title" || req.query.kallahMotherTitle === "") {
                //       kallahMother = "Mrs." + " " + req.query.kallahMotherName
                //     } else {
                //     kallahMother = req.query.kallahMotherTitle + " " + req.query.kallahMotherName
                //   }
                // }

                //         //deal with additional parents variables
                //         let addChossonFather = ""
                //         let addChossonMother = ""
                //         let addKallahFather = ""
                //         let addKallahMother = ""

                //         if(req.query.addParentChossonFatherName !== "") {
                //           if(req.query.addParentChossonFatherTitle === "Title" || req.query.addParentChossonFatherTitle === "") {
                //             addChossonFather = "Mr." + " " + req.query.addParentChossonFatherName
                //           } else {
                //           addChossonFather = req.query.addParentChossonFatherTitle + " " + req.query.addParentChossonFatherName
                //         }
                //       }
                //       if(req.query.addParentChossonMotherName !== "") {
                //         if(req.query.addParentChossonMotherTitle === "Title" || req.query.addParentChossonMotherTitle === "") {
                //           addChossonMother = "Mrs." + " " + req.query.addParentChossonMotherName
                //         } else {
                //         addChossonMother = req.query.addParentChossonMotherTitle + " " + req.query.addParentChossonMotherName
                //       }
                //     }
                //     if(req.query.addParentKallahFatherName !== "") {
                //       if(req.query.addParentKallahFatherTitle === "Title" || req.query.addParentKallahFatherTitle === "") {
                //         addKallahFather = "Mr." + " " + req.query.addParentKallahFatherName
                //       } else {
                //       addKallahFather = req.query.addParentKallahFatherTitle + " " + req.query.addParentKallahFatherName
                //     }
                //   }
                //   if(req.query.addParentKallahMotherName !== "") {
                //     if(req.query.addParentKallahMotherTitle === "Title" || req.query.addParentKallahMotherTitle === "") {
                //       addKallahMother = "Mrs." + " " + req.query.addParentKallahMotherName
                //     } else {
                //     addKallahMother = req.query.addParentKallahMotherTitle + " " + req.query.addParentKallahMotherName
                //   }
                // }

                
                        //set parent name variables that were filled out
                        let chossonFather = ""
                        let chossonMotherField1 = ""
                        let chossonMotherField2 = ""
                        let chossonMotherHusband = ""

                        let kallahFather = ""
                        let kallahMotherField1 = ""
                        let kallahMotherField2 = ""
                        let kallahMotherHusband = ""

                        //Fathers are easy since those fields are required no matter what
                        chossonFather = req.query.chossonFatherTitle + " " + req.query.chossonFatherName
                        kallahFather = req.query.kallahFatherTitle + " " + req.query.kallahFatherName

                        //Mothers husband is also easy since that optional no matter what
                        if(req.query.chossonMotherHusbandName !== "") {
                          chossonMotherHusband = req.query.chossonMotherHusbandTitle + " " + req.query.chossonMotherHusbandName
                        }
                        if(req.query.kallahMotherHusbandName !== "") {
                          kallahMotherHusband = req.query.kallahMotherHusbandTitle + " " + req.query.kallahMotherHusbandName
                        }

                        //deal with mother/husband wife
                        if(req.query.chossonMotherDivorcedName !== "") {
                          //if the mother is divorced, then motherfield2 is required
                          chossonMotherField2 = req.query.chossonMotherDivorcedTitle + " " + req.query.chossonMotherDivorcedName
                          //if the mother is divorced, then motherfield1 is not required
                          if(req.query.chossonMotherName !== "") {
                            chossonMotherField1 = req.query.chossonMotherTitle + " " + req.query.chossonMotherName
                          }
                        } else {
                          //if the mother is not divorced, then motherfield1 is required
                          chossonMotherField1 = req.query.chossonMotherTitle + " " + req.query.chossonMotherName
                        }

                        if(req.query.kallahMotherDivorcedName !== "") {
                          //if the mother is divorced, then motherfield2 is required
                          kallahMotherField2 = req.query.kallahMotherDivorcedTitle + " " + req.query.kallahMotherDivorcedName
                          //if the mother is divorced, then motherfield1 is not required
                          if(req.query.kallahMotherName !== "") {
                            kallahMotherField1 = req.query.kallahMotherTitle + " " + req.query.kallahMotherName
                          }
                        } else {
                          //if the mother is not divorced, then motherfield1 is required
                          kallahMotherField1 = req.query.kallahMotherTitle + " " + req.query.kallahMotherName
                        }
                        



                let chossonDads = ""
                let kallahDads = ""
                let chossonMoms = ""
                let kallahMoms = ""

                if(chossonMotherHusband !== "") {
                  chossonDads = chossonFather + " and " + chossonMotherHusband
                } else {
                  chossonDads = chossonFather
                }
                if(kallahMotherHusband !== "") {
                  kallahDads = kallahFather + " and " + kallahMotherHusband
                } else {
                  kallahDads = kallahFather
                }
                if(chossonMotherField1 !== "" && chossonMotherField2 !== "") {
                  chossonMoms = chossonMotherField2 + " and " + chossonMotherField1
                } else if(chossonMotherField1 !== "" && chossonMotherField2 === "") {
                  chossonMoms = chossonMotherField1
                } else if(chossonMotherField1 === "" && chossonMotherField2 !== "") {
                  chossonMoms = chossonMotherField2
                }
                if(kallahMotherField1 !== "" && kallahMotherField2 !== "") {
                  kallahMoms = kallahMotherField2 + " and " + kallahMotherField1
                } else if(kallahMotherField1 !== "" && kallahMotherField2 === "") {
                  kallahMoms = kallahMotherField1
                }
                else if(kallahMotherField1 === "" && kallahMotherField2 !== "") {
                  kallahMoms = kallahMotherField2
                }


          // if (queryCouple.confNum ==  req.query.confNum) {
            // await queryCouple.updateOne({ confirmed: true })
            // await queryCouple.updateOne({ collecting: true })
            //send email to mommy
            console.log("urls")
            const msg = {
              // to: 'aronfriedman98@gmail.com', // bridal shower email
              // to: 'aronfriedman98@gmail.com',
              to: 'bridalshower@detroitbridalshower.org',
              // from: `${req.query.email}`,
              from: 'bridalshower@detroitbridalshower.org',
              subject: 'New Couple Submission',
              html: buildActionEmail(
        'New Couple Submitted',
        `${req.query.chossonName} & ${req.query.kallahName}`,
        emailRows([
          ['Chosson', `${req.query.chossonName} (${req.query.chossonOrigin})`],
          ['Chosson\'s parents', `${chossonDads} ${chossonMoms}`],
          ['Kallah', `${req.query.kallahName} (${req.query.kallahOrigin})`],
          ['Kallah\'s parents', `${kallahDads} ${kallahMoms}`],
          ['Deceased notes', [req.query.chossonDeceased, req.query.kallahDeceased].filter(Boolean).join(' / ')],
          ['Submitted by', req.query.name],
          ['Email', req.query.email],
          ['Phone', req.query.phoneNumber],
          ['Address', req.query.address],
          ['Wedding date', req.query.weddingDate],
          ['Personal shopper', req.query.personalShopper],
          ['Chesed package', chesedPackage]
        ]),
        'Review & Verify Couple',
        verificationURL,
        `Verifying adds the couple to the collection list and announces them. You can also review them on the <a href="${adminURL}" style="color:#b3925a;">dashboard</a>.`
      )
            }
            
            await sgMail.send(msg)
            console.log('Verification email sent')
          // res.render('message', {message: 'Thank you for signing up for our newsletter! Please complete the process by confirming the subscription in your email inbox.'})
        
        // fix chesed package

          // } 
          // else {
          //   throw 'Confirmation number does not match';
          // }
          res.render('message.ejs', { message: 'New couple has been confirmed! Once the couple has been verified the collection will begin.', title: 'Thank you!' });
        }
        else {
          res.render('message.ejs', { message: 'Couple submission was unsuccessful. Please <a href="/">try again.</a>', title: 'Oops!' })
        }
        } catch (error) {
          console.error(error);
          res.render('message.ejs', { message: 'Couple submission was unsuccessful. Please <a href="/">try again.</a>', title: 'Oops!'});
        }
    },
    async verifyCouple(req, res) {
      try{

        console.log("attempting to verify couple")

      
      // const dbCouple = await Couples.find({ confNumber: req.query.confNum })
      // console.log(dbCouple)
      await Couples.updateMany({ confNumber: req.query.confNum }, { $set: { collecting: true, verified: true } })
      console.log(req.query.confNum)
      console.log("couple verified and added to collection list")

      //send collection email to all sendgrid contacts
      // const listID = await getListID('Newsletter Subscribers')

      // console.log("listID: " + listID)

      const databaseCouples = await Couples.find().sort({_id: -1})

      //deal with empty parents

      //were parents entered
      // let isChossonFather = false
      // let isChossonMother = false
      // let isKallahFather = false
      // let isKallahMother = false

      // if(req.query.chossonFatherName !== "") {
      //   isChossonFather = true
      // }
      // if(req.query.chossonMotherName !== "") {
      //   isChossonMother = true
      // }
      // if(req.query.kallahFatherName !== "") {
      //   isKallahFather = true
      // }
      // if(req.query.kallahMotherName !== "") {
      //   isKallahMother = true
      // }

      // //were titles entered
      // let isChossonFatherTitle = false
      // let isChossonMotherTitle = false
      // let isKallahFatherTitle = false
      // let isKallahMotherTitle = false

      // if(req.query.chossonFatherTitle !== "Title" && req.query.chossonFatherTitle !== "") {
      //   isChossonFatherTitle = true
      // }
      // if(req.query.chossonMotherTitle !== "Title" && req.query.chossonMotherTitle !== "") {
      //   isChossonMotherTitle = true
      // }
      // if(req.query.kallahFatherTitle !== "Title" && req.query.kallahFatherTitle !== "") {
      //   isKallahFatherTitle = true
      // }
      // if(req.query.kallahMotherTitle !== "Title" && req.query.kallahMotherTitle !== "") {
      //   isKallahMotherTitle = true
      // }

              //set parent name variables that were filled out
              let chossonFather = ""
              let chossonMotherField1 = ""
              let chossonMotherField2 = ""
              let chossonMotherHusband = ""

              let kallahFather = ""
              let kallahMotherField1 = ""
              let kallahMotherField2 = ""
              let kallahMotherHusband = ""

              //Fathers are easy since those fields are required no matter what
              chossonFather = req.query.chossonFatherTitle + " " + req.query.chossonFatherName
              kallahFather = req.query.kallahFatherTitle + " " + req.query.kallahFatherName

              //Mothers husband is also easy since that optional no matter what
              if(req.query.chossonMotherHusbandName !== "") {
                chossonMotherHusband = req.query.chossonMotherHusbandTitle + " " + req.query.chossonMotherHusbandName
              }
              if(req.query.kallahMotherHusbandName !== "") {
                kallahMotherHusband = req.query.kallahMotherHusbandTitle + " " + req.query.kallahMotherHusbandName
              }

              //deal with mother/husband wife
              if(req.query.chossonMotherDivorcedName !== "") {
                //if the mother is divorced, then motherfield2 is required
                chossonMotherField2 = req.query.chossonMotherDivorcedTitle + " " + req.query.chossonMotherDivorcedName
                //if the mother is divorced, then motherfield1 is not required
                if(req.query.chossonMotherName !== "") {
                  chossonMotherField1 = req.query.chossonMotherTitle + " " + req.query.chossonMotherName
                }
              } else {
                //if the mother is not divorced, then motherfield1 is required
                chossonMotherField1 = req.query.chossonMotherTitle + " " + req.query.chossonMotherName
              }

              if(req.query.kallahMotherDivorcedName !== "") {
                //if the mother is divorced, then motherfield2 is required
                kallahMotherField2 = req.query.kallahMotherDivorcedTitle + " " + req.query.kallahMotherDivorcedName
                //if the mother is divorced, then motherfield1 is not required
                if(req.query.kallahMotherName !== "") {
                  kallahMotherField1 = req.query.kallahMotherTitle + " " + req.query.kallahMotherName
                }
              } else {
                //if the mother is not divorced, then motherfield1 is required
                kallahMotherField1 = req.query.kallahMotherTitle + " " + req.query.kallahMotherName
              }

              
              


        //new couple 
        let newCoupleString = ""

        let isDivorcedChossonSide = false
        let isDivorcedKallahSide = false

        if(req.query.chossonMotherDivorcedName !== "") {
          isDivorcedChossonSide = true
        }
        if(req.query.kallahMotherDivorcedName !== "") {
          isDivorcedKallahSide = true
        }

        // let chossonFatherFNameNew = req.query.chossonFatherName.split(" ").slice(0, -1).join(" ")
        // let kallahFatherFNameNew = req.query.kallahFatherName.split(" ").slice(0, -1).join(" ")

        let chossonFatherFNameNew = req.query.chossonFatherName.split(" ");
        let chossonLastName = chossonFatherFNameNew.pop(); // Remove the last name
        chossonFatherFNameNew = chossonFatherFNameNew.join(" ");

        let chossonMotherFNameNew = req.query.chossonMotherName.split(" ");
        chossonMotherFNameNew.pop(); // Remove the last name
        chossonMotherFNameNew = chossonMotherFNameNew.join(" ");

        let kallahFatherFNameNew = req.query.kallahFatherName.split(" ");
        let kallahLastName = kallahFatherFNameNew.pop(); // Remove the last name
        kallahFatherFNameNew = kallahFatherFNameNew.join(" ");

        let kallahMotherFNameNew = req.query.kallahMotherName.split(" ");
        kallahMotherFNameNew.pop(); // Remove the last name
        kallahMotherFNameNew = kallahMotherFNameNew.join(" ");

        //stepFathers last name
        let chossonStepDadFNameNew = ""
        let stepdadlastname = ""
        if(req.query.chossonMotherHusbandName !== "") {
          chossonStepDadFNameNew = req.query.chossonMotherHusbandName.split(" ")
          stepdadlastname = chossonStepDadFNameNew.pop()
          chossonStepDadFNameNew = chossonStepDadFNameNew.join(" ")
        }
        let chossonDivorcedMotherFNameNew = ""
        if(req.query.chossonMotherDivorcedName !== "") {
          chossonDivorcedMotherFNameNew = req.query.chossonMotherDivorcedName.split(" ")
          chossonDivorcedMotherFNameNew.pop()
          chossonDivorcedMotherFNameNew = chossonDivorcedMotherFNameNew.join(" ")
        }
        //kallah
        let kallahStepDadFNameNew = ""
        let stepdadlastnameKallah = ""
        if(req.query.kallahMotherHusbandName !== "") {
          kallahStepDadFNameNew = req.query.kallahMotherHusbandName.split(" ")
          stepdadlastnameKallah = kallahStepDadFNameNew.pop()
          kallahStepDadFNameNew = kallahStepDadFNameNew.join(" ")
        }
        let kallahDivorcedMotherFNameNew = ""
        if(req.query.kallahMotherDivorcedName !== "") {
          kallahDivorcedMotherFNameNew = req.query.kallahMotherDivorcedName.split(" ")
          kallahDivorcedMotherFNameNew.pop()
          kallahDivorcedMotherFNameNew = kallahDivorcedMotherFNameNew.join(" ")
        }
        
        

        if(req.query.chossonOrigin === 'detroit' && req.query.kallahOrigin === 'detroit') {
          if(isDivorcedChossonSide === false && isDivorcedKallahSide === false) {
          newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> and daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`
          }
          else if(isDivorcedChossonSide && isDivorcedKallahSide === false) {
            if(chossonMotherField1 === "" && chossonMotherHusband === "") { 
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of ${chossonFather} <br> son of ${chossonMotherField2} <br> and daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`
            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband === "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${chossonMotherField2} <br> and daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`
            }
            else if(chossonMotherField1 === "" && chossonMotherHusband !== "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of ${chossonFather} <br> son of ${req.query.chossonMotherHusbandTitle} & ${req.query.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`
            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband !== "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${req.query.chossonMotherHusbandTitle} & ${req.query.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`
            }
          }
          else if(isDivorcedChossonSide === false && isDivorcedKallahSide) {
            if(kallahMotherField1 === "" && kallahMotherHusband === "") {
            newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> and daughter of ${kallahFather} <br> daughter of ${kallahMotherField2} <br> <br>`
            }
            else if(kallahMotherField1 !== "" && kallahMotherHusband === "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> and daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${kallahMotherField2} <br> <br>`
            }
            else if(kallahMotherField1 === "" && kallahMotherHusband !== "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> and daughter of ${kallahFather} <br> daughter of ${req.query.kallahMotherHusbandTitle} & ${req.query.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
            }
            else if(kallahMotherField1 !== "" && kallahMotherHusband !== "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> and daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${req.query.kallahMotherHusbandTitle} & ${req.query.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
            }
          }
          else if(isDivorcedChossonSide && isDivorcedKallahSide) {
            if(chossonMotherField1 === "" && chossonMotherHusband === "" && kallahMotherField1 === "" && kallahMotherHusband === "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong><br> son of ${chossonFather} <br> son of ${chossonMotherField2} <br> and daughter of ${kallahFather} <br> daughter of ${kallahMotherField2} <br> <br>`
            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband === "" && kallahMotherField1 === "" && kallahMotherHusband === "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong><br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${chossonMotherField2} <br> and daughter of ${kallahFather} <br> daughter of ${kallahMotherField2} <br> <br>`
            }
            else if(chossonMotherField1 === "" && chossonMotherHusband !== "" && kallahMotherField1 === "" && kallahMotherHusband === "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong><br> son of ${chossonFather} <br> son of ${req.query.chossonMotherHusbandTitle} & ${req.query.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} and ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${kallahFather} <br> daughter of ${kallahMotherField2} <br> <br>`
            }
            else if(chossonMotherField1 === "" && chossonMotherHusband === "" && kallahMotherField1 !== "" && kallahMotherHusband === "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong><br> son of ${chossonFather} <br> son of ${chossonMotherField2} <br> and daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${kallahMotherField2} <br> <br>`
            }
            else if(chossonMotherField1 === "" && chossonMotherHusband === "" && kallahMotherField1 === "" && kallahMotherHusband !== "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong><br> son of ${chossonFather} <br> son of ${chossonMotherField2} <br> and daughter of ${kallahFather} <br> daughter of ${req.query.kallahMotherHusbandTitle} & ${req.query.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband !== "" && kallahMotherField1 === "" && kallahMotherHusband === "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong><br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${req.query.chossonMotherHusbandTitle} & ${req.query.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} and ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${kallahFather} <br> daughter of ${kallahMotherField2} <br> <br>`
            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband === "" && kallahMotherField1 !== "" && kallahMotherHusband !== "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong><br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${chossonMotherField2} <br> and daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${req.query.kallahMotherHusbandTitle} & ${req.query.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
            }
            else if(chossonMotherField1 === "" && chossonMotherHusband !== "" && kallahMotherField1 !== "" && kallahMotherHusband !== "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong><br> son of ${chossonFather} <br> son of ${req.query.chossonMotherHusbandTitle} & ${req.query.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} and ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${req.query.kallahMotherHusbandTitle} & ${req.query.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
            }
            //more variations FIX LAST NAMES FOR ALL GROUPED COUPLES
            else if(chossonMotherField1 !== "" && chossonMotherHusband !== "" && kallahMotherField1 !== "" && kallahMotherHusband === "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong><br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName}<br> son of ${req.query.chossonMotherHusbandTitle} & ${req.query.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} and ${chossonDivorcedMotherFNameNew} ${stepdadlastname}<br> and daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName}<br> daughter of ${kallahMotherField2}<br> <br>`
            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband !== "" && kallahMotherField1 === "" && kallahMotherHusband !== "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong><br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName}<br> son of ${req.query.chossonMotherHusbandTitle} & ${req.query.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} and ${chossonDivorcedMotherFNameNew} ${stepdadlastname}<br> and daughter of ${kallahFather} <br> daughter of ${req.query.kallahMotherHusbandTitle} & ${req.query.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah}<br> <br>`
            }
            else if(chossonMotherField1 === "" && chossonMotherHusband !== "" && kallahMotherField1 === "" && kallahMotherHusband !== "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong><br> son of ${chossonFather} <br> son of ${req.query.chossonMotherHusbandTitle} & ${req.query.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} and ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${kallahFather} <br> daughter of ${req.query.kallahMotherHusbandTitle} & ${req.query.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah}<br> <br>`
            }
            else if(chossonMotherField1 === "" && chossonMotherHusband === "" && kallahMotherField1 !== "" && kallahMotherHusband !== "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong><br> son of ${chossonFather} <br> son of ${chossonMotherField2} <br> and daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} & ${kallahMotherFNameNew} ${kallahLastName}<br> daughter of ${req.query.kallahMotherHusbandTitle} & ${req.query.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah}<br> <br>`
            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband !== "" && kallahMotherField1 !== "" && kallahMotherHusband !== "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong><br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} & ${chossonMotherFNameNew} ${chossonLastName}<br> son of ${req.query.chossonMotherHusbandTitle} & ${req.query.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname}<br> and daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} & ${kallahMotherFNameNew} ${kallahLastName}<br> daughter of ${req.query.kallahMotherHusbandTitle} & ${req.query.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah}<br> <br>`
            }
            else if(chossonMotherField1 === "" && chossonMotherHusband !== "" && kallahMotherField1 !== "" && kallahMotherHusband === "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of ${chossonFather} <br> son of ${req.query.chossonMotherHusbandTitle} & ${req.query.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} and ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} & ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${kallahMotherField2} <br> <br>`
            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband === "" && kallahMotherField1 === "" && kallahMotherHusband !== "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} & ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${chossonMotherField2} <br> and daughter of ${kallahFather} <br> daughter of daughter of ${req.query.kallahMotherHusbandTitle} & ${req.query.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband === "" && kallahMotherField1 !== "" && kallahMotherHusband === "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} ${chossonMotherFNameNew} ${chossonLastName}<br> son of ${chossonMotherField2} <br> and daughter of ${kallahFather} <br> daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} ${kallahMotherFNameNew} ${kallahLastName}<br> daughter of ${kallahMotherField2} <br> <br>`
            }

          }
        }
        else if(req.query.chossonOrigin === 'detroit') {
          if(isDivorcedChossonSide === false) {
          newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} & ${chossonMotherFNameNew} ${chossonLastName} <br> <br>`
          }
          else if(isDivorcedChossonSide) {
            if(chossonMotherField1 === "" && chossonMotherHusband === "") { 
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br>  son of ${chossonFather} <br> son of ${chossonMotherField2} <br> <br>`
            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband === "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong>  <br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} & ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${chossonMotherField2} <br> <br>`
            }
            else if(chossonMotherField1 === "" && chossonMotherHusband !== "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong>  <br> son of ${chossonFather} <br> son of ${req.query.chossonMotherHusbandTitle} & ${req.query.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> <br>`
            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband !== "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong>  <br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} & ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${req.query.chossonMotherHusbandTitle} & ${req.query.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> <br>`
            }
        }
      }
        
        else if(req.query.kallahOrigin === 'detroit') {
          if(isDivorcedKallahSide === false) {
            newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`
          }
          else if(isDivorcedKallahSide) {
            if(kallahMotherField1 === "" && kallahMotherHusband === "") {
            newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong>  <br> daughter of ${kallahFather} <br> daughter of ${kallahMotherField2} <br> <br>`
            }
            else if(kallahMotherField1 !== "" && kallahMotherHusband === "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong>  <br> daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} & ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${kallahMotherField2} <br> <br>`
            }
            else if(kallahMotherField1 === "" && kallahMotherHusband !== "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong>  <br> daughter of ${kallahFather} <br> daughter of ${req.query.kallahMotherHusbandTitle} & ${req.query.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
            }
            else if(kallahMotherField1 !== "" && kallahMotherHusband !== "") {
              newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong>  <br> daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} & ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${req.query.kallahMotherHusbandTitle} & ${req.query.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
            }
          }
        }
        

          

            
          

      //both from detroit
        // if(req.query.chossonOrigin === 'detroit' && req.query.kallahOrigin === 'detroit') {
        //   if(isChossonFather && isChossonMother && isKallahFather && isKallahMother && isChossonFatherTitle && isChossonMotherTitle && isKallahFatherTitle && isKallahMotherTitle) {
        //     newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${req.query.chossonMotherName} <br> and daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} and ${req.query.kallahMotherName} <br> <br>`
        //   }
        //   else if(isChossonFather && isChossonMother && isKallahFather && isKallahMother && isChossonFatherTitle === false && isChossonMotherTitle && isKallahFatherTitle && isKallahMotherTitle) {
        //     newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of Mr. & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${req.query.chossonMotherName} <br> and daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} and ${req.query.kallahMotherName} <br> <br>`
        //   }
        //   else if(isChossonFather && isChossonMother && isKallahFather && isKallahMother && isChossonFatherTitle && isChossonMotherTitle === false && isKallahFatherTitle && isKallahMotherTitle) {
        //     newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of ${req.query.chossonFatherTitle} & Mrs. ${chossonFatherFNameNew} and ${req.query.chossonMotherName} <br> and daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} and ${req.query.kallahMotherName} <br> <br>`
        //   }
        //   else if(isChossonFather && isChossonMother && isKallahFather && isKallahMother && isChossonFatherTitle && isChossonMotherTitle && isKallahFatherTitle === false && isKallahMotherTitle) {
        //     newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${req.query.chossonMotherName} <br> and daughter of Mr. & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} and ${req.query.kallahMotherName} <br> <br>`
        //   }
        //   else if(isChossonFather && isChossonMother && isKallahFather && isKallahMother && isChossonFatherTitle && isChossonMotherTitle && isKallahFatherTitle && isKallahMotherTitle === false) {
        //     newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${req.query.chossonMotherName} <br> and daughter of ${req.query.kallahFatherTitle} & Mrs. ${kallahFatherFNameNew} and ${req.query.kallahMotherName} <br> <br>`
        //   }
        //   else if(isChossonFather && isChossonMother && isKallahFather && isKallahMother) {
        //     newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of Mr. & Mrs. ${chossonFatherFNameNew} and ${req.query.chossonMotherName} <br> and daughter of Mr. & Mrs. ${kallahFatherFNameNew} and ${req.query.kallahMotherName} <br> <br>`
        //   }
        //   else if(isChossonFather && isChossonMother && isKallahFather) {
            
        //   }
        // }
        // //chosson from detroit
        // else if(req.query.chossonOrigin === 'detroit') {
        //   if(isChossonFather && isChossonMother && isChossonFatherTitle && isChossonMotherTitle) {
        //     newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to ${req.query.kallahName} <br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${req.query.chossonMotherName} <br> <br>`
        //   }
        //   else if(isChossonFather && isChossonMother && isChossonFatherTitle === false && isChossonMotherTitle) {
        //     newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to ${req.query.kallahName} <br> son of Mr. & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${req.query.chossonMotherName} <br> <br>`
        //   }
        //   else if(isChossonFather && isChossonMother && isChossonFatherTitle && isChossonMotherTitle === false) {
        //     newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to ${req.query.kallahName} <br> son of ${req.query.chossonFatherTitle} & Mrs. ${chossonFatherFNameNew} and ${req.query.chossonMotherName} <br> <br>`
        //   }
        //   else if(isChossonFather && isChossonMother) {
        //     newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to ${req.query.kallahName} <br> son of Mr. & Mrs. ${chossonFatherFNameNew} and ${req.query.chossonMotherName} <br> <br>`
        //   }
        // }
        // //kallah from detroit
        // else {
        //   if(isKallahFather && isKallahMother && isKallahFatherTitle && isKallahMotherTitle) {
        //     newCoupleString += `<strong>${req.query.kallahName}</strong> is engaged to ${req.query.chossonName} <br> daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} and ${req.query.kallahMotherName} <br> <br>`
        //   }
        //   else if(isKallahFather && isKallahMother && isKallahFatherTitle === false && isKallahMotherTitle) {
        //     newCoupleString += `<strong>${req.query.kallahName}</strong> is engaged to ${req.query.chossonName} <br> daughter of Mr. & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} and ${req.query.kallahMotherName} <br> <br>`
        //   }
        //   else if(isKallahFather && isKallahMother && isKallahFatherTitle && isKallahMotherTitle === false) {
        //     newCoupleString += `<strong>${req.query.kallahName}</strong> is engaged to ${req.query.chossonName} <br> daughter of ${req.query.kallahFatherTitle} & Mrs. ${kallahFatherFNameNew} and ${req.query.kallahMotherName} <br> <br>`
        //   }
        //   else if(isKallahFather && isKallahMother){
        //     newCoupleString += `<strong>${req.query.kallahName}</strong> is engaged to ${req.query.chossonName} <br> daughter of Mr. & Mrs. ${kallahFatherFNameNew} and ${req.query.kallahMotherName} <br> <br>`
        //   }
        // }

        console.log("new couple string: " + newCoupleString)

           //set parent name variables that were filled out
           let chossonFather1 = ""
           let chossonMotherField11 = ""
           let chossonMotherField21 = ""
           let chossonMotherHusband1 = ""

           let kallahFather1 = ""
           let kallahMotherField11 = ""
           let kallahMotherField21 = ""
           let kallahMotherHusband1 = ""


        //couples still collecting for
        let couplesString = ""

        
        let isDivorcedChossonSide1 = false
        let isDivorcedKallahSide1 = false

        for(let i = 1; i < databaseCouples.length; i++) {

          if (databaseCouples[i].collecting === true) {

            

        
            if(databaseCouples[i].chossonMotherDivorcedName !== "") {
              isDivorcedChossonSide1 = true
            }
            if(databaseCouples[i].kallahMotherDivorcedName !== "") {
              isDivorcedKallahSide1 = true
            }


             
                //Fathers are easy since those fields are required no matter what
                chossonFather1 = databaseCouples[i].chossonFatherTitle + " " + databaseCouples[i].chossonFatherName
                kallahFather1 = databaseCouples[i].kallahFatherTitle + " " + databaseCouples[i].kallahFatherName
  
                //Mothers husband is also easy since that optional no matter what
                if(databaseCouples[i].chossonMotherHusbandName !== "") {
                  chossonMotherHusband1 = databaseCouples[i].chossonMotherHusbandTitle + " " + databaseCouples[i].chossonMotherHusbandName
                }
                if(databaseCouples[i].kallahMotherHusbandName !== "") {
                  kallahMotherHusband1 = databaseCouples[i].kallahMotherHusbandTitle + " " + databaseCouples[i].kallahMotherHusbandName
                }
  
                //deal with mother/husband wife
                if(databaseCouples[i].chossonMotherDivorcedName !== "") {
                  //if the mother is divorced, then motherfield2 is required
                  chossonMotherField21 = databaseCouples[i].chossonMotherDivorcedTitle + " " + databaseCouples[i].chossonMotherDivorcedName
                  //if the mother is divorced, then motherfield1 is not required
                  if(databaseCouples[i].chossonMotherName !== "") {
                    chossonMotherField11 = databaseCouples[i].chossonMotherTitle + " " + databaseCouples[i].chossonMotherName
                  }
                } else {
                  //if the mother is not divorced, then motherfield1 is required
                  chossonMotherField11 = databaseCouples[i].chossonMotherTitle + " " + databaseCouples[i].chossonMotherName
                }
  
                if(databaseCouples[i].kallahMotherDivorcedName !== "") {
                  //if the mother is divorced, then motherfield2 is required
                  kallahMotherField21 = databaseCouples[i].kallahMotherDivorcedTitle + " " + databaseCouples[i].kallahMotherDivorcedName
                  //if the mother is divorced, then motherfield1 is not required
                  if(databaseCouples[i].kallahMotherName !== "") {
                    kallahMotherField11 = databaseCouples[i].kallahMotherTitle + " " + databaseCouples[i].kallahMotherName
                  }
                } else {
                  //if the mother is not divorced, then motherfield1 is required
                  kallahMotherField11 = databaseCouples[i].kallahMotherTitle + " " + databaseCouples[i].kallahMotherName
                }
  
                
                
  
  


            let chossonFatherFName = databaseCouples[i].chossonFatherName.split(" ")
            let chossonLastNameOld = chossonFatherFName.pop(); // Remove the last name
            chossonFatherFName = chossonFatherFName.join(" ");

            let kallahFatherFName = databaseCouples[i].kallahFatherName.split(" ")
            let kallahLastNameOld = kallahFatherFName.pop(); // Remove the last name
            kallahFatherFName = kallahFatherFName.join(" ");

            let chossonMotherFName = databaseCouples[i].chossonMotherName.split(" ")
            chossonMotherFName.pop(); // Remove the last name
            chossonMotherFName = chossonMotherFName.join(" ");

            let kallahMotherFName = databaseCouples[i].kallahMotherName.split(" ")
            kallahMotherFName.pop(); // Remove the last name
            kallahMotherFName = kallahMotherFName.join(" ");
            
            //stepFathers last name
    let chossonStepDadFNameOld = ""
    let stepdadlastnameOld = ""
    if(databaseCouples[i].chossonMotherHusbandName !== "") {
      chossonStepDadFNameOld = databaseCouples[i].chossonMotherHusbandName.split(" ")
      stepdadlastnameOld = chossonStepDadFNameOld.pop()
      chossonStepDadFNameOld = chossonStepDadFNameOld.join(" ")
    }
    let chossonDivorcedMotherFNameOld = ""
    if(databaseCouples[i].chossonMotherDivorcedName !== "") {
      chossonDivorcedMotherFNameOld = databaseCouples[i].chossonMotherDivorcedName.split(" ")
      chossonDivorcedMotherFNameOld.pop()
      chossonDivorcedMotherFNameOld = chossonDivorcedMotherFNameOld.join(" ")
    }
    //kallah
    let kallahStepDadFNameOld = ""
    let stepdadlastnameOldKallah = ""
    if(databaseCouples[i].kallahMotherHusbandName !== "") {
      kallahStepDadFNameOld = databaseCouples[i].kallahMotherHusbandName.split(" ")
      stepdadlastnameOldKallah = kallahStepDadFNameOld.pop()
      kallahStepDadFNameOld = kallahStepDadFNameOld.join(" ")
    }
    let kallahDivorcedMotherFNameOld = ""
    if(databaseCouples[i].kallahMotherDivorcedName !== "") {
      kallahDivorcedMotherFNameOld = databaseCouples[i].kallahMotherDivorcedName.split(" ")
      kallahDivorcedMotherFNameOld.pop()
      kallahDivorcedMotherFNameOld = kallahDivorcedMotherFNameOld.join(" ")
    }

    if(databaseCouples[i].chossonOrigin === 'detroit' && databaseCouples[i].kallahOrigin === 'detroit') {
      if(isDivorcedChossonSide1 === false && isDivorcedKallahSide1 === false) {
        couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong> <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & ${chossonMotherFName} ${chossonLastNameOld} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} & ${kallahMotherFName} ${kallahLastNameOld} <br> <br>`
      }
      else if(isDivorcedChossonSide1 && isDivorcedKallahSide1 === false) {
        if(chossonMotherField11 === "" && chossonMotherHusband1 === "") { 
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong> <br> son of ${chossonFather1} <br> son of ${chossonMotherField21} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} & ${kallahMotherFName} ${kallahLastNameOld} <br> <br>`
        }
        else if(chossonMotherField11 !== "" && chossonMotherHusband1 === "") {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong> <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & ${chossonMotherFName} ${chossonLastNameOld} <br> son of ${chossonMotherField21} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} & ${kallahMotherFName} ${kallahLastNameOld} <br> <br>`
        }
        else if(chossonMotherField11 === "" && chossonMotherHusband1 !== "") {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong> <br> son of ${chossonFather1} <br> son of ${databaseCouples[i].chossonMotherHusbandTitle} & ${databaseCouples[i].chossonMotherDivorcedTitle} ${chossonStepDadFNameOld} & ${chossonDivorcedMotherFNameOld} ${stepdadlastnameOld} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} and ${kallahMotherFName} ${kallahLastNameOld} <br> <br>`
        }
        else if(chossonMotherField11 !== "" && chossonMotherHusband1 !== "")
        {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong> <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & ${chossonMotherFName} ${chossonLastNameOld} <br> son of ${databaseCouples[i].chossonMotherHusbandTitle} & ${databaseCouples[i].chossonMotherDivorcedTitle} ${chossonStepDadFNameOld} & ${chossonDivorcedMotherFNameOld} ${stepdadlastnameOld} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} and ${kallahMotherFName} ${kallahLastNameOld} <br> <br>`
        }
      }
      else if(isDivorcedChossonSide1 === false && isDivorcedKallahSide1) {
        if(kallahMotherField11 === "" && kallahMotherHusband1 === "") {
        couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong> <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & {chossonMotherFName} ${chossonLastNameOld} <br> and daughter of ${kallahFather1} <br> daughter of ${kallahMotherField21} <br> <br>`
        }
        else if(kallahMotherField11 !== "" && kallahMotherHusband1 === "") {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong> <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & ${chossonMotherFName} ${chossonLastNameOld} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} & ${kallahMotherFName} ${kallahLastNameOld} <br> daughter of ${kallahMotherField21} <br> <br>`
        }
        else if(kallahMotherField11 === "" && kallahMotherHusband1 !== "") {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong> <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & ${chossonMotherFName} ${chossonLastNameOld} <br> and daughter of ${kallahFather1} <br> daughter of ${databaseCouples[i].kallahMotherHusbandTitle} & ${databaseCouples[i].kallahMotherDivorcedTitle} ${kallahStepDadFNameOld} & ${kallahDivorcedMotherFNameOld} ${stepdadlastnameOldKallah} <br> <br>`
        }
        else if(kallahMotherField11 !== "" && kallahMotherHusband1 !== "") {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong> <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & ${chossonMotherFName} ${chossonLastNameOld} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} & ${kallahMotherFNameNew} ${kallahLastNameOld} <br> daughter of ${databaseCouples[i].kallahMotherHusbandTitle} & ${databaseCouples[i].kallahMotherDivorcedTitle} ${kallahStepDadFNameOld} & ${kallahDivorcedMotherFNameOld} ${stepdadlastnameOldKallah} <br> <br>`
        }
      }
      else if(isDivorcedChossonSide1 && isDivorcedKallahSide1) {
        if(chossonMotherField11 === "" && chossonMotherHusband1 === "" && kallahMotherField11 === "" && kallahMotherHusband1 === "") {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong><br> son of ${chossonFather1} <br> son of ${chossonMotherField21} <br> and daughter of ${kallahFather1} <br> daughter of ${kallahMotherField21} <br> <br>`
        }
        else if(chossonMotherField11 !== "" && chossonMotherHusband1 === "" && kallahMotherField11 === "" && kallahMotherHusband1 === "") {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong><br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & ${chossonMotherFName} ${chossonLastNameOld} <br> son of ${chossonMotherField21} <br> and daughter of ${kallahFather1} <br> daughter of ${kallahMotherField21} <br> <br>`
        }
        else if(chossonMotherField11 === "" && chossonMotherHusband1 !== "" && kallahMotherField11 === "" && kallahMotherHusband1 === "") {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong><br> son of ${chossonFather1} <br> son of ${databaseCouples[i].chossonMotherHusbandTitle} & ${databaseCouples[i].chossonMotherDivorcedTitle} ${chossonStepDadFNameOld} & ${chossonDivorcedMotherFNameOld} ${stepdadlastnameOld} <br> and daughter of ${kallahFather} <br> daughter of ${kallahMotherField21} <br> <br>`
        }
        else if(chossonMotherField11 !== "" && chossonMotherHusband1 !== "" && kallahMotherField11 === "" && kallahMotherHusband1 === "") {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong><br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & ${chossonMotherFName} ${chossonLastNameOld} <br> son of ${databaseCouples[i].chossonMotherHusbandTitle} & ${databaseCouples[i].chossonMotherDivorcedTitle} ${chossonStepDadFNameOld} & ${chossonDivorcedMotherFNameOld} ${stepdadlastnameOld} <br> and daughter of ${kallahFather1} <br> daughter of ${kallahMotherField21} <br> <br>`
        }
        else if(chossonMotherField11 === "" && chossonMotherHusband1 === "" && kallahMotherField11 !== "" && kallahMotherHusband1 === "")
        {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong><br> son of ${chossonFather1} <br> son of ${chossonMotherField21} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} & ${kallahMotherFName} ${kallahLastNameOld} <br> daughter of ${kallahMotherField21} <br> <br>`
        }
        else if(chossonMotherField11 !== "" && chossonMotherHusband1 === "" && kallahMotherField11 !== "" && kallahMotherHusband1 === "")
        {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong><br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & ${chossonMotherFName} ${chossonLastNameOld} <br> son of ${chossonMotherField21} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} & ${kallahMotherFName} ${kallahLastNameOld} <br> daughter of ${kallahMotherField21} <br> <br>`
        }
        else if(chossonMotherField11 === "" && chossonMotherHusband1 !== "" && kallahMotherField11 !== "" && kallahMotherHusband1 === "")
        {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong><br> son of ${chossonFather1} <br> son of ${databaseCouples[i].chossonMotherHusbandTitle} & ${databaseCouples[i].chossonMotherDivorcedTitle} ${chossonStepDadFNameOld} & ${chossonDivorcedMotherFNameOld} ${stepdadlastnameOld} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} & ${kallahMotherFName} ${kallahLastNameOld} <br> daughter of ${kallahMotherField21} <br> <br>`
        }
        else if(chossonMotherField11 !== "" && chossonMotherHusband1 !== "" && kallahMotherField11 !== "" && kallahMotherHusband1 === "")
        {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong><br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & ${chossonMotherFName} ${chossonLastNameOld} <br> son of ${databaseCouples[i].chossonMotherHusbandTitle} & ${databaseCouples[i].chossonMotherDivorcedTitle} ${chossonStepDadFNameOld} & ${chossonDivorcedMotherFNameOld} ${stepdadlastnameOld} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} & ${kallahMotherFName} ${kallahLastNameOld} <br> daughter of ${kallahMotherField21} <br> <br>`
        }
        //more variations
        else if(chossonMotherField11 === "" && chossonMotherHusband1 === "" && kallahMotherField11 === "" && kallahMotherHusband1 !== "") { //fix last names for all grouped couples
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong><br> son of ${chossonFather1} <br> son of ${chossonMotherField21} <br> and daughter of ${kallahFather1} <br> daughter of ${databaseCouples[i].kallahMotherHusbandTitle} & ${databaseCouples[i].kallahMotherDivorcedTitle} ${kallahStepDadFNameOld} & ${kallahDivorcedMotherFNameOld} ${stepdadlastnameOldKallah} <br> <br>`
        }
        else if(chossonMotherField11 !== "" && chossonMotherHusband1 === "" && kallahMotherField11 === "" && kallahMotherHusband1 !== "") {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong><br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & ${chossonMotherFName} ${chossonLastNameOld} <br> son of ${chossonMotherField21} <br> and daughter of ${kallahFather1} <br> daughter of ${databaseCouples[i].kallahMotherHusbandTitle} & ${databaseCouples[i].kallahMotherDivorcedTitle} ${kallahStepDadFNameOld} & ${kallahDivorcedMotherFNameOld} ${stepdadlastnameOldKallah} <br> <br>`
        }
        else if(chossonMotherField11 === "" && chossonMotherHusband1 !== "" && kallahMotherField11 === "" && kallahMotherHusband1 !== "") {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong><br> son of ${chossonFather1} <br> son of ${databaseCouples[i].chossonMotherHusbandTitle} & ${databaseCouples[i].chossonMotherDivorcedTitle} ${chossonStepDadFNameOld} & ${chossonDivorcedMotherFNameOld} ${stepdadlastnameOld} <br> and daughter of ${kallahFather1} <br> daughter of ${databaseCouples[i].kallahMotherHusbandTitle} & ${databaseCouples[i].kallahMotherDivorcedTitle} ${kallahStepDadFNameOld} & ${kallahDivorcedMotherFNameOld} ${stepdadlastnameOldKallah} <br> <br>`
        }
        else if(chossonMotherField11 !== "" && chossonMotherHusband1 !== "" && kallahMotherField11 === "" && kallahMotherHusband1 !== "") {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong><br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & ${chossonMotherFName} ${chossonLastNameOld} <br> son of ${databaseCouples[i].chossonMotherHusbandTitle} & ${databaseCouples[i].chossonMotherDivorcedTitle} ${chossonStepDadFNameOld} & ${chossonDivorcedMotherFNameOld} ${stepdadlastnameOld} <br> and daughter of ${kallahFather1} <br> daughter of ${databaseCouples[i].kallahMotherHusbandTitle} & ${databaseCouples[i].kallahMotherDivorcedTitle} ${kallahStepDadFNameOld} & ${kallahDivorcedMotherFNameOld} ${stepdadlastnameOldKallah} <br> <br>`
        }
        else if(chossonMotherField11 === "" && chossonMotherHusband1 === "" && kallahMotherField11 !== "" && kallahMotherHusband1 !== "")
        {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong><br> son of ${chossonFather1} <br> son of ${chossonMotherField21} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} & ${kallahMotherFName} ${kallahLastNameOld} <br> daughter of  ${databaseCouples[i].kallahMotherHusbandTitle} & ${databaseCouples[i].kallahMotherDivorcedTitle} ${kallahStepDadFNameOld} & ${kallahDivorcedMotherFNameOld} ${stepdadlastnameOldKallah} <br> <br>`
        }
        else if(chossonMotherField11 !== "" && chossonMotherHusband1 === "" && kallahMotherField11 !== "" && kallahMotherHusband1 !== "")
        {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong><br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & ${chossonMotherFName} ${chossonLastNameOld} <br> son of ${chossonMotherField21} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} & ${kallahMotherFName} ${kallahLastNameOld} <br> daughter of ${databaseCouples[i].kallahMotherHusbandTitle} & ${databaseCouples[i].kallahMotherDivorcedTitle} ${kallahStepDadFNameOld} & ${kallahDivorcedMotherFNameOld} ${stepdadlastnameOldKallah} <br> <br>`
        }
        else if(chossonMotherField11 === "" && chossonMotherHusband1 !== "" && kallahMotherField11 !== "" && kallahMotherHusband1 !== "")
        {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong><br> son of ${chossonFather1} <br> son of ${databaseCouples[i].chossonMotherHusbandTitle} & ${databaseCouples[i].chossonMotherDivorcedTitle} ${chossonStepDadFNameOld} & ${chossonDivorcedMotherFNameOld} ${stepdadlastnameOld} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} & ${kallahMotherFName} ${kallahLastNameOld} <br> daughter of ${databaseCouples[i].kallahMotherHusbandTitle} & ${databaseCouples[i].kallahMotherDivorcedTitle} ${kallahStepDadFNameOld} & ${kallahDivorcedMotherFNameOld} ${stepdadlastnameOldKallah} <br> <br>`
        }
        else if(chossonMotherField11 !== "" && chossonMotherHusband1 !== "" && kallahMotherField11 !== "" && kallahMotherHusband1 !== "")
        {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong><br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & ${chossonMotherFName} ${chossonLastNameOld} <br> son of ${databaseCouples[i].chossonMotherHusbandTitle} & ${databaseCouples[i].chossonMotherDivorcedTitle} ${chossonStepDadFNameOld} & ${chossonDivorcedMotherFNameOld} ${stepdadlastnameOld} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} & ${kallahMotherFName} ${kallahLastNameOld} <br> daughter of ${databaseCouples[i].kallahMotherHusbandTitle} & ${databaseCouples[i].kallahMotherDivorcedTitle} ${kallahStepDadFNameOld} & ${kallahDivorcedMotherFNameOld} ${stepdadlastnameOldKallah} <br> <br>`
        }
      }
    }
    else if(databaseCouples[i].chossonOrigin === 'detroit') {
      if(isDivorcedChossonSide1 === false) {
        couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to ${databaseCouples[i].kallahName} <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} and ${chossonMotherFName} ${chossonLastNameOld} <br> <br>`
      }
      else if(isDivorcedChossonSide1) {
        if(chossonMotherField11 === "" && chossonMotherHusband1 === "") { 
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to ${databaseCouples[i].kallahName} <br> son of ${chossonFather1} <br> son of ${chossonMotherField21} <br> <br>`
        }
        else if(chossonMotherField11 !== "" && chossonMotherHusband1 === "") {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to ${databaseCouples[i].kallahName} <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & ${chossonMotherFName} ${chossonLastNameOld} <br> son of ${chossonMotherField21} <br> <br>`
        }
        else if(chossonMotherField11 === "" && chossonMotherHusband1 !== "") {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to ${databaseCouples[i].kallahName} <br> son of ${chossonFather1} <br> son of ${databaseCouples[i].chossonMotherHusbandTitle} & ${databaseCouples[i].chossonMotherDivorcedTitle} ${chossonStepDadFNameOld} & ${chossonDivorcedMotherFNameOld} ${stepdadlastnameOld} <br> <br>`
        }
        else if(chossonMotherField11 !== "" && chossonMotherHusband1 !== "")
        {
          couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to ${databaseCouples[i].kallahName} <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & ${chossonMotherFName} ${chossonLastNameOld} <br> son of ${databaseCouples[i].chossonMotherHusbandTitle} & ${databaseCouples[i].chossonMotherDivorcedTitle} ${chossonStepDadFNameOld} & ${chossonDivorcedMotherFNameOld} ${stepdadlastnameOld} <br> <br>`
        }
      }
    }
    else {
      if(isDivorcedKallahSide1 === false) {
        couplesString += `<strong>${databaseCouples[i].kallahName}</strong> is engaged to ${databaseCouples[i].chossonName} <br> daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} & ${kallahMotherFName} ${kallahLastNameOld} <br> <br>`
      }
      else if(isDivorcedKallahSide1) {
        if(kallahMotherField11 === "" && kallahMotherHusband1 === "") {
        couplesString += `<strong>${databaseCouples[i].kallahName}</strong> is engaged to ${databaseCouples[i].chossonName} <br> daughter of ${kallahFather1} <br> daughter of ${kallahMotherField21} <br> <br>`
        }
        else if(kallahMotherField11 !== "" && kallahMotherHusband1 === "") {
          couplesString += `<strong>${databaseCouples[i].kallahName}</strong> is engaged to ${databaseCouples[i].chossonName} <br> daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} & ${kallahMotherFName} ${kallahLastNameOld} <br> daughter of ${kallahMotherField21} <br> <br>`
        }
        else if(kallahMotherField11 === "" && kallahMotherHusband1 !== "") {
          couplesString += `<strong>${databaseCouples[i].kallahName}</strong> is engaged to ${databaseCouples[i].chossonName} <br> daughter of ${kallahFather1} <br> daughter of ${databaseCouples[i].kallahMotherHusbandTitle} & ${databaseCouples[i].kallahMotherDivorcedTitle} ${kallahStepDadFNameOld} & ${kallahDivorcedMotherFNameOld} ${stepdadlastnameOldKallah} <br> <br>`
        }
        else if(kallahMotherField11 !== "" && kallahMotherHusband1 !== "") {
          couplesString += `<strong>${databaseCouples[i].kallahName}</strong> is engaged to ${databaseCouples[i].chossonName} <br> daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} & ${kallahMotherFName} ${kallahLastNameOld} <br> daughter of ${databaseCouples[i].kallahMotherHusbandTitle} & ${databaseCouples[i].kallahMotherDivorcedTitle} ${kallahStepDadFNameOld} & ${kallahDivorcedMotherFNameOld} ${stepdadlastnameOldKallah} <br> <br>`
        }
      }
    }
          }
        }
        



            

        //     if(databaseCouples[i].chossonOrigin === 'detroit' && databaseCouples[i].kallahOrigin === 'detroit') {
        //         couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong> <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} and ${databaseCouples[i].chossonMother} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} and ${databaseCouples[i].kallahMother} <br> <br>`
        //       }
        //     else if(databaseCouples[i].chossonOrigin === 'detroit') {
        //         couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to ${databaseCouples[i].kallahName} <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} and ${databaseCouples[i].chossonMother} <br> <br>`
        //       }
        //     else {
        //         couplesString += `<strong>${databaseCouples[i].kallahName}</strong> is engaged to ${databaseCouples[i].chossonName} <br> daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} and ${databaseCouples[i].kallahMother} <br> <br>`
        //       }
        //   }
        // }
        console.log("couplesString: " + couplesString)

        //unsubscribe code

        const unsubscribeURL = process.env.AZURE_URL + '/unsubscribe'

      const collectionEmail = buildCollectionEmail(newCoupleString, couplesString, unsubscribeURL)

      const personalCollectionEmail = buildPersonalCollectionEmail(newCoupleString)

      const instructionsEmail = buildInstructionsEmail()

console.log("email created")

const instructionsMsg = {
to: req.query.email, // bridal shower email
from: `bridalshower@detroitbridalshower.org`,
subject: 'Instructions Email',
html: instructionsEmail
}

console.log("email created")

const msg = {
  to: req.query.email, // bridal shower email
  from: `bridalshower@detroitbridalshower.org`,
  subject: 'Personal Collection Email',
  html: personalCollectionEmail
}

//update announcement page
const newwCouple = new NewCouple(
  {
    chosson: req.query.chossonName,
    kallah: req.query.kallahName,
    chossonFatherTitle: req.query.chossonFatherTitle,
    chossonFather : req.query.chossonFatherName,
    chossonMotherTitle: req.query.chossonMotherTitle,
    chossonMother: req.query.chossonMotherName,
    chossonOrigin: req.query.chossonOrigin,
    kallahFatherTitle: req.query.kallahFatherTitle,
    kallahFather: req.query.kallahFatherName,
    kallahMotherTitle: req.query.kallahMotherTitle,
    kallahMother: req.query.kallahMotherName,
    kallahOrigin: req.query.kallahOrigin,
    email: req.query.email,
    phoneNumber: req.query.phoneNumber,
    tempId: req.query._id
  }
)
await newwCouple.save()
console.log('saved new couple')

const count = await NewCouple.countDocuments();

if (count > 1) {
await NewCouple.findOneAndDelete({}, { sort: { _id: 1 } });
}

console.log("preparing to send email")
await sgMail.send(instructionsMsg)
console.log("instructions email sent")
await sgMail.send(msg)

// await sendNewsletterToList(req, collectionEmail, listID)

// const emails = await Emails.find({})
// console.log(emails.length)

// const recipients = emails.map((email) => email.email);
// console.log(recipients)

            
//               const newsletter = {
//                 to: recipients,
//                 from: 'bridalshower@detroitbridalshower.org',
//                 subject: 'Newsletter',
//                 html: collectionEmail
//               };

//               sgMail.sendMultiple(newsletter);

const emails = await Emails.find({});
console.log(emails.length);

const recipients = emails.map((email) => email.email);
console.log(recipients);

const batchSize = 1000;

// Split recipients into batches
const batches = [];
while (recipients.length > 0) {
  batches.push(recipients.splice(0, batchSize));
}

// Function to send emails for a batch
const sendEmailBatch = async (batch) => {
  const newsletter = {
    to: batch,
    from: 'bridalshower@detroitbridalshower.org',
    subject: 'Newsletter',
    html: collectionEmail,
  };

  try {
    await sgMail.sendMultiple(newsletter);
    console.log(`Successfully sent ${batch.length} emails.`);
  } catch (error) {
    console.error(`Error sending emails: ${error.message}`);
    // You may want to add additional error handling or retry logic here
  }
};

// Send emails in batches
for (const batch of batches) {
  await sendEmailBatch(batch);
}

console.log('All emails sent successfully.');





res.render('message.ejs', {title: 'Success!', message: 'Collection email has been mailed out!'})

    }
  
    catch(err){
      res.render('message.ejs', {title: 'Oops!', message: 'Something went wrong!'})
      
    }

    }
}


