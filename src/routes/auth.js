// Arquivo: routes/auth.js (Versão Completa e Corrigida)

import express from 'express';
import { pool } from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

// ----------------------------------------------------------------------------------
// ADIÇÃO 1: Função auxiliar para adicionar a URL completa da logo
// Esta função pega o caminho relativo salvo no banco (ex: 'fotos/logo-123.png')
// e o transforma em uma URL completa que o navegador pode usar.
// ----------------------------------------------------------------------------------
const addLogoUrl = (user, req) => {
    // Verifica se o usuário e o campo 'logo' existem
    if (user && user.logo) {
        // Constrói a URL: 'http' + '://' + 'localhost:3001' + '/' + 'fotos/logo-123.png'
        const fullUrl = `${req.protocol}://${req.get('host')}/${user.logo.replace(/\\/g, '/')}`;
        // Retorna uma cópia do objeto do usuário com a nova propriedade 'logo_url'
        return { ...user, logo_url: fullUrl };
    }
    // Se não houver logo, retorna o usuário como está, mas com 'logo_url' nula
    return { ...user, logo_url: null };
};


// Rota de Login Principal
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    try {
        // Busca o usuário no banco de dados pelo email fornecido
        const result = await pool.query('SELECT * FROM usuarios WHERE email_gf = $1', [email.toLowerCase()]);

        // Se nenhum usuário for encontrado, retorna erro de credenciais
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        const usuario = result.rows[0];

        // Compara a senha enviada com a senha hasheada que está no banco
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha_gf);

        // Se as senhas não baterem, retorna erro de credenciais
        if (!senhaCorreta) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        // Cria o token de autenticação (JWT) com os dados essenciais do usuário
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email_gf, tipo: usuario.tipo_usuario },
            process.env.JWT_SECRET, // Lembre-se de criar essa variável em seu arquivo .env
            { expiresIn: '1d' } // Token expira em 1 dia
        );

        // ----------------------------------------------------------------------------------
        // ADIÇÃO 2: Prepara o objeto de usuário para ser enviado na resposta
        // Usa a função auxiliar para adicionar a 'logo_url' completa.
        // ----------------------------------------------------------------------------------
        const userWithLogo = addLogoUrl(usuario, req);

        // ----------------------------------------------------------------------------------
        // ADIÇÃO 3: Remove a senha do objeto antes de enviar
        // É uma prática de segurança essencial nunca retornar senhas na API.
        // ----------------------------------------------------------------------------------
        delete userWithLogo.senha_gf;
        
        // ----------------------------------------------------------------------------------
        // ADIÇÃO 4: Envia a resposta completa para o frontend
        // Agora, o objeto 'user' contém todos os dados que o frontend precisa,
        // incluindo a 'logo_url' para o Header.
        // ----------------------------------------------------------------------------------
        res.json({ token, user: userWithLogo });

    } catch (erro) {
        console.error("Erro durante a tentativa de login:", erro);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

export default router;