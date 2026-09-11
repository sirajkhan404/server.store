require("dotenv").config()
const express = require("express")
const cors = require("cors")
const { connectDB } = require("./config/db")
const auth = require("./routes/auth")
const products = require("./routes/prodcuts")
const orders = require("./routes/orders")
const contact = require("./routes/contact")

const app = express()

app.use(cors())
app.use(express.json())

connectDB()

app.get("/", (req, res) => {
    const now = new Date().toLocaleString()
    console.log("now", now)
    res.send(now)
})

app.get("/health-check", (req, res) => {
    res.send("server health is good and nodemon installed")
})

app.use("/auth", auth)
app.use("/api/auth", auth)
app.use("/api/products", products)
app.use("/api/orders", orders)
app.use("/api/contact", contact)

const { PORT = 8000 } = process.env
app.listen(PORT, (req, res) => {
    console.log(`server is running on PORT ${PORT}`)
})