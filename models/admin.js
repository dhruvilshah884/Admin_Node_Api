const mongoose = require('mongoose')

const adminSchema = new mongoose.Schema({
    product_name:{
        type:String,
        required:true
    },
    product_price:{
        type:String,
        required:true
    },
    product_image:{
        type:String,
        required:true
    }
})
const admin = mongoose.model("admin",adminSchema);
module.exports = admin;