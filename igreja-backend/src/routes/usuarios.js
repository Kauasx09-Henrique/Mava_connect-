import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const router = express.Router();

const pool = new pg.Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  port: Number(process.env.DB_PORT),
});

const JWT_SECRET = process.env.JWT_SECRET || 'segredo';

// Middleware para autenticar token e validar papel admin
function autenticarAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token inválido' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.papel !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    req.usuario = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// GET /usuarios - listar todos os usuários (só admin)
router.get('/', autenticarAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, email, papel FROM usuarios');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

export default router;
