// Declare variables
const express = require('express')
// const bodyParser = require('body-parser');
// const fs = require('fs')
const app = express()
// const multer = require('multer')
// const upload = multer({dest: 'uploads/'});
const cookieParser = require('cookie-parser')
const {adminAuth, UserAuth} = require('./middleware/auth')


const PORT = process.env.PORT || 8080

const mongoose = require("mongoose")

const homeRoutes = require('./routes/home')
const aboutRoutes = require('./routes/about')
// const addCoupleRoutes = require('./routes/addCouple')
const announcementsRoutes = require('./routes/announcements')
const contactRoutes = require('./routes/contact')
const shoppingGuideRoutes = require('./routes/shoppingGuide')
const thankYouRoutes = require('./routes/thankYou')
const announcementSubmissionRoutes = require("./routes/announcementSubmission")
const financialAssistanceRoutes = require("./routes/financialAssistance")
const adminRoutes = require("./routes/admin")
const loginRoutes = require("./routes/login")
const registerRoutes = require("./routes/register")

const authRoutes = require("./Auth/route")

const newAdminRoutes = require("./routes/newAdmin")

// Import functions/routes
const connectDB = require("./config/database")

require('dotenv').config({path: "./config/.env"})

// Connect to Database
connectDB()

// Set Middleware
app.set("view engine", "ejs") //setting up view engine
app.use(express.static('public')) //use public folder
app.use(express.urlencoded({extended: true})) // allow data to be sent through url with forms
app.use(express.json()) // allow json data to be passed through
app.use(cookieParser())
// app.use(bodyParser.json());


// Set Routes
app.use('/', homeRoutes)
app.use('/about', aboutRoutes)
app.use('/announcements', announcementsRoutes)
app.use('/contact', contactRoutes)
app.use('/shoppingGuide', shoppingGuideRoutes)
app.use('/thankYou', thankYouRoutes)
app.use('/announcementSubmission', announcementSubmissionRoutes)
app.use('/financialAssistance', financialAssistanceRoutes)
app.use('/admin', adminRoutes)
app.use('/login', loginRoutes)
app.use('/register', registerRoutes)

app.use('/api/Auth', authRoutes)

app.use('/newAdmin', newAdminRoutes)


// Start server
app.listen(PORT, () => console.log(`server running on port ${PORT}`))