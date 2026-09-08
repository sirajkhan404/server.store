const mongoose = require("mongoose")
const { Schema } = mongoose

const productSchema = new Schema({
    productId: { type: String, required: true },
    name: { type: String },
    price: { type: Number },
    quantity: { type: Number, required: true },
    imageURL: { type: String }
}, { _id: false })

const shippingAddressSchema = new Schema({
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true }
}, { _id: false })

const schema = new Schema({
    id: { type: String, required: true, unique: true },
    uid: { type: String, required: true },
    products: [productSchema],
    totalAmount: { type: Number, required: true },
    shippingAddress: shippingAddressSchema,
    orderStatus: { type: String, default: "processing", enum: ["processing", "shipped", "delivered", "cancelled"] },
    paymentStatus: { type: String, default: "pending", enum: ["pending", "paid", "failed"] },
    paymentMethod: { type: String, default: "COD" }
}, { timestamps: true })

const Orders = mongoose.model("orders", schema)

module.exports = Orders
