import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import visitantesRoutes from './routes/visitantes.js';
import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';  // <-- Importa rota usuarios

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/visitantes', visitantesRoutes);
app.use('/auth', authRoutes);
app.use('/usuarios', usuariosRoutes);  // <-- Usa rota usuarios

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
