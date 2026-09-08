const mongoose = require("mongoose")
const { Schema } = mongoose

const schema = new Schema({
    id: { type: String, required: true, unique: true },
    uid: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true, default: 0 },
    category: { type: String, required: true },
    description: { type: String, required: true, trim: true },
    imageURL: { type: String, default: "" },
    imagePublicId: { type: String, default: "" },
}, { timestamps: true })

const Products = mongoose.model("products", schema)

module.exports = Products
