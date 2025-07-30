import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const router = express.Router();

// Rota de login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    // Verifica se o e-mail existe na tabela "usuarios"
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email_gf = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
    }

    const usuario = result.rows[0];

    // Verifica se a senha está correta
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_gf);
    if (!senhaCorreta) {
      return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
    }

    // Gera o token JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        nome: usuario.nome_gf,
        email: usuario.email_gf,
        tipo: usuario.tipo_usuario
      },
      process.env.JWT_SECRET || 'afed0b10f40fbb6693521a3aeb47b21d4f927585cbcb6aa0b5f4f67d5896876d',
      {
        expiresIn: '12h',
      }
    );

    // Retorna o token e os dados do usuário
    res.status(200).json({
      mensagem: 'Login bem-sucedido',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome_gf,
        email: usuario.email_gf,
        tipo: usuario.tipo_usuario
      },
    });

  } catch (erro) {
    console.error('Erro ao realizar login:', erro);
    res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
});

export default router;
