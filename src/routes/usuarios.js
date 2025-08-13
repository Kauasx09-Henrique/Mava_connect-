import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';

// --- Configuração do Multer para Upload de Arquivos ---
import multer from 'multer';
import path from 'path';
import fs from 'fs'; // Importa o módulo 'fs' para manipulação de arquivos

// Garante que o diretório de upload exista
const uploadDir = 'public/fotos';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Define onde os arquivos serão armazenados e com que nome
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    // Cria um nome de arquivo único para evitar que imagens com o mesmo nome se sobreponham
    cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Middleware do multer que processará o upload de um único arquivo no campo 'logo'
const upload = multer({ storage: storage });
// --- Fim da Configuração do Multer ---


// --- FUNÇÃO AUXILIAR PARA ADICIONAR URL DA LOGO ---
/**
 * Adiciona a propriedade 'logo_url' a um objeto de usuário.
 * @param {object} user - O objeto de usuário do banco de dados.
 * @param {object} req - O objeto de requisição do Express para obter o host.
 * @returns {object} O objeto de usuário com a logo_url completa.
 */
const addLogoUrl = (user, req) => {
    if (user && user.logo) {
        // user.logo contém o caminho relativo, ex: 'fotos/logo-123.png'
        const fullUrl = `${req.protocol}://${req.get('host')}/${user.logo}`;
        return { ...user, logo_url: fullUrl };
    }
    // Se não houver logo, retorna o usuário como está, mas com logo_url nula
    return { ...user, logo_url: null };
};


const router = express.Router();


// --- ROTA PARA CRIAR UM NOVO USUÁRIO (CREATE / REGISTER) ---
router.post('/', upload.single('logo'), async (req, res) => {
    const { nome_gf, email_gf, senha_gf, tipo_usuario } = req.body;
    // Salva o caminho relativo, ex: "fotos/logo-12345.png"
    const logoPath = req.file ? `fotos/${req.file.filename}` : null;

    if (!nome_gf?.trim() || !email_gf?.trim() || !senha_gf?.trim() || !tipo_usuario?.trim()) {
        return res.status(400).json({ message: 'Os campos nome, email, senha e tipo são obrigatórios.' });
    }
    if (!['admin', 'secretaria'].includes(tipo_usuario.toLowerCase())) {
        return res.status(400).json({ message: "Tipo de usuário inválido. Use 'admin' ou 'secretaria'." });
    }

    try {
        const senhaHash = await bcrypt.hash(senha_gf, 10);
        const result = await pool.query(
            'INSERT INTO usuarios (nome_gf, email_gf, senha_gf, tipo_usuario, logo) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome_gf, email_gf, tipo_usuario, logo',
            [nome_gf, email_gf.toLowerCase(), senhaHash, tipo_usuario.toLowerCase(), logoPath]
        );
        
        const novoUsuario = result.rows[0];
        // Adiciona a URL completa antes de enviar a resposta
        const usuarioComUrl = addLogoUrl(novoUsuario, req);

        res.status(201).json(usuarioComUrl);
    } catch (err) {
        console.error('Erro ao registrar usuário:', err);
        if (err.code === '23505') { 
            return res.status(409).json({ message: 'Este email já está cadastrado.' });
        }
        res.status(500).json({ message: 'Erro interno ao registrar usuário.' });
    }
});


// --- ROTA PARA LER TODOS OS USUÁRIOS (READ ALL) ---
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, nome_gf, email_gf, tipo_usuario, logo FROM usuarios ORDER BY nome_gf ASC');
        // Adiciona a URL completa para cada usuário na lista
        const usuariosComUrl = rows.map(user => addLogoUrl(user, req));
        res.json(usuariosComUrl);
    } catch (err) {
        console.error('Erro ao buscar usuários:', err);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});


// --- ROTA PARA LER UM USUÁRIO ESPECÍFICO POR ID (READ ONE) ---
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query('SELECT id, nome_gf, email_gf, tipo_usuario, logo FROM usuarios WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        // Adiciona a URL completa antes de enviar a resposta
        const usuarioComUrl = addLogoUrl(rows[0], req);
        res.json(usuarioComUrl);
    } catch (err) {
        console.error(`Erro ao buscar usuário com id ${id}:`, err);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});


// --- ROTA PARA ATUALIZAR UM USUÁRIO (UPDATE) ---
router.put('/:id', upload.single('logo'), async (req, res) => {
    const { id } = req.params;
    const { nome_gf, email_gf, tipo_usuario, senha_gf } = req.body;
    // Salva o caminho relativo se um novo arquivo for enviado
    const logoPath = req.file ? `fotos/${req.file.filename}` : undefined;

    try {
        const { rows: existingUserRows } = await pool.query('SELECT logo FROM usuarios WHERE id = $1', [id]);
        if (existingUserRows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado para atualização.' });
        }
        const oldLogoPath = existingUserRows[0].logo;

        const fields = [];
        const values = [];
        let queryIndex = 1;

        if (nome_gf) { fields.push(`nome_gf = $${queryIndex++}`); values.push(nome_gf); }
        if (email_gf) { fields.push(`email_gf = $${queryIndex++}`); values.push(email_gf.toLowerCase()); }
        if (tipo_usuario) { fields.push(`tipo_usuario = $${queryIndex++}`); values.push(tipo_usuario.toLowerCase()); }
        
        // Se um novo logo foi enviado (logoPath não é undefined), adicione-o à atualização
        if (logoPath !== undefined) {
             fields.push(`logo = $${queryIndex++}`); 
             values.push(logoPath); 
        }

        if (senha_gf) { 
            const senhaHash = await bcrypt.hash(senha_gf, 10);
            fields.push(`senha_gf = $${queryIndex++}`); 
            values.push(senhaHash);
        }

        if (fields.length === 0) {
            return res.status(400).json({ message: 'Nenhum campo fornecido para atualização.' });
        }
        
        values.push(id);
        const query = `UPDATE usuarios SET ${fields.join(', ')} WHERE id = $${queryIndex} RETURNING id, nome_gf, email_gf, tipo_usuario, logo`;
        
        const { rows } = await pool.query(query, values);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado para atualização.' });
        }
        
        // Se um novo logo foi salvo e existia um antigo, remove o arquivo antigo do servidor
        if (logoPath && oldLogoPath) {
            const fullOldPath = path.join('public', oldLogoPath);
            if (fs.existsSync(fullOldPath)) {
                fs.unlink(fullOldPath, (err) => {
                    if (err) console.error("Erro ao deletar logo antigo:", err);
                });
            }
        }
        
        // Adiciona a URL completa antes de enviar a resposta
        const usuarioAtualizadoComUrl = addLogoUrl(rows[0], req);
        res.json(usuarioAtualizadoComUrl);

    } catch (err) {
        console.error(`Erro ao atualizar usuário com id ${id}:`, err);
        if (err.code === '23505') {
            return res.status(409).json({ message: 'O email fornecido já está em uso por outro usuário.' });
        }
        res.status(500).json({ message: 'Erro interno ao atualizar o usuário.' });
    }
});


// --- ROTA PARA DELETAR UM USUÁRIO (DELETE) ---
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Primeiro, pega o caminho do logo para poder deletar o arquivo
        const { rows } = await pool.query('SELECT logo FROM usuarios WHERE id = $1', [id]);
        
        // Deleta o usuário do banco de dados
        const result = await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        
        // Se o usuário foi deletado e tinha um logo, remove o arquivo
        if (rows.length > 0 && rows[0].logo) {
            const fullPath = path.join('public', rows[0].logo);
             if (fs.existsSync(fullPath)) {
                fs.unlink(fullPath, (err) => {
                    if (err) console.error("Erro ao deletar arquivo de logo:", err);
                });
            }
        }
        
        res.status(204).send();
    } catch (err) {
        console.error(`Erro ao deletar usuário com id ${id}:`, err);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

export default router;
