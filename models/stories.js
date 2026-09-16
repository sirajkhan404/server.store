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
    likes: { type: [String], default: [] }, // array of user IDs or visitor IDs who liked
    likesCount: { type: Number, default: 0 },
    views: [
        {
            uid: { type: String, default: "" },
            name: { type: String, default: "Guest Visitor" },
            email: { type: String, default: "" },
            avatar: { type: String, default: "" },
            role: { type: String, default: "customer" },
            viewedAt: { type: Date, default: Date.now }
        }
    ],
    viewsCount: { type: Number, default: 0 },
    expiresAt: { type: Date }
}, { timestamps: true });

const Stories = mongoose.model("stories", schema);

module.exports = Stories;
