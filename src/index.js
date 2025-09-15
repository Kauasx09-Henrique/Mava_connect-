import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';

// Rotas
import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';
import visitantesRoutes from './routes/visitantes.js';
import testarConexao from './routes/teste.js';
import gfsRoutes from './routes/gfs.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuração de CORS ---
const allowedOrigins = [
  'https://mava-connect-front.vercel.app',
  'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Acesso não permitido por CORS'));
  },
  methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  credentials: true,
  allowedHeaders: 'Content-Type,Authorization',
}));

// --- Middlewares ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Rotas ---
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/visitantes', visitantesRoutes);
app.use('/api/teste', testarConexao);
app.use('/api/gfs', gfsRoutes);

// Arquivos estáticos
app.use('/fotos', express.static(path.join(__dirname, '../public/fotos')));

// --- Integração com Socket.IO ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  }
});

// Exporta io para usar nas rotas
export { io };

// Socket.IO - conexão
io.on("connection", (socket) => {
  console.log("Novo cliente conectado:", socket.id);

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

// --- CRON JOB: toda segunda-feira às 09:00 ---
// CRON JOB: todos os dias às 09:00
import cron from 'node-cron';

cron.schedule("0 9 * * *", () => {
  console.log("Enviando notificação diária para admins");
  io.emit("notificacao", {
    msg: "Administradores, lembrem-se de entrar em contato hoje!"
  });
}, {
  timezone: "America/Sao_Paulo"
});


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
