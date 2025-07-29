// Caminho do arquivo: /routes/visitantes.js

import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// --- ROTA PARA CRIAR UM NOVO VISITANTE (CREATE) ---
router.post('/', async (req, res) => {
    // Adicionado para depuração: mostra os dados recebidos no console do backend
    console.log("--- DADOS RECEBIDOS PARA CADASTRO DE VISITANTE ---");
    console.log(JSON.stringify(req.body, null, 2));

    const {
        nome,
        data_nascimento,
        telefone,
        sexo,
        email,
        estado_civil,
        profissao,
        como_conheceu,
        gf_responsavel,
        endereco
    } = req.body;
    
    // ATENÇÃO: Em um app real, o usuario_id viria do seu token de autenticação.
    // Garanta que existe um usuário com id=1 na sua tabela 'usuarios'.
    const usuario_id = 1; 

    if (!nome || !telefone || !gf_responsavel || !endereco) {
        return res.status(400).json({ error: 'Campos essenciais (nome, telefone, GF, endereço) são obrigatórios.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const gfResult = await client.query('SELECT id FROM gf WHERE nome = $1', [gf_responsavel]);
        if (gfResult.rows.length === 0) {
            throw new Error(`GF com o nome '${gf_responsavel}' não encontrado.`);
        }
        const gf_id = gfResult.rows[0].id;

        const enderecoQuery = `
            INSERT INTO endereco_visitante (cep, endereco, numero, complemento, bairro, cidade, uf)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id;
        `;
        const enderecoValues = [
            endereco.cep,
            endereco.logradouro,
            endereco.numero,
            endereco.complemento,
            endereco.bairro,
            endereco.cidade,
            endereco.uf
        ];
        const newEndereco = await client.query(enderecoQuery, enderecoValues);
        const endereco_id = newEndereco.rows[0].id;

        const visitanteQuery = `
            INSERT INTO visitantes (
                nome, data_nascimento, telefone, sexo, email, estado_civil, profissao, 
                como_conheceu, usuario_id, gf_id, endereco_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *;
        `;
        const visitanteValues = [
            nome,
            data_nascimento || null,
            telefone,
            sexo,
            email,
            estado_civil,
            profissao,
            como_conheceu,
            usuario_id,
            gf_id,
            endereco_id
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
});

// --- ROTA PARA LER TODOS OS VISITANTES (READ ALL) ---
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT
                v.*,
                ev.cep,
                ev.endereco AS logradouro, 
                ev.numero,
                ev.complemento,
                ev.bairro,
                ev.cidade,
                ev.uf
            FROM visitantes v
            JOIN endereco_visitante ev ON v.endereco_id = ev.id
            ORDER BY v.nome ASC;
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


// --- ROTA PARA ATUALIZAR UM VISITANTE (UPDATE) ---
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, telefone, email, endereco, ...outrosCampos } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const enderecoIdResult = await client.query('SELECT endereco_id FROM visitantes WHERE id = $1', [id]);
        if (enderecoIdResult.rows.length === 0) {
            return res.status(404).json({ error: 'Visitante não encontrado.' });
        }
        const endereco_id = enderecoIdResult.rows[0].endereco_id;

        const visitanteQuery = `UPDATE visitantes SET nome = $1, telefone = $2, email = $3 WHERE id = $4;`;
        await client.query(visitanteQuery, [nome, telefone, email, id]);
        
        const enderecoQuery = `
            UPDATE endereco_visitante 
            SET cep = $1, endereco = $2, numero = $3, bairro = $4, cidade = $5, uf = $6
            WHERE id = $7;
        `;
        await client.query(enderecoQuery, [
            endereco.cep, endereco.logradouro, endereco.numero,
            endereco.bairro, endereco.cidade, endereco.uf,
            endereco_id
        ]);

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


// --- ROTA PARA DELETAR UM VISITANTE (DELETE) ---
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM visitantes WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Visitante não encontrado.' });
        }
        res.status(204).send();
    } catch (err) {
        console.error(`Erro ao deletar visitante com id ${id}:`, err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

export default router;
