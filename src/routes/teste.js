import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

router.get('/testar-conexao', async (req, res) => {
  try {
    // Testa uma query simples no banco
    const resultado = await pool.query('SELECT NOW()');
    res.json({ mensagem: 'Conexão com o banco OK', agora: resultado.rows[0].now });
  } catch (error) {
    console.error('Erro na rota testar-conexao:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

export default router;
