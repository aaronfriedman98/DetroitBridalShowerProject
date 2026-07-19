// const express = require('express')
// const router = express.Router()
// const {register, login} = require('./auth')
// router.route('/register').post(register)
// router.route('/login').post(login)
// module.exports = router

const express = require("express")
const router = express.Router()
const { register, login, update, deleteUser, getUsers } = require("./auth");
const { adminAuth } = require("../middleware/auth");
router.route("/register").post(adminAuth, register)
router.route("/login").post(login);
router.route("/update").put(adminAuth, update);
router.route("/deleteUser").delete(adminAuth, deleteUser);
router.route("/getUsers").get(adminAuth, getUsers);

module.exports = router;