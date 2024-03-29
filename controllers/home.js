const Email = require('../models/emailList')
const Couples = require('../models/couplesList')
const Announcements = require('../models/newAnnouncements')
const NewCouple = require('../models/newCouple')
const mailMod = require("../mailMod")
const nodemailer = require("nodemailer")

const sgMail = require('@sendgrid/mail')
const sgClient = require('@sendgrid/client')
const expressFileUpload = require('express-fileupload')

sgMail.setApiKey(process.env.API_KEY)
sgClient.setApiKey(process.env.API_KEY)

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
              from: "aronfriedman98@gmail.com", // Change to your verified sender
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
      //////////////////////////////////////

        try {

          // send confirmation email with sendgrid
          const confNum = Math.floor(Math.random() * 90000) + 10000
          const params = new URLSearchParams({
            conf_num: confNum,
            email: req.body.email
          })
          const confirmationURL = req.protocol + '://' + req.get('host') + '/confirm?' + params
          // const unsubscribeURL = req.protocol + '://' + req.get('host') + '/unsubscribe?' + params
          console.log('Confirmation URL = '+confirmationURL);
          const msg = {
            to: req.body.email,
            from: 'aronfriedman98@gmail.com',
            subject: 'Confirm your subscription to Detroit Bridal Shower',
            html: ` <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
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
                          .heading {
                              font-size: 30px !important;
                        }
                      </style>
                          <!--user entered Head Start--><link href="https://fonts.googleapis.com/css?family=Muli&display=swap" rel="stylesheet"><style>
                    body {font-family: 'Muli', sans-serif;}
                    </style><!--End Head user entered-->
                        </head>
                        <body>
                          <center class="wrapper" data-link-color="#1188E6" data-body-style="font-size:14px; font-family:inherit; color:#000000; background-color:#FFFFFF;">
                            <div class="webkit">
                              <table cellpadding="0" cellspacing="0" border="0" width="100%" class="wrapper" bgcolor="#FFFFFF">
                                <tr>
                                  <td valign="top" bgcolor="#FFFFFF" width="100%">
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
                      </table><table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:30px 20px 30px 20px;" bgcolor="#f6f6f6" data-distribution="1">
                        <tbody>
                          <tr role="module-content">
                            <td height="100%" valign="top"><table width="540" style="width:540px; border-spacing:0; border-collapse:collapse; margin:0px 10px 0px 10px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor="" class="column column-0">
                          <tbody>
                            <tr>
                              <td style="padding:0px;margin:0px;border-spacing:0;"><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="72aac1ba-9036-4a77-b9d5-9a60d9b05cba">
                        <tbody>
                          <tr>
                            <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="center">
                              <!--<img class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px;" width="29" alt="" data-proportionally-constrained="true" data-responsive="false" src="http://cdn.mcauto-images-production.sendgrid.net/954c252fedab403f/9200c1c9-b1bd-47ed-993c-ee2950a0f239/29x27.png" height="27">-->
                            </td>
                          </tr>
                        </tbody>
                      </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="331cde94-eb45-45dc-8852-b7dbeb9101d7">
                        <tbody>
                          <tr>
                            <td style="padding:0px 0px 20px 0px;" role="module-content" bgcolor="">
                            </td>
                          </tr>
                        </tbody>
                      </table><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="d8508015-a2cb-488c-9877-d46adf313282">
                        <tbody>
                          <tr>
                            <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="center">
                              <!--<img class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px;" width="95" alt="" data-proportionally-constrained="true" data-responsive="false" src="http://cdn.mcauto-images-production.sendgrid.net/954c252fedab403f/61156dfa-7b7f-4020-85f8-a586addf4288/95x33.png" height="33">-->
                            </td>
                          </tr>
                        </tbody>
                      </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="27716fe9-ee64-4a64-94f9-a4f28bc172a0">
                        <tbody>
                          <tr>
                            <td style="padding:0px 0px 30px 0px;" role="module-content" bgcolor="">
                            </td>
                          </tr>
                        </tbody>
                      </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="948e3f3f-5214-4721-a90e-625a47b1c957" data-mc-module-version="2019-10-22">
                        <tbody>
                          <tr>
                            <td style="padding:50px 30px 18px 30px; line-height:36px; text-align:inherit; background-color:#ffffff;" height="100%" valign="top" bgcolor="#ffffff" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="font-size: 43px;" class="heading">Thank you for subscribing!</span></div><div></div></div></td>
                          </tr>
                        </tbody>
                      </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="a10dcb57-ad22-4f4d-b765-1d427dfddb4e" data-mc-module-version="2019-10-22">
                        <tbody>
                          <tr>
                            <td style="padding:18px 30px 18px 30px; line-height:22px; text-align:inherit; background-color:#ffffff;" height="100%" valign="top" bgcolor="#ffffff" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="font-size: 18px">Please verify your email address to</span><span style="color: #000000; font-size: 18px; font-family: arial, helvetica, sans-serif"> get added to the mailing list</span><span style="font-size: 18px">.</span></div><br>
                    <div style="font-family: inherit; text-align: center"><span style="color: darkblue; font-size: 18px"><strong></strong></span></div><div></div></div></td>
                          </tr>
                        </tbody>
                      </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="7770fdab-634a-4f62-a277-1c66b2646d8d">
                        <tbody>
                          <tr>
                            <td style="padding:0px 0px 20px 0px;" role="module-content" bgcolor="#ffffff">
                            </td>
                          </tr>
                        </tbody>
                      </table><table border="0" cellpadding="0" cellspacing="0" class="module" data-role="module-button" data-type="button" role="module" style="table-layout:fixed;" width="100%" data-muid="d050540f-4672-4f31-80d9-b395dc08abe1">
                          <tbody>
                            <tr>
                              <td align="center" bgcolor="#ffffff" class="outer-td" style="padding:0px 0px 0px 0px; background-color:#ffffff;">
                                <table border="0" cellpadding="0" cellspacing="0" class="wrapper-mobile" style="text-align:center;">
                                  <tbody>
                                    <tr>
                                    <td align="center" class="inner-td" style="border-radius:6px; font-size:16px; text-align:center; background-color;">
                                      <a href="${confirmationURL}" style="background-color:lightblue !important; border: transparent !important; border-radius:5px; border-width:1px; color:#000000; display:inline-block; font-size:14px; font-weight:normal; letter-spacing:0px; line-height:normal; padding:12px 40px 12px 40px; text-align:center; text-decoration:none; border-style:solid; font-family:inherit;" target="_blank">Verify Email Now</a><br><br><br>
                                    </td>
                                    </tr>
                                  </tbody>
                                </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="7770fdab-634a-4f62-a277-1c66b2646d8d.1">
                                <tbody>
                                  <tr>
                                    <td style="padding:0px 0px 50px 0px;" role="module-content" bgcolor="#ffffff">
                                    </td>
                                  </tr>
                                </tbody>
                              </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="a265ebb9-ab9c-43e8-9009-54d6151b1600" data-mc-module-version="2019-10-22">
                              </table></table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="c37cc5b7-79f4-4ac8-b825-9645974c984e">
                                <tbody>
                                  <tr>
                                    
                                    
                                  </tr>
                                </tbody>
                              </table></td>
                                    </tr>
                                  </tbody>
                                </table></td>
                                  </tr>
                                </tbody>
                              </table> 
                                  <tbody>
                                    <tr>
                                      <td align="center" bgcolor="" class="outer-td" style="padding:0px 0px 20px 0px;">
                                        <table border="0" cellpadding="0" cellspacing="0" class="wrapper-mobile" style="text-align:center;">
                                          <tbody>
                                            <tr>
                                            
                                            </tr>
                                          </tbody>
                                        </table>
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
                                          
                                    
                                    </div>
                                  </center>
                                </body>
                              </html>
                    `
          }
          await addContact(req.body.email, confNum)
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
        const contact = await getContactByEmail(req.query.email);
        if(contact == null) throw `Contact not found.`;
        if (contact.custom_fields.conf_num ==  req.query.conf_num) {
          const listID = await getListID('Newsletter Subscribers');
          await addContactToList(req.query.email, listID);
        } else {
          throw 'Confirmation number does not match';
        }
        res.render('message.ejs', { title: 'Thank you!', message: 'You are now subscribed to our newsletter. We can\'t wait for you to hear from us!' });
      } catch (error) {
        console.error(error);
        res.render('message.ejs', { title: 'Thank you!', message: 'Subscription was unsuccessful. Please <a href="/">try again.</a>' });
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


        if(req.body.name === "" || req.body.phoneNumber === "" || req.body.email === "" || req.body.address === "" || req.body.chossonName === "" || req.body.chossonOrigin === "" || req.body.kallahName === "" || req.body.kallahOrigin === "") {
          return res.json({
            status : false,
            title : 'Oops!',
            message: 'You have missing fields. Please fill out the required fields.'
          })
        }

      
    try {
      const confNum = Math.floor(Math.random() * 90000) + 10000
      
        // res.redirect("/")

        function toUpper(str) {
          return str
              .toLowerCase()
              .split(' ')
              .map(function(word) {
                  return word[0].toUpperCase() + word.substr(1);
              })
              .join(' ');
           }
        
        // send confirmation email with sendgrid
        //capitalize the first letter of the user inputs
        let name = toUpper(req.body.name)
        let chossonName = toUpper(req.body.chossonName)
        let kallahName = toUpper(req.body.kallahName)
        let chossonFatherTitle = "Mr."
        let chossonMotherTitle = "Mrs."
        let kallahFatherTitle = ""
        let kallahMotherTitle = ""
        let chossonFatherName = ""
        let chossonMotherName = ""
        let kallahFatherName = ""
        let kallahMotherName = ""

        console.log(name)

        if(req.body.chossonFatherTitle !== "Title") {
          chossonFatherTitle = req.body.chossonFatherTitle
        }
        if(req.body.chossonMotherTitle !== "Title") {
          chossonMotherTitle = req.body.chossonMotherTitle
        }
        if(req.body.kallahFatherTitle !== "Title") {
          kallahFatherTitle = req.body.kallahFatherTitle
        }
        if(req.body.kallahMotherTitle !== "Title") {
          kallahMotherTitle = req.body.kallahMotherTitle
        }
        if(req.body.chossonFatherName !== "") {
          chossonFatherName = toUpper(req.body.chossonFatherName)
        }
        if(req.body.chossonMotherName !== "") {
          chossonMotherName = toUpper(req.body.chossonMotherName)
        }
        if(req.body.kallahFatherName !== "") {
          kallahFatherName = toUpper(req.body.kallahFatherName)
        }
        if(req.body.kallahMotherName !== "") {
          kallahMotherName = toUpper(req.body.kallahMotherName)
        }
        
        const params = new URLSearchParams({
          name: name,
          email: req.body.email,
          phoneNumber: req.body.phoneNumber,
          address: req.body.address,
          chossonName: chossonName,
          chossonFatherTitle: chossonFatherTitle,
          chossonFatherName: chossonFatherName,
          chossonMotherTitle: chossonMotherTitle,
          chossonMotherName: chossonMotherName,
          chossonOrigin: req.body.chossonOrigin,
          kallahName: kallahName,
          kallahFatherTitle: kallahFatherTitle,
          kallahFatherName: kallahFatherName,
          kallahMotherTitle: kallahMotherTitle,
          kallahMotherName: kallahMotherName,
          kallahOrigin: req.body.kallahOrigin,
          weddingDate: req.body.weddingDate,
          personalShopper: req.body.personalShopper,
          // chesedPackage: req.body.chesedPackage,
          confNum: confNum
        })
        const confirmationURL = req.protocol + '://' + req.get('host') + '/confirmEntry?' + params

        
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

                        // console.log('chesedPackage: ', chesedPackage)

        const msg = {
          to: req.body.email,
          from: 'aronfriedman98@gmail.com',
          subject: 'Confirm your subscription to Detroit Bridal Shower',
          html: `<!DOCTYPE html>

          <html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
          <head>
          <title></title>
          <meta content="text/html; charset=utf-8" http-equiv="Content-Type"/>
          <meta content="width=device-width, initial-scale=1.0" name="viewport"/><!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]--><!--[if !mso]><!-->
          <link href="https://fonts.googleapis.com/css?family=Cabin" rel="stylesheet" type="text/css"/><!--<![endif]-->
          <style>
              * {
                box-sizing: border-box;
              }
          
              body {
                margin: 0;
                padding: 0;
              }
          
              a[x-apple-data-detectors] {
                color: inherit !important;
                text-decoration: inherit !important;
              }
          
              #MessageViewBody a {
                color: inherit;
                text-decoration: none;
              }
          
              p {
                line-height: inherit
              }
          
              .desktop_hide,
              .desktop_hide table {
                mso-hide: all;
                display: none;
                max-height: 0px;
                overflow: hidden;
              }
          
              .image_block img+div {
                display: none;
              }
          
              @media (max-width:670px) {
                .desktop_hide table.icons-inner {
                  display: inline-block !important;
                }
          
                .icons-inner {
                  text-align: center;
                }
          
                .icons-inner td {
                  margin: 0 auto;
                }
          
                .row-content {
                  width: 100% !important;
                }
          
                .mobile_hide {
                  display: none;
                }
          
                .stack .column {
                  width: 100%;
                  display: block;
                }
          
                .mobile_hide {
                  min-height: 0;
                  max-height: 0;
                  max-width: 0;
                  overflow: hidden;
                  font-size: 0px;
                }
          
                .desktop_hide,
                .desktop_hide table {
                  display: table !important;
                  max-height: none !important;
                }
              }
            </style>
          </head>
          <body style="background-color: #fbfbfb; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
          <table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%"></td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: ;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 15px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-left:10px;padding-right:10px;padding-top:25px;">
          <div style="font-family: sans-serif">
          <div class="" style="font-size: 14px; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 16.8px; color: #6b7066; line-height: 1.2;">
          <p style="margin: 0; font-size: 30px; text-align: center; mso-line-height-alt: 36px;"><strong><span style="font-size:38px;">Thank you for your submission, ${name}!</span></strong></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-left:10px;padding-right:10px;padding-top:10px;">
          <div style="font-family: sans-serif">
          <div class="" style="font-size: 14px; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 21px; color: #6b7066; line-height: 1.5;">
          <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 33px;"><span style="font-size:22px;color:#6b7066;">Please confirm that all the information is correct.</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          <div class="spacer_block block-3" style="height:60px;line-height:60px;font-size:1px;"> </div>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f0f8ff; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Chosson:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${chossonName}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-4" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #e8f1f9; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Chosson's Father:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${chossonFatherTitle} ${chossonFatherName}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-5" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f0f8ff; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Chosson's Mother:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${chossonMotherTitle} ${chossonMotherName}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-6" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #e8f1f9; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Chosson's Hometown:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.body.chossonOrigin}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-7" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f0f8ff; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Kallah:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${kallahName}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-8" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #e8f1f9; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Kallah's Father:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${kallahFatherTitle} ${kallahFatherName}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-9" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f0f8ff; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">kallah's Mother:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${kallahMotherTitle} ${kallahMotherName}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-10" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #e8f1f9; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Kallah's Hometown:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.body.kallahOrigin}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-11" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f0f8ff; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Phone Number:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.body.phoneNumber}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-12" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #e8f1f9; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Email:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.body.email}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-13" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f0f8ff; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Address:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.body.address}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-14" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #e8f1f9; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Wedding Date:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.body.weddingDate}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-15" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f0f8ff; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Personal Shopper:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.body.personalShopper}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-16" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #e8f1f9; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Detroit Chesed Package:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${chesedPackage}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-17" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 650px;" width="650"><br><br>
          <tbody>
        <tr>
          <td align="center" bgcolor="#ffffff" class="outer-td" style="padding:0px 0px 0px 0px; background-color:#ffffff;">
            <table border="0" cellpadding="0" cellspacing="0" class="wrapper-mobile" style="text-align:center;">
              <tbody>
                <tr>
                <td align="center" bgcolor="#6b7066" class="inner-td" style="border-radius:6px; font-size:16px; text-align:center; background-color:inherit;">
                  <a href="${confirmationURL}" style="background-color: #6b7066; border:1px solid #6b7066; border-color:#6b7066; border-radius:4px; border-width:1px; color:white; display:inline-block; font-size:14px; font-weight:normal; letter-spacing:0px; line-height:normal; padding:12px 40px 12px 40px; text-align:center; text-decoration:none; border-style:solid; font-family:inherit;" target="_blank">Confirm</a>
                </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-18" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
          <div class="spacer_block block-1" style="height:30px;line-height:30px;font-size:1px;"> </div>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-19" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #6b7066" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #6b7066; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 20px; padding-top: 15px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
          <table border="0" cellpadding="10" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad">
          <div style="font-family: sans-serif">
          <div class="" style="font-size: 14px; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 25.2px; color: #ffffff; line-height: 1.8;">
          <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 25.2px;">Detroit Bridal Shower</p>
          <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 25.2px;"><a href="http://www.example.com/" rel="noopener" style="text-decoration: underline; color: #ffffff;" target="_blank">www.detroitBridalShower.com</a></p>
          <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 25.2px;">bridalshower@detroitbridalshower.org<a href="http://www.example.com/" rel="noopener" style="text-decoration: none; color: #ffffff;" target="_blank"></a></p>
          <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 25.2px;"><strong>17322 Goldwin Dr. Southfield, MI 48075</strong></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-20" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
          <table border="0" cellpadding="0" cellspacing="0" class="icons_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad" style="vertical-align: middle; color: #9d9d9d; font-family: inherit; font-size: 15px; padding-bottom: 5px; padding-top: 5px; text-align: center;">
          <table cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="alignment" style="vertical-align: middle; text-align: center;"><!--[if vml]><table align="left" cellpadding="0" cellspacing="0" role="presentation" style="display:inline-block;padding-left:0px;padding-right:0px;mso-table-lspace: 0pt;mso-table-rspace: 0pt;"><![endif]-->
          <!--[if !vml]><!-->
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table><!-- End -->
          </body>
          </html>
          `
        }
        
        
        await sgMail.send(msg)
        console.log('email sent')

        //save to database
        const newCouple = new Couples(
          {
              chossonName: chossonName,
              chossonFatherTitle: chossonFatherTitle,
              chossonFather: chossonFatherName,
              chossonMotherTitle: chossonMotherTitle,
              chossonMother: chossonMotherName,
              chossonOrigin: req.body.chossonOrigin,
              kallahName: kallahName,
              kallahFatherTitle: kallahFatherTitle,
              kallahFather: kallahFatherName,
              kallahMotherTitle: kallahMotherTitle,
              kallahMother: kallahMotherName,
              kallahOrigin: req.body.kallahOrigin,
              name: name,
              email: req.body.email,
              phoneNumber: req.body.phoneNumber,
              address: req.body.address,
              weddingDate: req.body.weddingDate,
              personalShopper: req.body.personalShopper,
              confNumber : confNum
          }
      )
          await newCouple.save()
          console.log(req.body)


        return res.json({
          status : true,
          title : 'Thank You!',
          message: 'You have been sent an email for confirmation. Please open your email and confirm the submission.'
        })

        const databaseCouples = await Couples.find().sort({_id: -1})


        //new couple 
        let newCoupleString = ""

        let chossonFatherFNameNew = req.body.chossonFatherName.split(" ").slice(0, -1).join(" ")
        let kallahFatherFNameNew = req.body.kallahFatherName.split(" ").slice(0, -1).join(" ")

        if(req.body.chossonOrigin === 'detroit' && req.body.kallahOrigin === 'detroit') {
            newCoupleString += `<strong>${req.body.chossonName}</strong> is engaged to <strong>${req.body.kallahName}</strong> <br> son of ${req.body.chossonFatherTitle} & ${req.body.chossonMotherTitle} ${chossonFatherFNameNew} and ${req.body.chossonMotherName} <br> and daughter of ${req.body.kallahFatherTitle} & ${req.body.kallahMotherTitle} ${kallahFatherFNameNew} and ${req.body.kallahMotherName} <br> <br>`
        }
        else if(req.body.chossonOrigin === 'detroit') {
            newCoupleString += `<strong>${req.body.chossonName}</strong> is engaged to ${req.body.kallahName} <br> son of ${req.body.chossonFatherTitle} & ${req.body.chossonMotherTitle} ${chossonFatherFNameNew} and ${req.body.chossonMotherName} <br> <br>`
        }
        else {
            newCoupleString += `<strong>${req.body.kallahName}</strong> is engaged to ${req.body.chossonName} <br> daughter of ${req.body.kallahFatherTitle} & ${req.body.kallahMotherTitle} ${kallahFatherFNameNew} and ${req.body.kallahMotherName} <br> <br>`
        }

        //couples still collecting for
        let couplesString = ""


        for(let i = 1; i < databaseCouples.length; i++) {

          if (databaseCouples[i].collecting === true) {


            let chossonFatherFName = databaseCouples[i].chossonFather.split(" ").slice(0, -1).join(" ")
            let kallahFatherFName = databaseCouples[i].kallahFather.split(" ").slice(0, -1).join(" ")

            if(databaseCouples[i].chossonOrigin === '1' && databaseCouples[i].kallahOrigin === '1') {
                couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong> <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} and ${databaseCouples[i].chossonMother} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} and ${databaseCouples[i].kallahMother} <br> <br>`
              }
            else if(databaseCouples[i].chossonOrigin === '1') {
                couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to ${databaseCouples[i].kallahName} <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} and ${databaseCouples[i].chossonMother} <br> <br>`
              }
            else {
                couplesString += `<strong>${databaseCouples[i].kallahName}</strong> is engaged to ${databaseCouples[i].chossonName} <br> daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} and ${databaseCouples[i].kallahMother} <br> <br>`
              }
          }
        }

                    //nodemailer

                    let chossonHometown = ""
                    let kallahHometown = ""

                    if(req.body.chossonOrigin === '1') {
                        chossonHometown = "Detroit"
                    }
                    else {
                        chossonHometown = "Out of town"
                    }
                    if(req.body.kallahorigin === '1') {
                        kallahHometown = "Detroit"
                    } {
                        kallahHometown = "Out of town"
                    }

                    async function sendNodemailer() {

                        const transporter = nodemailer.createTransport({
                            service: "hotmail",
                            auth: {
                                user: "lyftscooter@outlook.com",
                                pass: "scooterLyft98"
                            }
                        })

                        let chesedPackage = " "
                        if(req.body.toaster === 'Toaster') {
                          chesedPackage += `${req.body.toaster}, `
                        }
                        if(req.body.urn === 'Urn') {
                          chesedPackage += `${req.body.urn}, `
                        }
                        if(req.body.kitchenTowels === 'Kitchen towels') {
                          chesedPackage += `${req.body.kitchenTowels}, `
                        }
                        if(req.body.vacuum === 'Vacuum') {
                          chesedPackage += `${req.body.vacuum}, `
                        }
                        if(req.body.cholentPot === 'Cholent pot') {
                          chesedPackage += `${req.body.cholentPot}`
                        }
                    
                        const info = await transporter.sendMail({
                            from: 'Detroit Bridal Shower Update <lyftscooter@outlook.com>',
                            to: 'afriedman@woodmontcollege.edu',
                            subject: 'New Couple Submission',
                            html: ` <p>
                                    <strong>Chosson:</strong> ${req.body.chossonName} <br>
                                    <strong>Chosson's Father:</strong> ${req.body.chossonFatherTitle} ${req.body.chossonFatherName} <br>
                                    <strong>Chosson's Mother:</strong> ${req.body.chossonMotherTitle} ${req.body.chossonMotherName} <br>
                                    <strong>Chosson's hometown:</strong> ${chossonHometown} <br><br>
                                    <strong>Kallah:</strong> ${req.body.kallahName} <br>
                                    <strong>Kallah's Father:</strong> ${req.body.kallahFatherTitle} ${req.body.kallahFatherName} <br>
                                    <strong>Kallah's Mother:</strong> ${req.body.kallahMotherTitle} ${req.body.kallahMotherName} <br>
                                    <strong>Kallah's hometown:</strong> ${kallahHometown} <br><br>
                                    <strong>Address:</strong> ${req.body.address} <br>
                                    <strong>Email:</strong> ${req.body.email} <br>
                                    <strong>Wedding Date:</strong> ${req.body.weddingDate} <br>
                                    <strong>Personal Shopper:</strong> ${req.body.personalShopper}<br>
                                    <strong>Detroit Chesed Package:</strong>
                                    ${chesedPackage}
                                    </p>
                            `
                            // ,
                            // attachements: [{
                            //     filename: 'bridalshowerpic.png',
                            //     filePath: __dirname + './public/assets/images/bridalshowerpic.png',
                            //     cid: 'logo'
                            // }]
                        })
                    }
        
        
                    sendNodemailer()


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
            
            const emailDB = await Email.find()

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
            const message = {
                to: 'aronfriedman98@gmail.com',
                // to: emailDB,
                // [
                //     'aronfriedman98@gmail.com',
                //     'afriedman@woodmontcollege.edu'
                //     ]
                    
                // from: 'lyftscooter@outlook.com',
                from: {
                    name: 'Detroit Bridal Shower Test',
                    email: 'lyftscooter@outlook.com'
                },
                subject: 'Testing sendgrid',
                text: 'testing sendgrid',
                
                html: `<style type="text/css">
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
                  .questions {
                    color: gray !important;
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
                <center class="wrapper" data-link-color="#1188E6" data-body-style="font-size:14px; font-family:inherit; color:#000000; background-color:#e5dcd2;">
        <div class="webkit">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" class="wrapper" bgcolor="#e5dcd2">
            <tr>
              <td valign="top" bgcolor="#e5dcd2" width="100%">
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
  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="ecb815cc-87bc-4a3f-a334-040d110516dc" data-mc-module-version="2019-10-22">
    <tbody>
      <tr>
        <td style="padding:5px 5px 5px 0px; line-height:20px; text-align:inherit; background-color:#e5dcd2;" height="100%" valign="top" bgcolor="#e5dcd2" role="module-content"><div><div style="font-family: inherit; text-align: right"><a href="{{Weblink}}"><span style="font-size: 10px; color: #6f6860"><u>View this email in your browser.</u></span></a></div><div></div></div></td>
      </tr>
    </tbody>
  </table><table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:30px 0px 30px 0px;" bgcolor="#ffecea" data-distribution="1" >
    <tbody>
      <tr role="module-content">
        <td height="100%" valign="top"><table width="600" style="width:600px; border-spacing:0; border-collapse:collapse; margin:0px 0px 0px 0px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor="" class="column column-0">
      <tbody>
        <tr>
          <td style="padding:0px;margin:0px;border-spacing:0;"><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="c7fa172a-cdbf-4e85-ac82-60844b32dd62">
    <tbody>
      <tr>
        <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="center">
          <!--<img class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px;" width="122" alt="" data-proportionally-constrained="true" data-responsive="false" src="http://cdn.mcauto-images-production.sendgrid.net/954c252fedab403f/f47c415b-9be7-460c-a6a8-e5194758419a/122x10.png" height="10">-->
        </td>
      </tr>
    </tbody>
  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="594ac2bc-2bb0-4642-8002-a8c9b543d125" data-mc-module-version="2019-10-22">
    <tbody>
      <tr>
        <td style="padding:30px 0px 0px 0px; line-height:16px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="color: #80817f; font-size: 25px; line-height: 30px;">Baruch Hashem for simchos!</span></div><br>
<div style="font-family: inherit; text-align: center"><span style="color: #80817f; font-size: 14px; ">We are so fortunate for all the future Chosson and Kallahs from our community.<br> This is an updated list from {date}. Please check if there are any additions and <br>if you would like to participate in these bridal showers.</span></div>
<div style="font-family: inherit; text-align: center"><span style="color: #80817f; font-size: 10px"></span></div><div></div></div></td>
      </tr>
    </tbody>
  </table></td>
        </tr>
      </tbody>
    </table></td>
      </tr>
    </tbody>
  </table><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="cb31e9b8-b045-4c38-a478-ed2a6e2dc166">
    <tbody>
      <tr>
        <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="center">
          <!--<img class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px;" width="600" alt="" data-proportionally-constrained="true" data-responsive="false" src="http://cdn.mcauto-images-production.sendgrid.net/954c252fedab403f/4ad091f2-00dc-4c89-9ad8-1d7aeaf169c2/600x189.png" height="189">-->
        </td>
      </tr>
    </tbody>
  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="8fd711e6-aecf-4663-bf53-6607f08b57e9" data-mc-module-version="2019-10-22">
    <tbody>
      <tr>
        <td style="background-image: url('https://images.creativemarket.com/0.1.0/ps/4534176/300/200/m2/fpc/wm0/k0ibwifz5orspls3xqbbradq4ldxtu8wvd9nn1iuft9xdl9rssmyu8lockzqowvm-.jpg?1527764336&s=d964aab856967c268b97aa3a69c39b49'); background-repeat: repeat; padding:40px 0px 50px 0px; line-height:22px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="color: #80817f; font-size: 18px"><strong>New Chosson/Kallah:</strong></span></div>
<div style="font-family: inherit; text-align: center"><br></div>
<div style="font-family: inherit; text-align: center"><span style="color: #80817f; font-size: 16px">

${newCoupleString} <br> <br>

<div style="font-family: inherit; text-align: center"><span style="color: #80817f; font-size: 16px">Still collecting for: <br> <br> ${couplesString}

</span></div><div></div></div></td>
      </tr>
    </tbody>
  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="8fd711e6-aecf-4663-bf53-6607f08b57e9.1" data-mc-module-version="2019-10-22">
  <div style="font-family: inherit; text-align: center; margin-top: 20px;"><span style="color: #80817f; font-size: 14px; ">Participation is $65.00 per shower, although if that is too difficult, <br>any amount is accepted. <br>Please send a reply email specifying and confirming which shower<br> you would like to participate in and send payment through <br>one of the following methods: <br> <br></span></div>
    <tbody>
      <tr>
        <td style="padding:0px 40px 40px 40px; line-height:22px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: inherit"><span style="color: #80817f; font-size: 14px"><strong>PayPal:</strong></span><span style="color: #80817f; font-size: 14px"> beckyfriedman1@gmail.com <br>(avoid fees: choose the friends and family option)<br><br></span></div>
<div style="font-family: inherit; text-align: inherit"><span style="color: #80817f; font-size: 14px"><strong>Venmo:</strong></span><span style="color: #80817f; font-size: 14px"> @Becky-Friedman-8</span></div><br>
<div style="font-family: inherit; text-align: inherit"><span style="color: #80817f; font-size: 14px"><strong>Zelle:</strong></span><span style="color: #80817f; font-size: 14px"> beckyfriedman1@gmail.com</span></div><br>
<div style="font-family: inherit; text-align: inherit"><span style="color: #80817f; font-size: 14px"><strong>Check: </strong></span><span style="color: #80817f; font-size: 14px">mailed and made out to: <br> Detroit Bridal Shower Project <br> 17322 Goldwin Drive <br> Southfield, MI 48075</span></div><div></div></div></td>
      </tr>
    </tbody>
  </table><table class="module" role="module" data-type="divider" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="c614d8b1-248a-48ea-a30a-8dd0b2c65e10">
  <div style="font-family: inherit; text-align: center"><span class="questions" style="color: white; font-size: 13px; ">All the collections will be used to start off the <br>Chosson and Kallah with all household basics. <br> <br></span></div>
  
  
  <!--  <tbody>-->
    
  <!--    <tr>-->
      
  <!--      <td style="padding:0px 40px 0px 40px;" role="module-content" height="100%" valign="top" bgcolor="">-->
        
  <!--        <table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" height="2px" style="line-height:2px; font-size:2px;">-->
  <!--          <tbody>-->
  <!--            <tr>-->
  <!--              <td style="padding:0px 0px 2px 0px;" bgcolor="#80817f"></td>-->
  <!--            </tr>-->
  <!--          </tbody>-->
  <!--        </table>-->
  <!--      </td>-->
  <!--    </tr>-->
  <!--  </tbody>-->
    
  <!--</table><table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:0px 40px 0px 40px;" bgcolor="#FFFFFF" data-distribution="1,1,1">-->
  <!--  <tbody>-->
  <!--    <tr role="module-content">-->
  <!--      <td height="100%" valign="top"><table width="173" style="width:173px; border-spacing:0; border-collapse:collapse; margin:0px 0px 0px 0px;" cellpadding="0" cellspacing="0" align="center" border="0" bgcolor="" class="column column-0">-->
  <!--    <tbody>-->
  <!--      <tr>-->
  <!--        <td style="padding:0px;margin:0px;border-spacing:0;"><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="64573b96-209a-4822-93ec-5c5c732af15c" data-mc-module-version="2019-10-22">-->
          
  <!--  <tbody>-->
  <!--    <tr>-->
  <!--      <td style="padding:0px 0px 15px 0px; line-height:0px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="color: #80817f; font-size: 12px"><strong></strong></span></div><div></div></div></td>-->
  <!--    </tr>-->
  <!--  </tbody>-->
  <!--</table></td>-->
  <!--      </tr>-->
  <!--    </tbody>-->
  <!--  </table><table width="173" style="width:173px; border-spacing:0; border-collapse:collapse; margin:0px 0px 0px 0px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor="" class="column column-1">-->
  <!--    <tbody>-->
  <!--      <tr>-->
  <!--        <td style="padding:0px;margin:0px;border-spacing:0;"><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="64573b96-209a-4822-93ec-5c5c732af15c.1" data-mc-module-version="2019-10-22">-->
          
  <!--  <tbody>-->
  <!--    <tr>-->
  <!--      <td style=""><div><div style="font-family: inherit; text-align: center"><span style="color: #80817f; font-size: 12px"></strong></span></div><div></div></div></td>-->
  <!--    </tr>-->
  <!--  </tbody>-->
  <!--</table></td>-->
  <!--      </tr>-->
  <!--    </tbody>-->
  <!--  </table><table width="173" style="width:173px; border-spacing:0; border-collapse:collapse; margin:0px 0px 0px 0px;" cellpadding="0" cellspacing="0" align="" border="0" bgcolor="" class="column column-2">-->
  <!--    <tbody>-->
  <!--      <tr>-->
  <!--        <td style="padding:0px;margin:0px;border-spacing:0;"><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="64573b96-209a-4822-93ec-5c5c732af15c.1.1" data-mc-module-version="2019-10-22">-->
  <!--  <tbody>-->
  <!--    <tr>-->
  <!--      <td style="padding:15px 0px 15px 0px; line-height:22px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="color: #80817f; font-size: 12px"></strong></span></div><div></div></div></td>-->
        
        
  <!--    </tr>-->
  <!--  </tbody>-->
  <!--</table></td>-->
  <!--      </tr>-->
  <!--    </tbody>-->
  <!--  </table></td>-->
  <!--    </tr>-->
  <!--  </tbody>-->
  <!--</table><table class="module" role="module" data-type="divider" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="c614d8b1-248a-48ea-a30a-8dd0b2c65e10.1">-->
  <!--  <tbody>-->
  <!--    <tr>-->
  <!--      <td style="padding:0px 40px 0px 40px;" role="module-content" height="100%" valign="top" bgcolor="">-->
  <!--        <table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" height="2px" style="line-height:2px; font-size:2px;">-->
  <!--          <tbody>-->
  <!--            <tr>-->
  <!--              <td style="padding:0px 0px 2px 0px;" bgcolor="#80817f"></td>-->
  <!--            </tr>-->
  <!--          </tbody>-->
  <!--        </table>-->
  <!--      </td>-->
  <!--    </tr>-->
  <!--  </tbody>-->
  <!--</table><table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:0px 40px 0px 40px;" bgcolor="#FFFFFF" data-distribution="1,1,1">-->
  
  <hr><br>
  <div style="font-family: inherit; text-align: center;"><span class="questions" style="color: white; font-size: 13px;">If you would like to add a new couple to the bridal shower list please visit our website <a href="">here.</a> <br> You can also view the announcements on our website. <br> <br>If you have any questions or concerns,<br> please reach out to <a style="color: grey; text-decoration: underline;"href="mailto:bridalshower@detroitbridalshower.org">bridalshower@detroitbridalshower.org</a> or visit the website <a href="">link</a>.</span></div> <br>
  
  <div style="font-family: inherit; text-align: center;"><span style="color: white; font-size: 13px;"class="questions">We should continue to hear of many more simchas!</a></span></div>
  <br><br>
  <div style="font-family: inherit; text-align: center;"><span style="color: white; font-size: 13px;" class="questions">Becky Friedman</a></span></div> <br> <br>
    
    <tbody>
      <tr>
        <td style="padding:40px 30px 40px 30px; line-height:22px; text-align:inherit; background-color:#80817f;" height="100%" valign="top" bgcolor="#80817f" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="color: #ffffff; font-size: 12px">Copyright &copy; 2023 Detroit Bridal Shower. All rights reserved. <br> You are receiving this email becuase you opted in via our website</span></div>
<div style="font-family: inherit; text-align: center"><br></div>
<div style="font-family: inherit; text-align: center"><span style="color: #ffffff; font-size: 12px"><strong>Our mailing address is: <br> Detroit Bridal Showers <br> 17322 Goldwin Dr. <br> Southfield, Michigan 48075</strong></span></div><div></div></div></td>
      </tr>
    </tbody>
  </table><div data-role="module-unsubscribe" class="module" role="module" data-type="unsubscribe" style="background-color:#ffecea; color:#444444; font-size:12px; line-height:20px; padding:16px 16px 16px 16px; text-align:Center;" data-muid="4e838cf3-9892-4a6d-94d6-170e474d21e5"><p style="font-size:12px; line-height:20px;"><a class="Unsubscribe--unsubscribeLink" href="{{{unsubscribe}}}" target="_blank" style="color:#80817f;">Unsubscribe</a> - <a href="{{{unsubscribe_preferences}}}" target="_blank" class="Unsubscribe--unsubscribePreferences" style="color:#80817f;">Unsubscribe Preferences</a></p></div><table border="0" cellpadding="0" cellspacing="0" class="module" data-role="module-button" data-type="button" role="module" style="table-layout:fixed;" width="100%" data-muid="04084f31-d714-4785-98c7-39de4df9fb7b">
      <tbody>
        <tr>
          <td align="center" bgcolor="#FFECEA" class="outer-td" style="padding:20px 0px 20px 0px; background-color:#FFECEA;">
            <table border="0" cellpadding="0" cellspacing="0" class="wrapper-mobile" style="text-align:center;">
              <tbody>
                <tr>
                <td align="center" bgcolor="#f5f8fd" class="inner-td" style="border-radius:6px; font-size:16px; text-align:center; background-color:inherit;"><a href="https://sendgrid.com/" style="background-color:#f5f8fd; border:1px solid #f5f8fd; border-color:#f5f8fd; border-radius:25px; border-width:1px; color:#a8b9d5; display:inline-block; font-size:10px; font-weight:normal; letter-spacing:0px; line-height:normal; padding:5px 18px 5px 18px; text-align:center; text-decoration:none; border-style:solid; font-family:helvetica,sans-serif;" target="_blank">♥ POWERED BY TWILIO SENDGRID</a></td>
                </tr>
              </tbody>
            </table>
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
      </center>`

            }
            mailMod.sendMail(message)
        
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

          
          if (dbCouple[0].name === req.query.name &&
              dbCouple[0].email === req.query.email && 
              dbCouple[0].phoneNumber === req.query.phoneNumber && 
              dbCouple[0].address === req.query.address && 
              dbCouple[0].chossonName === req.query.chossonName && 
              dbCouple[0].chossonFatherTitle === req.query.chossonFatherTitle && 
              dbCouple[0].chossonFather === req.query.chossonFatherName &&
              dbCouple[0].chossonMotherTitle === req.query.chossonMotherTitle &&
              dbCouple[0].chossonMother === req.query.chossonMotherName &&
              // dbCouple[0].chossonOrigin === req.query.chossonOrigin && 
              dbCouple[0].kallahName === req.query.kallahName && 
              dbCouple[0].kallahFatherTitle === req.query.kallahFatherTitle && 
              dbCouple[0].kallahFather === req.query.kallahFatherName &&
              dbCouple[0].kallahMotherTitle === req.query.kallahMotherTitle &&
              dbCouple[0].kallahMother === req.query.kallahMotherName &&
              // dbCouple[0].kallahOrigin === req.query.kallahOrigin 
              dbCouple[0].confNumber == req.query.confNum
              ) {

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

          const params = new URLSearchParams({
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
            // chesedPackage: req.query.chesedPackage,
            confNum: req.query.confNum
          })

          let verificationURL = req.protocol + '://' + req.get('host') + '/verifyCouple?' + params
          let adminURL = "req.protocol + '://' + req.get('host') + '/admin"
          // if (queryCouple.confNum ==  req.query.confNum) {
            // await queryCouple.updateOne({ confirmed: true })
            // await queryCouple.updateOne({ collecting: true })
            //send email to mommy
            const msg = {
              to: 'aronfriedman98@gmail.com', // bridal shower email
              from: `${req.query.email}`,
              subject: 'New Couple Submission',
              html:`
              <!DOCTYPE html>

          <html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
          <head>
          <title></title>
          <meta content="text/html; charset=utf-8" http-equiv="Content-Type"/>
          <meta content="width=device-width, initial-scale=1.0" name="viewport"/><!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]--><!--[if !mso]><!-->
          <link href="https://fonts.googleapis.com/css?family=Cabin" rel="stylesheet" type="text/css"/><!--<![endif]-->
          <style>
              * {
                box-sizing: border-box;
              }
          
              body {
                margin: 0;
                padding: 0;
              }
          
              a[x-apple-data-detectors] {
                color: inherit !important;
                text-decoration: inherit !important;
              }
          
              #MessageViewBody a {
                color: inherit;
                text-decoration: none;
              }
          
              p {
                line-height: inherit
              }
          
              .desktop_hide,
              .desktop_hide table {
                mso-hide: all;
                display: none;
                max-height: 0px;
                overflow: hidden;
              }
          
              .image_block img+div {
                display: none;
              }
          
              @media (max-width:670px) {
                .desktop_hide table.icons-inner {
                  display: inline-block !important;
                }
          
                .icons-inner {
                  text-align: center;
                }
          
                .icons-inner td {
                  margin: 0 auto;
                }
          
                .row-content {
                  width: 100% !important;
                }
          
                .mobile_hide {
                  display: none;
                }
          
                .stack .column {
                  width: 100%;
                  display: block;
                }
          
                .mobile_hide {
                  min-height: 0;
                  max-height: 0;
                  max-width: 0;
                  overflow: hidden;
                  font-size: 0px;
                }
          
                .desktop_hide,
                .desktop_hide table {
                  display: table !important;
                  max-height: none !important;
                }
              }
            </style>
          </head>
          <body style="background-color: #fbfbfb; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
          <table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%"></td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 15px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-left:10px;padding-right:10px;padding-top:25px;">
          <div style="font-family: sans-serif">
          <div class="" style="font-size: 14px; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 16.8px; color: #6b7066; line-height: 1.2;">
          <p style="margin: 0; font-size: 30px; text-align: center; mso-line-height-alt: 36px;"><strong><span style="font-size:38px;">New Couple Submission</span></strong></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-left:10px;padding-right:10px;padding-top:10px;">
          <div style="font-family: sans-serif">
          <div class="" style="font-size: 14px; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 21px; color: #ffffff; line-height: 1.5;">
          <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 33px;"><span style="font-size:22px;color:#6b7066">Please confirm that all the information is correct.</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          <div class="spacer_block block-3" style="height:60px;line-height:60px;font-size:1px;"> </div>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f0f8ff; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Chosson:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.query.chossonName}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-4" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #e8f1f9; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Chosson's Father:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.query.chossonFatherTitle} ${req.query.chossonFatherName}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-5" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f0f8ff; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Chosson's Mother:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.query.chossonMotherTitle} ${req.query.chossonMotherName}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-6" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #e8f1f9; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Chosson's Hometown:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.query.chossonOrigin}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-7" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f0f8ff; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Kallah:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.query.kallahName}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-8" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #e8f1f9; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Kallah's Father:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.query.kallahFatherTitle} ${req.query.kallahFatherName}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-9" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f0f8ff; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">kallah's Mother:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.query.kallahMotherTitle} ${req.query.kallahMotherName}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-10" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #e8f1f9; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Kallah's Hometown:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.query.kallahOrigin}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-11" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f0f8ff; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Phone Number:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.query.phoneNumber}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-12" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #e8f1f9; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Email:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.query.email}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-13" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f0f8ff; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Address:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.query.address}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-14" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #e8f1f9; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Wedding Date:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.query.weddingDate}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-15" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f0f8ff; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Personal Shopper:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${req.query.personalShopper}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-16" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #e8f1f9; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="25%">
          <table border="0" cellpadding="10" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad">
          <h1 style="margin: 0; color: #022b85; direction: ltr; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Detroit Chesed Package:</span></h1>
          </td>
          </tr>
          </table>
          </td>
          <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="75%">
          <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
          <div style="font-family: Arial, sans-serif">
          <div class="" style="font-size: 12px; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; mso-line-height-alt: 18px; color: #393d47; line-height: 1.5;">
          <p style="margin: 0; font-size: 12px; mso-line-height-alt: 22.5px;"><span style="font-size:15px;">${chesedPackage}</span></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-17" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 650px;" width="650"><br><br>
          <tbody>
                      <tr>
                        <td align="center" bgcolor="#ffffff" class="outer-td" style="padding:0px 0px 0px 0px; background-color:#ffffff;">
                          <table border="0" cellpadding="0" cellspacing="0" class="wrapper-mobile" style="text-align:center;">
                            <tbody>
                              <tr>
                              <td align="center" bgcolor="#6b7066" class="inner-td" style="border-radius:6px; font-size:16px; text-align:center; background-color:inherit;">
                                <a href="${verificationURL}" style="background-color:#6b7066; border:1px solid #6b7066; border-color:#6b7066; border-radius:0px; border-width:1px; color:white; display:inline-block; font-size:14px; font-weight:normal; letter-spacing:0px; line-height:normal; padding:12px 40px 12px 40px; text-align:center; text-decoration:none; border-style:solid; font-family:inherit;" target="_blank">Verify Couple</a>
                              </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table><p style="color: #6b7066; width: 250px; margin-right: auto; margin-left: auto; text-align: center;">Or visit this link to manually verify couples: <a href="${adminURL}">${adminURL}</a></p><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="7770fdab-634a-4f62-a277-1c66b2646d8d.1">
                  <tbody>
                    <tr>
                      <td style="padding:0px 0px 50px 0px;" role="module-content" bgcolor="#ffffff">
                      </td>
                    </tr>
                  </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-18" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
          <div class="spacer_block block-1" style="height:30px;line-height:30px;font-size:1px;"> </div>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-19" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #6b7066" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #6b7066; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 20px; padding-top: 15px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
          <table border="0" cellpadding="10" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
          <tr>
          <td class="pad">
          <div style="font-family: sans-serif">
          <div class="" style="font-size: 14px; font-family: Cabin, Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 25.2px; color: #ffffff; line-height: 1.8;">
          <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 25.2px;">Detroit Bridal Shower</p>
          <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 25.2px;"><a href="http://www.example.com/" rel="noopener" style="text-decoration: underline; color: #ffffff;" target="_blank">www.detroitBridalShower.com</a></p>
          <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 25.2px;">bridalshower@detroitbridalshower.org<a href="http://www.example.com/" rel="noopener" style="text-decoration: none; color: #ffffff;" target="_blank"></a></p>
          <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 25.2px;"><strong>17322 Goldwin Dr. Southfield, MI 48075</strong></p>
          </div>
          </div>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-20" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tbody>
          <tr>
          <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 650px;" width="650">
          <tbody>
          <tr>
          <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
          <table border="0" cellpadding="0" cellspacing="0" class="icons_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="pad" style="vertical-align: middle; color: #9d9d9d; font-family: inherit; font-size: 15px; padding-bottom: 5px; padding-top: 5px; text-align: center;">
          <table cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
          <tr>
          <td class="alignment" style="vertical-align: middle; text-align: center;"><!--[if vml]><table align="left" cellpadding="0" cellspacing="0" role="presentation" style="display:inline-block;padding-left:0px;padding-right:0px;mso-table-lspace: 0pt;mso-table-rspace: 0pt;"><![endif]-->
          <!--[if !vml]><!-->
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table>
          </td>
          </tr>
          </tbody>
          </table><!-- End -->
          </body>
          </html>
              `
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
          res.render('/views/message.ejs', { message: 'Couple submission was unsuccessful. Please <a href="/">try again.</a>', title: 'Oops!'});
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
      const listID = await getListID('Newsletter Subscribers')

      console.log("listID: " + listID)

      const databaseCouples = await Couples.find().sort({_id: -1})


        //new couple 
        let newCoupleString = ""

        let chossonFatherFNameNew = req.query.chossonFatherName.split(" ").slice(0, -1).join(" ")
        let kallahFatherFNameNew = req.query.kallahFatherName.split(" ").slice(0, -1).join(" ")

        if(req.query.chossonOrigin === 'detroit' && req.query.kallahOrigin === 'detroit') {
            newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to <strong>${req.query.kallahName}</strong> <br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${req.query.chossonMotherName} <br> and daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} and ${req.query.kallahMotherName} <br> <br>`
        }
        else if(req.query.chossonOrigin === 'detroit') {
            newCoupleString += `<strong>${req.query.chossonName}</strong> is engaged to ${req.query.kallahName} <br> son of ${req.query.chossonFatherTitle} & ${req.query.chossonMotherTitle} ${chossonFatherFNameNew} and ${req.query.chossonMotherName} <br> <br>`
        }
        else {
            newCoupleString += `<strong>${req.query.kallahName}</strong> is engaged to ${req.query.chossonName} <br> daughter of ${req.query.kallahFatherTitle} & ${req.query.kallahMotherTitle} ${kallahFatherFNameNew} and ${req.query.kallahMotherName} <br> <br>`
        }

        console.log("new couple string: " + newCoupleString)

        //couples still collecting for
        let couplesString = ""


        for(let i = 1; i < databaseCouples.length; i++) {

          if (databaseCouples[i].collecting === true) {


            let chossonFatherFName = databaseCouples[i].chossonFather.split(" ").slice(0, -1).join(" ")
            let kallahFatherFName = databaseCouples[i].kallahFather.split(" ").slice(0, -1).join(" ")

            if(databaseCouples[i].chossonOrigin === 'detroit' && databaseCouples[i].kallahOrigin === 'detroit') {
                couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong> <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} and ${databaseCouples[i].chossonMother} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} and ${databaseCouples[i].kallahMother} <br> <br>`
              }
            else if(databaseCouples[i].chossonOrigin === 'detroit') {
                couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to ${databaseCouples[i].kallahName} <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} and ${databaseCouples[i].chossonMother} <br> <br>`
              }
            else {
                couplesString += `<strong>${databaseCouples[i].kallahName}</strong> is engaged to ${databaseCouples[i].chossonName} <br> daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} and ${databaseCouples[i].kallahMother} <br> <br>`
              }
          }
        }
        console.log("couplesString: " + couplesString)

      const collectionEmail = `<!DOCTYPE html>

      <html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
      <head>
      <title></title>
      <meta content="text/html; charset=utf-8" http-equiv="Content-Type"/>
      <meta content="width=device-width, initial-scale=1.0" name="viewport"/><!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]--><!--[if !mso]><!-->
      <link href="https://fonts.googleapis.com/css?family=Cormorant+Garamond" rel="stylesheet" type="text/css"/><!--<![endif]-->
      <style>
          * {
            box-sizing: border-box;
          }
      
          body {
            margin: 0;
            padding: 0;
          }
      
          a[x-apple-data-detectors] {
            color: inherit !important;
            text-decoration: inherit !important;
          }
      
          #MessageViewBody a {
            color: inherit;
            text-decoration: none;
          }
      
          p {
            line-height: inherit
          }
      
          .desktop_hide,
          .desktop_hide table {
            mso-hide: all;
            display: none;
            max-height: 0px;
            overflow: hidden;
          }
      
          .image_block img+div {
            display: none;
          }
      
          @media (max-width:700px) {
            .desktop_hide table.icons-inner {
              display: inline-block !important;
            }
      
            .icons-inner {
              text-align: center;
            }
      
            .icons-inner td {
              margin: 0 auto;
            }
      
            .image_block img.big,
            .row-content {
              width: 100% !important;
            }
      
            .mobile_hide {
              display: none;
            }
      
            .stack .column {
              width: 100%;
              display: block;
            }
      
            .mobile_hide {
              min-height: 0;
              max-height: 0;
              max-width: 0;
              overflow: hidden;
              font-size: 0px;
            }
      
            .desktop_hide,
            .desktop_hide table {
              display: table !important;
              max-height: none !important;
            }
      
            .row-3 .column-1 .block-11.heading_block h1,
            .row-3 .column-1 .block-12.heading_block h1,
            .row-3 .column-1 .block-13.heading_block h1,
            .row-3 .column-1 .block-14.heading_block h1,
            .row-3 .column-1 .block-6.heading_block h1 {
              font-size: 21px !important;
            }
          }
        </style>
      </head>
      <body style="margin: 0; background-color: #fff9f6; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
      <table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6; color: #000000; width: 680px;" width="680">
      <tbody>
      <tr>
      <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="garland" src="https://i.imgur.com/BGAKutK.png
      " style="display: block; height: auto; border: 0; width: 340px; max-width: 100%;" title="garland" width="340"/></a></div>
      </td>
      </tr>
      </table>
      </td>
      <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="garland" src="https://i.imgur.com/Lh6mbJM.png" style="display: block; height: auto; border: 0; width: 340px; max-width: 100%;" title="garland" width="340"/></a></div>
      </td>
      </tr>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6; color: #000000; width: 680px;" width="680">
      <tbody>
      <tr>
      <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
      <table border="0" cellpadding="10" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;"><span style="font-size:22px;"><span style="font-size:46px;">Mazel Tov!</span></span></p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6; color: #000000; width: 680px;" width="680">
      <tbody>
      <tr>
      <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;">We are so fortunate for all the future Chosson and Kallah's from our community. Please reply to this email if you would like to participate in these bridal showers.</p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 12px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 14.399999999999999px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 12px; mso-line-height-alt: 14.399999999999999px;"> </p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;"><strong><span style="font-size:30px;">New Chosson/Kallah: </span></strong></p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-4" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="divider" class="big" src="https://i.imgur.com/s0GqZ2p.png" style="display: block; height: auto; border: 0; width: 680px; max-width: 100%;" title="divider" width="680"/></a></div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-5" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 12px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 14.399999999999999px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 12px; mso-line-height-alt: 14.399999999999999px;"> </p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="heading_block block-6" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:30px;text-align:center;width:100%;">
      <h1 style="margin: 0; color: #6b7066; direction: ltr; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; font-size: 23px; font-weight: normal; letter-spacing: 1px; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0; margin: 0 5px;">${newCoupleString}</h1>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-7" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 12px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 14.399999999999999px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 12px; mso-line-height-alt: 14.399999999999999px;"> </p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-8" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;"><span style="font-size:26px;"><strong><span style="">Still collecting for:</span></strong></span></p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-9" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="divider" class="big" src="https://i.imgur.com/s0GqZ2p.png" style="display: block; height: auto; border: 0; width: 680px; max-width: 100%;" title="divider" width="680"/></a></div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-10" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 12px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 14.399999999999999px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 12px; mso-line-height-alt: 14.399999999999999px;"> </p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="heading_block block-11" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:30px;text-align:center;width:100%;">
      <h1 style="margin: 0; color: #6b7066; direction: ltr; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; font-size: 20px; font-weight: normal; letter-spacing: 1px; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0; margin: 0 5px;">${couplesString}</h1>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-15" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="divider" class="big" src="https://i.imgur.com/s0GqZ2p.png" style="display: block; height: auto; border: 0; width: 680px; max-width: 100%;" title="divider" width="680"/></a></div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-16" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 12px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 14.399999999999999px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 12px; mso-line-height-alt: 14.399999999999999px;"> </p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-17" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;">The recommended amount is $65.00 per shower however, any amount is accepted.</p>
      <p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;">Please send a reply email specifying and confirming which shower/s you would like to participate in and send payment through one of the following methods:</p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-4" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6; color: #000000; width: 680px;" width="680">
      <tbody>
      <tr>
      <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
      <table border="0" cellpadding="0" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;text-align:center;width:100%;">
      <h1 style="margin: 0; color: #6b7066; direction: ltr; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; font-size: 30px; font-weight: normal; letter-spacing: 1px; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder"></span></h1>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="divider" src="https://i.imgur.com/s0GqZ2p.png" style="display: block; height: auto; border: 0; width: 340px; max-width: 100%;" title="divider" width="340"/></a></div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="10" cellspacing="0" class="text_block block-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 25.2px; color: #6b7066; line-height: 1.8;">
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 25.2px; letter-spacing: 1px;"><strong><span style="font-size:20px;">PayPal</span></strong></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 36px; letter-spacing: 1px;"><span style="font-size:20px;">beckyfriedman1@gmail.com</span></p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      </td>
      <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
      <table border="0" cellpadding="0" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;text-align:center;width:100%;">
      <h1 style="margin: 0; color: #6b7066; direction: ltr; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; font-size: 30px; font-weight: normal; letter-spacing: 1px; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder"></span></h1>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="divider" src="https://i.imgur.com/s0GqZ2p.png" style="display: block; height: auto; border: 0; width: 340px; max-width: 100%;" title="divider" width="340"/></a></div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="10" cellspacing="0" class="text_block block-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 25.2px; color: #6b7066; line-height: 1.8;">
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 25.2px; letter-spacing: 1px;"><strong><span style="font-size:20px;">Venmo</span></strong></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 36px; letter-spacing: 1px;"><span style="font-size:20px;"><span id="a87eae2e-beb4-4376-89b1-53f397ca0e04" style="">@Becky-Friedman-8</span></span></p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-5" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6; color: #000000; width: 680px;" width="680">
      <tbody>
      <tr>
      <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
      <table border="0" cellpadding="0" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;text-align:center;width:100%;">
      <h1 style="margin: 0; color: #6b7066; direction: ltr; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; font-size: 30px; font-weight: normal; letter-spacing: 1px; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder"></span></h1>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="divider" src="https://i.imgur.com/s0GqZ2p.png" style="display: block; height: auto; border: 0; width: 340px; max-width: 100%;" title="divider" width="340"/></a></div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="10" cellspacing="0" class="text_block block-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 25.2px; color: #6b7066; line-height: 1.8;">
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 36px; letter-spacing: 1px;"><span style="font-size:20px;"><strong>Zelle</strong></span></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 36px; letter-spacing: 1px;"><span style="font-size:20px;">beckyfriedman1@gmail.com</span></p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      </td>
      <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
      <table border="0" cellpadding="0" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;text-align:center;width:100%;">
      <h1 style="margin: 0; color: #6b7066; direction: ltr; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; font-size: 30px; font-weight: normal; letter-spacing: 1px; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder"></span></h1>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="divider" src="https://i.imgur.com/s0GqZ2p.png" style="display: block; height: auto; border: 0; width: 340px; max-width: 100%;" title="divider" width="340"/></a></div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="10" cellspacing="0" class="text_block block-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 25.2px; color: #6b7066; line-height: 1.8;">
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 25.2px; letter-spacing: 1px;"><strong><span style="font-size:20px;">Check</span></strong></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 36px; letter-spacing: 1px;"><span style="font-size:20px;">mailed and made out to:</span></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 36px; letter-spacing: 1px;"><span style="font-size:20px;">Detroit Bridal Shower Project</span></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 36px; letter-spacing: 1px;"><span style="font-size:20px;">17322 Goldwin Drive Southfield, MI 48075</span></p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-6" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6; color: #000000; width: 680px;" width="680">
      <tbody>
      <tr>
      <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
      <div class="spacer_block block-1" style="height:30px;line-height:30px;font-size:1px;"> </div>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;">All the collections will be used to start off the Chosson and Kallah with all household basics.</p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="divider" class="big" src="https://i.imgur.com/s0GqZ2p.png" style="display: block; height: auto; border: 0; width: 680px; max-width: 100%;" title="divider" width="680"/></a></div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-4" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;">If you would like to add a newly engaged couple to this bridal shower list, please visit our website <u>here.</u></p>
      <p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;">You can also view all of the past hostesses on our website on the <u>announcements</u> page.</p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-5" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;">If you have any questions or concerns, please reach out to <u>bridalshower@detroitbridalshower.org</u>.</p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-6" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;">We should continue to hear of many more simchas!</p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-7" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 12px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 14.399999999999999px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 12px; mso-line-height-alt: 14.399999999999999px;"> </p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-8" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;">Becky Friedman</p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <div class="spacer_block block-9" style="height:30px;line-height:30px;font-size:1px;"> </div>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-7" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6; color: #000000; width: 680px;" width="680">
      <tbody>
      <tr>
      <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 25px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="garland" src="https://i.imgur.com/UzcGfRe.png" style="display: block; height: auto; border: 0; width: 340px; max-width: 100%;" title="garland" width="340"/></a></div>
      </td>
      </tr>
      </table>
      </td>
      <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="garland" src="https://i.imgur.com/cFg6q3S.png
      " style="display: block; height: auto; border: 0; width: 340px; max-width: 100%;" title="garland" width="340"/></a></div>
      </td>
      </tr>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-8" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #6b7066;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; background-color: #6b7066; width: 680px;" width="680">
      <tbody>
      <tr>
      <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:25px;padding-left:50px;padding-right:50px;padding-top:25px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: #fff9f6; line-height: 1.2;">
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;"><span style="font-size:24px;">Copyright &copy; 2023 Detroit Bridal Shower. All rights reserved.</span></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;"> </p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;"><span style="font-size:24px;">Our mailing address is:</span></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;"><span style="font-size:24px;">Detroit Bridal Showers</span></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;"><span style="font-size:24px;">17322 Goldwin Dr.</span></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;"><span style="font-size:24px;">Southfield, MI 48075</span></p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:25px;padding-left:50px;padding-right:50px;padding-top:25px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 21px; color: #fff9f6; line-height: 1.5;">
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:25px;padding-left:50px;padding-right:50px;padding-top:25px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 21px; color: #fff9f6; line-height: 1.5;">
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 24px;"><span style="font-size:16px;">To stop receiving emails from us, click <a href="http://www.example.com" rel="noopener" style="text-decoration: underline; color: #fff9f6;" target="_blank">here.</a></span></p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-9" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 680px;" width="680">
      <tbody>
      <tr>
      <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
      <table border="0" cellpadding="0" cellspacing="0" class="icons_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="vertical-align: middle; color: #9d9d9d; font-family: inherit; font-size: 15px; padding-bottom: 5px; padding-top: 5px; text-align: center;">
      <table cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="alignment" style="vertical-align: middle; text-align: center;"><!--[if vml]><table align="left" cellpadding="0" cellspacing="0" role="presentation" style="display:inline-block;padding-left:0px;padding-right:0px;mso-table-lspace: 0pt;mso-table-rspace: 0pt;"><![endif]-->
      <!--[if !vml]><!-->
      <table cellpadding="0" cellspacing="0" class="icons-inner" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; display: inline-block; margin-right: -4px; padding-left: 0px; padding-right: 0px;"><!--<![endif]-->
      <tr>
      </tr>
      </table>
      </td>
      </tr>
      </table>
      </td>
      </tr>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table><!-- End -->
      </body>
      </html>`

      const personalCollectionEmail = `<!DOCTYPE html>

      <html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
      <head>
      <title></title>
      <meta content="text/html; charset=utf-8" http-equiv="Content-Type"/>
      <meta content="width=device-width, initial-scale=1.0" name="viewport"/><!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]--><!--[if !mso]><!-->
      <link href="https://fonts.googleapis.com/css?family=Cormorant+Garamond" rel="stylesheet" type="text/css"/><!--<![endif]-->
      <style>
          * {
            box-sizing: border-box;
          }
      
          body {
            margin: 0;
            padding: 0;
          }
      
          a[x-apple-data-detectors] {
            color: inherit !important;
            text-decoration: inherit !important;
          }
      
          #MessageViewBody a {
            color: inherit;
            text-decoration: none;
          }
      
          p {
            line-height: inherit
          }
      
          .desktop_hide,
          .desktop_hide table {
            mso-hide: all;
            display: none;
            max-height: 0px;
            overflow: hidden;
          }
      
          .image_block img+div {
            display: none;
          }
      
          @media (max-width:700px) {
            .desktop_hide table.icons-inner {
              display: inline-block !important;
            }
      
            .icons-inner {
              text-align: center;
            }
      
            .icons-inner td {
              margin: 0 auto;
            }
      
            .image_block img.big,
            .row-content {
              width: 100% !important;
            }
      
            .mobile_hide {
              display: none;
            }
      
            .stack .column {
              width: 100%;
              display: block;
            }
      
            .mobile_hide {
              min-height: 0;
              max-height: 0;
              max-width: 0;
              overflow: hidden;
              font-size: 0px;
            }
      
            .desktop_hide,
            .desktop_hide table {
              display: table !important;
              max-height: none !important;
            }
      
            .row-3 .column-1 .block-3.heading_block h1 {
              font-size: 21px !important;
            }
          }
        </style>
      </head>
      <body style="margin: 0; background-color: #fff9f6; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
      <table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6; color: #000000; width: 680px;" width="680">
      <tbody>
      <tr>
      <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
      <table border="0" cellpadding="10" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;"><span style="font-size:22px;"><span style="font-size:46px;">Detroit Bridal Shower Project</span></span></p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="divider" class="big" src="https://i.imgur.com/s0GqZ2p.png" style="display: block; height: auto; border: 0; width: 680px; max-width: 100%;" title="divider" width="680"/></a></div>
      </td>
      </tr>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6; color: #000000; width: 680px;" width="680">
      <tbody>
      <tr>
      <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="garland" src="https://i.imgur.com/BGAKutK.png" style="display: block; height: auto; border: 0; width: 340px; max-width: 100%;" title="garland" width="340"/></a></div>
      </td>
      </tr>
      </table>
      </td>
      <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="garland" src="https://i.imgur.com/Lh6mbJM.png" style="display: block; height: auto; border: 0; width: 340px; max-width: 100%;" title="garland" width="340"/></a></div>
      </td>
      </tr>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6; color: #000000; width: 680px;" width="680">
      <tbody>
      <tr>
      <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
      <table border="0" cellpadding="10" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;"><span style="font-size:22px;"><span style="font-size:46px;">Mazel Tov!</span></span></p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 12px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 14.399999999999999px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 12px; mso-line-height-alt: 14.399999999999999px;"> </p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="heading_block block-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:30px;text-align:center;width:100%;">
      <h1 style="margin: 0; color: #6b7066; direction: ltr; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; font-size: 25px; font-weight: normal; letter-spacing: 1px; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;"><strong>${newCoupleString}</strong></h1>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="10" cellspacing="0" class="divider_block block-4" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad">
      <div align="center" class="alignment">
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 1px solid #dddddd;"><span> </span></td>
      </tr>
      </table>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-5" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 12px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 14.399999999999999px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 12px; mso-line-height-alt: 14.399999999999999px;"> </p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-6" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;">If you would like to participate in their bridal shower, please send an email to bridalshower@detroitbridalshower.org. <br><br>Payment is accepted through one of the following methods: </p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-4" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6; color: #000000; width: 680px;" width="680">
      <tbody>
      <tr>
      <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
      <table border="0" cellpadding="0" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;text-align:center;width:100%;">
      <h1 style="margin: 0; color: #6b7066; direction: ltr; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; font-size: 30px; font-weight: normal; letter-spacing: 1px; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder"></span></h1>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="divider" src="https://i.imgur.com/s0GqZ2p.png" style="display: block; height: auto; border: 0; width: 340px; max-width: 100%;" title="divider" width="340"/></a></div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="10" cellspacing="0" class="text_block block-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 25.2px; color: #6b7066; line-height: 1.8;">
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 25.2px; letter-spacing: 1px;"><strong><span style="font-size:20px;">PayPal</span></strong></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 36px; letter-spacing: 1px;"><span style="font-size:20px;">beckyfriedman1@gmail.com</span></p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      </td>
      <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
      <table border="0" cellpadding="0" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;text-align:center;width:100%;">
      <h1 style="margin: 0; color: #6b7066; direction: ltr; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; font-size: 30px; font-weight: normal; letter-spacing: 1px; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder"></span></h1>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="divider" src="https://i.imgur.com/s0GqZ2p.png" style="display: block; height: auto; border: 0; width: 340px; max-width: 100%;" title="divider" width="340"/></a></div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="10" cellspacing="0" class="text_block block-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 25.2px; color: #6b7066; line-height: 1.8;">
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 25.2px; letter-spacing: 1px;"><strong><span style="font-size:20px;">Venmo</span></strong></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 36px; letter-spacing: 1px;"><span style="font-size:20px;"><span id="a87eae2e-beb4-4376-89b1-53f397ca0e04" style="">@Becky-Friedman-8</span></span></p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-5" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6; color: #000000; width: 680px;" width="680">
      <tbody>
      <tr>
      <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
      <table border="0" cellpadding="0" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;text-align:center;width:100%;">
      <h1 style="margin: 0; color: #6b7066; direction: ltr; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; font-size: 30px; font-weight: normal; letter-spacing: 1px; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder"></span></h1>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="divider" src="https://i.imgur.com/s0GqZ2p.png" style="display: block; height: auto; border: 0; width: 340px; max-width: 100%;" title="divider" width="340"/></a></div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="10" cellspacing="0" class="text_block block-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 25.2px; color: #6b7066; line-height: 1.8;">
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 36px; letter-spacing: 1px;"><span style="font-size:20px;"><strong>Zelle</strong></span></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 36px; letter-spacing: 1px;"><span style="font-size:20px;">beckyfriedman1@gmail.com</span></p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      </td>
      <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
      <table border="0" cellpadding="0" cellspacing="0" class="heading_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;text-align:center;width:100%;">
      <h1 style="margin: 0; color: #6b7066; direction: ltr; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; font-size: 30px; font-weight: normal; letter-spacing: 1px; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder"></span></h1>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="divider" src="https://i.imgur.com/s0GqZ2p.png" style="display: block; height: auto; border: 0; width: 340px; max-width: 100%;" title="divider" width="340"/></a></div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="10" cellspacing="0" class="text_block block-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 25.2px; color: #6b7066; line-height: 1.8;">
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 25.2px; letter-spacing: 1px;"><strong><span style="font-size:20px;">Check</span></strong></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 36px; letter-spacing: 1px;"><span style="font-size:20px;">mailed and made out to:</span></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 36px; letter-spacing: 1px;"><span style="font-size:20px;">Detroit Bridal Shower Project</span></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 36px; letter-spacing: 1px;"><span style="font-size:20px;">17322 Goldwin Drive Southfield, MI 48075</span></p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-6" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6; color: #000000; width: 680px;" width="680">
      <tbody>
      <tr>
      <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
      <div class="spacer_block block-1" style="height:30px;line-height:30px;font-size:1px;"> </div>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;">The recommended amount is $65.00 however, any amount will be accepted.</p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;">All the collections will be used to start off the Chosson and Kallah with all household basics.</p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-4" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="divider" class="big" src="https://i.imgur.com/s0GqZ2p.png" style="display: block; height: auto; border: 0; width: 680px; max-width: 100%;" title="divider" width="680"/></a></div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-5" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;">We should continue to hear of many more simchas!</p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-6" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:10px;padding-left:50px;padding-right:50px;padding-top:10px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 12px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 14.399999999999999px; color: #6b7066; line-height: 1.2;">
      <p style="margin: 0; font-size: 12px; mso-line-height-alt: 14.399999999999999px;"> </p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      <div class="spacer_block block-7" style="height:30px;line-height:30px;font-size:1px;"> </div>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-7" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff9f6; color: #000000; width: 680px;" width="680">
      <tbody>
      <tr>
      <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 25px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="garland" src="https://i.imgur.com/UzcGfRe.png" style="display: block; height: auto; border: 0; width: 340px; max-width: 100%;" title="garland" width="340"/></a></div>
      </td>
      </tr>
      </table>
      </td>
      <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
      <table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
      <div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"><img alt="garland" src="https://i.imgur.com/cFg6q3S.png" style="display: block; height: auto; border: 0; width: 340px; max-width: 100%;" title="garland" width="340"/></a></div>
      </td>
      </tr>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-8" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #6b7066;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; background-color: #6b7066; width: 680px;" width="680">
      <tbody>
      <tr>
      <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
      <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
      <tr>
      <td class="pad" style="padding-bottom:25px;padding-left:50px;padding-right:50px;padding-top:25px;">
      <div style="font-family: 'Times New Roman', serif">
      <div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: #fff9f6; line-height: 1.2;">
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;"><span style="font-size:24px;">Copyright  2023 Detroit Bridal Shower. All rights reserved.</span></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;"> </p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;"><span style="font-size:24px;">Our mailing address is:</span></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;"><span style="font-size:24px;">Detroit Bridal Showers</span></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;"><span style="font-size:24px;">17322 Goldwin Dr.</span></p>
      <p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;"><span style="font-size:24px;">Southfield, MI 48075</span></p>
      </div>
      </div>
      </td>
      </tr>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-9" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tbody>
      <tr>
      <td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 680px;" width="680">
      <tbody>
      <tr>
      <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
      <table border="0" cellpadding="0" cellspacing="0" class="icons_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="pad" style="vertical-align: middle; color: #9d9d9d; font-family: inherit; font-size: 15px; padding-bottom: 5px; padding-top: 5px; text-align: center;">
      <table cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
      <tr>
      <td class="alignment" style="vertical-align: middle; text-align: center;"><!--[if vml]><table align="left" cellpadding="0" cellspacing="0" role="presentation" style="display:inline-block;padding-left:0px;padding-right:0px;mso-table-lspace: 0pt;mso-table-rspace: 0pt;"><![endif]-->
      <!--[if !vml]><!-->
      <table cellpadding="0" cellspacing="0" class="icons-inner" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; display: inline-block; margin-right: -4px; padding-left: 0px; padding-right: 0px;"><!--<![endif]-->
      <tr>
      <td style="vertical-align: middle; text-align: center; padding-top: 5px; padding-bottom: 5px; padding-left: 5px; padding-right: 6px;"><a href="https://www.designedwithbee.com/" style="text-decoration: none;" target="_blank"><img align="center" alt="Designed with BEE" class="icon" height="32" src="images/bee.png" style="display: block; height: auto; margin: 0 auto; border: 0;" width="34"/></a></td>
      <td style="font-family: Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 15px; color: #9d9d9d; vertical-align: middle; letter-spacing: undefined; text-align: center;"><a href="https://www.designedwithbee.com/" style="color: #9d9d9d; text-decoration: none;" target="_blank">Designed with BEE</a></td>
      </tr>
      </table>
      </td>
      </tr>
      </table>
      </td>
      </tr>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
      </tbody>
      </table><!-- End -->
      </body>
      </html>`

      const instructionsEmail = `<!DOCTYPE html>

<html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<title></title>
<meta content="text/html; charset=utf-8" http-equiv="Content-Type"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/><!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]--><!--[if !mso]><!-->
<link href="https://fonts.googleapis.com/css?family=Lato" rel="stylesheet" type="text/css"/>
<link href="https://fonts.googleapis.com/css?family=Quattrocento" rel="stylesheet" type="text/css"/><!--<![endif]-->
<style>
		* {
			box-sizing: border-box;
		}

		body {
			margin: 0;
			padding: 0;
		}

		a[x-apple-data-detectors] {
			color: inherit !important;
			text-decoration: inherit !important;
		}

		#MessageViewBody a {
			color: inherit;
			text-decoration: none;
		}

		p {
			line-height: inherit
		}

		.desktop_hide,
		.desktop_hide table {
			mso-hide: all;
			display: none;
			max-height: 0px;
			overflow: hidden;
		}

		.image_block img+div {
			display: none;
		}

		@media (max-width:700px) {
			.desktop_hide table.icons-inner {
				display: inline-block !important;
			}

			.icons-inner {
				text-align: center;
			}

			.icons-inner td {
				margin: 0 auto;
			}

			.row-content {
				width: 100% !important;
			}

			.mobile_hide {
				display: none;
			}

			.stack .column {
				width: 100%;
				display: block;
			}

			.mobile_hide {
				min-height: 0;
				max-height: 0;
				max-width: 0;
				overflow: hidden;
				font-size: 0px;
			}

			.desktop_hide,
			.desktop_hide table {
				display: table !important;
				max-height: none !important;
			}
		}
	</style>
</head>
<body style="background-color: #cbb6b4; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
<table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #cbb6b4; background-image: none; background-position: top left; background-size: auto; background-repeat: no-repeat;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; background-position: center top;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 680px;" width="680">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
<div class="spacer_block block-1" style="height:30px;line-height:30px;font-size:1px;"> </div>
<table border="0" cellpadding="15" cellspacing="0" class="text_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td class="pad">
<div style="font-family: sans-serif">
<div class="" style="font-size: 14px; font-family: Lato, Tahoma, Verdana, Segoe, sans-serif; mso-line-height-alt: 21px; color: #000; line-height: 1.5;">
<p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 25.5px; letter-spacing: 6px;"><span style="font-size:17px;"><strong>Campaign opened</strong></span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="15" cellspacing="0" class="heading_block block-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="pad">
<h1 style="margin: 0; color: #000; direction: ltr; font-family: 'Quattrocento', 'Trebuchet MS', Helvetica, sans-serif; font-size: 37px; font-weight: 400; letter-spacing: normal; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Your couple has been verified!<br/></span></h1>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block block-4" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td class="pad" style="padding-bottom:15px;padding-left:30px;padding-right:30px;padding-top:10px;">
<div style="font-family: sans-serif">
<div class="" style="font-size: 14px; font-family: Lato, Tahoma, Verdana, Segoe, sans-serif; mso-line-height-alt: 21px; color: #000; line-height: 1.5;">
<p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 21px;">We have sent out a collection email on your behalf. You will also be sent a personal collection email for you to share with any friends and family who are not in our database. <br><br>Mazel Tov!<br> May we share in many more simchas!</p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="image_block block-5" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
<div align="center" class="alignment" style="line-height:10px"><img src="https://i.imgur.com/ssGV6SR.jpg" style="display: block; height: auto; border: 0; width: 340px; max-width: 100%;" width="340"/></div>
</td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 680px;" width="680">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
<table border="0" cellpadding="0" cellspacing="0" class="icons_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="pad" style="vertical-align: middle; color: #9d9d9d; font-family: inherit; font-size: 15px; padding-bottom: 5px; padding-top: 5px; text-align: center;">
<table cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="alignment" style="vertical-align: middle; text-align: center;"><!--[if vml]><table align="left" cellpadding="0" cellspacing="0" role="presentation" style="display:inline-block;padding-left:0px;padding-right:0px;mso-table-lspace: 0pt;mso-table-rspace: 0pt;"><![endif]-->
<!--[if !vml]><!-->
<table cellpadding="0" cellspacing="0" class="icons-inner" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; display: inline-block; margin-right: -4px; padding-left: 0px; padding-right: 0px;"><!--<![endif]-->
<tr>

</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table><!-- End -->
</body>
</html>`

console.log("email created")

const instructionsMsg = {
to: req.query.email, // bridal shower email
from: `aronfriedman98@gmail.com`,
subject: 'Instructions Email',
html: instructionsEmail
}

console.log("email created")

const msg = {
  to: req.query.email, // bridal shower email
  from: `${req.query.email}`,
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

await sgMail.send(instructionsMsg)
await sgMail.send(msg)

await sendNewsletterToList(req, collectionEmail, listID)
res.render('message.ejs', {title: 'Success!', message: 'Collection email has been mailed out!'})

    }
    catch(err){
      res.render('message.ejs', {title: 'Oops!', message: 'Something went wrong!'})
      
    }

    }
}
