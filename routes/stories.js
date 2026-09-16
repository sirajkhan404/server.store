const express = require("express");
const router = express.Router();
const Stories = require("../models/stories");
const Products = require("../models/products");
const { verifyToken } = require("../middleware/auth");
const cloudinary = require("../config/cloudinary");
const { getRandomId } = require("../config/global");

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // up to 50MB for videos/high-res images
});

// Create Story (SuperAdmin Only)
router.post("/create", verifyToken, upload.fields([{ name: "media" }]), async (req, res) => {
    try {
        if (req.role !== "superAdmin") {
            return res.status(403).json({ message: "Forbidden: SuperAdmin access required", isError: true });
        }

        const { title, productId, storyLink, duration, mediaType = "image" } = req.body;
        const { uid } = req;
        const id = getRandomId();

        let mediaURL = "";
        let mediaPublicId = "";

        if (req.files && req.files["media"] && req.files["media"][0]) {
            const file = req.files["media"][0];
            const fileBuffer = file.buffer;

            if (!fileBuffer || fileBuffer.length === 0) {
                return res.status(400).json({ message: "Uploaded media buffer is empty", isError: true });
            }

            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: "mystore/stories/",
                        resource_type: "auto"
                    },
                    (error, result) => {
                        if (error) {
                            console.error("Cloudinary upload error (story):", error.message || error);
                            return reject(new Error(error.message || "Cloudinary upload failed"));
                        }
                        resolve({
                            secure_url: result.secure_url,
                            public_id: result.public_id,
                            resource_type: result.resource_type
                        });
                    }
                );
                uploadStream.end(fileBuffer);
            });

            mediaURL = uploadResult.secure_url;
            mediaPublicId = uploadResult.public_id;
        } else if (req.body.mediaURL) {
            mediaURL = req.body.mediaURL.trim();
        }

        if (!mediaURL) {
            return res.status(400).json({ message: "Story media (image or video) is required", isError: true });
        }

        // Fetch product info if productId provided
        let productName = "";
        let productPrice = 0;
        if (productId) {
            const product = await Products.findOne({ id: productId });
            if (product) {
                productName = product.name;
                productPrice = product.price;
            }
        }

        const storyData = {
            id,
            uid,
            title: title || "",
            mediaURL,
            mediaPublicId,
            mediaType: req.body.mediaType || "image",
            productId: productId || "",
            productName,
            productPrice,
            storyLink: storyLink || "",
            duration: Number(duration) || 5,
            isActive: true
        };

        const story = new Stories(storyData);
        await story.save();

        res.status(201).json({ message: "Story published successfully!", story });
    } catch (error) {
        console.error("CREATE STORY ERROR:", error.message || error);
        res.status(500).json({ message: error.message || "Internal server error", isError: true });
    }
});

// Get Public Active Stories (Anyone)
router.get("/public-all", async (req, res) => {
    try {
        const stories = await Stories.find({ isActive: true }).sort({ createdAt: -1 });
        res.status(200).json({ message: "Public stories fetched successfully", stories });
    } catch (error) {
        console.error("FETCH PUBLIC STORIES ERROR:", error);
        res.status(500).json({ message: "Internal server error", isError: true });
    }
});

// Like / Unlike Story (Customer or Public User)
router.post("/like/:id", async (req, res) => {
    try {
        const { id } = req.params;
        let userId = req.body?.userId;

        // Check if token exists in header
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(" ")[1];
        if (token) {
            try {
                const jwt = require("jsonwebtoken");
                const decoded = jwt.verify(token, process.env.JWT_SECRET || "codevpk");
                if (decoded && decoded.uid) {
                    userId = decoded.uid;
                }
            } catch (tErr) {
                // Ignore token error and fallback to userId
            }
        }

        if (!userId) {
            userId = "anon_" + req.ip;
        }

        const story = await Stories.findOne({ id });
        if (!story) {
            return res.status(404).json({ message: "Story not found", isError: true });
        }

        // Initialize likes array if not present
        if (!Array.isArray(story.likes)) {
            story.likes = [];
        }

        const alreadyLiked = story.likes.includes(userId);
        let isLiked = false;

        if (alreadyLiked) {
            story.likes = story.likes.filter(uid => uid !== userId);
            isLiked = false;
        } else {
            story.likes.push(userId);
            isLiked = true;
        }

        story.likesCount = story.likes.length;
        await story.save();

        res.status(200).json({
            message: isLiked ? "Story liked ❤️" : "Story unliked",
            isLiked,
            likesCount: story.likesCount,
            likes: story.likes
        });
    } catch (error) {
        console.error("LIKE STORY ERROR:", error);
        res.status(500).json({ message: "Internal server error", isError: true });
    }
});

// Get All Stories (SuperAdmin Only)
router.get("/all", verifyToken, async (req, res) => {
    try {
        if (req.role !== "superAdmin") {
            return res.status(403).json({ message: "Forbidden: SuperAdmin access required", isError: true });
        }

        const stories = await Stories.find().sort({ createdAt: -1 });
        res.status(200).json({ message: "All stories fetched successfully", stories });
    } catch (error) {
        console.error("FETCH ALL STORIES ERROR:", error);
        res.status(500).json({ message: "Internal server error", isError: true });
    }
});

// Toggle Story Active Status (SuperAdmin Only)
router.patch("/toggle/:id", verifyToken, async (req, res) => {
    try {
        if (req.role !== "superAdmin") {
            return res.status(403).json({ message: "Forbidden: SuperAdmin access required", isError: true });
        }

        const { id } = req.params;
        const story = await Stories.findOne({ id });

        if (!story) {
            return res.status(404).json({ message: "Story not found", isError: true });
        }

        story.isActive = !story.isActive;
        await story.save();

        res.status(200).json({
            message: `Story is now ${story.isActive ? "Active" : "Inactive"}`,
            story
        });
    } catch (error) {
        console.error("TOGGLE STORY ERROR:", error);
        res.status(500).json({ message: "Internal server error", isError: true });
    }
});

// Delete Story (SuperAdmin Only)
router.delete("/delete/:id", verifyToken, async (req, res) => {
    try {
        if (req.role !== "superAdmin") {
            return res.status(403).json({ message: "Forbidden: SuperAdmin access required", isError: true });
        }

        const { id } = req.params;
        const story = await Stories.findOne({ id });

        if (!story) {
            return res.status(404).json({ message: "Story not found", isError: true });
        }

        // Delete from Cloudinary if mediaPublicId exists
        if (story.mediaPublicId) {
            try {
                await cloudinary.uploader.destroy(story.mediaPublicId, {
                    resource_type: story.mediaType === "video" ? "video" : "image"
                });
            } catch (cErr) {
                console.warn("Cloudinary delete warning:", cErr.message);
            }
        }

        await Stories.deleteOne({ id });

        res.status(200).json({ message: "Story deleted successfully", id });
    } catch (error) {
        console.error("DELETE STORY ERROR:", error);
        res.status(500).json({ message: "Internal server error", isError: true });
    }
});

module.exports = router;
