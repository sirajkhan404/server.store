const mongoose = require("mongoose");

const { Schema, model } = mongoose;

const UserSchema = new Schema({
    uid: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["customer", "superAdmin"], default: "customer" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    profilePicture: { type: String, default: "" },
    profilePicturePublicId: { type: String, default: "" }
}, { timestamps: true });

module.exports = model("users", UserSchema);