module.exports = {
    getShoppingGuidePage : async (req, res) => {
        try {
            res.sendFile(__dirname + '/views/shoppingGuide.html')
        } catch (err) {
            if (err) return res.status(500).send(err)
        }
    },
    checklist : async (req, res) => {
        try {
             // Read the PDF file from the file system
            const pdfPath = path.join(__dirname + '../public/assets/images/checklist.pdf')

            res.setHeader('Content-Type', 'application/pdf');

            res.sendFile(pdfPath);
            // Set the Content-Type header to specify the type of file being served
            

            // Send the PDF file as a response
            // res.send(pdf);
        } catch (err) {
            return res.status(500).send(err)
        }
    }
}
