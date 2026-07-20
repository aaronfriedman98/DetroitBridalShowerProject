const Couples = require('../models/couplesList')
const Announcements = require('../models/newAnnouncements')
const NewCouple = require('../models/newCouple')
const Emails = require('../models/emailList')

//test emails
const TestEmails = require('../models/testEmails')



const sgMail = require('@sendgrid/mail')
const sgClient = require('@sendgrid/client')
const { buildCollectionEmail, buildPersonalCollectionEmail, buildInstructionsEmail } = require('../mailTemplates')
// const expressFileUpload = require('express-fileupload')

const fs = require('fs');
const path = require('path');

// const sharp = require('sharp');



sgMail.setApiKey(process.env.API_KEY)
sgClient.setApiKey(process.env.API_KEY)

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

async function deleteContactFromList(listID, contact) {
  const request = {
    url: `/v3/marketing/lists/${listID}/contacts`,
    method: 'DELETE',
    qs: {
      "contact_ids": contact.id
    }
  }
  await sgClient.request(request);
 }


module.exports = {
    // getAdminPage : async (req, res) => {
    //     try {
    //       const couples = await Couples.find()//.sort({ createdAt: -1 });
    //         const announcements = await Announcements.find()
    //         const newCouple = await NewCouple.find()
    //         res.render('newAdmin.ejs', {coupleInfo : couples.reverse(), newAnnouncements : announcements, newCouple : newCouple})
    //     } catch (err) {
    //         return res.status(500).send(err)
    //     }
    // },
    getAdminPage: async (req, res) => {
      try {
        // exclude embedded announcement images - they add megabytes to the page
        const couples = await Couples.find().select('-image -imageString').sort({ _id: -1 })
        const newCouple = await NewCouple.find();
        res.render('newAdmin.ejs', { coupleInfo: couples, newCouple: newCouple });
      } catch (err) {
        console.error(err)
        return res.status(500).send(err);
      }
    },
    getData: async (req, res) => {
      try {
        const couples = await Couples.find().select('-image -imageString').sort({ _id: -1 })
        const newCouple = await NewCouple.find()
        res.json({ couples, newCouple })
      } catch (err) {
        console.error(err)
        return res.status(500).json({ error: 'Could not load data' })
      }
    },
    updateEntry: async (req, res) => {
      try {
        const editableFields = [
          'chossonName', 'chossonFatherTitle', 'chossonFatherName', 'chossonMotherTitle', 'chossonMotherName', 'chossonOrigin',
          'kallahName', 'kallahFatherTitle', 'kallahFatherName', 'kallahMotherTitle', 'kallahMotherName', 'kallahOrigin',
          'chossonMotherDivorcedTitle', 'chossonMotherDivorcedName', 'chossonMotherHusbandTitle', 'chossonMotherHusbandName',
          'kallahMotherDivorcedTitle', 'kallahMotherDivorcedName', 'kallahMotherHusbandTitle', 'kallahMotherHusbandName',
          'chossonDeceased', 'kallahDeceased', 'chesedPackage',
          'name', 'email', 'phoneNumber', 'address', 'weddingDate', 'personalShopper'
        ]
        const updates = {}
        for (const field of editableFields) {
          if (req.body[field] !== undefined) updates[field] = req.body[field]
        }
        const couple = await Couples.findByIdAndUpdate(req.body.id, { $set: updates }, { new: true, select: '-image -imageString' })
        if (!couple) return res.status(404).json({ status: false, message: 'Couple not found' })

        // keep the pending new-couple record in sync if it mirrors this couple
        await NewCouple.updateOne({ tempId: String(couple._id) }, { $set: {
          chosson: couple.chossonName, kallah: couple.kallahName,
          chossonFatherTitle: couple.chossonFatherTitle, chossonFatherName: couple.chossonFatherName,
          chossonMotherTitle: couple.chossonMotherTitle, chossonMotherName: couple.chossonMotherName,
          chossonOrigin: couple.chossonOrigin,
          kallahFatherTitle: couple.kallahFatherTitle, kallahFatherName: couple.kallahFatherName,
          kallahMotherTitle: couple.kallahMotherTitle, kallahMotherName: couple.kallahMotherName,
          kallahOrigin: couple.kallahOrigin,
          chossonMotherDivorcedTitle: couple.chossonMotherDivorcedTitle, chossonMotherDivorcedName: couple.chossonMotherDivorcedName,
          chossonMotherHusbandTitle: couple.chossonMotherHusbandTitle, chossonMotherHusbandName: couple.chossonMotherHusbandName,
          kallahMotherDivorcedTitle: couple.kallahMotherDivorcedTitle, kallahMotherDivorcedName: couple.kallahMotherDivorcedName,
          kallahMotherHusbandTitle: couple.kallahMotherHusbandTitle, kallahMotherHusbandName: couple.kallahMotherHusbandName,
          email: couple.email, phoneNumber: couple.phoneNumber
        }})

        return res.json({ status: true, couple })
      } catch (err) {
        console.error(err)
        return res.status(500).json({ status: false, message: 'Error updating couple' })
      }
    },

  //   unsubscribe : async (req, res) => {
  //     try {
  //         res.render('unsubscribe.ejs')
  //     } catch (err) {
  //         if (err) return res.status(500).send(err)
  //     }
  // },
  // removeEmailFromList : async (req, res) => {
  //   try {
  //     //search the emailDB for the inputed email
  //     const email = req.body.email
  //     console.log(email)
  //     const result = await TestEmails.findOneAndDelete({ email: email });

  //     if (result) {
  //       return res.render('message.ejs', {title: '', message: 'You have been unsubscribed from the mailing list.'})
  //     } else {
  //       return res.render('message.ejs', {title: 'Oops!', message: 'We could not find your email in our mailing list.'})
  //     }
  //   } catch (err) {
  //     if (err) return res.status(500).send(err)
  //   }
  // },
    
    adminVerification : async (req, res) => {
        try {
            const couples = await Couples.find()
            res.render( 'adminVerification.ejs', {coupleInfo : couples})
        } catch (err) {
            res.status(500).send(err)
        }
    },
    adminUpload : async (req, res) => {
        try {
            const couples = await Couples.find()
            res.render( 'adminUpload.ejs', {coupleInfo : couples})
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

            res.render( 'newAdminTable.ejs', { coupleInfo : couples })
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
                chossonFatherName: req.body.chossonFatherName,
                chossonMotherTitle: req.body.chossonMotherTitle,
                chossonMotherName: req.body.chossonMotherName,
                chossonOrigin: req.body.chossonOrigin,
                kallahName: req.body.kallahName,
                kallahFatherTitle: req.body.kallahFatherTitle,
                kallahFatherName: req.body.kallahFatherName,
                kallahMotherTitle: req.body.kallahMotherTitle,
                kallahMotherName: req.body.kallahMotherName,
                kallahOrigin: req.body.kallahOrigin,

                chossonMotherDivorcedTitle: req.body.chossonMotherDivorcedTitle,
                chossonMotherDivorcedName: req.body.chossonMotherDivorcedName,
                kallahMotherDivorcedTitle: req.body.kallahMotherDivorcedTitle,
                kallahMotherDivorcedName: req.body.kallahMotherDivorcedName,
                chossonMotherHusbandTitle: req.body.chossonMotherHusbandTitle,
                chossonMotherHusbandName: req.body.chossonMotherHusbandName,
                kallahMotherHusbandTitle: req.body.kallahMotherHusbandTitle,
                kallahMotherHusbandName: req.body.kallahMotherHusbandName,

                name: req.body.name,
                email: req.body.email,
                phoneNumber: req.body.phoneNumber,
                address: req.body.address,
                weddingDate: req.body.weddingDate,
                personalShopper: req.body.personalShopper,

                chossonDeceased: req.body.chossonDeceased,
                kallahDeceased: req.body.kallahDeceased,

                collecting: false,
                verified: false
            }
            )
            await newCouple.save()
            console.log(req.body)

            // const newCoupleDB = new NewCouple(
            //     {
            //       chosson: req.body.chossonName,
            //       kallah: req.body.kallahName,
            //       chossonFatherTitle: req.body.chossonFatherTitle,
            //       chossonFather : req.body.chossonFatherName,
            //       chossonMotherTitle: req.body.chossonMotherTitle,
            //       chossonMother: req.body.chossonMotherName,
            //       chossonOrigin: req.body.chossonOrigin,
            //       kallahFatherTitle: req.body.kallahFatherTitle,
            //       kallahFather: req.body.kallahFatherName,
            //       kallahMotherTitle: req.body.kallahMotherTitle,
            //       kallahMother: req.body.kallahMotherName,
            //       kallahOrigin: req.body.kallahOrigin,
            //       email: req.body.email,
            //       phoneNumber: req.body.phoneNumber,
            //       tempId: req.body._id
            //     }
            //   )
            //   await newCoupleDB.save()
  
  
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
                message: 'There was a problem with your submission. Please try again.'
            })
        }
    },
    deleteEntry : async (req, res) => {
            try{
                await Couples.deleteOne({_id: req.body.id})
                // only remove the pending new-couple record if it belongs to this couple
                await NewCouple.deleteOne({ tempId: String(req.body.id) })
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

              await Couples.updateOne({ _id: req.body.id }, { $set: { verified: true } });
              
        
              const newCouple = new NewCouple(
                {
                  chosson: couple.chossonName,
                  kallah: couple.kallahName,
                  chossonFatherTitle: couple.chossonFatherTitle,
                  chossonFatherName : couple.chossonFatherName,
                  chossonMotherTitle: couple.chossonMotherTitle,
                  chossonMotherName: couple.chossonMotherName,
                  chossonOrigin: couple.chossonOrigin,
                  kallahFatherTitle: couple.kallahFatherTitle,
                  kallahFatherName: couple.kallahFatherName,
                  kallahMotherTitle: couple.kallahMotherTitle,
                  kallahMotherName: couple.kallahMotherName,
                  kallahOrigin: couple.kallahOrigin,
                  chossonMotherDivorcedTitle: couple.chossonMotherDivorcedTitle,
                  chossonMotherDivorcedName: couple.chossonMotherDivorcedName,
                  kallahMotherDivorcedTitle: couple.kallahMotherDivorcedTitle,
                  kallahMotherDivorcedName: couple.kallahMotherDivorcedName,
                  chossonMotherHusbandTitle: couple.chossonMotherHusbandTitle,
                  chossonMotherHusbandName: couple.chossonMotherHusbandName,
                  kallahMotherHusbandTitle: couple.kallahMotherHusbandTitle,
                  kallahMotherHusbandName: couple.kallahMotherHusbandName,

                  email: couple.email,
                  phoneNumber: couple.phoneNumber,
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
              if(newCouple && couple.chossonName === newCouple.chosson && couple.kallahName === newCouple.kallah) {
                // console.log(couple.chossonName + " " + newCouple.chosson)
                await NewCouple.findOneAndDelete({}, { sort: { _id: 1 } });
              }
                return res.json('unverified');
                }
          } catch (err) {
            console.error(err)
            return res.json('error');
          }
        }
,
sendNewsletter: async (req, res) => {
    try {

      await Couples.updateOne({ _id: req.body.id }, { $set: { verified: true } });

        //get List ID function
      // async function getListID(listName) {
      //   const request = {
      //     url: `/v3/marketing/lists`,
      //     method: 'GET'
      //   }
      //   const response = await sgClient.request(request)
      //   const allLists = response[1].result
      //   return allLists.find(x => x.name === listName).id
      // }
      async function getListID(listName) {
  const request = {
    url: `/v3/marketing/lists`,
    method: 'GET'
  };

  const [meta, body] = await sgClient.request(request);

  if (meta.statusCode !== 200) {
    throw new Error(`Failed to fetch lists. Status: ${meta.statusCode}`);
  }

  const allLists = body?.result || [];
  const match = allLists.find(x => x.name === listName);

  if (!match) {
    console.error(`List "${listName}" not found. Available lists:`, allLists.map(l => l.name));
    throw new Error(`List "${listName}" not found.`);
  }

  console.log(`Found list "${listName}" with id ${match.id}`);
  return match.id;
}



        const listID = await getListID('Newsletter Subscribers')

      console.log("listID: " + listID)

      const newCouple = await Couples.findOne({ _id: req.body.id })

      const databaseCouples = await Couples.find().sort({_id: -1})

      console.log("newCouple: " + newCouple)

//TEMP EDGE CASE
      const isBronfinEdgeCase = (doc) => {
  const nameOk   = (doc?.chossonName || '').trim().toLowerCase() === 'chaim bronfin';
  const motherOk = (doc?.chossonMotherName || '').trim().toLowerCase() === 'devorah bronfin';

  // If you prefer to pin to the _id too, uncomment this line:
  // const idOk = doc?._id?.toString() === '68ad1286f06feeecdcade065';

  return nameOk && motherOk; // && idOk;
};

const formatBronfinEdgeCase = (doc) => {
  const motherLine = `${doc?.chossonMotherTitle || ''} ${doc?.chossonMotherName || ''}`.trim();
  return `<strong>${doc.chossonName}</strong> is engaged to <strong>${doc.kallahName}</strong> <br> son of ${motherLine} <br> <br>`;
};


     // Flags (place near where you set hasKallahFather)
const hasChossonFather = !!(newCouple.chossonFatherName && newCouple.chossonFatherName.trim());
const hasKallahFather  = !!(newCouple.kallahFatherName  && newCouple.kallahFatherName.trim());




//new couple 
let chossonFather = ""
              let chossonMotherField1 = ""
              let chossonMotherField2 = ""
              let chossonMotherHusband = ""

              let kallahFather = ""
              let kallahMotherField1 = ""
              let kallahMotherField2 = ""
              let kallahMotherHusband = ""

              //Fathers are easy since those fields are required no matter what
              // chossonFather = newCouple.chossonFatherTitle + " " + newCouple.chossonFatherName
              // kallahFather = newCouple.kallahFatherTitle + " " + newCouple.kallahFatherName JUST REMOVED THIS

              if (hasChossonFather) {
  const t = (newCouple.chossonFatherTitle || "").trim();
  const n = (newCouple.chossonFatherName  || "").trim();
  chossonFather = `${t} ${n}`.trim();
}

             if (hasKallahFather) {
  const t = (newCouple.kallahFatherTitle || "").trim();
  const n = (newCouple.kallahFatherName  || "").trim();
  kallahFather = `${t} ${n}`.trim();
}

              //Mothers husband is also easy since that optional no matter what
              if(newCouple.chossonMotherHusbandName !== "") {
                chossonMotherHusband = newCouple.chossonMotherHusbandTitle + " " + newCouple.chossonMotherHusbandName
              }
              if(newCouple.kallahMotherHusbandName !== "") {
                kallahMotherHusband = newCouple.kallahMotherHusbandTitle + " " + newCouple.kallahMotherHusbandName
              }

              //deal with mother/husband wife
              if(newCouple.chossonMotherDivorcedName !== "") {
                //if the mother is divorced, then motherfield2 is required
                chossonMotherField2 = newCouple.chossonMotherDivorcedTitle + " " + newCouple.chossonMotherDivorcedName
                //if the mother is divorced, then motherfield1 is not required
                if(newCouple.chossonMotherName !== "") {
                  chossonMotherField1 = newCouple.chossonMotherTitle + " " + newCouple.chossonMotherName
                }
              } else {
                //if the mother is not divorced, then motherfield1 is required
                chossonMotherField1 = newCouple.chossonMotherTitle + " " + newCouple.chossonMotherName
              }

              if(newCouple.kallahMotherDivorcedName !== "") {
                //if the mother is divorced, then motherfield2 is required
                kallahMotherField2 = newCouple.kallahMotherDivorcedTitle + " " + newCouple.kallahMotherDivorcedName
                //if the mother is divorced, then motherfield1 is not required
                if(newCouple.kallahMotherName !== "") {
                  kallahMotherField1 = newCouple.kallahMotherTitle + " " + newCouple.kallahMotherName
                }
              } else {
                //if the mother is not divorced, then motherfield1 is required
                kallahMotherField1 = newCouple.kallahMotherTitle + " " + newCouple.kallahMotherName
              }





let newCoupleString = ""

// console.log(newCouple)


//TEMP EDGE CASE
if (isBronfinEdgeCase(newCouple)) {
  newCoupleString += formatBronfinEdgeCase(newCouple);
} else {

        let isDivorcedChossonSide = false
        let isDivorcedKallahSide = false

        if(newCouple.chossonMotherDivorcedName !== "") {
          isDivorcedChossonSide = true
        }
        if(newCouple.kallahMotherDivorcedName !== "") {
          isDivorcedKallahSide = true
        }
        //FIX THE TRAILING WHITE SPACES IN THE DATABASE
        // let chossonFatherFNameNew = (newCouple.chossonFatherName || "").split(" ");
        // let chossonLastName = chossonFatherFNameNew.pop(); // Remove the last name
        // chossonFatherFNameNew = chossonFatherFNameNew.join(" ");

        let chossonMotherFNameNew = (newCouple.chossonMotherName || "").split(" ");
        chossonMotherFNameNew.pop(); // Remove the last name
        chossonMotherFNameNew = chossonMotherFNameNew.join(" ");

        // let kallahFatherFNameNew = (newCouple.kallahFatherName || "").split(" ");
        // let kallahLastName = kallahFatherFNameNew.pop(); // Remove the last name
        // kallahFatherFNameNew = kallahFatherFNameNew.join(" ");

        let chossonFatherFNameNew = "", chossonLastName = "";
if (hasChossonFather) {
  const parts = (newCouple.chossonFatherName || "").trim().split(/\s+/);
  chossonLastName = parts.length ? parts.pop() : "";
  chossonFatherFNameNew = parts.join(" ");
}


        let kallahFatherFNameNew = "", kallahLastName = "";
if (hasKallahFather) {
  const parts = newCouple.kallahFatherName.trim().split(/\s+/);
  kallahLastName = parts.length ? parts.pop() : "";
  kallahFatherFNameNew = parts.join(" ");
}


        let kallahMotherFNameNew = (newCouple.kallahMotherName || "").split(" ");
        kallahMotherFNameNew.pop(); // Remove the last name
        kallahMotherFNameNew = kallahMotherFNameNew.join(" ");

        //stepFathers last name
        let chossonStepDadFNameNew = ""
        let stepdadlastname = ""
        if(newCouple.chossonMotherHusbandName !== "") {
          chossonStepDadFNameNew = (newCouple.chossonMotherHusbandName || "").split(" ")
          stepdadlastname = chossonStepDadFNameNew.pop()
          chossonStepDadFNameNew = chossonStepDadFNameNew.join(" ")
        }
        let chossonDivorcedMotherFNameNew = ""
        if(newCouple.chossonMotherDivorcedName !== "") {
          chossonDivorcedMotherFNameNew = (newCouple.chossonMotherDivorcedName || "").split(" ")
          chossonDivorcedMotherFNameNew.pop()
          chossonDivorcedMotherFNameNew = chossonDivorcedMotherFNameNew.join(" ")
        }
        //kallah
        let kallahStepDadFNameNew = ""
        let stepdadlastnameKallah = ""
        if(newCouple.kallahMotherHusbandName !== "") {
          kallahStepDadFNameNew = (newCouple.kallahMotherHusbandName || "").split(" ")
          stepdadlastnameKallah = kallahStepDadFNameNew.pop()
          kallahStepDadFNameNew = kallahStepDadFNameNew.join(" ")
        }
        let kallahDivorcedMotherFNameNew = ""
        if(newCouple.kallahMotherDivorcedName !== "") {
          kallahDivorcedMotherFNameNew = (newCouple.kallahMotherDivorcedName || "").split(" ")
          kallahDivorcedMotherFNameNew.pop()
          kallahDivorcedMotherFNameNew = kallahDivorcedMotherFNameNew.join(" ")
        }
        

        if(newCouple.chossonOrigin === 'detroit' && newCouple.kallahOrigin === 'detroit') {
          if(isDivorcedChossonSide === false && isDivorcedKallahSide === false) {
          newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`
          }
          else if(isDivorcedChossonSide && isDivorcedKallahSide === false) {
            if(chossonMotherField1 === "" && chossonMotherHusband === "") { 
              // newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> son of ${chossonFather} <br> son of ${chossonMotherField2} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`
            newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> ${hasChossonFather ? `son of ${chossonFather} <br>` : ``} son of ${chossonMotherField2} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`;

            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband === "") {
              newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${chossonMotherField2} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`
            }
            else if(chossonMotherField1 === "" && chossonMotherHusband !== "") {
              // newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> son of ${chossonFather} <br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`
           newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> ${hasChossonFather ? `son of ${chossonFather} <br>` : ``} son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`;

            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband !== "") {
              newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`
            }
          }
          else if(isDivorcedChossonSide === false && isDivorcedKallahSide) {
            if(kallahMotherField1 === "" && kallahMotherHusband === "") {
            // newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> and daughter of ${kallahFather} <br> daughter of ${kallahMotherField2} <br> <br>`
            newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> ${hasKallahFather ? `and daughter of ${kallahFather} <br>` : ``} daughter of ${kallahMotherField2} <br> <br>`;

          }
            else if(kallahMotherField1 !== "" && kallahMotherHusband === "") {
              newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${kallahMotherField2} <br> <br>`
            }
            else if(kallahMotherField1 === "" && kallahMotherHusband !== "") {
              //newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> and daughter of ${kallahFather} <br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
              newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> ${hasKallahFather ? `and daughter of ${kallahFather} <br>` : ``} daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`;
            }
            else if(kallahMotherField1 !== "" && kallahMotherHusband !== "") {
              newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
            }
          }
          else if(isDivorcedChossonSide && isDivorcedKallahSide) {
            if(chossonMotherField1 === "" && chossonMotherHusband === "" && kallahMotherField1 === "" && kallahMotherHusband === "") {
              // newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> son of ${chossonFather} <br> son of ${chossonMotherField2} <br> and daughter of ${kallahFather} <br> daughter of ${kallahMotherField2} <br> <br>`
newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> ${hasChossonFather ? `son of ${chossonFather} <br>` : ``} son of ${chossonMotherField2} <br> ${hasKallahFather ? `and daughter of ${kallahFather} <br>` : ``} daughter of ${kallahMotherField2} <br> <br>`;

            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband === "" && kallahMotherField1 === "" && kallahMotherHusband === "") {
              // newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${chossonMotherField2} <br> and daughter of ${kallahFather} <br> daughter of ${kallahMotherField2} <br> <br>`
            newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${chossonMotherField2} <br> ${hasKallahFather ? `and daughter of ${kallahFather} <br>` : ``} daughter of ${kallahMotherField2} <br> <br>`;

            }
            else if(chossonMotherField1 === "" && chossonMotherHusband !== "" && kallahMotherField1 === "" && kallahMotherHusband === "") {
              //newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> son of ${chossonFather} <br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${kallahFather} <br> daughter of ${kallahMotherField2} <br> <br>`
newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> ${hasChossonFather ? `son of ${chossonFather} <br>` : ``} son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> ${hasKallahFather ? `and daughter of ${kallahFather} <br>` : ``} daughter of ${kallahMotherField2} <br> <br>`;

            }
            else if(chossonMotherField1 === "" && chossonMotherHusband === "" && kallahMotherField1 !== "" && kallahMotherHusband === "") {
              // newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> son of ${chossonFather} <br> son of ${chossonMotherField2} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${kallahMotherField2} <br> <br>`
            newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> ${hasChossonFather ? `son of ${chossonFather} <br>` : ``} son of ${chossonMotherField2} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${kallahMotherField2} <br> <br>`;

            }
            else if(chossonMotherField1 === "" && chossonMotherHusband === "" && kallahMotherField1 === "" && kallahMotherHusband !== "") {
              // newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> son of ${chossonFather} <br> son of ${chossonMotherField2} <br> and daughter of ${kallahFather} <br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> ${hasChossonFather ? `son of ${chossonFather} <br>` : ``} son of ${chossonMotherField2} <br> ${hasKallahFather ? `and daughter of ${kallahFather} <br>` : ``} daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`;

            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband !== "" && kallahMotherField1 === "" && kallahMotherHusband === "") {
              // newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} and ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${kallahFather} <br> daughter of ${kallahMotherField2} <br> <br>`
            newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} and ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> ${hasKallahFather ? `and daughter of ${kallahFather} <br>` : ``} daughter of ${kallahMotherField2} <br> <br>`;

            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband === "" && kallahMotherField1 !== "" && kallahMotherHusband !== "") {
              newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${chossonMotherField2} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
            }
            else if(chossonMotherField1 === "" && chossonMotherHusband !== "" && kallahMotherField1 !== "" && kallahMotherHusband !== "") {
              // newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> son of ${chossonFather} <br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} and ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
            newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> ${hasChossonFather ? `son of ${chossonFather} <br>` : ``} son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} and ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`;

            }
            //more variations FIX LAST NAMES FOR ALL GROUPED COUPLES
            else if(chossonMotherField1 !== "" && chossonMotherHusband !== "" && kallahMotherField1 !== "" && kallahMotherHusband === "") {
              newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName}<br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname}<br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName}<br> daughter of ${kallahMotherField2}<br> <br>`
            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband !== "" && kallahMotherField1 === "" && kallahMotherHusband !== "") {
              // newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName}<br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname}<br> and daughter of ${kallahFather} <br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah}<br> <br>`
            newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName}<br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname}<br> ${hasKallahFather ? `and daughter of ${kallahFather} <br>` : ``} daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah}<br> <br>`;

            }
            else if(chossonMotherField1 === "" && chossonMotherHusband !== "" && kallahMotherField1 === "" && kallahMotherHusband !== "") {
              // newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> son of ${chossonFather} <br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} and ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${kallahFather} <br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah}<br> <br>`
newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> ${hasChossonFather ? `son of ${chossonFather} <br>` : ``} son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} and ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> ${hasKallahFather ? `and daughter of ${kallahFather} <br>` : ``} daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah}<br> <br>`;

            }
            else if(chossonMotherField1 === "" && chossonMotherHusband === "" && kallahMotherField1 !== "" && kallahMotherHusband !== "") {
              // newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> son of ${chossonFather} <br> son of ${chossonMotherField2} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} & ${kallahMotherFNameNew} ${kallahLastName}<br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah}<br> <br>`
            newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> ${hasChossonFather ? `son of ${chossonFather} <br>` : ``} son of ${chossonMotherField2} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} & ${kallahMotherFNameNew} ${kallahLastName}<br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah}<br> <br>`;

            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband !== "" && kallahMotherField1 !== "" && kallahMotherHusband !== "") {
              newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong><br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} & ${chossonMotherFNameNew} ${chossonLastName}<br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname}<br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} & ${kallahMotherFNameNew} ${kallahLastName}<br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah}<br> <br>`
            }
            else if(chossonMotherField1 === "" && chossonMotherHusband !== "" && kallahMotherField1 !== "" && kallahMotherHusband === "") {
              // newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> son of ${chossonFather} <br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} and ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} & ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${kallahMotherField2} <br> <br>`
            newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> ${hasChossonFather ? `son of ${chossonFather} <br>` : ``} son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} and ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} & ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${kallahMotherField2} <br> <br>`;

            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband === "" && kallahMotherField1 === "" && kallahMotherHusband !== "") {
              // newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} & ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${chossonMotherField2} <br> and daughter of ${kallahFather} <br> daughter of daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
           newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} & ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${chossonMotherField2} <br> ${hasKallahFather ? `and daughter of ${kallahFather} <br>` : ``} daughter of daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`;

            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband === "" && kallahMotherField1 !== "" && kallahMotherHusband === "") {
              // newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} ${chossonMotherFNameNew} ${chossonLastName}<br> son of ${chossonMotherField2} <br> and daughter of ${kallahFather} <br> daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} ${kallahMotherFNameNew} ${kallahLastName}<br> daughter of ${kallahMotherField2} <br> <br>`
            newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} ${chossonMotherFNameNew} ${chossonLastName}<br> son of ${chossonMotherField2} <br> ${hasKallahFather ? `and daughter of ${kallahFather} <br>` : ``} daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} ${kallahMotherFNameNew} ${kallahLastName}<br> daughter of ${kallahMotherField2} <br> <br>`;

            }

          }
        }
        else if(newCouple.chossonOrigin === 'detroit') {
          if(isDivorcedChossonSide === false) {
          newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} & ${chossonMotherFNameNew} ${chossonLastName} <br> <br>`
          }
          else if(isDivorcedChossonSide) {
            if(chossonMotherField1 === "" && chossonMotherHusband === "") { 
              // newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br>  son of ${chossonFather} <br> son of ${chossonMotherField2} <br> <br>`
            newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> ${hasChossonFather ? `son of ${chossonFather} <br>` : ``} son of ${chossonMotherField2} <br> <br>`;

            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband === "") {
              newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong>  <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} & ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${chossonMotherField2} <br> <br>`
            }
            else if(chossonMotherField1 === "" && chossonMotherHusband !== "") {
              // newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong>  <br> son of ${chossonFather} <br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> <br>`
           newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong>  <br> ${hasChossonFather ? `son of ${chossonFather} <br>` : ``} son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> <br>`;

            }
            else if(chossonMotherField1 !== "" && chossonMotherHusband !== "") {
              newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong>  <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} & ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> <br>`
            }
        }
      }
        
        else if(newCouple.kallahOrigin === 'detroit') {
          if(isDivorcedKallahSide === false) {
            newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`
          }
          else if(isDivorcedKallahSide) {
            if(kallahMotherField1 === "" && kallahMotherHusband === "") {
            newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong>  <br> daughter of ${kallahFather} <br> daughter of ${kallahMotherField2} <br> <br>`
            }
            else if(kallahMotherField1 !== "" && kallahMotherHusband === "") {
              newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong>  <br> daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} & ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${kallahMotherField2} <br> <br>`
            }
            else if(kallahMotherField1 === "" && kallahMotherHusband !== "") {
              newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong>  <br> daughter of ${kallahFather} <br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
            }
            else if(kallahMotherField1 !== "" && kallahMotherHusband !== "") {
              newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong>  <br> daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} & ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
            }
          }
        }







//TEMP EDGE CASE ENDING
      }


console.log("putting together the email")





// let chossonFatherFNameNewOld = (newCouple.chossonFather || "").split(" ").slice(0, -1).join(" ")
// let kallahFatherFNameNewOld = (newCouple.kallahFather || "").split(" ").slice(0, -1).join(" ")

// if(newCouple.chossonOrigin === 'detroit' && newCouple.kallahOrigin === 'detroit') {
//     newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to <strong>${newCouple.kallahName}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${newCouple.chossonMother} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${newCouple.kallahMother} <br> <br>`
// }
// else if(newCouple.chossonOrigin === 'detroit') {
//     newCoupleString += `<strong>${newCouple.chossonName}</strong> is engaged to ${newCouple.kallahName} <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${newCouple.chossonMother} <br> <br>`
// }
// else {
//     newCoupleString += `<strong>${newCouple.kallahName}</strong> is engaged to ${newCouple.chossonName} <br> daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${newCouple.kallahMother} <br> <br>`
// }

// console.log("new couple string: " + newCoupleString)

//couples still collecting for
let couplesString = ""

//set parent name variables that were filled out
let chossonFather1 = ""
let chossonMotherField11 = ""
let chossonMotherField21 = ""
let chossonMotherHusband1 = ""

let kallahFather1 = ""
let kallahMotherField11 = ""
let kallahMotherField21 = ""
let kallahMotherHusband1 = ""


let isDivorcedChossonSide1 = false
let isDivorcedKallahSide1 = false



for(let i = 0; i < databaseCouples.length; i++) {


  chossonFather1 = ""
  chossonMotherField11 = ""
  chossonMotherField21 = ""
  chossonMotherHusband1 = ""

  kallahFather1 = ""
  kallahMotherField11 = ""
  kallahMotherField21 = ""
  kallahMotherHusband1 = ""

  isDivorcedChossonSide1 = false
  isDivorcedKallahSide1 = false


  if (databaseCouples[i].collecting === true && !databaseCouples[i]._id.equals(newCouple._id)) {

    //TEMP edge case
      // >>> EDGE CASE in the list: skip default builder and print mother-only
  if (isBronfinEdgeCase(databaseCouples[i])) {
    couplesString += formatBronfinEdgeCase(databaseCouples[i]);
    continue; // important: prevents the long branch logic from also running
  }


    console.log("couplesString: " + couplesString)

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
          console.log("kallah mother husband: " + kallahMotherHusband1)
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
          // console.log("THIS SHOULD SHOW UP")
          console.log("kallah mother field 21: " + kallahMotherField21)

          if(databaseCouples[i].kallahMotherName !== "") {
            console.log("THIS SHOULD NOT SHOW UP")
            kallahMotherField11 = databaseCouples[i].kallahMotherTitle + " " + databaseCouples[i].kallahMotherName
          }
          console.log("kallah mother field 11: " + kallahMotherField11)
        } else {
          //if the mother is not divorced, then motherfield1 is required
          kallahMotherField11 = databaseCouples[i].kallahMotherTitle + " " + databaseCouples[i].kallahMotherName
        }

        
        




    let chossonFatherFName = (databaseCouples[i].chossonFatherName || "").split(" ")
    let chossonLastNameOld = chossonFatherFName.pop(); // Remove the last name
    chossonFatherFName = chossonFatherFName.join(" ");

    let kallahFatherFName = (databaseCouples[i].kallahFatherName || "").split(" ")
    let kallahLastNameOld = kallahFatherFName.pop(); // Remove the last name
    kallahFatherFName = kallahFatherFName.join(" ");

    let chossonMotherFName = (databaseCouples[i].chossonMotherName || "").split(" ")
    chossonMotherFName.pop(); // Remove the last name
    chossonMotherFName = chossonMotherFName.join(" ");

    let kallahMotherFName = (databaseCouples[i].kallahMotherName || "").split(" ")
    kallahMotherFName.pop(); // Remove the last name
    kallahMotherFName = kallahMotherFName.join(" ");
    
    //stepFathers last name
    let chossonStepDadFNameOld = ""
    let stepdadlastnameOld = ""
    if(databaseCouples[i].chossonMotherHusbandName !== "") {
      chossonStepDadFNameOld = (databaseCouples[i].chossonMotherHusbandName || "").split(" ")
      stepdadlastnameOld = chossonStepDadFNameOld.pop()
      chossonStepDadFNameOld = chossonStepDadFNameOld.join(" ")
    }
    let chossonDivorcedMotherFNameOld = ""
    if(databaseCouples[i].chossonMotherDivorcedName !== "") {
      chossonDivorcedMotherFNameOld = (databaseCouples[i].chossonMotherDivorcedName || "").split(" ")
      chossonDivorcedMotherFNameOld.pop()
      chossonDivorcedMotherFNameOld = chossonDivorcedMotherFNameOld.join(" ")
    }
    //kallah
    //eventually can deal with trailing white spaces here
    let kallahStepDadFNameOld = ""
    let stepdadlastnameOldKallah = ""
    if(databaseCouples[i].kallahMotherHusbandName !== "") {
      kallahStepDadFNameOld = (databaseCouples[i].kallahMotherHusbandName || "").split(" ")
      stepdadlastnameOldKallah = kallahStepDadFNameOld.pop()
      kallahStepDadFNameOld = kallahStepDadFNameOld.join(" ")
    }
    let kallahDivorcedMotherFNameOld = ""
    if(databaseCouples[i].kallahMotherDivorcedName !== "") {
      kallahDivorcedMotherFNameOld = (databaseCouples[i].kallahMotherDivorcedName || "").split(" ")
      kallahDivorcedMotherFNameOld.pop()
      kallahDivorcedMotherFNameOld = kallahDivorcedMotherFNameOld.join(" ")
    }
    // let stepdadlastnameOldKallah = ""
    // if(databaseCouples[i].kallahMotherHusbandName !== "") {
    //   stepdadlastnameOldKallah = (databaseCouples[i].kallahMotherHusbandName || "").split(" ").pop()
    // }


  




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
        couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong> <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & ${chossonMotherFName} ${chossonLastNameOld} <br> and daughter of ${kallahFather1} <br> daughter of ${kallahMotherField21} <br> <br>`
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
          // couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong><br> son of ${chossonFather1} <br> son of ${databaseCouples[i].chossonMotherHusbandTitle} & ${databaseCouples[i].chossonMotherDivorcedTitle} ${chossonStepDadFNameOld} & ${chossonDivorcedMotherFNameOld} ${stepdadlastnameOld} <br> and daughter of ${kallahFather} <br> daughter of ${kallahMotherField21} <br> <br>`
        couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong><br> son of ${chossonFather1} <br> son of ${databaseCouples[i].chossonMotherHusbandTitle} & ${databaseCouples[i].chossonMotherDivorcedTitle} ${chossonStepDadFNameOld} & ${chossonDivorcedMotherFNameOld} ${stepdadlastnameOld} <br> ${hasKallahFather ? `and daughter of ${kallahFather} <br>` : ``} daughter of ${kallahMotherField21} <br> <br>`;

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
          console.log("THIS SHOULD SHOWWWWWWWWWWWWWWWWWWWWWWWWWWWWW")
          couplesString += `<strong>${databaseCouples[i].kallahName}</strong> is engaged to ${databaseCouples[i].chossonName} <br> daughter of ${kallahFather1} <br> daughter of ${databaseCouples[i].kallahMotherHusbandTitle} & ${databaseCouples[i].kallahMotherDivorcedTitle} ${kallahStepDadFNameOld} & ${kallahDivorcedMotherFNameOld} ${stepdadlastnameOldKallah} <br> <br>`
        }
        else if(kallahMotherField11 !== "" && kallahMotherHusband1 !== "") {
          couplesString += `<strong>${databaseCouples[i].kallahName}</strong> is engaged to ${databaseCouples[i].chossonName} <br> daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} & ${kallahMotherFName} ${kallahLastNameOld} <br> daughter of ${databaseCouples[i].kallahMotherHusbandTitle} & ${databaseCouples[i].kallahMotherDivorcedTitle} ${kallahStepDadFNameOld} & ${kallahDivorcedMotherFNameOld} ${stepdadlastnameOldKallah} <br> <br>`
        }
      }
    }

    // let chossonFatherFName = (databaseCouples[i].chossonFather || "").split(" ").slice(0, -1).join(" ")
    // let kallahFatherFName = (databaseCouples[i].kallahFather || "").split(" ").slice(0, -1).join(" ")

    // if(databaseCouples[i].chossonOrigin === 'detroit' && databaseCouples[i].kallahOrigin === 'detroit') {
    //     couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong> <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} and ${databaseCouples[i].chossonMother} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} and ${databaseCouples[i].kallahMother} <br> <br>`
    //   }
    // else if(databaseCouples[i].chossonOrigin === 'detroit') {
    //     couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to ${databaseCouples[i].kallahName} <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} and ${databaseCouples[i].chossonMother} <br> <br>`
    //   }
    // else {
    //     couplesString += `<strong>${databaseCouples[i].kallahName}</strong> is engaged to ${databaseCouples[i].chossonName} <br> daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} and ${databaseCouples[i].kallahMother} <br> <br>`
    //   }
  }
}

const unsubscribeURL = process.env.AZURE_URL + '/unsubscribe'

const collectionEmail = buildCollectionEmail(newCoupleString, couplesString, unsubscribeURL)

// preview mode: return the built email html instead of sending anything
if (req.preview) {
  res.set('Content-Type', 'text/html')
  return res.send(collectionEmail)
}

// test mode: send the real email to ONE address only, then stop
if (req.testEmail) {
  await sgMail.send({
    to: req.testEmail,
    from: 'bridalshower@detroitbridalshower.org',
    subject: '[TEST] Collection Email',
    html: collectionEmail
  })
  console.log('test email sent to ' + req.testEmail)
  return res.json('test sent')
}

const personalCollectionEmail = buildPersonalCollectionEmail(newCoupleString)

const instructionsEmail = buildInstructionsEmail()

console.log("email created1")

const instructionsMsg = {
to: newCouple.email, // bridal shower email
from: `bridalshower@detroitbridalshower.org`,
subject: 'Your couple has been verified',
html: instructionsEmail
}

console.log("email created2")

const msg = {
to: newCouple.email, // bridal shower email
from: `bridalshower@detroitbridalshower.org`,
subject: 'Your personal collection email - share with family and friends',
html: personalCollectionEmail
}

//temporary, just testing
await sgMail.send(instructionsMsg)
await sgMail.send(msg)

//temporary, just testing
// const test = {
//   to: 'aronfriedman98@gmail.com', // bridal shower email
//   from: `bridalshower@detroitbridalshower.org`,
//   subject: 'Collection Email',
//   html: collectionEmail
//   }
//   await sgMail.send(test)
//   console.log("sent test")

// await sendNewsletterToList(req, collectionEmail, listID)


    
// const recipients = ['aronfriedman98@gmail.com', 'aronfriedman98+1@gmail.com', 'aronfriedman98+2@gmail.com', 'tzvifriedman@gmail.com', 'beckyfriedman1@gmail.com', 'aronfriedman98+5@gmail.com'];

            
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


// console.log('success')

//send emails in batches
// const emails = await TestEmails.find({})

//temporary, just testing

//  TEMPORARY: override recipients for testing
// const recipients = ['aronfriedman98@gmail.com'];
// console.log("TEST MODE: Only sending to self:", recipients);

// If you want to exit right after this single test send:
// await sgMail.send({
//   to: recipients[0],
//   from: 'bridalshower@detroitbridalshower.org',
//   subject: 'Newsletter TEST',
//   html: collectionEmail,
// });
// console.log("Sent test email to self");
// return res.json('test success');



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


      
      return res.json('success');
    } catch (err) {
  // Surface real SendGrid errors (and any others)
  const sgErr = err?.response?.body || err?.message || err;
  console.error('sendNewsletter failed:', sgErr);
  return res.status(500).json({ ok: false, error: sgErr });
}

  }
,  
sendNewNewsletter: async (req, res) => {
  try {

      //get List ID function
    // async function getListID(listName) {
    //   const request = {
    //     url: `/v3/marketing/lists`,
    //     method: 'GET'
    //   }
    //   const response = await sgClient.request(request)
    //   const allLists = response[1].result
    //   return allLists.find(x => x.name === listName).id
    // }


    //   const listID = await getListID('Newsletter Subscribers')

    // console.log("listID: " + listID)

    const newwCouple = await NewCouple.findOne()

    console.log(newwCouple)

    const count = await NewCouple.countDocuments()

    console.log(count)

    let newCouple = {}
    let newCoupleString = ""

    if(count > 0) {
      newCouple = await NewCouple.findOne()

      console.log(newCouple)
    


      //new couple 
      let chossonFather = ""
              let chossonMotherField1 = ""
              let chossonMotherField2 = ""
              let chossonMotherHusband = ""

              let kallahFather = ""
              let kallahMotherField1 = ""
              let kallahMotherField2 = ""
              let kallahMotherHusband = ""

              //Fathers are easy since those fields are required no matter what
              chossonFather = newCouple.chossonFatherTitle + " " + newCouple.chossonFatherName
              kallahFather = newCouple.kallahFatherTitle + " " + newCouple.kallahFatherName

              //Mothers husband is also easy since that optional no matter what
              if(newCouple.chossonMotherHusbandName !== "") {
                chossonMotherHusband = newCouple.chossonMotherHusbandTitle + " " + newCouple.chossonMotherHusbandName
              }
              if(newCouple.kallahMotherHusbandName !== "") {
                kallahMotherHusband = newCouple.kallahMotherHusbandTitle + " " + newCouple.kallahMotherHusbandName
              }

              //deal with mother/husband wife
              if(newCouple.chossonMotherDivorcedName !== "") {
                //if the mother is divorced, then motherfield2 is required
                chossonMotherField2 = newCouple.chossonMotherDivorcedTitle + " " + newCouple.chossonMotherDivorcedName
                //if the mother is divorced, then motherfield1 is not required
                if(newCouple.chossonMotherName !== "") {
                  chossonMotherField1 = newCouple.chossonMotherTitle + " " + newCouple.chossonMotherName
                }
              } else {
                //if the mother is not divorced, then motherfield1 is required
                chossonMotherField1 = newCouple.chossonMotherTitle + " " + newCouple.chossonMotherName
              }

              if(newCouple.kallahMotherDivorcedName !== "") {
                //if the mother is divorced, then motherfield2 is required
                kallahMotherField2 = newCouple.kallahMotherDivorcedTitle + " " + newCouple.kallahMotherDivorcedName
                //if the mother is divorced, then motherfield1 is not required
                if(newCouple.kallahMotherName !== "") {
                  kallahMotherField1 = newCouple.kallahMotherTitle + " " + newCouple.kallahMotherName
                }
              } else {
                //if the mother is not divorced, then motherfield1 is required
                kallahMotherField1 = newCouple.kallahMotherTitle + " " + newCouple.kallahMotherName
              }


      // let chossonFatherFNameNew = (newCouple.chossonFather || "").split(" ").slice(0, -1).join(" ")
      // let kallahFatherFNameNew = (newCouple.kallahFather || "").split(" ").slice(0, -1).join(" ")

      // if(newCouple.chossonOrigin === 'detroit' && newCouple.kallahOrigin === 'detroit') {
      //   newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${newCouple.chossonMother} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${newCouple.kallahMother} <br> <br>`
      // }
      // else if(newCouple.chossonOrigin === 'detroit') {
      //   newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to ${newCouple.kallah} <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${newCouple.chossonMother} <br> <br>`
      // }
      // else {
      //   newCoupleString += `<strong>${newCouple.kallah}</strong> is engaged to ${newCouple.chosson} <br> daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${newCouple.kallahMother} <br> <br>`
      // }

      // console.log("new couple string: " + newCoupleString)

      let isDivorcedChossonSide = false
      let isDivorcedKallahSide = false

      if(newCouple.chossonMotherDivorcedName !== "") {
        isDivorcedChossonSide = true
      }
      if(newCouple.kallahMotherDivorcedName !== "") {
        isDivorcedKallahSide = true
      }

      let chossonFatherFNameNew = (newCouple.chossonFatherName || "").split(" ");
      let chossonLastName = chossonFatherFNameNew.pop(); // Remove the last name
      chossonFatherFNameNew = chossonFatherFNameNew.join(" ");

      let chossonMotherFNameNew = (newCouple.chossonMotherName || "").split(" ");
      chossonMotherFNameNew.pop(); // Remove the last name
      chossonMotherFNameNew = chossonMotherFNameNew.join(" ");

      let kallahFatherFNameNew = (newCouple.kallahFatherName || "").split(" ");
      console.log(kallahFatherFNameNew)
      let kallahLastName = kallahFatherFNameNew.pop(); // Remove the last name
      console.log(kallahLastName)
      kallahFatherFNameNew = kallahFatherFNameNew.join(" ");


      let kallahMotherFNameNew = (newCouple.kallahMotherName || "").split(" ");
      kallahMotherFNameNew.pop(); // Remove the last name
      kallahMotherFNameNew = kallahMotherFNameNew.join(" ");

      //stepFathers last name
      let chossonStepDadFNameNew = ""
      let stepdadlastname = ""
      if(newCouple.chossonMotherHusbandName !== "") {
        chossonStepDadFNameNew = (newCouple.chossonMotherHusbandName || "").split(" ")
        stepdadlastname = chossonStepDadFNameNew.pop()
        chossonStepDadFNameNew = chossonStepDadFNameNew.join(" ")
      }
      let chossonDivorcedMotherFNameNew = ""
      if(newCouple.chossonMotherDivorcedName !== "") {
        chossonDivorcedMotherFNameNew = (newCouple.chossonMotherDivorcedName || "").split(" ")
        chossonDivorcedMotherFNameNew.pop()
        chossonDivorcedMotherFNameNew = chossonDivorcedMotherFNameNew.join(" ")
      }
      //kallah
      let kallahStepDadFNameNew = ""
      let stepdadlastnameKallah = ""
      if(newCouple.kallahMotherHusbandName !== "") {
        kallahStepDadFNameNew = (newCouple.kallahMotherHusbandName || "").split(" ")
        stepdadlastnameKallah = kallahStepDadFNameNew.pop()
        kallahStepDadFNameNew = kallahStepDadFNameNew.join(" ")
      }
      let kallahDivorcedMotherFNameNew = ""
      if(newCouple.kallahMotherDivorcedName !== "") {
        kallahDivorcedMotherFNameNew = (newCouple.kallahMotherDivorcedName || "").split(" ")
        kallahDivorcedMotherFNameNew.pop()
        kallahDivorcedMotherFNameNew = kallahDivorcedMotherFNameNew.join(" ")
      }

      console.log(kallahFatherFNameNew)
      console.log(kallahMotherFNameNew)
      

      if(newCouple.chossonOrigin === 'detroit' && newCouple.kallahOrigin === 'detroit') {
        if(isDivorcedChossonSide === false && isDivorcedKallahSide === false) {
        newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`
        }
        else if(isDivorcedChossonSide && isDivorcedKallahSide === false) {
          if(chossonMotherField1 === "" && chossonMotherHusband === "") { 
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong> <br> son of ${chossonFather} <br> son of ${chossonMotherField2} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`
          }
          else if(chossonMotherField1 !== "" && chossonMotherHusband === "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${chossonMotherField2} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`
          }
          else if(chossonMotherField1 === "" && chossonMotherHusband !== "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong> <br> son of ${chossonFather} <br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`
          }
          else if(chossonMotherField1 !== "" && chossonMotherHusband !== "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`
          }
        }
        else if(isDivorcedChossonSide === false && isDivorcedKallahSide) {
          if(kallahMotherField1 === "" && kallahMotherHusband === "") {
          // newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> and daughter of ${kallahFather} <br> daughter of ${kallahMotherField2} <br> <br>`
          newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> ${hasKallahFather ? `and daughter of ${kallahFather} <br>` : ``} daughter of ${kallahMotherField2} <br> <br>`;

        }
          else if(kallahMotherField1 !== "" && kallahMotherHusband === "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${kallahMotherField2} <br> <br>`
          }
          else if(kallahMotherField1 === "" && kallahMotherHusband !== "") {
            // newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> and daughter of ${kallahFather} <br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
          newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> ${hasKallahFather ? `and daughter of ${kallahFather} <br>` : ``} daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`;

          }
          else if(kallahMotherField1 !== "" && kallahMotherHusband !== "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
          }
        }
        else if(isDivorcedChossonSide && isDivorcedKallahSide) {
          if(chossonMotherField1 === "" && chossonMotherHusband === "" && kallahMotherField1 === "" && kallahMotherHusband === "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong><br> son of ${chossonFather} <br> son of ${chossonMotherField2} <br> and daughter of ${kallahFather} <br> daughter of ${kallahMotherField2} <br> <br>`
          }
          else if(chossonMotherField1 !== "" && chossonMotherHusband === "" && kallahMotherField1 === "" && kallahMotherHusband === "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong><br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${chossonMotherField2} <br> and daughter of ${kallahFather} <br> daughter of ${kallahMotherField2} <br> <br>`
          }
          else if(chossonMotherField1 === "" && chossonMotherHusband !== "" && kallahMotherField1 === "" && kallahMotherHusband === "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong><br> son of ${chossonFather} <br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${kallahFather} <br> daughter of ${kallahMotherField2} <br> <br>`
          }
          else if(chossonMotherField1 === "" && chossonMotherHusband === "" && kallahMotherField1 !== "" && kallahMotherHusband === "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong><br> son of ${chossonFather} <br> son of ${chossonMotherField2} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${kallahMotherField2} <br> <br>`
          }
          else if(chossonMotherField1 === "" && chossonMotherHusband === "" && kallahMotherField1 === "" && kallahMotherHusband !== "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong><br> son of ${chossonFather} <br> son of ${chossonMotherField2} <br> and daughter of ${kallahFather} <br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
          }
          else if(chossonMotherField1 !== "" && chossonMotherHusband !== "" && kallahMotherField1 === "" && kallahMotherHusband === "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong><br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} and ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${kallahFather} <br> daughter of ${kallahMotherField2} <br> <br>`
          }
          else if(chossonMotherField1 !== "" && chossonMotherHusband === "" && kallahMotherField1 !== "" && kallahMotherHusband !== "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong><br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${chossonMotherField2} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
          }
          else if(chossonMotherField1 === "" && chossonMotherHusband !== "" && kallahMotherField1 !== "" && kallahMotherHusband !== "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong><br> son of ${chossonFather} <br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} and ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
          }
          //more variations FIX LAST NAMES FOR ALL GROUPED COUPLES
          else if(chossonMotherField1 !== "" && chossonMotherHusband !== "" && kallahMotherField1 !== "" && kallahMotherHusband === "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong><br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName}<br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname}<br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName}<br> daughter of ${kallahMotherField2}<br> <br>`
          }
          else if(chossonMotherField1 !== "" && chossonMotherHusband !== "" && kallahMotherField1 === "" && kallahMotherHusband !== "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong><br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} and ${chossonMotherFNameNew} ${chossonLastName}<br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname}<br> and daughter of ${kallahFather} <br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} and ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah}<br> <br>`
          }
          else if(chossonMotherField1 === "" && chossonMotherHusband !== "" && kallahMotherField1 === "" && kallahMotherHusband !== "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong><br> son of ${chossonFather} <br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} and ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${kallahFather} <br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah}<br> <br>`
          }
          else if(chossonMotherField1 === "" && chossonMotherHusband === "" && kallahMotherField1 !== "" && kallahMotherHusband !== "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong><br> son of ${chossonFather} <br> son of ${chossonMotherField2} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} & ${kallahMotherFNameNew} ${kallahLastName}<br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah}<br> <br>`
          }
          else if(chossonMotherField1 !== "" && chossonMotherHusband !== "" && kallahMotherField1 !== "" && kallahMotherHusband !== "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong><br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} & ${chossonMotherFNameNew} ${chossonLastName}<br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname}<br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} & ${kallahMotherFNameNew} ${kallahLastName}<br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah}<br> <br>`
          }
          else if(chossonMotherField1 === "" && chossonMotherHusband !== "" && kallahMotherField1 !== "" && kallahMotherHusband === "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong> <br> son of ${chossonFather} <br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} and ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> and daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} & ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${kallahMotherField2} <br> <br>`
          }
          else if(chossonMotherField1 !== "" && chossonMotherHusband === "" && kallahMotherField1 === "" && kallahMotherHusband !== "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} & ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${chossonMotherField2} <br> and daughter of ${kallahFather} <br> daughter of daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
          }
          else if(chossonMotherField1 !== "" && chossonMotherHusband === "" && kallahMotherField1 !== "" && kallahMotherHusband === "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} ${chossonMotherFNameNew} ${chossonLastName}<br> son of ${chossonMotherField2} <br> and daughter of ${kallahFather} <br> daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} ${kallahMotherFNameNew} ${kallahLastName}<br> daughter of ${kallahMotherField2} <br> <br>`
          }

        }
      }
      else if(newCouple.chossonOrigin === 'detroit') {
        if(isDivorcedChossonSide === false) {
        newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong> <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} & ${chossonMotherFNameNew} ${chossonLastName} <br> <br>`
        }
        else if(isDivorcedChossonSide) {
          if(chossonMotherField1 === "" && chossonMotherHusband === "") { 
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong> <br>  son of ${chossonFather} <br> son of ${chossonMotherField2} <br> <br>`
          }
          else if(chossonMotherField1 !== "" && chossonMotherHusband === "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong>  <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} & ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${chossonMotherField2} <br> <br>`
          }
          else if(chossonMotherField1 === "" && chossonMotherHusband !== "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong>  <br> son of ${chossonFather} <br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> <br>`
          }
          else if(chossonMotherField1 !== "" && chossonMotherHusband !== "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong>  <br> son of ${newCouple.chossonFatherTitle} & ${newCouple.chossonMotherTitle} ${chossonFatherFNameNew} & ${chossonMotherFNameNew} ${chossonLastName} <br> son of ${newCouple.chossonMotherHusbandTitle} & ${newCouple.chossonMotherDivorcedTitle} ${chossonStepDadFNameNew} & ${chossonDivorcedMotherFNameNew} ${stepdadlastname} <br> <br>`
          }
      }
    }
      
      else if(newCouple.kallahOrigin === 'detroit') {
        if(isDivorcedKallahSide === false) {
          newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong> <br> daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} and ${kallahMotherFNameNew} ${kallahLastName} <br> <br>`
        }
        else if(isDivorcedKallahSide) {
          if(kallahMotherField1 === "" && kallahMotherHusband === "") {
          newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong>  <br> daughter of ${kallahFather} <br> daughter of ${kallahMotherField2} <br> <br>`
          }
          else if(kallahMotherField1 !== "" && kallahMotherHusband === "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong>  <br> daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} & ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${kallahMotherField2} <br> <br>`
          }
          else if(kallahMotherField1 === "" && kallahMotherHusband !== "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong>  <br> daughter of ${kallahFather} <br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
          }
          else if(kallahMotherField1 !== "" && kallahMotherHusband !== "") {
            newCoupleString += `<strong>${newCouple.chosson}</strong> is engaged to <strong>${newCouple.kallah}</strong>  <br> daughter of ${newCouple.kallahFatherTitle} & ${newCouple.kallahMotherTitle} ${kallahFatherFNameNew} & ${kallahMotherFNameNew} ${kallahLastName} <br> daughter of ${newCouple.kallahMotherHusbandTitle} & ${newCouple.kallahMotherDivorcedTitle} ${kallahStepDadFNameNew} & ${kallahDivorcedMotherFNameNew} ${stepdadlastnameKallah} <br> <br>`
          }
        }
      }


        }

        console.log(newCoupleString)

const databaseCouples = await Couples.find().sort({_id: -1})

// //couples still collecting for
// let couplesString = ""


// for(let i = 0; i < databaseCouples.length; i++) {

// if (databaseCouples[i].collecting === true && !databaseCouples[i]._id.equals(newCouple.tempId)) {


//   let chossonFatherFName = (databaseCouples[i].chossonFather || "").split(" ").slice(0, -1).join(" ")
//   let kallahFatherFName = (databaseCouples[i].kallahFather || "").split(" ").slice(0, -1).join(" ")

//   if(databaseCouples[i].chossonOrigin === 'detroit' && databaseCouples[i].kallahOrigin === 'detroit') {
//       couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong> <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} and ${databaseCouples[i].chossonMother} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} and ${databaseCouples[i].kallahMother} <br> <br>`
//     }
//   else if(databaseCouples[i].chossonOrigin === 'detroit') {
//       couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to ${databaseCouples[i].kallahName} <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} and ${databaseCouples[i].chossonMother} <br> <br>`
//     }
//   else {
//       couplesString += `<strong>${databaseCouples[i].kallahName}</strong> is engaged to ${databaseCouples[i].chossonName} <br> daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} and ${databaseCouples[i].kallahMother} <br> <br>`
//     }
// }
// }

//couples still collecting for
let couplesString = ""

//set parent name variables that were filled out
let chossonFather1 = ""
let chossonMotherField11 = ""
let chossonMotherField21 = ""
let chossonMotherHusband1 = ""

let kallahFather1 = ""
let kallahMotherField11 = ""
let kallahMotherField21 = ""
let kallahMotherHusband1 = ""


let isDivorcedChossonSide1 = false
let isDivorcedKallahSide1 = false

// let amount = 0
// let actualAmount = 0

// for(let j = 0; j < databaseCouples.length; j++) {

//   if(databaseCouples[j].collecting === true) {
//     actualAmount++
//   }
// }

for(let i = 0; i < databaseCouples.length; i++) {

  if (databaseCouples[i].collecting === true && !databaseCouples[i]._id.equals(newCouple._id)) {

    // amount++

    chossonFather1 = ""
    chossonMotherField11 = ""
    chossonMotherField21 = ""
    chossonMotherHusband1 = ""

    kallahFather1 = ""
    kallahMotherField11 = ""
    kallahMotherField21 = ""
    kallahMotherHusband1 = ""


    isDivorcedChossonSide1 = false
    isDivorcedKallahSide1 = false


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

        
        


    let trimmedChossonFatherName = databaseCouples[i].chossonFatherName.trim()
    let trimmedKallahFatherName = databaseCouples[i].kallahFatherName.trim()
    let trimmedChossonMotherName = databaseCouples[i].chossonMotherName.trim()
    let trimmedKallahMotherName = databaseCouples[i].kallahMotherName.trim()

    let chossonFatherFName = (trimmedChossonFatherName || "").split(" ")
    let chossonLastNameOld = chossonFatherFName.pop(); // Remove the last name
    chossonFatherFName = chossonFatherFName.join(" ");

    let kallahFatherFName = (trimmedKallahFatherName || "").split(" ")
    let kallahLastNameOld = kallahFatherFName.pop(); // Remove the last name
    kallahFatherFName = kallahFatherFName.join(" ");

    let chossonMotherFName = (trimmedChossonMotherName || "").split(" ")
    chossonMotherFName.pop(); // Remove the last name
    chossonMotherFName = chossonMotherFName.join(" ");

    let kallahMotherFName = (trimmedKallahMotherName || "").split(" ")
    kallahMotherFName.pop(); // Remove the last name
    kallahMotherFName = kallahMotherFName.join(" ");

    // console.log(chossonFatherFName)
    // console.log(chossonMotherFName)
    // console.log(kallahFatherFName)
    // console.log(kallahMotherFName)
    
    //stepFathers last name
    let chossonStepDadFNameOld = ""
    let stepdadlastnameOld = ""
    if(databaseCouples[i].chossonMotherHusbandName !== "") {
      chossonStepDadFNameOld = (databaseCouples[i].chossonMotherHusbandName || "").split(" ")
      stepdadlastnameOld = chossonStepDadFNameOld.pop()
      chossonStepDadFNameOld = chossonStepDadFNameOld.join(" ")
    }
    let chossonDivorcedMotherFNameOld = ""
    if(databaseCouples[i].chossonMotherDivorcedName !== "") {
      chossonDivorcedMotherFNameOld = (databaseCouples[i].chossonMotherDivorcedName || "").split(" ")
      chossonDivorcedMotherFNameOld.pop()
      chossonDivorcedMotherFNameOld = chossonDivorcedMotherFNameOld.join(" ")
    }
    //kallah
    let kallahStepDadFNameOld = ""
    let stepdadlastnameOldKallah = ""
    if(databaseCouples[i].kallahMotherHusbandName !== "") {
      kallahStepDadFNameOld = (databaseCouples[i].kallahMotherHusbandName || "").split(" ")
      stepdadlastnameOldKallah = kallahStepDadFNameOld.pop()
      kallahStepDadFNameOld = kallahStepDadFNameOld.join(" ")
    }
    let kallahDivorcedMotherFNameOld = ""
    if(databaseCouples[i].kallahMotherDivorcedName !== "") {
      kallahDivorcedMotherFNameOld = (databaseCouples[i].kallahMotherDivorcedName || "").split(" ")
      kallahDivorcedMotherFNameOld.pop()
      kallahDivorcedMotherFNameOld = kallahDivorcedMotherFNameOld.join(" ")
    }
    // let stepdadlastnameOldKallah = ""
    // if(databaseCouples[i].kallahMotherHusbandName !== "") {
    //   stepdadlastnameOldKallah = (databaseCouples[i].kallahMotherHusbandName || "").split(" ").pop()
    // }


  




    if(databaseCouples[i].chossonOrigin === 'detroit' && databaseCouples[i].kallahOrigin === 'detroit') {
      if(isDivorcedChossonSide1 === false && isDivorcedKallahSide1 === false) {
        couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong> <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & ${chossonMotherFName} ${chossonLastNameOld} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} & ${kallahMotherFName} ${kallahLastNameOld} <br> <br>`
        console.log("1")
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
        console.log("2")
      }
      else if(isDivorcedChossonSide1 === false && isDivorcedKallahSide1) {
        if(kallahMotherField11 === "" && kallahMotherHusband1 === "") {
        couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong> <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} & ${chossonMotherFName} ${chossonLastNameOld} <br> and daughter of ${kallahFather1} <br> daughter of ${kallahMotherField21} <br> <br>`
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
        console.log("3")
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
        console.log("4")
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
      console.log("5")
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
      console.log("6")
    }
    // console.log(amount)
    // console.log(databaseCouples[i])
    // console.log(couplesString)
    

    // let chossonFatherFName = (databaseCouples[i].chossonFather || "").split(" ").slice(0, -1).join(" ")
    // let kallahFatherFName = (databaseCouples[i].kallahFather || "").split(" ").slice(0, -1).join(" ")

    // if(databaseCouples[i].chossonOrigin === 'detroit' && databaseCouples[i].kallahOrigin === 'detroit') {
    //     couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to <strong>${databaseCouples[i].kallahName}</strong> <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} and ${databaseCouples[i].chossonMother} <br> and daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} and ${databaseCouples[i].kallahMother} <br> <br>`
    //   }
    // else if(databaseCouples[i].chossonOrigin === 'detroit') {
    //     couplesString += `<strong>${databaseCouples[i].chossonName}</strong> is engaged to ${databaseCouples[i].kallahName} <br> son of ${databaseCouples[i].chossonFatherTitle} & ${databaseCouples[i].chossonMotherTitle} ${chossonFatherFName} and ${databaseCouples[i].chossonMother} <br> <br>`
    //   }
    // else {
    //     couplesString += `<strong>${databaseCouples[i].kallahName}</strong> is engaged to ${databaseCouples[i].chossonName} <br> daughter of ${databaseCouples[i].kallahFatherTitle} & ${databaseCouples[i].kallahMotherTitle} ${kallahFatherFName} and ${databaseCouples[i].kallahMother} <br> <br>`
    //   }
  }
}
console.log("hi")
console.log(couplesString)

const unsubscribeURL = process.env.AZURE_URL + '/unsubscribe'
// const unsubscribeURL = req.protocol + '://' + req.get('host') + '/unsubscribe'


const collectionEmail = buildCollectionEmail(newCoupleString, couplesString, unsubscribeURL)

// preview mode: return the built email html instead of sending anything
if (req.preview) {
  res.set('Content-Type', 'text/html')
  return res.send(collectionEmail)
}

// test mode: send the real email to ONE address only, then stop
if (req.testEmail) {
  await sgMail.send({
    to: req.testEmail,
    from: 'bridalshower@detroitbridalshower.org',
    subject: '[TEST] Collection Email',
    html: collectionEmail
  })
  console.log('test email sent to ' + req.testEmail)
  return res.json('test sent')
}

const personalCollectionEmail = buildPersonalCollectionEmail(newCoupleString)

const instructionsEmail = buildInstructionsEmail()

console.log("email created")

console.log(newCouple)
console.log(newCouple.email)

let instructionsMsg = {}
let msg = {}

if(count > 0) {

instructionsMsg = {
to: newCouple.email, // bridal shower email
// to: 'aronfriedman98@gmail.com',
from: `bridalshower@detroitbridalshower.org`,
subject: 'Your couple has been verified',
html: instructionsEmail
}

msg = {
to: newCouple.email, // bridal shower email
// to: 'aronfriedman98@gmail.com',
from: `bridalshower@detroitbridalshower.org`,
subject: 'Your personal collection email - share with family and friends',
html: personalCollectionEmail
}
}

// let testEmail = {
//   to: 'aronfriedman98@gmail.com', // bridal shower email
//   // to: 'aronfriedman98@gmail.com',
//   from: `bridalshower@detroitbridalshower.org`,
//   subject: 'Your personal collection email - share with family and friends',
//   html: collectionEmail
//   }

//   await sgMail.sendMultiple(testEmail);




// const recipients = ['aronfriedman98@gmail.com', 'aronfriedman98+1@gmail.com', 'aronfriedman98+2@gmail.com', 'tzvifriedman@gmail.com', 'beckyfriedman1@gmail.com', 'aronfriedman98+5@gmail.com'];

// const emails = await Emails.find({})

// console.log(emails.length)

// const recipients = emails.map((email) => email.email);            


//               const newsletter = {
//                 to: recipients,
//                 from: 'bridalshower@detroitbridalshower.org',
//                 subject: 'Newsletter',
//                 html: collectionEmail
//               };

//               sgMail.sendMultiple(newsletter);


// console.log("sent newsletter")

// ***********************************************************************************************************************************
if(count > 0) {
await sgMail.send(instructionsMsg)
await sgMail.send(msg)
}



// ********************************************************
// const {
//   classes: {
//     Mail,
//   },
// } = require('@sendgrid/helpers');
// const mail = Mail.create(data);
// const body = mail.toJSON();
// console.log(JSON.stringify(body));
// ********************************************************



// await sendNewsletterToList(req, collectionEmail, listID)



//send emails in batches
// const emails = await TestEmails.find({})
// **************************************************************************************************************************************
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




console.log('success')
    
    return res.json('success');
  } catch (err) {
    return res.json('error');
  }
},
// unsubscribe : async (req, res) => {
//   try {
//     const contact = await getContactByEmail(req.query.email);
//     console.log(contact)
//    if(contact == null) throw `Contact not found.`;
//    if (contact.custom_fields.conf_num ==  req.query.conf_num) {
//      const listID = await getListID('Newsletter Subscribers');
//      await deleteContactFromList(listID, contact);
//      res.render('message', { message: 'You have been successfully unsubscribed. If this was a mistake, you can re-subscribe on our website.' })
//   } 
// }catch (err) {
//     return res.json('error');
//   }
// },

        fillInfoModal: async (req, res) => {
            try {
                const couple = await Couples.findById(req.body.id)

                console.log("info modal")
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
                    chossonFatherName: couple.chossonFatherTitle + ' ' + couple.chossonFatherName,
                    chossonMotherName: couple.chossonMotherTitle + ' ' + couple.chossonMotherName,
                    kallahFatherName: couple.kallahFatherTitle + ' ' + couple.kallahFatherName,
                    kallahMotherName: couple.kallahMotherTitle + ' ' + couple.kallahMotherName,
                    chossonMotherDivorcedName: couple.chossonMotherDivorcedTitle + ' ' + couple.chossonMotherDivorcedName,
                    kallahMotherDivorcedName: couple.kallahMotherDivorcedTitle + ' ' + couple.kallahMotherDivorcedName,
                    chossonMotherHusbandName: couple.chossonMotherHusbandTitle + ' ' + couple.chossonMotherHusbandName,
                    kallahMotherHusbandName: couple.kallahMotherHusbandTitle + ' ' + couple.kallahMotherHusbandName, 
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
                }
            )
                await newAnouncement.save()
                console.log('saved announcement to db')

                
                
              
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
      "query": `CONTAINS(list_ids, '${listID}')`,
      "page": "2"
    }
    console.log("step 2: " + data)
    const request = {
      url: `/v3/marketing/contacts/search`,
      method: 'POST',
      body: data
  }
  console.log("step 3: " + JSON.stringify(request))
  const response = await sgClient.request(request)
  console.log("step 4: " + JSON.stringify(response))
  console.log("Number of subscribers: " + response[1].result.length);
  for (const subscriber of response[1].result) {
    const params = new URLSearchParams({
      conf_num: subscriber.custom_fields.conf_num,
      email: subscriber.email
    })
    console.log("step 5: " + params.toString())
    const unsubscribeURL = req.protocol + '://' + req.get('host') + 'newAdmin/unsubscribe/?' + params
    console.log("step 6: " + unsubscribeURL)
    const msg = {
      to: subscriber.email, // Change to your recipient
      from: "bridalshower@detroitbridalshower.org", // Change to your verified sender
      subject: 'Newsletter',
      html: htmlNewsletter + `<a href="${unsubscribeURL}">Unsubscribe</a>`
    }
    console.log("step 7: " + msg.toString())
    // var result=await sgMail.send(msg)
    console.log(subscriber.email + " sent")
    console.log("sent: "+result.toString())
  }
  console.log("finished sending")
}





