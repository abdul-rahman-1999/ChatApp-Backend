const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
    Chatusers : {type : Array},
    sender : {type : mongoose.Schema.Types.ObjectId, ref : 'User'},
    recipent : {type : mongoose.Schema.Types.ObjectId, ref : 'User'},
    text: String,
}, { timestamps: true })

const MessageModel = mongoose.model('Message', MessageSchema);
module.exports = MessageModel