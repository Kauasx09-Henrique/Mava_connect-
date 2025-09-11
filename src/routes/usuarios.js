import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Garante que o diretório de upload exista
const uploadDir = path.resolve('public/fotos');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do Multer
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage: storage });

// Função Auxiliar para construir a URL completa da imagem
const addLogoUrl = (user, req) => {
    if (user && user.logo) {
        const fileName = path.basename(user.logo);
        const fullUrl = `${req.protocol}://${req.get('host')}/fotos/${fileName}`;
        return { ...user, logo_url: fullUrl };
    }
    return { ...user, logo_url: null }; // Corrigido aqui
};

const router = express.Router();

// --- ROTA PARA CRIAR NOVO USUÁRIO ---
router.post('/', upload.single('logo'), async (req, res) => {
    const { nome_gf, email_gf, senha_gf, tipo_usuario } = req.body;
    const logoPath = req.file ? path.join('fotos', req.file.filename) : null;

    if (!nome_gf?.trim() || !email_gf?.trim() || !senha_gf?.trim() || !tipo_usuario?.trim()) {
        return res.status(400).json({ message: 'Os campos nome, email, senha e tipo são obrigatórios.' });
    }
    if (!['admin', 'secretaria'].includes(tipo_usuario.toLowerCase())) {
        return res.status(400).json({ message: "Tipo de usuário inválido. Use 'admin' ou 'secretaria'." });
    }

    try {
        const senhaHash = await bcrypt.hash(senha_gf, 10);
        const result = await pool.query(
            'INSERT INTO usuarios (nome_gf, email_gf, senha_gf, tipo_usuario, logo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [nome_gf, email_gf.toLowerCase(), senhaHash, tipo_usuario.toLowerCase(), logoPath]
        );
        
        res.status(201).json(addLogoUrl(result.rows[0], req));
    } catch (err) {
        if (err.code === '23505') { 
            return res.status(409).json({ message: 'Este email já está cadastrado.' });
        }
        console.error(err);
        res.status(500).json({ message: 'Erro interno ao registrar usuário.' });
    }
});

// --- ROTA PARA LER TODOS OS USUÁRIOS ---
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM usuarios ORDER BY nome_gf ASC');
        res.json(rows.map(user => addLogoUrl(user, req)));
    } catch (err) {
        console.error('Erro na rota GET /usuarios:', err);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// --- ROTA PARA LER UM USUÁRIO POR ID ---
router.get('/:id', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM usuarios WHERE id = $1', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        res.json(addLogoUrl(rows[0], req));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// --- ROTA PARA ATUALIZAR UM USUÁRIO ---
router.put('/:id', upload.single('logo'), async (req, res) => {
    const { id } = req.params;
    const { nome_gf, email_gf, tipo_usuario, senha_gf } = req.body;
    const logoPath = req.file ? path.join('fotos', req.file.filename) : undefined;

    try {
        const { rows: existingUserRows } = await pool.query('SELECT logo FROM usuarios WHERE id = $1', [id]);
        if (existingUserRows.length === 0) {
            if(req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: 'Usuário não encontrado para atualização.' });
        }
        const oldLogoPath = existingUserRows[0].logo;

        const fields = [], values = [];
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

        if (fields.length === 0) return res.status(400).json({ message: 'Nenhum campo fornecido para atualização.' });
        
        values.push(id);
        const query = `UPDATE usuarios SET ${fields.join(', ')} WHERE id = $${queryIndex} RETURNING *`;
        const { rows } = await pool.query(query, values);

        if (logoPath && oldLogoPath) {
            const fullOldPath = path.resolve('public', oldLogoPath);
            if (fs.existsSync(fullOldPath)) fs.unlink(fullOldPath, err => { if (err) console.error("Erro ao deletar logo antigo:", err); });
        }
        
        res.json(addLogoUrl(rows[0], req));
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ message: 'O email fornecido já está em uso.' });
        console.error(err);
        res.status(500).json({ message: 'Erro interno ao atualizar o usuário.' });
    }
});

// --- ROTA PARA DELETAR UM USUÁRIO ---
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query('SELECT logo FROM usuarios WHERE id = $1', [id]);
        const result = await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
        
        if (result.rowCount === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        
        if (rows.length > 0 && rows[0].logo) {
            const fullPath = path.resolve('public', rows[0].logo);
            if (fs.existsSync(fullPath)) fs.unlink(fullPath, err => { if (err) console.error("Erro ao deletar arquivo de logo:", err); });
        }
        
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

export default router;
