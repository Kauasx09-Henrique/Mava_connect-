import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js'; // ou onde estiver sua conexão
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// ROTA DE LOGIN
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    const result = await pool.query('SELECT * FROM gf WHERE email_gf = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ mensagem: 'E-mail não encontrado.' });
    }

    const usuario = result.rows[0];

    const senhaValida = await bcrypt.compare(senha, usuario.senha_gf);

    if (!senhaValida) {
      return res.status(401).json({ mensagem: 'Senha incorreta.' });
    }

    const token = jwt.sign(
      {
        id: usuario.id_gf,
        nome: usuario.nome_gf,
        email: usuario.email_gf,
      },
      process.env.JWT_SECRET || 'afed0b10f40fbb6693521a3aeb47b21d4f927585cbcb6aa0b5f4f67d5896876d',
      {
        expiresIn: '12h', // você pode mudar esse tempo
      }
    );

    res.status(200).json({
      mensagem: 'Login bem-sucedido',
      token,
      usuario: {
        id: usuario.id_gf,
        nome: usuario.nome_gf,
        email: usuario.email_gf,
      },
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ mensagem: 'Erro interno do servidor.' });
  }
  function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ mensagem: 'Token não fornecido.' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'afed0b10f40fbb6693521a3aeb47b21d4f927585cbcb6aa0b5f4f67d5896876d', (err, usuario) => {
    if (err) return res.status(403).json({ mensagem: 'Token inválido.' });
    req.usuario = usuario;
    next();
  });
}

});

export default router;
