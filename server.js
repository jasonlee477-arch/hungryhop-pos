const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const Order = require("./models/Order");
const MenuItem = require("./models/MenuItem");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

/* ================= MIDDLEWARE ================= */

app.use(express.json());
app.use(express.static("public"));

/* ================= MONGODB ================= */

mongoose.connect(process.env.MONGO_URI, {
  dbName: "hungryhop",
  serverSelectionTimeoutMS: 30000
})
.then(() => console.log("MongoDB Connected"))
.catch(err => console.error("Mongo Error:", err));
/* ================= SOCKET.IO ================= */

io.on("connection",(socket)=>{

console.log("⚡ Kitchen/Client connected:",socket.id)

socket.on("disconnect",()=>{
console.log("Client disconnected")
})

})

/* ================= MENU APIs ================= */

/* GET ALL MENU */

app.get("/menu", async (req,res)=>{

try{

const items = await MenuItem.find({ available:true })

res.json(items)

}catch(err){

res.status(500).json({error:err.message})

}

})

/* GET MENU BY CATEGORY */

app.get("/menu/category/:category", async (req,res)=>{

try{

const category = req.params.category

const items = await MenuItem.find({
category: category,
available: true
})

res.json(items)

}catch(err){

res.status(500).json({error:err.message})

}

})

/* CREATE MENU ITEM */

app.post("/menu", async (req,res)=>{

try{

const item = new MenuItem(req.body)

const saved = await item.save()

res.json(saved)

}catch(err){

res.status(400).json({error:err.message})

}

})

/* ================= ORDER APIs ================= */

/* CREATE ORDER */

app.post("/order", async (req,res)=>{

try{

const lastOrder = await Order.findOne().sort({orderNumber:-1})

const orderNumber = lastOrder ? lastOrder.orderNumber + 1 : 101

const newOrder = new Order({

orderNumber,
items:req.body.items,
total:req.body.total,
paymentMode:req.body.paymentMode,
status:"Pending"

})

const savedOrder = await newOrder.save()

/* REALTIME EVENT */

io.emit("new-order",savedOrder)

console.log("🔔 New order received:",savedOrder.orderNumber)

res.json(savedOrder)

}catch(err){

res.status(400).json({error:err.message})

}

})

/* GET ALL ORDERS */

app.get("/orders", async (req,res)=>{

const orders = await Order.find().sort({orderNumber:-1})

res.json(orders)

})

/* ================= KITCHEN ================= */

/* GET KITCHEN ORDERS */

app.get("/kitchen/orders", async (req,res)=>{

try{

const orders = await Order.find({
status:{$ne:"Completed"}
}).sort({createdAt:1})

res.json(orders)

}catch(err){

res.status(500).json({error:err.message})

}

})

/* UPDATE ORDER STATUS */

app.put("/order/:id/status", async (req,res)=>{

try{

const order = await Order.findByIdAndUpdate(

req.params.id,
{status:req.body.status},
{new:true}

)

/* REALTIME UPDATE */

io.emit("order-updated",order)

console.log("✔ Order updated:",order.orderNumber)

res.json(order)

}catch(err){

res.status(500).json({error:err.message})

}

})

/* ================= SERVER ================= */

server.listen(PORT, ()=>{

console.log(`🚀 Server running at http://localhost:${PORT}`)

})