import express from 'express';
import { pool } from '../db.js'; // ou './db.js' dependendo do caminho

const router = express.Router();

router.get('/testar-conexao', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT NOW()');
    res.json({ status: 'Conectado!', hora: resultado.rows[0].now });
  } catch (erro) {
    console.error('Erro ao conectar com o banco:', erro);
    res.status(500).json({ status: 'Erro ao conectar com o banco' });
  }
});

export default router;
