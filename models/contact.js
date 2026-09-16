const mongoose = require("mongoose")
const { Schema } = mongoose

const schema = new Schema({
    id: { type: String, required: true, unique: true },
    uid: { type: String, default: "" },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    isReplied: { type: Boolean, default: false },
    replyText: { type: String, default: "" },
    repliedAt: { type: Date }
}, { timestamps: true })

const Contact = mongoose.model("contact", schema)

module.exports = Contact
