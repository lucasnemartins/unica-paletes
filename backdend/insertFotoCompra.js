// Script to manually insert a FotoCompra document into MongoDB
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const FotoCompra = require('./models/FotoCompra');

(async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dbunicapaletes');

    const idCompra = 369; // <-- adjust the id_compra as needed
    const fileName = 'test.jpg';
    const url = 'https://example.com/test.jpg';

    console.log(`Inserting document for id_compra=${idCompra}`);
    const result = await FotoCompra.create({ id_compra: idCompra, file_name: fileName, url });
    console.log('Insert result:', result);
  } catch (err) {
    console.error('Error inserting into MongoDB:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
})(); 