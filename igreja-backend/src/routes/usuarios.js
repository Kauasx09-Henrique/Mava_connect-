import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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

// Todas as rotas abaixo usarão o middleware de autenticação de admin
router.use(autenticarAdmin);


// --- ROTA PARA LISTAR TODOS OS USUÁRIOS (READ ALL) ---
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, email, papel FROM usuarios');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});


// --- ROTA PARA CADASTRAR UM USUÁRIO (CREATE) ---
router.post('/', async (req, res) => {
  const { email, senha, papel } = req.body;

  if (!email || !senha || !papel) {
    return res.status(400).json({ error: 'Email, senha e papel são obrigatórios.' });
  }

  try {
    const userExists = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ error: 'Este email já está em uso.' });
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    const newUserQuery = `
      INSERT INTO usuarios (email, senha, papel) 
      VALUES ($1, $2, $3) 
      RETURNING id, email, papel
    `;
    const { rows } = await pool.query(newUserQuery, [email, senhaHash, papel]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});


// --- ROTA PARA OBTER UM ÚNICO USUÁRIO (READ ONE) ---
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT id, email, papel FROM usuarios WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});


// --- ROTA PARA ATUALIZAR UM USUÁRIO (UPDATE) ---
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { email, papel } = req.body;

  if (!email || !papel) {
    return res.status(400).json({ error: 'Email e papel são obrigatórios.' });
  }

  try {
    const query = 'UPDATE usuarios SET email = $1, papel = $2 WHERE id = $3 RETURNING id, email, papel';
    const { rows } = await pool.query(query, [email, papel, id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});


// --- ROTA PARA EXCLUIR UM USUÁRIO (DELETE) ---
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    res.status(200).json({ message: 'Usuário excluído com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});


export default router;