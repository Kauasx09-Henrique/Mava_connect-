// Caminho: routes/gfs.js

import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// ROTA PARA BUSCAR TODOS OS GRUPOS FAMILIARES (GFs)
// Esta rota será chamada pelo frontend para popular o menu de seleção.
router.get('/', async (req, res) => {
  try {
    // Busca o id e o nome de todos os GFs, ordenados por nome.
    const { rows } = await pool.query('SELECT id, nome FROM gf ORDER BY nome ASC');
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar GFs:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

export default router;
