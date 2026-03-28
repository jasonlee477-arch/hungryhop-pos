const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

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
mongoose.connect(
  "mongodb+srv://jasonlee477_db_user:Firstproject-2026@cluster0.lhdovlw.mongodb.net/hungryhop?retryWrites=true&w=majority"
)
.then(() => console.log("✅ MongoDB Atlas Connected"))
.catch(err => console.log("Mongo Error:", err));

/* ================= SOCKET.IO ================= */
io.on("connection", (socket) => {
  console.log("⚡ Client connected:", socket.id);
  socket.on("disconnect", () => console.log("Client disconnected"));
});

/* ================= MENU APIs ================= */

// GET ALL MENU
app.get("/menu", async (req, res) => {
  try {
    const items = await MenuItem.find({ available: true });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET MENU BY CATEGORY
app.get("/menu/category/:category", async (req, res) => {
  try {
    const items = await MenuItem.find({
      category: req.params.category,
      available: true
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE MENU ITEM
app.post("/menu", async (req, res) => {
  try {
    const item = new MenuItem(req.body);
    const saved = await item.save();
    res.json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ================= ORDER APIs ================= */

// CREATE ORDER — now supports tokenNumber + paymentMode
app.post("/order", async (req, res) => {
  try {
    const lastOrder = await Order.findOne().sort({ orderNumber: -1 });
    const orderNumber = lastOrder ? lastOrder.orderNumber + 1 : 101;

    const newOrder = new Order({
      orderNumber,
      items:        req.body.items,
      total:        req.body.total,
      paymentMode:  req.body.paymentMode || "Cash",
      tokenNumber:  req.body.tokenNumber || null,
      customerName: req.body.customerName || "",
      status:       "Pending"
    });

    const savedOrder = await newOrder.save();

    // Realtime event to kitchen
    io.emit("new-order", savedOrder);
    console.log("🔔 New order:", savedOrder.orderNumber, "| Token:", savedOrder.tokenNumber);

    // n8n WhatsApp automation
    try {
      await fetch("https://poshungryhop.app.n8n.cloud/webhook/new-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId:  savedOrder.orderNumber,
          total:    savedOrder.total,
          token:    savedOrder.tokenNumber,
          items:    savedOrder.items.map(i => i.name || i)
        })
      });
      console.log("📲 Sent to n8n");
    } catch (err) {
      console.log("⚠️ n8n error:", err.message);
    }

    res.json(savedOrder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET ALL ORDERS
app.get("/orders", async (req, res) => {
  const orders = await Order.find().sort({ orderNumber: -1 });
  res.json(orders);
});

// GET SINGLE ORDER BY ID — used by receipt
app.get("/order/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= KITCHEN APIs ================= */

// GET ACTIVE KITCHEN ORDERS
app.get("/kitchen/orders", async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $ne: "Completed" }
    }).sort({ createdAt: 1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE ORDER STATUS
app.put("/order/:id/status", async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    io.emit("order-updated", order);
    console.log("✔ Order updated:", order.orderNumber);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= RECEIPT API ================= */

// GET RECEIPT DATA BY ORDER ID
app.get("/receipt/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RECEIPT HTML PAGE — served as a printable page
app.get("/receipt-print/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "receipt.html"));
});

/* ================= DASHBOARD / STATS APIs ================= */

// TODAY'S STATS
app.get("/stats/today", async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end }
    });

    const totalRevenue  = orders.reduce((s, o) => s + o.total, 0);
    const totalOrders   = orders.length;
    const cashOrders    = orders.filter(o => o.paymentMode === "Cash");
    const upiOrders     = orders.filter(o => o.paymentMode === "UPI");
    const cashRevenue   = cashOrders.reduce((s, o) => s + o.total, 0);
    const upiRevenue    = upiOrders.reduce((s, o) => s + o.total, 0);
    const completedOrders = orders.filter(o => o.status === "Completed").length;
    const pendingOrders   = orders.filter(o => o.status === "Pending").length;

    // Top selling items today
    const itemMap = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!itemMap[item.name]) itemMap[item.name] = { name: item.name, qty: 0, revenue: 0 };
        itemMap[item.name].qty     += item.qty || 1;
        itemMap[item.name].revenue += item.price * (item.qty || 1);
      });
    });
    const topItems = Object.values(itemMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    res.json({
      totalRevenue,
      totalOrders,
      cashRevenue,
      upiRevenue,
      cashOrders:   cashOrders.length,
      upiOrders:    upiOrders.length,
      completedOrders,
      pendingOrders,
      topItems
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WEEKLY STATS (last 7 days)
app.get("/stats/week", async (req, res) => {
  try {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      const orders = await Order.find({ createdAt: { $gte: start, $lte: end } });
      const revenue = orders.reduce((s, o) => s + o.total, 0);

      days.push({
        date:    start.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
        orders:  orders.length,
        revenue
      });
    }
    res.json(days);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MONTHLY STATS
app.get("/stats/month", async (req, res) => {
  try {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const orders = await Order.find({ createdAt: { $gte: start } });
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const totalOrders  = orders.length;
    const avgOrder     = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    res.json({ totalRevenue, totalOrders, avgOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ALL ORDERS FOR REPORT (with date filter)
app.get("/stats/orders", async (req, res) => {
  try {
    const { date } = req.query;
    let filter = {};
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= PWA ================= */

// Serve service worker from root scope
app.get("/sw.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.sendFile(path.join(__dirname, "public", "sw.js"));
});

app.get("/manifest.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.sendFile(path.join(__dirname, "public", "manifest.json"));
});

/* ================= SERVER ================= */
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});