const jwt = require('jsonwebtoken')
// let jwtSecret = process.env.TOKEN_SECRET

exports.adminAuth = (req, res, next) => {
    // console.log('Process.env='+process.env)
    // console.log('API_KEY='+process.env.API_KEY)
    // console.log('TOKEN_SECRET='+process.env.TOKEN_SECRET)
    // console.log('jwtSecret='+jwtSecret)
    jwtSecret = process.env.TOKEN_SECRET
    //console.log('jwtSecret='+jwtSecret)
    const token = req.cookies.jwt
    if (token) {
        console.log('Token='+token)
        console.log('Secret='+jwtSecret)
      jwt.verify(token, jwtSecret, (err, decodedToken) => {
        console.log('Error='+err)
        console.log('Decoded='+decodedToken)
        if (err) {
          return res.status(401).json({ message: "Not authorized - error" })
        } else {
          if (decodedToken.role !== "admin") {
            return res.status(401).json({ message: "Not authorized - basic user" })
          } else {
            next()
          }
        }
      })
    } else {
      return res
        .status(401)
        .json({ message: "Not authorized, token not available" })
    }
  }
  exports.userAuth = (req, res, next) => {
      const token = req.cookies.jwt
      if (token) {
        jwt.verify(token, jwtSecret, (err, decodedToken) => {
          if (err) {
            return res.status(401).json({ message: "Not authorized" })
          } else {
            if (decodedToken.role !== "Basic") {
              return res.status(401).json({ message: "Not authorized" })
            } else {
              next()
            }
          }
        })
      } else {
        return res
          .status(401)
          .json({ message: "Not authorized, token not available" })
      }
    }
