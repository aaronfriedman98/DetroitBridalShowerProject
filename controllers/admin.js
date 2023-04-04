const Couples = require('../models/couplesList')

module.exports = {
    getAdminPage : async (req, res) => {
        try {
            const couples = await Couples.find()
            res.render(__dirname + '/views/admin.ejs', {coupleInfo : couples})
        } catch (err) {
            return res.status(500).send(err)
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

            res.render(__dirname + '/views/coupleTable.ejs', { coupleInfo : couples })
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
                address: req.body.address
            }
            )
            await newCouple.save()
            console.log(req.body)
  
  
          return res.json({
            status : true,
            title : 'Success!',
            message: 'Couple information submitted successfully. Please refresh the page in order to update the database'
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
    deleteEntry : async (req, res) => {
            try{
                await Couples.deleteOne({_id: req.body.id})
                console.log(req.body.id)
                return res.json('success')
            } catch (err) {
                console.error(err)
                return res.json('error')
            }
        },
        fillInfoModal: async (req, res) => {
            try {
                const couple = await Couples.findById(req.body.id)
                console.log(couple)
                // if (!couple) {
                //     return res.status(404).json({ error: "Couple not found" })
                // }
                // res.render(__dirname + '/views/admin.ejs', { couple })
                res.json(couple)
            } catch (err) {
                console.error(err)
                return res.status(500).json({ error: "Internal server error" })
            }
        }
        
}