// Caminho do arquivo: /routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
// Garanta que sua conexão 'pool' está sendo importada corretamente do seu arquivo de configuração de banco de dados.
import { pool } from '../db.js'; 

const router = express.Router();

// A variável de ambiente JWT_SECRET deve ser configurada no seu ambiente.
// Use um segredo forte em produção.
const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_padrao_para_testes_e_desenvolvimento';

// --- ROTA DE LOGIN ---
// Rota para autenticar um usuário e retornar um token JWT.
router.post('/login', async (req, res) => {
    // Extrai email e senha do corpo da requisição.
    const { email, senha } = req.body;

    // Validação básica dos campos de entrada.
    if (!email || !senha) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    try {
        // Busca o usuário no banco de dados pelo email.
        // Note o uso de 'email_gf' para corresponder à sua tabela.
        const { rows } = await pool.query('SELECT * FROM usuarios WHERE email_gf = $1', [email.toLowerCase()]);
        
        // Se nenhum usuário for encontrado, retorna um erro de credenciais inválidas.
        // A mensagem é genérica para não informar se o email existe ou não.
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        const usuario = rows[0];
        
        // Compara a senha fornecida com o hash armazenado no banco de dados.
        // Note o uso de 'senha_gf'.
        const senhaValida = await bcrypt.compare(senha, usuario.senha_gf);

        if (!senhaValida) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        // Gera o token JWT com o ID e o tipo do usuário.
        // Note o uso de 'tipo_usuario'.
        const token = jwt.sign(
            { id: usuario.id, tipo: usuario.tipo_usuario },
            JWT_SECRET,
            { expiresIn: '8h' } // Token expira em 8 horas
        );

        // Retorna o token e os dados do usuário para o frontend.
        // Os nomes dos campos no JSON de resposta foram padronizados para fácil uso no cliente.
        res.json({ 
            token, 
            tipo: usuario.tipo_usuario,
            email: usuario.email_gf, 
            nome: usuario.nome_gf,
            logo: usuario.logo
        });

    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// A rota de registro foi movida para o arquivo de CRUD (usuarios.js)
// para centralizar o gerenciamento de usuários.

export default router;
