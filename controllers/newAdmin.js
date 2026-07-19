const Couples = require('../models/couplesList')
const Announcements = require('../models/newAnnouncements')
const NewCouple = require('../models/newCouple')
const Emails = require('../models/emailList')

//test emails
const TestEmails = require('../models/testEmails')



const sgMail = require('@sendgrid/mail')
const sgClient = require('@sendgrid/client')
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
<div align="center" class="alignment" style="line-height:10px"><img src="https://i.imgur.com/ssGV6SR.jpg" style="display: block; height: auto; border: 0; width: 340px; max-width: 100%;" width="340"/></div>
<body style="margin: 0; background-color: white; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
<table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white; color: #000000; width: 680px;" width="680">
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
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white; color: #000000; width: 680px;" width="680">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
<table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
<div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"></a></div>
</td>
</tr>
</table>
</td>
<td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
<table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
<div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"></a></div>
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
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white; color: #000000; width: 680px;" width="680">
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
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white; color: #000000; width: 680px;" width="680">
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
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white; color: #000000; width: 680px;" width="680">
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
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white; color: #000000; width: 680px;" width="680">
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
<p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;">All the collections will be used to start off the Chasan and Kallah with all household basics.</p>
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
<p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;">We should continue to hear of many more Simchas!</p>
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
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-7" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white; color: #000000; width: 680px;" width="680">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 25px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
<table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
<div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"></a></div>
</td>
</tr>
</table>
</td>
<td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
<table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
<div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"></a></div>
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
<div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: white; line-height: 1.2;">
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
<p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 21px;">We have sent out a collection email on your behalf. You will also be sent a personal collection email for you to share with any friends and family who are not in our database.  <br><br>Mazel tov! <br>May we share in many more Simchas!</p>
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

console.log("email created1")

const instructionsMsg = {
to: newCouple.email, // bridal shower email
from: `bridalshower@detroitbridalshower.org`,
subject: 'Instructions Email',
html: instructionsEmail
}

console.log("email created2")

const msg = {
to: newCouple.email, // bridal shower email
from: `bridalshower@detroitbridalshower.org`,
subject: 'Personal Collection Email',
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
<div align="center" class="alignment" style="line-height:10px"><img src="https://i.imgur.com/ssGV6SR.jpg" style="display: block; height: auto; border: 0; width: 340px; max-width: 100%;" width="340"/></div>
<body style="margin: 0; background-color: white; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
<table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white; color: #000000; width: 680px;" width="680">
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
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white; color: #000000; width: 680px;" width="680">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
<table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
<div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"></a></div>
</td>
</tr>
</table>
</td>
<td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
<table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
<div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"></a></div>
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
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white; color: #000000; width: 680px;" width="680">
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
<p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;">If you would like to participate in their bridal shower, please send an email to bridalshower@detroitbridalshower.org specifying which chassan and kallah you would like to give to, followed by payment your payment method. <br><br>Payment is accepted through one of the following methods: </p>
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
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white; color: #000000; width: 680px;" width="680">
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
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white; color: #000000; width: 680px;" width="680">
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
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white; color: #000000; width: 680px;" width="680">
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
<p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;">All the collections will be used to start off the Chassan and Kallah with all household basics.</p>
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
<p style="margin: 0; font-size: 22px; text-align: center; mso-line-height-alt: 26.4px;">We should continue to hear of many more Simchas!</p>
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
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-7" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: white; color: #000000; width: 680px;" width="680">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 25px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
<table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
<div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"></a></div>
</td>
</tr>
</table>
</td>
<td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
<table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
<div align="center" class="alignment" style="line-height:10px"><a href="www.example.com" style="outline:none" tabindex="-1" target="_blank"></a></div>
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
<div class="" style="font-size: 14px; font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif; mso-line-height-alt: 16.8px; color: white; line-height: 1.2;">
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
<p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 21px;">We have sent out a collection email on your behalf. You will also be sent a personal collection email for you to share with any friends and family who are not in our database.  <br><br>Mazel tov! <br>May we share in many more Simchas!</p>
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

console.log(newCouple)
console.log(newCouple.email)

let instructionsMsg = {}
let msg = {}

if(count > 0) {

instructionsMsg = {
to: newCouple.email, // bridal shower email
// to: 'aronfriedman98@gmail.com',
from: `bridalshower@detroitbridalshower.org`,
subject: 'Instructions Email',
html: instructionsEmail
}

msg = {
to: newCouple.email, // bridal shower email
// to: 'aronfriedman98@gmail.com',
from: `bridalshower@detroitbridalshower.org`,
subject: 'Personal Collection Email',
html: personalCollectionEmail
}
}

// let testEmail = {
//   to: 'aronfriedman98@gmail.com', // bridal shower email
//   // to: 'aronfriedman98@gmail.com',
//   from: `bridalshower@detroitbridalshower.org`,
//   subject: 'Personal Collection Email',
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





// ---------------------------------------------------------------------------
// Collection email template (shared by sendNewsletter, sendNewNewsletter and
// the dashboard preview). The couple strings are built by the callers with
// the full divorced / remarried / deceased parent logic - this only wraps
// them in the branded layout. Table-based + inline styles for email clients.
// ---------------------------------------------------------------------------
function buildCollectionEmail(newCoupleString, couplesString, unsubscribeURL) {
  const site = (process.env.AZURE_URL || 'https://detroit-bridal-shower.azurewebsites.net').replace(/['"]/g, '')
  const logo = site + '/assets/images/bridalshowerpic.jpg'
  const serif = "'Cormorant Garamond', Georgia, 'Times New Roman', serif"
  const sans = "'Jost', 'Segoe UI', Arial, sans-serif"
  const ink = '#2e2e29', soft = '#6d6d64', sage = '#494e46', gold = '#b3925a'

  const sectionLabel = (text) => `
  <tr><td align="center" style="padding: 34px 40px 6px;">
    <div style="font-family: ${sans}; font-size: 12px; letter-spacing: 4px; text-transform: uppercase; color: ${gold}; font-weight: bold;">${text}</div>
    <div style="width: 54px; height: 1px; background-color: #d9c9a6; margin: 12px auto 0; font-size: 0; line-height: 0;">&nbsp;</div>
  </td></tr>`

  const payCell = (method, value) => `
  <td width="50%" align="center" valign="top" style="padding: 14px 10px;">
    <div style="font-family: ${sans}; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: ${sage}; font-weight: bold; padding-bottom: 6px;">${method}</div>
    <div style="font-family: ${serif}; font-size: 18px; color: ${ink}; line-height: 1.45;">${value}</div>
  </td>`

  const featuredSection = newCoupleString ? `
  ${sectionLabel('New Chosson &amp; Kallah')}
  <tr><td align="center" style="padding: 16px 48px 8px;">
    <div style="font-family: ${serif}; font-size: 24px; color: ${sage}; line-height: 1.55;">${newCoupleString}</div>
  </td></tr>` : ''

  const collectingSection = couplesString ? `
  ${sectionLabel('Still Collecting For')}
  <tr><td align="center" style="padding: 16px 48px 8px;">
    <div style="font-family: ${serif}; font-size: 20px; color: ${soft}; line-height: 1.55;">${couplesString}</div>
  </td></tr>` : ''

  return `<!DOCTYPE html>
<html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<title>Detroit Bridal Shower</title>
<meta content="text/html; charset=utf-8" http-equiv="Content-Type"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
<!--[if !mso]><!-->
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500&family=Jost:wght@300;400;500&display=swap" rel="stylesheet" type="text/css"/>
<!--<![endif]-->
<style>
  body { margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none; }
  table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { border: 0; display: block; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: inherit !important; }
  @media (max-width: 700px) {
    .card { width: 100% !important; }
    .pad-lg { padding-left: 22px !important; padding-right: 22px !important; }
  }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f1ea;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f1ea;">
<tr><td align="center" style="padding: 36px 12px 44px;">

  <!--[if mso]><table role="presentation" width="640" align="center" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
  <table role="presentation" class="card" align="center" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 640px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e7e2d8; border-radius: 18px;">

    <!-- header -->
    <tr><td align="center" style="padding: 44px 40px 0;">
      <img src="${logo}" width="120" alt="Detroit Bridal Shower" style="width: 120px; height: auto; margin: 0 auto;"/>
    </td></tr>
    <tr><td align="center" style="padding: 22px 40px 0;">
      <div style="font-family: ${sans}; font-size: 13px; letter-spacing: 6px; text-transform: uppercase; color: ${sage};">Detroit Bridal Shower</div>
    </td></tr>
    <tr><td align="center" style="padding: 10px 40px 0;">
      <div style="font-family: ${serif}; font-style: italic; font-size: 52px; color: ${gold}; line-height: 1.1;">Mazel Tov!</div>
    </td></tr>

    <!-- intro -->
    <tr><td align="center" class="pad-lg" style="padding: 22px 56px 4px;">
      <div style="font-family: ${serif}; font-size: 20px; color: ${ink}; line-height: 1.6;">
        We are so fortunate for all the future Chossons and Kallahs from our community.
        If you would like to participate in these bridal showers, simply reply to this email.
      </div>
    </td></tr>

    ${featuredSection}
    ${collectingSection}

    <!-- amount -->
    <tr><td class="pad-lg" style="padding: 30px 48px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f3e8; border-radius: 14px;">
        <tr><td align="center" style="padding: 24px 30px;">
          <div style="font-family: ${serif}; font-size: 21px; color: ${sage}; line-height: 1.55;">
            The recommended amount is <strong style="color: ${gold};">$65 per shower</strong> &mdash; any amount is warmly accepted.
          </div>
          <div style="font-family: ${sans}; font-size: 14px; color: ${soft}; line-height: 1.6; padding-top: 10px;">
            Please reply confirming which shower/s you would like to join, and send payment using one of the methods below.
          </div>
        </td></tr>
      </table>
    </td></tr>

    <!-- give online button -->
    <tr><td align="center" style="padding: 26px 40px 4px;">
      <a href="${site}/give" style="display: inline-block; background-color: ${gold}; color: #ffffff; font-family: ${sans}; font-size: 16px; letter-spacing: 1px; text-decoration: none; border-radius: 999px; padding: 16px 44px;">Give a Gift Online &rarr;</a>
      <div style="font-family: ${sans}; font-size: 12.5px; color: ${soft}; padding-top: 10px;">Pick your couples in under a minute &mdash; then send payment any way you like below.</div>
    </td></tr>

    <!-- payment methods -->
    ${sectionLabel('Ways to Give')}
    <tr><td class="pad-lg" style="padding: 10px 40px 6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          ${payCell('Zelle', 'beckyfriedman1@gmail.com')}
          ${payCell('Venmo', '@Becky-Friedman-8')}
        </tr>
        <tr>
          ${payCell('PayPal', 'beckyfriedman1@gmail.com')}
          ${payCell('Check', 'Made out to<br/>Detroit Bridal Shower Project<br/>17322 Goldwin Drive<br/>Southfield, MI 48075')}
        </tr>
      </table>
    </td></tr>

    <!-- closing -->
    <tr><td align="center" class="pad-lg" style="padding: 26px 56px 0;">
      <div style="width: 54px; height: 1px; background-color: #d9c9a6; margin: 0 auto 22px; font-size: 0; line-height: 0;">&nbsp;</div>
      <div style="font-family: ${serif}; font-size: 19px; color: ${soft}; line-height: 1.65;">
        Every collection helps start off a Chosson and Kallah with all of their household basics.<br/>
        Recently engaged? <a href="${site}" style="color: ${gold}; text-decoration: underline;">Add your couple on our website</a>.
      </div>
    </td></tr>

    <tr><td align="center" class="pad-lg" style="padding: 26px 56px 40px;">
      <div style="font-family: ${serif}; font-size: 20px; color: ${ink}; line-height: 1.6;">
        We should continue to hear of many more simchas!
      </div>
      <div style="font-family: ${serif}; font-style: italic; font-size: 26px; color: ${sage}; padding-top: 10px;">Becky Friedman</div>
    </td></tr>
  </table>

  <!-- footer -->
  <table role="presentation" class="card" align="center" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 640px; margin: 0 auto;">
    <tr><td align="center" style="padding: 20px 30px 0;">
      <div style="font-family: ${sans}; font-size: 12px; color: #9b998e; line-height: 1.7;">
        Questions? Reach us at <a href="mailto:bridalshower@detroitbridalshower.org" style="color: #9b998e;">bridalshower@detroitbridalshower.org</a><br/>
        Detroit Bridal Shower &middot; Southfield, Michigan${unsubscribeURL ? `<br/><a href="${unsubscribeURL}" style="color: #9b998e; text-decoration: underline;">Unsubscribe</a>` : ''}
      </div>
    </td></tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->

</td></tr>
</table>
</body>
</html>`
}
