import express from 'express';
import pg from 'pg';
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


router.post('/', async (req, res) => {
  const { nome, email, telefone } = req.body;
  try {
    await pool.query(
      'INSERT INTO visitantes (nome, email, telefone) VALUES ($1, $2, $3)',
      [nome, email, telefone]
    );
    res.status(201).json({ message: 'Visitante cadastrado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar visitante' });
  }
});

export default router;
