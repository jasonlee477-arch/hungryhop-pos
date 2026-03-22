const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  price: { type: Number, required: true },
  qty:   { type: Number, required: true, default: 1 }
});

const orderSchema = new mongoose.Schema({
  orderNumber:  { type: Number, required: true, unique: true },
  tokenNumber:  { type: String, default: null },       // ← NEW: T-01, T-02...
  customerName: { type: String, default: "" },         // ← NEW: optional name
  items:        [orderItemSchema],
  total:        { type: Number, required: true },
  paymentMode:  { type: String, enum: ["Cash","UPI","Card"], default: "Cash" }, // ← NEW: UPI/Card
  status: {
    type: String,
    enum: ["Pending","Preparing","Ready","Completed"],
    default: "Pending"
  }
}, {
  timestamps: true   // createdAt + updatedAt auto added
});

module.exports = mongoose.model("Order", orderSchema);