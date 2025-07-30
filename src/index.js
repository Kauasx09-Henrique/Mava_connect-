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


// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

const app = express();

// Configurações do __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares essenciais
app.use(cors()); // Permite requisições de outras origens (frontend)
app.use(express.json()); // Permite que o Express entenda JSON no corpo das requisições

// Middleware para servir arquivos estáticos (como as fotos dos usuários)
// Qualquer arquivo dentro da pasta 'public' poderá ser acessado pela URL
// Ex: http://localhost:3001/fotos/logo-1678886400000.png
app.use(express.static(path.join(__dirname, '../public')));


// --- Rotas da API ---
// A ordem aqui é importante. Rotas mais específicas primeiro.
app.use('/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/visitantes', visitantesRoutes);
app.use('/api', testarConexao); // Rota de teste acessível em /api/testar-conexao

// A linha com erro foi removida daqui.


// Porta do servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
