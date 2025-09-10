import express from 'express';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

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

router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Usuário não encontrado' });

    const usuario = result.rows[0];
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaCorreta) return res.status(401).json({ error: 'Senha incorreta' });

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, papel: usuario.papel },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, email: usuario.email, papel: usuario.papel });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no login' });
  }
});

router.post('/register', async (req, res) => {
  const { email, senha, papel } = req.body;
  if (!email || !senha || !papel) return res.status(400).json({ error: 'Campos obrigatórios' });

  const senha_hash = await bcrypt.hash(senha, 10);

  try {
    await pool.query(
      'INSERT INTO usuarios (email, senha_hash, papel) VALUES ($1, $2, $3)',
      [email, senha_hash, papel]
    );
    res.status(201).json({ message: 'Usuário criado com sucesso' });
  } catch (err) {
    console.error('Erro ao registrar usuário:', err);
    res.status(500).json({ error: 'Erro ao registrar usuário', details: err.message });
  }

});

export default router;
