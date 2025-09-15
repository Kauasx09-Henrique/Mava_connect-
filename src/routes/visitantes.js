import express from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { io } from '../index.js';

const router = express.Router();

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido.' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido ou expirado.' });
    req.user = user;
    next();
  });
};

// POST / - Criar visitante
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { nome, data_nascimento, telefone, sexo, email, estado_civil, profissao, como_conheceu, gf_responsavel, endereco, evento } = req.body;
    const usuario_id = req.user.id;

    if (!nome || !telefone || !gf_responsavel || !endereco || !evento) {
      return res.status(400).json({ error: 'Campos essenciais são obrigatórios.' });
    }

    const allowedEventos = ['gf', 'evangelismo', 'culto'];
    if (!allowedEventos.includes(evento)) {
      return res.status(400).json({ error: 'Evento inválido.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const gfResult = await client.query('SELECT id FROM gf WHERE LOWER(nome) = LOWER($1)', [gf_responsavel]);
      if (gfResult.rows.length === 0) throw new Error(`GF '${gf_responsavel}' não encontrado.`);
      const gf_id = gfResult.rows[0].id;

      const enderecoQuery = `
        INSERT INTO endereco_visitante (cep, endereco, numero, complemento, bairro, cidade, uf) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
      `;
      const enderecoValues = [endereco.cep, endereco.logradouro, endereco.numero, endereco.complemento, endereco.bairro, endereco.cidade, endereco.uf];
      const newEndereco = await client.query(enderecoQuery, enderecoValues);
      const endereco_id = newEndereco.rows[0].id;

      const visitanteQuery = `
        INSERT INTO visitantes 
        (nome, data_nascimento, telefone, sexo, email, estado_civil, profissao, como_conheceu, usuario_id, gf_id, endereco_id, evento, data_visita, status) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), 'pendente') 
        RETURNING *;
      `;
      const visitanteValues = [nome, data_nascimento || null, telefone, sexo, email, estado_civil, profissao, como_conheceu, usuario_id, gf_id, endereco_id, evento];
      const novoVisitante = await client.query(visitanteQuery, visitanteValues);

      await client.query('COMMIT');

      // 🔔 Notificação em tempo real
      io.emit("notificacao", {
        msg: `🎉 Parabéns! Tivemos mais um visitante na Mava: ${nome}`
      });

      res.status(201).json(novoVisitante.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[ERRO] Ao cadastrar visitante:', err);
      res.status(500).json({ error: 'Erro interno ao cadastrar visitante.', details: err.message });
    } finally {
      client.release();
    }
  } catch (globalErr) {
    console.error('[ERRO GLOBAL] Em POST /visitantes:', globalErr);
    res.status(500).json({ error: 'Erro inesperado no servidor.', details: globalErr.message });
  }
});

// GET / - Listar visitantes (mantido igual)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT v.*, ev.cep, ev.endereco AS logradouro, ev.numero, ev.complemento, ev.bairro, ev.cidade, ev.uf, g.nome AS gf_responsavel
      FROM visitantes v
      LEFT JOIN endereco_visitante ev ON v.endereco_id = ev.id
      LEFT JOIN gf g ON v.gf_id = g.id
      ORDER BY v.data_visita DESC;
    `;
    const { rows } = await pool.query(query);
    const formattedRows = rows.map(row => {
      const { cep, logradouro, numero, complemento, bairro, cidade, uf, ...visitanteData } = row;
      return { ...visitanteData, endereco: { cep, logradouro, numero, complemento, bairro, cidade, uf } };
    });
    res.json(formattedRows);
  } catch (err) {
    console.error('[ERRO] Ao buscar visitantes:', err);
    res.status(500).json({ error: 'Erro interno do servidor.', details: err.message });
  }
});

export default router;
