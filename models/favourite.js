const mongoose=require("mongoose");
const favouriteSchema=new mongoose.Schema({
    title:String,
    image:String,
    user:String,
    description:String,
    date:{
    type:Date,
    default:Date.now()
    }
})
module.exports=mongoose.model("Favourite",favouriteSchema);