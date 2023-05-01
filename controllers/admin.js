const Couples = require('../models/couplesList')
const Announcements = require('../models/newAnnouncements')
const NewCouple = require('../models/newCouple')



const sgMail = require('@sendgrid/mail')
const sgClient = require('@sendgrid/client')
const expressFileUpload = require('express-fileupload')

const fs = require('fs');
const path = require('path');

const sharp = require('sharp');
const newAnnouncements = require('../models/newAnnouncements');



sgMail.setApiKey(process.env.API_KEY)
sgClient.setApiKey(process.env.API_KEY)


module.exports = {
    getAdminPage : async (req, res) => {
        try {
            const couples = await Couples.find()
            res.render(__dirname + '/views/admin.ejs', {coupleInfo : couples})
        } catch (err) {
            return res.status(500).send(err)
        }
    },
    adminVerification : async (req, res) => {
        try {
            const couples = await Couples.find()
            res.render(__dirname + '/views/adminVerification.ejs', {coupleInfo : couples})
        } catch (err) {
            res.status(500).send(err)
        }
    },
    adminUpload : async (req, res) => {
        try {
            const couples = await Couples.find()
            res.render(__dirname + '/views/adminUpload.ejs', {coupleInfo : couples})
        } catch (err) {
            res.status(500).send(err)
        }
    },
    searchCouples : async (req, res) => {
        const query = req.query.query

        try {
            let couples = await Couples.find({
                $or: [
                    {chossonName: { $regex: query, $options: 'i'}}, 
                    {kallahName: { $regex: query, $options: 'i'}}
                ]})
            // console.log('Chossons'+chossons)
            // let kallahs = await Couples.find({ kallahName: { $regex: query, $options: 'i'}})
            // console.log('Kallahs'+kallahs)
            // let couples=chossons
            // couples=couples.concat(kallahs)
            // console.log(query)
            // console.log('Couples: '+couples)

            res.render(__dirname + '/views/coupleTableAdmin.ejs', { coupleInfo : couples })
        } catch (err) {
            console.error(err)
            res.render('error')
        }
    },
    addEntry : async (req, res) => {
        try {
        //save to database
        const newCouple = new Couples(
            {
                chossonName: req.body.chossonName,
                chossonFatherTitle: req.body.chossonFatherTitle,
                chossonFather: req.body.chossonFatherName,
                chossonMotherTitle: req.body.chossonMotherTitle,
                chossonMother: req.body.chossonMotherName,
                chossonOrigin: req.body.chossonOrigin,
                kallahName: req.body.kallahName,
                kallahFatherTitle: req.body.kallahFatherTitle,
                kallahFather: req.body.kallahFatherName,
                kallahMotherTitle: req.body.kallahMotherTitle,
                kallahMother: req.body.kallahMotherName,
                kallahOrigin: req.body.kallahOrigin,
                name: req.body.name,
                email: req.body.email,
                phoneNumber: req.body.phoneNumber,
                address: req.body.address,
                weddingDate: req.body.weddingDate,
                personalShopper: req.body.personalShopper
            }
            )
            await newCouple.save()
            console.log(req.body)
  
  
          return res.json({
            status : true,
            title : 'Success!',
            message: 'Couple information submitted successfully.'
          })
        } catch (err) {
            console.error(err)
            return res.json({
                status : false,
                title : 'Error',
                message: 'There was an error submitting your information. Please try again.'
            })
        }
    },
    //real
    deleteEntry : async (req, res) => {
            try{
                await Couples.deleteOne({_id: req.body.id})
                await NewCouple.findOneAndDelete({}, { sort: { _id: 1 } });
                console.log(req.body.id)
                return res.json('success')
            } catch (err) {
                console.error(err)
                return res.json('error')
            }
        },
        verifyEntry: async (req, res) => {
  try {
    const couple = await Couples.findOne({ _id: req.body.id });
 

    if (!couple) {
      return res.json('error');
    }

    const newCollectingValue = !couple.collecting;

    await Couples.updateOne({ _id: req.body.id }, { $set: { collecting: newCollectingValue } });

    if (newCollectingValue) {

      const newCouple = new NewCouple(
        {
          chosson: couple.chossonName,
          kallah: couple.kallahName,
          chossonFatherTitle: couple.chossonFatherTitle,
          chossonFather : couple.chossonFather,
          chossonMotherTitle: couple.chossonMotherTitle,
          chossonMother: couple.chossonMother,
          chossonOrigin: couple.chossonOrigin,
          kallahFatherTitle: couple.kallahFatherTitle,
          kallahFather: couple.kallahFather,
          kallahMotherTitle: couple.kallahMotherTitle,
          kallahMother: couple.kallahMother,
          kallahOrigin: couple.kallahOrigin,
          tempId: couple._id
        }
      )
      await newCouple.save()
      console.log('saved new couple')
  
      const count = await NewCouple.countDocuments();
  
  if (count > 1) {
    await NewCouple.findOneAndDelete({}, { sort: { _id: 1 } });
  } 

    return res.json('verified');
    } else {
      const newCouple = await NewCouple.findOne();
      if(couple.chossonName === newCouple.chosson && couple.kallahName === newCouple.kallah) {
        // console.log(couple.chossonName + " " + newCouple.chosson)
        await NewCouple.findOneAndDelete({}, { sort: { _id: 1 } });
      }
        return res.json('unverified');
        }
  } catch (err) {
    return res.json('error');
  }
}
,
sendNewsletter: async (req, res) => {
    try {

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


        const listID = await getListID('Newsletter Subscribers')

      console.log("listID: " + listID)

      const newCouple = await Couples.findOne({ _id: req.body.id })

      const databaseCouples = await Couples.find().sort({_id: -1})


//new couple 
let newCoupleString = ""

let chossonFatherFNameNew = newCouple.chossonFather.split(" ").slice(0, -1).join(" ")
let kallahFatherFNameNew = newCouple.kallahFather.split(" ").slice(0, -1).join(" ")

if(newCouple.chossonOrigin === 'detroit' && newCouple.kallahOrigin === 'detroit') {
    newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${newCouple.chossonMother} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${newCouple.kallahMother} <br> <br>`
}
else if(newCouple.chossonOrigin === 'detroit') {
    newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to ${newCouple.kallahName} <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${newCouple.chossonMother} <br> <br>`
}
else {
    newCoupleString += `<strong>${newCouple.kallahName}</strong> is engaged to ${newCouple.chossonName} <br> daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${newCouple.kallahMother} <br> <br>`
}

console.log("new couple string: " + newCoupleString)

//couples still collecting for
let couplesString = ""


for(let i = 0; i < databaseCouples.length; i++) {

  if (databaseCouples[i].collecting === true && !databaseCouples[i]._id.equals(newCouple._id)) {


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

const collectionEmail = `<style type="text/css">
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



await sendNewsletterToList(req, collectionEmail, listID)
console.log('success')
      
      return res.json('success');
    } catch (err) {
      return res.json('error');
    }
  }
,  

        fillInfoModal: async (req, res) => {
            try {
                const couple = await Couples.findById(req.body.id)
                // console.log(couple)
                // if (!couple) {
                //     return res.status(404).json({ error: "Couple not found" })
                // }
                // res.render(__dirname + '/views/admin.ejs', { couple })
                res.json({
                    name: couple.name,
                    phoneNumber: couple.phoneNumber,
                    email: couple.email,
                    address: couple.address,
                    chossonFatherName: couple.chossonFatherTitle + ' ' + couple.chossonFather,
                    chossonMotherName: couple.chossonMotherTitle + ' ' + couple.chossonMother,
                    kallahFatherName: couple.kallahFatherTitle + ' ' + couple.kallahFather,
                    kallahMotherName: couple.kallahMotherTitle + ' ' + couple.kallahMother,
                    chossonOrigin: couple.chossonOrigin,
                    kallahOrigin: couple.kallahOrigin,
                    weddingDate: couple.weddingDate,
                    personalShopper: couple.personalShopper
                })
            } catch (err) {
                console.error(err)
                return res.status(500).json({ error: "Internal server error" })
            }
        },
        // uploadAnnouncement: async (req, res) => {
        //     try {
        //       const coupleId = req.body.coupleId;
        //       const couple = await Couples.findById(coupleId);
          
        //       if (!couple) {
        //         return res.status(404).json({ message: "Couple not found" });
        //       }
        //       console.log('found couple')
          
        //       const path = require('path');
        //       const imageFolderPath = path.join(__dirname, '/../uploads');
          
        //       console.log('imageFolderPath: ' + imageFolderPath)
          
        //       const imagePath = path.join(imageFolderPath, req.file.filename);
          
        //       console.log('imagePath: ' + imagePath)
          
        //       const imageBuffer = fs.readFileSync(imagePath);
        //     couple.image = imageBuffer;
        //     await couple.save();

        //       return res.status(200).json({ message: "Image uploaded successfully" });
        //     } catch (err) {
        //       console.error(err);
        //       return res.status(500).json({ message: "Internal server error" });
        //     }
        //   }
            
        uploadAnnouncement: async (req, res) => {
            try {
              const coupleId = req.body.coupleId;
              const couple = await Couples.findById(coupleId);
              
              if (!couple) {
                return res.status(404).json({ message: "Couple not found" });
              }
            
              console.log('About to read file')
              const imageBuffer = fs.readFileSync(req.file.path,'binary');
              //const imageBuffer = fs.readFileSync(req.file.path);
              console.log('Resizing image')
              //const resizedImageBuffer = await sharp(imageBuffer).resize({ width: 500 }).toBuffer();
              //const resizedImageBuffer = await sharp(imageBuffer).resize({ width: 500 });
              console.log('Converting to base64')
              //couple.image = resizedImageBuffer;
              //let buff=new Buffer(imageBuffer)
              //couple.imageString=btoa(imageBuffer);
              couple.imageString=btoa(imageBuffer);
              console.log('Saving couple')
              fs.unlinkSync(req.file.path)
              await couple.save();
              console.log('saved image to db')
              await Couples.updateOne({ _id: coupleId}, { $set: { announcement: true } });



              const newAnouncement = new Announcements(
                {
                  chosson: couple.chossonName,
                  kallah: couple.kallahName,
                  imageString: couple.imageString=btoa(imageBuffer),  
                  tempId: coupleId
                }
            )
                await newAnouncement.save()
                console.log('saved announcement to db')

                
                // wrong file
              
                const oldestAnnouncement = await Announcements.findOneAndDelete({}, { sort: { _id: 1 } });
                console.log(`Deleted oldest announcement: ${oldestAnnouncement.value}`);
                
              

              return res.status(200).json({ message: "Image uploaded successfully" });
            } catch (err) {
              console.error(err);
              return res.status(500).json({ message: "Internal server error" });
            }
          }
            
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



