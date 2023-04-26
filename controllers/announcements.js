const Couples = require('../models/couplesList')

module.exports = {
    getAnnouncementsPage : async (req, res) => {
        try {
            const couples = await Couples.find()
            console.log(couples[0].image)
            res.render(__dirname + '/views/announcements.ejs', {coupleInfo : couples})
        } catch (err) {
            return res.status(500).send(err)
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

            res.render(__dirname + '/views/coupleTable.ejs', { coupleInfo : couples })
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

            if (couple.chossonFather === "") {
                chossonFather = "-"
            }
            else {
                chossonFather = couple.chossonFatherTitle + ' ' + couple.chossonFather
            }
            if (couple.chossonMother === "") {
                chossonMother = "-"
            }
            else {
                chossonMother = couple.chossonMotherTitle + ' ' + couple.chossonMother
            }
            if (couple.kallahFather === "") {
                kallahFather = "-"
            }
            else {
                kallahFather = couple.kallahFatherTitle + ' ' + couple.kallahFather
            }
            if (couple.kallahMother === "") {
                kallahMother = "-"
            }
            else {
                kallahMother = couple.kallahMotherTitle + ' ' + couple.kallahMother
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
    
            })
        } catch (err) {
            console.error(err)
            return res.status(500).json({ error: "Internal server error" })
        }
    }
}