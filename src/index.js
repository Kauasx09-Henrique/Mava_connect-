// Caminho do arquivo: app.js ou server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Importação das rotas
import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';
import visitantesRoutes from './routes/visitantes.js';
import testarConexao from './routes/teste.js';
import gfsRoutes from './routes/gfs.js';

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

const app = express();

// Configurações do __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURAÇÃO DE CORS CORRIGIDA ---
// Lista de origens permitidas (para desenvolvimento e produção)
const allowedOrigins = [
  'https://mava-connect.vercel.app',
  'http://localhost:5173' // Adicione a porta do seu ambiente de desenvolvimento local
];

const corsOptions = {
  origin: (origin, callback) => {
    // Permite requisições sem origin (ex: Postman) ou se a origin estiver na lista
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pela política de CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // 1. MÉTODO PATCH ADICIONADO
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middlewares essenciais
app.use(cors(corsOptions));

// (Opcional, mas melhora compatibilidade com preflight)
app.options('*', cors(corsOptions));

// Permite que o Express entenda JSON no corpo das requisições
app.use(express.json()); 

// Middleware para servir arquivos estáticos (como as fotos dos usuários)
app.use(express.static(path.join(__dirname, '../public/fotos')));


// --- Rotas da API ---
app.use('/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/visitantes', visitantesRoutes);
app.use('/api', testarConexao); 
app.use('/api/gfs', gfsRoutes);
app.use('/fotos', express.static(path.join(__dirname, '../public/fotos')));



// Porta do servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
