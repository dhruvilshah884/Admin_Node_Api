const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    role:{
        type:String,
        default:"user"
    },
    token:{
        type:String,
        required:true
    },
    cart:[{
        product:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"admin"
        },
        quantity:{
            type:Number,
            default:1
        }
    }],
    isPayment:{
        type:Boolean,
        default:false
    }
})
const user = mongoose.model("user",userSchema);
module.exports = user;
