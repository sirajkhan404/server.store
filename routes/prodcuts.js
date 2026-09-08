const express = require("express");
const router = express.Router();
const Products = require("../models/products");
const { verifyToken } = require("../middleware/auth");
const cloudinary = require("../config/cloudinary");
const { getRandomId } = require("../config/global");

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Add Products 
router.post("/create", verifyToken, upload.fields([{ name: "image" }]), async (req, res) => {
    try {
        const formData = req.body
        const { name, price, stock, category, description } = formData
        const { uid } = req
        const id = getRandomId()

        let imageURL = "", imagePublicId = ""
        if (req.files && req.files["image"] && req.files["image"][0]) {
            const fileBuffer = req.files["image"][0].buffer
            if (!fileBuffer || fileBuffer.length === 0) {
                return res.status(400).json({ message: "Uploaded image buffer is empty", isError: true })
            }
            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: "mystore/products/images/" },
                    (error, result) => {
                        if (error) {
                            console.error("Cloudinary upload error (create):", error.message || error)
                            return reject(new Error(error.message || "Cloudinary upload failed"))
                        }
                        resolve({ secure_url: result.secure_url, public_id: result.public_id })
                    }
                )
                uploadStream.end(fileBuffer)
            })
            imageURL = uploadResult.secure_url
            imagePublicId = uploadResult.public_id
        }

        const productData = { id, uid, name, price: Number(price), stock: Number(stock), category, description, imageURL, imagePublicId }

        const product = new Products(productData)
        await product.save()

        res.status(201).json({ message: "A new Product has been successfully created", product })
    }
    catch (error) {
        console.error("CREATE PRODUCT ERROR:", error.message || error)
        console.error("Stack:", error.stack)
        res.status(500).json({ message: error.message || "Internal server error", isError: true })
    }
});

router.get("/all", verifyToken, async (req, res) => {
    try {

        const products = await Products.find()
        res.status(200).json({ message: "All Products fetched successfully", products })
    }
    catch (error) {
        console.error("FETCH ALL PRODUCTS ERROR:", error)
        res.status(500).json({ message: "Internal server error", isError: true })
    }
});

router.get("/public-all", async (req, res) => {
    try {
        const products = await Products.find()
        res.status(200).json({ message: "All Products fetched successfully", products })
    }
    catch (error) {
        console.error("FETCH PUBLIC PRODUCTS ERROR:", error)
        res.status(500).json({ message: "Internal server error", isError: true })
    }
});

// superAdmin can get single product
router.get("/get-single/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params
        if (req.role !== "superAdmin") { return res.status(401).json({ message: "You are not authorized to access this resource", isError: true }) }
        const product = await Products.findOne({ id })
        if (!product) { return res.status(404).json({ message: "Product not found", isError: true }) }
        res.status(200).json({ message: "Product found", product })
    }
    catch (error) {
        console.error("GET SINGLE PRODUCT ERROR:", error)
        res.status(500).json({ message: "Internal server error", isError: true })
    }
});

// superAdmin can update the product details with patch method
router.patch("/update/:id", verifyToken, upload.fields([{ name: "image" }]), async (req, res) => {
    try {
        const { id } = req.params

        if (req.role !== "superAdmin") { return res.status(401).json({ message: "You are not authorized to access this resource", isError: true }) }

        const { name, price, stock, category, description, imageURL } = req.body

        const productData = {}
        if (name) productData.name = name.trim()
        if (price !== undefined && price !== "") productData.price = Number(price)
        if (stock !== undefined && stock !== "") productData.stock = Number(stock)
        if (category) productData.category = category
        if (description) productData.description = description.trim()

        if (imageURL && typeof imageURL === "string" && imageURL.trim().length > 0) {
            productData.imageURL = imageURL.trim()
        }

        // Handle file upload if present
        if (req.files && req.files["image"] && req.files["image"][0]) {
            const existingProduct = await Products.findOne({ id })
            if (existingProduct && existingProduct.imagePublicId && existingProduct.imagePublicId.trim().length > 0) {
                try {
                    await cloudinary.uploader.destroy(existingProduct.imagePublicId)
                } catch (e) {
                    console.log("Cloudinary destroy warning:", e.message)
                }
            }
            const fileBuffer = req.files["image"][0].buffer
            if (!fileBuffer || fileBuffer.length === 0) {
                return res.status(400).json({ message: "Uploaded image buffer is empty", isError: true })
            }
            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: "mystore/products/images/" },
                    (error, result) => {
                        if (error) {
                            console.error("Cloudinary upload error (update):", error.message || error)
                            return reject(new Error(error.message || "Cloudinary upload failed"))
                        }
                        resolve({ secure_url: result.secure_url, public_id: result.public_id })
                    }
                )
                uploadStream.end(fileBuffer)
            })
            productData.imageURL = uploadResult.secure_url
            productData.imagePublicId = uploadResult.public_id
        }

        const updatedProduct = await Products.findOneAndUpdate({ id }, productData, { new: true, runValidators: false })
        if (!updatedProduct) { return res.status(404).json({ message: "Product not found", isError: true }) }

        res.status(200).json({ message: "Product updated successfully", updatedProduct })
    }
    catch (error) {
        console.error("UPDATE PRODUCT ERROR:", error.message || error)
        res.status(500).json({ message: error?.message || "Internal server error", isError: true })
    }
});

// superAdmin can delete the product
router.delete("/delete/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params
        if (req.role !== "superAdmin") { return res.status(401).json({ message: "You are not authorized to access this resource", isError: true }) }
        const product = await Products.findOne({ id })
        if (!product) { return res.status(404).json({ message: "Product not found", isError: true }) }
        if (product.imagePublicId && product.imagePublicId.trim().length > 0) {
            try {
                await cloudinary.uploader.destroy(product.imagePublicId)
            } catch (e) {
                console.log("Cloudinary destroy warning:", e.message)
            }
        }
        await product.deleteOne()
        res.status(200).json({ message: "Product deleted successfully" })
    }
    catch (error) {
        console.error("DELETE PRODUCT ERROR:", error)
        res.status(500).json({ message: "Internal server error", isError: true })
    }
});

module.exports = router;
