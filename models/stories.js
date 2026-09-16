const mongoose = require("mongoose");
const { Schema } = mongoose;

const schema = new Schema({
    id: { type: String, required: true, unique: true },
    uid: { type: String, required: true },
    title: { type: String, default: "", trim: true },
    mediaURL: { type: String, required: true },
    mediaPublicId: { type: String, default: "" },
    mediaType: { type: String, enum: ["image", "video"], default: "image" },
    productId: { type: String, default: "" },
    productName: { type: String, default: "" },
    productPrice: { type: Number, default: 0 },
    storyLink: { type: String, default: "" },
    duration: { type: Number, default: 5 }, // seconds
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date }
}, { timestamps: true });

const Stories = mongoose.model("stories", schema);

module.exports = Stories;
