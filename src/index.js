import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';
import visitantesRoutes from './routes/visitantes.js';
import testarConexao from './routes/teste.js';
import gfsRoutes from './routes/gfs.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CORS ---
const allowedOrigins = [
  'https://mava-connect-front.vercel.app',
  'http://localhost:5173'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.sendStatus(204); // responde preflight
  next();
});

// --- Middlewares ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Rotas ---
app.use('/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/visitantes', visitantesRoutes);
app.use('/api', testarConexao);
app.use('/api/gfs', gfsRoutes);
// Servir arquivos estáticos (logos)
app.use('/fotos', express.static(path.join(__dirname, '../public/fotos')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
