const express = require("express");
const router = express.Router();
const Contact = require("../models/contact");
const { getRandomId } = require("../config/global");

// POST /api/contact/send
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

module.exports = router;
