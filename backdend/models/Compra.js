const mongoose = require('mongoose');
const { Schema } = mongoose;

const CompraSchema = new Schema({
  id_compra: { type: Number, required: true },
  totalQt:   { type: Number, required: true },
  totalValue:{ type: Number, required: true },
  photos:    { type: [String], default: [] },
  createdAt: { type: Date,   default: Date.now }
});

module.exports = mongoose.model('Compra', CompraSchema); 