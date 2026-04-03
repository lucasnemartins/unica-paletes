const mongoose = require('mongoose');

const fotoCompraSchema = new mongoose.Schema({
  id_compra: {
    type: Number,
    required: true,
    index: true
  },
  file_name: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  quantidade: {
    type: Number,
    default: 0
  },
  valor: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Criar índices para melhorar a performance
fotoCompraSchema.index({ id_compra: 1, created_at: -1 });

module.exports = mongoose.model('FotoCompra', fotoCompraSchema); 