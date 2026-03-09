const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true
  },

  category: {
    type: String,
    required: true
  },

  price: {
    type: Number
  },

  priceSmall: {
    type: Number
  },

  priceRegular: {
    type: Number
  },

  image: {
    type: String
  },

  available: {
    type: Boolean,
    default: true
  }

});

module.exports = mongoose.model("MenuItem", menuItemSchema);