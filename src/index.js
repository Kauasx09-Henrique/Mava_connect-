// 1. IMPORTAÇÃO DO DOTENV COMO A PRIMEIRA LINHA DE TODAS
// Isso garante que as variáveis de ambiente sejam carregadas antes de qualquer outro código.
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Importação das rotas
import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';
import visitantesRoutes from './routes/visitantes.js';
import testarConexao from './routes/teste.js';
import gfsRoutes from './routes/gfs.js';

const app = express();

// Configurações do __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURAÇÃO DE CORS SEGURA E CORRIGIDA ---
const allowedOrigins = [
  'https://mava-connect.onrender.com', // URL corrigida para corresponder ao erro
  'http://localhost:5173'                 // Porta do seu frontend local
];

const corsOptions = {
  origin: (origin, callback) => {
    // Permite requisições sem 'origin' (ex: Postman) ou se a origin estiver na lista
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pela política de CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middlewares essenciais
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Melhora a compatibilidade
app.use(express.json());

// --- Rotas da API ---
app.use('/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/visitantes', visitantesRoutes);
app.use('/api', testarConexao);
app.use('/api/gfs', gfsRoutes);

// Middleware para servir arquivos estáticos (logos dos usuários)
// Acessível via https://seu-backend.onrender.com/fotos/nome-do-arquivo.png
app.use('/fotos', express.static(path.join(__dirname, '../public/fotos')));

// Porta do servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

