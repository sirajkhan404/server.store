const express = require("express");
const router = express.Router();
const Users = require("../models/auth");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getRandomId } = require("../config/global");
const { verifyToken } = require("../middleware/auth");
const cloudinary = require("../config/cloudinary");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage });
router.post("/register", async (req, res) => {
    try {
                const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) { return res.status(400).json({ message: "All fields are required", isError: true }); }

        const user = await Users.findOne({ email });

        if (user) { return res.status(400).json({ message: "User already exists", isError: true }); }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userData = { uid: getRandomId(), fullName, email, password: hashedPassword }

        const newUser = new Users(userData);
        await newUser.save();

        const userObj = newUser.toObject();
        delete userObj.password;
        res.status(201).json({ message: "User registered successfully", user: userObj, isError: false });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error", isError: true });

    }
});

router.post("/login", async (req, res) => {
    try {

        const { email, password } = req.body;

        if (!email || !password) { return res.status(400).json({ message: "All fields are required", isError: true }); }

        const user = await Users.findOne({ email });

        if (!user) { return res.status(400).json({ message: "Invalid email or password", isError: true }); }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) { return res.status(400).json({ message: "Invalid email or password", isError: true }); }

        if (user.status !== "active") { return res.status(400).json({ message: "Your account is not active", isError: true }); }

        const token = jwt.sign({ uid: user.uid, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.status(200).json({ message: "User logged in successfully", token, isError: false });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error", isError: true });
    }
});

router.get("/user", verifyToken, async (req, res) => {
    try {
        const { uid } = req;

        const user = await Users.findOne({ uid }).select("-password");

        if (!user) { return res.status(400).json({ message: "User not found", isError: true }); }

        res.status(200).json({ message: "User profile", user, isError: false });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error", isError: true });
    }
});

router.get("/users", verifyToken, async (req, res) => {
    try {

        const { uid } = req;

        const user = await Users.findOne({ uid });

        if (!user || user.role !== "superAdmin") { return res.status(401).json({ message: "Unauthorized!", isError: true }); }

        const users = await Users.find().select("-password");

        // res.status(200).json({ message: "Users", users, isError: false });

        res.status(200).json({ message: "user profile fetched successfully", users, isError: false });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error", isError: true });
    }
});


router.patch("/update-user", verifyToken, async (req, res) => {
    try {
        const { uid } = req;

        const requester = await Users.findOne({ uid });
        if (!requester) { return res.status(400).json({ message: "User not found", isError: true }); }

        let targetUid = uid;

        const { name, role, status, uid: targetUserUid } = req.body;

        if (targetUserUid) {
            if (requester.role !== "superAdmin") {
                return res.status(401).json({ message: "Unauthorized!", isError: true });
            }
            targetUid = targetUserUid;
        }

        const updateData = {};
        if (requester.role === "superAdmin") {
            if (role) updateData.role = role;
            if (status) updateData.status = status;
        }
        if (name) updateData.fullName = name;

        if (Object.keys(updateData).length === 0) return res.status(400).json({ message: "No fields to update", isError: true });

        const updatedUser = await Users.findOneAndUpdate({ uid: targetUid }, updateData, { new: true }).select("-password");

        res.status(200).json({ message: "User updated successfully", updatedUser, isError: false });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error", isError: true });
    }
});

router.put("/update-profile", verifyToken, upload.single("image"), async (req, res) => {
    try {
        const { uid } = req;
        const { fullName } = req.body;

        const user = await Users.findOne({ uid });
        if (!user) return res.status(404).json({ message: "User not found", isError: true });

        let profilePicture = user.profilePicture;
        let profilePicturePublicId = user.profilePicturePublicId;

        // If a new image is provided
        if (req.file) {
            // Remove old image from Cloudinary if exists
            if (profilePicturePublicId) {
                try {
                    await cloudinary.uploader.destroy(profilePicturePublicId);
                } catch (err) {
                    console.error("Error deleting old profile pic from cloudinary:", err);
                }
            }

            // Upload new image
            await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: "mystore/users/images/" },
                    (error, result) => {
                        if (error) return reject(error);
                        profilePicture = result.secure_url;
                        profilePicturePublicId = result.public_id;
                        resolve();
                    }
                );
                uploadStream.end(req.file.buffer);
            });
        }

        user.fullName = fullName || user.fullName;
        user.profilePicture = profilePicture;
        user.profilePicturePublicId = profilePicturePublicId;
        
        await user.save();

        const userObj = user.toObject();
        delete userObj.password;

        res.status(200).json({ message: "Profile updated successfully", user: userObj, isError: false });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error", isError: true });
    }
});

router.delete("/delete-user-by-self", verifyToken, async (req, res) => {
    try {
        const { uid } = req;

        const user = await Users.findOne({ uid });

        if (!user) { return res.status(401).json({ message: "Unauthorized!", isError: true }); }

        const deletedUser = await Users.findOneAndDelete({ uid });

        res.status(200).json({ message: "User deleted successfully", deletedUser, isError: false });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error", isError: true });
    }
});

router.delete("/delete-user-by-superAdmin/:userId", verifyToken, async (req, res) => {
    try {
        const { uid } = req;

        const requester = await Users.findOne({ uid });

        if (!requester) { return res.status(400).json({ message: "Requester not found", isError: true }); }

        const targetUid = req.params.userId;

        // If a targetUid is provided (admin deleting another user), verify superAdmin role
        if (targetUid && targetUid !== uid) {

            if (requester.role !== "superAdmin") { return res.status(401).json({ message: "Unauthorized!", isError: true }); }

            const deletedUser = await Users.findOneAndDelete({ uid: targetUid }).select("-password");

            if (!deletedUser) { return res.status(404).json({ message: "Target user not found", isError: true }); }

            return res.status(200).json({ message: "User deleted successfully", deletedUser, isError: false });
        }

        // Otherwise delete the requester's own account
        const deletedUser = await Users.findOneAndDelete({ uid }).select("-password");

        res.status(200).json({ message: "User deleted successfully", deletedUser, isError: false });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error", isError: true });
    }
});

router.patch("/change-password", verifyToken, async (req, res) => {
    try {
        const { uid } = req;

        const user = await Users.findOne({ uid });

        if (!user) { return res.status(400).json({ message: "User not found", isError: true }); }

        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) { return res.status(400).json({ message: "All fields are required", isError: true }); }

        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

        if (!isPasswordValid) { return res.status(400).json({ message: "Invalid old password", isError: true }); }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const updatedUser = await Users.findOneAndUpdate({ uid }, { password: hashedPassword }, { new: true }).select("-password");

        res.status(200).json({ message: "Password updated successfully", updatedUser, isError: false });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error", isError: true });
    }
});

router.patch("/change-email", verifyToken, async (req, res) => {
    try {
        const { uid } = req;

        const user = await Users.findOne({ uid });

        if (!user) { return res.status(400).json({ message: "User not found", isError: true }); }

        const { newEmail } = req.body;

        if (!newEmail) { return res.status(400).json({ message: "Email is required", isError: true }); }

        const updatedUser = await Users.findOneAndUpdate({ uid }, { email: newEmail }, { new: true }).select("-password");

        res.status(200).json({ message: "Email updated successfully", updatedUser, isError: false });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error", isError: true });
    }
});


router.patch("/deactivate-user-by-superAdmin/:userId", verifyToken, async (req, res) => {
    try {
        const { uid } = req;

        const user = await Users.findOne({ uid });

        if (!user || user.role !== "superAdmin") { return res.status(401).json({ message: "Unauthorized!", isError: true }); }

        const { userId } = req.params;

        if (!userId) { return res.status(400).json({ message: "User ID is required", isError: true }); }

        const updatedUser = await Users.findOneAndUpdate({ uid: userId }, { status: "inactive" }, { new: true });

        res.status(200).json({ message: "User Deactivated Successfully", updatedUser, isError: false });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error", isError: true });
    }
});

//create a function to find all users where BillPaid === false  and status === active, and then change their status to

const deactivateUsersWithUnpaidBills = async () => {
    try {
        await Users.updateMany({ isBillPaid: false, status: "active" }, { status: "inactive" });


    } catch (err) {
        console.log(err);
    }
}

//is function ko cron job m convert kro aur wo function daily 24 hours bd chle  
//create a cron job and this function after every 24 hours 

// const cron = require("node-cron");

// cron.schedule("0 0 * * *", deactivateUsersWithUnpaidBills);

module.exports = router;
