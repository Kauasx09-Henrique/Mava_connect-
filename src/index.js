// Caminho do arquivo: app.js ou server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';
import visitantesRoutes from './routes/visitantes.js';
import testarConexao from './routes/teste.js';


dotenv.config();

const app = express();

// Configurações do __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../public/fotos')));

// Rotas
app.use('/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/visitantes', visitantesRoutes);
app.use('/api', testarConexao); // acessa em /api/testar-conexao


// Porta
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
