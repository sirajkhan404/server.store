const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const Orders = require("../models/orders");
const Products = require("../models/products");
const { getRandomId } = require("../config/global");



// create order and quantity from products from order minus at products stock  
router.post("/create", verifyToken, async (req, res) => {
    try {
        const { uid, role } = req;

        const { products, totalAmount, shippingAddress } = req.body;

        if (role !== "customer") { return res.status(403).json({ message: "Only customers can place orders.", isError: true }) }

        const id = getRandomId()

        const orderData = { id, uid, products, totalAmount, shippingAddress }

        const order = await Orders.create(orderData)

        //decrement the stock of the products
        products.map(async ({ productId, quantity }) => {
            await Products.findOneAndUpdate({ id: productId }, { $inc: { stock: -quantity } })
        })

        res.status(201).json({ message: "Order created successfully", order });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error: ", isError: true });
    }
})

// get all orders (superAdmin)
router.get("/all", verifyToken, async (req, res) => {
    try {

        const { uid, role } = req;

        let orders = []
        if (role === "superAdmin") {
            orders = await Orders.find();
        } else {
            orders = await Orders.find({ uid })
        }
        res.status(200).json({ message: "Orders fetched successfully", orders });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error: ", isError: true });
    }
})

//get single order by id
router.get("/get-single/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Orders.findOne({ id });
        if (!order) { return res.status(404).json({ message: "Order not found" }) }
        res.status(200).json({ message: "Order found", order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error: ", isError: true });
    }
})

//update order status by superAdmin
router.patch("/update/:id", verifyToken, async (req, res) => {
    try {
        const { role } = req;
        if (role !== "superAdmin") { return res.status(403).json({ message: "You are not authorized to update orders", isError: true }) }
        const { id } = req.params;
        const { orderStatus } = req.body;

        // Auto-update paymentStatus based on orderStatus
        const updateData = { orderStatus };
        if (orderStatus === "delivered") updateData.paymentStatus = "paid";
        if (orderStatus === "cancelled") updateData.paymentStatus = "failed";

        const order = await Orders.findOneAndUpdate({ id }, updateData, { new: true });
        if (!order) { return res.status(404).json({ message: "Order not found" }) }
        res.status(200).json({ message: "Order updated successfully", order });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error: ", isError: true });
    }
})

//delete order by superAdmin
router.delete("/delete/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Orders.findOne({ id });
        if (!order) { return res.status(404).json({ message: "Order not found" }) }
        await order.deleteOne();
        res.status(200).json({ message: "Order deleted successfully", order });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error: ", isError: true });
    }
})



module.exports = router;