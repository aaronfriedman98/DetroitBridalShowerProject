const jwt = require('jsonwebtoken')
// let jwtSecret = process.env.TOKEN_SECRET

// A browser navigating to a dashboard page should be sent to the login screen
// when its session has expired - not shown raw JSON. Background fetches still
// get a 401 so the page can redirect itself.
function denyAuth(req, res, reason) {
  const wantsHTML = req.method === 'GET' && (req.accepts(['html', 'json']) === 'html')
  if (wantsHTML) {
    return res.redirect('/login?expired=1&next=' + encodeURIComponent(req.originalUrl))
  }
  return res.status(401).json({ message: reason, sessionExpired: true })
}

exports.adminAuth = (req, res, next) => {
    const jwtSecret = process.env.TOKEN_SECRET
    const token = req.cookies.jwt
    if (!token) return denyAuth(req, res, 'Not authorized, token not available')

    jwt.verify(token, jwtSecret, (err, decodedToken) => {
      if (err) return denyAuth(req, res, 'Not authorized - session expired')
      if (decodedToken.role !== 'admin') return denyAuth(req, res, 'Not authorized - basic user')
      next()
    })
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
