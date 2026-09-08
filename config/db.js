
const mongoose = require("mongoose");

const { MONGODB_USERNAME, MONGO_PASSWORD } = process.env;

const connectDB = async () => {
    try {
        await mongoose.connect(`mongodb+srv://${MONGODB_USERNAME}:${MONGO_PASSWORD}@cluster0.75mxvn6.mongodb.net/?appName=Cluster0`)
        console.log("MongoDB Connected");
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

module.exports = { connectDB };
