import express from 'express';
import { pool } from '../db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Rota de login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    const resultado = await pool.query('SELECT * FROM usuarios WHERE email_gf = $1', [email]);

    if (resultado.rows.length === 0) {
      return res.status(401).json({ mensagem: 'Credenciais inválidas' });
    }

    const usuario = resultado.rows[0];

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_gf);

    if (!senhaCorreta) {
      return res.status(401).json({ mensagem: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ id: usuario.id, email: usuario.email_gf }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: 'Erro no servidor' });
  }
});

export default router;
