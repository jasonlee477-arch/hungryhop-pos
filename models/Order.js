const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({

orderNumber: Number,

items: Array,

total: Number,

paymentMode: String,

status: {
    type: String,
    default: "Pending"
},

createdAt: {
    type: Date,
    default: Date.now
}

});

module.exports = mongoose.model("Order", orderSchema);