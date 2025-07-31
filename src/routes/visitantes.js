// Caminho do arquivo: /routes/visitantes.js

import express from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const router = express.Router();

// --- Middleware de autenticação para verificar o token ---
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
        req.user = user; // Adiciona os dados do usuário (id, tipo_usuario) ao request
        next();
    });
};

// --- ROTA PARA CRIAR UM NOVO VISITANTE (CREATE) ---
// Protegida por autenticação
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            nome, data_nascimento, telefone, sexo, email, estado_civil,
            profissao, como_conheceu, gf_responsavel, endereco
        } = req.body;
        
        const usuario_id = req.user.id; // ID do usuário logado (secretaria/admin)

        if (!nome || !telefone || !gf_responsavel || !endereco) {
            return res.status(400).json({ error: 'Campos essenciais (nome, telefone, GF, endereço) são obrigatórios.' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const gfResult = await client.query('SELECT id FROM gf WHERE LOWER(nome) = LOWER($1)', [gf_responsavel]);
            if (gfResult.rows.length === 0) {
                throw new Error(`GF com o nome '${gf_responsavel}' não encontrado.`);
            }
            const gf_id = gfResult.rows[0].id;

            const enderecoQuery = `
                INSERT INTO endereco_visitante (cep, endereco, numero, complemento, bairro, cidade, uf)
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
            `;
            const enderecoValues = [
                endereco.cep, endereco.logradouro, endereco.numero,
                endereco.complemento, endereco.bairro, endereco.cidade, endereco.uf
            ];
            const newEndereco = await client.query(enderecoQuery, enderecoValues);
            const endereco_id = newEndereco.rows[0].id;

            const visitanteQuery = `
                INSERT INTO visitantes (
                    nome, data_nascimento, telefone, sexo, email, estado_civil, profissao, 
                    como_conheceu, usuario_id, gf_id, endereco_id, data_visita, status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), 'pendente')
                RETURNING *;
            `;
            const visitanteValues = [
                nome, data_nascimento || null, telefone, sexo, email,
                estado_civil, profissao, como_conheceu, usuario_id, gf_id, endereco_id
            ];
            const novoVisitante = await client.query(visitanteQuery, visitanteValues);

            await client.query('COMMIT');
            res.status(201).json(novoVisitante.rows[0]);

        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Erro na transação de cadastro de visitante:', err);
            res.status(500).json({ error: 'Erro interno ao cadastrar visitante.', details: err.message });
        } finally {
            client.release();
        }
    } catch (globalErr) {
        console.error('Erro geral na rota de cadastro de visitante:', globalErr);
        res.status(500).json({ error: 'Erro inesperado no servidor.' });
    }
});

// --- ROTA PARA LER TODOS OS VISITANTES (READ ALL) ---
// Protegida por autenticação
router.get('/', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT v.*, ev.cep, ev.endereco AS logradouro, ev.numero, ev.complemento, ev.bairro, ev.cidade, ev.uf
            FROM visitantes v
            LEFT JOIN endereco_visitante ev ON v.endereco_id = ev.id
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
        console.error('Erro ao buscar visitantes:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});


// --- ROTA PARA ATUALIZAR DADOS GERAIS DE UM VISITANTE (UPDATE) ---
// Protegida por autenticação
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    // Removido o status daqui, pois ele será atualizado em uma rota separada
    const { nome, telefone, email, endereco } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query('SELECT endereco_id FROM visitantes WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Visitante não encontrado.' });
        }
        const { endereco_id } = rows[0];

        // Atualiza apenas os dados principais do visitante
        await client.query('UPDATE visitantes SET nome = $1, telefone = $2, email = $3 WHERE id = $4;', [nome, telefone, email, id]);
        
        if (endereco_id && endereco) {
            await client.query(
                'UPDATE endereco_visitante SET cep = $1, endereco = $2, numero = $3, bairro = $4, cidade = $5, uf = $6 WHERE id = $7;',
                [endereco.cep, endereco.logradouro, endereco.numero, endereco.bairro, endereco.cidade, endereco.uf, endereco_id]
            );
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Visitante atualizado com sucesso.' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar visitante:', err);
        res.status(500).json({ error: 'Erro interno ao atualizar visitante.' });
    } finally {
        client.release();
    }
});


// --- NOVA ROTA PARA ATUALIZAR APENAS O STATUS DE UM VISITANTE ---
// Protegida e restrita a administradores
router.patch('/:id/status', authenticateToken, async (req, res) => {
    // 1. Verifica se o usuário é um administrador
    if (req.user.tipo_usuario !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem alterar o status.' });
    }

    const { id } = req.params;
    const { status } = req.body;

    // 2. Valida o valor do status recebido
    const allowedStatus = ['entrou em contato', 'pendente', 'erro número'];
    if (!status || !allowedStatus.includes(status)) {
        return res.status(400).json({ error: 'Valor de status inválido.' });
    }

    try {
        const result = await pool.query(
            'UPDATE visitantes SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Visitante não encontrado.' });
        }

        res.status(200).json({ message: 'Status do visitante atualizado com sucesso.', visitante: result.rows[0] });

    } catch (err) {
        console.error(`Erro ao atualizar status do visitante com id ${id}:`, err);
        res.status(500).json({ error: 'Erro interno do servidor ao atualizar status.' });
    }
});


// --- ROTA PARA DELETAR UM VISITANTE (DELETE) ---
// Protegida por autenticação
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Primeiro, pega o endereco_id antes de deletar o visitante
        const visitanteResult = await client.query('SELECT endereco_id FROM visitantes WHERE id = $1', [id]);
        if (visitanteResult.rowCount === 0) {
            return res.status(404).json({ error: 'Visitante não encontrado.' });
        }
        const { endereco_id } = visitanteResult.rows[0];

        // Deleta o visitante
        await client.query('DELETE FROM visitantes WHERE id = $1', [id]);
        
        // Se houver um endereço associado, deleta o endereço também
        if (endereco_id) {
            await client.query('DELETE FROM endereco_visitante WHERE id = $1', [endereco_id]);
        }

        await client.query('COMMIT');
        res.status(204).send(); // 204 No Content é a resposta padrão para sucesso em DELETE

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Erro ao deletar visitante com id ${id}:`, err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
});

export default router;
