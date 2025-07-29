// Caminho do arquivo: app.js ou server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path'; // Importe o 'path' do Node.js
import { fileURLToPath } from 'url'; // Para resolver o __dirname em ES Modules

// Importação das suas rotas
import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';
import visitantesRoutes from './routes/visitantes.js';

dotenv.config();

const app = express();

// Configurações do __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(cors());
app.use(express.json());

// --- AQUI ESTÁ A CORREÇÃO ---
// Esta linha torna a pasta 'public' acessível para o navegador.
// Agora, o frontend poderá acessar as imagens em http://localhost:3001/fotos/logo-123.png
app.use(express.static(path.join(__dirname, '../public/fotos')));


// --- USO DAS ROTAS ---
app.use('/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/visitantes', visitantesRoutes);


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
