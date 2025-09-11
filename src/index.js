import 'dotenv/config';
import express from 'express';
import cors from 'cors'; // Agora vamos usar este pacote
import path from 'path';
import { fileURLToPath } from 'url';

// Importação das rotas
import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';
import visitantesRoutes from './routes/visitantes.js';
import testarConexao from './routes/teste.js';
import gfsRoutes from './routes/gfs.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- SUGESTÃO 1: Usar o pacote 'cors' para simplificar a configuração ---
const allowedOrigins = [
  'https://mava-connect-front.vercel.app',
  'http://localhost:5173'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Permite requisições sem 'origin' (ex: Postman, apps mobile) ou da lista de permitidos
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Acesso não permitido por CORS'));
    }
  },
  methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  credentials: true,
  allowedHeaders: 'Content-Type,Authorization',
};

// O 'cors(corsOptions)' substitui todo o seu middleware manual e já lida com as requisições OPTIONS.
app.use(cors(corsOptions));

// --- Middlewares ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- SUGESTÃO 2: Padronizar rotas da API com o prefixo '/api' ---
// Isso torna a API mais consistente. Lembre-se de atualizar no front-end!
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/visitantes', visitantesRoutes);
app.use('/api/teste', testarConexao); // Adicionado prefixo para consistência
app.use('/api/gfs', gfsRoutes);

// --- Rota para servir arquivos estáticos (sem alterações, está ótimo) ---
app.use('/fotos', express.static(path.join(__dirname, '../public/fotos')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});