import express from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const router = express.Router();

// --- Middleware de autenticação ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido ou expirado.' });
        }
        req.user = user;
        next();
    });
};

// --- ROTA PARA CRIAR UM NOVO VISITANTE ---
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            nome, data_nascimento, telefone, sexo, email, estado_civil,
            profissao, como_conheceu, gf_responsavel, endereco, evento
        } = req.body;
        const usuario_id = req.user.id;

        if (!nome || !telefone || !gf_responsavel || !endereco || !evento) {
            return res.status(400).json({ error: 'Campos essenciais (nome, telefone, GF, endereço, evento) são obrigatórios.' });
        }
        const allowedEventos = ['gf', 'evangelismo', 'culto'];
        if (!allowedEventos.includes(evento)) {
            return res.status(400).json({ error: 'Valor de evento inválido.' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const gfResult = await client.query('SELECT id FROM gf WHERE LOWER(nome) = LOWER($1)', [gf_responsavel]);
            if (gfResult.rows.length === 0) {
                throw new Error(`GF com o nome '${gf_responsavel}' não encontrado.`);
            }
            const gf_id = gfResult.rows[0].id;

            const enderecoQuery = `INSERT INTO endereco_visitante (cep, endereco, numero, complemento, bairro, cidade, uf) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;`;
            const enderecoValues = [endereco.cep, endereco.logradouro, endereco.numero, endereco.complemento, endereco.bairro, endereco.cidade, endereco.uf];
            const newEndereco = await client.query(enderecoQuery, enderecoValues);
            const endereco_id = newEndereco.rows[0].id;

            const visitanteQuery = `INSERT INTO visitantes (nome, data_nascimento, telefone, sexo, email, estado_civil, profissao, como_conheceu, usuario_id, gf_id, endereco_id, evento, data_visita, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), 'pendente') RETURNING *;`;
            const visitanteValues = [nome, data_nascimento || null, telefone, sexo, email, estado_civil, profissao, como_conheceu, usuario_id, gf_id, endereco_id, evento];
            const novoVisitante = await client.query(visitanteQuery, visitanteValues);

            await client.query('COMMIT');
            res.status(201).json(novoVisitante.rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            res.status(500).json({ error: 'Erro interno ao cadastrar visitante.', details: err.message });
        } finally {
            client.release();
        }
    } catch (globalErr) {
        res.status(500).json({ error: 'Erro inesperado no servidor.' });
    }
});

// --- ROTA PARA LER TODOS OS VISITANTES ---
router.get('/', authenticateToken, async (req, res) => {
    try {
        // ALTERAÇÃO AQUI: Adicionado o JOIN para buscar o nome do GF
        const query = `
            SELECT 
                v.*, 
                ev.cep, ev.endereco AS logradouro, ev.numero, ev.complemento, ev.bairro, ev.cidade, ev.uf,
                g.nome AS gf_responsavel
            FROM visitantes v
            LEFT JOIN endereco_visitante ev ON v.endereco_id = ev.id
            LEFT JOIN gf g ON v.gf_id = g.id
            ORDER BY v.data_visita DESC;
        `;
        const { rows } = await pool.query(query);

        const formattedRows = rows.map(row => {
            const { cep, logradouro, numero, complemento, bairro, cidade, uf, ...visitanteData } = row;
            return {
                ...visitanteData,
                endereco: { cep, logradouro, numero, complemento, bairro, cidade, uf }
            };
        });
        res.json(formattedRows);
    } catch (err) {
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// --- ROTA PARA ATUALIZAR DADOS GERAIS DE UM VISITANTE ---
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { nome, telefone, email, endereco } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { rows } = await client.query('SELECT endereco_id FROM visitantes WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Visitante não encontrado.' });
        }
        const { endereco_id } = rows[0];

        await client.query('UPDATE visitantes SET nome = $1, telefone = $2, email = $3 WHERE id = $4;', [nome, telefone, email, id]);

        if (endereco_id && endereco) {
            await client.query('UPDATE endereco_visitante SET cep = $1, endereco = $2, numero = $3, complemento = $4, bairro = $5, cidade = $6, uf = $7 WHERE id = $8;', [endereco.cep, endereco.logradouro, endereco.numero, endereco.complemento, endereco.bairro, endereco.cidade, endereco.uf, endereco_id]);
        }
        await client.query('COMMIT');
        res.status(200).json({ message: 'Visitante atualizado com sucesso.' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Erro interno ao atualizar visitante.' });
    } finally {
        client.release();
    }
});

// --- ROTA PARA ATUALIZAR APENAS O STATUS ---
router.patch('/:id/status', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatus = ['entrou em contato', 'pendente', 'erro número'];
    if (!status || !allowedStatus.includes(status)) {
        return res.status(400).json({ error: 'Valor de status inválido.' });
    }
    try {
        const result = await pool.query('UPDATE visitantes SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Visitante não encontrado.' });
        }
        res.status(200).json({ message: 'Status do visitante atualizado com sucesso.', visitante: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Erro interno do servidor ao atualizar status.' });
    }
});

// --- ROTA PARA DELETAR UM VISITANTE ---
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const visitanteResult = await client.query('SELECT endereco_id FROM visitantes WHERE id = $1', [id]);
        if (visitanteResult.rowCount === 0) {
            return res.status(404).json({ error: 'Visitante não encontrado.' });
        }
        const { endereco_id } = visitanteResult.rows[0];
        await client.query('DELETE FROM visitantes WHERE id = $1', [id]);
        if (endereco_id) {
            await client.query('DELETE FROM endereco_visitante WHERE id = $1', [endereco_id]);
        }
        await client.query('COMMIT');
        res.status(204).send();
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
});

export default router;