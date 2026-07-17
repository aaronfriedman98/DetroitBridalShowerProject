const Couples = require('../models/couplesList')
const Announcements = require('../models/newAnnouncements')
const NewCouple = require('../models/newCouple')


module.exports = {
    // getAnnouncementsPage : async (req, res) => {
    //     try {
    //         const couples = await Couples.find()
    //         console.log(couples)
    //         const announcements = await Announcements.find()
    //         const newCouple = await NewCouple.find()
    //         console.log(couples[0].image)
    //         // console.log('Data retrieved:', couples)
    //         res.render( 'announcements.ejs', {coupleInfo : couples, newAnnouncements : announcements, newCouple : newCouple})
    //     } catch (err) {
    //         return res.status(500).send(err)
    //     }
    // },
    getAnnouncementsPage: async (req, res) => {
        try {
          const couples = await Couples.find();
          
          // Sort the couples array alphabetically based on chossonName
          couples.sort((a, b) => {
            return a.chossonName.localeCompare(b.chossonName);
          });
          
          const announcements = await Announcements.find();
          const newCouple = await NewCouple.find();
          
          res.render('announcements.ejs', { coupleInfo: couples, newAnnouncements: announcements, newCouple: newCouple });
        } catch (err) {
          return res.status(500).send(err);
        }
      },      
    // couplesSearch : async (req, res) => {
    //     let payload = req.body.payload.trim()
    //     console.log(payload)
    // },
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

            res.render('coupleTable.ejs', { coupleInfo : couples })
        } catch (err) {
            console.error(err)
            res.render('error')
        }
    },
    fillInfoModal: async (req, res) => {
        try {
            const couple = await Couples.findById(req.body.id)
            
            let chossonFather
            let chossonMother
            let kallahFather
            let kallahMother

            //additional parents
            let chossonMotherDivorcedName
            let chossonMotherHusband
            let kallahMotherDivorcedName
            let kallahMotherHusband

            let weddingDate = couple.weddingDate
            
            if (couple.chossonFatherName === "" || couple.chossonFatherName === "-") {
                chossonFather = "-"
            }
            else {
                chossonFather = couple.chossonFatherTitle + ' ' + couple.chossonFatherName
            }
            if (couple.chossonMotherName === "" || couple.chossonMotherName === "-") {
                chossonMother = "-"
            }
            else {
                chossonMother = couple.chossonMotherTitle + ' ' + couple.chossonMotherName
            }
            if (couple.kallahFatherName === "" || couple.kallahFatherName === "-") {
                kallahFather = "-"
            }
            else {
                kallahFather = couple.kallahFatherTitle + ' ' + couple.kallahFatherName
            }
            if (couple.kallahMotherName === "" || couple.kallahMotherName === "-") {
                kallahMother = "-"
            }
            else {
                kallahMother = couple.kallahMotherTitle + ' ' + couple.kallahMotherName
            }

            //additional parents
            if (couple.chossonMotherDivorcedName === "") {
                chossonMotherDivorcedName = ""
            }
            else {
                chossonMotherDivorcedName = couple.chossonMotherDivorcedTitle + ' ' + couple.chossonMotherDivorcedName
            }
            if (couple.chossonMotherHusbandName === "") {
                chossonMotherHusband = ""
            }
            else {
                chossonMotherHusband = couple.chossonMotherHusbandTitle + ' ' + couple.chossonMotherHusbandName
            }
            if (couple.kallahMotherDivorcedName === "") {
                kallahMotherDivorcedName = ""
            }
            else {
                kallahMotherDivorcedName = couple.kallahMotherDivorcedTitle + ' ' + couple.kallahMotherDivorcedName
            }
            if (couple.kallahMotherHusbandName === "") {
                kallahMotherHusband = ""
            }
            else {
                kallahMotherHusband = couple.kallahMotherHusbandTitle + ' ' + couple.kallahMotherHusbandName
            }

            // console.log(couple)
            // if (!couple) {
            //     return res.status(404).json({ error: "Couple not found" })
            // }
            // res.render(__dirname + '/views/admin.ejs', { couple })
            res.json({
                
                chossonFatherName: chossonFather,
                chossonMotherName: chossonMother,
                kallahFatherName: kallahFather,
                kallahMotherName: kallahMother,
                chossonMotherDivorcedName: chossonMotherDivorcedName,
                chossonMotherHusbandName: chossonMotherHusband,
                kallahMotherDivorcedName: kallahMotherDivorcedName,
                kallahMotherHusbandName: kallahMotherHusband,
                weddingDate: weddingDate
    
            })
        } catch (err) {
            console.error(err)
            return res.status(500).json({ error: "Internal server error" })
        }
    }
}