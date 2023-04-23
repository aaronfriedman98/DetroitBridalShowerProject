const Mongoose = require('mongoose');
const AdminSchema = new Mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        minlength: 8,
        required: true
    },
  role: {
    type: String,
    default: "Basic",
    required: true,
  },
})

const Admin = Mongoose.model('admin', AdminSchema, 'adminDB')
module.exports = Admin