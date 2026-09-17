const express = require("express");
const router = express.Router();
const Contact = require("../models/contact");
const { getRandomId } = require("../config/global");
const { verifyToken } = require("../middleware/auth");

// POST /api/contact/send (Public / Authenticated route)
router.post("/send", async (req, res) => {
    try {
        const { name, email, subject, message, uid } = req.body;

        if (!name || !name.trim() || !email || !email.trim() || !message || !message.trim()) {
            return res.status(400).json({ message: "Please fill all required fields (Name, Email, Message)", isError: true });
        }

        const id = getRandomId();
        const finalSubject = subject && subject.trim() ? subject.trim() : "Customer Question / General Inquiry";
        
        const contactMessage = await Contact.create({
            id,
            uid: uid || "",
            name: name.trim(),
            email: email.trim().toLowerCase(),
            subject: finalSubject,
            message: message.trim()
        });

        res.status(201).json({ message: "Your question/message has been sent successfully! The admin will review it shortly. 🎉", data: contactMessage });
    } catch (error) {
        console.error("Error sending contact message:", error);
        res.status(500).json({ message: "Internal server error", isError: true });
    }
});

// GET /api/contact/all (superAdmin only)
router.get("/all", verifyToken, async (req, res) => {
    try {
        if (req.role !== "superAdmin") {
            return res.status(403).json({ message: "Only superAdmin can view contact messages", isError: true });
        }

        const messages = await Contact.find().sort({ createdAt: -1 });
        res.status(200).json({ message: "Contact messages fetched successfully", messages });
    } catch (error) {
        console.error("Error fetching contact messages:", error);
        res.status(500).json({ message: "Internal server error", isError: true });
    }
});

// GET /api/contact/my-messages (Customer / Authenticated user)
router.get("/my-messages", verifyToken, async (req, res) => {
    try {
        const { uid } = req;
        const userEmail = req.query.email;

        const queryConditions = [];
        if (uid) queryConditions.push({ uid });
        if (userEmail) queryConditions.push({ email: userEmail });

        let messages = [];
        if (queryConditions.length > 0) {
            messages = await Contact.find({ $or: queryConditions }).sort({ createdAt: -1 });
        }

        res.status(200).json({ message: "Your messages fetched successfully", messages });
    } catch (error) {
        console.error("Error fetching user messages:", error);
        res.status(500).json({ message: "Internal server error", isError: true });
    }
});

// POST /api/contact/reply (superAdmin only - Reply to User)
router.post("/reply", verifyToken, async (req, res) => {
    try {
        if (req.role !== "superAdmin") {
            return res.status(403).json({ message: "Only superAdmin can reply to messages", isError: true });
        }

        const { id, replyText } = req.body;

        if (!id || !replyText || !replyText.trim()) {
            return res.status(400).json({ message: "Reply message is required", isError: true });
        }

        const contact = await Contact.findOne({ id });
        if (!contact) {
            return res.status(404).json({ message: "Contact message not found", isError: true });
        }

        contact.isReplied = true;
        contact.replyText = replyText.trim();
        contact.repliedAt = new Date();
        await contact.save();

        res.status(200).json({ message: "Reply sent to user dashboard successfully! 🎉", contact });
    } catch (error) {
        console.error("Error replying to contact message:", error);
        res.status(500).json({ message: "Internal server error", isError: true });
    }
});

// DELETE /api/contact/delete/:id (superAdmin only)
router.delete("/delete/:id", verifyToken, async (req, res) => {
    try {
        if (req.role !== "superAdmin") {
            return res.status(403).json({ message: "Only superAdmin can delete contact messages", isError: true });
        }

        const { id } = req.params;
        const deletedMessage = await Contact.findOneAndDelete({ id });

        if (!deletedMessage) {
            return res.status(404).json({ message: "Message not found", isError: true });
        }

        res.status(200).json({ message: "Contact message deleted successfully", messageId: id });
    } catch (error) {
        console.error("Error deleting contact message:", error);
        res.status(500).json({ message: "Internal server error", isError: true });
    }
});

module.exports = router;
