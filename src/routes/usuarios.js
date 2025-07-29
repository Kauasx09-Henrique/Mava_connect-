// Caminho do arquivo: /routes/usuarios.js

import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';

// --- Configuração do Multer para Upload de Arquivos ---
import multer from 'multer';
import path from 'path';

// Define onde os arquivos serão armazenados e com que nome
const storage = multer.diskStorage({
  destination: 'public/fotos', // Garanta que esta pasta exista na raiz do seu backend
  filename: (req, file, cb) => {
    // Cria um nome de arquivo único para evitar que imagens com o mesmo nome se sobreponham
    cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Middleware do multer que processará o upload de um único arquivo no campo 'logo'
const upload = multer({ storage: storage });
// --- Fim da Configuração do Multer ---


const router = express.Router();


// --- ROTA PARA CRIAR UM NOVO USUÁRIO (CREATE / REGISTER) ---
// O middleware de autenticação foi removido.
router.post('/', upload.single('logo'), async (req, res) => {
    // Dados do formulário de texto vêm em req.body
    const { nome_gf, email_gf, senha_gf, tipo_usuario } = req.body;
    // O arquivo (se enviado) vem em req.file. Salvamos o caminho dele.
    const logoPath = req.file ? req.file.path.replace(/\\/g, "/") : null;

    if (!nome_gf?.trim() || !email_gf?.trim() || !senha_gf?.trim() || !tipo_usuario?.trim()) {
        return res.status(400).json({ error: 'Os campos nome, email, senha e tipo são obrigatórios.' });
    }
    if (!['admin', 'secretaria'].includes(tipo_usuario.toLowerCase())) {
        return res.status(400).json({ error: "Tipo de usuário inválido. Use 'admin' ou 'secretaria'." });
    }

    try {
        const senhaHash = await bcrypt.hash(senha_gf, 10);
        const novoUsuario = await pool.query(
            'INSERT INTO usuarios (nome_gf, email_gf, senha_gf, tipo_usuario, logo) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome_gf, email_gf, tipo_usuario, logo',
            [nome_gf, email_gf.toLowerCase(), senhaHash, tipo_usuario.toLowerCase(), logoPath]
        );
        res.status(201).json(novoUsuario.rows[0]);
    } catch (err) {
        console.error('Erro ao registrar usuário:', err);
        if (err.code === '23505') { 
            return res.status(409).json({ error: 'Este email já está cadastrado.' });
        }
        res.status(500).json({ error: 'Erro interno ao registrar usuário.' });
    }
});


// --- ROTA PARA LER TODOS OS USUÁRIOS (READ ALL) ---
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, nome_gf, email_gf, tipo_usuario, logo FROM usuarios ORDER BY nome_gf ASC');
        res.json(rows);
    } catch (err) {
        console.error('Erro ao buscar usuários:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});


// --- ROTA PARA LER UM USUÁRIO ESPECÍFICO POR ID (READ ONE) ---
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query('SELECT id, nome_gf, email_gf, tipo_usuario, logo FROM usuarios WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(`Erro ao buscar usuário com id ${id}:`, err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});


// --- ROTA PARA ATUALIZAR UM USUÁRIO (UPDATE) ---
router.put('/:id', upload.single('logo'), async (req, res) => {
    const { id } = req.params;
    const { nome_gf, email_gf, tipo_usuario, senha_gf } = req.body;
    const logoPath = req.file ? req.file.path.replace(/\\/g, "/") : undefined;

    try {
        const fields = [];
        const values = [];
        let queryIndex = 1;

        if (nome_gf) { fields.push(`nome_gf = $${queryIndex++}`); values.push(nome_gf); }
        if (email_gf) { fields.push(`email_gf = $${queryIndex++}`); values.push(email_gf.toLowerCase()); }
        if (tipo_usuario) { fields.push(`tipo_usuario = $${queryIndex++}`); values.push(tipo_usuario.toLowerCase()); }
        if (logoPath !== undefined) { fields.push(`logo = $${queryIndex++}`); values.push(logoPath); }
        if (senha_gf) { 
            const senhaHash = await bcrypt.hash(senha_gf, 10);
            fields.push(`senha_gf = $${queryIndex++}`); 
            values.push(senhaHash);
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo fornecido para atualização.' });
        }
        
        values.push(id);
        const query = `UPDATE usuarios SET ${fields.join(', ')} WHERE id = $${queryIndex} RETURNING id, nome_gf, email_gf, tipo_usuario, logo`;
        const { rows } = await pool.query(query, values);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado para atualização.' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(`Erro ao atualizar usuário com id ${id}:`, err);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'O email fornecido já está em uso por outro usuário.' });
        }
        res.status(500).json({ error: 'Erro interno ao atualizar o usuário.' });
    }
});


// --- ROTA PARA DELETAR UM USUÁRIO (DELETE) ---
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        res.status(204).send();
    } catch (err) {
        console.error(`Erro ao deletar usuário com id ${id}:`, err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});
export default router;
