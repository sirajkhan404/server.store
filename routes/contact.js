const express = require("express");
const router = express.Router();
const Contact = require("../models/contact");
const { getRandomId } = require("../config/global");
const { verifyToken } = require("../middleware/auth");

// POST /api/contact/send (Public route)
router.post("/send", async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ message: "Please fill all required fields", isError: true });
        }

        const id = getRandomId();
        const contactMessage = await Contact.create({ id, name, email, subject, message });

        res.status(201).json({ message: "Message sent successfully! We will get back to you soon.", data: contactMessage });
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
