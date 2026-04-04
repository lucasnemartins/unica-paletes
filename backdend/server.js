// Força resolução DNS para IPv4 (evita problemas com MySQL no Railway via IPv6)
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

// Bloco 1: Importações e Inicialização do Express
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const FotoCompra = require('./models/FotoCompra');
const Compra = require('./models/Compra');
const multer = require('multer');
const sharp = require('sharp');
const axios = require('axios');
const FormData = require('form-data');
const http = require('http');
const https = require('https');

const envPath = path.join(__dirname, '.env');
console.log('BACKEND: Carregando .env de:', envPath, fs.existsSync(envPath) ? '(ok)' : '(ausente — variáveis só via ambiente)');

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

// Configurar o fuso horário para São Paulo
process.env.TZ = 'America/Sao_Paulo';

const app = express();
const PORT = process.env.PORT || 3001;

// Log das variáveis do Cloudflare
console.log('BACKEND: Verificando variáveis do Cloudflare:');
console.log('BACKEND: CLOUDFLARE_ACCOUNT_ID:', process.env.CLOUDFLARE_ACCOUNT_ID ? 'Configurado' : 'Não configurado');
console.log('BACKEND: CLOUDFLARE_API_TOKEN:', process.env.CLOUDFLARE_API_TOKEN ? 'Configurado' : 'Não configurado');
console.log('BACKEND: CLOUDFLARE_ACCOUNT_HASH:', process.env.CLOUDFLARE_ACCOUNT_HASH ? 'Configurado' : 'Não configurado');

// Habilita trust proxy para que req.protocol reflita 'https' por trás do Nginx
app.set('trust proxy', true);

// Configuração do CORS
app.use(cors({
  origin: '*', // Permite todas as origens
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Allow larger payloads for base64 image uploads
app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Servir uploads estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Servir arquivos estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const mysqlConfig = () => {
  const base = {
    host: process.env.MYSQL_HOST || 'mysql.railway.internal',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'railway',
    ssl: { rejectUnauthorized: false },
  };

  // Se tiver MYSQL_URL, extrai os campos e sobrescreve
  const url = process.env.MYSQL_URL;
  if (url) {
    try {
      const u = new URL(url);
      return {
        ...base,
        host: u.hostname,
        port: parseInt(u.port) || 3306,
        user: u.username,
        password: decodeURIComponent(u.password),
        database: u.pathname.slice(1) || 'railway',
      };
    } catch (e) {
      console.error('BACKEND: Erro ao parsear MYSQL_URL:', e.message);
    }
  }
  return base;
};

// Bloco 2: Função para Conectar ao Banco de Dados
const connectDatabase = async () => {
  const cfg = mysqlConfig();
  console.log(`BACKEND: MySQL → host=${cfg.host} port=${cfg.port} user=${cfg.user} db=${cfg.database}`);
  if (!cfg) {
    throw new Error(
      'BACKEND: Defina MYSQL_URL ou MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD e MYSQL_DATABASE.'
    );
  }
  if (typeof cfg === 'object' && (!cfg.host || !cfg.user || cfg.password === undefined || !cfg.database)) {
    throw new Error(
      'BACKEND: Defina MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD e MYSQL_DATABASE (ex.: arquivo .env no backdend/).'
    );
  }
  try {
    const db = await mysql.createConnection(cfg);
    console.log('BACKEND: Conectado ao MySQL com sucesso!');
    return db;
  } catch (err) {
    console.error('BACKEND: Erro ao conectar ao MySQL:', err);
    throw err;
  }
};

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!mongoUri || !String(mongoUri).trim()) {
  console.error(
    'BACKEND: URI do MongoDB não definida. No arquivo backdend/.env adicione uma das variáveis:\n' +
      '  MONGODB_URI=mongodb+srv://usuario:senha@cluster...mongodb.net/nomedobanco?...\n' +
      '  (alias aceito: MONGO_URI)'
  );
  process.exit(1);
}

// Conectar ao MongoDB e MySQL em paralelo
Promise.all([
  mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
    console.log('BACKEND: MongoDB conectado com sucesso!');
    return mongoose.connection.db.listCollections().toArray();
  }).then(collections => {
    console.log('BACKEND: Coleções existentes no MongoDB:', collections.map(c => c.name));
  }),
  connectDatabase()
])
.then(([_, db]) => {
  console.log('BACKEND: Conectado ao MySQL com sucesso!');

  // Verificar se as coleções existem e criar se necessário
  const createCollections = async () => {
    try {
      // Verificar se a coleção FotoCompra existe
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      if (!collectionNames.includes('fotocompras')) {
        console.log('BACKEND: Criando coleção fotocompras...');
        await mongoose.connection.db.createCollection('fotocompras');
      }
      
      if (!collectionNames.includes('compras')) {
        console.log('BACKEND: Criando coleção compras...');
        await mongoose.connection.db.createCollection('compras');
      }
      
      console.log('BACKEND: Coleções verificadas/criadas com sucesso');
    } catch (error) {
      console.error('BACKEND: Erro ao verificar/criar coleções:', error);
    }
  };
  
  createCollections();

  // Health-check endpoint
app.get('/api/health', (req, res) => {
    const state = mongoose.connection.readyState;
  res.json({ mongoState: state, ok: state === 1 });
});

  // Teste das variáveis do Cloudflare
  app.get('/api/test-cloudflare', (req, res) => {
    res.json({
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID ? 'Configurado' : 'Não configurado',
      apiToken: process.env.CLOUDFLARE_API_TOKEN ? 'Configurado' : 'Não configurado',
      accountHash: process.env.CLOUDFLARE_ACCOUNT_HASH ? 'Configurado' : 'Não configurado'
    });
  });

  // ========================= ROTAS =========================

  // Rota para buscar dados da tabela cd_pallet
  app.get('/api/pallets', async (req, res) => {
   try {
    const [result] = await db.execute(`
     SELECT
      cp.Cd_Pallet,
      cp.Nm_Pallet,
      cp.Vl_Unitario,
      te.Qt_Estoque,
      te.Valor_Estoque
     FROM
      Cd_Pallet cp
     LEFT JOIN
      tb_Estoque te ON cp.Cd_Pallet = te.Cd_Pallet
    `);
    console.log('BACKEND: GET /api/pallets - Response:', result);
    res.json(result);
   } catch (err) {
    console.error('BACKEND: Erro ao buscar pallets:', err);
    return res.status(500).send('Erro ao buscar pallets');
   }
  });

  // Rota para buscar detalhes de um pallet específico
  app.get('/api/estoque-details/:cdPallet', async (req, res) => {
   const cdPallet = req.params.cdPallet;
   console.log('BACKEND: GET /api/estoque-details/' + cdPallet + ' - Iniciando busca...');
   try {
    const [result] = await db.execute(`
     SELECT
      cp.Cd_Pallet,
      cp.Nm_Pallet,
      cp.Vl_Unitario,
      te.Qt_Estoque,
      te.Valor_Estoque
     FROM
      Cd_Pallet cp
     LEFT JOIN
      tb_Estoque te ON cp.Cd_Pallet = te.Cd_Pallet
     WHERE
      cp.Cd_Pallet = ?
    `, [cdPallet]);
    if (result.length > 0) {
     console.log('BACKEND: GET /api/estoque-details/' + cdPallet + ' - Encontrado:', result[0]);
     res.json(result[0]);
    } else {
     console.log('BACKEND: GET /api/estoque-details/' + cdPallet + ' - Não encontrado.');
     res.status(404).send('Pallet não encontrado');
    }
   } catch (err) {
    console.error('BACKEND: Erro ao buscar detalhes do pallet:', err);
    return res.status(500).send('Erro ao buscar detalhes do pallet');
   }
  });

  // Rota para AJUSTAR MANUALMENTE a quantidade e recalcular o Valor_Estoque
  app.post('/api/adjust-estoque', async (req, res) => {
   const { Cd_Pallet, Qt_Ajuste } = req.body;
   console.log('BACKEND: POST /api/adjust-estoque - Recebido (AJUSTE MANUAL):', req.body);

   if (!Cd_Pallet || Qt_Ajuste === undefined || Qt_Ajuste === null || isNaN(parseInt(Qt_Ajuste))) {
    return res.status(400).send('Por favor, forneça um Cd_Pallet válido e uma Qt_Ajuste numérica.');
   }

   try {
    const [resultSelect] = await db.execute('SELECT Vl_Unitario FROM tb_Estoque WHERE Cd_Pallet = ?', [Cd_Pallet]);
    if (resultSelect.length === 0) {
     return res.status(404).send('Pallet não encontrado no estoque.');
    }

    const { Vl_Unitario } = resultSelect[0];
    const novaQtEstoque = parseInt(Qt_Ajuste);
    const novoValorEstoque = (novaQtEstoque * parseFloat(Vl_Unitario || 0)).toFixed(2);

    const [resultUpdate] = await db.execute('UPDATE tb_Estoque SET Qt_Estoque = ?, Valor_Estoque = ? WHERE Cd_Pallet = ?', [novaQtEstoque, novoValorEstoque, Cd_Pallet]);
    console.log('BACKEND: POST /api/adjust-estoque - Estoque ajustado para:', novaQtEstoque, 'e Valor_Estoque para:', novoValorEstoque, 'para o pallet:', Cd_Pallet);
    res.json({ message: 'Estoque ajustado e valor recalculado com sucesso!' });
   } catch (err) {
    console.error('BACKEND: POST /api/adjust-estoque - Erro ao ajustar estoque:', err);
    return res.status(500).send('Erro ao ajustar o estoque.');
   }
  });

  // Rota de teste para inserir diretamente na tb_Estoque
  app.post('/api/teste-estoque', async (req, res) => {
   const connection = await mysql.createConnection(mysqlConfig());

   try {
     await connection.beginTransaction();
     console.log('Iniciando teste de inserção no estoque...');

     // Dados do teste
     const testData = {
       Cd_Pallet: 'TT',
       Nm_Pallet: 'Pallet Teste',
       Qt_Estoque: 10,
       Vl_Unitario: 100.00,
       Valor_Estoque: 1000.00
     };

     // Verificar se já existe
     const [rows] = await connection.execute(
       'SELECT * FROM tb_Estoque WHERE Cd_Pallet = ?',
       [testData.Cd_Pallet]
     );
     console.log('Resultado da verificação:', rows);

     let result;
     if (rows.length > 0) {
       // Atualizar
       [result] = await connection.execute(
         'UPDATE tb_Estoque SET Qt_Estoque = Qt_Estoque + ?, Valor_Estoque = Valor_Estoque + ? WHERE Cd_Pallet = ?',
         [testData.Qt_Estoque, testData.Valor_Estoque, testData.Cd_Pallet]
       );
       console.log('Pallet atualizado:', result);
     } else {
       // Inserir
       [result] = await connection.execute(
         'INSERT INTO tb_Estoque (Cd_Pallet, Nm_Pallet, Qt_Estoque, Vl_Unitario, Valor_Estoque) VALUES (?, ?, ?, ?, ?)',
         [testData.Cd_Pallet, testData.Nm_Pallet, testData.Qt_Estoque, testData.Vl_Unitario, testData.Valor_Estoque]
       );
       console.log('Novo pallet inserido:', result);
     }

     // Verificar resultado
     const [final] = await connection.execute(
       'SELECT * FROM tb_Estoque WHERE Cd_Pallet = ?',
       [testData.Cd_Pallet]
     );
     console.log('Estado final do pallet:', final[0]);

     await connection.commit();
     console.log('Transação concluída com sucesso');

     res.json({
       success: true,
       message: 'Operação realizada com sucesso',
       data: final[0]
     });

   } catch (error) {
     console.error('Erro durante o teste:', error);
     await connection.rollback();
     res.status(500).json({
       success: false,
       error: error.message,
       sqlMessage: error.sqlMessage,
       sqlState: error.sqlState
     });
   } finally {
     await connection.end();
   }
  });

  // Rota de teste para ver o conteúdo da tabela
  app.get('/api/ver-estoque', async (req, res) => {
   try {
     const connection = await mysql.createConnection(mysqlConfig());

     const [rows] = await connection.execute('SELECT * FROM tb_Estoque');
     console.log('Conteúdo atual da tabela tb_Estoque:', rows);
     
     res.json({
       message: 'Conteúdo da tabela tb_Estoque',
       data: rows
     });

     await connection.end();
   } catch (error) {
     console.error('Erro ao consultar estoque:', error);
     res.status(500).json({ error: error.message });
   }
  });

  // Rota para registrar a compra e atualizar o estoque
  app.post('/api/compras', async (req, res) => {
   console.log('BACKEND: POST /api/compras - Rota acessada.');
   const pallets = req.body;
   console.log('BACKEND: POST /api/compras - Dados recebidos:', JSON.stringify(pallets, null, 2));

   if (!Array.isArray(pallets) || pallets.length === 0) {
    return res.status(400).send('Dados inválidos: lista vazia');
   }

    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const dataCompra = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    console.log('BACKEND: DataCompra gerada (string):', dataCompra);
    console.log('BACKEND: DataCompra ISO (server):', now.toISOString());
    console.log('BACKEND: Timezone do servidor:', Intl.DateTimeFormat().resolvedOptions().timeZone);
   let compraId;
   let valorTotalCompraConsolidado = 0;
   let quantidadeTotal = 0;

   try {
    console.log('BACKEND: Iniciando transação...');
    await db.beginTransaction();
    
    // Verificar conexão com o banco
    const [testConnection] = await db.execute('SELECT 1');
    console.log('BACKEND: Teste de conexão com o banco:', testConnection);

    const [resultsIdCompra] = await db.execute('SELECT MAX(id_compra) AS maxId FROM tb_compra');
    console.log('BACKEND: Resultado da busca do último ID:', resultsIdCompra);
    const lastIdCompra = resultsIdCompra[0]?.maxId || 0;
    compraId = lastIdCompra + 1;

    // Calcular a quantidade total e o valor total da compra para tb_compra_consolidado
    quantidadeTotal = pallets.reduce((total, pallet) => total + (parseInt(pallet.Qt) || 0), 0);
    valorTotalCompraConsolidado = pallets.reduce((total, pallet) => total + (parseFloat(pallet.Valor) || 0), 0);
    console.log('BACKEND: Totais calculados - Quantidade:', quantidadeTotal, 'Valor:', valorTotalCompraConsolidado);

    // Inserir dados na tb_compra_consolidado
    const sqlCompraConsolidado = 'INSERT INTO tb_compra_consolidado (data_compra, Qt_Total, valor_total) VALUES (?, ?, ?)';
    console.log('BACKEND: SQL para tb_compra_consolidado:', sqlCompraConsolidado, [dataCompra, quantidadeTotal, valorTotalCompraConsolidado]);
    await db.execute(sqlCompraConsolidado, [dataCompra, quantidadeTotal, valorTotalCompraConsolidado]);
    
    const [resultInsertConsolidado] = await db.execute('SELECT LAST_INSERT_ID() AS id_compra');
    compraId = resultInsertConsolidado[0].id_compra;
    console.log('BACKEND: ID da compra gerado:', compraId);

    // Inserir dados na tb_compra (detalhado por item)
    const valuesCompra = pallets.flatMap(pallet => [
     compraId,
     pallet.Cd_Pallet,
     pallet.Nm_Pallet,
     dataCompra,
     pallet.Qt,
     pallet.Valor,
    ]);
    const placeholders = pallets.map(() => '(?, ?, ?, ?, ?, ?)').join(',');
    const sqlCompra = `INSERT INTO tb_compra (id_compra, Cd_Pallet, Nm_Pallet, Data_Compra, Qt_Pallet, Vl) VALUES ${placeholders}`;
    console.log('BACKEND: SQL para tb_compra:', sqlCompra, valuesCompra);
    await db.execute(sqlCompra, valuesCompra);

    // Atualizar estoque para cada pallet
    for (const pallet of pallets) {
      console.log(`BACKEND: Processando pallet ${pallet.Cd_Pallet}...`);
      
      // Verificar se o pallet já existe no estoque
      const [existente] = await db.execute(
        'SELECT * FROM tb_Estoque WHERE Cd_Pallet = ?',
        [pallet.Cd_Pallet]
      );
      console.log(`BACKEND: Resultado da verificação do pallet ${pallet.Cd_Pallet}:`, existente);

      if (existente.length > 0) {
        // Atualizar estoque existente
        const novaQt = existente[0].Qt_Estoque + parseInt(pallet.Qt);
        const novoValorEstoque = existente[0].Valor_Estoque + parseFloat(pallet.Valor);
        console.log(`BACKEND: Atualizando estoque do pallet ${pallet.Cd_Pallet} - Nova Qt: ${novaQt}, Novo Valor: ${novoValorEstoque}`);
        
        const [resultUpdate] = await db.execute(
          'UPDATE tb_Estoque SET Qt_Estoque = ?, Valor_Estoque = ? WHERE Cd_Pallet = ?',
          [novaQt, novoValorEstoque, pallet.Cd_Pallet]
        );
        
        if (resultUpdate.affectedRows === 0) {
          throw new Error(`Falha ao atualizar estoque para o pallet: ${pallet.Cd_Pallet}`);
        }
        
        console.log(`BACKEND: Resultado da atualização do estoque:`, resultUpdate);
      } else {
        // Inserir novo registro no estoque
        console.log(`BACKEND: Inserindo novo registro para o pallet ${pallet.Cd_Pallet}`);
        const [resultInsert] = await db.execute(
          'INSERT INTO tb_Estoque (Cd_Pallet, Nm_Pallet, Qt_Estoque, Vl_Unitario, Valor_Estoque) VALUES (?, ?, ?, ?, ?)',
          [pallet.Cd_Pallet, pallet.Nm_Pallet, parseInt(pallet.Qt), parseFloat(pallet.UnitValue), parseFloat(pallet.Valor)]
        );
        
        if (resultInsert.affectedRows === 0) {
          throw new Error(`Falha ao inserir novo registro para o pallet: ${pallet.Cd_Pallet}`);
        }
        
        console.log(`BACKEND: Resultado da inserção:`, resultInsert);
      }
    }

    console.log('BACKEND: Commit da transação...');
    await db.commit();

    // Atualizar tb_fluxo_caixa_consolidado após registrar a compra
    try {
      // Buscar totais atuais
      const [caixaRows] = await db.execute(
        'SELECT IFNULL(SUM(Caixa_Atual),0) AS totalCaixa FROM tb_fluxo_caixa'
      );
      const totalCaixa = parseFloat(caixaRows[0].totalCaixa);
      const [compraRows] = await db.execute(
        'SELECT IFNULL(SUM(valor_total),0) AS totalCompras FROM tb_compra_consolidado'
      );
      const totalCompras = parseFloat(compraRows[0].totalCompras);
      const saldoAtual = totalCaixa - totalCompras;
      const diferenca = saldoAtual - totalCompras;
      await db.execute(
        'INSERT INTO tb_fluxo_caixa_consolidado (Total_Compras, Saldo_Atual, Diferenca, Data_Caixa) VALUES (?, ?, ?, ?)',
        [totalCompras, saldoAtual, diferenca, dataCompra]
      );
      console.log('BACKEND: tb_fluxo_caixa_consolidado atualizado após compra.');
    } catch (consErr) {
      console.error('Erro ao atualizar tb_fluxo_caixa_consolidado após compra:', consErr);
    }

    // Atualizar tb_fluxo_compra_consolidado após registrar a compra
    try {
      await db.execute(
        'INSERT INTO tb_fluxo_compra_consolidado (Total_Compras, Data_Compra) VALUES (?, ?)',
        [valorTotalCompraConsolidado, dataCompra]
      );
      console.log('BACKEND: tb_fluxo_compra_consolidado atualizado após compra.');
    } catch (err) {
      console.error('Erro ao atualizar tb_fluxo_compra_consolidado após compra:', err);
    }

    // Save purchase summary to MongoDB
    try {
      const purchaseDoc = await Compra.create({
        id_compra: compraId,
        totalQt: quantidadeTotal,
        totalValue: valorTotalCompraConsolidado
      });
      console.log('BACKEND: Compra.create (Mongo) result:', purchaseDoc);
    } catch (mongoErr) {
      console.error('Erro ao salvar compra no MongoDB:', mongoErr);
    }

    res.json({ message: 'Compra registrada e estoque atualizado com sucesso!', id_compra: compraId });

   } catch (err) {
    console.error('BACKEND: Erro detalhado:', {
      message: err.message,
      code: err.code,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState
    });
    await db.rollback();
    res.status(500).send('Erro ao registrar a compra: ' + err.message);
   }
  });

  // Configuração do axios com cache de conexão e otimizações extremas
  const axiosInstance = axios.create({
    keepAlive: true,
    timeout: 20000, // Aumentar timeout
    maxContentLength: 5 * 1024 * 1024, // Reduzir para 5MB
    maxBodyLength: 5 * 1024 * 1024, // Reduzir para 5MB
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'multipart/form-data'
    },
    maxRedirects: 2,
    decompress: true,
    httpAgent: new http.Agent({ 
      keepAlive: true, 
      maxSockets: 10, // Reduzir ainda mais
      timeout: 20000,
      keepAliveMsecs: 15000
    }),
    httpsAgent: new https.Agent({ 
      keepAlive: true, 
      maxSockets: 10,
      timeout: 20000,
      keepAliveMsecs: 15000
    })
  });

  // Função para fazer upload para o Cloudflare Images otimizada
  const uploadToCloudflare = async (buffer, fileName) => {
    try {
      const formData = new FormData();
      formData.append('file', buffer, {
        filename: fileName,
        contentType: 'image/jpeg'
      });

      const headers = {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        ...formData.getHeaders()
      };

      const response = await axiosInstance.post(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
        formData,
        { 
          headers,
          maxContentLength: 5 * 1024 * 1024, // Limitar tamanho do upload
          maxBodyLength: 5 * 1024 * 1024
        }
      );

      return response.data.result;
    } catch (error) {
      console.error('BACKEND: Erro detalhado no upload para Cloudflare:', {
        message: error.message,
        code: error.code,
        response: error.response?.data
      });
      throw new Error('Falha no upload para o Cloudflare: ' + error.message);
    }
  };

  // Função para comprimir imagem otimizada
  const compressImage = async (buffer) => {
    try {
      const compressedBuffer = await sharp(buffer)
        .resize(600, 600, {  // Reduzir para 600x600 para ser mais rápido
          fit: 'inside',
          withoutEnlargement: true,
          fastShrinkOnLoad: true  // Adicionar para compressão mais rápida
        })
        .jpeg({ 
          quality: 50,  // Reduzir qualidade para 50
          progressive: false,  // Desabilitar progressive para compressão mais rápida
          chromaSubsampling: '4:2:0',
          mozjpeg: true,
          optimizeScans: false,  // Desabilitar para compressão mais rápida
          optimizeCoding: false  // Desabilitar para compressão mais rápida
        })
        .toBuffer();
      return compressedBuffer;
    } catch (error) {
      console.error('Erro ao comprimir imagem:', error);
      return null;
    }
  };

  // Rota para listar histórico de compras
  app.get('/api/compras/historico', async (req, res) => {
    try {
      const [rows] = await db.execute(
        'SELECT id, data_compra, Qt_Total, valor_total FROM tb_compra_consolidado ORDER BY data_compra DESC LIMIT 50'
      );
      res.json(rows);
    } catch (err) {
      console.error('BACKEND: Erro ao buscar histórico de compras:', err);
      res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
  });

  // Configuração do multer otimizada
  const storage = multer.memoryStorage();
  const upload = multer({ 
    storage,
    limits: { 
      fileSize: 50 * 1024 * 1024 // Aumentar limite para 50MB
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Apenas imagens são permitidas!'));
      }
    }
  });

  // Rota de upload de foto otimizada
  app.post('/api/compras/:id/foto', async (req, res) => {
    const startTime = Date.now();
    const idCompra = req.params.id;

    try {
      if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB não está conectado');
      }

      // Tempo de processamento do base64
      const base64StartTime = Date.now();
      let base64Data;
      if (req.body.photo) {
        base64Data = req.body.photo;
      } else {
        return res.status(400).send('Por favor envie o campo photo com a imagem base64.');
      }
      const base64Time = Date.now() - base64StartTime;
      console.log(`BACKEND: Tempo de processamento base64: ${base64Time}ms`);

      // Comprimir imagem com sharp e salvar base64 no MongoDB
      const processStartTime = Date.now();
      const fileName = `image_${Date.now()}.jpg`;
      const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Clean, 'base64');
      const compressedBuffer = await compressImage(buffer);
      const finalBuffer = compressedBuffer || buffer;
      const finalBase64 = `data:image/jpeg;base64,${finalBuffer.toString('base64')}`;
      const processTime = Date.now() - processStartTime;
      console.log(`BACKEND: Compressão: ${processTime}ms, tamanho final: ${Math.round(finalBuffer.length / 1024)}KB`);

      // Salvar base64 comprimido no MongoDB
      const mongoStartTime = Date.now();
      const created = await FotoCompra.create({
        id_compra: parseInt(idCompra),
        file_name: fileName,
        url: finalBase64,
        created_at: new Date(),
        quantidade: req.body.quantidade ? Number(req.body.quantidade) : 0,
        valor: req.body.valor ? Number(req.body.valor) : 0
      });
      const mongoTime = Date.now() - mongoStartTime;
      console.log(`BACKEND: Tempo de salvamento no MongoDB: ${mongoTime}ms`);

      // Atualizar compra em background sem esperar
      Compra.findOneAndUpdate(
        { id_compra: parseInt(idCompra) },
        { $push: { photos: finalBase64 } },
        { new: true, upsert: true }
      ).catch(err => console.error('Erro ao atualizar compra:', err));

      const totalTime = Date.now() - startTime;
      console.log(`BACKEND: Tempo total do processo: ${totalTime}ms`);

      res.json({
        message: 'Foto da compra registrada com sucesso!',
        url: finalBase64,
        metadata: created,
        performance: {
          processTime,
          mongoTime,
          totalTime
        }
      });

    } catch (err) {
      const errorTime = Date.now() - startTime;
      console.error(`BACKEND: Erro ao processar upload (${errorTime}ms):`, err);
      res.status(500).send('Erro ao processar upload da foto: ' + err.message);
    }
  });

  // Rota para verificar fotos de uma compra — retorna metadados sem o base64
  app.get('/api/mongo/compras/:id/fotos', async (req, res) => {
    try {
      const idCompra = parseInt(req.params.id);
      
      if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB não está conectado');
      }

      const fotos = await FotoCompra.find(
        { id_compra: idCompra },
        { _id: 1, file_name: 1, created_at: 1, quantidade: 1, valor: 1 }
      )
      .sort({ created_at: -1 })
      .lean();

      // Retorna a URL de imagem servida pelo backend (sem base64 no JSON)
      const fotosComUrl = fotos.map(f => ({
        ...f,
        url: `/api/foto/${f._id}`,
      }));
      
      console.log('BACKEND: Fotos encontradas:', fotos.length);
      res.json(fotosComUrl);

    } catch (err) {
      console.error('BACKEND: Erro ao buscar fotos:', err);
      res.status(500).send('Erro ao buscar fotos: ' + err.message);
    }
  });

  // Serve uma foto como imagem HTTP (converte base64 → binário)
  app.get('/api/foto/:id', async (req, res) => {
    try {
      const foto = await FotoCompra.findById(req.params.id, { url: 1 }).lean();
      if (!foto) return res.status(404).send('Foto não encontrada');

      const url = foto.url || '';
      if (url.startsWith('data:')) {
        const base64 = url.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64, 'base64');
        res.set('Content-Type', 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=86400');
        return res.send(buffer);
      }
      // Se for URL externa (Cloudflare), redireciona
      res.redirect(url);
    } catch (err) {
      console.error('BACKEND: Erro ao servir foto:', err);
      res.status(500).send('Erro ao servir foto');
    }
  });

  // Teste: criar metadata de foto direto no MongoDB sem arquivo
  app.post('/api/mongo/compras/:id/fotos', async (req, res) => {
    console.log(`BACKEND: POST /api/mongo/compras/${req.params.id}/fotos - body=`, req.body);
    try {
      const idCompra = parseInt(req.params.id);
      const { url: fotoUrl, file_name: fotoFileName, quantidade, valor } = req.body;
      if (!fotoUrl) {
        return res.status(400).send('Por favor envie a url no body.');
      }
      // Build the document with optional fields
      const newDoc = { id_compra: idCompra, file_name: fotoFileName || '', url: fotoUrl };
      if (quantidade !== undefined) {
        newDoc.quantidade = Number(quantidade);
      }
      if (valor !== undefined) {
        newDoc.valor = Number(valor);
      }
      const createdDoc = await FotoCompra.create(newDoc);
      console.log('BACKEND: FotoCompra.create (manual) result:', createdDoc);
      // Atualiza também o array de fotos na compra
      await Compra.findOneAndUpdate(
        { id_compra: idCompra },
        { $push: { photos: newDoc.url } },
        { new: true }
      );
      res.json(createdDoc);
    } catch (err) {
      console.error('Erro ao criar metadata no MongoDB:', err);
      res.status(500).send('Erro ao criar metadata no MongoDB.');
    }
  });

  // Rota para buscar documento de compra com fotos no MongoDB
  app.get('/api/mongo/compras/:id', async (req, res) => {
    try {
      const idCompra = parseInt(req.params.id);
      const compraDoc = await Compra.findOne({ id_compra: idCompra }).lean();
      if (!compraDoc) return res.status(404).send('Compra não encontrada');
      res.json(compraDoc);
    } catch (err) {
      console.error('Erro ao buscar compra no MongoDB:', err);
      res.status(500).send('Erro ao buscar compra no MongoDB.');
    }
  });

  // Rota para registrar a venda e atualizar o estoque (MODIFICADA PARA ATUALIZAR O VALOR)
  app.post('/api/vendas', async (req, res) => {
   const itensVenda = req.body;
   console.log('BACKEND: POST /api/vendas - Dados de venda recebidos:', itensVenda);

   if (!Array.isArray(itensVenda) || itensVenda.length === 0) {
    return res.status(400).json({ message: 'Dados de venda inválidos: lista vazia' });
   }

   const now = new Date();
   const pad = n => n.toString().padStart(2, '0');
   const dataVenda = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

   try {
    await db.beginTransaction();
    const [resultsIdVenda] = await db.execute('SELECT MAX(id_venda) AS maxId FROM tb_venda');
    const lastId = resultsIdVenda[0].maxId || 0;
    const vendaIdNumerico = lastId + 1;
    const vendaIdExibicao = `VEN-${vendaIdNumerico.toString().padStart(5, '0')}`;
    console.log('BACKEND: POST /api/vendas - Novo ID de venda gerado:', vendaIdExibicao);

    const promisesVenda = itensVenda.map(async (item) => {
     const { Cd_Pallet, Qt_Venda, Vl_Uni_venda, Nm_Pallet, data_venda, Valor_Venda } = item;

     if (!Cd_Pallet || !Qt_Venda || !Vl_Uni_venda) {
      throw new Error('Dados de venda incompletos para o pallet: ' + Cd_Pallet);
     }

     const insertVendaSql = 'INSERT INTO tb_venda (id_venda, Cd_Pallet, Nm_Pallet, Data_Venda, Qt_Venda, Vl_Unitario, Valor_Venda) VALUES (?, ?, ?, ?, ?, ?, ?)';
     await db.execute(insertVendaSql, [vendaIdNumerico, Cd_Pallet, Nm_Pallet, dataVenda, parseInt(Qt_Venda), parseFloat(Vl_Uni_venda), parseFloat(Valor_Venda)]);
     console.log('BACKEND: POST /api/vendas - Item de venda inserido para o pallet:', Cd_Pallet);

     // Buscar o Vl_Unitario e Valor_Estoque atual do produto no estoque
     const [resultVlUnitarioEstoque] = await db.execute('SELECT Vl_Unitario, Valor_Estoque FROM tb_Estoque WHERE Cd_Pallet = ?', [Cd_Pallet]);
     if (resultVlUnitarioEstoque.length === 0 || resultVlUnitarioEstoque[0].Vl_Unitario === null) {
      throw new Error(`Valor unitário não encontrado no estoque para o pallet: ${Cd_Pallet}`);
     }
     const vlUnitarioEstoque = parseFloat(resultVlUnitarioEstoque[0].Vl_Unitario);
     const valorEstoqueAtual = parseFloat(resultVlUnitarioEstoque[0].Valor_Estoque || 0);
     const valorRemoverEstoque = vlUnitarioEstoque * parseInt(Qt_Venda);
     const novoValorEstoque = valorEstoqueAtual - valorRemoverEstoque;

     // Atualizar o estoque (Qt_Estoque e Valor_Estoque)
     const updateEstoqueSql = `
      UPDATE tb_Estoque
      SET
       Qt_Estoque = Qt_Estoque - ?,
       Valor_Estoque = ?
      WHERE
       Cd_Pallet = ? AND Qt_Estoque >= ? AND Valor_Estoque >= ?
     `;
     const [resultUpdateEstoque] = await db.execute(updateEstoqueSql, [
      parseInt(Qt_Venda),
      novoValorEstoque,
      Cd_Pallet,
      parseInt(Qt_Venda),
      valorRemoverEstoque,
     ]);

     if (resultUpdateEstoque.affectedRows === 0) {
      throw new Error(`Estoque ou valor de estoque insuficiente para o pallet: ${Cd_Pallet}`);
     }
     console.log('BACKEND: POST /api/vendas - Estoque e valor de estoque atualizados para o pallet:', Cd_Pallet);
    });

    await Promise.all(promisesVenda);
    await db.commit();
    res.json({ message: 'Venda registrada e estoque atualizado com sucesso!', id_venda: vendaIdExibicao });

   } catch (error) {
    await db.rollback();
    console.error('BACKEND: POST /api/vendas - Erro ao processar venda:', error);
    res.status(500).send('Erro ao registrar a venda: ' + error.message);
   }
  });
  // Função para obter o somatório total da coluna Vl da tb_compra
  const obterTotalCompras = async (conexao) => {
   try {
    const [totalComprasRows] = await conexao.execute('SELECT SUM(Vl) AS total FROM tb_compra');
    return totalComprasRows[0]?.total || 0;
   } catch (error) {
    console.error('BACKEND: Erro ao obter total de compras:', error);
    return 0;
   }
  };

  // Rota para adicionar um valor ao caixa (adição de dinheiro)
  app.post('/api/registrar-compra', async (req, res) => {
   console.log('BACKEND: /api/registrar-compra - Iniciando registro de caixa...');
   const { valor } = req.body;
   if (valor === undefined || isNaN(parseFloat(valor))) {
     return res.status(400).json({ error: 'Valor inválido para registro de caixa.' });
   }
   const valorAdicionado = parseFloat(valor);
   const now = new Date();
   const pad = n => n.toString().padStart(2, '0');
   const dataCaixa = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

   try {
     // Iniciar transação
     await db.beginTransaction();

     // Inserir valor no fluxo de caixa
     const [insertCaixa] = await db.execute(
       'INSERT INTO tb_fluxo_caixa (Caixa_Atual, Data_Caixa) VALUES (?, ?)',
       [valorAdicionado, dataCaixa]
     );
     console.log('BACKEND: /api/registrar-compra - Caixa inserido:', insertCaixa);

     // Buscar totais atuais
     const [caixaRows] = await db.execute(
       'SELECT IFNULL(SUM(Caixa_Atual),0) AS totalCaixa FROM tb_fluxo_caixa'
     );
     const totalCaixa = parseFloat(caixaRows[0].totalCaixa);
     const [compraRows] = await db.execute(
       'SELECT IFNULL(SUM(valor_total),0) AS totalCompras FROM tb_compra_consolidado'
     );
     const totalCompras = parseFloat(compraRows[0].totalCompras);

     // Calcular saldo e inserir consolidação
     const saldoAtual = totalCaixa - totalCompras;
     const diferenca = saldoAtual - totalCompras;
     const [insertCons] = await db.execute(
       'INSERT INTO tb_fluxo_caixa_consolidado (Total_Compras, Saldo_Atual, Diferenca, Data_Caixa) VALUES (?, ?, ?, ?)',
       [totalCompras, saldoAtual, diferenca, dataCaixa]
     );
     console.log('BACKEND: /api/registrar-compra - Consolidado inserido:', insertCons);

     // Commit da transação
     await db.commit();

     if (insertCaixa.affectedRows === 1 && insertCons.affectedRows === 1) {
       res.json({
         message: 'Valor adicionado e consolidação atualizada com sucesso!',
         totalCompras,
         totalCaixa,
         saldoAtual
       });
     } else {
       throw new Error('Falha ao inserir registros de caixa ou consolidação.');
     }
   } catch (error) {
     console.error('BACKEND: Erro em /api/registrar-compra:', error);
     await db.rollback();
     res.status(500).json({ error: 'Erro ao processar registro de caixa.', details: error.message });
   }
  });

  // Rota para listar todos os registros do fluxo de caixa
  app.get('/api/fluxo-caixa', async (req, res) => {
   const { data } = req.query;
   try {
    let query = 'SELECT id_caixa, Caixa_Atual, Data_Caixa FROM tb_fluxo_caixa WHERE Caixa_Atual > 0';
    const queryParams = [];
 
    if (data) {
     query += ' AND DATE(Data_Caixa) = ?';
     queryParams.push(data);
     console.log('BACKEND: Filtrando por data:', data);
    }
 
    query += ' ORDER BY Data_Caixa DESC';
 
    const [result] = await db.execute(query, queryParams);
    console.log('BACKEND: Resultados da consulta:', result);
    res.json(result);
   } catch (err) {
    console.error('BACKEND: Erro ao buscar registros do fluxo de caixa:', err);
    return res.status(500).send('Erro ao buscar registros do fluxo de caixa');
   }
  });

  // Rota para buscar um registro específico do fluxo de caixa pelo seu id_caixa (se houver um id)
  app.get('/api/fluxo-caixa/:id', async (req, res) => {
   const idCaixa = req.params.id;
   try {
    const [result] = await db.execute('SELECT id_caixa, Caixa_Atual, Data_Caixa FROM tb_fluxo_caixa WHERE id_caixa = ?', [idCaixa]);
    if (result.length > 0) {
     res.json(result[0]);
    } else {
     res.status(404).send('Registro do fluxo de caixa não encontrado');
    }
   } catch (err) {
    console.error('BACKEND: Erro ao buscar registro do fluxo de caixa:', err);
    return res.status(500).send('Erro ao buscar registro do fluxo de caixa');
   }
  });

  // Rota para filtrar o fluxo de caixa por período
  app.get('/api/fluxo-caixa/periodo', async (req, res) => {
   const { dataInicio, dataFim } = req.query;
   if (!dataInicio || !dataFim) {
    return res.status(400).send('Por favor, forneça dataInicio e dataFim.');
   }
   try {
    const [result] = await db.execute(
     'SELECT id_caixa, Caixa_Atual, Data_Caixa FROM tb_fluxo_caixa WHERE Caixa_Atual > 0 AND Data_Caixa >= ? AND Data_Caixa <= ? ORDER BY Data_Caixa DESC',
     [dataInicio, dataFim + ' 23:59:59']
    );
    res.json(result);
   } catch (err) {
    console.error('BACKEND: Erro ao buscar fluxo de caixa por período:', err);
    return res.status(500).send('Erro ao buscar fluxo de caixa por período');
   }
  });

  // Rota para obter o resumo do caixa (total de compras e saldo atual)
  app.get('/api/resumo-caixa', async (req, res) => {
   try {
    const [totalComprasResult] = await db.execute('SELECT SUM(Valor_Total) AS total FROM tb_compra_consolidado');
    const totalCompras = totalComprasResult[0]?.total ? parseFloat(totalComprasResult[0].total) : 0;
 
    const [saldoAtualResult] = await db.execute(
      'SELECT Saldo_Atual AS Saldo FROM tb_fluxo_caixa_consolidado ORDER BY Data_Caixa DESC LIMIT 1'
    );
    const saldoAtual = saldoAtualResult[0]?.Saldo ? parseFloat(saldoAtualResult[0].Saldo) : 0;
 
    res.json({
     totalCompras: totalCompras,
     saldoAtual: saldoAtual
    });
   } catch (err) {
    console.error('BACKEND: Erro ao buscar resumo do caixa:', err);
    return res.status(500).send('Erro ao buscar resumo do caixa');
   }
  });

  // Rota de upload de foto para uma compra
  app.post('/api/upload-photo', upload.single('photo'), async (req, res) => {
    try {
      const { id_compra } = req.body;
      const file = req.file;
      // URL pública da foto (ajustar HOST_URL no .env)
      const url = `${process.env.HOST_URL}/uploads/${file.filename}`;
      // Atualiza o array de fotos da compra
      const updated = await Compra.findOneAndUpdate(
        { id_compra: Number(id_compra) },
        { $push: { photos: url } },
        { new: true }
      );
      return res.json(updated);
    } catch (err) {
      console.error('Erro upload foto:', err);
      res.status(500).json({ error: 'Falha no upload de foto' });
   }
  });

  // ====================== FIM DAS ROTAS ======================

  app.listen(PORT, () => {
   console.log(`BACKEND: Servidor rodando na porta ${PORT}`);
  });
 })
.catch(err => {
  console.error('BACKEND: Falha ao conectar em algum banco, servidor não iniciado.', err);
  process.exit(1);
 });

  
